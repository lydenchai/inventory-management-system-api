const express = require("express");
const router = express.Router();
const controller = require("../controllers/passwordResetController");

router.post("/request", controller.requestReset);
router.post("/reset", controller.resetPassword);

module.exports = router;
