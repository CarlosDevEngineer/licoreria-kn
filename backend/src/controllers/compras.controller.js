const pool = require("../config/db");

const getComprasReporte = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Los parámetros desde y hasta son obligatorios' });
    }
    const result = await pool.query(`
      SELECT
        c.compra_id, c.fecha_compra, c.numero_factura, c.subtotal, c.total,
        c.estado, c.observaciones,
        pr.nombre AS proveedor_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'producto_id', p.producto_id,
              'producto_nombre', p.nombre,
              'producto_codigo', p.codigo,
              'cantidad', cd.cantidad,
              'precio_unitario', cd.precio_unitario,
              'subtotal', cd.subtotal
            ) ORDER BY cd.compra_detalle_id
          ) FILTER (WHERE cd.compra_detalle_id IS NOT NULL),
          '[]'::json
        ) AS detalle
      FROM compras c
      LEFT JOIN proveedores pr ON c.proveedor_id = pr.proveedor_id
      LEFT JOIN compras_detalle cd ON c.compra_id = cd.compra_id
      LEFT JOIN productos p ON cd.producto_id = p.producto_id
      WHERE c.fecha_compra >= $1 AND c.fecha_compra < ($2::date + interval '1 day')
      GROUP BY c.compra_id, pr.nombre
      ORDER BY c.fecha_compra DESC, c.compra_id DESC
    `, [desde, hasta]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getComprasProducto = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT c.compra_id, c.fecha_compra, c.numero_factura,
        cd.cantidad, cd.precio_unitario, cd.subtotal,
        pr.nombre AS proveedor_nombre
      FROM compras_detalle cd
      JOIN compras c ON cd.compra_id = c.compra_id
      LEFT JOIN proveedores pr ON c.proveedor_id = pr.proveedor_id
      WHERE cd.producto_id = $1
      ORDER BY c.fecha_compra DESC, c.compra_id DESC
    `, [id]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createCompra = async (req, res) => {
  const { producto_id, proveedor_id, cantidad_cajas, costo_unitario, precio_venta } = req.body;
  const usuario_creacion_id = req.user?.id;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const prodResult = await client.query(
      "SELECT unidades_por_caja, stock_actual, costo_unitario FROM productos WHERE producto_id = $1",
      [producto_id]
    );
    const p = prodResult.rows[0];
    if (!p) throw new Error("Producto no encontrado");

    const uds = Number(p.unidades_por_caja) || 1;
    const cajas = Number(cantidad_cajas);
    const costo = Number(costo_unitario);
    const subtotal = cajas * costo;

    const compraResult = await client.query(
      `INSERT INTO compras (proveedor_id, numero_factura, fecha_compra, subtotal, total, estado, usuario_creacion_id)
       VALUES ($1, $2, CURRENT_DATE, $3, $3, 'completada', $4) RETURNING *`,
      [proveedor_id, `C-${Date.now()}`, subtotal, usuario_creacion_id]
    );
    const compra_id = compraResult.rows[0].compra_id;

    await client.query(
      `INSERT INTO compras_detalle (compra_id, producto_id, cantidad, precio_unitario, subtotal)
       VALUES ($1, $2, $3, $4, $5)`,
      [compra_id, producto_id, cajas, costo, subtotal]
    );

    const nuevoStock = Number(p.stock_actual) + cajas * uds;
    await client.query(
      `UPDATE productos SET stock_actual = $1, costo_unitario = $2, precio_venta = $3 WHERE producto_id = $4`,
      [nuevoStock, costo, precio_venta, producto_id]
    );

    await client.query(
      `INSERT INTO inventario_movimientos (producto_id, tipo_movimiento, cantidad, saldo_anterior, saldo_posterior, referencia_id, referencia_tipo, observaciones, usuario_id)
       VALUES ($1, 'compra', $2, $3, $4, $5, 'compra', $6, $7)`,
      [producto_id, cajas * uds, Number(p.stock_actual), nuevoStock, compra_id, `Compra #${compra_id}`, usuario_creacion_id]
    );

    await client.query("COMMIT");
    res.json(compraResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

module.exports = { getComprasReporte, getComprasProducto, createCompra };
