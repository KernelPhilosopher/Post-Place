// =============================================================================
// Middleware de Autenticación
// =============================================================================
// Descripción: Este middleware protege las rutas verificando la validez
// del Token JWT (JSON Web Token) proporcionado en la cabecera
// 'Authorization' de la petición. Si el token es válido, extrae el ID
// del usuario y lo añade al objeto `req` para su uso en los controladores.
// =============================================================================

const jwt = require("jsonwebtoken");

/**
 * Verifica el token JWT de la petición.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
 * @param {function} next - La función para pasar al siguiente middleware.
 */
exports.authenticateToken = (req, res, next) => {
  // El token suele venir en el formato "Bearer <token>"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    // 401 Unauthorized: no se proporcionó autenticación.
    return res
      .status(401)
      .json({ error: "No autorizado: Token no proporcionado." });
  }

  // Verificamos el token usando el secreto guardado en las variables de entorno.
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      // 403 Forbidden: la autenticación falló (token inválido, expirado, etc.).
      return res.status(403).json({ error: "Prohibido: Token no válido." });
    }

    // Si el token es válido, el payload decodificado (que contiene el ID del usuario)
    // se adjunta a la petición.
    req.userId = user.id;

    // Pasamos el control al siguiente middleware o al controlador de la ruta.
    next();
  });
};
