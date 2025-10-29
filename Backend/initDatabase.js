// =============================================================================
// Script de Inicialización de Base de Datos Neo4j - CON SISTEMA DE AMISTAD
// =============================================================================

const { runQuery, closeDriver } = require("./Config/database");

async function initializeDatabase() {
  console.log("🚀 Iniciando configuración de Neo4j AuraDB...\n");

  try {
    // 1. Crear constraint de unicidad para Usuario.email
    console.log("🔒 Creando constraint para Usuario.email...");
    await runQuery(`
      CREATE CONSTRAINT usuario_email_unique IF NOT EXISTS
      FOR (u:Usuario) REQUIRE u.email IS UNIQUE
    `);
    console.log("✅ Constraint de email creado\n");

    // 2. Crear constraint de unicidad para Usuario.user_id
    console.log("🔒 Creando constraint para Usuario.user_id...");
    await runQuery(`
      CREATE CONSTRAINT usuario_id_unique IF NOT EXISTS
      FOR (u:Usuario) REQUIRE u.user_id IS UNIQUE
    `);
    console.log("✅ Constraint de user_id creado\n");

    // 3. Crear constraint de unicidad para Post.post_id
    console.log("🔒 Creando constraint para Post.post_id...");
    await runQuery(`
      CREATE CONSTRAINT post_id_unique IF NOT EXISTS
      FOR (p:Post) REQUIRE p.post_id IS UNIQUE
    `);
    console.log("✅ Constraint de post_id creado\n");

    // 4. Crear constraint de unicidad para Comentario.comment_id
    console.log("🔒 Creando constraint para Comentario.comment_id...");
    await runQuery(`
      CREATE CONSTRAINT comentario_id_unique IF NOT EXISTS
      FOR (c:Comentario) REQUIRE c.comment_id IS UNIQUE
    `);
    console.log("✅ Constraint de comment_id creado\n");

    // 5. Crear índice para búsquedas en Post.titulo
    console.log("🔍 Creando índice para Post.titulo...");
    await runQuery(`
      CREATE INDEX post_titulo_index IF NOT EXISTS
      FOR (p:Post) ON (p.titulo)
    `);
    console.log("✅ Índice de titulo creado\n");

    // 6. Crear índice para búsquedas en Post.contenido
    console.log("🔍 Creando índice para Post.contenido...");
    await runQuery(`
      CREATE INDEX post_contenido_index IF NOT EXISTS
      FOR (p:Post) ON (p.contenido)
    `);
    console.log("✅ Índice de contenido creado\n");

    // 7. Crear índice para fecha_creacion de Post
    console.log("🔍 Creando índice para Post.fecha_creacion...");
    await runQuery(`
      CREATE INDEX post_fecha_index IF NOT EXISTS
      FOR (p:Post) ON (p.fecha_creacion)
    `);
    console.log("✅ Índice de fecha creado\n");

    // 8. Crear índice para Usuario.nombre (para búsquedas)
    console.log("🔍 Creando índice para Usuario.nombre...");
    await runQuery(`
      CREATE INDEX usuario_nombre_index IF NOT EXISTS
      FOR (u:Usuario) ON (u.nombre)
    `);
    console.log("✅ Índice de nombre creado\n");

    // =========================================================================
    // NUEVO: ÍNDICES PARA SISTEMA DE AMISTAD
    // =========================================================================

    console.log("👥 Creando índices para el sistema de amistad...");

    // Índice para relaciones AMIGO_DE (optimiza búsqueda de amigos)
    await runQuery(`
      CREATE INDEX amigo_de_index IF NOT EXISTS
      FOR ()-[r:AMIGO_DE]-() ON (r.fecha_amistad)
    `);
    console.log("✅ Índice para relación AMIGO_DE creado\n");

    // Índice para relaciones SOLICITUD_AMISTAD (optimiza búsqueda de solicitudes)
    await runQuery(`
      CREATE INDEX solicitud_amistad_index IF NOT EXISTS
      FOR ()-[r:SOLICITUD_AMISTAD]-() ON (r.fecha_solicitud)
    `);
    console.log("✅ Índice para relación SOLICITUD_AMISTAD creado\n");

    // Verificar constraints e índices creados
    console.log("🔍 Verificando constraints...");
    const constraints = await runQuery("SHOW CONSTRAINTS");
    console.log(`✅ Total de constraints: ${constraints.length}`);
    constraints.forEach((c) => {
      console.log(`   - ${c.get("name")}: ${c.get("type")}`);
    });
    console.log();

    console.log("🔍 Verificando índices...");
    const indexes = await runQuery("SHOW INDEXES");
    console.log(`✅ Total de índices: ${indexes.length}`);
    indexes.forEach((idx) => {
      console.log(`   - ${idx.get("name")}: ${idx.get("type")}`);
    });
    console.log();

    // Probar creación de un usuario de prueba (opcional)
    console.log("🧪 Probando creación de nodo de prueba...");
    const testResult = await runQuery(`
      MERGE (u:Usuario {email: 'test@postplace.com'})
      ON CREATE SET
        u.user_id = randomuuid(),
        u.nombre = 'Usuario de Prueba',
        u.contraseña = 'hash_de_prueba',
        u.fecha_creacion = datetime()
      RETURN u.user_id as user_id, u.nombre as nombre
    `);

    if (testResult.length > 0) {
      console.log(
        "✅ Usuario de prueba creado/encontrado:",
        testResult[0].toObject()
      );
    }
    console.log();

    console.log("🎉 ¡Configuración de Neo4j completada exitosamente!\n");
    console.log("📊 Estructura de la base de datos:");
    console.log("   - Nodos: Usuario, Post, Comentario");
    console.log("   - Relaciones: [:CREO], [:COMENTO], [:EN_POST]");
    console.log("   - Relaciones de Amistad: [:AMIGO_DE], [:SOLICITUD_AMISTAD]");
    console.log("   - Constraints: 4 (unicidad de IDs y email)");
    console.log("   - Índices: 6 (búsqueda, ordenamiento y relaciones)\n");
    console.log("✅ La base de datos está lista para usar");
    console.log("💡 Puedes eliminar el usuario de prueba ejecutando:");
    console.log(
      "   MATCH (u:Usuario {email: 'test@postplace.com'}) DELETE u\n"
    );
  } catch (error) {
    console.error("❌ Error durante la inicialización:", error);
    console.error("Detalles:", error.message);
    if (error.code) {
      console.error("Código de error:", error.code);
    }
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

// Ejecutar la inicialización
initializeDatabase();
