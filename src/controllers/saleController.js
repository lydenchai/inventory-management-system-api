const saleService = require("../services/saleService");

exports.getAll = async (req, res) => {
  try {
    const result = await saleService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      customer: req.query.customer,
      status: req.query.status,
      search: req.query.search
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

exports.summary = async (req, res) => {
  try {
    const result = await saleService.getSummary();
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const sale = await saleService.getOne(req.params.id);
    res.json({ success: true, data: sale });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const sale = await saleService.create(req.body, req.user?._id);
    res.status(201).json({ success: true, data: sale });
  } catch (err) {
    if (err.message.startsWith("Validation Error")) {
      return res.status(422).json({ success: false, error: err.message.replace("Validation Error: ", "") });
    }
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const sale = await saleService.update(req.params.id, req.body, req.user?._id);
    res.json({ success: true, data: sale });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ success: false, error: "Not found" });
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await saleService.remove(req.params.id, req.user?._id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ error: err.message });
  }
};
