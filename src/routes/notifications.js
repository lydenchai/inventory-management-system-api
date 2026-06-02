const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const authenticateToken = require("../middleware/auth");
 
router.get("/", authenticateToken, notificationController.getAll); 
router.patch("/read-all", authenticateToken, notificationController.markAllRead);
router.patch("/:id/read", authenticateToken, notificationController.markRead); 
router.get("/unread/count", authenticateToken, notificationController.unreadCount);

module.exports = router;
