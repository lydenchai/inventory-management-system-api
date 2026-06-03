const expenseService = require("../services/expenseService");

exports.getAll = async (req, res) => {
  try {
    const result = await expenseService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      category: req.query.category,
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

exports.getOne = async (req, res) => {
  try {
    const expense = await expenseService.getOne(req.params.id);
    res.json({ success: true, data: expense });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const expense = await expenseService.create(req.body, req.user?._id);
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    if (err.message.startsWith("Validation Error")) {
      return res.status(422).json({ success: false, error: err.message.replace("Validation Error: ", "") });
    }
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const expense = await expenseService.update(req.params.id, req.body);
    res.json({ success: true, data: expense });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(400).json({ success: false, error: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    await expenseService.remove(req.params.id);
    res.json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    res.status(500).json({ success: false, error: err.message });
  }
};
