// =============================================================================
// Controlador de Autenticación
// =============================================================================
// Descripción: Contiene la lógica de negocio para el registro e inicio de
// sesión. Este controlador interactúa con el modelo de usuario para validar
// y crear usuarios, y genera tokens JWT para la autenticación.
// Separa la lógica de la definición de rutas (SOLID: SRP).
// =============================================================================

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../Models/userModel");

/**
 * Maneja el registro de un nuevo usuario.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
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
    // 1. Verificar si el email ya existe utilizando el modelo.
    const existingUser = await userModel.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: "El email ya está registrado." }); // 409 Conflict
    }

    // 2. Hashear la contraseña.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(contraseña, salt);

    // 3. Crear el nuevo usuario en la base de datos a través del modelo.
    const newUser = await userModel.create(nombre, email, hashedPassword);

    // 4. Enviar respuesta exitosa.
    res.status(201).json({
      message: "Usuario creado exitosamente.",
      user: newUser,
    });
  } catch (error) {
    console.error("Error en registerUser:", error);
    res.status(500).json({ error: "Error interno del servidor." });
  }
};

/**
 * Maneja el inicio de sesión de un usuario.
 * @param {object} req - El objeto de la petición de Express.
 * @param {object} res - El objeto de la respuesta de Express.
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
    // 1. Buscar al usuario por email usando el modelo.
    const user = await userModel.findByEmailWithPassword(email);
    if (!user) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    // 2. Comparar la contraseña proporcionada con la hasheada.
    const isMatch = await bcrypt.compare(contraseña, user.contraseña);
    if (!isMatch) {
      return res.status(401).json({ error: "Credenciales inválidas." });
    }

    // 3. Crear el payload y firmar el Token JWT.
    const payload = { id: user.user_id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d", // El token expira en 1 día.
    });

    // 4. Enviar respuesta con el token y los datos del usuario (sin la contraseña).
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
    res.status(500).json({ error: "Error interno del servidor." });
  }
};
