const { body } = require("express-validator");

const SOLO_LETRAS = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;
const SIN_ESPECIALES = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ0-9._-]+$/;

const registerValidator = [
  body("nombre")
    .trim().notEmpty().withMessage("El nombre es obligatorio")
    .matches(SOLO_LETRAS).withMessage("El nombre solo puede contener letras"),
  body("username")
    .trim().notEmpty().withMessage("El nombre de usuario es obligatorio")
    .matches(SIN_ESPECIALES).withMessage("El usuario no puede contener caracteres especiales"),
  body("password")
    .notEmpty().withMessage("La contraseña es obligatoria")
    .isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("rol")
    .trim().notEmpty().withMessage("El rol es obligatorio")
    .isIn(["admin", "vendedor"]).withMessage("El rol debe ser admin o vendedor"),
];

const loginValidator = [
  body("username")
    .trim().notEmpty().withMessage("El nombre de usuario es obligatorio"),
  body("password")
    .notEmpty().withMessage("La contraseña es obligatoria"),
];

const updateUserValidator = [
  body("nombre")
    .trim().notEmpty().withMessage("El nombre es obligatorio")
    .matches(SOLO_LETRAS).withMessage("El nombre solo puede contener letras"),
  body("username")
    .trim().notEmpty().withMessage("El nombre de usuario es obligatorio")
    .matches(SIN_ESPECIALES).withMessage("El usuario no puede contener caracteres especiales"),
  body("password")
    .optional({ values: "falsy" })
    .isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),
  body("rol")
    .trim().notEmpty().withMessage("El rol es obligatorio")
    .isIn(["admin", "vendedor"]).withMessage("El rol debe ser admin o vendedor"),
];

module.exports = { registerValidator, loginValidator, updateUserValidator };
