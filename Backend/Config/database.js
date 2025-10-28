// =============================================================================
// Módulo de Configuración de Base de Datos Neo4j
// =============================================================================
// Descripción: Este módulo configura y exporta la instancia del driver de Neo4j
// para conectarse a Neo4j AuraDB. Usa la configuración exitosa del proyecto Python.
// =============================================================================

const neo4j = require("neo4j-driver");
require("dotenv").config();

/**
 * Configuración de conexión a Neo4j AuraDB
 */
const URI = process.env.NEO4J_URI || "neo4j+s://50dc6fd1.databases.neo4j.io";
const USER = process.env.NEO4J_USER || "neo4j";
const PASSWORD =
  process.env.NEO4J_PASSWORD || "LneZgBdb8yUyaDoANLxm_UZ1Qt2qnQQdLlZYpIOj588";

/**
 * Driver de Neo4j con configuración optimizada
 * NOTA: Como la URI ya incluye 'neo4j+s://' (encrypted),
 * NO debemos especificar encrypted/trust en las opciones
 */
const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD), {
  maxConnectionPoolSize: 50,
  connectionAcquisitionTimeout: 30000,
  maxTransactionRetryTime: 30000,
});

/**
 * Verificar la conexión al iniciar
 */
const verifyConnection = async () => {
  const session = driver.session();
  try {
    const result = await session.run(
      'RETURN "Conexión exitosa a Neo4j!" AS mensaje, timestamp() AS tiempo'
    );
    const record = result.records[0];
    console.log(
      "✅",
      record.get("mensaje"),
      "- Timestamp:",
      record.get("tiempo")
    );
    return true;
  } catch (error) {
    console.error("❌ Error de conexión a Neo4j:", error);
    return false;
  } finally {
    await session.close();
  }
};

// Verificar conexión al cargar el módulo
verifyConnection();

/**
 * Función helper para ejecutar consultas con manejo de sesiones
 */
const runQuery = async (query, parameters = {}) => {
  const session = driver.session();
  try {
    const result = await session.run(query, parameters);
    return result.records;
  } catch (error) {
    console.error("Error ejecutando query:", error);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Función helper para ejecutar transacciones
 */
const runTransaction = async (transactionWork) => {
  const session = driver.session();
  try {
    return await session.executeWrite(transactionWork);
  } catch (error) {
    console.error("Error en transacción:", error);
    throw error;
  } finally {
    await session.close();
  }
};

/**
 * Cerrar el driver (útil para shutdown graceful)
 */
const closeDriver = async () => {
  await driver.close();
  console.log("🔌 Conexión a Neo4j cerrada.");
};

// Manejo de señales para cerrar la conexión
process.on("SIGTERM", closeDriver);
process.on("SIGINT", closeDriver);

module.exports = {
  driver,
  runQuery,
  runTransaction,
  closeDriver,
  verifyConnection,
};
