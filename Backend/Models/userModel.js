// =============================================================================
// Modelo de Usuario - ADAPTADO PARA SUPABASE
// =============================================================================

const pool = require("../Config/database");

class UserModel {
  /**
   * Busca un usuario por email (sin contraseña)
   */
  async findByEmail(email) {
    const query = "SELECT user_id, nombre, email FROM usuario WHERE email = $1";
    const { rows } = await pool.query(query, [email.toLowerCase()]);
    return rows[0] || null;
  }

  /**
   * Busca un usuario por email con contraseña (para login)
   */
  async findByEmailWithPassword(email) {
    const query = "SELECT * FROM usuario WHERE email = $1";
    const { rows } = await pool.query(query, [email.toLowerCase()]);
    return rows[0] || null;
  }

  /**
   * Crea un nuevo usuario
   */
  async create(nombre, email, hashedPassword) {
    const query = `
      INSERT INTO usuario (nombre, email, "contraseña")
      VALUES ($1, $2, $3)
      RETURNING user_id, nombre, email
    `;
    const values = [nombre.trim(), email.toLowerCase(), hashedPassword];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
  /**
   * Obtiene posts donde el usuario ha comentado
   */
  async getPostsWhereUserCommented(userId) {
    const query = `
      SELECT DISTINCT
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
      JOIN comentario co ON co.post_id = p.post_id
      WHERE co.user_id = $1 AND p.type_id = 1
      ORDER BY p.fecha_creacion DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
  }

  /**
   * Actualiza información del usuario
   */
  async updateUser(userId, updates) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      let query = "UPDATE usuario SET ";
      let values = [];
      let paramIndex = 1;
      const setParts = [];

      if (updates.nombre) {
        setParts.push(`nombre = $${paramIndex}`);
        values.push(updates.nombre.trim());
        paramIndex++;
      }

      if (updates.email) {
        setParts.push(`email = $${paramIndex}`);
        values.push(updates.email.toLowerCase());
        paramIndex++;
      }

      if (updates.hashedPassword) {
        setParts.push(`"contraseña" = $${paramIndex}`);
        values.push(updates.hashedPassword);
        paramIndex++;
      }

      query += setParts.join(", ");
      query += `, fecha_actualizacion = NOW() WHERE user_id = $${paramIndex} RETURNING user_id, nombre, email`;
      values.push(userId);

      const result = await client.query(query, values);
      await client.query("COMMIT");

      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Elimina un usuario y todos sus datos relacionados
   */
  async deleteUser(userId) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Eliminar comentarios del usuario
      await client.query("DELETE FROM comentario WHERE user_id = $1", [userId]);

      // Eliminar posts del usuario
      await client.query("DELETE FROM post WHERE user_id = $1", [userId]);

      // Eliminar usuario
      const result = await client.query(
        "DELETE FROM usuario WHERE user_id = $1 RETURNING user_id",
        [userId]
      );

      await client.query("COMMIT");
      return result.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Buscar posts por palabra clave
   */
  async searchPosts(searchTerm) {
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
      AND (
        LOWER(p.titulo) LIKE LOWER($1)
        OR LOWER(p.contenido) LIKE LOWER($1)
      )
      ORDER BY p.fecha_creacion DESC
    `;
    const searchPattern = `%${searchTerm}%`;
    const { rows } = await pool.query(query, [searchPattern]);
    return rows;
  }
}

module.exports = new UserModel();
