// =============================================================================
// Modelo de Intereses - SISTEMA DE RECOMENDACIONES
// =============================================================================

const { runQuery, runTransaction } = require("../Config/database");

class InterestModel {
  /**
   * Obtiene todos los intereses disponibles
   */
  async getAllInterests() {
    const query = `
      MATCH (i:Interes)
      RETURN i.nombre as nombre,
             i.categoria as categoria,
             i.emoji as emoji
      ORDER BY i.categoria ASC, i.nombre ASC
    `;

    const records = await runQuery(query);

    // Agrupar por categoría
    const grouped = {};
    records.forEach((record) => {
      const obj = record.toObject();
      if (!grouped[obj.categoria]) {
        grouped[obj.categoria] = [];
      }
      grouped[obj.categoria].push({
        nombre: obj.nombre,
        emoji: obj.emoji,
      });
    });

    return grouped;
  }

  /**
   * Obtiene los intereses de un usuario
   */
  async getUserInterests(userId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})-[:INTERESADO_EN]->(i:Interes)
      RETURN i.nombre as nombre,
             i.categoria as categoria,
             i.emoji as emoji
      ORDER BY i.categoria ASC, i.nombre ASC
    `;

    const records = await runQuery(query, { userId });
    return records.map((record) => record.toObject());
  }

  /**
   * Añade un interés a un usuario
   */
  async addInterest(userId, interestName) {
    return await runTransaction(async (tx) => {
      // Verificar que el interés existe
      const checkInterest = await tx.run(
        `
        MATCH (i:Interes {nombre: $interestName})
        RETURN i
      `,
        { interestName }
      );

      if (checkInterest.records.length === 0) {
        throw new Error("El interés especificado no existe");
      }

      // Verificar que no lo tenga ya
      const checkExisting = await tx.run(
        `
        MATCH (u:Usuario {user_id: $userId})-[r:INTERESADO_EN]->(i:Interes {nombre: $interestName})
        RETURN r
      `,
        { userId, interestName }
      );

      if (checkExisting.records.length > 0) {
        throw new Error("Ya tienes este interés");
      }

      // Añadir interés
      const query = `
        MATCH (u:Usuario {user_id: $userId})
        MATCH (i:Interes {nombre: $interestName})
        CREATE (u)-[:INTERESADO_EN {fecha_agregado: datetime()}]->(i)
        RETURN i.nombre as nombre,
               i.categoria as categoria,
               i.emoji as emoji
      `;

      const result = await tx.run(query, { userId, interestName });
      return result.records.length > 0 ? result.records[0].toObject() : null;
    });
  }

  /**
   * Elimina un interés de un usuario
   */
  async removeInterest(userId, interestName) {
    return await runTransaction(async (tx) => {
      const query = `
        MATCH (u:Usuario {user_id: $userId})-[r:INTERESADO_EN]->(i:Interes {nombre: $interestName})
        DELETE r
        RETURN $interestName as nombre
      `;

      const result = await tx.run(query, { userId, interestName });
      return result.records.length > 0;
    });
  }

  /**
   * Obtiene recomendaciones de amigos basadas en intereses comunes
   */
  async getRecommendations(userId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})-[:INTERESADO_EN]->(i:Interes)
      MATCH (other:Usuario)-[:INTERESADO_EN]->(i)
      WHERE other.user_id <> $userId
        AND NOT (u)-[:AMIGO_DE]-(other)
        AND NOT (u)-[:SOLICITUD_AMISTAD]-(other)
      WITH other, collect(DISTINCT i.nombre) as intereses_comunes, count(DISTINCT i) as score
      RETURN other.user_id as user_id,
             other.nombre as nombre,
             other.email as email,
             intereses_comunes,
             score
      ORDER BY score DESC, other.nombre ASC
      LIMIT 20
    `;

    const records = await runQuery(query, { userId });
    return records.map((record) => record.toObject());
  }

  /**
   * Obtiene estadísticas de intereses del usuario
   */
  async getInterestStats(userId) {
    const query = `
      MATCH (u:Usuario {user_id: $userId})-[:INTERESADO_EN]->(i:Interes)
      WITH count(i) as total_intereses, collect(DISTINCT i.categoria) as categorias
      RETURN total_intereses,
             categorias,
             size(categorias) as total_categorias
    `;

    const records = await runQuery(query, { userId });
    return records.length > 0
      ? records[0].toObject()
      : {
          total_intereses: 0,
          categorias: [],
          total_categorias: 0,
        };
  }
}

module.exports = new InterestModel();
