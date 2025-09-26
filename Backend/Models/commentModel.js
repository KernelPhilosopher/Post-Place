// =============================================================================
// Modelo de Comentario - ADAPTADO PARA SUPABASE
// =============================================================================

const pool = require("../Config/database");

class CommentModel {
  /**
   * Crea un nuevo comentario
   */
  async create(postId, userId, contenido) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Verificar que el post existe
      const postCheck = await client.query(
        "SELECT post_id FROM post WHERE post_id = $1",
        [postId]
      );
      if (postCheck.rows.length === 0) {
        throw new Error("El post especificado no existe");
      }

      // Insertar comentario
      const insertQuery = `
        INSERT INTO comentario (post_id, user_id, contenido)
        VALUES ($1, $2, $3)
        RETURNING comment_id, post_id, user_id, contenido, "fecha_creaciÓn" as fecha_creacion;
      `;
      const commentResult = await client.query(insertQuery, [
        postId,
        userId,
        contenido,
      ]);
      const newComment = commentResult.rows[0];

      // Obtener nombre del autor
      const authorQuery = "SELECT nombre FROM usuario WHERE user_id = $1";
      const authorResult = await client.query(authorQuery, [userId]);
      const autorNombre = authorResult.rows[0]?.nombre || "Usuario";

      await client.query("COMMIT");

      return { ...newComment, autor_nombre: autorNombre };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new CommentModel();
