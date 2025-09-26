// =============================================================================
// Rutas de Usuario - NUEVAS FUNCIONALIDADES
// =============================================================================

const express = require("express");
const userController = require("../Controllers/userController");
const { authenticateToken } = require("../Middleware/authMiddleware");

const router = express.Router();

// Todas las rutas de este archivo requieren autenticación
router.use(authenticateToken);

// Obtener posts donde el usuario ha comentado
router.get("/commented-posts", userController.getUserCommentedPosts);

// Actualizar perfil (nombre, email, contraseña)
router.put("/profile", userController.updateUserProfile);

// Eliminar cuenta de usuario
router.delete("/account", userController.deleteUserAccount);

// Buscar posts por palabra clave
router.get("/search", userController.searchPosts);

module.exports = router;
