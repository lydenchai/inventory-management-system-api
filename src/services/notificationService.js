const Notification = require("../models/Notification");

class NotificationService {
  async create(data) {
    const { user_id, type, message, entity_type, entity_id } = data;
    if (!user_id || !type || !message) {
      throw new Error("user_id, type, and message are required.");
    }
    const notification = await Notification.create({
      user_id,
      type,
      message,
      entity_type,
      entity_id,
      read: false,
    });
    return notification;
  }

  async getAll(userId) {
    const notifications = await Notification.find({ user_id: userId, read: false })
      .populate("user_id")
      .sort({ createdAt: -1 })
      .limit(100);
      
    const mapped = notifications.map(n => {
      const obj = n.toJSON();
      obj.user = obj.user_id;
      delete obj.user_id;
      return obj;
    });
    
    return mapped;
  }

  async markRead(id, userId) {
    const notification = await Notification.findById(id);
    if (!notification) throw new Error("Not found");
    if (String(notification.user_id) !== String(userId)) {
      throw new Error("Forbidden");
    }
    notification.read = true;
    await notification.save();
    return notification;
  }

  async markAllRead(userId) {
    await Notification.updateMany(
      { user_id: userId, read: false },
      { read: true }
    );
    return true;
  }

  async unreadCount(userId) {
    const count = await Notification.countDocuments({ user_id: userId, read: false });
    return count;
  }
}

module.exports = new NotificationService();
