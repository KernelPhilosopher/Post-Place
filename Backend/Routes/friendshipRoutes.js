// =============================================================================
// Rutas de Amistad - SISTEMA COMPLETO
// =============================================================================

const express = require("express");
const friendshipController = require("../Controllers/friendshipController");
const { authenticateToken } = require("../Middleware/authMiddleware");

const router = express.Router();

// Todas las rutas de amistad requieren autenticación
router.use(authenticateToken);

/**
 * @route   POST /api/friends/request
 * @desc    Envía una solicitud de amistad
 * @access  Private
 * @body    { toUserId: "uuid" }
 */
router.post("/request", friendshipController.sendFriendRequest);

/**
 * @route   POST /api/friends/accept
 * @desc    Acepta una solicitud de amistad
 * @access  Private
 * @body    { fromUserId: "uuid" }
 */
router.post("/accept", friendshipController.acceptFriendRequest);

/**
 * @route   POST /api/friends/reject
 * @desc    Rechaza una solicitud de amistad
 * @access  Private
 * @body    { fromUserId: "uuid" }
 */
router.post("/reject", friendshipController.rejectFriendRequest);

/**
 * @route   POST /api/friends/cancel
 * @desc    Cancela una solicitud de amistad enviada
 * @access  Private
 * @body    { toUserId: "uuid" }
 */
router.post("/cancel", friendshipController.cancelFriendRequest);

/**
 * @route   DELETE /api/friends/remove
 * @desc    Elimina un amigo
 * @access  Private
 * @body    { friendId: "uuid" }
 */
router.delete("/remove", friendshipController.removeFriend);

/**
 * @route   GET /api/friends/list
 * @desc    Obtiene la lista de amigos
 * @access  Private
 */
router.get("/list", friendshipController.getFriendsList);

/**
 * @route   GET /api/friends/requests/pending
 * @desc    Obtiene las solicitudes de amistad recibidas
 * @access  Private
 */
router.get("/requests/pending", friendshipController.getPendingRequests);

/**
 * @route   GET /api/friends/requests/sent
 * @desc    Obtiene las solicitudes de amistad enviadas
 * @access  Private
 */
router.get("/requests/sent", friendshipController.getSentRequests);

/**
 * @route   GET /api/friends/search?q=termino
 * @desc    Busca usuarios para enviar solicitud de amistad
 * @access  Private
 * @query   q: término de búsqueda
 */
router.get("/search", friendshipController.searchUsers);

/**
 * @route   GET /api/friends/status/:otherUserId
 * @desc    Verifica el estado de amistad con otro usuario
 * @access  Private
 */
router.get("/status/:otherUserId", friendshipController.getFriendshipStatus);

/**
 * @route   GET /api/friends/stats
 * @desc    Obtiene estadísticas de amistad
 * @access  Private
 */
router.get("/stats", friendshipController.getFriendshipStats);

module.exports = router;
