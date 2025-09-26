// =============================================================================
// Módulo de Configuración de Base de Datos
// =============================================================================
// Descripción: Este módulo se encarga de configurar y exportar el pool de
// conexiones a la base de datos PostgreSQL (Supabase). Centralizar la
// configuración aquí sigue el Principio de Responsabilidad Única (SRP),
// facilitando la gestión de la conexión en un solo lugar.
// =============================================================================

const { Pool } = require("pg");
require("dotenv").config();

/**
 * @description Pool de conexiones a la base de datos.
 * Un pool es más eficiente que crear una nueva conexión para cada consulta,
 * ya que reutiliza las conexiones existentes.
 * La configuración se toma de las variables de entorno para mayor seguridad
 * y flexibilidad (Principio de Abierto/Cerrado).
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Requerido para conexiones seguras a servicios como Supabase o Heroku.
    rejectUnauthorized: false,
  },
});

// Exportamos el objeto 'pool' para que pueda ser utilizado por los modelos
// para realizar consultas a la base de datos.
module.exports = pool;
