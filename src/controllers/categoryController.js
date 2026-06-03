const categoryService = require("../services/categoryService");
const { validationResult } = require("express-validator");

exports.getAll = async (req, res) => {
  try {
    const result = await categoryService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      search: req.query.search,
      status: req.query.status
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

exports.create = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ success: false, errors: errors.array() });
  }
  try {
    const category = await categoryService.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    if (err.message === "Category already exists.") {
      return res.status(409).json({ success: false, error: err.message });
    }
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const category = await categoryService.update(req.params.id, req.body);
    res.json({ success: true, data: category });
  } catch (err) {
    if (err.message.includes("already exists")) {
      return res.status(409).json({ success: false, error: err.message });
    }
    if (err.message === "Category not found") {
      return res.status(404).json({ error: "Not found" });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await categoryService.remove(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.message === "Category not found") {
      return res.status(404).json({ error: "Not found" });
    }
    if (err.message.includes("Cannot delete")) {
      return res.status(409).json({ success: false, error: err.message });
    }
    res.status(500).json({ success: false, error: err.message });
  }
};
