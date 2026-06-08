const nodemailer = require('nodemailer');
const pool = require('../config/db');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const enviarAlertaStockBajo = async (producto, proveedorEmail, proveedorNombre) => {
  if (!proveedorEmail) return;

  const uds = Number(producto.unidades_por_caja) || 1;
  const totalUnd = Math.round(Number(producto.stock_actual));
  const cajas = Math.floor(totalUnd / uds);
  const undSueltas = totalUnd % uds;
  const stockStr = undSueltas > 0 ? `${cajas} caja(s) + ${undSueltas} und` : `${cajas} caja(s)`;

  const mailOptions = {
    from: `"Licorería KN" <${process.env.SMTP_USER}>`,
    to: proveedorEmail,
    subject: `ALERTA: Stock bajo - ${producto.nombre}`,
    html: `
      <h2>Alerta de Stock Bajo</h2>
      <p>Estimado ${proveedorNombre},</p>
      <p>El producto ${producto.nombre} tiene ${stockStr} en stock (mínimo recomendado: 1 caja)</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
        <tr><th>Código</th><td>${producto.codigo}</td></tr>
        <tr><th>Producto</th><td>${producto.nombre}</td></tr>
        <tr><th>Stock actual</th><td>${stockStr}</td></tr>
      </table>
      <p>Por favor, realice el pedido de reposición lo antes posible.</p>
      <hr>
      <p style="color:gray;font-size:12px;">Licorería KN - Sistema de Gestión</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Correo enviado a ${proveedorEmail} sobre ${producto.nombre}`);
  } catch (error) {
    console.error(`Error al enviar correo a ${proveedorEmail}:`, error.message);
  }
};

const verificarStockBajo = async () => {
  try {
    const result = await pool.query(`
      SELECT p.producto_id, p.codigo, p.nombre, p.stock_actual, p.unidades_por_caja, pr.contacto as proveedor_email, pr.nombre as proveedor_nombre
      FROM productos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.proveedor_id
      WHERE p.stock_actual <= COALESCE(NULLIF(p.unidades_por_caja, 0), 1)
        AND p.stock_actual > 0
        AND p.activo = true
    `);

    for (const producto of result.rows) {
      if (producto.proveedor_email) {
        await enviarAlertaStockBajo(producto, producto.proveedor_email, producto.proveedor_nombre);
      }
    }

    return result.rows;
  } catch (error) {
    console.error('Error al verificar stock bajo:', error.message);
    throw error;
  }
};

module.exports = { enviarAlertaStockBajo, verificarStockBajo };
