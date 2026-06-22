const express = require('express');
const router = express.Router();
const purchaseOrderController = require('../controllers/purchaseOrder.controller');
const authenticateToken = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

router.post('/', authenticateToken, checkPermission('create_purchase_order'), purchaseOrderController.createPurchaseOrder);
router.get('/', authenticateToken, checkPermission('view_purchase_order'), purchaseOrderController.getPurchaseOrders);
router.get('/:id/pdf', authenticateToken, checkPermission('view_purchase_order'), purchaseOrderController.getPurchaseOrderPdf);
router.put('/:id/status', authenticateToken, checkPermission('update_purchase_order'), purchaseOrderController.updatePurchaseOrderStatus);

module.exports = router;
