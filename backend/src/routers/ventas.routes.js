const express = require("express");
const router = express.Router();
const { getVentas, getVentaDetalle, createVenta, deleteVenta } = require("../controllers/ventas.controller");
const authenticateToken = require("../middleware/auth.middleware");

router.get("/", authenticateToken, getVentas);
router.get("/:id", authenticateToken, getVentaDetalle);
router.post("/", authenticateToken, createVenta);
router.delete("/:id", authenticateToken, deleteVenta);

module.exports = router;
