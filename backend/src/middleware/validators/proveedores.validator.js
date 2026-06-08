const { body } = require("express-validator");

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
const SOLO_DIGITOS = /^\d+$/;

const proveedorValidator = [
  body("nombre")
    .trim().notEmpty().withMessage("El nombre es obligatorio")
    .matches(SOLO_LETRAS).withMessage("El nombre solo puede contener letras"),
  body("nit")
    .trim().notEmpty().withMessage("El NIT es obligatorio")
    .matches(SOLO_DIGITOS).withMessage("El NIT solo puede contener números")
    .isLength({ min: 7, max: 12 }).withMessage("El NIT debe tener entre 7 y 12 dígitos"),
  body("direccion")
    .optional({ values: "falsy" }).trim(),
  body("telefono")
    .optional({ values: "falsy" })
    .trim()
    .matches(SOLO_DIGITOS).withMessage("El teléfono solo puede contener números")
    .isLength({ max: 8 }).withMessage("El teléfono debe tener máximo 8 dígitos"),
  body("contacto")
    .optional({ values: "falsy" })
    .trim()
    .isEmail().withMessage("Ingrese un correo electrónico válido"),
];

module.exports = { proveedorValidator };
