const User = require("../models/User");
const { sendMail } = require("../utils/mail.util");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

// In-memory store for reset tokens (for demo; use DB in production)
const resetTokens = new Map();

// Purge expired tokens every 15 minutes to prevent memory leak
setInterval(
  () => {
    const now = Date.now();
    for (const [key, val] of resetTokens) {
      if (val.expires < now) resetTokens.delete(key);
    }
  },
  15 * 60 * 1000,
).unref();

exports.requestReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    const user = await User.findOne({ where: { email } });
    // Always return success to prevent user enumeration
    if (!user)
      return res.json({ success: true, message: "Password reset email sent" });
    const token = crypto.randomBytes(32).toString("hex");
    resetTokens.set(token, {
      userId: user._id,
      expires: Date.now() + 1000 * 60 * 15,
    });
    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}`;
    try {
      await sendMail({
        to: user.email,
        subject: "Password Reset Request",
        text: `Reset your password: ${resetUrl}`,
        html: `<p>Click <a href='${resetUrl}'>here</a> to reset your password. This link expires in 15 minutes.</p>`,
      });
    } catch (emailErr) {
      console.error("Failed to send password reset email:", emailErr);
      return res
        .status(500)
        .json({
          success: false,
          error: "Failed to send reset email. Please try again later.",
        });
    }
    res.json({ success: true, message: "Password reset email sent" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: "Token and password required" });
    const data = resetTokens.get(token);
    if (!data || data.expires < Date.now())
      return res.status(400).json({ error: "Invalid or expired token" });
    const user = await User.findByPk(data.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    resetTokens.delete(token);
    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
