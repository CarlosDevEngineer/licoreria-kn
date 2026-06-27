const express = require("express");
const router = express.Router();
const authenticateToken = require("../middleware/auth.middleware");
const { getMovimientos } = require("../controllers/inventario.controller");

router.get("/movimientos", authenticateToken, getMovimientos);

module.exports = router;
