const pool = require("../config/db");

const getClientes = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM clientes ORDER BY cliente_id DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCliente = async (req, res) => {
  const { nit_ci, nombre, telefono } = req.body;
  const usuario_creacion_id = req.user?.id;
  try {
    const existente = await pool.query(
      "SELECT cliente_id FROM clientes WHERE nit_ci = $1", [nit_ci]
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: "El NIT/CI ya está registrado" });
    }
    const result = await pool.query(
      `INSERT INTO clientes (nit_ci, nombre, telefono, usuario_creacion_id) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nit_ci, nombre, telefono, usuario_creacion_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: "El NIT/CI ya está registrado" });
    }
    res.status(500).json({ error: error.message });
  }
};

const updateCliente = async (req, res) => {
  const { id } = req.params;
  const { nit_ci, nombre, telefono } = req.body;
  try {
    const existente = await pool.query(
      "SELECT cliente_id FROM clientes WHERE nit_ci = $1 AND cliente_id != $2", [nit_ci, id]
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: "El NIT/CI ya está registrado" });
    }
    const result = await pool.query(
      `UPDATE clientes SET nit_ci = $1, nombre = $2, telefono = $3 WHERE cliente_id = $4 RETURNING *`,
      [nit_ci, nombre, telefono, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: "El NIT/CI ya está registrado" });
    }
    res.status(500).json({ error: error.message });
  }
};

const deleteCliente = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("DELETE FROM ventas_detalle WHERE venta_id IN (SELECT venta_id FROM ventas WHERE cliente_id = $1)", [id]);
    await client.query("DELETE FROM ventas WHERE cliente_id = $1", [id]);
    await client.query("DELETE FROM clientes WHERE cliente_id = $1", [id]);
    await client.query('COMMIT');
    res.json({ message: "Cliente eliminado" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getClientes, createCliente, updateCliente, deleteCliente };
