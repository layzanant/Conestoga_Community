const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

(module.exports.GenerateSalt = async () => {
  return await bcrypt.genSalt();
}),
  (module.exports.GeneratePassword = async (password, salt) => {
    return await bcrypt.hash(password, salt);
  });

module.exports.ValidatePassword = async (
  enteredPassword,
  savedPassword,
  salt
) => {
  return (await this.GeneratePassword(enteredPassword, salt)) === savedPassword;
};

(module.exports.GenerateSignature = async (payload, expireIn = "1d") => {
  return await jwt.sign(payload, "conestoga_community", {
    expiresIn: expireIn,
  });
}),
  (module.exports.ValidateSignature = async (req) => {
    const signature = req.get("Authorization");
    if (signature) {
      const payload = await jwt.verify(
        signature.split(" ")[1],
        "conestoga_community"
      );
      req.user = payload;
      return true;
    }

    return false;
  });
