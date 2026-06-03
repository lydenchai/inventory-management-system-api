const express = require("express");
const router = express.Router();
const orderRequestController = require("../controllers/orderRequestController");
const authenticateToken = require("../middleware/auth");

router.get("/", authenticateToken, (req, res) => {
  req.status = "pending";
  orderRequestController.getAll(req, res);
});
router.patch("/:id", authenticateToken, orderRequestController.updateStatus);
router.delete("/:id", authenticateToken, orderRequestController.delete);

module.exports = router;
