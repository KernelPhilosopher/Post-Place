// =============================================================================
// Script de Inicialización de Base de Datos Neo4j - CON GRUPOS E INTERESES
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

    // =========================================================================
    // NUEVOS: CONSTRAINTS PARA GRUPOS E INTERESES
    // =========================================================================

    // 5. Crear constraint de unicidad para Grupo.group_id
    console.log("🔒 Creando constraint para Grupo.group_id...");
    await runQuery(`
      CREATE CONSTRAINT grupo_id_unique IF NOT EXISTS
      FOR (g:Grupo) REQUIRE g.group_id IS UNIQUE
    `);
    console.log("✅ Constraint de group_id creado\n");

    // 6. Crear constraint de unicidad para Interes.nombre
    console.log("🔒 Creando constraint para Interes.nombre...");
    await runQuery(`
      CREATE CONSTRAINT interes_nombre_unique IF NOT EXISTS
      FOR (i:Interes) REQUIRE i.nombre IS UNIQUE
    `);
    console.log("✅ Constraint de interes_nombre creado\n");

    // =========================================================================
    // ÍNDICES
    // =========================================================================

    console.log("🔍 Creando índice para Post.titulo...");
    await runQuery(`
      CREATE INDEX post_titulo_index IF NOT EXISTS
      FOR (p:Post) ON (p.titulo)
    `);
    console.log("✅ Índice de titulo creado\n");

    console.log("🔍 Creando índice para Post.contenido...");
    await runQuery(`
      CREATE INDEX post_contenido_index IF NOT EXISTS
      FOR (p:Post) ON (p.contenido)
    `);
    console.log("✅ Índice de contenido creado\n");

    console.log("🔍 Creando índice para Post.fecha_creacion...");
    await runQuery(`
      CREATE INDEX post_fecha_index IF NOT EXISTS
      FOR (p:Post) ON (p.fecha_creacion)
    `);
    console.log("✅ Índice de fecha creado\n");

    console.log("🔍 Creando índice para Usuario.nombre...");
    await runQuery(`
      CREATE INDEX usuario_nombre_index IF NOT EXISTS
      FOR (u:Usuario) ON (u.nombre)
    `);
    console.log("✅ Índice de nombre creado\n");

    console.log("👥 Creando índices para el sistema de amistad...");
    await runQuery(`
      CREATE INDEX amigo_de_index IF NOT EXISTS
      FOR ()-[r:AMIGO_DE]-() ON (r.fecha_amistad)
    `);
    console.log("✅ Índice para relación AMIGO_DE creado\n");

    await runQuery(`
      CREATE INDEX solicitud_amistad_index IF NOT EXISTS
      FOR ()-[r:SOLICITUD_AMISTAD]-() ON (r.fecha_solicitud)
    `);
    console.log("✅ Índice para relación SOLICITUD_AMISTAD creado\n");

    // =========================================================================
    // NUEVOS: ÍNDICES PARA GRUPOS E INTERESES
    // =========================================================================

    console.log("🏘️ Creando índice para Grupo.nombre...");
    await runQuery(`
      CREATE INDEX grupo_nombre_index IF NOT EXISTS
      FOR (g:Grupo) ON (g.nombre)
    `);
    console.log("✅ Índice de nombre de grupo creado\n");

    console.log("🎯 Creando índice para Interes.categoria...");
    await runQuery(`
      CREATE INDEX interes_categoria_index IF NOT EXISTS
      FOR (i:Interes) ON (i.categoria)
    `);
    console.log("✅ Índice de categoria de interes creado\n");

    // =========================================================================
    // CREAR INTERESES PREDEFINIDOS
    // =========================================================================

    console.log("🎯 Creando intereses predefinidos...");

    const interesesPredefinidos = [
      // Deportes
      { nombre: "Fútbol", categoria: "Deportes", emoji: "⚽" },
      { nombre: "Baloncesto", categoria: "Deportes", emoji: "🏀" },
      { nombre: "Tenis", categoria: "Deportes", emoji: "🎾" },
      { nombre: "Natación", categoria: "Deportes", emoji: "🏊" },
      { nombre: "Ciclismo", categoria: "Deportes", emoji: "🚴" },
      { nombre: "Gimnasio", categoria: "Deportes", emoji: "💪" },

      // Tecnología
      { nombre: "Programación", categoria: "Tecnología", emoji: "💻" },
      {
        nombre: "Inteligencia Artificial",
        categoria: "Tecnología",
        emoji: "🤖",
      },
      { nombre: "Videojuegos", categoria: "Tecnología", emoji: "🎮" },
      { nombre: "Ciberseguridad", categoria: "Tecnología", emoji: "🔐" },
      { nombre: "Desarrollo Web", categoria: "Tecnología", emoji: "🌐" },

      // Arte y Cultura
      { nombre: "Música", categoria: "Arte y Cultura", emoji: "🎵" },
      { nombre: "Cine", categoria: "Arte y Cultura", emoji: "🎬" },
      { nombre: "Fotografía", categoria: "Arte y Cultura", emoji: "📷" },
      { nombre: "Pintura", categoria: "Arte y Cultura", emoji: "🎨" },
      { nombre: "Literatura", categoria: "Arte y Cultura", emoji: "📚" },
      { nombre: "Teatro", categoria: "Arte y Cultura", emoji: "🎭" },

      // Gastronomía
      { nombre: "Cocina", categoria: "Gastronomía", emoji: "🍳" },
      { nombre: "Repostería", categoria: "Gastronomía", emoji: "🧁" },
      { nombre: "Café", categoria: "Gastronomía", emoji: "☕" },
      { nombre: "Comida Saludable", categoria: "Gastronomía", emoji: "🥗" },

      // Viajes
      { nombre: "Viajes", categoria: "Viajes y Aventura", emoji: "✈️" },
      { nombre: "Aventura", categoria: "Viajes y Aventura", emoji: "🏕️" },
      { nombre: "Senderismo", categoria: "Viajes y Aventura", emoji: "🥾" },

      // Ciencia
      { nombre: "Astronomía", categoria: "Ciencia", emoji: "🔭" },
      { nombre: "Biología", categoria: "Ciencia", emoji: "🧬" },
      { nombre: "Física", categoria: "Ciencia", emoji: "⚛️" },

      // Estilo de Vida
      { nombre: "Yoga", categoria: "Estilo de Vida", emoji: "🧘" },
      { nombre: "Meditación", categoria: "Estilo de Vida", emoji: "🕉️" },
      { nombre: "Moda", categoria: "Estilo de Vida", emoji: "👗" },
      { nombre: "Mascotas", categoria: "Estilo de Vida", emoji: "🐾" },
      { nombre: "Jardinería", categoria: "Estilo de Vida", emoji: "🌱" },
    ];

    for (const interes of interesesPredefinidos) {
      await runQuery(
        `
        MERGE (i:Interes {nombre: $nombre})
        ON CREATE SET
          i.categoria = $categoria,
          i.emoji = $emoji,
          i.fecha_creacion = datetime()
      `,
        interes
      );
    }

    console.log(
      `✅ ${interesesPredefinidos.length} intereses predefinidos creados\n`
    );

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

    console.log("🎉 ¡Configuración de Neo4j completada exitosamente!\n");
    console.log("📊 Estructura de la base de datos:");
    console.log("   - Nodos: Usuario, Post, Comentario, Grupo, Interes");
    console.log("   - Relaciones de Posts: [:CREO], [:COMENTO], [:EN_POST]");
    console.log(
      "   - Relaciones de Amistad: [:AMIGO_DE], [:SOLICITUD_AMISTAD]"
    );
    console.log(
      "   - Relaciones de Grupos: [:CREO_GRUPO], [:MIEMBRO_DE], [:ADMIN_DE]"
    );
    console.log("   - Relaciones de Intereses: [:INTERESADO_EN]");
    console.log("   - Constraints: 6 (unicidad de IDs y nombres)");
    console.log("   - Índices: 10+ (búsqueda, ordenamiento y relaciones)\n");
    console.log("✅ La base de datos está lista para usar");
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
