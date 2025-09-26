// =============================================================================
// Módulo de Rutas de Comentarios - NUEVO
// =============================================================================

const express = require("express");
const commentController = require("../Controllers/commentController");
const { authenticateToken } = require("../Middleware/authMiddleware");

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas para modificar y eliminar comentarios
router.put("/:commentId", commentController.updateComment);
router.delete("/:commentId", commentController.deleteComment);

module.exports = router;
