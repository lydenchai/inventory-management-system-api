const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth");
const stockController = require("../controllers/stockController");
const { validateStock } = require("../middleware/stockValidator");

router.get("/", authenticateToken, stockController.getAll);
router.post("/", authenticateToken, validateStock, stockController.create);
router.get("/summary", authenticateToken, stockController.summary);
router.put("/:id", authenticateToken, validateStock, stockController.update);
router.delete("/:id", authenticateToken, stockController.delete);

module.exports = router;
