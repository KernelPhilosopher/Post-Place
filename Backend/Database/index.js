const express = require("express");
const { Pool } = require("pg"); // Cliente para PostgreSQL

const app = express();
app.use(express.json());

// Configuración de la conexión a PostgreSQL
const db = new Pool({
  host: "localhost",
  user: "postgres",       // tu usuario de PostgreSQL (cambia si es otro)
  password: "Unionivan1280", // tu contraseña
  database: "foro_db",    // debe coincidir con el nombre de la BD que creaste
  port: 5432              // puerto por defecto de PostgreSQL
});

app.get("/", (req, res) => {
  res.send("Servidor backend funcionando con PostgreSQL");
});

app.get("/usuarios", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM USUARIO");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
