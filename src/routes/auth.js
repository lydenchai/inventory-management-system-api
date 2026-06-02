const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authenticateToken = require("../middleware/auth");

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/profile", authenticateToken, authController.profile);

router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

module.exports = router;
