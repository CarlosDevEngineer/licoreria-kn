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
  tls: { rejectUnauthorized: false },
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
    subject: `🔴 ALERTA: Stock bajo - ${producto.nombre}`,
    html: `
      <div style="max-width:600px;margin:0 auto;font-family:'Segoe UI',Arial,sans-serif;">
        <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px 40px;border-radius:12px 12px 0 0;text-align:center;">
          <div style="font-size:40px;margin-bottom:8px;">🍾</div>
          <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Licorería KN</h1>
          <p style="color:#a0aec0;margin:4px 0 0;font-size:13px;">Sistema de Gestión de Inventario</p>
        </div>

        <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:15px 20px;margin:20px 0;border-radius:6px;">
          <p style="margin:0;color:#856404;font-size:15px;font-weight:600;">⚠️ Alerta de Stock Bajo</p>
          <p style="margin:4px 0 0;color:#856404;font-size:14px;">El producto <strong>${producto.nombre}</strong> est&aacute; por agotarse.</p>
        </div>

        <p style="color:#333;font-size:15px;line-height:1.6;">Estimado <strong>${proveedorNombre}</strong>,</p>
        <p style="color:#555;font-size:14px;line-height:1.6;">Solicitamos la reposici&oacute;n del siguiente producto, cuyo stock actual es menor al m&iacute;nimo recomendado:</p>

        <table style="width:100%;border-collapse:separate;border-spacing:0;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);margin:20px 0;">
          <tr>
            <th style="background:#1a1a2e;color:#fff;padding:12px 20px;text-align:left;font-size:13px;font-weight:600;width:140px;border-bottom:1px solid #2a2a4e;">C&oacute;digo</th>
            <td style="padding:12px 20px;font-size:14px;color:#333;background:#f9fafb;border-bottom:1px solid #e5e7eb;">${producto.codigo}</td>
          </tr>
          <tr>
            <th style="background:#1a1a2e;color:#fff;padding:12px 20px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #2a2a4e;">Producto</th>
            <td style="padding:12px 20px;font-size:14px;color:#333;background:#ffffff;border-bottom:1px solid #e5e7eb;">${producto.nombre}</td>
          </tr>
          <tr>
            <th style="background:#1a1a2e;color:#fff;padding:12px 20px;text-align:left;font-size:13px;font-weight:600;border-bottom:1px solid #2a2a4e;">Stock actual</th>
            <td style="padding:12px 20px;font-size:14px;color:#333;background:#f9fafb;border-bottom:1px solid #e5e7eb;"><strong style="color:#dc2626;">${stockStr}</strong></td>
          </tr>
          <tr>
            <th style="background:#1a1a2e;color:#fff;padding:12px 20px;text-align:left;font-size:13px;font-weight:600;">M&iacute;nimo recomendado</th>
            <td style="padding:12px 20px;font-size:14px;color:#333;background:#ffffff;">1 caja</td>
          </tr>
        </table>

        <p style="color:#555;font-size:14px;line-height:1.6;">Por favor, realice el pedido de reposici&oacute;n a la brevedad posible para evitar desabastecimiento.</p>

        <div style="border-top:2px solid #e5e7eb;margin-top:30px;padding-top:20px;text-align:center;">
          <p style="color:#9ca3af;font-size:12px;margin:0;">Licorería KN &bull; Sistema de Gesti&oacute;n de Inventario</p>
          <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">Este es un mensaje autom&aacute;tico. No responda a este correo.</p>
        </div>
      </div>
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
