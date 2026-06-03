const userService = require("../services/userService");
const { validationResult } = require("express-validator");

exports.getAll = async (req, res) => {
  try {
    const result = await userService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      search: req.query.search,
      permission_id: req.query.permission_id,
      status: req.query.status,
      user_type: req.query.user_type
    });
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const data = await userService.getOne(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    const data = await userService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.message === "Email already exists") return res.status(409).json({ success: false, error: err.message });
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const data = await userService.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    if (err.message === "Email already in use by another user.") return res.status(409).json({ success: false, error: err.message });
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await userService.remove(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    await userService.resetPassword(req.params.id, req.body.password);
    res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    if (err.message === "User not found") return res.status(404).json({ success: false, error: err.message });
    if (err.message.includes("Password must be at least")) return res.status(400).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const data = await userService.updateProfile(req.user._id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === "User not found") return res.status(404).json({ error: err.message });
    if (err.message === "Email already exists") return res.status(409).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const data = await userService.getCustomers();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
