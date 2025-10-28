// =============================================================================
// Servidor Principal - CONFIGURADO PARA NEO4J Y PRODUCCIÓN
// =============================================================================

const http = require("http");
require("dotenv").config();

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

// CORS configurado para producción
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "https://post-place-backend-ayf9.onrender.com",
      "https://post-place-front.netlify.app",
    ];

    if (!origin) {
      return callback(null, true);
    }

    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    if (origin.includes("onrender.com") || origin.includes("netlify.app")) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    database: "Neo4j AuraDB",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/user", userRoutes);
app.use("/api/comments", commentRoutes);

// Middleware de manejo de errores
app.use((error, req, res, next) => {
  console.error("Error no manejado:", error);
  res.status(500).json({
    error: "Error interno del servidor",
    details:
      process.env.NODE_ENV === "development" ? error.message : "Error interno",
  });
});

// Crear servidor HTTP
const server = http.createServer(app);

// Inicializar Socket.IO
const io = initializeSocketManager(server, corsOptions);
app.set("io", io);

// Iniciar servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 ========================================");
  console.log(`🟢 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 Database: Neo4j AuraDB`);
  console.log("🚀 ========================================");
});

// Manejo de errores no capturados
process.on("unhandledRejection", (reason, promise) => {
  console.error("Rechazo no manejado en:", promise, "razón:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Excepción no capturada:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM recibido. Cerrando servidor...");
  await closeDriver();
  server.close(() => {
    console.log("Servidor cerrado.");
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("\nSIGINT recibido. Cerrando servidor...");
  await closeDriver();
  server.close(() => {
    console.log("Servidor cerrado.");
    process.exit(0);
  });
});
