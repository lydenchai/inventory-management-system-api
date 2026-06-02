const express = require('express');
const router = express.Router();
const orderRequestController = require('../controllers/orderRequestController');

const authenticateToken = require('../middleware/auth');
const { validateOrderRequest } = require('../middleware/orderRequestValidator');

router.get('/', authenticateToken, orderRequestController.getAll);
router.get('/pending/count', authenticateToken, orderRequestController.getPendingOrderRequestCount);
router.post('/', authenticateToken, validateOrderRequest, orderRequestController.create);
router.patch('/:id', authenticateToken, orderRequestController.update);
router.patch('/:id/status', authenticateToken, orderRequestController.updateStatus);
router.patch('/:id/cancel', authenticateToken, orderRequestController.cancelOrderRequest);
router.delete('/:id', authenticateToken, orderRequestController.delete);
router.post('/:id/confirm', authenticateToken, orderRequestController.confirmDelivery);

module.exports = router;