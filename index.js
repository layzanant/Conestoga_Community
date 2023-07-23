var express = require("express");
const path = require("path");
require("dotenv").config();
let myApp = express();
const session = require("express-session");
const { check, validationResult } = require("express-validator");
const {
  GenerateSalt,
  GeneratePassword,
  ValidatePassword,
  GenerateSignature,
} = require("./utils");

myApp.set("views", path.join(__dirname, "views"));
myApp.use(express.static(__dirname + "/public"));
myApp.use(express.json());
myApp.use(express.urlencoded({ extended: true }));

myApp.set("view engine", "ejs");

const mongoose = require("mongoose");
const { create } = require("domain");

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const User = mongoose.model("User", {
  firstName: String,
  lastName: String,
  email: String,
  isAlumini: Boolean,
  isAdmin: Boolean,
  password: String,
  salt: String,
});

const Post = mongoose.model("Post", {
  title: String,
  category: String,
  description: String,
  userId: String,
});

const Comment = mongoose.model("Comment", {
  comment: String,
  postId: String,
  userId: String,
});

const HelpRequest = mongoose.model("HelpRequest", {
  title: String,
  category: String,
  description: String,
  userId: String,
  isResolved: Boolean,
  resolutionComment: String,
});

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

// SIGNUP
myApp.post("/signUp", async (req, res) => {
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
      return res.status(201).json(createdUser);
    }
    return res.status(400).json({ message: "User already exists !" });
  } catch (error) {
    throw error;
  }
});

// SIGNIN
myApp.get("/signIn", async (req, res) => {
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
          token,
        };
        res.status(200).json(sendUserResponse);
      } else res.status(400).json({ message: "Wrong password!" });
    } else res.status(404).json({ message: "User not found!" });
  } catch (error) {
    throw error;
  }
});

const posts = [
  {
    username: "User1",
    title: "2023-07-19",
    description: "This is the first post!",
  },
  {
    username: "User2",
    title: "2023-07-18",
    description: "Just posted another update.",
  },
  {
    username: "User3",
    title: "2023-07-19",
    description: "This is the first post!",
  },
  {
    username: "User4",
    title: "2023-07-18",
    description: "Just posted another update.",
  },
  {
    username: "User5",
    title: "2023-07-19",
    description: "This is the first post!",
  },
  {
    username: "User6",
    date: "2023-07-18",
    content: "Just posted another update.",
  },
  { author: "User7", date: "2023-07-19", content: "This is the first post!" },
  {
    author: "User8",
    date: "2023-07-18",
    content: "Just posted another update.",
  },
  // Add more posts here
];
myApp.get("/newPost", (req, res) => {
  res.render("newpost");
});
myApp.get("/newGetHelp", (req, res) => {
  res.render("newGetHelp");
});
myApp.get("/updateProfile", (req, res) => {
  res.render("updateProfile");
});
myApp.get("/adminHomePage", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const postsPerPage = 2;
  const totalPosts = posts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;

  const paginatedPosts = posts.slice(startIndex, endIndex);

  res.render("adminHomePage", {
    posts: paginatedPosts,
    totalPages,
    currentPage: page,
  });
});
myApp.get("/homePage", (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const postsPerPage = 2;
  const totalPosts = posts.length;
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const startIndex = (page - 1) * postsPerPage;
  const endIndex = startIndex + postsPerPage;

  const paginatedPosts = posts.slice(startIndex, endIndex);

  res.render("homePage", {
    posts: paginatedPosts,
    totalPages,
    currentPage: page,
  });
});
// CREATE A POST
myApp.post("/createPost", async (req, res) => {
  const post = req.body;
  var token = req.headers.authorization.split(" ")[1];
  const tokenObj = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString()
  );
  try {
    post.userId = tokenObj._id;
    const createdPost = await new Post(post).save();
    res.status(200).json(createdPost);
  } catch (error) {
    throw error;
  }
});

// READ ALL POSTS
myApp.get("/allPosts", async (req, res) => {
  try {
    const allPosts = await Post.find({});
    res.status(200).json(allPosts);
  } catch (error) {
    throw error;
  }
});

// READ POST BY USER ID
myApp.get("/postsByUser", async (req, res) => {
  try {
    var token = req.headers.authorization.split(" ")[1];
    const tokenObj = JSON.parse(
      Buffer.from(token.split(".")[1], "base64").toString()
    );
    const postsByUserId = await Post.find({ userId: tokenObj._id });
    res.status(200).json(postsByUserId);
  } catch (error) {
    throw error;
  }
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
  const comment = req.body;
  var token = req.headers.authorization.split(" ")[1];
  const tokenObj = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString()
  );
  try {
    comment.userId = tokenObj._id;
    const createdComment = await new Post(post).save();
    res.status(200).json(createdComment);
  } catch (error) {
    throw error;
  }
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

// RAISE A HELP REQUEST
myApp.post("/raiseHelpRequest", async (req, res) => {
  const help = req.body;
  var token = req.headers.authorization.split(" ")[1];
  const tokenObj = JSON.parse(
    Buffer.from(token.split(".")[1], "base64").toString()
  );
  try {
    help.userId = tokenObj._id;
    help.isResolved = false;
    const raisedRequest = await new HelpRequest(help).save();
    res.status(200).json(raisedRequest);
  } catch (error) {
    throw error;
  }
});

// READ ALL HELP REQUESTS
myApp.get("/allHelpRequests", async (req, res) => {
  try {
    const allHelpRequests = await HelpRequest.find({});
    res.status(200).json(allHelpRequests);
  } catch (error) {
    throw error;
  }
});

// RESOLVE A HELP REQUEST
myApp.post("/resolveRequest", async (req, res) => {
  try {
    var req = req.body;
    const updatedRequest = HelpRequest.update(
      { _id: req.reqId },
      { $set: { resolutionComment: req.resolutionComment } }
    );
    res.status(200).json(updatedRequest);
  } catch (error) {
    throw error;
  }
});

module.exports = myApp.listen(process.env.PORT || 8000);
console.log("Listening on localhost:8000");
