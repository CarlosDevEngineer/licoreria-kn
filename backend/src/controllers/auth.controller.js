const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// REGISTER
const register = async (req, res) => {
  const { nombre, username, password, rol } = req.body;

  try {
    const existente = await pool.query(
      "SELECT usuario_id FROM usuarios WHERE username = $1", [username]
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await pool.query(
      `INSERT INTO usuarios (nombre, username, password_hash, rol)
       VALUES ($1, $2, $3, $4)`,
      [nombre, username, hashedPassword, rol]
    );

    res.json({ message: "Usuario creado" });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }
    res.status(500).json({ error: error.message });
  }
};

// LOGIN
const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE username = $1",
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Usuario no existe" });
    }

    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({ error: "Contraseña incorrecta" });
    }

    const token = jwt.sign(
      {
        id: user.usuario_id,
        username: user.username,
        rol: user.rol,
      },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({ token, rol: user.rol, nombre: user.nombre });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
//GET USERS
const getUsers = async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT usuario_id, nombre, username, rol FROM usuarios"
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

//UPDATE USER
const updateUser = async (req, res) => {
  const { id } = req.params;
  const { nombre, username, password, rol } = req.body;

  try {
    const existente = await pool.query(
      "SELECT usuario_id FROM usuarios WHERE username = $1 AND usuario_id != $2", [username, id]
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(
        "UPDATE usuarios SET nombre = $1, username = $2, password_hash = $3, rol = $4 WHERE usuario_id = $5",
        [nombre, username, hashedPassword, rol, id]
      );
    } else {
      await pool.query(
        "UPDATE usuarios SET nombre = $1, username = $2, rol = $3 WHERE usuario_id = $4",
        [nombre, username, rol, id]
      );
    }
    res.json({ message: "Usuario actualizado" });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: "El nombre de usuario ya existe" });
    }
    res.status(500).json({ error: error.message });
  }
};

//DELETE USER
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE inventario_movimientos SET usuario_id = NULL WHERE usuario_id = $1", [id]);
    await pool.query("UPDATE clientes SET usuario_creacion_id = NULL WHERE usuario_creacion_id = $1", [id]);
    await pool.query("UPDATE compras SET usuario_creacion_id = NULL WHERE usuario_creacion_id = $1", [id]);
    await pool.query("UPDATE productos SET usuario_creacion_id = NULL WHERE usuario_creacion_id = $1", [id]);
    await pool.query("UPDATE productos SET usuario_modificacion_id = NULL WHERE usuario_modificacion_id = $1", [id]);
    await pool.query("UPDATE proveedores SET usuario_creacion_id = NULL WHERE usuario_creacion_id = $1", [id]);
    await pool.query("UPDATE ventas SET usuario_creacion_id = NULL WHERE usuario_creacion_id = $1", [id]);
    await pool.query("UPDATE usuarios SET usuario_modificacion_id = NULL WHERE usuario_modificacion_id = $1", [id]);
    await pool.query("DELETE FROM usuarios WHERE usuario_id = $1", [id]);
    res.json({ message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { register, login, getUsers, updateUser, deleteUser };