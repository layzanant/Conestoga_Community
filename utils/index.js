const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

(module.exports.GenerateSalt = async () => {
  return await bcrypt.genSalt();
}),
  (module.exports.GeneratePassword = async (password, salt) => {
    // console.log("await bcrypt.hash(password, salt) : " + await bcrypt.hash(password, salt));
    return await bcrypt.hash(password, salt);
  });

module.exports.ValidatePassword = async (
  enteredPassword,
  savedPassword,
  salt
) => {
  // console.log(enteredPassword);
  // console.log("salt : "  + salt);
  // console.log("savedPassword : "  + savedPassword)
  return (await this.GeneratePassword(enteredPassword, salt)) == savedPassword;
};

(module.exports.GenerateSignature = async (payload, expireIn = "1d") => {
  return await jwt.sign(payload, "conestoga_community", {
    expiresIn: expireIn,
  });
});
