const notificationService = require("../services/notificationService");

exports.create = async (req, res) => {
  try {
    const data = await notificationService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.message === "user_id, type, and message are required.") {
      return res.status(422).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    const data = await notificationService.getAll(req.user._id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const data = await notificationService.markRead(req.params.id, req.user._id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ success: false, error: err.message });
    if (err.message === "Forbidden") return res.status(403).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.markAllRead = async (req, res) => {
  try {
    await notificationService.markAllRead(req.user._id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.unreadCount = async (req, res) => {
  try {
    const count = await notificationService.unreadCount(req.user._id);
    res.json({ success: true, data: { count } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
