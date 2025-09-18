// Espera a que todo el contenido del DOM (la estructura HTML) esté completamente cargado y parseado
// antes de ejecutar el código JavaScript. Esto previene errores si el script se carga antes que los elementos HTML.
document.addEventListener("DOMContentLoaded", () => {
  // Obtiene referencias a los elementos HTML clave por su ID.
  const signUpButton = document.getElementById("signUp"); // Botón para ir al panel de registro
  const signInButton = document.getElementById("signIn"); // Botón para ir al panel de inicio de sesión
  const container = document.getElementById("auth-container"); // Contenedor principal que se animará

  // Verifica que todos los elementos necesarios existan en el DOM para evitar errores.
  if (signUpButton && signInButton && container) {
    // Añade un 'escuchador de eventos' al botón de registro.
    // Cuando se hace clic en él, se ejecuta la función de flecha.
    signUpButton.addEventListener("click", () => {
      // Añade la clase 'auth-container--right-panel-active' al contenedor principal.
      // Esta clase activa las transiciones y animaciones CSS que muestran el panel de registro
      // y ocultan el de inicio de sesión.
      container.classList.add("auth-container--right-panel-active");
    });

    // Añade un 'escuchador de eventos' al botón de inicio de sesión.
    signInButton.addEventListener("click", () => {
      // Elimina la clase 'auth-container--right-panel-active' del contenedor principal.
      // Esto revierte las animaciones CSS, mostrando el panel de inicio de sesión
      // y ocultando el de registro.
      container.classList.remove("auth-container--right-panel-active");
    });
  } else {
    // Si alguno de los elementos no se encuentra, muestra un error en la consola del navegador.
    // Esto es útil para la depuración.
    console.error("Auth container or buttons not found!");
  }
});
