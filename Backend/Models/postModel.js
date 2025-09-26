// =============================================================================
// Modelo de Publicación - ADAPTADO PARA SUPABASE
// =============================================================================

const pool = require("../Config/database");

class PostModel {
  /**
   * Crea una nueva publicación
   */
  async create(userId, titulo, contenido) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Insertar post
      const insertQuery = `
        INSERT INTO post (user_id, titulo, contenido, type_id)
        VALUES ($1, $2, $3, 1)
        RETURNING post_id, user_id, titulo, contenido, fecha_creacion;
      `;
      const postResult = await client.query(insertQuery, [
        userId,
        titulo,
        contenido,
      ]);
      const newPost = postResult.rows[0];

      // Obtener nombre del autor
      const authorQuery = "SELECT nombre FROM usuario WHERE user_id = $1";
      const authorResult = await client.query(authorQuery, [userId]);
      const autorNombre = authorResult.rows[0]?.nombre || "Usuario";

      await client.query("COMMIT");

      return { ...newPost, autor_nombre: autorNombre, comments: [] };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Obtiene todas las publicaciones con comentarios
   */
  async findAll() {
    const query = `
      SELECT
        p.post_id, p.user_id, p.titulo, p.contenido, p.fecha_creacion,
        u.nombre as autor_nombre,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'comment_id', c.comment_id,
                'contenido', c.contenido,
                'fecha_creacion', c."fecha_creaciÓn",
                'user_id', c.user_id,
                'autor_nombre', cu.nombre
              ) ORDER BY c."fecha_creaciÓn" ASC
            )
            FROM comentario c
            JOIN usuario cu ON c.user_id = cu.user_id
            WHERE c.post_id = p.post_id
          ),
          '[]'::json
        ) as comments
      FROM post p
      JOIN usuario u ON p.user_id = u.user_id
      WHERE p.type_id = 1
      ORDER BY p.fecha_creacion DESC
    `;
    const { rows } = await pool.query(query);
    return rows;
  }

  /**
   * Obtiene publicaciones de un usuario específico
   */
  async findByUserId(userId) {
    const query = `
      SELECT
        p.post_id, p.user_id, p.titulo, p.contenido, p.fecha_creacion,
        u.nombre as autor_nombre,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'comment_id', c.comment_id,
                'contenido', c.contenido,
                'fecha_creacion', c."fecha_creaciÓn",
                'user_id', c.user_id,
                'autor_nombre', cu.nombre
              ) ORDER BY c."fecha_creaciÓn" ASC
            )
            FROM comentario c
            JOIN usuario cu ON c.user_id = cu.user_id
            WHERE c.post_id = p.post_id
          ),
          '[]'::json
        ) as comments
      FROM post p
      JOIN usuario u ON p.user_id = u.user_id
      WHERE p.user_id = $1 AND p.type_id = 1
      ORDER BY p.fecha_creacion DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  /**
   * Actualiza una publicación
   */
  async update(postId, userId, contenido) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const updateQuery = `
        UPDATE post
        SET contenido = $1, fecha_actualizacion = NOW()
        WHERE post_id = $2 AND user_id = $3
        RETURNING post_id, user_id, titulo, contenido, fecha_creacion;
      `;
      const updateResult = await client.query(updateQuery, [
        contenido,
        postId,
        userId,
      ]);

      if (updateResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return null;
      }

      const updatedPost = updateResult.rows[0];

      // Obtener nombre del autor
      const authorQuery = "SELECT nombre FROM usuario WHERE user_id = $1";
      const authorResult = await client.query(authorQuery, [userId]);
      const autorNombre = authorResult.rows[0]?.nombre || "Usuario";

      // Obtener comentarios
      const commentsQuery = `
        SELECT
          c.comment_id, c.contenido, c."fecha_creaciÓn" as fecha_creacion,
          c.user_id, cu.nombre as autor_nombre
        FROM comentario c
        JOIN usuario cu ON c.user_id = cu.user_id
        WHERE c.post_id = $1
        ORDER BY c."fecha_creaciÓn" ASC
      `;
      const commentsResult = await client.query(commentsQuery, [postId]);

      await client.query("COMMIT");

      return {
        ...updatedPost,
        autor_nombre: autorNombre,
        comments: commentsResult.rows,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina una publicación
   */
  async remove(postId, userId) {
    const query = `
      DELETE FROM post
      WHERE post_id = $1 AND user_id = $2
      RETURNING post_id;
    `;
    const { rows } = await pool.query(query, [postId, userId]);
    return rows[0] ? rows[0].post_id : null;
  }
}

module.exports = new PostModel();
