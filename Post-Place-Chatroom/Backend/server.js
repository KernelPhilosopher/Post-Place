// =============================================================================
// Servidor Backend para Post-Place - ChatRoom Global (Versión Mejorada)
// =============================================================================

// --- 1. IMPORTACIÓN DE MÓDULOS ---
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs"); // Para hashear contraseñas
const jwt = require("jsonwebtoken"); // Para crear y verificar tokens de sesión
const http = require("http"); // Módulo HTTP nativo de Node
require("dotenv").config();

// --- 2. CONFIGURACIÓN INICIAL ---
const app = express();
const server = http.createServer(app); // Creamos un servidor HTTP a partir de la app de Express
const PORT = process.env.PORT || 3000;

// --- 3. CONFIGURACIÓN DE WEBSOCKETS (Socket.io) ---
// Socket.io se engancha al servidor HTTP para permitir comunicación en tiempo real.
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "*", // En producción, deberías restringir esto a tu dominio del frontend
    methods: ["GET", "POST"],
  },
});

// --- 4. CONFIGURACIÓN DE LA BASE DE DATOS ---
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// Agregar manejo de errores del pool
pool.on("error", (err) => {
  console.error("❌ Error inesperado en el pool de conexiones:", err);
  process.exit(-1);
});

// Probar conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error("❌ Error al conectar con la base de datos:", err.message);
    console.error(
      "Verifica tu archivo .env y que PostgreSQL esté ejecutándose"
    );
  } else {
    console.log("✅ Conexión exitosa a la base de datos PostgreSQL");
    release();
  }
});

// --- 5. MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- 6. MIDDLEWARE DE AUTENTICACIÓN (Guardian de Rutas) ---
// Esta función verificará el token JWT en las rutas protegidas.
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Formato: "Bearer TOKEN"

  if (token == null) {
    return res
      .status(401)
      .json({ error: "No autorizado: Token no proporcionado" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Prohibido: Token no es válido" });
    }
    // Si el token es válido, adjuntamos el payload del usuario (su ID) al objeto request.
    req.userId = user.id;
    next(); // Pasamos al siguiente middleware o al controlador de la ruta.
  });
};

// --- 7. ENDPOINTS DE LA API ---

// Endpoint de prueba
app.get("/", (req, res) => {
  res.send("¡API de Post-Place v2 funcionando correctamente!");
});

// --- Rutas de Autenticación (No requieren token) ---

// [POST] Crear un nuevo usuario (Registro)
app.post("/api/register", async (req, res) => {
  const { nombre, email, contraseña } = req.body;
  if (!nombre || !email || !contraseña) {
    return res
      .status(400)
      .json({ error: "Todos los campos son obligatorios." });
  }

  try {
    // Hasheo de la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contraseña, salt);

    // ACTUALIZADO: Usar nombres de columnas en MAYÚSCULAS
    const newUser = await pool.query(
      "INSERT INTO USUARIO (NOMBRE, EMAIL, CONTRASEÑA) VALUES ($1, $2, $3) RETURNING USER_ID, NOMBRE, EMAIL",
      [nombre, email, hashedPassword]
    );
    res.status(201).json({
      user_id: newUser.rows[0].user_id,
      nombre: newUser.rows[0].nombre,
      email: newUser.rows[0].email,
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      error: "Error al crear el usuario. El email ya podría existir.",
    });
  }
});

// [POST] Iniciar Sesión (Login)
app.post("/api/login", async (req, res) => {
  const { email, contraseña } = req.body;
  try {
    // ACTUALIZADO: Usar nombres de columnas en MAYÚSCULAS
    const result = await pool.query("SELECT * FROM USUARIO WHERE EMAIL = $1", [
      email,
    ]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const user = result.rows[0];

    // DEPURACIÓN TEMPORAL - ELIMINAR DESPUÉS DE ARREGLAR
    console.log("=== DEPURACIÓN LOGIN ===");
    console.log("Contraseña recibida:", contraseña);
    console.log("Usuario completo:", user);
    console.log("Columnas disponibles:", Object.keys(user));
    console.log("user.contraseña:", user.contraseña);
    console.log("user.CONTRASEÑA:", user.CONTRASEÑA);
    console.log("========================");

    // Comparar la contraseña proporcionada con la hasheada en la BD
    // PostgreSQL devuelve la columna con la Ñ y acentos: 'contraseÑa'
    const hashedPassword = user["contraseÑa"];

    if (!hashedPassword) {
      console.error("ERROR: No se encontró la contraseña hasheada en la BD");
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    const isMatch = await bcrypt.compare(contraseña, hashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    // Si todo es correcto, crear un token JWT
    const payload = { id: user.user_id, nombre: user.nombre };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({
      token,
      user: {
        user_id: user.user_id,
        nombre: user.nombre,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error en el servidor" });
  }
});

// --- Rutas de Posts (Protegidas por el middleware `authenticateToken`) ---

// [GET] Obtener todos los posts
app.get("/api/posts", authenticateToken, async (req, res) => {
  try {
    // ACTUALIZADO: Usar nombres de tablas y columnas en MAYÚSCULAS
    const allPosts = await pool.query(
      `SELECT p.*, u.NOMBRE as autor_nombre
       FROM POST p
       JOIN USUARIO u ON p.USER_ID = u.USER_ID
       ORDER BY p.FECHA_CREACION DESC`
    );
    res.json(allPosts.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error al obtener los posts" });
  }
});

// [GET] Obtener los posts del usuario logueado
app.get("/api/posts/me", authenticateToken, async (req, res) => {
  // req.userId viene del middleware authenticateToken
  const userId = req.userId;
  try {
    // ACTUALIZADO: Usar nombres de tablas y columnas en MAYÚSCULAS
    const userPosts = await pool.query(
      `SELECT p.*, u.NOMBRE as autor_nombre
       FROM POST p
       JOIN USUARIO u ON p.USER_ID = u.USER_ID
       WHERE p.USER_ID = $1
       ORDER BY p.FECHA_CREACION DESC`,
      [userId]
    );
    res.json(userPosts.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error al obtener los posts del usuario" });
  }
});

// [POST] Crear un nuevo post
app.post("/api/posts", authenticateToken, async (req, res) => {
  const { contenido } = req.body;
  const userId = req.userId;
  try {
    // Primero insertar un tipo de post por defecto si no existe
    await pool.query(
      "INSERT INTO TIPOPOST (NOMBRE_TIPO) VALUES ('General') ON CONFLICT (NOMBRE_TIPO) DO NOTHING"
    );

    // Obtener el TYPE_ID del tipo 'General'
    const tipoResult = await pool.query(
      "SELECT TYPE_ID FROM TIPOPOST WHERE NOMBRE_TIPO = 'General'"
    );
    const typeId = tipoResult.rows[0].type_id;

    // ACTUALIZADO: Usar nombres de tablas y columnas en MAYÚSCULAS
    const result = await pool.query(
      `INSERT INTO POST (CONTENIDO, USER_ID, TITULO, TYPE_ID)
       VALUES ($1, $2, 'Sin Título', $3)
       RETURNING *`,
      [contenido, userId, typeId]
    );

    const newPost = result.rows[0];

    // Para emitir por socket, necesitamos el nombre del autor
    const authorResult = await pool.query(
      "SELECT NOMBRE FROM USUARIO WHERE USER_ID = $1",
      [userId]
    );
    const autor_nombre = authorResult.rows[0].nombre;
    const postWithAuthor = { ...newPost, autor_nombre };

    // Emitir el nuevo post a todos los clientes conectados
    io.emit("new_post", postWithAuthor);

    res.status(201).json(postWithAuthor);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error al crear el post" });
  }
});

// [PUT] Actualizar un post
app.put("/api/posts/:postId", authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const { contenido } = req.body;
  const userId = req.userId;

  try {
    // Primero, verificamos que el post pertenece al usuario que intenta editarlo
    // ACTUALIZADO: Usar nombres de tablas y columnas en MAYÚSCULAS
    const postResult = await pool.query(
      "SELECT USER_ID FROM POST WHERE POST_ID = $1",
      [postId]
    );
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: "Post no encontrado" });
    }
    if (postResult.rows[0].user_id !== userId) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para editar este post" });
    }

    // Si todo es correcto, actualizamos
    // ACTUALIZADO: Usar nombres de columnas en MAYÚSCULAS
    const updateResult = await pool.query(
      `UPDATE POST SET CONTENIDO = $1, FECHA_ACTUALIZACION = CURRENT_TIMESTAMP
       WHERE POST_ID = $2 RETURNING *`,
      [contenido, postId]
    );

    const updatedPost = updateResult.rows[0];

    // Añadimos el nombre del autor para emitirlo
    const authorResult = await pool.query(
      "SELECT NOMBRE FROM USUARIO WHERE USER_ID = $1",
      [userId]
    );
    const autor_nombre = authorResult.rows[0].nombre;
    const postWithAuthor = { ...updatedPost, autor_nombre };

    // Emitir el post actualizado a todos los clientes
    io.emit("post_updated", postWithAuthor);

    res.json(postWithAuthor);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error al actualizar el post" });
  }
});

// [DELETE] Eliminar un post
app.delete("/api/posts/:postId", authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;

  try {
    // Verificamos que el post pertenece al usuario
    // ACTUALIZADO: Usar nombres de tablas y columnas en MAYÚSCULAS
    const postResult = await pool.query(
      "SELECT USER_ID FROM POST WHERE POST_ID = $1",
      [postId]
    );
    if (postResult.rows.length === 0) {
      return res.status(404).json({ error: "Post no encontrado" });
    }
    if (postResult.rows[0].user_id !== userId) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para eliminar este post" });
    }

    // Si todo es correcto, eliminamos
    // ACTUALIZADO: Usar nombres de tablas y columnas en MAYÚSCULAS
    await pool.query("DELETE FROM POST WHERE POST_ID = $1", [postId]);

    // Emitir el ID del post eliminado a todos los clientes
    io.emit("post_deleted", { postId: Number(postId) });

    res.json({ message: "Post eliminado exitosamente" });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Error al eliminar el post" });
  }
});

// --- 8. LÓGICA DE WEBSOCKETS ---
io.on("connection", (socket) => {
  console.log("Un cliente se ha conectado:", socket.id);

  socket.on("disconnect", () => {
    console.log("Un cliente se ha desconectado:", socket.id);
  });
});

// --- 9. INICIAR EL SERVIDOR ---
// Usamos server.listen en lugar de app.listen para que funcione con Socket.io
server.listen(PORT, () => {
  console.log(`Servidor escuchando en el puerto ${PORT}`);
});
