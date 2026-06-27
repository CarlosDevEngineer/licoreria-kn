const { body } = require("express-validator");

const ventaValidator = [
  body("productos")
    .isArray({ min: 1 }).withMessage("Debe incluir al menos un producto"),
  body("productos.*.producto_id")
    .notEmpty().withMessage("El ID del producto es obligatorio")
    .isInt({ min: 1 }).withMessage("El ID del producto debe ser válido"),
  body("productos.*.cantidad")
    .notEmpty().withMessage("La cantidad es obligatoria")
    .isFloat({ min: 0.01 }).withMessage("La cantidad debe ser mayor a 0"),
  body("productos.*.precio_unitario")
    .notEmpty().withMessage("El precio unitario es obligatorio")
    .isFloat({ min: 0 }).withMessage("El precio unitario debe ser un número positivo"),
  body("productos.*.subtotal")
    .notEmpty().withMessage("El subtotal es obligatorio")
    .isFloat({ min: 0 }).withMessage("El subtotal debe ser un número positivo"),
  body("productos.*.tipo_venta")
    .optional({ values: "falsy" })
    .isIn(["caja", "unidad"]).withMessage("tipo_venta debe ser 'caja' o 'unidad'"),
  body("total")
    .notEmpty().withMessage("El total es obligatorio")
    .isFloat({ min: 0 }).withMessage("El total debe ser un número positivo"),
  body("metodo_pago")
    .trim().notEmpty().withMessage("El método de pago es obligatorio")
    .isIn(["efectivo", "tarjeta", "qr"]).withMessage("El método de pago debe ser efectivo, tarjeta o qr"),
  body("descuento")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 }).withMessage("El descuento debe ser un número positivo"),
  body("observaciones")
    .optional({ values: "falsy" }).trim(),
];

module.exports = { ventaValidator };
