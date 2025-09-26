// =============================================================================
// Rutas de Usuario - NUEVAS FUNCIONALIDADES
// =============================================================================

const express = require("express");
const userController = require("../Controllers/userController");
const { authenticateToken } = require("../Middleware/authMiddleware");

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Obtener posts donde el usuario ha comentado
router.get("/commented-posts", userController.getUserCommentedPosts);

// Actualizar perfil
router.put("/profile", userController.updateUserProfile);

// Eliminar cuenta
router.delete("/account", userController.deleteUserAccount);

// Buscar posts
router.get("/search", userController.searchPosts);

module.exports = router;
