const User = require("../models/User");
const Notification = require("../models/Notification");

// Create a notification
exports.create = async (req, res) => {
  try {
    const { user_id, type, message, entity_type, entity_id } = req.body;
    if (!user_id || !type || !message) {
      return res.status(422).json({ success: false, error: "user_id, type, and message are required." });
    }
    const notification = await Notification.create({
      user_id,
      type,
      message,
      entity_type,
      entity_id,
      read: false,
    });
    res.status(201).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get notifications for current user
exports.getAll = async (req, res) => {
  try {
    const user_id = req.user._id;
    const notifications = await Notification.findAll({
      include: [{ model: User, as: "user" }],
      where: { user_id, read: false },
      order: [["createdAt", "DESC"]],
      limit: 100,
    });
    res.json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Mark notification as read
exports.markRead = async (req, res) => {
  try {
    const notification = await Notification.findByPk(req.params.id);
    if (!notification)
      return res.status(404).json({ success: false, error: "Not found" });
    if (notification.user_id !== req.user._id)
      return res.status(403).json({ success: false, error: "Forbidden" });
    notification.read = true;
    await notification.save();
    res.json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Mark all notifications as read for current user
exports.markAllRead = async (req, res) => {
  try {
    const user_id = req.user._id;
    await Notification.update(
      { read: true },
      { where: { user_id, read: false } },
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// Get unread notification count
exports.unreadCount = async (req, res) => {
  try {
    const user_id = req.user._id;
    const count = await Notification.count({ where: { user_id, read: false } });
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
