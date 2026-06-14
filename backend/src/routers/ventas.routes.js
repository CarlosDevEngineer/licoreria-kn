const express = require("express");
const router = express.Router();
const { getVentas, getVentaDetalle, createVenta, deleteVenta, getReporteVentas, getProductosMasVendidos } = require("../controllers/ventas.controller");
const authenticateToken = require("../middleware/auth.middleware");
const validate = require("../middleware/validators");
const { ventaValidator } = require("../middleware/validators/ventas.validator");

router.get("/", authenticateToken, getVentas);
router.get("/reporte", authenticateToken, getReporteVentas);
router.get("/productos-mas-vendidos", authenticateToken, getProductosMasVendidos);
router.get("/:id", authenticateToken, getVentaDetalle);
router.post("/", authenticateToken, ventaValidator, validate, createVenta);
router.delete("/:id", authenticateToken, deleteVenta);

module.exports = router;
