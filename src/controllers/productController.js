const productService = require("../services/productService");
const { validationResult } = require("express-validator");

exports.getAll = async (req, res) => {
  try {
    const result = await productService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      search: req.query.search,
      category: req.query.category,
      supplier: req.query.supplier,
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

exports.getOne = async (req, res) => {
  try {
    const product = await productService.getOne(req.params.id);
    res.json({ success: true, data: product });
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
    const product = await productService.create(req.body, req.user?._id);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const product = await productService.update(req.params.id, req.body);
    res.json({ success: true, data: product });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await productService.remove(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ success: false, error: err.message });
  }
};
