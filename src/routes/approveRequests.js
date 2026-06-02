const express = require("express");
const router = express.Router();
const orderRequestController = require("../controllers/orderRequestController");
const authenticateToken = require("../middleware/auth");

router.get("/", authenticateToken, (req, res) => {
  const status = "pending";
  const search = req.query.search || "";
  const supplier_id = req.query.supplier_id || "";
  const requester_id = req.query.requester_id || "";
  orderRequestController.getAll(req, res, {
    status,
    search,
    supplier_id,
    requester_id,
  });
});
router.patch("/:id", authenticateToken, orderRequestController.updateStatus);
router.delete("/:id", authenticateToken, orderRequestController.delete);

module.exports = router;
