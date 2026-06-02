const express = require("express");
const router = express.Router();
const orderRequestController = require("../controllers/orderRequestController");
const authenticateToken = require("../middleware/auth");

router.get("/", authenticateToken, (req, res) => {
  const status = "approved";
  const search = req.query.search || "";
  // Support both approve_status and approve_request.status as query param
  const approve_status =
    req.query.approve_status || req.query["approve_request"] || "";
  const delivery_status =
    req.query.delivery_status || req.query["confirm_delivery"] || "";
  orderRequestController.getAll(req, res, {
    status,
    search,
    approve_status,
    delivery_status,
  });
});
router.post("/:id/confirm", authenticateToken, orderRequestController.confirmDelivery);

module.exports = router;
