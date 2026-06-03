const express = require('express');
const router = express.Router();
const stockTransferController = require('../controllers/stockTransfer.controller');
const authenticateToken = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

router.post('/', authenticateToken, checkPermission('create_stock_transfer'), stockTransferController.createTransfer);
router.get('/', authenticateToken, checkPermission('view_stock_transfer'), stockTransferController.getTransfers);

module.exports = router;
