const pool = require("../config/db");

const getProveedores = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM proveedores ORDER BY proveedor_id DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createProveedor = async (req, res) => {
  const { nombre, nit, direccion, celular, contacto } = req.body;
  const usuario_creacion_id = req.user?.id;
  try {
    const existente = await pool.query(
      "SELECT proveedor_id FROM proveedores WHERE nit = $1", [nit]
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: "El NIT ya está registrado", campos: ['nit'] });
    }
    if (nombre) {
      const existenteNombre = await pool.query(
        "SELECT proveedor_id FROM proveedores WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1))", [nombre]
      );
      if (existenteNombre.rows.length > 0) {
        return res.status(400).json({ error: "El nombre ya está registrado", campos: ['nombre'] });
      }
    }
    if (celular) {
      const existenteCel = await pool.query(
        "SELECT proveedor_id FROM proveedores WHERE celular = $1", [celular]
      );
      if (existenteCel.rows.length > 0) {
        return res.status(400).json({ error: "El celular ya está registrado", campos: ['celular'] });
      }
    }
    if (contacto) {
      const emailExistente = await pool.query(
        "SELECT proveedor_id FROM proveedores WHERE contacto = $1", [contacto]
      );
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({ error: "El correo electrónico ya está registrado", campos: ['contacto'] });
      }
    }
    const result = await pool.query(
      `INSERT INTO proveedores (nombre, nit, direccion, celular, contacto, usuario_creacion_id) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [nombre, nit, direccion, celular, contacto, usuario_creacion_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: "El NIT o correo ya está registrado" });
    }
    res.status(500).json({ error: error.message });
  }
};

const updateProveedor = async (req, res) => {
  const { id } = req.params;
  const { nombre, nit, direccion, celular, contacto, activo } = req.body;
  try {
    const existente = await pool.query(
      "SELECT proveedor_id FROM proveedores WHERE nit = $1 AND proveedor_id != $2", [nit, id]
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: "El NIT ya está registrado", campos: ['nit'] });
    }
    if (nombre) {
      const existenteNombre = await pool.query(
        "SELECT proveedor_id FROM proveedores WHERE LOWER(TRIM(nombre)) = LOWER(TRIM($1)) AND proveedor_id != $2", [nombre, id]
      );
      if (existenteNombre.rows.length > 0) {
        return res.status(400).json({ error: "El nombre ya está registrado", campos: ['nombre'] });
      }
    }
    if (celular) {
      const existenteCel = await pool.query(
        "SELECT proveedor_id FROM proveedores WHERE celular = $1 AND proveedor_id != $2", [celular, id]
      );
      if (existenteCel.rows.length > 0) {
        return res.status(400).json({ error: "El celular ya está registrado", campos: ['celular'] });
      }
    }
    if (contacto) {
      const emailExistente = await pool.query(
        "SELECT proveedor_id FROM proveedores WHERE contacto = $1 AND proveedor_id != $2", [contacto, id]
      );
      if (emailExistente.rows.length > 0) {
        return res.status(400).json({ error: "El correo electrónico ya está registrado", campos: ['contacto'] });
      }
    }
    const result = await pool.query(
      `UPDATE proveedores SET nombre = $1, nit = $2, direccion = $3, celular = $4, contacto = $5, activo = $6 WHERE proveedor_id = $7 RETURNING *`,
      [nombre, nit, direccion, celular, contacto, activo, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ error: "El NIT o correo ya está registrado" });
    }
    res.status(500).json({ error: error.message });
  }
};

const deleteProveedor = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    await client.query("DELETE FROM proveedores WHERE proveedor_id = $1", [id]);
    
    await client.query("COMMIT");
    res.json({ message: "Proveedor eliminado" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getProveedores, createProveedor, updateProveedor, deleteProveedor };
