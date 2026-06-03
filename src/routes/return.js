const express = require('express');
const router = express.Router();
const returnController = require('../controllers/return.controller');
const authenticateToken = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

router.post('/', authenticateToken, checkPermission('create_return'), returnController.createReturn);
router.get('/', authenticateToken, checkPermission('view_return'), returnController.getReturns);

module.exports = router;
