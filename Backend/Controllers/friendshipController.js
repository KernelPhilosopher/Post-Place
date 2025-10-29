// =============================================================================
// Controlador de Amistad - GESTIÓN DE SOLICITUDES Y AMIGOS
// =============================================================================

const friendshipModel = require("../Models/friendshipModel");

/**
 * Envía una solicitud de amistad
 */
exports.sendFriendRequest = async (req, res) => {
  const fromUserId = req.userId;
  const { toUserId } = req.body;

  if (!toUserId?.trim()) {
    return res
      .status(400)
      .json({ error: "El ID del usuario destino es requerido" });
  }

  try {
    const request = await friendshipModel.sendFriendRequest(
      fromUserId,
      toUserId.trim()
    );

    // Emitir evento de Socket.IO para notificación en tiempo real
    const io = req.app.get("io");
    if (io) {
      io.emit("new_friend_request", {
        to_user_id: toUserId,
        from_user_id: fromUserId,
        from_nombre: request.from_nombre,
      });
    }

    res.status(201).json({
      message: "Solicitud de amistad enviada exitosamente",
      request,
    });
  } catch (error) {
    console.error("Error en sendFriendRequest:", error);

    if (
      error.message.includes("Ya son amigos") ||
      error.message.includes("Ya enviaste") ||
      error.message.includes("ya te envió")
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Acepta una solicitud de amistad
 */
exports.acceptFriendRequest = async (req, res) => {
  const userId = req.userId;
  const { fromUserId } = req.body;

  if (!fromUserId?.trim()) {
    return res.status(400).json({ error: "El ID del usuario es requerido" });
  }

  try {
    const friend = await friendshipModel.acceptFriendRequest(
      userId,
      fromUserId.trim()
    );

    if (!friend) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    // Emitir evento de Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.emit("friend_request_accepted", {
        user_id: userId,
        friend_id: fromUserId,
      });
    }

    res.json({
      message: "Solicitud de amistad aceptada",
      friend,
    });
  } catch (error) {
    console.error("Error en acceptFriendRequest:", error);

    if (error.message.includes("No existe solicitud")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Rechaza una solicitud de amistad
 */
exports.rejectFriendRequest = async (req, res) => {
  const userId = req.userId;
  const { fromUserId } = req.body;

  if (!fromUserId?.trim()) {
    return res.status(400).json({ error: "El ID del usuario es requerido" });
  }

  try {
    const rejected = await friendshipModel.rejectFriendRequest(
      userId,
      fromUserId.trim()
    );

    if (!rejected) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    res.json({ message: "Solicitud de amistad rechazada" });
  } catch (error) {
    console.error("Error en rejectFriendRequest:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Cancela una solicitud de amistad enviada
 */
exports.cancelFriendRequest = async (req, res) => {
  const userId = req.userId;
  const { toUserId } = req.body;

  if (!toUserId?.trim()) {
    return res.status(400).json({ error: "El ID del usuario es requerido" });
  }

  try {
    const cancelled = await friendshipModel.cancelFriendRequest(
      userId,
      toUserId.trim()
    );

    if (!cancelled) {
      return res.status(404).json({ error: "Solicitud no encontrada" });
    }

    res.json({ message: "Solicitud de amistad cancelada" });
  } catch (error) {
    console.error("Error en cancelFriendRequest:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Elimina un amigo
 */
exports.removeFriend = async (req, res) => {
  const userId = req.userId;
  const { friendId } = req.body;

  if (!friendId?.trim()) {
    return res.status(400).json({ error: "El ID del amigo es requerido" });
  }

  try {
    const removed = await friendshipModel.removeFriend(userId, friendId.trim());

    if (!removed) {
      return res.status(404).json({ error: "Amistad no encontrada" });
    }

    // Emitir evento de Socket.IO
    const io = req.app.get("io");
    if (io) {
      io.emit("friendship_removed", {
        user_id: userId,
        friend_id: friendId,
      });
    }

    res.json({ message: "Amigo eliminado exitosamente" });
  } catch (error) {
    console.error("Error en removeFriend:", error);

    if (error.message.includes("No son amigos")) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene la lista de amigos del usuario autenticado
 */
exports.getFriendsList = async (req, res) => {
  const userId = req.userId;

  try {
    const friends = await friendshipModel.getFriendsList(userId);
    res.json(friends);
  } catch (error) {
    console.error("Error en getFriendsList:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene las solicitudes de amistad recibidas
 */
exports.getPendingRequests = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await friendshipModel.getPendingRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error("Error en getPendingRequests:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene las solicitudes de amistad enviadas
 */
exports.getSentRequests = async (req, res) => {
  const userId = req.userId;

  try {
    const requests = await friendshipModel.getSentRequests(userId);
    res.json(requests);
  } catch (error) {
    console.error("Error en getSentRequests:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Busca usuarios para enviar solicitud de amistad
 */
exports.searchUsers = async (req, res) => {
  const userId = req.userId;
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: "El término de búsqueda debe tener al menos 2 caracteres",
    });
  }

  try {
    const users = await friendshipModel.searchUsers(userId, q.trim());
    res.json(users);
  } catch (error) {
    console.error("Error en searchUsers:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Verifica el estado de amistad con otro usuario
 */
exports.getFriendshipStatus = async (req, res) => {
  const userId = req.userId;
  const { otherUserId } = req.params;

  if (!otherUserId?.trim()) {
    return res.status(400).json({ error: "El ID del usuario es requerido" });
  }

  try {
    const status = await friendshipModel.getFriendshipStatus(
      userId,
      otherUserId.trim()
    );
    res.json({ status });
  } catch (error) {
    console.error("Error en getFriendshipStatus:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene estadísticas de amistad del usuario
 */
exports.getFriendshipStats = async (req, res) => {
  const userId = req.userId;

  try {
    const stats = await friendshipModel.getFriendshipStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error en getFriendshipStats:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
