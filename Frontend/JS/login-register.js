// Espera a que el DOM esté completamente cargado.
document.addEventListener("DOMContentLoaded", () => {
  // --- REFERENCIAS A ELEMENTOS DEL DOM ---
  const signUpButton = document.getElementById("signUp");
  const signInButton = document.getElementById("signIn");
  const container = document.getElementById("auth-container");
  const signUpForm = document.getElementById("sign-up-form");
  const signInForm = document.getElementById("sign-in-form");

  // URL base de la API
  const API_URL = window.APP_CONFIG.API_URL;

  // --- LÓGICA DE ANIMACIÓN DEL PANEL (sin cambios) ---
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

  // --- LÓGICA DE REGISTRO DE USUARIO ---
  if (signUpForm) {
    signUpForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = document.getElementById("signup-name").value;
      const email = document.getElementById("signup-email").value;
      const contraseña = document.getElementById("signup-password").value;

      try {
        // CORRECCIÓN: Se añadió '/auth' a la ruta para que coincida con el backend.
        const response = await fetch(`${API_URL}/auth/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ nombre, email, contraseña }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Error al registrarse.");
        }

        alert("¡Registro exitoso! Ahora puedes iniciar sesión.");
        signInButton.click();
        signUpForm.reset();
      } catch (error) {
        console.error("Error en el registro:", error);
        alert(error.message);
      }
    });
  }

  // --- LÓGICA DE INICIO DE SESIÓN ---
  if (signInForm) {
    signInForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const email = document.getElementById("signin-email").value;
      const contraseña = document.getElementById("signin-password").value;

      try {
        // CORRECCIÓN: Se añadió '/auth' a la ruta para que coincida con el backend.
        const response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, contraseña }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error al iniciar sesión.");
        }

        // --- MANEJO DE SESIÓN MEJORADO ---
        // Guardamos el token y los datos del usuario en localStorage.
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("loggedInUser", JSON.stringify(data.user));

        // Redirige al usuario al panel principal.
        window.location.href = "user-panel-global.html";
      } catch (error) {
        console.error("Error en el inicio de sesión:", error);
        alert(error.message);
      }
    });
  }
});
