const express = require("express");
const router = express.Router();
const { getProductos, createProducto, updateProducto, deleteProducto } = require("../controllers/productos.controller");
const authenticateToken = require("../middleware/auth.middleware");

router.get("/", authenticateToken, getProductos);
router.post("/", authenticateToken, createProducto);
router.put("/:id", authenticateToken, updateProducto);
router.delete("/:id", authenticateToken, deleteProducto);

module.exports = router;
