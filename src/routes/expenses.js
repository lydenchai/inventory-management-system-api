const express = require("express");
const router = express.Router();
const expenseController = require("../controllers/expenseController");
const authenticateToken = require("../middleware/auth");
const { validateExpense } = require("../middleware/expenseValidator");

router.get("/", authenticateToken, expenseController.getAll);
router.get("/:id", authenticateToken, expenseController.getOne);
router.post("/", authenticateToken, validateExpense, expenseController.create);
router.patch("/:id", authenticateToken, validateExpense, expenseController.update);
router.delete("/:id", authenticateToken, expenseController.remove);

module.exports = router;
