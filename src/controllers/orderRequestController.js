const orderRequestService = require("../services/orderRequestService");
const { validationResult } = require("express-validator");

exports.getAll = async (req, res) => {
  try {
    let status = req.query.status;
    if (req.status) status = req.status; // For specific routes

    const result = await orderRequestService.getAll({
      page: parseInt(req.query.page, 10),
      limit: parseInt(req.query.limit, 10),
      status,
      supplier_id: req.query.supplier_id,
      requester_id: req.query.requester_id,
      search: req.query.search,
      approve_status: req.query.approve_status,
      start_date: req.query.start_date,
      end_date: req.query.end_date
    }, req.user);
    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

exports.getPendingOrderRequestCount = async (req, res) => {
  try {
    const count = await orderRequestService.getPendingCount(req.user);
    res.json({ success: true, count });
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
    const order = await orderRequestService.create(req.body, req.user);
    res.status(201).json({ success: true, data: order });
  } catch (err) {
    if (err.message.startsWith("Validation Error")) {
      return res.status(422).json({ success: false, error: err.message.replace("Validation Error: ", "") });
    }
    res.status(400).json({ error: err.message });
  }
};

exports.updateStatus = async (req, res) => {
  try {
    const order = await orderRequestService.updateStatus(req.params.id, req.body, req.user);
    res.json({ success: true, data: order });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    if (err.message.includes("Invalid status value")) return res.status(400).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
};

exports.cancelOrderRequest = async (req, res) => {
  try {
    const order = await orderRequestService.cancelOrderRequest(req.params.id, req.user);
    res.json({ success: true, data: order });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    if (err.message === "Only pending orders can be cancelled") return res.status(400).json({ error: err.message });
    if (err.message === "Not authorized to cancel this order") return res.status(403).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
};

exports.confirmDelivery = async (req, res) => {
  try {
    const order = await orderRequestService.confirmDelivery(req.params.id, req.user);
    res.json({ success: true, data: order });
  } catch (err) {
    if (err.message === "Not found") return res.status(404).json({ error: "Not found" });
    if (err.message === "Only approved orders can be confirmed for delivery") return res.status(400).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const order = await orderRequestService.update(req.params.id, req.body, req.user);
    res.json({ success: true, data: order });
  } catch (err) {
    if (err.message === "Order request not found") return res.status(404).json({ error: err.message });
    if (err.message === "Only pending order requests can be updated") return res.status(400).json({ error: err.message });
    res.status(400).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await orderRequestService.remove(req.params.id);
    res.json({ success: true, message: "Order request deleted successfully" });
  } catch (err) {
    if (err.message === "Order request not found") return res.status(404).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
};
