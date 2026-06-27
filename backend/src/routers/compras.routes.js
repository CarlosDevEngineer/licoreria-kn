const express = require("express");
const router = express.Router();
const { getComprasReporte, getComprasProducto, createCompra } = require("../controllers/compras.controller");
const authenticateToken = require("../middleware/auth.middleware");

router.get("/reporte", authenticateToken, getComprasReporte);
router.get("/producto/:id", authenticateToken, getComprasProducto);
router.post("/", authenticateToken, createCompra);

module.exports = router;
