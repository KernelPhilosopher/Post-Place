// =============================================================================
// Rutas de Grupos - SISTEMA DE COMUNIDADES
// =============================================================================

const express = require("express");
const groupController = require("../Controllers/groupController");
const { authenticateToken } = require("../Middleware/authMiddleware");

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   POST /api/groups
 * @desc    Crea un nuevo grupo
 * @access  Private
 * @body    { nombre: string, descripcion?: string, esPrivado?: boolean }
 */
router.post("/", groupController.createGroup);

/**
 * @route   GET /api/groups
 * @desc    Obtiene los grupos del usuario autenticado
 * @access  Private
 */
router.get("/", groupController.getUserGroups);

/**
 * @route   GET /api/groups/:groupId
 * @desc    Obtiene información detallada de un grupo
 * @access  Private
 */
router.get("/:groupId", groupController.getGroupById);

/**
 * @route   POST /api/groups/:groupId/members
 * @desc    Añade un miembro al grupo
 * @access  Private (Admin del grupo)
 * @body    { memberId: string }
 */
router.post("/:groupId/members", groupController.addMember);

/**
 * @route   DELETE /api/groups/:groupId/members/:memberId
 * @desc    Elimina un miembro del grupo
 * @access  Private (Admin del grupo)
 */
router.delete("/:groupId/members/:memberId", groupController.removeMember);

/**
 * @route   POST /api/groups/:groupId/leave
 * @desc    Abandona un grupo
 * @access  Private
 */
router.post("/:groupId/leave", groupController.leaveGroup);

/**
 * @route   DELETE /api/groups/:groupId
 * @desc    Elimina un grupo
 * @access  Private (Creador del grupo)
 */
router.delete("/:groupId", groupController.deleteGroup);

/**
 * @route   GET /api/groups/:groupId/available-friends
 * @desc    Obtiene amigos disponibles para añadir al grupo
 * @access  Private
 */
router.get("/:groupId/available-friends", groupController.getAvailableFriends);

module.exports = router;
