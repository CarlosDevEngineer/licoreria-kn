const { body } = require("express-validator");

const productoValidator = [
  body("codigo")
    .optional({ values: "falsy" }).trim(),
  body("nombre")
    .trim().notEmpty().withMessage("El nombre es obligatorio"),
  body("tipo_producto")
    .trim().notEmpty().withMessage("El tipo de producto es obligatorio")
    .isIn(["bebida", "snack", "otro"]).withMessage("El tipo debe ser bebida, snack u otro"),
  body("stock_actual")
    .notEmpty().withMessage("El stock actual es obligatorio")
    .isFloat({ min: 0 }).withMessage("El stock actual debe ser un número positivo"),
  body("costo_unitario")
    .notEmpty().withMessage("El costo unitario es obligatorio")
    .isFloat({ min: 0 }).withMessage("El costo unitario debe ser un número positivo"),
  body("precio_venta")
    .notEmpty().withMessage("El precio de venta es obligatorio")
    .isFloat({ min: 0 }).withMessage("El precio de venta debe ser un número positivo"),
  body("precio_botella")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 }).withMessage("El precio por botella debe ser un número positivo"),
  body("categoria")
    .optional({ values: "falsy" }).trim(),
  body("marca")
    .optional({ values: "falsy" }).trim(),
  body("presentacion_ml")
    .optional({ values: "falsy" })
    .isFloat({ min: 0 }).withMessage("La presentación debe ser un número positivo"),
  body("tipo_envase")
    .optional({ values: "falsy" }).trim(),
  body("unidades_por_caja")
    .optional({ values: "falsy" })
    .isInt({ min: 1 }).withMessage("Las unidades por caja deben ser un número entero positivo"),
  body("descripcion")
    .optional({ values: "falsy" }).trim(),
  body("activo")
    .optional({ values: "falsy" })
    .isBoolean().withMessage("activo debe ser un valor booleano"),
  body("proveedor_id")
    .optional({ values: "falsy" })
    .isInt({ min: 1 }).withMessage("El proveedor no es válido"),
];

module.exports = { productoValidator };
