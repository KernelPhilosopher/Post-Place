// =============================================================================
// Controlador de Comentarios - NUEVO
// =============================================================================

const commentModel = require("../Models/commentModel");

/**
 * Actualiza un comentario existente.
 */
exports.updateComment = async (req, res) => {
  const commentId = parseInt(req.params.commentId);
  const userId = req.userId;
  const { contenido } = req.body;

  if (!contenido?.trim()) {
    return res
      .status(400)
      .json({ error: "El contenido del comentario no puede estar vacío." });
  }

  if (isNaN(commentId) || commentId <= 0) {
    return res.status(400).json({ error: "ID de comentario inválido." });
  }

  try {
    const updatedComment = await commentModel.update(
      commentId,
      userId,
      contenido.trim()
    );

    if (!updatedComment) {
      return res.status(404).json({
        error: "Comentario no encontrado o no tienes permiso para editarlo.",
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("comment_updated", updatedComment);
    }

    res.json(updatedComment);
  } catch (error) {
    console.error("Error en updateComment:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Elimina un comentario.
 */
exports.deleteComment = async (req, res) => {
  const commentId = parseInt(req.params.commentId);
  const userId = req.userId;

  if (isNaN(commentId) || commentId <= 0) {
    return res.status(400).json({ error: "ID de comentario inválido." });
  }

  try {
    const deletedCommentData = await commentModel.remove(commentId, userId);

    if (!deletedCommentData) {
      return res.status(404).json({
        error: "Comentario no encontrado o no tienes permiso para eliminarlo.",
      });
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("comment_deleted", deletedCommentData);
    }

    res.status(200).json({ message: "Comentario eliminado exitosamente." });
  } catch (error) {
    console.error("Error en deleteComment:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};
