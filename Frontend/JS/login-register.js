// =============================================================================
// Frontend - Login y Registro - CORREGIDO CON MEJOR MANEJO DE ERRORES
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // --- REFERENCIAS A ELEMENTOS DEL DOM ---
  const signUpButton = document.getElementById("signUp");
  const signInButton = document.getElementById("signIn");
  const container = document.getElementById("auth-container");
  const signUpForm = document.getElementById("sign-up-form");
  const signInForm = document.getElementById("sign-in-form");

  // URL base de la API
  const API_URL = window.APP_CONFIG.API_URL;

  console.log("🔧 Config cargada - API URL:", API_URL);

  // --- LÓGICA DE ANIMACIÓN DEL PANEL ---
  if (signUpButton && signInButton && container) {
    signUpButton.addEventListener("click", () => {
      container.classList.add("auth-container--right-panel-active");
    });
    signInButton.addEventListener("click", () => {
      container.classList.remove("auth-container--right-panel-active");
    });
  } else {
    console.error("Auth container or buttons not found!");
  }

  // --- FUNCIÓN AUXILIAR PARA MANEJAR ERRORES DE FETCH ---
  const handleFetchError = (error) => {
    console.error("❌ Error de red:", error);

    if (error.message === "Failed to fetch") {
      return (
        "No se puede conectar con el servidor. Verifica que el backend esté ejecutándose en " +
        API_URL
      );
    }

    if (error.message.includes("NetworkError")) {
      return "Error de red. Verifica tu conexión a internet.";
    }

    return error.message || "Error desconocido.";
  };

  // --- LÓGICA DE REGISTRO DE USUARIO ---
  if (signUpForm) {
    signUpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = document.getElementById("signup-name").value.trim();
      const email = document.getElementById("signup-email").value.trim();
      const contraseña = document.getElementById("signup-password").value;

      // Validación básica en frontend
      if (!nombre || nombre.length < 2) {
        alert("El nombre debe tener al menos 2 caracteres.");
        return;
      }

      if (!email || !email.includes("@")) {
        alert("Por favor ingresa un email válido.");
        return;
      }

      if (!contraseña || contraseña.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
      }

      try {
        console.log("📤 Enviando registro a:", `${API_URL}/auth/register`);

        const response = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ nombre, email, contraseña }),
        });

        console.log("📥 Respuesta recibida:", response.status);

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Error al registrarse.");
        }

        console.log("✅ Registro exitoso:", result);
        alert("¡Registro exitoso! Ahora puedes iniciar sesión.");
        signInButton.click();
        signUpForm.reset();
      } catch (error) {
        const errorMessage = handleFetchError(error);
        console.error("Error en el registro:", error);
        alert("Error en el registro: " + errorMessage);
      }
    });
  }

  // --- LÓGICA DE INICIO DE SESIÓN ---
  if (signInForm) {
    signInForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("signin-email").value.trim();
      const contraseña = document.getElementById("signin-password").value;

      if (!email || !contraseña) {
        alert("Por favor completa todos los campos.");
        return;
      }

      try {
        console.log("📤 Enviando login a:", `${API_URL}/auth/login`);

        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, contraseña }),
        });

        console.log("📥 Respuesta recibida:", response.status);

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error al iniciar sesión.");
        }

        console.log("✅ Login exitoso:", data);

        // Guardar token y datos del usuario
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("loggedInUser", JSON.stringify(data.user));

        console.log("💾 Token guardado:", data.token.substring(0, 20) + "...");
        console.log("👤 Usuario guardado:", data.user);

        // Pequeño delay para asegurar que se guardó
        setTimeout(() => {
          window.location.href = "user-panel-global.html";
        }, 100);
      } catch (error) {
        const errorMessage = handleFetchError(error);
        console.error("Error en el inicio de sesión:", error);
        alert("Error al iniciar sesión: " + errorMessage);
      }
    });
  }

  // --- VERIFICAR SESIÓN EXISTENTE ---
  const checkExistingSession = () => {
    const token = localStorage.getItem("authToken");
    const user = localStorage.getItem("loggedInUser");

    if (token && user) {
      console.log("ℹ️ Ya existe una sesión activa");
      // Opcional: redirigir automáticamente
      // window.location.href = "user-panel-global.html";
    }
  };

  checkExistingSession();
});
