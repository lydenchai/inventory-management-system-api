const authService = require("../services/authService");

exports.requestReset = async (req, res) => {
  try {
    await authService.requestPasswordReset(req.body.email);
    res.json({ success: true, message: "Password reset email sent" });
  } catch (err) {
    if (err.message === "Email is required") return res.status(400).json({ error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    if (err.message === "Token and password required" || err.message === "Invalid or expired token") {
      return res.status(400).json({ error: err.message });
    }
    if (err.message === "User not found") return res.status(404).json({ error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};
