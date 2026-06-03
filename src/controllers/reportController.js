const reportService = require("../services/reportService");

exports.trends = async (req, res) => {
  try {
    const data = await reportService.getTrends({ from: req.query.from, to: req.query.to }, req.user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.inventorySummary = async (req, res) => {
  try {
    const data = await reportService.getInventorySummary(req.user);
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.orderStats = async (req, res) => {
  try {
    const data = await reportService.getOrderStats({ from: req.query.from, to: req.query.to }, req.user);
    res.json(data);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.activityLogs = async (req, res) => {
  try {
    const result = await reportService.getActivityLogs({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      start_date: req.query.start_date,
      end_date: req.query.end_date
    }, req.user);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Failed to fetch activity logs" });
  }
};

exports.financialSummary = async (req, res) => {
  try {
    const data = await reportService.getFinancialSummary({
      start_date: req.query.start_date,
      end_date: req.query.end_date
    }, req.user);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
