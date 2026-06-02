const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

const authenticateToken = require('../middleware/auth');
const { validateCategory } = require('../middleware/categoryValidator');

router.get('/', categoryController.getAll);
router.post('/', authenticateToken, validateCategory, categoryController.create);
router.patch('/:id', authenticateToken, categoryController.update);
router.delete('/:id', authenticateToken, categoryController.remove);

module.exports = router;