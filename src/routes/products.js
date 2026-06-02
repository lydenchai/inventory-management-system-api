const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

const authenticateToken = require('../middleware/auth');
const { validateProduct } = require('../middleware/productValidator');

router.get('/', authenticateToken, productController.getAll);
router.get('/:id', authenticateToken, productController.getOne);
router.post('/', authenticateToken, validateProduct, productController.create);
router.patch('/:id', authenticateToken, productController.update);
router.delete('/:id', authenticateToken, productController.remove);

module.exports = router;