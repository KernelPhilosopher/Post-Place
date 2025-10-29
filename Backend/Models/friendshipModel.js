// =============================================================================
// Modelo de Amistad - SISTEMA COMPLETO DE GESTIÓN DE AMISTADES
// =============================================================================

const { runQuery, runTransaction } = require("../Config/database");

class FriendshipModel {
  /**
   * Envía una solicitud de amistad de un usuario a otro
   */
  async sendFriendRequest(fromUserId, toUserId) {
    return await runTransaction(async (tx) => {
      // Verificar que no sean el mismo usuario
      if (fromUserId === toUserId) {
        throw new Error(
          "No puedes enviarte una solicitud de amistad a ti mismo"
        );
      }

      // Verificar que ambos usuarios existen
      const checkUsers = await tx.run(
        `
        MATCH (from:Usuario {user_id: $fromUserId})
        MATCH (to:Usuario {user_id: $toUserId})
        RETURN from.nombre as from_nombre, to.nombre as to_nombre
        `,
        { fromUserId, toUserId }
      );

      if (checkUsers.records.length === 0) {
        throw new Error("Uno o ambos usuarios no existen");
      }

      // Verificar si ya son amigos
      const checkFriendship = await tx.run(
        `
        MATCH (from:Usuario {user_id: $fromUserId})
        MATCH (to:Usuario {user_id: $toUserId})
        OPTIONAL MATCH (from)-[r:AMIGO_DE]-(to)
        RETURN r
        `,
        { fromUserId, toUserId }
      );

      if (checkFriendship.records[0]?.get("r")) {
        throw new Error("Ya son amigos");
      }

      // Verificar si ya existe una solicitud pendiente
      const checkPending = await tx.run(
        `
        MATCH (from:Usuario {user_id: $fromUserId})
        MATCH (to:Usuario {user_id: $toUserId})
        OPTIONAL MATCH (from)-[r:SOLICITUD_AMISTAD]->(to)
        OPTIONAL MATCH (to)-[r2:SOLICITUD_AMISTAD]->(from)
        RETURN r, r2
        `,
        { fromUserId, toUserId }
      );

      if (checkPending.records[0]?.get("r")) {
        throw new Error("Ya enviaste una solicitud a este usuario");
      }

      if (checkPending.records[0]?.get("r2")) {
        throw new Error(
          "Este usuario ya te envió una solicitud. Acéptala desde tus solicitudes pendientes"
        );
      }

      // Crear la solicitud de amistad
      const query = `
        MATCH (from:Usuario {user_id: $fromUserId})
        MATCH (to:Usuario {user_id: $toUserId})
        CREATE (from)-[r:SOLICITUD_AMISTAD {
          fecha_solicitud: datetime(),
          estado: 'pendiente'
        }]->(to)
        RETURN from.user_id as from_user_id,
               from.nombre as from_nombre,
               to.user_id as to_user_id,
               to.nombre as to_nombre,
               toString(r.fecha_solicitud) as fecha_solicitud
      `;

      const result = await tx.run(query, { fromUserId, toUserId });
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }

  /**
   * Acepta una solicitud de amistad
   */
  async acceptFriendRequest(userId, fromUserId) {
    return await runTransaction(async (tx) => {
      // Verificar que existe la solicitud
      const checkRequest = await tx.run(
        `
        MATCH (from:Usuario {user_id: $fromUserId})-[r:SOLICITUD_AMISTAD]->(to:Usuario {user_id: $userId})
        RETURN r
        `,
        { userId, fromUserId }
      );

      if (checkRequest.records.length === 0) {
        throw new Error("No existe solicitud de amistad de este usuario");
      }

      // Eliminar la solicitud y crear la relación de amistad bidireccional
      const query = `
        MATCH (from:Usuario {user_id: $fromUserId})-[r:SOLICITUD_AMISTAD]->(to:Usuario {user_id: $userId})
        DELETE r
        CREATE (from)-[:AMIGO_DE {fecha_amistad: datetime()}]->(to)
        CREATE (to)-[:AMIGO_DE {fecha_amistad: datetime()}]->(from)
        RETURN from.user_id as friend_user_id,
               from.nombre as friend_nombre,
               from.email as friend_email
      `;

      const result = await tx.run(query, { userId, fromUserId });
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }

  /**
   * Rechaza una solicitud de amistad
   */
  async rejectFriendRequest(userId, fromUserId) {
    return await runTransaction(async (tx) => {
      const query = `
        MATCH (from:Usuario {user_id: $fromUserId})-[r:SOLICITUD_AMISTAD]->(to:Usuario {user_id: $userId})
        DELETE r
        RETURN $fromUserId as rejected_user_id
      `;

      const result = await tx.run(query, { userId, fromUserId });
      return result.records.length > 0;
    });
  }

  /**
   * Cancela una solicitud de amistad enviada
   */
  async cancelFriendRequest(userId, toUserId) {
    return await runTransaction(async (tx) => {
      const query = `
        MATCH (from:Usuario {user_id: $userId})-[r:SOLICITUD_AMISTAD]->(to:Usuario {user_id: $toUserId})
        DELETE r
        RETURN $toUserId as cancelled_user_id
      `;

      const result = await tx.run(query, { userId, toUserId });
      return result.records.length > 0;
    });
  }

  /**
   * Elimina una amistad existente
   */
  async removeFriend(userId, friendId) {
    return await runTransaction(async (tx) => {
      // Verificar que son amigos
      const checkFriendship = await tx.run(
        `
        MATCH (u:Usuario {user_id: $userId})-[r:AMIGO_DE]-(f:Usuario {user_id: $friendId})
        RETURN r
        `,
        { userId, friendId }
      );

      if (checkFriendship.records.length === 0) {
        throw new Error("No son amigos");
      }

      // Eliminar ambas relaciones de amistad
      const query = `
        MATCH (u:Usuario {user_id: $userId})-[r1:AMIGO_DE]-(f:Usuario {user_id: $friendId})
        DELETE r1
        RETURN $friendId as removed_friend_id
      `;

      const result = await tx.run(query, { userId, friendId });
      return result.records.length > 0;
    });
  }

  /**
   * Obtiene la lista de amigos de un usuario
   */
  async getFriendsList(userId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})-[r:AMIGO_DE]->(friend:Usuario)
      RETURN friend.user_id as user_id,
             friend.nombre as nombre,
             friend.email as email,
             toString(r.fecha_amistad) as fecha_amistad
      ORDER BY friend.nombre ASC
    `;

    const records = await runQuery(query, { userId });
    return records.map((record) => record.toObject());
  }

  /**
   * Obtiene las solicitudes de amistad recibidas (pendientes)
   */
  async getPendingRequests(userId) {
    const query = `
      MATCH (from:Usuario)-[r:SOLICITUD_AMISTAD]->(to:Usuario {user_id: $userId})
      RETURN from.user_id as user_id,
             from.nombre as nombre,
             from.email as email,
             toString(r.fecha_solicitud) as fecha_solicitud
      ORDER BY r.fecha_solicitud DESC
    `;

    const records = await runQuery(query, { userId });
    return records.map((record) => record.toObject());
  }

  /**
   * Obtiene las solicitudes de amistad enviadas (pendientes)
   */
  async getSentRequests(userId) {
    const query = `
      MATCH (from:Usuario {user_id: $userId})-[r:SOLICITUD_AMISTAD]->(to:Usuario)
      RETURN to.user_id as user_id,
             to.nombre as nombre,
             to.email as email,
             toString(r.fecha_solicitud) as fecha_solicitud
      ORDER BY r.fecha_solicitud DESC
    `;

    const records = await runQuery(query, { userId });
    return records.map((record) => record.toObject());
  }

  /**
   * Busca usuarios por nombre o email (para enviar solicitudes)
   * Excluye: el propio usuario, usuarios que ya son amigos, solicitudes pendientes
   */
  async searchUsers(userId, searchTerm) {
    const query = `
      MATCH (u:Usuario)
      WHERE (toLower(u.nombre) CONTAINS toLower($searchTerm)
         OR toLower(u.email) CONTAINS toLower($searchTerm))
        AND u.user_id <> $userId

      // Verificar que no sean amigos
      OPTIONAL MATCH (current:Usuario {user_id: $userId})-[r1:AMIGO_DE]-(u)

      // Verificar solicitudes pendientes (enviadas o recibidas)
      OPTIONAL MATCH (current)-[r2:SOLICITUD_AMISTAD]-(u)

      WITH u, r1, r2
      WHERE r1 IS NULL AND r2 IS NULL

      RETURN u.user_id as user_id,
             u.nombre as nombre,
             u.email as email
      ORDER BY u.nombre ASC
      LIMIT 20
    `;

    const records = await runQuery(query, { userId, searchTerm });
    return records.map((record) => record.toObject());
  }

  /**
   * Verifica el estado de amistad entre dos usuarios
   */
  async getFriendshipStatus(userId, otherUserId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})
      MATCH (other:Usuario {user_id: $otherUserId})

      OPTIONAL MATCH (u)-[friend:AMIGO_DE]-(other)
      OPTIONAL MATCH (u)-[sent:SOLICITUD_AMISTAD]->(other)
      OPTIONAL MATCH (other)-[received:SOLICITUD_AMISTAD]->(u)

      RETURN
        CASE
          WHEN friend IS NOT NULL THEN 'amigos'
          WHEN sent IS NOT NULL THEN 'solicitud_enviada'
          WHEN received IS NOT NULL THEN 'solicitud_recibida'
          ELSE 'sin_relacion'
        END as estado
    `;

    const records = await runQuery(query, { userId, otherUserId });
    return records.length > 0 ? records[0].get("estado") : "sin_relacion";
  }

  /**
   * Obtiene estadísticas de amistad de un usuario
   */
  async getFriendshipStats(userId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})

      OPTIONAL MATCH (u)-[:AMIGO_DE]->(friends:Usuario)
      WITH u, count(friends) as total_amigos

      OPTIONAL MATCH (u)<-[:SOLICITUD_AMISTAD]-(pending:Usuario)
      WITH u, total_amigos, count(pending) as solicitudes_recibidas

      OPTIONAL MATCH (u)-[:SOLICITUD_AMISTAD]->(sent:Usuario)

      RETURN total_amigos,
             solicitudes_recibidas,
             count(sent) as solicitudes_enviadas
    `;

    const records = await runQuery(query, { userId });
    return records.length > 0
      ? records[0].toObject()
      : {
          total_amigos: 0,
          solicitudes_recibidas: 0,
          solicitudes_enviadas: 0,
        };
  }
}

module.exports = new FriendshipModel();
