// =============================================================================
// Controlador de Usuario - FUNCIONALIDADES CORREGIDAS Y MÁS SEGURAS
// =============================================================================

const bcrypt = require("bcryptjs");
const userModel = require("../Models/userModel");

/**
 * Obtiene posts donde el usuario autenticado ha comentado.
 */
exports.getUserCommentedPosts = async (req, res) => {
  try {
    const posts = await userModel.getPostsWhereUserCommented(req.userId);
    res.json(posts);
  } catch (error) {
    console.error("Error en getUserCommentedPosts:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Actualiza el perfil del usuario autenticado.
 * Requiere la contraseña actual para cambiar datos sensibles como email o contraseña.
 */
exports.updateUserProfile = async (req, res) => {
  const userId = req.userId;
  const { nombre, email, contraseñaActual, contraseñaNueva } = req.body;

  try {
    // Es crucial obtener el usuario con su contraseña para verificarla
    const user = await userModel.findByIdWithPassword(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const updates = {};
    let needsPasswordCheck = false;

    // Determinar si se necesita la contraseña actual
    if (contraseñaNueva) {
      needsPasswordCheck = true;
    }
    if (email && email.toLowerCase() !== user.email) {
      needsPasswordCheck = true;
    }

    // Si se requiere la contraseña, verificarla
    if (needsPasswordCheck) {
      if (!contraseñaActual) {
        return res.status(400).json({
          error: "Se requiere la contraseña actual para realizar esta acción.",
        });
      }

      const isMatch = await bcrypt.compare(contraseñaActual, user.contraseña);
      if (!isMatch) {
        return res
          .status(403)
          .json({ error: "La contraseña actual es incorrecta." });
      }
    }

    // Preparar las actualizaciones
    if (nombre && nombre.trim() !== user.nombre) {
      updates.nombre = nombre.trim();
    }

    if (email && email.toLowerCase() !== user.email) {
      const existingUser = await userModel.findByEmail(email);
      if (existingUser && existingUser.user_id !== userId) {
        return res
          .status(409)
          .json({ error: "El nuevo email ya está en uso." });
      }
      updates.email = email.toLowerCase();
    }

    if (contraseñaNueva) {
      if (contraseñaNueva.length < 6) {
        return res.status(400).json({
          error: "La nueva contraseña debe tener al menos 6 caracteres.",
        });
      }
      const salt = await bcrypt.genSalt(10);
      updates.hashedPassword = await bcrypt.hash(contraseñaNueva, salt);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(200).json({
        message: "No se realizaron cambios.",
        user: {
          user_id: user.user_id,
          nombre: user.nombre,
          email: user.email,
        },
      });
    }

    const updatedUser = await userModel.updateUser(userId, updates);
    res.json({
      message: "Perfil actualizado exitosamente.",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error en updateUserProfile:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Elimina la cuenta del usuario autenticado.
 * Requiere la contraseña para confirmar la acción.
 */
exports.deleteUserAccount = async (req, res) => {
  const userId = req.userId;
  const { contraseña } = req.body;

  if (!contraseña) {
    return res.status(400).json({
      error: "Debes proporcionar tu contraseña para eliminar la cuenta.",
    });
  }

  try {
    const user = await userModel.findByIdWithPassword(userId);
    if (!user) {
      return res.status(404).json({ error: "Usuario no encontrado." });
    }

    const isMatch = await bcrypt.compare(contraseña, user.contraseña);
    if (!isMatch) {
      return res.status(403).json({ error: "La contraseña es incorrecta." });
    }

    await userModel.deleteUser(userId);

    res.json({ message: "Tu cuenta ha sido eliminada exitosamente." });
  } catch (error) {
    console.error("Error en deleteUserAccount:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Busca posts por un término de búsqueda.
 */
exports.searchPosts = async (req, res) => {
  const { q } = req.query;

  if (!q || q.trim().length < 2) {
    return res.status(400).json({
      error: "El término de búsqueda debe tener al menos 2 caracteres.",
    });
  }

  try {
    const posts = await userModel.searchPosts(q.trim());
    res.json(posts);
  } catch (error) {
    console.error("Error en searchPosts:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};
