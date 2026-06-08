const express = require("express");
const router = express.Router();
const { getProductos, createProducto, updateProducto, deleteProducto } = require("../controllers/productos.controller");
const authenticateToken = require("../middleware/auth.middleware");
const validate = require("../middleware/validators");
const { productoValidator } = require("../middleware/validators/productos.validator");

router.get("/", authenticateToken, getProductos);
router.post("/", authenticateToken, productoValidator, validate, createProducto);
router.put("/:id", authenticateToken, productoValidator, validate, updateProducto);
router.delete("/:id", authenticateToken, deleteProducto);

module.exports = router;
