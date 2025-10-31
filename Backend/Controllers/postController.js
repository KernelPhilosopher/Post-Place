// =============================================================================
// Controlador de Posts - CON MANEJO CORRECTO DE IMÁGENES
// =============================================================================

const postModel = require("../Models/postModel");
const commentModel = require("../Models/commentModel");

/**
 * Crea una nueva publicación con imagen opcional
 */
exports.createPost = async (req, res) => {
  const userId = req.userId;
  const { titulo, contenido } = req.body;

  console.log("📝 Creando post:", { userId, titulo, hasImage: !!req.file });

  if (!titulo?.trim() || !contenido?.trim()) {
    return res.status(400).json({
      error: "El título y el contenido no pueden estar vacíos.",
    });
  }

  try {
    // ✅ Construir URL de imagen si existe
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
      console.log("📷 Imagen guardada:", imageUrl);
    }

    const newPost = await postModel.create(
      userId,
      titulo.trim(),
      contenido.trim(),
      imageUrl
    );

    console.log("✅ Post creado exitosamente:", newPost.post_id);

    // Emitir evento de Socket.IO
    req.app.get("io")?.emit("new_post", newPost);

    res.status(201).json(newPost);
  } catch (error) {
    console.error("❌ Error en createPost:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Crea un nuevo comentario (solo texto)
 */
exports.createComment = async (req, res) => {
  try {
    const userId = req.userId;
    const postId = (req.params.postId ?? "").toString().trim();

    if (!postId) {
      return res.status(400).json({ error: "ID de post inválido." });
    }

    const contenido = (req.body?.contenido ?? "").toString().trim();
    if (!contenido) {
      return res
        .status(400)
        .json({ error: "El contenido del comentario no puede estar vacío." });
    }

    const newComment = await commentModel.create(postId, userId, contenido);

    const io = req.app.get("io");
    if (io) io.emit("new_comment", newComment);

    res.status(201).json(newComment);
  } catch (error) {
    console.error("Error en createComment:", error);
    if (error.message === "El post especificado no existe") {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Obtiene todas las publicaciones
 */
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await postModel.findAll();
    res.json(posts);
  } catch (error) {
    console.error("Error en getAllPosts:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Obtiene publicaciones del usuario autenticado
 */
exports.getUserPosts = async (req, res) => {
  const userId = req.userId;
  try {
    const posts = await postModel.findByUserId(userId);
    res.json(posts);
  } catch (error) {
    console.error("Error en getUserPosts:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Actualiza una publicación
 */
exports.updatePost = async (req, res) => {
  const postId = req.params.id;
  const userId = req.userId;
  const { contenido } = req.body;

  if (!contenido?.trim()) {
    return res.status(400).json({
      error: "El contenido no puede estar vacío.",
    });
  }

  if (!postId || typeof postId !== "string") {
    return res.status(400).json({
      error: "ID de post inválido.",
    });
  }

  try {
    const updatedPost = await postModel.update(
      postId,
      userId,
      contenido.trim()
    );

    if (!updatedPost) {
      return res.status(404).json({
        error: "Post no encontrado o no tienes permiso para editarlo.",
      });
    }

    const io = req.app.get("io");
    if (io) io.emit("post_updated", updatedPost);

    res.json(updatedPost);
  } catch (error) {
    console.error("Error en updatePost:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Elimina una publicación
 */
exports.deletePost = async (req, res) => {
  const postId = req.params.id;
  const userId = req.userId;

  if (!postId || typeof postId !== "string") {
    return res.status(400).json({
      error: "ID de post inválido.",
    });
  }

  try {
    const deletedPostId = await postModel.remove(postId, userId);

    if (!deletedPostId) {
      return res.status(404).json({
        error: "Post no encontrado o no tienes permiso para eliminarlo.",
      });
    }

    const io = req.app.get("io");
    if (io) io.emit("post_deleted", { postId: deletedPostId });

    res.status(200).json({ message: "Post eliminado exitosamente." });
  } catch (error) {
    console.error("Error en deletePost:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};
