// Espera a que el DOM esté completamente cargado.
document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://localhost:3000/api";
  const SOCKET_URL = "http://localhost:3000";

  // --- INICIALIZACIÓN DEL SOCKET ---
  const socket = io(SOCKET_URL);

  // --- GESTIÓN DE LA SESIÓN DEL USUARIO ---
  const LOGGED_IN_USER = JSON.parse(localStorage.getItem("loggedInUser"));
  const AUTH_TOKEN = localStorage.getItem("authToken");

  if (!LOGGED_IN_USER || !AUTH_TOKEN) {
    window.location.href = "login-register.html";
    return;
  }

  // Actualizamos la UI con los datos del usuario
  document.querySelector(".user-name").textContent = LOGGED_IN_USER.nombre;
  document.querySelector(".user-avatar").textContent = LOGGED_IN_USER.nombre
    .substring(0, 1)
    .toUpperCase();
  document.getElementById(
    "post-textarea"
  ).placeholder = `¿Qué estás pensando, ${LOGGED_IN_USER.nombre}?`;

  // --- REFERENCIAS A ELEMENTOS DEL DOM ---
  const postForm = document.getElementById("post-form");
  const postTextarea = document.getElementById("post-textarea");
  const viewMyPostsRadio = document.getElementById("view-my-posts");
  const viewGlobalChatRadio = document.getElementById("view-global-chat");
  const myPostsView = document.getElementById("my-posts-view");
  const globalChatView = document.getElementById("global-chat-view");
  const myPostsList = document.getElementById("my-posts-list");
  const globalChatList = document.getElementById("global-chat-list");
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
    const response = await fetch(url, { ...options, headers });
    if (response.status === 401 || response.status === 403) {
      // Si el token es inválido o ha expirado, cerramos la sesión.
      logout();
      throw new Error("Sesión expirada. Por favor, inicie sesión de nuevo.");
    }
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Ocurrió un error en la petición.");
    }
    return response.json();
  };

  const getMyPosts = () => fetchWithAuth(`${API_URL}/posts/me`);
  const getGlobalPosts = () => fetchWithAuth(`${API_URL}/posts`);

  // --- LÓGICA DE RENDERIZADO ---
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
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
          </button>`
      : "";

    return `
      <div class="post-card" data-post-id="${post.post_id}">
          <div class="post-header">
              <div class="post-avatar" style="background-color: #${getHexColor(
                authorName
              )}">${authorName.substring(0, 2).toUpperCase()}</div>
              <span class="post-author">${authorName} ${authorTag}</span>
          </div>
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
      </div>`;
  };

  const renderPosts = async (fetchFn, listElement, noPostsElement) => {
    try {
      const posts = await fetchFn();
      listElement.innerHTML = posts.map(createPostCardHTML).join("");
      noPostsElement.style.display = posts.length === 0 ? "block" : "none";
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  // --- MANEJADORES DE EVENTOS ---
  viewMyPostsRadio.addEventListener("change", () => switchView("my-posts"));
  viewGlobalChatRadio.addEventListener("change", () =>
    switchView("global-chat")
  );

  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const contenido = postTextarea.value.trim();
    if (!contenido) return;

    try {
      await fetchWithAuth(`${API_URL}/posts`, {
        method: "POST",
        body: JSON.stringify({ contenido }),
      });
      // No necesitamos renderizar aquí, el evento de socket lo hará
      postTextarea.value = "";
    } catch (error) {
      console.error(error);
      alert("No se pudo crear el post.");
    }
  });

  const handleListClick = async (e) => {
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
        // El evento de socket se encargará de eliminarlo de la UI
      } catch (error) {
        console.error(error);
        alert("No se pudo eliminar el post.");
      }
    }
  };

  myPostsList.addEventListener("click", handleListClick);
  globalChatList.addEventListener("click", handleListClick);

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
      // El socket se encargará de actualizar la UI
      closeEditModal();
    } catch (error) {
      console.error(error);
      alert("No se pudo actualizar el post.");
    }
  });
  cancelEditBtn.addEventListener("click", closeEditModal);

  // --- FUNCIONES AUXILIARES ---
  const switchView = (viewName) => {
    myPostsView.classList.toggle("active", viewName === "my-posts");
    globalChatView.classList.toggle("active", viewName === "global-chat");
  };
  const getHexColor = (str) => {
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
  };

  const updatePostInDOM = (post) => {
    const postCards = document.querySelectorAll(
      `.post-card[data-post-id='${post.post_id}']`
    );
    if (postCards.length > 0) {
      postCards.forEach((card) => {
        card.outerHTML = createPostCardHTML(post);
      });
    }
  };

  const removePostFromDOM = (postId) => {
    const postCards = document.querySelectorAll(
      `.post-card[data-post-id='${postId}']`
    );
    postCards.forEach((card) => card.remove());
  };

  socket.on("new_post", (post) => {
    console.log("Nuevo post recibido:", post);
    addPostToDOM(post);
  });

  socket.on("post_updated", (post) => {
    console.log("Post actualizado:", post);
    updatePostInDOM(post);
  });

  socket.on("post_deleted", (data) => {
    console.log("Post eliminado:", data.postId);
    removePostFromDOM(data.postId);
  });

  // --- INICIALIZACIÓN ---
  const initialize = async () => {
    switchView("my-posts");
    await renderPosts(
      getMyPosts,
      myPostsList,
      document.getElementById("no-posts-message")
    );
    await renderPosts(
      getGlobalPosts,
      globalChatList,
      document.getElementById("no-global-posts-message")
    );
  };

  initialize();
});
