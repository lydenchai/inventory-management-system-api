const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const saleController = require("../controllers/saleController");

router.get("/", authenticateToken, saleController.getAll);
router.get("/summary", authenticateToken, saleController.summary);
router.post("/", authenticateToken, saleController.create);
router.get("/:id", authenticateToken, saleController.getOne);
router.patch("/:id", authenticateToken, saleController.update);
router.delete("/:id", authenticateToken, saleController.remove);

module.exports = router;
