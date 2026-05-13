const express = require("express");
const router = express.Router();
const { register, login, getUsers, updateUser, deleteUser } = require("../controllers/auth.controller");
const authenticateToken = require("../middleware/auth.middleware");

router.post("/register", register);
router.post("/login", login);
router.get("/users", authenticateToken, getUsers);
router.put("/users/:id", authenticateToken, updateUser);
router.delete("/users/:id", authenticateToken, deleteUser);

module.exports = router;