const express = require('express');
const router = express.Router();
const locationController = require('../controllers/location.controller');
const authenticateToken = require('../middleware/auth');
const checkPermission = require('../middleware/checkPermission');

router.post('/', authenticateToken, checkPermission('create_location'), locationController.createLocation);
router.get('/', authenticateToken, checkPermission('view_location'), locationController.getLocations);
router.put('/:id', authenticateToken, checkPermission('update_location'), locationController.updateLocation);
router.delete('/:id', authenticateToken, checkPermission('delete_location'), locationController.deleteLocation);

module.exports = router;
