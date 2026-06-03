const express = require("express");
const router = express.Router();
const orderRequestController = require("../controllers/orderRequestController");
const authenticateToken = require("../middleware/auth");

router.get("/", authenticateToken, (req, res) => {
  req.status = "approved";
  orderRequestController.getAll(req, res);
});
router.post(
  "/:id/confirm",
  authenticateToken,
  orderRequestController.confirmDelivery,
);

module.exports = router;
