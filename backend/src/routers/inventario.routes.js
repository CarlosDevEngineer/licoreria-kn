const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth.middleware");
const { getMovimientos, getStockHistorial } = require("../controllers/inventario.controller");

router.get("/movimientos", authenticateToken, getMovimientos);
router.get("/stock-historial", authenticateToken, getStockHistorial);

module.exports = router;
