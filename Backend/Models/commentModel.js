// =============================================================================
// Modelo de Comentario - ADAPTADO PARA NEO4J (COMPLETO)
// =============================================================================

const { runQuery, runTransaction } = require("../Config/database");

class CommentModel {
  /**
   * Crea un nuevo comentario
   */
  async create(postId, userId, contenido) {
    return await runTransaction(async (tx) => {
      // Primero verificar que el post existe
      const checkPost = await tx.run(
        "MATCH (p:Post {post_id: $postId}) RETURN p",
        { postId }
      );

      if (checkPost.records.length === 0) {
        throw new Error("El post especificado no existe");
      }

      // Crear el comentario y sus relaciones
      const query = `
        MATCH (p:Post {post_id: $postId})
        MATCH (u:Usuario {user_id: $userId})
        CREATE (c:Comentario {
          comment_id: randomUUID(),
          post_id: $postId,
          user_id: $userId,
          contenido: $contenido,
          fecha_creacion: datetime(),
          fecha_actualizacion: datetime()
        })
        CREATE (u)-[:COMENTO]->(c)
        CREATE (c)-[:EN_POST]->(p)
        RETURN c.comment_id as comment_id,
               c.post_id as post_id,
               c.user_id as user_id,
               c.contenido as contenido,
               toString(c.fecha_creacion) as fecha_creacion,
               u.nombre as autor_nombre
      `;

      const result = await tx.run(query, { postId, userId, contenido });
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }

  /**
   * Actualiza un comentario existente.
   * SOLO el autor del comentario puede actualizarlo.
   */
  async update(commentId, userId, contenido) {
    return await runTransaction(async (tx) => {
      const query = `
        MATCH (u:Usuario {user_id: $userId})-[:COMENTO]->(c:Comentario {comment_id: $commentId})
        SET c.contenido = $contenido,
            c.fecha_actualizacion = datetime()
        RETURN c.comment_id as comment_id,
               c.post_id as post_id,
               c.user_id as user_id,
               c.contenido as contenido,
               toString(c.fecha_creacion) as fecha_creacion,
               u.nombre as autor_nombre
      `;

      const result = await tx.run(query, { commentId, userId, contenido });
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }

  /**
   * Elimina un comentario.
   * SOLO el autor del comentario puede eliminarlo.
   */
  async remove(commentId, userId) {
    return await runTransaction(async (tx) => {
      const query = `
        MATCH (u:Usuario {user_id: $userId})-[:COMENTO]->(c:Comentario {comment_id: $commentId})
        WITH c.comment_id as comment_id, c.post_id as post_id
        MATCH (c2:Comentario {comment_id: comment_id})
        DETACH DELETE c2
        RETURN comment_id, post_id
      `;

      const result = await tx.run(query, { commentId, userId });
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }
}

module.exports = new CommentModel();
