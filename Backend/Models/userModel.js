// =============================================================================
// Modelo de Usuario - ADAPTADO PARA SUPABASE
// =============================================================================

const pool = require("../Config/database");

class UserModel {
  /**
   * Busca un usuario por email (sin contraseña)
   */
  async findByEmail(email) {
    const query = "SELECT user_id, nombre, email FROM usuario WHERE email = $1";
    const { rows } = await pool.query(query, [email.toLowerCase()]);
    return rows[0] || null;
  }

  /**
   * Busca un usuario por email con contraseña (para login)
   */
  async findByEmailWithPassword(email) {
    const query = "SELECT * FROM usuario WHERE email = $1";
    const { rows } = await pool.query(query, [email.toLowerCase()]);
    return rows[0] || null;
  }

  /**
   * Crea un nuevo usuario
   */
  async create(nombre, email, hashedPassword) {
    const query = `
      INSERT INTO usuario (nombre, email, "contraseña")
      VALUES ($1, $2, $3)
      RETURNING user_id, nombre, email
    `;
    const values = [nombre.trim(), email.toLowerCase(), hashedPassword];
    const { rows } = await pool.query(query, values);
    return rows[0];
  }
}

module.exports = new UserModel();
