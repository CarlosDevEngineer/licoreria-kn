const pool = require("../config/db");

const getProductos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pr.nombre as proveedor_nombre, pr.contacto as proveedor_email
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.proveedor_id
      ORDER BY p.producto_id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createProducto = async (req, res) => {
  const { nombre, descripcion, tipo_producto, stock_actual, costo_unitario, precio_venta, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja, proveedor_id } = req.body;
  const usuario_creacion_id = req.user?.id;
  try {
    const result = await pool.query(
      `INSERT INTO productos (nombre, descripcion, tipo_producto, stock_actual, costo_unitario, precio_venta, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja, usuario_creacion_id, proveedor_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
      [nombre, descripcion, tipo_producto, stock_actual, costo_unitario, precio_venta, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja, usuario_creacion_id, proveedor_id || null]
    );
    const newProducto = result.rows[0];
    const codigo = `PR-${newProducto.producto_id}`;
    const updateResult = await pool.query(
      `UPDATE productos SET codigo = $1 WHERE producto_id = $2 RETURNING *`,
      [codigo, newProducto.producto_id]
    );
    res.json(updateResult.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateProducto = async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, tipo_producto, stock_actual, costo_unitario, precio_venta, activo, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja, proveedor_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE productos SET nombre = $1, descripcion = $2, tipo_producto = $3, stock_actual = $4, costo_unitario = $5, precio_venta = $6, activo = $7, categoria = $8, marca = $9, presentacion_ml = $10, tipo_envase = $11, unidades_por_caja = $12, proveedor_id = $13, fecha_modificacion = CURRENT_TIMESTAMP WHERE producto_id = $14 RETURNING *`,
      [nombre, descripcion, tipo_producto, stock_actual, costo_unitario, precio_venta, activo, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja, proveedor_id || null, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteProducto = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("DELETE FROM inventario_movimientos WHERE producto_id = $1", [id]);
    await client.query("DELETE FROM ventas_detalle WHERE producto_id = $1", [id]);
    await client.query("DELETE FROM productos WHERE producto_id = $1", [id]);
    await client.query('COMMIT');
    res.json({ message: "Producto eliminado" });
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getProductos, createProducto, updateProducto, deleteProducto };
