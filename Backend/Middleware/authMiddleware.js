// =============================================================================
// Middleware de Autenticación
// =============================================================================
// Descripción: Este middleware protege las rutas verificando la validez
// del Token JWT (JSON Web Token) proporcionado en la cabecera
// 'Authorization' de la petición. Si el token es válido, extrae el ID
// del usuario y lo añade al objeto `req` para su uso en los controladores.
// =============================================================================

// Backend/Middleware/authMiddleware.js
const jwt = require("jsonwebtoken");

exports.authenticateToken = (req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token requerido" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // guarda lo que necesites del token
    req.userId = decoded.user_id || decoded.id || decoded.idu;
    req.user = decoded; // opcional
    if (!req.userId) return res.status(401).json({ error: "Token inválido" });
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido" });
  }
};
