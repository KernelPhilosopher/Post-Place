// =============================================================================
// Módulo de Rutas de Posts - CORREGIDO
// =============================================================================

const express = require("express");
const postController = require("../Controllers/postController");
const { authenticateToken } = require("../Middleware/authMiddleware");
//direccion upload middleware
const { uploadImage } = require("../Middleware/uploadMiddleware");

const router = express.Router();

// Middleware de autenticación para todas las rutas
router.use(authenticateToken);

// Rutas de posts

router.post("/", uploadImage.single("image"), postController.createPost);

router.get("/", postController.getAllPosts);
router.get("/me", postController.getUserPosts);

router.put("/:id", postController.updatePost);
router.delete("/:id", postController.deletePost);

// Ruta de comentarios
router.post("/:postId/comments", postController.createComment);


module.exports = router;
