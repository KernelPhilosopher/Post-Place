// =============================================================================
// Rutas de Intereses - SISTEMA DE RECOMENDACIONES
// =============================================================================

const express = require("express");
const interestController = require("../Controllers/interestController");
const { authenticateToken } = require("../Middleware/authMiddleware");

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

/**
 * @route   GET /api/interests/all
 * @desc    Obtiene todos los intereses disponibles
 * @access  Private
 */
router.get("/all", interestController.getAllInterests);

/**
 * @route   GET /api/interests/my
 * @desc    Obtiene los intereses del usuario autenticado
 * @access  Private
 */
router.get("/my", interestController.getUserInterests);

/**
 * @route   POST /api/interests
 * @desc    Añade un interés al usuario
 * @access  Private
 * @body    { interestName: string }
 */
router.post("/", interestController.addInterest);

/**
 * @route   DELETE /api/interests/:interestName
 * @desc    Elimina un interés del usuario
 * @access  Private
 */
router.delete("/:interestName", interestController.removeInterest);

/**
 * @route   GET /api/interests/recommendations
 * @desc    Obtiene recomendaciones de amigos basadas en intereses comunes
 * @access  Private
 */
router.get("/recommendations", interestController.getRecommendations);

/**
 * @route   GET /api/interests/stats
 * @desc    Obtiene estadísticas de intereses del usuario
 * @access  Private
 */
router.get("/stats", interestController.getInterestStats);

module.exports = router;
