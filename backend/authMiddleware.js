const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {

 const authHeader = req.headers.authorization;

 if (!authHeader)
  return res.status(401).json("Token Missing");

 const token = authHeader.split(" ")[1];   // 🔥 THIS LINE IS MAGIC

 if (!token)
  return res.status(401).json("Invalid Token Format");

 try {
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  req.user = verified;
  next();
 } catch (err) {
  res.status(401).json("Invalid Token");
 }
};

module.exports = { verifyToken };