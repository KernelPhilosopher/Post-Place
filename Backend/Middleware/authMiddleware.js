// =============================================================================
// Middleware de Autenticación - CORREGIDO
// =============================================================================

const jwt = require("jsonwebtoken");

exports.authenticateToken = (req, res, next) => {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return res
      .status(401)
      .json({ error: "Token requerido. Debes iniciar sesión." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ahora es consistente: siempre user_id
    req.userId = decoded.user_id;
    req.user = decoded;

    if (!req.userId) {
      return res.status(401).json({ error: "Token inválido: falta user_id." });
    }

    next();
  } catch (error) {
    console.error("Error verificando token:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        error: "Token expirado. Por favor, inicia sesión nuevamente.",
      });
    }

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Token inválido o malformado." });
    }

    return res.status(401).json({ error: "Error de autenticación." });
  }
};
