var express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
//require("dotenv").config();
let myApp = express();
const session = require("express-session");
const { check, validationResult } = require("express-validator");
const {
  GenerateSalt,
  GeneratePassword,
  ValidatePassword,
  GenerateSignature,
} = require("./utils");
const posts=[];
myApp.set("views", path.join(__dirname, "views"));
myApp.use(express.static(__dirname + "/public"));
myApp.use(express.json());
myApp.use(express.urlencoded({ extended: true }));

myApp.set("view engine", "ejs");

const mongoose = require("mongoose");
const { create } = require("domain");
const { render } = require("ejs");

//mongoose.connect(process.env.MONGO_URI, {
mongoose.connect("mongodb://0.0.0.0:27017/ConestogaCommunity", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model("users", {
  firstName: String,
  lastName: String,
  email: String,
  isAlumini: Boolean,
  isAdmin: Boolean,
  password: String,
  salt: String,
});

const Post = mongoose.model("posts", {
  title: String,
  category: String,
  description: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"users"
  },
  comments:[{
    type: mongoose.Schema.Types.ObjectId,
    ref:"comments"
  }],
});

const Comment = mongoose.model("comments", {
  comment: String,
  postId: String,
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref:"users"
  }
});

const HelpRequest = mongoose.model("helprequests", {
  title: String,
  category: String,
  description: String,
  userId: String,
  isResolved: Boolean,
  resolutionComment: String,
});

ValidateSignature = (req) => {
  const cookies = req.get("Cookie");
  const cookiesArr = cookies.split(" ");
  var cookie_token = "";
  cookiesArr.forEach(async (cookie) => {
    if (cookie.includes("access_token")) {
      cookie_token = cookie;
    }
  });
  if (cookie_token != "") {
    const token = cookie_token.replace("access_token=", "");
    const data = jwt.verify(token, "conestoga_community");
    return data;
  } else return undefined;
};

myApp.use(
  session({
    secret: "conestoga_community",
    resave: false,
    saveUninitialized: true,
  })
);

myApp.get("/", (req, res) => {
  res.render("login");
});

//Check for this part
myApp.use((req, res, next) => {
  res.locals.message = "";
  next();
});

function customPasswordValidation(value, {req}){
  var regularExpression = /^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{6,16}$/;
  var password = req.body.password;

  if (regularExpression.test(password) == false){
    throw new Error("Enter password with 6-16 characters and must have atleast 1 number and special character ");
  }
  console.log("Password : " + password);
  return true;

}

// SIGNUP
myApp.post("/signUp",
//  [
//   check('email', 'Please enter a valid email address.').isEmail(),
//   check('password').custom(customPasswordValidation), 
// ],
 async (req, res) => {
  try {
    const user = req.body;
    const userExists = await User.findOne({ email: user.email });
    if (!userExists) {
      let salt = await GenerateSalt();
      let password = await GeneratePassword(user.password, salt);
      user.password = password;
      user.salt = salt;
      user.isAdmin = false;
      const createdUser = await new User(user).save();
      res.status(200).render("login");
    }
  } catch (error) {
    throw error;
  }
});

// SIGNIN
myApp.post("/signIn", async (req, res) => {
  try {
    const user = req.body;
    const existingUser = await User.findOne({ email: user.email });
    if (existingUser) {
      const validPassword = await ValidatePassword(
        user.password,
        existingUser.password,
        existingUser.salt
      );
      if (validPassword) {
        const token = await GenerateSignature({
          _id: existingUser._id,
        });
        const sendUserResponse = {
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          email: existingUser.email,
          isAlumini: existingUser.isAlumini,
        };
        if (existingUser.isAdmin) {
          const page = parseInt(req.query.page) || 1;
          const postsPerPage = 2;
          const countTotalPosts = await Post.countDocuments({});
          const totalPages = Math.ceil(countTotalPosts / postsPerPage);
          const startIndex = (page - 1) * postsPerPage;
          var allPosts = await Post.find({})
            .skip(startIndex)
            .limit(postsPerPage).populate("userId").populate({
              path: "comments",
              model: "comments",
              populate:{
                path:"userId",
                model:"users",
              },
            });
         
          res
            .cookie("access_token", token, {
              httpOnly: true,
            })
            .status(200)
            .render("adminHomePage", { allPosts, page, totalPages });
          
        } else {
          const page = parseInt(req.query.page) || 1;
          const postsPerPage = 2;
          const countTotalPosts = await Post.countDocuments({});
          const totalPages = Math.ceil(countTotalPosts / postsPerPage);
          const startIndex = (page - 1) * postsPerPage;
          const endIndex = startIndex + postsPerPage;

          const paginatedPosts = posts.slice(startIndex, endIndex);
          var allPosts = await Post.find({}).skip(startIndex)
          .limit(postsPerPage).populate("userId").populate({
            path: "comments",
            model: "comments",
            populate:{
              path:"userId",
              model:"users",
            },
          });
          
          res
            .cookie("access_token", token, {
              httpOnly: true,
            })
            .status(200)
            .render("homePage", {
              allPosts,
              paginatedPosts,
              totalPages,
              currentPage: page,
            });
          
        }
      } else res.status(400).json({ message: "Wrong password!" });
    } else res.status(404).json({ message: "User not found!" });
  } catch (error) {
    throw error;
  }
});

myApp.get("/newPost", (req, res) => {
  res.render("newpost");
});
myApp.get("/newGetHelp", (req, res) => {
  res.render("newGetHelp");
});
myApp.get("/updateProfile", (req, res) => {
  res.render("updateProfile");
});

myApp.post("/changeFilter", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    try {
      const jobFilter = req.body.category;
      const allPosts = await Post.find({ category: jobFilter }).populate("userId").populate({
        path: "comments",
        model: "comments",
        populate:{
          path:"userId",
          model:"users",
        },
      });;
      const page = parseInt(req.query.page) || 1;
      const postsPerPage = 2;
      const countTotalPosts = allPosts.length;
      const totalPages = Math.ceil(countTotalPosts / postsPerPage);
      const startIndex = (page - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;
      const paginatedPosts = posts.slice(startIndex, endIndex);
      res
        .status(200)
        .render("homePage", {
          allPosts,
          paginatedPosts,
          totalPages,
          currentPage: page,
        });
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});


myApp.post("/changeFilterAdminPage", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    try {
      const jobFilter = req.body.category;
      const allPosts = await Post.find({ category: jobFilter }).populate("userId").populate({
        path: "comments",
        model: "comments",
        populate:{
          path:"userId",
          model:"users",
        },
      });;
      const page = parseInt(req.query.page) || 1;
      const postsPerPage = 2;
      const countTotalPosts = allPosts.length;
      const totalPages = Math.ceil(countTotalPosts / postsPerPage);
      const startIndex = (page - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;
      const paginatedPosts = posts.slice(startIndex, endIndex);
      res.status(200).render("adminHomePage", { allPosts, page, totalPages });
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});
myApp.post("/changeFilterForUserPosts", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    try {
      const jobFilter = req.body.category;
      const postsByUserId = await Post.find({ category: jobFilter, userId: data._id }).populate("userId").populate({
        path: "comments",
        model: "comments",
        populate:{
          path:"userId",
          model:"users",
        },
      });;
      const page = parseInt(req.query.page) || 1;
      const postsPerPage = 2;
      const countTotalPosts = postsByUserId.length;
      const totalPages = Math.ceil(countTotalPosts / postsPerPage);
      const startIndex = (page - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;
      const paginatedPosts = posts.slice(startIndex, endIndex);
      res.status(200).render("postsByUser", { postsByUserId, page, totalPages });
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});

//Read all the posts for normal user (Non Admin)
myApp.get("/homePage", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    try {
      const page = parseInt(req.query.page) || 1;
      const postsPerPage = 2;
      const countTotalPosts = await Post.countDocuments({});
      const totalPages = Math.ceil(countTotalPosts / postsPerPage);
      const startIndex = (page - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;

      const paginatedPosts = posts.slice(startIndex, endIndex);
      var allPosts = await Post.find({}).skip(startIndex)
      .limit(postsPerPage).populate("userId").populate({
        path: "comments",
        model: "comments",
        populate:{
          path:"userId",
          model:"users",
        },
      });
      res
        .status(200)
        .render("homePage", {
          allPosts,
          paginatedPosts,
          totalPages,
          currentPage: page,
        });
      
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});

// CREATE A POST
myApp.post("/createPost", async (req, res) => {
  const data = ValidateSignature(req);
  const post = req.body;
  if (data && data._id) {
    try {
      post.userId = data._id;
      var pagedata = {
        title: req.body.title,
        category: req.body.category,
        description: req.body.description,
        userId: data._id,
      };
      let newOrder = new Post(pagedata);
      newOrder.save();
      res.render("newPost");
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});

// UPDATE USER PROFILE
myApp.post("/updateProfile", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    const user = req.body;
    try {
      let salt = await GenerateSalt();
      user.salt = salt;

      var userProfile = {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isAlumini: user.isAlumni,
        isAdmin: false,
        password: password,
        salt: user.salt,
      };
      let updateProfile = await User.updateOne(
        { _id: data._id },
        {
          $set: {
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            email: userProfile.email,
            isAlumini: userProfile.isAlumini,
            isAdmin: false,
            password: password,
            salt: user.salt,
          },
        }
      );
      updateProfile.save();
      res.status(200).render("newGetHelp");
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});


fetchUserName = (allPosts) => {
  const posts = [];
   allPosts.forEach( post => {
    post.userName = "Anant jain";
    posts.push(post);
  });
  
  return posts;
  };
//completed
// READ ALL POSTS FOR ADMIN
myApp.get("/adminHomePage", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    try {
      const user = await User.findById(data._id);
      if (user.isAdmin) {
        const page = parseInt(req.query.page) || 1;
        const postsPerPage = 2;
        const countTotalPosts = await Post.countDocuments({});
        const totalPages = Math.ceil(countTotalPosts / postsPerPage);
        const startIndex = (page - 1) * postsPerPage;
        
        var allPosts = await Post.find()
          .skip(startIndex)
          .limit(postsPerPage)
          .populate("userId").populate({
            path: "comments",
            model: "comments",
            populate:{
              path:"userId",
              model:"users",
            },
          });
          
        res.status(200).render("adminHomePage", { allPosts, page, totalPages });
      } else {
        res.sendStatus(403);
      }
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});

//completed
// READ POST BY USER ID
myApp.get("/postsByUser", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    try {
      const page = parseInt(req.query.page) || 1;
      const postsPerPage = 5;
      const startIndex = (page - 1) * postsPerPage;
      var postsByUserId = await Post.find({ userId: data._id })
        .skip(startIndex)
        .limit(postsPerPage).populate("userId").populate({
          path: "comments",
          model: "comments",
          populate:{
            path:"userId",
            model:"users",
          },
        });
      
      const countTotalPosts = postsByUserId.length;
      const totalPages = Math.ceil(countTotalPosts / postsPerPage);
      res
        .status(200)
        .render("postsByUser", { postsByUserId, page, totalPages });
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});

// DELETE POST
myApp.delete("/deletePost", async (req, res) => {
  try {
    var postId = req.body.postId;
    var token = req.headers.authorization.split(" ")[1];
    const tokenObj = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    await Post.deleteOne({ _id: postId });
  } catch (error) {
    throw error;
  }
});

// CREATE COMMENT ON A POST
myApp.post("/comment", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    const comment = req.body;
    try {
      comment.userId = data._id;
      var postID = req.body.postId;
      comment.postId = postID;
      const createdComment = await new Comment(comment).save();
      const updatedPost = await Post.findOneAndUpdate({_id: postID}, {$push: {comments: createdComment._id}});
      res.render("updateProfile");
     
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});

// DELETE A COMMENT
myApp.delete("/deleteComment", async (req, res) => {
  try {
    var commentId = req.body.commentId;
    var token = req.headers.authorization.split(" ")[1];
    const tokenObj = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    await Comment.deleteOne({ _id: commentId });
  } catch (error) {
    throw error;
  }
});

//completed
// RAISE A HELP REQUEST
myApp.post("/raiseHelpRequest", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    try {
      var help = {
        title: req.body.title,
        category: req.body.category,
        description: req.body.description,
        userId: data._id,
        isResolved: false,
        resolutionComment: "",
      };
      var post = {
        title: req.body.title,
        category: req.body.category,
        description: req.body.description,
        userId: data._id,
      };
      let newHelpPost = new HelpRequest(help);
      newHelpPost.save();
      let newPost = new Post(post);
      newPost.save();
      const page = 1;
      const postsPerPage = 3;
      const startIndex = (page - 1) * postsPerPage;
      var postsByUserId = await Post.find({ userId: data._id })
        .skip(startIndex)
        .limit(postsPerPage).populate("userId").populate({
          path: "comments",
          model: "comments",
          populate:{
            path:"userId",
            model:"users",
          },
        });;
        postsByUserId = fetchUserName(postsByUserId);
      const countTotalPosts = postsByUserId.length;
      const totalPages = Math.ceil(countTotalPosts / postsPerPage);
      res
        .status(200)
        .render("postsByUser", { postsByUserId, page, totalPages });
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});


//completed
// READ ALL HELP REQUESTS FOR ADMIN
myApp.get("/getHelpPost", async (req, res) => {

  const data = ValidateSignature(req);
  if (data && data._id) {
    try {
      const page =  1;
      const postsPerPage = 2;
      const countTotalPosts = await HelpRequest.countDocuments({});
      const totalPages = Math.ceil(countTotalPosts / postsPerPage);
      const startIndex = (page - 1) * postsPerPage;
      var allPosts = await HelpRequest.find({})
        .skip(startIndex)
        .limit(postsPerPage);
        allPosts = fetchUserName(allPosts);
      res.status(200).render("getHelpPost", { allPosts, page, totalPages });
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});

// RESOLVE A HELP REQUEST
myApp.post("/resolveRequest", async (req, res) => {
  const data = ValidateSignature(req);
  if (data && data._id) {
    try {
      var req = req.body;
      const updatedRequest = await HelpRequest.updateOne(
        { title: req.title },
        { $set: { resolutionComment: req.resolutionComment, isResolved: true } }
      );
      const page = 1;
      const postsPerPage = 3;
      var resolvedHelpRequests = await HelpRequest.find({ isResolved: true });
      resolvedHelpRequests = fetchUserName(resolvedHelpRequests);
      const countTotalPosts = resolvedHelpRequests.length;
      const totalPages = Math.ceil(countTotalPosts / postsPerPage);
      const startIndex = (page - 1) * postsPerPage;
      const endIndex = startIndex + postsPerPage;

      const paginatedPosts = posts.slice(startIndex, endIndex);

      res
        .status(200)
        .render("resolvedHelpPosts", {
          resolvedHelpRequests,
          paginatedPosts,
          totalPages,
          currentPage: page,
        });
    } catch (error) {
      throw error;
    }
  } else res.sendStatus(403);
});
//completed
// READ ALL RESOLVED HELP REQUESTS FOR ADMIN
myApp.get("/resolvedHelpPosts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const postsPerPage = 1;
    var resolvedHelpRequests = await HelpRequest.find({ isResolved: true });
    const countTotalPosts = resolvedHelpRequests.length;
    const totalPages = Math.ceil(countTotalPosts / postsPerPage);
    const startIndex = (page - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginatedPosts = posts.slice(startIndex, endIndex);
    resolvedHelpRequests = fetchUserName(resolvedHelpRequests);
    res
      .status(200)
      .render("resolvedHelpPosts", {
        resolvedHelpRequests,
        paginatedPosts,
        totalPages,
        currentPage: page,
      });
  } catch (error) {
    throw error;
  }
});
//Completed
// READ ALL UNRESOLVED HELP REQUESTS FOR ADMIN
myApp.get("/unresolvedHelpPosts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const postsPerPage = 1;
    var unresolvedHelpRequests = await HelpRequest.find({
      isResolved: false,
    });
    unresolvedHelpRequests = fetchUserName(unresolvedHelpRequests);
    const countTotalPosts = unresolvedHelpRequests.length;
    const totalPages = Math.ceil(countTotalPosts / postsPerPage);
    const startIndex = (page - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginatedPosts = posts.slice(startIndex, endIndex);
    res
      .status(200)
      .render("unresolvedHelpPosts", {
        unresolvedHelpRequests,
        paginatedPosts,
        totalPages,
        currentPage: page,
      });
  } catch (error) {
    throw error;
  }
});

myApp.get("/logout", async (req, res) => {
  try {
    res.clearCookie("access_token");
    res.render("login");
  } catch (error) {
    throw error;
  }
});
module.exports = myApp.listen(process.env.PORT || 8000);
console.log("Listening on localhost:8000");
