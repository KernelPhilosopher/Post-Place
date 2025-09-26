// =============================================================================
// Modelo de Comentario - ADAPTADO PARA SUPABASE (CON UPDATE Y DELETE)
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

  /**
   * Actualiza un comentario existente.
   * SOLO el autor del comentario puede actualizarlo.
   */
  async update(commentId, userId, contenido) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const updateQuery = `
        UPDATE comentario
        SET contenido = $1, "fecha_actualizaciÓn" = NOW()
        WHERE comment_id = $2 AND user_id = $3
        RETURNING comment_id, post_id, user_id, contenido, "fecha_creaciÓn" as fecha_creacion;
      `;
      const result = await client.query(updateQuery, [
        contenido,
        commentId,
        userId,
      ]);

      if (result.rows.length === 0) {
        await client.query("ROLLBACK");
        return null; // No se actualizó nada (no encontrado o sin permiso)
      }

      const updatedComment = result.rows[0];

      // Obtener nombre del autor para consistencia de datos
      const authorQuery = "SELECT nombre FROM usuario WHERE user_id = $1";
      const authorResult = await client.query(authorQuery, [
        updatedComment.user_id,
      ]);
      const autorNombre = authorResult.rows[0]?.nombre || "Usuario";

      await client.query("COMMIT");
      return { ...updatedComment, autor_nombre: autorNombre };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina un comentario.
   * SOLO el autor del comentario puede eliminarlo.
   */
  async remove(commentId, userId) {
    const query = `
      DELETE FROM comentario
      WHERE comment_id = $1 AND user_id = $2
      RETURNING comment_id, post_id;
    `;
    const { rows } = await pool.query(query, [commentId, userId]);
    return rows[0] ? rows[0] : null; // Devuelve { comment_id, post_id } o null
  }
}

module.exports = new CommentModel();
