// =============================================================================
// Frontend - Gestión de Amigos - Post-Place
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  // --- CONFIGURACIÓN Y AUTENTICACIÓN ---
  const API_URL = window.APP_CONFIG.API_URL;
  const SOCKET_URL = window.APP_CONFIG.SOCKET_URL;
  const socket = io(SOCKET_URL);

  // Validar sesión
  const ensureSession = () => {
    let logged = null;
    let token = null;

    try {
      logged = JSON.parse(localStorage.getItem("loggedInUser") || "null");
      token = localStorage.getItem("authToken") || null;
    } catch (_) {}

    if (!logged) {
      if (
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1"
      ) {
        logged = { user_id: 999, nombre: "Dev", email: "dev@local" };
        localStorage.setItem("loggedInUser", JSON.stringify(logged));
        if (!localStorage.getItem("authToken")) {
          localStorage.setItem("authToken", "dev-token");
        }
        token = localStorage.getItem("authToken");
      } else {
        window.location.href = "login-register.html";
        throw new Error("No session");
      }
    }

    return { logged, token };
  };

  // --- INICIALIZACIÓN ---
  let LOGGED_IN_USER;
  let AUTH_TOKEN;

  const start = async () => {
    const session = ensureSession();
    LOGGED_IN_USER = session.logged;
    AUTH_TOKEN = session.token || null;

    // --- REFERENCIAS AL DOM ---
    const userNameDisplay = document.querySelector(".user-name");
    const userAvatarDisplay = document.querySelector(".user-avatar");
    const configBtn = document.querySelector(".config-btn");
    const logoutBtn = document.querySelector(".logout-btn");

    // Estadísticas
    const totalFriendsEl = document.getElementById("total-friends");
    const pendingRequestsEl = document.getElementById("pending-requests");
    const sentRequestsEl = document.getElementById("sent-requests");

    // Búsqueda
    const userSearchInput = document.getElementById("user-search-input");
    const userSearchBtn = document.getElementById("user-search-btn");
    const userSearchResults = document.getElementById("user-search-results");

    // Pestañas
    const tabRadios = document.querySelectorAll('input[name="tab"]');

    // Listas
    const friendsList = document.getElementById("friends-list");
    const pendingRequestsList = document.getElementById(
      "pending-requests-list"
    );
    const sentRequestsList = document.getElementById("sent-requests-list");

    // Mensajes vacíos
    const noFriendsMsg = document.getElementById("no-friends-message");
    const noPendingMsg = document.getElementById("no-pending-message");
    const noSentMsg = document.getElementById("no-sent-message");

    // Modal
    const configModal = document.getElementById("config-modal");
    const configForm = document.getElementById("config-form");
    const cancelConfigBtn = document.getElementById("cancel-config-btn");

    // --- AUXILIARES ---
    const getHexColor = (str) => {
      if (!str) return "CCCCCC";
      let hash = 0;
      for (let i = 0; i < str.length; i++)
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
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
        ...(AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {}),
        ...(options.headers || {}),
      };

      try {
        const response = await fetch(url, { ...options, headers });
        if (response.status === 204) return null;
        const data = await response.json().catch(() => ({}));
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
    const createUserCard = (user, type) => {
      const avatarColor = getHexColor(user.nombre);
      const initial = user.nombre.substring(0, 1).toUpperCase();
      const dateText = user.fecha_amistad
        ? `Amigos desde: ${new Date(user.fecha_amistad).toLocaleDateString()}`
        : user.fecha_solicitud
        ? `Solicitado: ${new Date(user.fecha_solicitud).toLocaleDateString()}`
        : "";

      let actionsHTML = "";

      if (type === "friend") {
        actionsHTML = `
          <button class="action-btn action-btn-danger remove-friend-btn" data-id="${user.user_id}">
            🗑️ Eliminar Amigo
          </button>
        `;
      } else if (type === "pending") {
        actionsHTML = `
          <button class="action-btn action-btn-success accept-request-btn" data-id="${user.user_id}">
            ✅ Aceptar
          </button>
          <button class="action-btn action-btn-danger reject-request-btn" data-id="${user.user_id}">
            ❌ Rechazar
          </button>
        `;
      } else if (type === "sent") {
        actionsHTML = `
          <button class="action-btn action-btn-secondary cancel-request-btn" data-id="${user.user_id}">
            ❌ Cancelar
          </button>
        `;
      } else if (type === "search") {
        actionsHTML = `
          <button class="action-btn action-btn-primary send-request-btn" data-id="${user.user_id}">
            ➕ Enviar Solicitud
          </button>
        `;
      }

      return `
        <div class="user-card" data-user-id="${user.user_id}">
          <div class="user-card-header">
            <div class="user-card-avatar" style="background-color: #${avatarColor}">
              ${initial}
            </div>
            <div class="user-card-info">
              <div class="user-card-name">${user.nombre}</div>
              <div class="user-card-email">${user.email}</div>
            </div>
          </div>
          ${dateText ? `<div class="user-card-date">${dateText}</div>` : ""}
          <div class="user-card-actions">
            ${actionsHTML}
          </div>
        </div>
      `;
    };

    const renderUserList = (users, container, emptyMsg, type) => {
      if (users.length === 0) {
        container.innerHTML = "";
        emptyMsg.style.display = "block";
      } else {
        container.innerHTML = users
          .map((user) => createUserCard(user, type))
          .join("");
        emptyMsg.style.display = "none";
      }
    };

    // --- CARGAR DATOS ---
    const loadStats = async () => {
      try {
        const stats = await fetchWithAuth(`${API_URL}/friends/stats`);
        console.log("Stats recibidas:", stats);
        totalFriendsEl.textContent = Array.isArray(stats.total_amigos)
          ? stats.total_amigos.length
          : stats.total_amigos || 0;

        pendingRequestsEl.textContent = Array.isArray(stats.solicitudes_recibidas)
          ? stats.solicitudes_recibidas.length
          : stats.solicitudes_recibidas || 0;

        sentRequestsEl.textContent = Array.isArray(stats.solicitudes_enviadas)
          ? stats.solicitudes_enviadas.length
          : stats.solicitudes_enviadas || 0;
      } catch (error) {
        console.error("Error cargando estadísticas:", error);
      }
    };

    const loadFriends = async () => {
      try {
        const friends = await fetchWithAuth(`${API_URL}/friends/list`);
        renderUserList(friends, friendsList, noFriendsMsg, "friend");
      } catch (error) {
        console.error("Error cargando amigos:", error);
        alert("No se pudieron cargar los amigos");
      }
    };

    const loadPendingRequests = async () => {
      try {
        const requests = await fetchWithAuth(
          `${API_URL}/friends/requests/pending`
        );
        renderUserList(requests, pendingRequestsList, noPendingMsg, "pending");
      } catch (error) {
        console.error("Error cargando solicitudes pendientes:", error);
        alert("No se pudieron cargar las solicitudes pendientes");
      }
    };

    const loadSentRequests = async () => {
      try {
        const requests = await fetchWithAuth(
          `${API_URL}/friends/requests/sent`
        );
        renderUserList(requests, sentRequestsList, noSentMsg, "sent");
      } catch (error) {
        console.error("Error cargando solicitudes enviadas:", error);
        alert("No se pudieron cargar las solicitudes enviadas");
      }
    };

    const loadCurrentTab = () => {
      const checkedTab = document.querySelector('input[name="tab"]:checked');
      const tabId = checkedTab.id;

      document
        .querySelectorAll(".tab-content")
        .forEach((tab) => tab.classList.remove("active"));

      if (tabId === "tab-friends") {
        document.getElementById("friends-tab").classList.add("active");
        loadFriends();
      } else if (tabId === "tab-pending") {
        document.getElementById("pending-tab").classList.add("active");
        loadPendingRequests();
      } else if (tabId === "tab-sent") {
        document.getElementById("sent-tab").classList.add("active");
        loadSentRequests();
      }
    };

    // --- BÚSQUEDA DE USUARIOS ---
    const searchUsers = async () => {
      const query = userSearchInput.value.trim();
      if (query.length < 2) {
        alert("La búsqueda debe tener al menos 2 caracteres");
        return;
      }

      try {
        const users = await fetchWithAuth(
          `${API_URL}/friends/search?q=${encodeURIComponent(query)}`
        );

        if (users.length === 0) {
          userSearchResults.innerHTML = `
            <p class="no-data-message">No se encontraron usuarios con ese criterio</p>
          `;
        } else {
          userSearchResults.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: var(--color-text);">Resultados de búsqueda:</h3>
            <div class="user-cards-container">
              ${users.map((user) => createUserCard(user, "search")).join("")}
            </div>
          `;
        }
      } catch (error) {
        console.error("Error buscando usuarios:", error);
        alert("Error en la búsqueda de usuarios");
      }
    };

    userSearchBtn.addEventListener("click", searchUsers);
    userSearchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        searchUsers();
      }
    });

    // --- ACCIONES CON DELEGACIÓN DE EVENTOS ---
    document.body.addEventListener("click", async (e) => {
      const sendBtn = e.target.closest(".send-request-btn");
      if (sendBtn) {
        const toUserId = sendBtn.dataset.id;
        try {
          await fetchWithAuth(`${API_URL}/friends/request`, {
            method: "POST",
            body: JSON.stringify({ toUserId }),
          });
          alert("Solicitud de amistad enviada");
          loadStats();
          searchUsers(); // Refrescar búsqueda
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      }

      const acceptBtn = e.target.closest(".accept-request-btn");
      if (acceptBtn) {
        const fromUserId = acceptBtn.dataset.id;
        try {
          await fetchWithAuth(`${API_URL}/friends/accept`, {
            method: "POST",
            body: JSON.stringify({ fromUserId }),
          });
          alert("Solicitud aceptada");
          loadStats();
          loadPendingRequests();
          loadFriends();
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      }

      const rejectBtn = e.target.closest(".reject-request-btn");
      if (rejectBtn) {
        const fromUserId = rejectBtn.dataset.id;
        if (confirm("¿Estás seguro de rechazar esta solicitud?")) {
          try {
            await fetchWithAuth(`${API_URL}/friends/reject`, {
              method: "POST",
              body: JSON.stringify({ fromUserId }),
            });
            alert("Solicitud rechazada");
            loadStats();
            loadPendingRequests();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      }

      const cancelBtn = e.target.closest(".cancel-request-btn");
      if (cancelBtn) {
        const toUserId = cancelBtn.dataset.id;
        if (confirm("¿Deseas cancelar esta solicitud?")) {
          try {
            await fetchWithAuth(`${API_URL}/friends/cancel`, {
              method: "POST",
              body: JSON.stringify({ toUserId }),
            });
            alert("Solicitud cancelada");
            loadStats();
            loadSentRequests();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      }

      const removeBtn = e.target.closest(".remove-friend-btn");
      if (removeBtn) {
        const friendId = removeBtn.dataset.id;
        if (confirm("¿Estás seguro de eliminar a este amigo?")) {
          try {
            await fetchWithAuth(`${API_URL}/friends/remove`, {
              method: "DELETE",
              body: JSON.stringify({ friendId }),
            });
            alert("Amigo eliminado");
            loadStats();
            loadFriends();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      }
    });

    // --- PESTAÑAS ---
    tabRadios.forEach((radio) => {
      radio.addEventListener("change", loadCurrentTab);
    });

    // --- CONFIGURACIÓN (REUTILIZADO) ---
    configBtn.addEventListener("click", () => {
      configForm.reset();
      document.getElementById("config-name").value = LOGGED_IN_USER.nombre;
      document.getElementById("config-email").value = LOGGED_IN_USER.email;
      configModal.classList.add("visible");
    });

    cancelConfigBtn.addEventListener("click", () => {
      configModal.classList.remove("visible");
    });

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
        const { message, user } = await fetchWithAuth(
          `${API_URL}/user/profile`,
          {
            method: "PUT",
            body: JSON.stringify(body),
          }
        );
        alert(message);
        LOGGED_IN_USER = { ...LOGGED_IN_USER, ...user };
        localStorage.setItem("loggedInUser", JSON.stringify(LOGGED_IN_USER));
        userNameDisplay.textContent = LOGGED_IN_USER.nombre;
        userAvatarDisplay.textContent = LOGGED_IN_USER.nombre
          .substring(0, 1)
          .toUpperCase();
        configModal.classList.remove("visible");
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    });

    logoutBtn.addEventListener("click", logout);

    // --- SOCKET.IO (NOTIFICACIONES EN TIEMPO REAL) ---
    socket.on("new_friend_request", (data) => {
      if (data.to_user_id === LOGGED_IN_USER.user_id) {
        loadStats();
        loadPendingRequests();
      }
    });

    socket.on("friend_request_accepted", (data) => {
      if (
        data.user_id === LOGGED_IN_USER.user_id ||
        data.friend_id === LOGGED_IN_USER.user_id
      ) {
        loadStats();
        loadFriends();
        loadSentRequests();
      }
    });

    socket.on("friendship_removed", (data) => {
      if (
        data.user_id === LOGGED_IN_USER.user_id ||
        data.friend_id === LOGGED_IN_USER.user_id
      ) {
        loadStats();
        loadFriends();
      }
    });

    // --- INICIALIZAR DASHBOARD ---
    userNameDisplay.textContent = LOGGED_IN_USER.nombre;
    userAvatarDisplay.textContent = LOGGED_IN_USER.nombre
      .substring(0, 1)
      .toUpperCase();

    loadStats();
    loadCurrentTab();
  };

  start().catch(() => {});
});
