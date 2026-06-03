const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrder.controller');
const authenticateToken = require('../middleware/auth');

router.post('/', authenticateToken, purchaseOrderController.createPurchaseOrder);
router.get('/', authenticateToken, purchaseOrderController.getPurchaseOrders);
router.get('/:id/pdf', authenticateToken, purchaseOrderController.getPurchaseOrderPdf);
router.put('/:id/status', authenticateToken, purchaseOrderController.updatePurchaseOrderStatus);

module.exports = router;
