// =============================================================================
// Configuración del Frontend - DINÁMICO PARA DESARROLLO Y PRODUCCIÓN
// =============================================================================

const CONFIG = {
  API_URL:
    window.location.hostname === "localhost"
      ? "http://localhost:3000/api" // Nota el /api al final
      : "https://post-place-backend-ayf9.onrender.com/api", // Y aquí también

  SOCKET_URL:
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://post-place-backend-ayf9.onrender.com",
};

// Hacer CONFIG global
window.APP_CONFIG = CONFIG;
