// =============================================================================
// Servidor Principal - CONFIGURADO PARA PRODUCCIÓN
// =============================================================================

const http = require("http");
require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./Routes/authRoutes");
const postRoutes = require("./Routes/postRoutes");
const initializeSocketManager = require("./Sockets/socketsManager");

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configurado para producción y desarrollo
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173", // Vite dev server
      "https://tu-frontend-app.netlify.app", // Reemplaza con tu dominio de Netlify
    ];

    // En desarrollo, permitir requests sin origin (Postman, etc.)
    if (!origin && process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta de health check para monitoreo
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Rutas principales
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);

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

// Inicializar Socket.IO con CORS configurado
const io = initializeSocketManager(server, corsOptions);
app.set("io", io);

// Iniciar servidor
server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 ========================================");
  console.log(`🟢 Servidor ejecutándose en puerto ${PORT}`);
  console.log(`🔗 Environment: ${process.env.NODE_ENV || "development"}`);
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
process.on("SIGTERM", () => {
  console.log("SIGTERM recibido. Cerrando servidor...");
  server.close(() => {
    console.log("Servidor cerrado.");
    process.exit(0);
  });
});
