const pool = require("../config/db");

const getVentas = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.*, c.nombre as cliente_nombre, u.nombre as usuario_nombre 
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
    const venta = await pool.query("SELECT * FROM ventas WHERE venta_id = $1", [id]);
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
      [cliente_id, total, descuento || 0, total, metodo_pago, observaciones, usuario_creacion_id]
    );
    
    const venta_id = ventaResult.rows[0].venta_id;
    
    for (const prod of productos) {
      const prodData = await client.query(
        `SELECT stock_actual, unidades_por_caja FROM productos WHERE producto_id = $1`,
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
        throw new Error(`Stock insuficiente para el producto ID ${prod.producto_id}`);
      }

      await client.query(
        `INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal, tipo_venta)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [venta_id, prod.producto_id, prod.cantidad, prod.precio_unitario, prod.subtotal, prod.tipo_venta || 'unidad']
      );
    }
    
    await client.query("COMMIT");
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

module.exports = { getVentas, getVentaDetalle, createVenta, deleteVenta };
