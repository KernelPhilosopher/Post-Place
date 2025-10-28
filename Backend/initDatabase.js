// =============================================================================
// Script de Inicialización de Base de Datos Neo4j
// =============================================================================
// Descripción: Crea los constraints e índices necesarios en Neo4j AuraDB
// Ejecutar una vez después de crear la base de datos
// Uso: node initDatabase.js
// =============================================================================

const { runQuery, closeDriver } = require("./Config/database");

async function initializeDatabase() {
  console.log("🚀 Iniciando configuración de Neo4j AuraDB...\n");

  try {
    // 1. Crear constraint de unicidad para Usuario.email
    console.log("📝 Creando constraint para Usuario.email...");
    await runQuery(`
      CREATE CONSTRAINT usuario_email_unique IF NOT EXISTS
      FOR (u:Usuario) REQUIRE u.email IS UNIQUE
    `);
    console.log("✅ Constraint de email creado\n");

    // 2. Crear constraint de unicidad para Usuario.user_id
    console.log("📝 Creando constraint para Usuario.user_id...");
    await runQuery(`
      CREATE CONSTRAINT usuario_id_unique IF NOT EXISTS
      FOR (u:Usuario) REQUIRE u.user_id IS UNIQUE
    `);
    console.log("✅ Constraint de user_id creado\n");

    // 3. Crear constraint de unicidad para Post.post_id
    console.log("📝 Creando constraint para Post.post_id...");
    await runQuery(`
      CREATE CONSTRAINT post_id_unique IF NOT EXISTS
      FOR (p:Post) REQUIRE p.post_id IS UNIQUE
    `);
    console.log("✅ Constraint de post_id creado\n");

    // 4. Crear constraint de unicidad para Comentario.comment_id
    console.log("📝 Creando constraint para Comentario.comment_id...");
    await runQuery(`
      CREATE CONSTRAINT comentario_id_unique IF NOT EXISTS
      FOR (c:Comentario) REQUIRE c.comment_id IS UNIQUE
    `);
    console.log("✅ Constraint de comment_id creado\n");

    // 5. Crear índice para búsquedas en Post.titulo
    console.log("📝 Creando índice para Post.titulo...");
    await runQuery(`
      CREATE INDEX post_titulo_index IF NOT EXISTS
      FOR (p:Post) ON (p.titulo)
    `);
    console.log("✅ Índice de titulo creado\n");

    // 6. Crear índice para búsquedas en Post.contenido
    console.log("📝 Creando índice para Post.contenido...");
    await runQuery(`
      CREATE INDEX post_contenido_index IF NOT EXISTS
      FOR (p:Post) ON (p.contenido)
    `);
    console.log("✅ Índice de contenido creado\n");

    // 7. Crear índice para fecha_creacion de Post
    console.log("📝 Creando índice para Post.fecha_creacion...");
    await runQuery(`
      CREATE INDEX post_fecha_index IF NOT EXISTS
      FOR (p:Post) ON (p.fecha_creacion)
    `);
    console.log("✅ Índice de fecha creado\n");

    // Verificar constraints e índices creados
    console.log("🔍 Verificando constraints...");
    const constraints = await runQuery("SHOW CONSTRAINTS");
    console.log(`✅ Total de constraints: ${constraints.length}\n`);

    console.log("🔍 Verificando índices...");
    const indexes = await runQuery("SHOW INDEXES");
    console.log(`✅ Total de índices: ${indexes.length}\n`);

    console.log("🎉 ¡Configuración de Neo4j completada exitosamente!\n");
    console.log("📊 Estructura de la base de datos:");
    console.log("   - Nodos: Usuario, Post, Comentario");
    console.log("   - Relaciones: [:CREO], [:COMENTO], [:EN_POST]");
    console.log("   - Constraints: 4 (unicidad de IDs y email)");
    console.log("   - Índices: 3 (búsqueda y ordenamiento)\n");
  } catch (error) {
    console.error("❌ Error durante la inicialización:", error);
    process.exit(1);
  } finally {
    await closeDriver();
  }
}

// Ejecutar la inicialización
initializeDatabase();
