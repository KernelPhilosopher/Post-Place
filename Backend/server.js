const http = require("http");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

const authRoutes = require("./Routes/authRoutes");
const postRoutes = require("./Routes/postRoutes");
const userRoutes = require("./Routes/userRoutes");
const commentRoutes = require("./Routes/commentRoutes");
const friendshipRoutes = require("./Routes/friendshipRoutes"); // NUEVO
const initializeSocketManager = require("./Sockets/socketsManager");
const { closeDriver } = require("./Config/database");

const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// CONFIGURACIÓN DE CORS MEJORADA
// =============================================================================
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://post-place-backend-ayf9.onrender.com",
      "https://post-place-front.netlify.app",
      process.env.FRONTEND_URL_PROD,
    ].filter(Boolean);

    if (
      allowedOrigins.includes(origin) ||
      origin.startsWith("http://localhost")
    ) {
      callback(null, true);
    } else {
      console.warn(`⚠️ Origen bloqueado por CORS: ${origin}`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

// =============================================================================
// MIDDLEWARE DE BODY PARSING
// =============================================================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// =============================================================================
// CONFIGURACIÓN DE UPLOADS
// =============================================================================
const fs = require("fs");
const uploadsPath = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
  console.log("📁 Carpeta 'uploads' creada");
}
app.use("/uploads", express.static(uploadsPath));

// =============================================================================
// SERVIR FRONTEND ESTÁTICO
// =============================================================================
app.use(express.static(path.join(__dirname, "../Frontend")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../Frontend", "index.html"));
});

// =============================================================================
// RUTAS DE LA API
// =============================================================================
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/user", userRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/friends", friendshipRoutes); // NUEVO: Rutas de amistad

// =============================================================================
// HEALTH CHECK
// =============================================================================
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "API funcionando correctamente",
  });
});

// =============================================================================
// MIDDLEWARE DE MANEJO DE ERRORES
// =============================================================================
app.use((error, req, res, next) => {
  console.error("❌ Error capturado:", error);
  res.status(error.status || 500).json({
    error: error.message || "Error interno del servidor",
    ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
  });
});

// Ruta no encontrada
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// =============================================================================
// INICIALIZACIÓN DEL SERVIDOR CON SOCKET.IO
// =============================================================================
const server = http.createServer(app);
const io = initializeSocketManager(server, corsOptions);

app.set("io", io);

// =============================================================================
// INICIO DEL SERVIDOR
// =============================================================================
server.listen(PORT, "0.0.0.0", () => {
  console.log("=".repeat(60));
  console.log("✅ Servidor Post-Place iniciado correctamente");
  console.log("=".repeat(60));
  console.log(`🌐 URL Local:     http://localhost:${PORT}`);
  console.log(`🌐 URL Red:       http://0.0.0.0:${PORT}`);
  console.log(
    `🔐 JWT Secret:    ${
      process.env.JWT_SECRET ? "✅ Configurado" : "❌ NO CONFIGURADO"
    }`
  );
  console.log(
    `🗄️  Neo4j:        ${
      process.env.NEO4J_URI ? "✅ Configurado" : "❌ NO CONFIGURADO"
    }`
  );
  console.log(`🌍 Entorno:       ${process.env.NODE_ENV || "development"}`);
  console.log(`👥 Sistema de Amistad: ✅ Habilitado`);
  console.log("=".repeat(60));
});

// =============================================================================
// MANEJO DE CIERRE GRACEFUL
// =============================================================================
const gracefulShutdown = async () => {
  console.log("\n🛑 Cerrando servidor...");

  server.close(async () => {
    console.log("🔌 Servidor HTTP cerrado");
    await closeDriver();
    console.log("✅ Cierre completo");
    process.exit(0);
  });

  setTimeout(() => {
    console.error("⚠️ Forzando cierre del servidor");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  gracefulShutdown();
});
