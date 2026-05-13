const pool = require("../config/db");

const getProductos = async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM productos ORDER BY producto_id DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createProducto = async (req, res) => {
  const { codigo, nombre, descripcion, tipo_producto, es_terminado, stock_actual, stock_minimo, unidad_medida, costo_unitario, precio_venta, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja } = req.body;
  const usuario_creacion_id = req.user?.id;
  try {
    const result = await pool.query(
      `INSERT INTO productos (codigo, nombre, descripcion, tipo_producto, es_terminado, stock_actual, stock_minimo, unidad_medida, costo_unitario, precio_venta, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja, usuario_creacion_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16) RETURNING *`,
      [codigo, nombre, descripcion, tipo_producto, es_terminado ?? true, stock_actual, stock_minimo, unidad_medida, costo_unitario, precio_venta, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja, usuario_creacion_id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateProducto = async (req, res) => {
  const { id } = req.params;
  const { codigo, nombre, descripcion, tipo_producto, es_terminado, stock_actual, stock_minimo, unidad_medida, costo_unitario, precio_venta, activo, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja } = req.body;
  try {
    const result = await pool.query(
      `UPDATE productos SET codigo = $1, nombre = $2, descripcion = $3, tipo_producto = $4, es_terminado = $5, stock_actual = $6, stock_minimo = $7, unidad_medida = $8, costo_unitario = $9, precio_venta = $10, activo = $11, categoria = $12, marca = $13, presentacion_ml = $14, tipo_envase = $15, unidades_por_caja = $16, fecha_modificacion = CURRENT_TIMESTAMP WHERE producto_id = $17 RETURNING *`,
      [codigo, nombre, descripcion, tipo_producto, es_terminado ?? true, stock_actual, stock_minimo, unidad_medida, costo_unitario, precio_venta, activo, categoria, marca, presentacion_ml, tipo_envase, unidades_por_caja, id]
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
