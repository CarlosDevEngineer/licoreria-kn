const pool = require("../config/db");
const { verificarStockBajo } = require("../services/mail.service");

const getVentas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, c.nombre as cliente_nombre, u.nombre as usuario_nombre, u.username as usuario_username
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id 
      LEFT JOIN usuarios u ON v.usuario_creacion_id = u.usuario_id
      ORDER BY v.venta_id DESC
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getVentaDetalle = async (req, res) => {
  const { id } = req.params;
  try {
    const venta = await pool.query(`
      SELECT v.*, c.nombre as cliente_nombre
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      WHERE v.venta_id = $1
    `, [id]);
    const detalle = await pool.query(`
      SELECT vd.*, p.nombre as producto_nombre, p.codigo as producto_codigo
      FROM ventas_detalle vd
      JOIN productos p ON vd.producto_id = p.producto_id
      WHERE vd.venta_id = $1
    `, [id]);
    res.json({ venta: venta.rows[0], detalle: detalle.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const createVenta = async (req, res) => {
  const { cliente_id, descuento, total, metodo_pago, observaciones, productos } = req.body;
  const usuario_creacion_id = req.user?.id;
  
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    const ventaResult = await client.query(
      `INSERT INTO ventas (cliente_id, subtotal, descuento, total, estado, metodo_pago, observaciones, usuario_creacion_id, numero_factura)
       VALUES ($1, $2, $3, $4, 'completada', $5, $6, $7, (SELECT COALESCE(MAX(venta_id), 0) + 1 FROM ventas))
       RETURNING *`,
      [cliente_id || null, total, descuento || 0, total, metodo_pago, observaciones, usuario_creacion_id]
    );
    
    const venta_id = ventaResult.rows[0].venta_id;
    
    for (const prod of productos) {
      const prodData = await client.query(
        `SELECT stock_actual, costo_unitario, unidades_por_caja, nombre, categoria FROM productos WHERE producto_id = $1`,
        [prod.producto_id]
      );
      const p = prodData.rows[0];
      if (!p) throw new Error(`Producto ${prod.producto_id} no encontrado`);

      const uds = Number(p.unidades_por_caja) || 1;
      const totalUnd = Math.round(Number(p.stock_actual));
      const descontarUnd = prod.tipo_venta === 'caja'
        ? Number(prod.cantidad) * uds
        : Number(prod.cantidad);

      if (totalUnd < descontarUnd) {
        throw new Error(`Stock insuficiente para "${p.nombre}" (${p.categoria})`);
      }

      await client.query(
        `INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal, tipo_venta)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [venta_id, prod.producto_id, prod.cantidad, prod.precio_unitario, prod.subtotal, prod.tipo_venta || 'unidad']
      );

      const nuevoStock = totalUnd - descontarUnd;
      await client.query(
        `UPDATE productos SET stock_actual = $1 WHERE producto_id = $2`,
        [nuevoStock, prod.producto_id]
      );

      await client.query(
        `INSERT INTO inventario_movimientos (producto_id, tipo_movimiento, cantidad, saldo_anterior, saldo_posterior, referencia_id, referencia_tipo, observaciones, usuario_id)
         VALUES ($1, 'venta', $2, $3, $4, $5, 'venta', $6, $7)`,
        [prod.producto_id, -descontarUnd, totalUnd, nuevoStock, venta_id, `Venta #${venta_id}`, usuario_creacion_id]
      );
    }
    
    await client.query("COMMIT");
    verificarStockBajo();
    res.json(ventaResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

const deleteVenta = async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    
    await client.query("DELETE FROM ventas_detalle WHERE venta_id = $1", [id]);
    await client.query("DELETE FROM ventas WHERE venta_id = $1", [id]);
    
    await client.query("COMMIT");
    res.json({ message: "Venta eliminada" });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
};

const getProductosMasVendidos = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.producto_id, p.nombre, p.codigo,
        SUM(
          CASE WHEN vd.tipo_venta = 'caja' THEN vd.cantidad * COALESCE(p.unidades_por_caja, 1)
          ELSE vd.cantidad END
        )::integer AS total_unidades_vendidas,
        COUNT(DISTINCT v.venta_id) AS veces_vendido
      FROM ventas_detalle vd
      JOIN productos p ON vd.producto_id = p.producto_id
      JOIN ventas v ON vd.venta_id = v.venta_id
      WHERE v.estado = 'completada'
      GROUP BY p.producto_id, p.nombre, p.codigo
      ORDER BY total_unidades_vendidas DESC
      LIMIT 10
    `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getReporteVentas = async (req, res) => {
  const { desde, hasta } = req.query;
  try {
    if (!desde || !hasta) {
      return res.status(400).json({ error: 'Los parámetros desde y hasta son obligatorios' });
    }
    const result = await pool.query(`
      SELECT
        v.venta_id, v.fecha_venta, v.subtotal, v.descuento, v.total,
        v.estado, v.metodo_pago, v.observaciones, v.numero_factura,
        c.nombre AS cliente_nombre, u.nombre AS usuario_nombre,
        COALESCE(
          json_agg(
            json_build_object(
              'producto_id', p.producto_id,
              'producto_codigo', p.codigo,
              'producto_nombre', p.nombre,
              'cantidad', vd.cantidad,
              'tipo_venta', vd.tipo_venta,
              'precio_unitario', vd.precio_unitario,
              'subtotal', vd.subtotal,
              'unidades_por_caja', p.unidades_por_caja
            ) ORDER BY vd.venta_detalle_id
          ) FILTER (WHERE vd.venta_detalle_id IS NOT NULL),
          '[]'::json
        ) AS detalle
      FROM ventas v
      LEFT JOIN clientes c ON v.cliente_id = c.cliente_id
      LEFT JOIN usuarios u ON v.usuario_creacion_id = u.usuario_id
      LEFT JOIN ventas_detalle vd ON v.venta_id = vd.venta_id
      LEFT JOIN productos p ON vd.producto_id = p.producto_id
      WHERE v.fecha_venta >= $1 AND v.fecha_venta < ($2::date + interval '1 day')
        AND v.estado = 'completada'
      GROUP BY v.venta_id, c.nombre, u.nombre
      ORDER BY v.venta_id DESC
    `, [desde, hasta]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getVentas, getVentaDetalle, createVenta, deleteVenta, getReporteVentas, getProductosMasVendidos };
