const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(express.json()); // Para poder leer JSON en req.body

// Configuración de la conexión a PostgreSQL
const db = new Pool({
  host: "localhost",
  user: "postgres",       // tu usuario de PostgreSQL
  password: "Unionivan1280", // tu contraseña
  database: "foro_db",    // tu BD
  port: 5432              // puerto por defecto PostgreSQL
});

// Ruta de prueba
app.get("/", (req, res) => {
  res.send("Servidor backend funcionando con PostgreSQL");
});


// ======================= CRUD USUARIOS ======================= //

// 1. GET → listar todos los usuarios
app.get("/usuarios", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM USUARIO");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. POST → crear un usuario
app.post("/usuarios", async (req, res) => {
  try {
    const { nombre, email, contraseña } = req.body;
    const result = await db.query(
      "INSERT INTO USUARIO (NOMBRE, EMAIL, CONTRASEÑA) VALUES ($1, $2, $3) RETURNING *",
      [nombre, email, contraseña]
    );
    res.status(201).json(result.rows[0]); // el nuevo usuario creado
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. PUT → actualizar usuario por ID
app.put("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params; // id en la URL
    const { nombre, email, contraseña } = req.body;
    const result = await db.query(
      "UPDATE USUARIO SET NOMBRE = $1, EMAIL = $2, CONTRASEÑA = $3 WHERE USER_ID = $4 RETURNING *",
      [nombre, email, contraseña, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json(result.rows[0]); // el usuario actualizado
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. DELETE → eliminar usuario por ID
app.delete("/usuarios/:id", async (req, res) => {
  try {
    const { id } = req.params; // id en la URL
    const result = await db.query(
      "DELETE FROM USUARIO WHERE USER_ID = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Usuario no encontrado" });
    res.json({ message: "Usuario eliminado", usuario: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ======================= Servidor ======================= //
app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
