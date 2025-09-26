document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURACIÓN Y AUTENTICACIÓN ---
  const API_URL = window.APP_CONFIG.API_URL;
  const SOCKET_URL = window.APP_CONFIG.SOCKET_URL;
  const socket = io(SOCKET_URL);

  const LOGGED_IN_USER = JSON.parse(localStorage.getItem("loggedInUser"));
  const AUTH_TOKEN = localStorage.getItem("authToken");

  if (!LOGGED_IN_USER || !AUTH_TOKEN) {
    window.location.href = "login-register.html";
    return;
  }

  // --- REFERENCIAS AL DOM ---
  const userNameDisplay = document.querySelector(".user-name");
  const userAvatarDisplay = document.querySelector(".user-avatar");

  // Formularios
  const postForm = document.getElementById("post-form");
  const postTitleInput = document.getElementById("post-title");
  const postTextarea = document.getElementById("post-textarea");

  // Listas de Posts
  const myPostsList = document.getElementById("my-posts-list");
  const commentedPostsList = document.getElementById("commented-posts-list");
  const globalChatList = document.getElementById("global-chat-list");
  const searchResultsList = document.getElementById("search-results-list");

  // Controles de Vista
  const viewRadios = document.querySelectorAll('input[name="view"]');
  const searchResultsLabel = document.querySelector(
    'label[for="view-search-results"]'
  );

  // Búsqueda
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const searchResultsTitle = document.getElementById("search-results-title");

  // Modales
  const editModal = document.getElementById("edit-modal");
  const editTextarea = document.getElementById("edit-textarea");
  const saveEditBtn = document.getElementById("save-edit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");

  const configModal = document.getElementById("config-modal");
  const configBtn = document.querySelector(".config-btn");
  const configForm = document.getElementById("config-form");
  const cancelConfigBtn = document.getElementById("cancel-config-btn");
  const deleteAccountBtn = document.getElementById("delete-account-btn");
  const logoutBtn = document.querySelector(".logout-btn");

  let postToEditId = null;
  let currentView = "view-my-posts"; // Vista por defecto

  // --- INICIALIZACIÓN ---
  const initializeDashboard = () => {
    userNameDisplay.textContent = LOGGED_IN_USER.nombre;
    userAvatarDisplay.textContent = LOGGED_IN_USER.nombre
      .substring(0, 1)
      .toUpperCase();
    loadPostsForCurrentView();
  };

  // --- FUNCIONES AUXILIARES ---
  const getHexColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = (hash & 0x00ffffff).toString(16).toUpperCase();
    return "00000".substring(0, 6 - color.length) + color;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("loggedInUser");
    window.location.href = "login-register.html";
  };

  const fetchWithAuth = async (url, options = {}) => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTH_TOKEN}`,
      ...options.headers,
    };
    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error(
          "Sesión expirada o inválida. Por favor, inicie sesión de nuevo."
        );
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || `Error HTTP: ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error("Error en fetchWithAuth:", error);
      throw error;
    }
  };

  // --- LÓGICA DE RENDERIZADO ---
  const createCommentHTML = (comment) => {
    const isMyComment = comment.user_id === LOGGED_IN_USER.user_id;
    const authorName = comment.autor_nombre || "Desconocido";
    const authorTag = isMyComment
      ? `<span class="comment-author-you">(Tú)</span>`
      : "";
    return `
      <div class="comment-card" data-comment-id="${comment.comment_id}">
        <div class="comment-avatar" style="background-color: #${getHexColor(
          authorName
        )}">${authorName.substring(0, 1).toUpperCase()}</div>
        <div class="comment-body">
          <span class="comment-author">${authorName} ${authorTag}</span>
          <p class="comment-content">${comment.contenido.replace(
            /\n/g,
            "<br>"
          )}</p>
        </div>
      </div>
    `;
  };

  const createPostCardHTML = (post) => {
    const isMyPost = post.user_id === LOGGED_IN_USER.user_id;
    const authorName = post.autor_nombre || "Desconocido";
    const authorTag = isMyPost
      ? `<span class="post-author-you">(Tú)</span>`
      : "";
    const actionsHTML = isMyPost
      ? `
          <button class="action-btn edit-btn" data-id="${post.post_id}">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button class="action-btn delete-btn" data-id="${post.post_id}">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>`
      : "";

    const commentsHTML = post.comments?.map(createCommentHTML).join("") || "";

    return `
      <div class="post-card" data-post-id="${post.post_id}">
          <div class="post-header">
              <div class="post-avatar" style="background-color: #${getHexColor(
                authorName
              )}">${authorName.substring(0, 1).toUpperCase()}</div>
              <span class="post-author">${authorName} ${authorTag}</span>
          </div>
          <h3 class="post-title">${post.titulo}</h3>
          <div class="post-content"><p>${post.contenido.replace(
            /\n/g,
            "<br>"
          )}</p></div>
          <div class="post-footer">
              <span class="post-meta">${new Date(
                post.fecha_creacion
              ).toLocaleString()}</span>
              <div class="post-actions">${actionsHTML}</div>
          </div>
          <div class="comments-section">
            <div class="comments-list">${commentsHTML}</div>
            <form class="comment-form">
              <input type="text" placeholder="Escribe un comentario..." required />
              <button type="submit">Enviar</button>
            </form>
          </div>
      </div>`;
  };

  const renderPosts = (posts, listElement, noPostsElementId) => {
    try {
      listElement.innerHTML = posts.map(createPostCardHTML).join("");
      document.getElementById(noPostsElementId).style.display =
        posts.length === 0 ? "block" : "none";
    } catch (error) {
      console.error("Error renderizando posts:", error);
      listElement.innerHTML = `<div class="error-message">Error al cargar los posts: ${error.message}</div>`;
      document.getElementById(noPostsElementId).style.display = "none";
    }
  };

  // --- CARGA DE DATOS ---
  const loadPostsForCurrentView = async () => {
    document.querySelector(".view.active")?.classList.remove("active");
    document.getElementById(currentView).classList.add("active");

    try {
      switch (currentView) {
        case "my-posts-view":
          const myPosts = await fetchWithAuth(`${API_URL}/posts/me`);
          renderPosts(myPosts, myPostsList, "no-posts-message");
          break;
        case "commented-posts-view":
          const commentedPosts = await fetchWithAuth(
            `${API_URL}/user/commented-posts`
          );
          renderPosts(
            commentedPosts,
            commentedPostsList,
            "no-commented-posts-message"
          );
          break;
        case "global-chat-view":
          const globalPosts = await fetchWithAuth(`${API_URL}/posts`);
          renderPosts(globalPosts, globalChatList, "no-global-posts-message");
          break;
        // La vista de búsqueda se maneja por separado
      }
    } catch (error) {
      alert(`No se pudieron cargar los posts: ${error.message}`);
    }
  };

  // --- MANEJADORES DE EVENTOS ---

  // Navegación de vistas
  viewRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      currentView = e.target.id.replace("view-", "") + "-view";
      searchResultsLabel.style.display = "none"; // Ocultar la pestaña de búsqueda
      loadPostsForCurrentView();
    });
  });

  // Crear Post
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const titulo = postTitleInput.value.trim();
    const contenido = postTextarea.value.trim();
    if (!titulo || !contenido) return;

    try {
      await fetchWithAuth(`${API_URL}/posts`, {
        method: "POST",
        body: JSON.stringify({ titulo, contenido }),
      });
      postTitleInput.value = "";
      postTextarea.value = "";
      // La actualización la manejará el socket
    } catch (error) {
      alert(`No se pudo crear el post: ${error.message}`);
    }
  });

  // Eventos delegados para acciones en posts (Comentar, Editar, Eliminar)
  document.body.addEventListener("click", async (e) => {
    // Botón de eliminar
    if (e.target.closest(".delete-btn")) {
      const postId = e.target.closest(".delete-btn").dataset.id;
      if (confirm("¿Estás seguro de que quieres eliminar esta publicación?")) {
        try {
          await fetchWithAuth(`${API_URL}/posts/${postId}`, {
            method: "DELETE",
          });
          // La actualización la manejará el socket
        } catch (error) {
          alert(`No se pudo eliminar el post: ${error.message}`);
        }
      }
    }
    // Botón de editar
    if (e.target.closest(".edit-btn")) {
      const postCard = e.target.closest(".post-card");
      postToEditId = postCard.dataset.postId;
      const content = postCard
        .querySelector(".post-content p")
        .innerHTML.replace(/<br\s*\/?>/gi, "\n");
      editTextarea.value = content;
      editModal.classList.add("active");
    }
  });

  document.body.addEventListener("submit", async (e) => {
    // Formulario de comentario
    if (e.target.classList.contains("comment-form")) {
      e.preventDefault();
      const form = e.target;
      const input = form.querySelector("input");
      const content = input.value.trim();
      if (!content) return;
      const postId = form.closest(".post-card").dataset.postId;

      try {
        await fetchWithAuth(`${API_URL}/posts/${postId}/comments`, {
          method: "POST",
          body: JSON.stringify({ contenido: content }),
        });
        input.value = "";
        // La actualización la manejará el socket
      } catch (error) {
        alert(`No se pudo enviar el comentario: ${error.message}`);
      }
    }
  });

  // Búsqueda
  searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (query.length < 2) {
      alert("La búsqueda debe tener al menos 2 caracteres.");
      return;
    }
    try {
      const results = await fetchWithAuth(
        `${API_URL}/user/search?q=${encodeURIComponent(query)}`
      );
      renderPosts(results, searchResultsList, "no-search-results-message");
      searchResultsTitle.textContent = `Resultados para "${query}"`;
      document.getElementById("view-search-results").checked = true;
      document.querySelector(".view.active").classList.remove("active");
      document.getElementById("search-results-view").classList.add("active");
      searchResultsLabel.style.display = "inline-block";
      clearSearchBtn.style.display = "inline-block";
    } catch (error) {
      alert(`Error en la búsqueda: ${error.message}`);
    }
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.style.display = "none";
    searchResultsLabel.style.display = "none";
    document.getElementById("view-my-posts").checked = true;
    currentView = "my-posts-view";
    loadPostsForCurrentView();
  });

  // Modal de Edición
  cancelEditBtn.addEventListener("click", () =>
    editModal.classList.remove("active")
  );
  saveEditBtn.addEventListener("click", async () => {
    const contenido = editTextarea.value.trim();
    if (!contenido || !postToEditId) return;
    try {
      await fetchWithAuth(`${API_URL}/posts/${postToEditId}`, {
        method: "PUT",
        body: JSON.stringify({ contenido }),
      });
      editModal.classList.remove("active");
      // La actualización la manejará el socket
    } catch (error) {
      alert(`No se pudo guardar la edición: ${error.message}`);
    }
  });

  // Modal de Configuración
  configBtn.addEventListener("click", () => {
    document.getElementById("config-name").value = LOGGED_IN_USER.nombre;
    document.getElementById("config-email").value = LOGGED_IN_USER.email;
    document.getElementById("config-current-password").value = "";
    document.getElementById("config-new-password").value = "";
    configModal.classList.add("active");
  });
  cancelConfigBtn.addEventListener("click", () =>
    configModal.classList.remove("active")
  );

  configForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("config-name").value;
    const email = document.getElementById("config-email").value;
    const contraseñaActual = document.getElementById(
      "config-current-password"
    ).value;
    const contraseñaNueva = document.getElementById(
      "config-new-password"
    ).value;

    const body = { nombre, email };
    if (contraseñaNueva) {
      body.contraseñaActual = contraseñaActual;
      body.contraseñaNueva = contraseñaNueva;
    } else if (email !== LOGGED_IN_USER.email) {
      body.contraseñaActual = contraseñaActual;
    }

    try {
      const result = await fetchWithAuth(`${API_URL}/user/profile`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      alert(result.message);
      // Actualizar datos locales
      LOGGED_IN_USER.nombre = result.user.nombre;
      LOGGED_IN_USER.email = result.user.email;
      localStorage.setItem("loggedInUser", JSON.stringify(LOGGED_IN_USER));
      userNameDisplay.textContent = LOGGED_IN_USER.nombre;
      userAvatarDisplay.textContent = LOGGED_IN_USER.nombre
        .substring(0, 1)
        .toUpperCase();
      configModal.classList.remove("active");
    } catch (error) {
      alert(`Error al actualizar el perfil: ${error.message}`);
    }
  });

  deleteAccountBtn.addEventListener("click", async () => {
    const password = prompt(
      "Para eliminar tu cuenta, por favor ingresa tu contraseña. ESTA ACCIÓN ES IRREVERSIBLE."
    );
    if (password) {
      try {
        const result = await fetchWithAuth(`${API_URL}/user/account`, {
          method: "DELETE",
          body: JSON.stringify({ contraseña: password }),
        });
        alert(result.message);
        logout();
      } catch (error) {
        alert(`No se pudo eliminar la cuenta: ${error.message}`);
      }
    }
  });

  logoutBtn.addEventListener("click", logout);

  // --- MANEJO DE SOCKET.IO PARA ACTUALIZACIONES EN TIEMPO REAL ---
  const updateOrAddPostInDOM = (postData) => {
    const existingCard = document.querySelector(
      `.post-card[data-post-id='${postData.post_id}']`
    );
    const newCardHTML = createPostCardHTML(postData);
    if (existingCard) {
      existingCard.outerHTML = newCardHTML;
    } else {
      // Añadir al inicio de las listas relevantes
      myPostsList.insertAdjacentHTML("afterbegin", newCardHTML);
      globalChatList.insertAdjacentHTML("afterbegin", newCardHTML);
    }
  };

  socket.on("new_post", (newPost) => {
    console.log("Nuevo post recibido:", newPost);
    updateOrAddPostInDOM(newPost);
  });

  socket.on("post_updated", (updatedPost) => {
    console.log("Post actualizado:", updatedPost);
    updateOrAddPostInDOM(updatedPost);
  });

  socket.on("post_deleted", ({ postId }) => {
    console.log("Post eliminado:", postId);
    const cardToDelete = document.querySelector(
      `.post-card[data-post-id='${postId}']`
    );
    if (cardToDelete) {
      cardToDelete.remove();
    }
  });

  socket.on("new_comment", (newComment) => {
    console.log("Nuevo comentario:", newComment);
    const postCard = document.querySelector(
      `.post-card[data-post-id='${newComment.post_id}']`
    );
    if (postCard) {
      const commentsList = postCard.querySelector(".comments-list");
      commentsList.insertAdjacentHTML(
        "beforeend",
        createCommentHTML(newComment)
      );
    }
  });

  // --- ARRANQUE ---
  initializeDashboard();
});
