const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');

const authenticateToken = require('../middleware/auth');
const { validateSupplier } = require('../middleware/supplierValidator');
const upload = require("../middleware/upload.middleware");

router.get('/', authenticateToken, supplierController.getAll);
router.post("/import", authenticateToken, upload.single("file"), supplierController.importSuppliers);
router.post('/', authenticateToken, validateSupplier, supplierController.create);
router.get("/:id", authenticateToken, supplierController.getOne);
router.patch('/:id', authenticateToken, supplierController.update);
router.delete('/:id', authenticateToken, supplierController.remove);

module.exports = router;