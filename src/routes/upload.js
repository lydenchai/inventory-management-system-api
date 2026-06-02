const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const jwt = require("jsonwebtoken");

const router = express.Router();

// Optional auth — attaches req.user if a valid token is present, but does NOT block unauthenticated requests.
// This allows guests (e.g. during registration) to upload documents while still identifying logged-in users.
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, "../../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ext;
    cb(null, name);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } }); // 5 MB max

router.post("/", optionalAuth, upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }
  // Validate file type (allow only images)
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (!allowed.includes(ext)) {
    // Remove the uploaded file if not allowed
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "Only image files are allowed" });
  }
  // Return the absolute URL for the uploaded file
  const protocol = req.protocol;
  const host = req.get("host");
  const url = `${protocol}://${host}/uploads/${req.file.filename}`;
  res.json({ url });
});

module.exports = router;
