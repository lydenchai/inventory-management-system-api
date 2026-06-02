const express = require("express");
const router = express.Router();
const permissionController = require("../controllers/permissionController");

const checkPermission = require("../middleware/checkPermission");
const authenticateToken = require("../middleware/auth");

router.get("/", authenticateToken, checkPermission("view_permission"), permissionController.getAll);
router.get("/:id", authenticateToken, checkPermission("view_permission"), permissionController.getOne);
router.post("/", authenticateToken, checkPermission("create_permission"), permissionController.create);
router.patch("/:id", authenticateToken, checkPermission("update_permission"), permissionController.update);
router.delete("/:id", authenticateToken, checkPermission("delete_permission"), permissionController.remove);

module.exports = router;
