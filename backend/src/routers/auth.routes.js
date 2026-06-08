const express = require("express");
const router = express.Router();
const { register, login, getUsers, updateUser, deleteUser } = require("../controllers/auth.controller");
const authenticateToken = require("../middleware/auth.middleware");
const validate = require("../middleware/validators");
const { registerValidator, loginValidator, updateUserValidator } = require("../middleware/validators/auth.validator");

router.post("/register", authenticateToken, registerValidator, validate, register);
router.post("/login", loginValidator, validate, login);
router.get("/users", authenticateToken, getUsers);
router.put("/users/:id", authenticateToken, updateUserValidator, validate, updateUser);
router.delete("/users/:id", authenticateToken, deleteUser);

module.exports = router;