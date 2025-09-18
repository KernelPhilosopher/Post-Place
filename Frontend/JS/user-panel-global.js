// Espera a que el DOM esté completamente cargado para ejecutar el script.
document.addEventListener("DOMContentLoaded", () => {
  // Objeto que simula los datos del usuario que ha iniciado sesión.
  const LOGGED_IN_USER = { name: "John Doe", avatar: "JD" };

  // --- REFERENCIAS A ELEMENTOS DEL DOM ---
  // Se guardan en constantes para un acceso más rápido y eficiente.
  // Formulario para crear posts
  const postForm = document.getElementById("post-form");
  const postTextarea = document.getElementById("post-textarea");
  const postSubmitBtn = document.getElementById("post-submit-btn");

  // Selectores de vista (Mis Posts / Chat Global)
  const viewMyPostsRadio = document.getElementById("view-my-posts");
  const viewGlobalChatRadio = document.getElementById("view-global-chat");
  const myPostsView = document.getElementById("my-posts-view");
  const globalChatView = document.getElementById("global-chat-view");
  const myPostsList = document.getElementById("my-posts-list");
  const globalChatList = document.getElementById("global-chat-list");
  const noPostsMessage = document.getElementById("no-posts-message");
  const noGlobalPostsMessage = document.getElementById(
    "no-global-posts-message"
  );

  // Elementos del Modal de Edición
  const editModal = document.getElementById("edit-modal");
  const editTextarea = document.getElementById("edit-textarea");
  const saveEditBtn = document.getElementById("save-edit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  // Elementos del Modal de Respuesta
  const replyModal = document.getElementById("reply-modal");
  const replyQuoteContent = document.getElementById("reply-quote-content");
  const replyTextarea = document.getElementById("reply-textarea");
  const saveReplyBtn = document.getElementById("save-reply-btn");
  const cancelReplyBtn = document.getElementById("cancel-reply-btn");

  // Variables para almacenar el estado actual al editar o responder.
  let postToEditId = null;
  let postToReplyTo = null;

  // --- LÓGICA DE DATOS (usando localStorage) ---
  // localStorage permite guardar datos de forma persistente en el navegador.
  const getMyPosts = () => JSON.parse(localStorage.getItem("myPosts")) || [];
  const saveMyPosts = (posts) =>
    localStorage.setItem("myPosts", JSON.stringify(posts));
  const getGlobalPosts = () =>
    JSON.parse(localStorage.getItem("globalPosts")) || [];
  const saveGlobalPosts = (posts) =>
    localStorage.setItem("globalPosts", JSON.stringify(posts));

  // --- INICIALIZACIÓN DE DATOS DE PRUEBA (DUMMY DATA) ---
  const initializeDummyData = () => {
    // Si no hay posts globales guardados, crea algunos para demostración.
    if (!localStorage.getItem("globalPosts")) {
      const dummyPosts = [
        {
          id: Date.now() - 200000,
          user: { name: "Jane Smith", avatar: "JS" },
          text: "¡Hola a todos! ¿Qué tal el día? Espero que bien.",
          replyingTo: null,
        },
        {
          id: Date.now() - 100000,
          user: { name: "Alex Ray", avatar: "AR" },
          text: "Buscando recomendaciones de libros de ciencia ficción. ¿Alguna sugerencia?",
          replyingTo: null,
        },
      ];
      saveGlobalPosts(dummyPosts);
    }
  };

  // --- LÓGICA DE RENDERIZADO ---
  /**
   * Crea el código HTML para una tarjeta de post.
   * @param {object} post - El objeto del post a renderizar.
   * @param {string} context - El contexto donde se mostrará ('my-posts' o 'global-chat').
   * @returns {string} - La cadena de texto HTML de la tarjeta.
   */
  const createPostCardHTML = (post, context) => {
    const isMyPost = post.user.name === LOGGED_IN_USER.name;
    const authorTag = isMyPost
      ? `<span class="post-author-you">(Tú)</span>`
      : "";

    // Muestra los botones de editar y eliminar solo en 'Mis Publicaciones' y si el post es del usuario.
    let actionsHTML = "";
    if (context === "my-posts" && isMyPost) {
      actionsHTML = `
        <button class="action-btn edit-btn" data-id="${post.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="action-btn delete-btn" data-id="${post.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
        </button>`;
    }

    // Muestra el botón de responder solo en el 'Chat Global' y si el post no es del usuario.
    const replyHTML =
      context === "global-chat" && !isMyPost
        ? `<button class="reply-btn" data-id="${post.id}">Responder</button>`
        : "";

    // Si el post es una respuesta, muestra el contenido citado.
    let quotedReplyHTML = "";
    if (post.replyingTo) {
      quotedReplyHTML = `
        <div class="quoted-reply">
            <div class="post-meta">Respondiendo a <strong>${post.replyingTo.user.name}</strong>:</div>
            <p>${post.replyingTo.text}</p>
        </div>`;
    }

    // Estructura principal de la tarjeta.
    return `
      <div class="post-card" data-post-id="${post.id}">
          <div class="post-header">
              <div class="post-avatar" style="background-color: #${getHexColor(
                post.user.name
              )}">${post.user.avatar}</div>
              <span class="post-author">${post.user.name} ${authorTag}</span>
          </div>
          <div class="post-content">
              <p>${post.text.replace(/\n/g, "<br>")}</p>
          </div>
          ${quotedReplyHTML}
          <div class="post-footer">
              <span class="post-meta">${new Date(
                post.id
              ).toLocaleString()}</span>
              <div class="post-actions">
                  ${replyHTML}
                  ${actionsHTML}
              </div>
          </div>
      </div>`;
  };

  /**
   * Renderiza (dibuja) la lista de 'Mis Publicaciones' en el DOM.
   */
  const renderMyPosts = () => {
    const myPosts = getMyPosts().sort((a, b) => b.id - a.id); // Ordena de más reciente a más antiguo
    myPostsList.innerHTML = ""; // Limpia la lista actual
    noPostsMessage.style.display = myPosts.length === 0 ? "block" : "none";
    myPosts.forEach(
      (post) => (myPostsList.innerHTML += createPostCardHTML(post, "my-posts"))
    );
  };

  /**
   * Renderiza la lista del 'Chat Global' en el DOM.
   */
  const renderGlobalChat = () => {
    const globalPosts = getGlobalPosts().sort((a, b) => b.id - a.id);
    globalChatList.innerHTML = "";
    noGlobalPostsMessage.style.display =
      globalPosts.length === 0 ? "block" : "none";
    globalPosts.forEach((post) => {
      // Esta lógica anida las respuestas visualmente, pero es una simplificación.
      // Una implementación más robusta podría requerir una estructura de datos de árbol.
      if (post.replyingTo) {
        // Por simplicidad, aquí se muestran todas las respuestas como posts de nivel superior con una cita.
        globalChatList.innerHTML += createPostCardHTML(post, "my-posts"); // Reutiliza el contexto para mostrar la cita.
      } else {
        globalChatList.innerHTML += createPostCardHTML(post, "global-chat");
      }
    });
  };

  // --- MANEJADORES DE EVENTOS ---
  // Cambia la vista cuando se selecciona una de las opciones de radio.
  viewMyPostsRadio.addEventListener("change", () => switchView("my-posts"));
  viewGlobalChatRadio.addEventListener("change", () =>
    switchView("global-chat")
  );

  // Maneja el envío del formulario para crear un nuevo post.
  postForm.addEventListener("submit", (e) => {
    e.preventDefault(); // Evita que la página se recargue
    const text = postTextarea.value.trim();
    if (!text) return; // No hace nada si el texto está vacío.

    const newPost = {
      id: Date.now(), // Usa el timestamp como ID único.
      user: LOGGED_IN_USER,
      text: text,
      replyingTo: null,
    };

    // Guarda el nuevo post en ambas listas (local y global)
    const myPosts = getMyPosts();
    myPosts.push(newPost);
    saveMyPosts(myPosts);

    const globalPosts = getGlobalPosts();
    globalPosts.push(newPost);
    saveGlobalPosts(globalPosts);

    // Vuelve a renderizar las listas y limpia el textarea.
    renderMyPosts();
    renderGlobalChat();
    postTextarea.value = "";
  });

  // Delegación de eventos para manejar clics en los botones de las tarjetas.
  const handleListClick = (e) => {
    const target = e.target;
    // Encuentra la tarjeta de post más cercana al elemento clickeado.
    const postCard = target.closest("[data-post-id]");
    if (!postCard) return;

    const postId = Number(postCard.dataset.postId);

    if (target.closest(".edit-btn")) {
      openEditModal(postId);
    } else if (target.closest(".delete-btn")) {
      deletePost(postId);
    } else if (target.closest(".reply-btn")) {
      openReplyModal(postId);
    }
  };

  myPostsList.addEventListener("click", handleListClick);
  globalChatList.addEventListener("click", handleListClick);

  // --- LÓGICA DEL MODAL (EDITAR) ---
  const openEditModal = (postId) => {
    const post = getMyPosts().find((p) => p.id === postId);
    if (post) {
      postToEditId = postId;
      editTextarea.value = post.text;
      editModal.classList.add("visible");
    }
  };
  const closeEditModal = () => editModal.classList.remove("visible");

  saveEditBtn.addEventListener("click", () => {
    const newText = editTextarea.value.trim();
    if (!newText || !postToEditId) return;

    // Actualiza el post en ambas listas (mis posts y global).
    let myPosts = getMyPosts();
    let globalPosts = getGlobalPosts();
    const myPostIndex = myPosts.findIndex((p) => p.id === postToEditId);
    const globalPostIndex = globalPosts.findIndex((p) => p.id === postToEditId);

    if (myPostIndex > -1) myPosts[myPostIndex].text = newText;
    if (globalPostIndex > -1) globalPosts[globalPostIndex].text = newText;

    saveMyPosts(myPosts);
    saveGlobalPosts(globalPosts);

    renderMyPosts();
    renderGlobalChat();
    closeEditModal();
  });
  cancelEditBtn.addEventListener("click", closeEditModal);

  // --- LÓGICA DEL MODAL (RESPONDER) ---
  const openReplyModal = (postId) => {
    const post = getGlobalPosts().find((p) => p.id === postId);
    if (post) {
      postToReplyTo = post;
      // Muestra el post original en el modal de respuesta.
      replyQuoteContent.innerHTML = `
        <div class="quoted-reply">
            <div class="post-meta">Respondiendo a <strong>${post.user.name}</strong>:</div>
            <p>${post.text}</p>
        </div>`;
      replyTextarea.value = "";
      replyModal.classList.add("visible");
    }
  };
  const closeReplyModal = () => replyModal.classList.remove("visible");

  saveReplyBtn.addEventListener("click", () => {
    const text = replyTextarea.value.trim();
    if (!text || !postToReplyTo) return;

    const newReply = {
      id: Date.now(),
      user: LOGGED_IN_USER,
      text: text,
      replyingTo: postToReplyTo, // Guarda la referencia al post original.
    };

    // Guarda la respuesta en ambas listas.
    const myPosts = getMyPosts();
    myPosts.push(newReply);
    saveMyPosts(myPosts);

    const globalPosts = getGlobalPosts();
    globalPosts.push(newReply);
    saveGlobalPosts(globalPosts);

    renderMyPosts();
    renderGlobalChat();
    closeReplyModal();
  });
  cancelReplyBtn.addEventListener("click", closeReplyModal);

  // --- FUNCIONES GENÉRICAS ---
  /**
   * Cambia entre la vista 'Mis Publicaciones' y 'Chat Global'.
   * @param {string} viewName - El nombre de la vista a activar.
   */
  const switchView = (viewName) => {
    if (viewName === "my-posts") {
      myPostsView.classList.add("active");
      globalChatView.classList.remove("active");
      postTextarea.placeholder = `¿Qué estás pensando, ${LOGGED_IN_USER.name}?`;
      postSubmitBtn.textContent = "Publicar";
    } else {
      myPostsView.classList.remove("active");
      globalChatView.classList.add("active");
      postTextarea.placeholder = "Escribe un mensaje en el chat global...";
      postSubmitBtn.textContent = "Enviar al Chat Global";
    }
  };

  /**
   * Elimina un post de las listas.
   * @param {number} postId - El ID del post a eliminar.
   */
  const deletePost = (postId) => {
    // Pide confirmación al usuario antes de borrar.
    if (!confirm("¿Estás seguro de que quieres eliminar esta publicación?"))
      return;

    // Filtra el array para eliminar el post con el ID correspondiente.
    let myPosts = getMyPosts().filter((p) => p.id !== postId);
    saveMyPosts(myPosts);

    let globalPosts = getGlobalPosts().filter((p) => p.id !== postId);
    saveGlobalPosts(globalPosts);

    renderMyPosts();
    renderGlobalChat();
  };

  /**
   * Genera un color hexadecimal a partir de una cadena de texto (ej. un nombre).
   * @param {string} str - La cadena de texto de entrada.
   * @returns {string} - Un color en formato hexadecimal.
   */
  const getHexColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "";
    for (let i = 0; i < 3; i++) {
      let value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).substr(-2);
    }
    return color;
  };

  // --- INICIALIZACIÓN ---
  // Se ejecuta cuando el script se carga por primera vez.
  initializeDummyData();
  switchView("my-posts"); // Establece la vista inicial.
  renderMyPosts(); // Dibuja los posts iniciales.
  renderGlobalChat();
});
