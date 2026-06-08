const express = require("express");
const router = express.Router();
const { getClientes, createCliente, updateCliente, deleteCliente } = require("../controllers/clientes.controller");
const authenticateToken = require("../middleware/auth.middleware");
const validate = require("../middleware/validators");
const { clienteValidator } = require("../middleware/validators/clientes.validator");

router.get("/", authenticateToken, getClientes);
router.post("/", authenticateToken, clienteValidator, validate, createCliente);
router.put("/:id", authenticateToken, clienteValidator, validate, updateCliente);
router.delete("/:id", authenticateToken, deleteCliente);

module.exports = router;
