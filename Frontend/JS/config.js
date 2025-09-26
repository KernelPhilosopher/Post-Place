// =============================================================================
// Configuración del Frontend - DINÁMICO PARA DESARROLLO Y PRODUCCIÓN
// =============================================================================

const CONFIG = {
  API_URL:
    window.location.hostname === "localhost"
      ? "http://localhost:3000/api"
      : "https://post-place-backend-ayf9.onrender.com", // Reemplaza con tu URL de Render

  SOCKET_URL:
    window.location.hostname === "localhost"
      ? "http://localhost:3000"
      : "https://post-place-backend-ayf9.onrender.com", // Reemplaza con tu URL de Render
};

// Hacer CONFIG global
window.APP_CONFIG = CONFIG;
