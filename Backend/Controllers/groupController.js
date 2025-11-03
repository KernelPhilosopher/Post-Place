// =============================================================================
// Controlador de Grupos - GESTIÓN DE COMUNIDADES
// =============================================================================

const groupModel = require("../Models/groupModel");

/**
 * Crea un nuevo grupo
 */
exports.createGroup = async (req, res) => {
  const creatorId = req.userId;
  const { nombre, descripcion, esPrivado } = req.body;

  if (!nombre?.trim()) {
    return res.status(400).json({ error: "El nombre del grupo es requerido" });
  }

  try {
    const newGroup = await groupModel.create(
      creatorId,
      nombre.trim(),
      descripcion?.trim() || "",
      esPrivado || false
    );

    const io = req.app.get("io");
    if (io) {
      io.emit("new_group", newGroup);
    }

    res.status(201).json({
      message: "Grupo creado exitosamente",
      group: newGroup,
    });
  } catch (error) {
    console.error("Error en createGroup:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene los grupos del usuario
 */
exports.getUserGroups = async (req, res) => {
  const userId = req.userId;

  try {
    const groups = await groupModel.getUserGroups(userId);
    res.json(groups);
  } catch (error) {
    console.error("Error en getUserGroups:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene información detallada de un grupo
 */
exports.getGroupById = async (req, res) => {
  const userId = req.userId;
  const { groupId } = req.params;

  try {
    const group = await groupModel.getGroupById(groupId, userId);

    if (!group) {
      return res.status(404).json({ error: "Grupo no encontrado" });
    }

    res.json(group);
  } catch (error) {
    console.error("Error en getGroupById:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Añade un miembro al grupo
 */
exports.addMember = async (req, res) => {
  const userId = req.userId;
  const { groupId } = req.params;
  const { memberId } = req.body;

  if (!memberId) {
    return res.status(400).json({ error: "El ID del miembro es requerido" });
  }

  try {
    const member = await groupModel.addMember(groupId, userId, memberId);

    const io = req.app.get("io");
    if (io) {
      io.emit("group_member_added", {
        group_id: groupId,
        member: member,
      });
    }

    res.status(201).json({
      message: "Miembro añadido exitosamente",
      member: member,
    });
  } catch (error) {
    console.error("Error en addMember:", error);

    if (
      error.message.includes("permisos") ||
      error.message.includes("amigos") ||
      error.message.includes("ya es miembro")
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Elimina un miembro del grupo
 */
exports.removeMember = async (req, res) => {
  const userId = req.userId;
  const { groupId, memberId } = req.params;

  try {
    const removed = await groupModel.removeMember(groupId, userId, memberId);

    if (!removed) {
      return res.status(404).json({ error: "No se pudo eliminar el miembro" });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("group_member_removed", {
        group_id: groupId,
        member_id: memberId,
      });
    }

    res.json({ message: "Miembro eliminado exitosamente" });
  } catch (error) {
    console.error("Error en removeMember:", error);

    if (
      error.message.includes("permisos") ||
      error.message.includes("creador")
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Abandona un grupo
 */
exports.leaveGroup = async (req, res) => {
  const userId = req.userId;
  const { groupId } = req.params;

  try {
    const left = await groupModel.leaveGroup(groupId, userId);

    if (!left) {
      return res.status(404).json({ error: "No se pudo abandonar el grupo" });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("group_member_left", {
        group_id: groupId,
        user_id: userId,
      });
    }

    res.json({ message: "Has abandonado el grupo exitosamente" });
  } catch (error) {
    console.error("Error en leaveGroup:", error);

    if (error.message.includes("creador")) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Elimina un grupo
 */
exports.deleteGroup = async (req, res) => {
  const userId = req.userId;
  const { groupId } = req.params;

  try {
    const deleted = await groupModel.deleteGroup(groupId, userId);

    if (!deleted) {
      return res.status(404).json({
        error: "Grupo no encontrado o no tienes permisos",
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("group_deleted", { group_id: groupId });
    }

    res.json({ message: "Grupo eliminado exitosamente" });
  } catch (error) {
    console.error("Error en deleteGroup:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene amigos disponibles para añadir al grupo
 */
exports.getAvailableFriends = async (req, res) => {
  const userId = req.userId;
  const { groupId } = req.params;

  try {
    const friends = await groupModel.getAvailableFriends(groupId, userId);
    res.json(friends);
  } catch (error) {
    console.error("Error en getAvailableFriends:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
