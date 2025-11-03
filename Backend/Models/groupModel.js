// =============================================================================
// Modelo de Grupos - SISTEMA COMPLETO DE COMUNIDADES
// =============================================================================

const { runQuery, runTransaction } = require("../Config/database");

class GroupModel {
  /**
   * Crea un nuevo grupo
   */
  async create(creatorId, nombre, descripcion, esPrivado = false) {
    return await runTransaction(async (tx) => {
      const query = `
        MATCH (creator:Usuario {user_id: $creatorId})
        CREATE (g:Grupo {
          group_id: randomuuid(),
          nombre: $nombre,
          descripcion: $descripcion,
          esPrivado: $esPrivado,
          creador_id: $creatorId,
          fecha_creacion: datetime()
        })
        CREATE (creator)-[:CREO_GRUPO]->(g)
        CREATE (creator)-[:ADMIN_DE]->(g)
        CREATE (creator)-[:MIEMBRO_DE {fecha_union: datetime(), rol: 'admin'}]->(g)
        RETURN g.group_id as group_id,
               g.nombre as nombre,
               g.descripcion as descripcion,
               g.esPrivado as esPrivado,
               g.creador_id as creador_id,
               toString(g.fecha_creacion) as fecha_creacion,
               creator.nombre as creador_nombre
      `;

      const result = await tx.run(query, {
        creatorId,
        nombre,
        descripcion,
        esPrivado,
      });
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }

  /**
   * Obtiene todos los grupos del usuario (donde es miembro)
   */
  async getUserGroups(userId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})-[m:MIEMBRO_DE]->(g:Grupo)
      MATCH (creator:Usuario {user_id: g.creador_id})
      OPTIONAL MATCH (g)<-[:MIEMBRO_DE]-(miembros:Usuario)
      WITH g, creator, m, count(DISTINCT miembros) as total_miembros
      RETURN g.group_id as group_id,
             g.nombre as nombre,
             g.descripcion as descripcion,
             g.esPrivado as esPrivado,
             g.creador_id as creador_id,
             creator.nombre as creador_nombre,
             toString(g.fecha_creacion) as fecha_creacion,
             toString(m.fecha_union) as fecha_union,
             m.rol as mi_rol,
             total_miembros
      ORDER BY g.fecha_creacion DESC
    `;

    const records = await runQuery(query, { userId });
    return records.map((record) => record.toObject());
  }

  /**
   * Obtiene información detallada de un grupo
   */
  async getGroupById(groupId, userId) {
    const query = `
      MATCH (g:Grupo {group_id: $groupId})
      MATCH (creator:Usuario {user_id: g.creador_id})
      OPTIONAL MATCH (u:Usuario {user_id: $userId})-[m:MIEMBRO_DE]->(g)
      OPTIONAL MATCH (g)<-[:MIEMBRO_DE]-(miembros:Usuario)
      WITH g, creator, m, collect(DISTINCT {
        user_id: miembros.user_id,
        nombre: miembros.nombre,
        email: miembros.email
      }) as miembros_lista
      RETURN g.group_id as group_id,
             g.nombre as nombre,
             g.descripcion as descripcion,
             g.esPrivado as esPrivado,
             g.creador_id as creador_id,
             creator.nombre as creador_nombre,
             toString(g.fecha_creacion) as fecha_creacion,
             CASE WHEN m IS NOT NULL THEN true ELSE false END as es_miembro,
             m.rol as mi_rol,
             miembros_lista as miembros
    `;

    const records = await runQuery(query, { groupId, userId });
    if (records.length === 0) return null;

    const result = records[0].toObject();
    result.miembros = result.miembros.filter((m) => m.user_id !== null);
    return result;
  }

  /**
   * Añade un miembro al grupo (solo si son amigos)
   */
  async addMember(groupId, userId, newMemberId) {
    return await runTransaction(async (tx) => {
      // Verificar que el usuario es admin del grupo
      const checkAdmin = await tx.run(
        `
        MATCH (u:Usuario {user_id: $userId})-[a:ADMIN_DE]->(g:Grupo {group_id: $groupId})
        RETURN a
      `,
        { userId, groupId }
      );

      if (checkAdmin.records.length === 0) {
        throw new Error("No tienes permisos de administrador en este grupo");
      }

      // Verificar que son amigos
      const checkFriendship = await tx.run(
        `
        MATCH (u1:Usuario {user_id: $userId})-[:AMIGO_DE]-(u2:Usuario {user_id: $newMemberId})
        RETURN u2
      `,
        { userId, newMemberId }
      );

      if (checkFriendship.records.length === 0) {
        throw new Error("Solo puedes añadir a tus amigos al grupo");
      }

      // Verificar que no sea ya miembro
      const checkMember = await tx.run(
        `
        MATCH (u:Usuario {user_id: $newMemberId})-[:MIEMBRO_DE]->(g:Grupo {group_id: $groupId})
        RETURN u
      `,
        { newMemberId, groupId }
      );

      if (checkMember.records.length > 0) {
        throw new Error("Este usuario ya es miembro del grupo");
      }

      // Añadir miembro
      const query = `
        MATCH (u:Usuario {user_id: $newMemberId})
        MATCH (g:Grupo {group_id: $groupId})
        CREATE (u)-[:MIEMBRO_DE {fecha_union: datetime(), rol: 'miembro'}]->(g)
        RETURN u.user_id as user_id,
               u.nombre as nombre,
               u.email as email
      `;

      const result = await tx.run(query, { newMemberId, groupId });
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }

  /**
   * Elimina un miembro del grupo
   */
  async removeMember(groupId, userId, memberToRemoveId) {
    return await runTransaction(async (tx) => {
      // Verificar que el usuario es admin
      const checkAdmin = await tx.run(
        `
        MATCH (u:Usuario {user_id: $userId})-[a:ADMIN_DE]->(g:Grupo {group_id: $groupId})
        RETURN a
      `,
        { userId, groupId }
      );

      if (checkAdmin.records.length === 0) {
        throw new Error("No tienes permisos de administrador");
      }

      // No puede eliminar al creador
      const group = await tx.run(
        `
        MATCH (g:Grupo {group_id: $groupId})
        RETURN g.creador_id as creador_id
      `,
        { groupId }
      );

      if (group.records[0].get("creador_id") === memberToRemoveId) {
        throw new Error("No puedes eliminar al creador del grupo");
      }

      // Eliminar miembro
      const query = `
        MATCH (u:Usuario {user_id: $memberToRemoveId})-[m:MIEMBRO_DE]->(g:Grupo {group_id: $groupId})
        OPTIONAL MATCH (u)-[a:ADMIN_DE]->(g)
        DELETE m, a
        RETURN $memberToRemoveId as removed_user_id
      `;

      const result = await tx.run(query, { memberToRemoveId, groupId });
      return result.records.length > 0;
    });
  }

  /**
   * Abandona un grupo
   */
  async leaveGroup(groupId, userId) {
    return await runTransaction(async (tx) => {
      // Verificar que no es el creador
      const group = await tx.run(
        `
        MATCH (g:Grupo {group_id: $groupId})
        RETURN g.creador_id as creador_id
      `,
        { groupId }
      );

      if (group.records.length === 0) {
        throw new Error("Grupo no encontrado");
      }

      if (group.records[0].get("creador_id") === userId) {
        throw new Error(
          "El creador no puede abandonar el grupo. Debe eliminarlo."
        );
      }

      const query = `
        MATCH (u:Usuario {user_id: $userId})-[m:MIEMBRO_DE]->(g:Grupo {group_id: $groupId})
        OPTIONAL MATCH (u)-[a:ADMIN_DE]->(g)
        DELETE m, a
        RETURN $groupId as group_id
      `;

      const result = await tx.run(query, { userId, groupId });
      return result.records.length > 0;
    });
  }

  /**
   * Elimina un grupo (solo el creador)
   */
  async deleteGroup(groupId, userId) {
    return await runTransaction(async (tx) => {
      const query = `
        MATCH (u:Usuario {user_id: $userId})-[:CREO_GRUPO]->(g:Grupo {group_id: $groupId})
        DETACH DELETE g
        RETURN $groupId as group_id
      `;

      const result = await tx.run(query, { userId, groupId });
      return result.records.length > 0;
    });
  }

  /**
   * Obtiene los amigos del usuario que NO están en el grupo
   */
  async getAvailableFriends(groupId, userId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})-[:AMIGO_DE]-(amigo:Usuario)
      WHERE NOT (amigo)-[:MIEMBRO_DE]->(:Grupo {group_id: $groupId})
      RETURN amigo.user_id as user_id,
             amigo.nombre as nombre,
             amigo.email as email
      ORDER BY amigo.nombre ASC
    `;

    const records = await runQuery(query, { groupId, userId });
    return records.map((record) => record.toObject());
  }
}

module.exports = new GroupModel();
