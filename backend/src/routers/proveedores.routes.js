const express = require("express");
const router = express.Router();
const { getProveedores, createProveedor, updateProveedor, deleteProveedor } = require("../controllers/proveedores.controller");
const authenticateToken = require("../middleware/auth.middleware");

router.get("/", authenticateToken, getProveedores);
router.post("/", authenticateToken, createProveedor);
router.put("/:id", authenticateToken, updateProveedor);
router.delete("/:id", authenticateToken, deleteProveedor);

module.exports = router;
