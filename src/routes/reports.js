const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticateToken = require('../middleware/auth');

router.get('/inventory-summary', authenticateToken, reportController.inventorySummary);
router.get('/order-stats', authenticateToken, reportController.orderStats);
router.get('/activity-logs', authenticateToken, reportController.activityLogs);
router.get('/trends', authenticateToken, reportController.trends);
router.get('/financial-summary', authenticateToken, reportController.financialSummary);

module.exports = router;