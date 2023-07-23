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
  (module.exports.ValidateSignature = async (req, res, next) => {
    const token = req.cookies.access_token;
    if (!token) {
      return res.sendStatus(403);
    }
    try {
      const data = await jwt.verify(token, "conestoga_community");
      req.userId = data;
      return next();
    } catch {
      return res.sendStatus(403);
    }
  });
