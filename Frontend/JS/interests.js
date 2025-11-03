// =============================================================================
// Frontend - Gestión de Intereses - Post-Place (COMPLETO)
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
  let myInterestsSet = new Set();

  const start = async () => {
    const session = ensureSession();
    LOGGED_IN_USER = session.logged;
    AUTH_TOKEN = session.token || null;

    // --- REFERENCIAS AL DOM ---
    const userNameDisplay = document.querySelector(".user-name");
    const userAvatarDisplay = document.querySelector(".user-avatar");
    const configBtn = document.querySelector(".config-btn");
    const logoutBtn = document.querySelector(".logout-btn");

    // Pestañas
    const tabRadios = document.querySelectorAll('input[name="tab"]');

    // Listas
    const myInterestsList = document.getElementById("my-interests-list");
    const allInterestsContainer = document.getElementById(
      "all-interests-container"
    );
    const recommendationsList = document.getElementById("recommendations-list");

    // Mensajes vacíos
    const noMyInterestsMsg = document.getElementById("no-my-interests-message");
    const noRecommendationsMsg = document.getElementById(
      "no-recommendations-message"
    );

    // Badges
    const totalInterestsBadge = document.getElementById(
      "total-interests-badge"
    );
    const totalCategoriesBadge = document.getElementById(
      "total-categories-badge"
    );

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

    // --- CARGAR MIS INTERESES ---
    const loadMyInterests = async () => {
      try {
        const interests = await fetchWithAuth(`${API_URL}/interests/my`);
        console.log("Mis intereses:", interests);

        // Actualizar el Set de intereses
        myInterestsSet.clear();
        interests.forEach((interest) => myInterestsSet.add(interest.nombre));

        // Actualizar estadísticas
        const stats = await fetchWithAuth(`${API_URL}/interests/stats`);
        totalInterestsBadge.textContent = `${stats.total_intereses} intereses`;
        totalCategoriesBadge.textContent = `${stats.total_categorias} categorías`;

        // Renderizar
        if (interests.length === 0) {
          myInterestsList.innerHTML = "";
          noMyInterestsMsg.style.display = "block";
        } else {
          myInterestsList.innerHTML = interests
            .map(
              (interest) => `
            <div class="interest-card" data-interest="${interest.nombre}">
              <div class="interest-emoji">${interest.emoji}</div>
              <div class="interest-name">${interest.nombre}</div>
              <div class="interest-category">${interest.categoria}</div>
              <div class="interest-actions">
                <button class="btn-remove-interest" data-interest="${interest.nombre}">
                  Eliminar
                </button>
              </div>
            </div>
          `
            )
            .join("");
          noMyInterestsMsg.style.display = "none";
        }
      } catch (error) {
        console.error("Error cargando mis intereses:", error);
        alert("No se pudieron cargar tus intereses");
      }
    };

    // --- CARGAR TODOS LOS INTERESES ---
    const loadAllInterests = async () => {
      try {
        const allInterests = await fetchWithAuth(`${API_URL}/interests/all`);
        console.log("Todos los intereses:", allInterests);

        // Renderizar por categorías
        allInterestsContainer.innerHTML = Object.entries(allInterests)
          .map(
            ([categoria, interests]) => `
          <div class="interest-category-section">
            <h3 class="category-header">${categoria}</h3>
            <div class="category-interests">
              ${interests
                .map((interest) => {
                  const isSelected = myInterestsSet.has(interest.nombre);
                  const statusClass = isSelected ? "added" : "add";
                  const statusText = isSelected ? "✓ Agregado" : "+ Agregar";

                  return `
                  <div class="interest-item ${
                    isSelected ? "selected" : ""
                  }" data-interest="${interest.nombre}">
                    <div class="interest-item-emoji">${interest.emoji}</div>
                    <div class="interest-item-name">${interest.nombre}</div>
                    <span class="interest-item-status ${statusClass}">${statusText}</span>
                  </div>
                `;
                })
                .join("")}
            </div>
          </div>
        `
          )
          .join("");
      } catch (error) {
        console.error("Error cargando todos los intereses:", error);
        alert("No se pudieron cargar los intereses");
      }
    };

    // --- CARGAR RECOMENDACIONES ---
    const loadRecommendations = async () => {
      try {
        const recommendations = await fetchWithAuth(
          `${API_URL}/interests/recommendations`
        );
        console.log("Recomendaciones:", recommendations);

        if (recommendations.length === 0) {
          recommendationsList.innerHTML = "";
          noRecommendationsMsg.style.display = "block";
        } else {
          recommendationsList.innerHTML = recommendations
            .map(
              (rec) => `
            <div class="recommendation-card">
              <div class="recommendation-header">
                <div class="recommendation-avatar" style="background-color: #${getHexColor(
                  rec.nombre
                )}">
                  ${rec.nombre.substring(0, 1).toUpperCase()}
                </div>
                <div class="recommendation-info">
                  <div class="recommendation-name">${rec.nombre}</div>
                  <div class="recommendation-email">${rec.email}</div>
                </div>
                <div class="recommendation-score">
                  ${rec.score} ${
                rec.score === 1 ? "interés" : "intereses"
              } en común
                </div>
              </div>
              <div class="recommendation-interests">
                <div class="recommendation-interests-label">Intereses comunes:</div>
                <div class="recommendation-interests-list">
                  ${rec.intereses_comunes
                    .map(
                      (interest) =>
                        `<span class="interest-tag">${interest}</span>`
                    )
                    .join("")}
                </div>
              </div>
              <div class="recommendation-action">
                <button class="btn-send-request" data-user-id="${rec.user_id}">
                  Enviar Solicitud de Amistad
                </button>
              </div>
            </div>
          `
            )
            .join("");
          noRecommendationsMsg.style.display = "none";
        }
      } catch (error) {
        console.error("Error cargando recomendaciones:", error);
        alert("No se pudieron cargar las recomendaciones");
      }
    };

    // --- CAMBIO DE PESTAÑAS ---
    const loadCurrentTab = () => {
      const checkedTab = document.querySelector('input[name="tab"]:checked');
      const tabId = checkedTab.id;

      document
        .querySelectorAll(".tab-content")
        .forEach((tab) => tab.classList.remove("active"));

      if (tabId === "tab-my-interests") {
        document.getElementById("my-interests-tab").classList.add("active");
        loadMyInterests();
      } else if (tabId === "tab-all-interests") {
        document.getElementById("all-interests-tab").classList.add("active");
        loadAllInterests();
      } else if (tabId === "tab-recommendations") {
        document.getElementById("recommendations-tab").classList.add("active");
        loadRecommendations();
      }
    };

    tabRadios.forEach((radio) => {
      radio.addEventListener("change", loadCurrentTab);
    });

    // --- ELIMINAR INTERÉS ---
    myInterestsList.addEventListener("click", async (e) => {
      const removeBtn = e.target.closest(".btn-remove-interest");
      if (removeBtn) {
        const interestName = removeBtn.dataset.interest;

        if (
          confirm(
            `¿Estás seguro de que quieres eliminar "${interestName}" de tus intereses?`
          )
        ) {
          try {
            await fetchWithAuth(
              `${API_URL}/interests/${encodeURIComponent(interestName)}`,
              {
                method: "DELETE",
              }
            );

            myInterestsSet.delete(interestName);
            loadMyInterests();
            alert("Interés eliminado exitosamente");
          } catch (error) {
            alert(`Error: ${error.message}`);
          }
        }
      }
    });

    // --- AÑADIR/QUITAR INTERÉS ---
    allInterestsContainer.addEventListener("click", async (e) => {
      const interestItem = e.target.closest(".interest-item");
      if (interestItem) {
        const interestName = interestItem.dataset.interest;
        const isSelected = myInterestsSet.has(interestName);

        try {
          if (isSelected) {
            // Eliminar interés
            await fetchWithAuth(
              `${API_URL}/interests/${encodeURIComponent(interestName)}`,
              {
                method: "DELETE",
              }
            );
            myInterestsSet.delete(interestName);
            alert(`"${interestName}" eliminado de tus intereses`);
          } else {
            // Añadir interés
            await fetchWithAuth(`${API_URL}/interests`, {
              method: "POST",
              body: JSON.stringify({ interestName }),
            });
            myInterestsSet.add(interestName);
            alert(`"${interestName}" añadido a tus intereses`);
          }

          // Recargar la vista actual
          loadAllInterests();
        } catch (error) {
          alert(`Error: ${error.message}`);
        }
      }
    });

    // --- ENVIAR SOLICITUD DE AMISTAD (¡COMPLETADO!) ---
    recommendationsList.addEventListener("click", async (e) => {
      const sendBtn = e.target.closest(".btn-send-request");
      if (sendBtn) {
        const toUserId = sendBtn.dataset.userId;

        // Evitar doble clic
        sendBtn.disabled = true;
        sendBtn.textContent = "Enviando...";

        try {
          // Usamos la API de 'friends' que ya existe
          await fetchWithAuth(`${API_URL}/friends/request`, {
            method: "POST",
            body: JSON.stringify({ toUserId }),
          });

          alert("Solicitud de amistad enviada exitosamente");

          // Recargar la lista de recomendaciones (el usuario ya no aparecerá)
          loadRecommendations();
        } catch (error) {
          alert(`Error al enviar la solicitud: ${error.message}`);
          // Habilitar el botón de nuevo si falla
          sendBtn.disabled = false;
          sendBtn.textContent = "Enviar Solicitud de Amistad";
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

    // --- SOCKET.IO (Notificaciones en tiempo real) ---
    // Para actualizar las recomendaciones si una amistad cambia

    socket.on("friend_request_accepted", (data) => {
      if (
        data.user_id === LOGGED_IN_USER.user_id ||
        data.friend_id === LOGGED_IN_USER.user_id
      ) {
        // Si nos hacemos amigos, recargamos las recomendaciones (ya no aparecerá)
        if (document.getElementById("tab-recommendations").checked) {
          loadRecommendations();
        }
      }
    });

    socket.on("friendship_removed", (data) => {
      // Si dejamos de ser amigos, podría volver a ser una recomendación
      if (
        data.user_id === LOGGED_IN_USER.user_id ||
        data.friend_id === LOGGED_IN_USER.user_id
      ) {
        if (document.getElementById("tab-recommendations").checked) {
          loadRecommendations();
        }
      }
    });

    // --- INICIALIZAR DASHBOARD ---
    userNameDisplay.textContent = LOGGED_IN_USER.nombre;
    userAvatarDisplay.textContent = LOGGED_IN_USER.nombre
      .substring(0, 1)
      .toUpperCase();

    loadCurrentTab();
  };

  start().catch(() => {});
});
