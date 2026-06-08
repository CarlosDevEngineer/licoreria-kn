const express = require("express");
const router = express.Router();
const { getProveedores, createProveedor, updateProveedor, deleteProveedor } = require("../controllers/proveedores.controller");
const authenticateToken = require("../middleware/auth.middleware");
const validate = require("../middleware/validators");
const { proveedorValidator } = require("../middleware/validators/proveedores.validator");

router.get("/", authenticateToken, getProveedores);
router.post("/", authenticateToken, proveedorValidator, validate, createProveedor);
router.put("/:id", authenticateToken, proveedorValidator, validate, updateProveedor);
router.delete("/:id", authenticateToken, deleteProveedor);

module.exports = router;
