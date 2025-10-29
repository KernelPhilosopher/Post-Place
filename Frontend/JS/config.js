// =============================================================================
// Configuración del Frontend - DINÁMICO PARA DESARROLLO Y PRODUCCIÓN
// =============================================================================

const CONFIG = {
  API_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000/api" // Desarrollo local
      : "https://post-place-backend-ayf9.onrender.com/api", // Producción

  SOCKET_URL:
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
      ? "http://localhost:3000" // Desarrollo local
      : "https://post-place-backend-ayf9.onrender.com", // Producción
};

// Hacer CONFIG global
window.APP_CONFIG = CONFIG;

// Debug: mostrar en consola qué configuración se está usando
console.log("🔧 Configuración activa:");
console.log("   - Hostname:", window.location.hostname);
console.log("   - API URL:", CONFIG.API_URL);
console.log("   - Socket URL:", CONFIG.SOCKET_URL);
