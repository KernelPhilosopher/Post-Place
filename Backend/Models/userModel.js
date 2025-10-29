// =============================================================================
// Modelo de Usuario - CORREGIDO PARA NEO4J
// =============================================================================

const { runQuery, runTransaction } = require("../Config/database");

class UserModel {
  /**
   * Busca un usuario por email (sin contraseña)
   */
  async findByEmail(email) {
    const query = `
      MATCH (u:Usuario {email: $email})
      RETURN u.user_id as user_id, u.nombre as nombre, u.email as email
    `;
    const records = await runQuery(query, { email: email.toLowerCase() });
    return records.length > 0 ? records[0].toObject() : null;
  }

  /**
   * Busca un usuario por email con contraseña (para login)
   */
  async findByEmailWithPassword(email) {
    const query = `
      MATCH (u:Usuario {email: $email})
      RETURN u.user_id as user_id, u.nombre as nombre, u.email as email, u.contraseña as contraseña
    `;
    const records = await runQuery(query, { email: email.toLowerCase() });
    return records.length > 0 ? records[0].toObject() : null;
  }

  /**
   * Busca un usuario por ID con contraseña (para verificaciones de seguridad)
   */
  async findByIdWithPassword(userId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})
      RETURN u.user_id as user_id, u.nombre as nombre, u.email as email, u.contraseña as contraseña
    `;
    const records = await runQuery(query, { userId });
    return records.length > 0 ? records[0].toObject() : null;
  }

  /**
   * Crea un nuevo usuario - CORREGIDO: randomuuid() en minúsculas
   */
  async create(nombre, email, hashedPassword) {
    const query = `
      CREATE (u:Usuario {
        user_id: randomuuid(),
        nombre: $nombre,
        email: $email,
        contraseña: $hashedPassword,
        fecha_creacion: datetime(),
        fecha_actualizacion: datetime()
      })
      RETURN u.user_id as user_id, u.nombre as nombre, u.email as email
    `;
    const records = await runQuery(query, {
      nombre: nombre.trim(),
      email: email.toLowerCase(),
      hashedPassword,
    });
    return records.length > 0 ? records[0].toObject() : null;
  }

  /**
   * Obtiene posts donde el usuario ha comentado
   */
  async getPostsWhereUserCommented(userId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})-[:COMENTO]->(c:Comentario)-[:EN_POST]->(p:Post)
      MATCH (autor:Usuario)-[:CREO]->(p)
      WITH DISTINCT p, autor
      OPTIONAL MATCH (p)<-[:EN_POST]-(comentarios:Comentario)<-[:COMENTO]-(comentarista:Usuario)
      WITH p, autor,
           collect({
             comment_id: comentarios.comment_id,
             contenido: comentarios.contenido,
             fecha_creacion: toString(comentarios.fecha_creacion),
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
   * Actualiza información del perfil del usuario
   */
  async updateUser(userId, updates) {
    return await runTransaction(async (tx) => {
      let setParts = [];
      let params = { userId };

      if (updates.nombre) {
        setParts.push("u.nombre = $nombre");
        params.nombre = updates.nombre.trim();
      }

      if (updates.email) {
        setParts.push("u.email = $email");
        params.email = updates.email.toLowerCase();
      }

      if (updates.hashedPassword) {
        setParts.push("u.contraseña = $hashedPassword");
        params.hashedPassword = updates.hashedPassword;
      }

      if (setParts.length === 0) {
        return null;
      }

      const query = `
        MATCH (u:Usuario {user_id: $userId})
        SET ${setParts.join(", ")},
            u.fecha_actualizacion = datetime()
        RETURN u.user_id as user_id, u.nombre as nombre, u.email as email
      `;

      const result = await tx.run(query, params);
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }

  /**
   * Elimina un usuario y todos sus datos relacionados
   */
  async deleteUser(userId) {
    return await runTransaction(async (tx) => {
      const deleteQuery = `
        MATCH (u:Usuario {user_id: $userId})
        OPTIONAL MATCH (u)-[:COMENTO]->(c:Comentario)
        OPTIONAL MATCH (u)-[:CREO]->(p:Post)
        OPTIONAL MATCH (p)<-[:EN_POST]-(pc:Comentario)
        DETACH DELETE u, c, p, pc
        RETURN $userId as user_id
      `;

      const result = await tx.run(deleteQuery, { userId });
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }

  /**
   * Busca posts por palabra clave en título o contenido
   */
  async searchPosts(searchTerm) {
    const query = `
      MATCH (p:Post)
      WHERE toLower(p.titulo) CONTAINS toLower($searchTerm)
         OR toLower(p.contenido) CONTAINS toLower($searchTerm)
      MATCH (autor:Usuario)-[:CREO]->(p)
      OPTIONAL MATCH (p)<-[:EN_POST]-(comentarios:Comentario)<-[:COMENTO]-(comentarista:Usuario)
      WITH p, autor,
           collect({
             comment_id: comentarios.comment_id,
             contenido: comentarios.contenido,
             fecha_creacion: toString(comentarios.fecha_creacion),
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
    const records = await runQuery(query, { searchTerm });
    return records.map((record) => {
      const obj = record.toObject();
      obj.comments = obj.comments.filter((c) => c.comment_id !== null);
      return obj;
    });
  }
}

module.exports = new UserModel();
