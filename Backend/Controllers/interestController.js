// =============================================================================
// Controlador de Intereses - GESTIÓN Y RECOMENDACIONES
// =============================================================================

const interestModel = require("../Models/interestModel");

/**
 * Obtiene todos los intereses disponibles
 */
exports.getAllInterests = async (req, res) => {
  try {
    const interests = await interestModel.getAllInterests();
    res.json(interests);
  } catch (error) {
    console.error("Error en getAllInterests:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene los intereses del usuario autenticado
 */
exports.getUserInterests = async (req, res) => {
  const userId = req.userId;

  try {
    const interests = await interestModel.getUserInterests(userId);
    res.json(interests);
  } catch (error) {
    console.error("Error en getUserInterests:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Añade un interés al usuario
 */
exports.addInterest = async (req, res) => {
  const userId = req.userId;
  const { interestName } = req.body;

  if (!interestName?.trim()) {
    return res
      .status(400)
      .json({ error: "El nombre del interés es requerido" });
  }

  try {
    const interest = await interestModel.addInterest(
      userId,
      interestName.trim()
    );

    res.status(201).json({
      message: "Interés añadido exitosamente",
      interest: interest,
    });
  } catch (error) {
    console.error("Error en addInterest:", error);

    if (
      error.message.includes("no existe") ||
      error.message.includes("Ya tienes")
    ) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Elimina un interés del usuario
 */
exports.removeInterest = async (req, res) => {
  const userId = req.userId;
  const { interestName } = req.params;

  try {
    const removed = await interestModel.removeInterest(userId, interestName);

    if (!removed) {
      return res.status(404).json({ error: "Interés no encontrado" });
    }

    res.json({ message: "Interés eliminado exitosamente" });
  } catch (error) {
    console.error("Error en removeInterest:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene recomendaciones de amigos basadas en intereses comunes
 */
exports.getRecommendations = async (req, res) => {
  const userId = req.userId;

  try {
    const recommendations = await interestModel.getRecommendations(userId);
    res.json(recommendations);
  } catch (error) {
    console.error("Error en getRecommendations:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * Obtiene estadísticas de intereses del usuario
 */
exports.getInterestStats = async (req, res) => {
  const userId = req.userId;

  try {
    const stats = await interestModel.getInterestStats(userId);
    res.json(stats);
  } catch (error) {
    console.error("Error en getInterestStats:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
};
