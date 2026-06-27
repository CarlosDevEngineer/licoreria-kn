const pool = require("../config/db");

const getMovimientos = async (req, res) => {
  const { desde, hasta, producto_id } = req.query;
  try {
    let query = `
      SELECT m.*, p.nombre as producto_nombre, p.codigo as producto_codigo,
             p.costo_unitario as costo_unitario_actual,
             p.unidades_por_caja,
             u.nombre as usuario_nombre
      FROM inventario_movimientos m
      LEFT JOIN productos p ON m.producto_id = p.producto_id
      LEFT JOIN usuarios u ON m.usuario_id = u.usuario_id
      WHERE 1=1
    `;
    const params = [];
    if (desde && hasta) {
      const paramIdx = params.length + 1;
      params.push(desde, hasta);
      query += ` AND m.fecha_movimiento >= $${paramIdx}::date AND m.fecha_movimiento < ($${paramIdx + 1}::date + interval '1 day')`;
    }
    if (producto_id) {
      params.push(producto_id);
      query += ` AND m.producto_id = $${params.length}`;
    }
    query += ` ORDER BY m.fecha_movimiento DESC, m.movimiento_id DESC LIMIT 500`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getMovimientos };
