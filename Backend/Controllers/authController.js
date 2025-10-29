// =============================================================================
// Controlador de Autenticación - CORREGIDO
// =============================================================================

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../Models/userModel");

/**
 * Maneja el registro de un nuevo usuario.
 */
exports.registerUser = async (req, res) => {
  const { nombre, email, contraseña } = req.body;

  // --- Validación de Entrada ---
  if (!nombre || !email || !contraseña || contraseña.length < 6) {
    return res.status(400).json({
      error:
        "Todos los campos son obligatorios y la contraseña debe tener al menos 6 caracteres.",
    });
  }

  try {
    // 1. Verificar si el email ya existe
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "El email ya está registrado." });
    }

    // 2. Hashear la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contraseña, salt);

    // 3. Crear el nuevo usuario
    const newUser = await userModel.create(nombre, email, hashedPassword);

    if (!newUser) {
      return res.status(500).json({ error: "No se pudo crear el usuario." });
    }

    // 4. Enviar respuesta exitosa
    res.status(201).json({
      message: "Usuario creado exitosamente.",
      user: newUser,
    });
  } catch (error) {
    console.error("Error en registerUser:", error);
    res.status(500).json({
      error: "Error interno del servidor.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Maneja el inicio de sesión de un usuario.
 */
exports.loginUser = async (req, res) => {
  const { email, contraseña } = req.body;

  // --- Validación de Entrada ---
  if (!email || !contraseña) {
    return res
      .status(400)
      .json({ error: "El email y la contraseña son obligatorios." });
  }

  try {
    // 1. Buscar al usuario por email
    const user = await userModel.findByEmailWithPassword(email);
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    // 2. Comparar la contraseña
    const isMatch = await bcrypt.compare(contraseña, user.contraseña);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    // 3. Crear el payload y firmar el Token JWT (CONSISTENTE: user_id)
    const payload = {
      user_id: user.user_id,
      email: user.email,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d", // 7 días de duración
    });

    // 4. Enviar respuesta con el token
    res.json({
      message: "Inicio de sesión exitoso.",
      token,
      user: {
        user_id: user.user_id,
        nombre: user.nombre,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error en loginUser:", error);
    res.status(500).json({
      error: "Error interno del servidor.",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
