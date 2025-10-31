// =============================================================================
// Modelo de Publicación - CON LOGS PARA DEBUG
// =============================================================================

const { runQuery, runTransaction } = require("../Config/database");

class PostModel {
  /**
   * Crea una nueva publicación
   */
  async create(userId, titulo, contenido, imageUrl = null) {
    return await runTransaction(async (tx) => {
      const query = `
        MATCH (u:Usuario {user_id: $userId})
        CREATE (p:Post {
          post_id: randomuuid(),
          user_id: $userId,
          titulo: $titulo,
          contenido: $contenido,
          imageUrl: $imageUrl,
          fecha_creacion: datetime(),
          fecha_actualizacion: datetime()
        })
        CREATE (u)-[:CREO]->(p)
        RETURN p.post_id as post_id,
               p.user_id as user_id,
               p.titulo as titulo,
               p.contenido as contenido,
               p.imageUrl as imageUrl,
               toString(p.fecha_creacion) as fecha_creacion,
               u.nombre as autor_nombre
      `;

      const result = await tx.run(query, {
        userId,
        titulo,
        contenido,
        imageUrl,
      });

      if (result.records.length === 0) return null;

      const post = result.records[0].toObject();
      post.comments = [];
      return post;
    });
  }

  /**
   * Obtiene todas las publicaciones con comentarios
   */
  async findAll() {
    const query = `
      MATCH (autor:Usuario)-[:CREO]->(p:Post)
      OPTIONAL MATCH (p)<-[:EN_POST]-(c:Comentario)<-[:COMENTO]-(comentarista:Usuario)
      WITH p, autor,
           collect({
             comment_id: c.comment_id,
             contenido: c.contenido,
             fecha_creacion: toString(c.fecha_creacion),
             user_id: comentarista.user_id,
             autor_nombre: comentarista.nombre
           }) as comments
      RETURN p.post_id as post_id,
             p.user_id as user_id,
             p.titulo as titulo,
             p.contenido as contenido,
             p.imageUrl as imageUrl,
             toString(p.fecha_creacion) as fecha_creacion,
             autor.nombre as autor_nombre,
             comments
      ORDER BY p.fecha_creacion DESC
    `;

    const records = await runQuery(query);
    return records.map((record) => {
      const obj = record.toObject();
      obj.comments = obj.comments.filter((c) => c.comment_id !== null);
      return obj;
    });
  }

  /**
   * Obtiene publicaciones de un usuario específico
   */
  async findByUserId(userId) {
    const query = `
      MATCH (autor:Usuario {user_id: $userId})-[:CREO]->(p:Post)
      OPTIONAL MATCH (p)<-[:EN_POST]-(c:Comentario)<-[:COMENTO]-(comentarista:Usuario)
      WITH p, autor,
           collect({
             comment_id: c.comment_id,
             contenido: c.contenido,
             fecha_creacion: toString(c.fecha_creacion),
             user_id: comentarista.user_id,
             autor_nombre: comentarista.nombre
           }) as comments
      RETURN p.post_id as post_id,
             p.user_id as user_id,
             p.titulo as titulo,
             p.contenido as contenido,
             p.imageUrl as imageUrl,
             toString(p.fecha_creacion) as fecha_creacion,
             autor.nombre as autor_nombre,
             comments
      ORDER BY p.fecha_creacion DESC
    `;

    const records = await runQuery(query, { userId });
    return records.map((record) => {
      const obj = record.toObject();
      obj.comments = obj.comments.filter((c) => c.comment_id !== null);
      return obj;
    });
  }

  /**
   * Actualiza una publicación - ✅ CON LOGS
   */
  async update(postId, userId, contenido) {
    console.log("🔍 Intentando actualizar post:", {
      postId,
      userId,
      contenido,
    });

    return await runTransaction(async (tx) => {
      const query = `
        MATCH (u:Usuario {user_id: $userId})-[:CREO]->(p:Post {post_id: $postId})
        SET p.contenido = $contenido,
            p.fecha_actualizacion = datetime()
        WITH p, u
        OPTIONAL MATCH (p)<-[:EN_POST]-(c:Comentario)<-[:COMENTO]-(comentarista:Usuario)
        WITH p, u,
             collect({
               comment_id: c.comment_id,
               contenido: c.contenido,
               fecha_creacion: toString(c.fecha_creacion),
               user_id: comentarista.user_id,
               autor_nombre: comentarista.nombre
             }) as comments
        RETURN p.post_id as post_id,
               p.user_id as user_id,
               p.titulo as titulo,
               p.contenido as contenido,
               p.imageUrl as imageUrl,
               toString(p.fecha_creacion) as fecha_creacion,
               u.nombre as autor_nombre,
               comments
      `;

      const result = await tx.run(query, { postId, userId, contenido });

      console.log(
        "✅ Resultado de actualización de post:",
        result.records.length
      );

      if (result.records.length === 0) {
        console.log("⚠️ No se encontró el post o no pertenece al usuario");
        return null;
      }

      const post = result.records[0].toObject();
      post.comments = post.comments.filter((c) => c.comment_id !== null);
      return post;
    });
  }

  /**
   * Elimina una publicación - ✅ CON LOGS
   */
  async remove(postId, userId) {
    console.log("🗑️ Intentando eliminar post:", { postId, userId });

    return await runTransaction(async (tx) => {
      const query = `
        MATCH (u:Usuario {user_id: $userId})-[:CREO]->(p:Post {post_id: $postId})
        OPTIONAL MATCH (p)<-[:EN_POST]-(c:Comentario)
        DETACH DELETE p, c
        RETURN $postId as post_id
      `;

      const result = await tx.run(query, { postId, userId });

      console.log(
        "✅ Resultado de eliminación de post:",
        result.records.length
      );

      return result.records.length > 0
        ? result.records[0].get("post_id")
        : null;
    });
  }
}

module.exports = new PostModel();
