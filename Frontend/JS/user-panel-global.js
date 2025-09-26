// Espera a que el DOM esté completamente cargado.
document.addEventListener("DOMContentLoaded", () => {
  const API_URL = window.APP_CONFIG.API_URL;
  const SOCKET_URL = window.APP_CONFIG.SOCKET_URL;

  // --- INICIALIZACIÓN DEL SOCKET ---
  const socket = io(SOCKET_URL);

  // --- GESTIÓN DE LA SESIÓN DEL USUARIO ---
  const LOGGED_IN_USER = JSON.parse(localStorage.getItem("loggedInUser"));
  const AUTH_TOKEN = localStorage.getItem("authToken");

  if (!LOGGED_IN_USER || !AUTH_TOKEN) {
    window.location.href = "login-register.html";
    return;
  }

  // --- REFERENCIAS A ELEMENTOS DEL DOM ---
  document.querySelector(".user-name").textContent = LOGGED_IN_USER.nombre;
  document.querySelector(".user-avatar").textContent = LOGGED_IN_USER.nombre
    .substring(0, 1)
    .toUpperCase();

  const postForm = document.getElementById("post-form");
  const postTitleInput = document.getElementById("post-title");
  const postTextarea = document.getElementById("post-textarea");
  const myPostsList = document.getElementById("my-posts-list");
  const globalChatList = document.getElementById("global-chat-list");
  const viewMyPostsRadio = document.getElementById("view-my-posts");
  const viewGlobalChatRadio = document.getElementById("view-global-chat");
  const myPostsView = document.getElementById("my-posts-view");
  const globalChatView = document.getElementById("global-chat-view");
  const editModal = document.getElementById("edit-modal");
  const editTextarea = document.getElementById("edit-textarea");
  const saveEditBtn = document.getElementById("save-edit-btn");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const logoutBtn = document.querySelector(".logout-btn");

  let postToEditId = null;

  // --- LÓGICA DE DATOS (FETCH SEGURO) ---
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
        throw new Error("Sesión expirada. Por favor, inicie sesión de nuevo.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error HTTP: ${response.status}`);
      }

      return response.json();
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

  const renderPosts = async (fetchFn, listElement, noPostsElementId) => {
    try {
      const posts = await fetchFn();
      listElement.innerHTML = posts.map(createPostCardHTML).join("");
      document.getElementById(noPostsElementId).style.display =
        posts.length === 0 ? "block" : "none";
    } catch (error) {
      console.error("Error renderizando posts:", error);
      listElement.innerHTML = `<div class="error-message">Error al cargar los posts: ${error.message}</div>`;
      document.getElementById(noPostsElementId).style.display = "none";
    }
  };

  // --- MANEJADORES DE EVENTOS ---
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
      // Los posts se actualizarán automáticamente via Socket.IO
    } catch (error) {
      console.error("Error creando post:", error);
      alert(`No se pudo crear el post: ${error.message}`);
    }
  });

  const handleActions = async (e) => {
    const button = e.target.closest(".action-btn");
    if (!button) return;

    const postCard = e.target.closest(".post-card");
    const postId = Number(postCard.dataset.postId);

    if (button.classList.contains("edit-btn")) {
      const postContent = postCard.querySelector(".post-content p").innerText;
      openEditModal(postId, postContent);
    } else if (button.classList.contains("delete-btn")) {
      if (!confirm("¿Estás seguro de que quieres eliminar esta publicación?"))
        return;
      try {
        await fetchWithAuth(`${API_URL}/posts/${postId}`, { method: "DELETE" });
      } catch (error) {
        console.error("Error eliminando post:", error);
        alert(`No se pudo eliminar el post: ${error.message}`);
      }
    }
  };

  const handleCommentSubmit = async (e) => {
    if (!e.target.classList.contains("comment-form")) return;
    e.preventDefault();
    const form = e.target;
    const input = form.querySelector("input");
    const contenido = input.value.trim();
    if (!contenido) return;

    const postCard = form.closest(".post-card");
    const postId = Number(postCard.dataset.postId);

    try {
      await fetchWithAuth(`${API_URL}/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ contenido }),
      });
      input.value = "";
      // Los comentarios se actualizarán automáticamente via Socket.IO
    } catch (error) {
      console.error("Error enviando comentario:", error);
      alert(`No se pudo enviar el comentario: ${error.message}`);
    }
  };

  myPostsList.addEventListener("click", handleActions);
  globalChatList.addEventListener("click", handleActions);
  myPostsList.addEventListener("submit", handleCommentSubmit);
  globalChatList.addEventListener("submit", handleCommentSubmit);

  const logout = () => {
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("authToken");
    window.location.href = "../../index.html";
  };
  logoutBtn.addEventListener("click", logout);

  // --- LÓGICA DEL MODAL ---
  const openEditModal = (postId, currentText) => {
    postToEditId = postId;
    editTextarea.value = currentText;
    editModal.classList.add("visible");
  };
  const closeEditModal = () => editModal.classList.remove("visible");

  saveEditBtn.addEventListener("click", async () => {
    const contenido = editTextarea.value.trim();
    if (!contenido || !postToEditId) return;
    try {
      await fetchWithAuth(`${API_URL}/posts/${postToEditId}`, {
        method: "PUT",
        body: JSON.stringify({ contenido }),
      });
      closeEditModal();
    } catch (error) {
      console.error("Error actualizando post:", error);
      alert(`No se pudo actualizar el post: ${error.message}`);
    }
  });
  cancelEditBtn.addEventListener("click", closeEditModal);

  // --- FUNCIONES Y EVENTOS AUXILIARES ---
  const switchView = (viewName) => {
    myPostsView.classList.toggle("active", viewName === "my-posts");
    globalChatView.classList.toggle("active", viewName === "global-chat");
  };
  viewMyPostsRadio.addEventListener("change", () => switchView("my-posts"));
  viewGlobalChatRadio.addEventListener("change", () =>
    switchView("global-chat")
  );

  const getHexColor = (str) => {
    if (!str) return "CCCCCC";
    let hash = 0;
    for (let i = 0; i < str.length; i++)
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    let color = "";
    for (let i = 0; i < 3; i++) {
      let value = (hash >> (i * 8)) & 0xff;
      color += ("00" + value.toString(16)).substr(-2);
    }
    return color;
  };

  // --- LÓGICA DE SOCKET.IO (TIEMPO REAL) ---
  const addPostToDOM = (post) => {
    const postHTML = createPostCardHTML(post);
    globalChatList.insertAdjacentHTML("afterbegin", postHTML);
    if (post.user_id === LOGGED_IN_USER.user_id) {
      myPostsList.insertAdjacentHTML("afterbegin", postHTML);
    }
    // Ocultar mensajes de "no posts" si es necesario
    document.getElementById("no-posts-message").style.display = "none";
    document.getElementById("no-global-posts-message").style.display = "none";
  };

  const updatePostInDOM = (post) => {
    // Recargar todos los posts para asegurar consistencia
    initialize();
  };

  const removePostFromDOM = (postId) => {
    const postCards = document.querySelectorAll(
      `.post-card[data-post-id='${postId}']`
    );
    postCards.forEach((card) => card.remove());
  };

  const addCommentToDOM = (comment) => {
    const postCards = document.querySelectorAll(
      `.post-card[data-post-id='${comment.post_id}']`
    );
    postCards.forEach((card) => {
      const commentList = card.querySelector(".comments-list");
      if (commentList) {
        commentList.insertAdjacentHTML("beforeend", createCommentHTML(comment));
        commentList.scrollTop = commentList.scrollHeight;
      }
    });
  };

  // Manejo de errores de conexión Socket.IO
  socket.on("connect_error", (error) => {
    console.error("Error de conexión Socket.IO:", error);
  });

  socket.on("new_post", addPostToDOM);
  socket.on("post_updated", updatePostInDOM);
  socket.on("post_deleted", (data) => removePostFromDOM(data.postId));
  socket.on("new_comment", addCommentToDOM);

  // --- INICIALIZACIÓN ---
  const initialize = async () => {
    switchView("my-posts");

    try {
      // Cargar posts del usuario
      await renderPosts(
        () => fetchWithAuth(`${API_URL}/posts/me`),
        myPostsList,
        "no-posts-message"
      );

      // Cargar posts globales
      await renderPosts(
        () => fetchWithAuth(`${API_URL}/posts`),
        globalChatList,
        "no-global-posts-message"
      );
    } catch (error) {
      console.error("Error en inicialización:", error);
    }
  };

  initialize();
});
