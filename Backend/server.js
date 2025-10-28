const http = require("http");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const authRoutes = require("./Routes/authRoutes");
const postRoutes = require("./Routes/postRoutes");
const userRoutes = require("./Routes/userRoutes");
const commentRoutes = require("./Routes/commentRoutes");
const initializeSocketManager = require("./Sockets/socketsManager");
const { closeDriver } = require("./Config/database");

const app = express();
const PORT = process.env.PORT || 3000;
//IMAGENES

const fs = require("fs");
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
app.use("/uploads", express.static(uploadsPath));



// Configurar CORS
app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir frontend
app.use(express.static(path.join(__dirname, "../Frontend")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend", "index.html"));
});


// Rutas API
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/user", userRoutes);
app.use("/api/comments", commentRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK" });
});

// Middleware de errores
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: "Error interno del servidor" });
});

const server = http.createServer(app);
const io = initializeSocketManager(server);

app.set("io", io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`🔑 JWT_SECRET cargado:`, !!process.env.JWT_SECRET);
});
