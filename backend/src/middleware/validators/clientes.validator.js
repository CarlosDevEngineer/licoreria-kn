const { body } = require("express-validator");

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
const SOLO_DIGITOS = /^\d+$/;

const clienteValidator = [
  body("nit_ci")
    .trim().notEmpty().withMessage("El NIT/CI es obligatorio")
    .matches(SOLO_DIGITOS).withMessage("El NIT/CI solo puede contener números")
    .isLength({ min: 7, max: 12 }).withMessage("El NIT/CI debe tener entre 7 y 12 dígitos"),
  body("nombre")
    .trim().notEmpty().withMessage("El nombre es obligatorio")
    .matches(SOLO_LETRAS).withMessage("El nombre solo puede contener letras"),
  body("celular")
    .optional({ values: "falsy" })
    .trim()
    .matches(SOLO_DIGITOS).withMessage("El celular solo puede contener números")
    .isLength({ min: 8, max: 8 }).withMessage("El celular debe tener 8 dígitos"),
];

module.exports = { clienteValidator };
