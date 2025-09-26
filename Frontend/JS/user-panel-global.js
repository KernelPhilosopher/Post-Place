document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURACIÓN Y AUTENTICACIÓN ---
  const API_URL = window.APP_CONFIG.API_URL;
  const SOCKET_URL = window.APP_CONFIG.SOCKET_URL;
  const socket = io(SOCKET_URL);

  let LOGGED_IN_USER = JSON.parse(localStorage.getItem("loggedInUser"));
  const AUTH_TOKEN = localStorage.getItem("authToken");

  if (!LOGGED_IN_USER || !AUTH_TOKEN) {
    window.location.href = "login-register.html";
    return;
  }

  // --- REFERENCIAS AL DOM ---
  const userNameDisplay = document.querySelector(".user-name");
  const userAvatarDisplay = document.querySelector(".user-avatar");
  const postForm = document.getElementById("post-form");
  const postTitleInput = document.getElementById("post-title");
  const postTextarea = document.getElementById("post-textarea");
  const myPostsList = document.getElementById("my-posts-list");
  const commentedPostsList = document.getElementById("commented-posts-list");
  const globalChatList = document.getElementById("global-chat-list");
  const searchResultsList = document.getElementById("search-results-list");
  const viewRadios = document.querySelectorAll('input[name="view"]');
  const searchResultsLabel = document.querySelector(
    'label[for="view-search-results"]'
  );
  const searchInput = document.getElementById("search-input");
  const searchBtn = document.getElementById("search-btn");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  const searchResultsTitle = document.getElementById("search-results-title");

  // Modales de Posts
  const editModal = document.getElementById("edit-modal");
  const editTextarea = document.getElementById("edit-textarea");
  const saveEditBtn = document.getElementById("save-edit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  let postToEditId = null;

  // NUEVO: Modales de Comentarios
  const commentEditModal = document.getElementById("comment-edit-modal");
  const commentEditTextarea = document.getElementById("comment-edit-textarea");
  const commentSaveEditBtn = document.getElementById("comment-save-edit-btn");
  const commentCancelEditBtn = document.getElementById(
    "comment-cancel-edit-btn"
  );
  let commentToEditId = null;

  // Configuración
  const configModal = document.getElementById("config-modal");
  const configBtn = document.querySelector(".config-btn");
  const configForm = document.getElementById("config-form");
  const cancelConfigBtn = document.getElementById("cancel-config-btn");
  const deleteAccountBtn = document.getElementById("delete-account-btn");
  const logoutBtn = document.querySelector(".logout-btn");

  let currentView = "my-posts-view";

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
    if (!str) return "CCCCCC";
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
      if (response.status === 204) return null; // No content
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) logout();
        throw new Error(data.error || `Error HTTP: ${response.status}`);
      }
      return data;
    } catch (error) {
      console.error("Error en fetchWithAuth:", error);
      throw error;
    }
  };

  // --- RENDERIZADO ---
  const createCommentHTML = (comment) => {
    const authorName = comment.autor_nombre || "Desconocido";
    const isMyComment = comment.user_id === LOGGED_IN_USER.user_id;

    const authorTag = isMyComment
      ? `<span class="comment-author-you">(Tú)</span>`
      : "";

    const actionsHTML = isMyComment
      ? `
      <div class="comment-actions">
        <button class="comment-action-btn comment-edit-btn" data-id="${comment.comment_id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
        <button class="comment-action-btn comment-delete-btn" data-id="${comment.comment_id}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>`
      : "";

    return `
      <div class="comment-card" data-comment-id="${comment.comment_id}">
        <div class="comment-avatar" style="background-color: #${getHexColor(
          authorName
        )}">${authorName.substring(0, 1).toUpperCase()}</div>
        <div class="comment-body">
          <div>
            <span class="comment-author">${authorName} ${authorTag}</span>
            <p class="comment-content">${comment.contenido.replace(
              /\n/g,
              "<br>"
            )}</p>
          </div>
          ${actionsHTML}
        </div>
      </div>`;
  };

  const createPostCardHTML = (post) => {
    const authorName = post.autor_nombre || "Desconocido";
    const isMyPost = post.user_id === LOGGED_IN_USER.user_id;
    const authorTag = isMyPost
      ? `<span class="post-author-you">(Tú)</span>`
      : "";
    const actionsHTML = isMyPost
      ? `
      <button class="action-btn edit-btn" data-id="${post.post_id}">
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
      </button>
      <button class="action-btn delete-btn" data-id="${post.post_id}">
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
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
    listElement.innerHTML =
      posts.length > 0 ? posts.map(createPostCardHTML).join("") : "";
    document.getElementById(noPostsElementId).style.display =
      posts.length === 0 ? "block" : "none";
  };

  // --- LÓGICA DE VISTAS ---
  const loadPostsForCurrentView = async () => {
    document.querySelector(".view.active")?.classList.remove("active");
    document.getElementById(currentView).classList.add("active");
    try {
      if (currentView === "my-posts-view") {
        renderPosts(
          await fetchWithAuth(`${API_URL}/posts/me`),
          myPostsList,
          "no-posts-message"
        );
      } else if (currentView === "commented-posts-view") {
        renderPosts(
          await fetchWithAuth(`${API_URL}/user/commented-posts`),
          commentedPostsList,
          "no-commented-posts-message"
        );
      } else if (currentView === "global-chat-view") {
        renderPosts(
          await fetchWithAuth(`${API_URL}/posts`),
          globalChatList,
          "no-global-posts-message"
        );
      }
    } catch (error) {
      alert(`No se pudieron cargar los posts: ${error.message}`);
    }
  };

  // --- MANEJADORES DE EVENTOS ---
  viewRadios.forEach((radio) =>
    radio.addEventListener("change", (e) => {
      currentView = e.target.id.replace("view-", "") + "-view";
      searchResultsLabel.style.display = "none";
      loadPostsForCurrentView();
    })
  );

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
      postForm.reset();
    } catch (error) {
      alert(`No se pudo crear el post: ${error.message}`);
    }
  });

  document.body.addEventListener("click", async (e) => {
    // POSTS
    const deleteBtn = e.target.closest(".delete-btn");
    if (
      deleteBtn &&
      confirm("¿Estás seguro de que quieres eliminar esta publicación?")
    ) {
      try {
        await fetchWithAuth(`${API_URL}/posts/${deleteBtn.dataset.id}`, {
          method: "DELETE",
        });
      } catch (error) {
        alert(`No se pudo eliminar el post: ${error.message}`);
      }
    }
    const editBtn = e.target.closest(".edit-btn");
    if (editBtn) {
      const postCard = editBtn.closest(".post-card");
      postToEditId = postCard.dataset.postId;
      editTextarea.value = postCard
        .querySelector(".post-content p")
        .innerHTML.replace(/<br\s*\/?>/gi, "\n");
      editModal.classList.add("visible");
    }

    // COMENTARIOS
    const commentDeleteBtn = e.target.closest(".comment-delete-btn");
    if (
      commentDeleteBtn &&
      confirm("¿Estás seguro de que quieres eliminar este comentario?")
    ) {
      try {
        await fetchWithAuth(
          `${API_URL}/comments/${commentDeleteBtn.dataset.id}`,
          {
            method: "DELETE",
          }
        );
      } catch (error) {
        alert(`No se pudo eliminar el comentario: ${error.message}`);
      }
    }
    const commentEditBtn = e.target.closest(".comment-edit-btn");
    if (commentEditBtn) {
      const commentCard = commentEditBtn.closest(".comment-card");
      commentToEditId = commentCard.dataset.commentId;
      commentEditTextarea.value = commentCard
        .querySelector(".comment-content")
        .innerHTML.replace(/<br\s*\/?>/gi, "\n");
      commentEditModal.classList.add("visible");
    }
  });

  document.body.addEventListener("submit", async (e) => {
    if (e.target.classList.contains("comment-form")) {
      e.preventDefault();
      const form = e.target;
      const input = form.querySelector("input");
      const contenido = input.value.trim();
      if (!contenido) return;
      const postId = form.closest(".post-card").dataset.postId;
      try {
        await fetchWithAuth(`${API_URL}/posts/${postId}/comments`, {
          method: "POST",
          body: JSON.stringify({ contenido }),
        });
        form.reset();
      } catch (error) {
        alert(`No se pudo enviar el comentario: ${error.message}`);
      }
    }
  });

  const performSearch = async () => {
    const query = searchInput.value.trim();
    if (query.length < 2)
      return alert("La búsqueda debe tener al menos 2 caracteres.");
    try {
      const results = await fetchWithAuth(
        `${API_URL}/user/search?q=${encodeURIComponent(query)}`
      );
      renderPosts(results, searchResultsList, "no-search-results-message");
      searchResultsTitle.textContent = `Resultados para "${query}"`;
      document.getElementById("view-search-results").checked = true;
      document.querySelector(".view.active")?.classList.remove("active");
      document.getElementById("search-results-view").classList.add("active");
      searchResultsLabel.style.display = "inline-block";
      clearSearchBtn.style.display = "inline-block";
    } catch (error) {
      alert(`Error en la búsqueda: ${error.message}`);
    }
  };

  searchBtn.addEventListener("click", performSearch);
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      performSearch();
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

  // Modales
  cancelEditBtn.addEventListener("click", () =>
    editModal.classList.remove("visible")
  );
  saveEditBtn.addEventListener("click", async () => {
    const contenido = editTextarea.value.trim();
    if (!contenido || !postToEditId) return;
    try {
      await fetchWithAuth(`${API_URL}/posts/${postToEditId}`, {
        method: "PUT",
        body: JSON.stringify({ contenido }),
      });
      editModal.classList.remove("visible");
    } catch (error) {
      alert(`No se pudo guardar la edición del post: ${error.message}`);
    }
  });

  // NUEVO: Listeners para modal de comentarios
  commentCancelEditBtn.addEventListener("click", () =>
    commentEditModal.classList.remove("visible")
  );
  commentSaveEditBtn.addEventListener("click", async () => {
    const contenido = commentEditTextarea.value.trim();
    if (!contenido || !commentToEditId) return;
    try {
      await fetchWithAuth(`${API_URL}/comments/${commentToEditId}`, {
        method: "PUT",
        body: JSON.stringify({ contenido }),
      });
      commentEditModal.classList.remove("visible");
    } catch (error) {
      alert(`No se pudo guardar la edición del comentario: ${error.message}`);
    }
  });

  configBtn.addEventListener("click", () => {
    configForm.reset();
    document.getElementById("config-name").value = LOGGED_IN_USER.nombre;
    document.getElementById("config-email").value = LOGGED_IN_USER.email;
    configModal.classList.add("visible");
  });
  cancelConfigBtn.addEventListener("click", () =>
    configModal.classList.remove("visible")
  );

  configForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("config-name").value.trim();
    const email = document.getElementById("config-email").value.trim();
    const contraseñaActual = document.getElementById(
      "config-current-password"
    ).value;
    const contraseñaNueva = document.getElementById(
      "config-new-password"
    ).value;
    let body = { nombre, email, contraseñaActual };
    if (contraseñaNueva) body.contraseñaNueva = contraseñaNueva;

    try {
      const { message, user } = await fetchWithAuth(`${API_URL}/user/profile`, {
        method: "PUT",
        body: JSON.stringify(body),
      });
      alert(message);
      LOGGED_IN_USER = { ...LOGGED_IN_USER, ...user };
      localStorage.setItem("loggedInUser", JSON.stringify(LOGGED_IN_USER));
      userNameDisplay.textContent = LOGGED_IN_USER.nombre;
      userAvatarDisplay.textContent = LOGGED_IN_USER.nombre
        .substring(0, 1)
        .toUpperCase();
      configModal.classList.remove("visible");
    } catch (error) {
      alert(`Error al actualizar el perfil: ${error.message}`);
    }
  });

  deleteAccountBtn.addEventListener("click", async () => {
    const password = prompt(
      "Para eliminar tu cuenta, ingresa tu contraseña. ESTA ACCIÓN ES IRREVERSIBLE."
    );
    if (password) {
      try {
        const { message } = await fetchWithAuth(`${API_URL}/user/account`, {
          method: "DELETE",
          body: JSON.stringify({ contraseña: password }),
        });
        alert(message);
        logout();
      } catch (error) {
        alert(`No se pudo eliminar la cuenta: ${error.message}`);
      }
    }
  });

  logoutBtn.addEventListener("click", logout);

  // --- SOCKET.IO ---
  const updateOrAddPostInDOM = (postData) => {
    const newCardHTML = createPostCardHTML(postData);
    const existingCard = document.querySelector(
      `.post-card[data-post-id='${postData.post_id}']`
    );
    if (existingCard) {
      existingCard.outerHTML = newCardHTML;
    } else {
      [
        "my-posts-list",
        "global-chat-list",
        "commented-posts-list",
        "search-results-list",
      ].forEach((id) => {
        document
          .getElementById(id)
          ?.insertAdjacentHTML("afterbegin", newCardHTML);
      });
    }
  };

  socket.on("new_post", (newPost) => updateOrAddPostInDOM(newPost));
  socket.on("post_updated", (updatedPost) => updateOrAddPostInDOM(updatedPost));
  socket.on("post_deleted", ({ postId }) =>
    document.querySelector(`.post-card[data-post-id='${postId}']`)?.remove()
  );

  socket.on("new_comment", (newComment) => {
    const postCards = document.querySelectorAll(
      `.post-card[data-post-id='${newComment.post_id}']`
    );
    postCards.forEach((card) => {
      card
        .querySelector(".comments-list")
        ?.insertAdjacentHTML("beforeend", createCommentHTML(newComment));
    });
  });

  // NUEVO: Listeners para Sockets de comentarios
  socket.on("comment_updated", (updatedComment) => {
    const commentCards = document.querySelectorAll(
      `.comment-card[data-comment-id='${updatedComment.comment_id}']`
    );
    commentCards.forEach(
      (card) => (card.outerHTML = createCommentHTML(updatedComment))
    );
  });

  socket.on("comment_deleted", ({ comment_id }) => {
    const commentCards = document.querySelectorAll(
      `.comment-card[data-comment-id='${comment_id}']`
    );
    commentCards.forEach((card) => card.remove());
  });

  // --- ARRANQUE ---
  initializeDashboard();
});
