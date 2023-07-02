var express = require("express");
const path = require("path");
let myApp = express();
const session = require("express-session");
const { check, validationResult } = require("express-validator");

myApp.set("views", path.join(__dirname, "views"));
myApp.use(express.static(__dirname + "/public"));

myApp.use(express.urlencoded({ extended: true }));

myApp.set("view engine", "ejs");

const mongoose = require("mongoose");

mongoose.connect("mongodb://0.0.0.0:27017/ConestogaCommunity", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const Admin = mongoose.model("Admin", {
  username: String,
  password: String,
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

myApp.get("/newPost", (req, res) => {
  res.render("newpost");
});

// Create admin credentials
myApp.get("/createAdmin", (req, res) => {
  var credentials = {
    username: "conestoga_admin",
    password: "password",
  };
  let admin = new Admin(credentials);
  admin.save();
  res.send("Admin account created successfully.");
});

myApp.listen(8000);
console.log("Listening on localhost:8000");
