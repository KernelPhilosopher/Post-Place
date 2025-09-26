// =============================================================================
// Módulo de Rutas de Autenticación - CORREGIDO
// =============================================================================

const express = require("express");
const authController = require("../Controllers/authController");

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registra a un nuevo usuario en el sistema.
 * @access  Public
 */
router.post("/register", authController.registerUser);

/**
 * @route   POST /api/auth/login
 * @desc    Autentica a un usuario y le devuelve un token JWT.
 * @access  Public
 */
router.post("/login", authController.loginUser);

module.exports = router;
