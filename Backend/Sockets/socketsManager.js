// =============================================================================
// Módulo de Gestión de WebSockets - CONFIGURADO PARA PRODUCCIÓN
// =============================================================================

const { Server } = require("socket.io");

function initializeSocketManager(httpServer, corsOptions) {
  const io = new Server(httpServer, {
    cors: corsOptions || {
      origin: "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"], // Importante para algunos hosting
    allowEIO3: true, // Compatibilidad
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Nuevo cliente conectado: ${socket.id}`);

    socket.on("disconnect", () => {
      console.log(`🔌 Cliente desconectado: ${socket.id}`);
    });

    // Podrías agregar aquí eventos específicos si fueran necesarios,
    // pero por ahora, la emisión se maneja en los controladores.
  });

  return io;
}

module.exports = initializeSocketManager;
