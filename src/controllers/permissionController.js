const permissionService = require("../services/permissionService");

exports.getAll = async (req, res) => {
  try {
    const result = await permissionService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      search: req.query.search
    });
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const data = await permissionService.getOne(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === "Permission not found") return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = await permissionService.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    if (err.message === "Role name is required.") return res.status(422).json({ error: err.message });
    if (err.message.includes("already exists")) return res.status(409).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const data = await permissionService.update(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    if (err.message === "Permission not found") return res.status(404).json({ error: err.message });
    if (err.message.includes("already exists")) return res.status(409).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await permissionService.remove(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.message === "Permission not found") return res.status(404).json({ error: "Not found" });
    if (err.message.includes("referenced by existing user records")) return res.status(409).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};
