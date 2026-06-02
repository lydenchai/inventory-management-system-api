const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  // Check for token in Authorization header or cookies
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  const cookieToken = req.cookies.access_token;
  const finalToken = token || cookieToken;
  if (!finalToken) {
    return res.status(401).json({
      success: false,
      error: "Access token is required",
    });
  }

  jwt.verify(finalToken, process.env.JWT_SECRET, (err, user) => {
    if (err)
      return res
        .status(401)
        .json({ success: false, error: "Invalid or expired token" });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
