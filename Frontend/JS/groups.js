// =============================================================================
// Frontend - Gestión de Grupos - Post-Place
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
  let currentGroupId = null;

  const start = async () => {
    const session = ensureSession();
    LOGGED_IN_USER = session.logged;
    AUTH_TOKEN = session.token || null;

    // --- REFERENCIAS AL DOM ---
    const userNameDisplay = document.querySelector(".user-name");
    const userAvatarDisplay = document.querySelector(".user-avatar");
    const configBtn = document.querySelector(".config-btn");
    const logoutBtn = document.querySelector(".logout-btn");

    // Grupos
    const createGroupBtn = document.getElementById("create-group-btn");
    const groupsList = document.getElementById("groups-list");
    const noGroupsMessage = document.getElementById("no-groups-message");

    // Modales
    const createGroupModal = document.getElementById("create-group-modal");
    const createGroupForm = document.getElementById("create-group-form");
    const cancelCreateGroup = document.getElementById("cancel-create-group");

    const groupDetailsModal = document.getElementById("group-details-modal");
    const closeGroupDetails = document.getElementById("close-group-details");

    const addMemberModal = document.getElementById("add-member-modal");
    const cancelAddMember = document.getElementById("cancel-add-member");

    // Configuración
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
    const createGroupCard = (group) => {
      const typeClass = group.esPrivado ? "private" : "public";
      const typeText = group.esPrivado ? "🔒 Privado" : "🌐 Público";
      const isAdmin = group.mi_rol === "admin";
      const roleText = isAdmin ? "Administrador" : "Miembro";

      return `
        <div class="group-card" data-group-id="${group.group_id}">
          <div class="group-card-header">
            <div class="group-icon">🏘️</div>
            <div class="group-card-name">${group.nombre}</div>
          </div>
          <p class="group-card-description">${
            group.descripcion || "Sin descripción"
          }</p>
          <div class="group-card-meta">
            <span class="group-type-badge ${typeClass}">${typeText}</span>
            <span class="group-members-count">👥 ${
              group.total_miembros || 0
            } miembros</span>
            <span class="group-role-badge">${roleText}</span>
          </div>
        </div>
      `;
    };

    const renderGroups = (groups) => {
      if (groups.length === 0) {
        groupsList.innerHTML = "";
        noGroupsMessage.style.display = "block";
      } else {
        groupsList.innerHTML = groups.map(createGroupCard).join("");
        noGroupsMessage.style.display = "none";
      }
    };

    // --- CARGAR GRUPOS ---
    const loadGroups = async () => {
      try {
        const groups = await fetchWithAuth(`${API_URL}/groups`);
        console.log("Grupos cargados:", groups);
        renderGroups(groups);
      } catch (error) {
        console.error("Error cargando grupos:", error);
        alert("No se pudieron cargar los grupos");
      }
    };

    // --- CREAR GRUPO ---
    createGroupBtn.addEventListener("click", () => {
      createGroupForm.reset();
      createGroupModal.classList.add("visible");
    });

    cancelCreateGroup.addEventListener("click", () => {
      createGroupModal.classList.remove("visible");
    });

    createGroupForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const nombre = document.getElementById("group-name").value.trim();
      const descripcion = document
        .getElementById("group-description")
        .value.trim();
      const esPrivado = document.getElementById("group-private").checked;

      try {
        await fetchWithAuth(`${API_URL}/groups`, {
          method: "POST",
          body: JSON.stringify({ nombre, descripcion, esPrivado }),
        });

        alert("Grupo creado exitosamente");
        createGroupModal.classList.remove("visible");
        loadGroups();
      } catch (error) {
        alert(`Error: ${error.message}`);
      }
    });

    // --- VER DETALLES DEL GRUPO ---
    const loadGroupDetails = async (groupId) => {
      try {
        const group = await fetchWithAuth(`${API_URL}/groups/${groupId}`);
        console.log("Detalles del grupo:", group);

        currentGroupId = groupId;

        // Actualizar información del grupo
        document.getElementById("group-details-name").textContent =
          group.nombre;
        document.getElementById("group-details-description").textContent =
          group.descripcion || "Sin descripción";

        const typeText = group.esPrivado ? "🔒 Privado" : "🌐 Público";
        const typeClass = group.esPrivado ? "private" : "public";
        document.getElementById("group-details-type").textContent = typeText;
        document.getElementById(
          "group-details-type"
        ).className = `group-type-badge ${typeClass}`;

        const createdDate = new Date(group.fecha_creacion).toLocaleDateString();
        document.getElementById(
          "group-details-created"
        ).textContent = `Creado el: ${createdDate}`;

        // Mostrar/ocultar botones según permisos
        const isCreator = group.creador_id === LOGGED_IN_USER.user_id;
        const isAdmin = group.mi_rol === "admin";
        const isMember = group.es_miembro;

        document.getElementById("delete-group-btn").style.display = isCreator
          ? "inline-block"
          : "none";
        document.getElementById("leave-group-btn").style.display =
          isMember && !isCreator ? "inline-block" : "none";
        document.getElementById("add-member-btn").style.display = isAdmin
          ? "inline-block"
          : "none";

        // Renderizar miembros
        const membersList = document.getElementById("group-members-list");
        if (group.miembros && group.miembros.length > 0) {
          membersList.innerHTML = group.miembros
            .map((member) => {
              const isCurrentUser = member.user_id === LOGGED_IN_USER.user_id;
              const canRemove =
                isAdmin &&
                !isCurrentUser &&
                member.user_id !== group.creador_id;

              return `
              <div class="member-card" data-member-id="${member.user_id}">
                <div class="member-info">
                  <div class="member-avatar" style="background-color: #${getHexColor(
                    member.nombre
                  )}">
                    ${member.nombre.substring(0, 1).toUpperCase()}
                  </div>
                  <div class="member-details">
                    <div class="member-name">${member.nombre}${
                isCurrentUser ? " (Tú)" : ""
              }</div>
                    <div class="member-email">${member.email}</div>
                  </div>
                </div>
                <div class="member-actions">
                  ${
                    canRemove
                      ? `
                    <button class="btn-remove" data-member-id="${member.user_id}">
                      Eliminar
                    </button>
                  `
                      : ""
                  }
                </div>
              </div>
            `;
            })
            .join("");
        } else {
          membersList.innerHTML =
            '<p class="no-data-message">No hay miembros en este grupo</p>';
        }

        groupDetailsModal.classList.add("visible");
      } catch (error) {
        console.error("Error cargando detalles del grupo:", error);
        alert(`Error: ${error.message}`);
      }
    };

    // Evento de clic en tarjeta de grupo
    groupsList.addEventListener("click", (e) => {
      const groupCard = e.target.closest(".group-card");
      if (groupCard) {
        const groupId = groupCard.dataset.groupId;
        loadGroupDetails(groupId);
      }
    });

    closeGroupDetails.addEventListener("click", () => {
      groupDetailsModal.classList.remove("visible");
      currentGroupId = null;
    });

    // --- ELIMINAR GRUPO ---
    document
      .getElementById("delete-group-btn")
      .addEventListener("click", async () => {
        if (!currentGroupId) return;

        if (
          confirm(
            "¿Estás seguro de que quieres eliminar este grupo? Esta acción no se puede deshacer."
          )
        ) {
          try {
            await fetchWithAuth(`${API_URL}/groups/${currentGroupId}`, {
              method: "DELETE",
            });

            alert("Grupo eliminado exitosamente");
            groupDetailsModal.classList.remove("visible");
            loadGroups();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      });

    // --- ABANDONAR GRUPO ---
    document
      .getElementById("leave-group-btn")
      .addEventListener("click", async () => {
        if (!currentGroupId) return;

        if (confirm("¿Estás seguro de que quieres abandonar este grupo?")) {
          try {
            await fetchWithAuth(`${API_URL}/groups/${currentGroupId}/leave`, {
              method: "POST",
            });

            alert("Has abandonado el grupo exitosamente");
            groupDetailsModal.classList.remove("visible");
            loadGroups();
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      });

    // --- AÑADIR MIEMBRO ---
    document
      .getElementById("add-member-btn")
      .addEventListener("click", async () => {
        if (!currentGroupId) return;

        try {
          const availableFriends = await fetchWithAuth(
            `${API_URL}/groups/${currentGroupId}/available-friends`
          );

          const friendsList = document.getElementById("available-friends-list");

          if (availableFriends.length === 0) {
            friendsList.innerHTML =
              '<p class="no-data-message">No tienes amigos disponibles para añadir</p>';
          } else {
            friendsList.innerHTML = availableFriends
              .map(
                (friend) => `
            <div class="friend-select-card">
              <div class="friend-select-info">
                <div class="friend-select-avatar" style="background-color: #${getHexColor(
                  friend.nombre
                )}">
                  ${friend.nombre.substring(0, 1).toUpperCase()}
                </div>
                <div class="friend-select-details">
                  <div class="friend-select-name">${friend.nombre}</div>
                  <div class="friend-select-email">${friend.email}</div>
                </div>
              </div>
              <button class="btn-add-friend" data-friend-id="${friend.user_id}">
                Añadir
              </button>
            </div>
          `
              )
              .join("");
          }

          addMemberModal.classList.add("visible");
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      });

    cancelAddMember.addEventListener("click", () => {
      addMemberModal.classList.remove("visible");
    });

    // Evento para añadir amigo
    document
      .getElementById("available-friends-list")
      .addEventListener("click", async (e) => {
        const addBtn = e.target.closest(".btn-add-friend");
        if (addBtn && currentGroupId) {
          const friendId = addBtn.dataset.friendId;

          try {
            await fetchWithAuth(`${API_URL}/groups/${currentGroupId}/members`, {
              method: "POST",
              body: JSON.stringify({ memberId: friendId }),
            });

            alert("Miembro añadido exitosamente");
            addMemberModal.classList.remove("visible");
            loadGroupDetails(currentGroupId);
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      });

    // --- ELIMINAR MIEMBRO ---
    document
      .getElementById("group-members-list")
      .addEventListener("click", async (e) => {
        const removeBtn = e.target.closest(".btn-remove");
        if (removeBtn && currentGroupId) {
          const memberId = removeBtn.dataset.memberId;

          if (
            confirm("¿Estás seguro de que quieres eliminar a este miembro?")
          ) {
            try {
              await fetchWithAuth(
                `${API_URL}/groups/${currentGroupId}/members/${memberId}`,
                {
                  method: "DELETE",
                }
              );

              alert("Miembro eliminado exitosamente");
              loadGroupDetails(currentGroupId);
            } catch (error) {
              alert(`Error: ${error.message}`);
            }
          }
        }
      });

    // --- CONFIGURACIÓN ---
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
    socket.on("new_group", () => {
      loadGroups();
    });

    socket.on("group_member_added", (data) => {
      if (currentGroupId === data.group_id) {
        loadGroupDetails(currentGroupId);
      }
      loadGroups();
    });

    socket.on("group_member_removed", (data) => {
      if (currentGroupId === data.group_id) {
        loadGroupDetails(currentGroupId);
      }
      loadGroups();
    });

    socket.on("group_member_left", (data) => {
      if (data.user_id === LOGGED_IN_USER.user_id) {
        groupDetailsModal.classList.remove("visible");
        loadGroups();
      } else if (currentGroupId === data.group_id) {
        loadGroupDetails(currentGroupId);
      }
    });

    socket.on("group_deleted", (data) => {
      if (currentGroupId === data.group_id) {
        groupDetailsModal.classList.remove("visible");
      }
      loadGroups();
    });

    // --- INICIALIZAR DASHBOARD ---
    userNameDisplay.textContent = LOGGED_IN_USER.nombre;
    userAvatarDisplay.textContent = LOGGED_IN_USER.nombre
      .substring(0, 1)
      .toUpperCase();

    loadGroups();
  };

  start().catch(() => {});
});
