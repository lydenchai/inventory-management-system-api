const stockService = require("../services/stockService");

exports.getAll = async (req, res) => {
  try {
    const result = await stockService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      search: req.query.search,
      type: req.query.type,
      product: req.query.product,
      user: req.query.user,
      location: req.query.location,
      start_date: req.query.start_date,
      end_date: req.query.end_date
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
  try {
    const stock = await stockService.create(req.body, req.user?._id);
    res.status(201).json(stock);
  } catch (err) {
    if (err.message === "Product not found") return res.status(404).json({ error: "Product not found" });
    if (err.message.includes("Insufficient available stock")) return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.summary = async (req, res) => {
  try {
    const result = await stockService.getSummary(req.query);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const stock = await stockService.update(req.params.id, req.body);
    res.json({ success: true, data: stock });
  } catch (err) {
    if (err.message.includes("not found")) return res.status(404).json({ success: false, error: err.message });
    if (err.message.includes("Not enough available stock")) return res.status(400).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await stockService.remove(req.params.id);
    res.json({ success: true, message: "Stock record deleted" });
  } catch (err) {
    if (err.message === "Stock record not found") return res.status(404).json({ success: false, error: err.message });
    res.status(500).json({ success: false, error: err.message });
  }
};
