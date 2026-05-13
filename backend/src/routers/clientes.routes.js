const express = require("express");
const router = express.Router();
const { getClientes, createCliente, updateCliente, deleteCliente } = require("../controllers/clientes.controller");
const authenticateToken = require("../middleware/auth.middleware");

router.get("/", authenticateToken, getClientes);
router.post("/", authenticateToken, createCliente);
router.put("/:id", authenticateToken, updateCliente);
router.delete("/:id", authenticateToken, deleteCliente);

module.exports = router;
