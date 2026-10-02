/**
 * US-LOOP - Núcleo de Aplicación y Sincronización Global
 * Gestiona almacenamiento local, API de donaciones e intercambios,
 * modales, notificaciones toast y estado de usuario.
 */

// Cuentas iniciales del sistema
const INITIAL_USERS = [
  {
    id: 'usr_1790041333118',
    name: 'Juan David Raigoso Gómez',
    email: 'xxmendingxxorigin@gmail.com',
    password: 'loopforever',
    grade: '11° Grado',
    institution: 'Institución Educativa Fagua sede principal',
    avatar: '⚡🌌',
    completedDonations: 65,
    completedTrades: 65,
    loopPoints: 4077,
    ecoSaved: 245.0,
    bio: '¡Creador Principal y Desarrollador de US-Loop! 👑🛠️ Administrador del campus y guardián de la economía circular escolar.',
    isCreator: true,
    specialRole: 'creator',
    specialTitle: 'El Creador'
  }
];

// Datos iniciales (catálogo limpio por defecto)
const INITIAL_DONATIONS = [];
const INITIAL_EXCHANGES = [];

// Inicializar almacenamiento y sincronizar cuentas de usuario
function initStorageIfEmpty() {
  try {
    const STORAGE_VERSION = 'v6_creator_loopforever';
    if (localStorage.getItem('usloop_storage_version') !== STORAGE_VERSION) {
      if (!localStorage.getItem('donations')) localStorage.setItem('donations', JSON.stringify([]));
      if (!localStorage.getItem('exchanges')) localStorage.setItem('exchanges', JSON.stringify([]));
      if (!localStorage.getItem('tradeRequests')) localStorage.setItem('tradeRequests', JSON.stringify([]));
      
      let currentUsers = JSON.parse(localStorage.getItem('users') || '[]');
      INITIAL_USERS.forEach((initUser) => {
        const idx = currentUsers.findIndex((u) => (u.email || '').toLowerCase() === initUser.email.toLowerCase());
        if (idx >= 0) {
          currentUsers[idx] = { ...currentUsers[idx], ...initUser };
        } else {
          currentUsers.push(initUser);
        }
      });
      localStorage.setItem('users', JSON.stringify(currentUsers));
      
      const currentStoredUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      if (currentStoredUser && (currentStoredUser.email || '').toLowerCase() === 'xxmendingxxorigin@gmail.com') {
        localStorage.setItem('currentUser', JSON.stringify({ ...currentStoredUser, ...INITIAL_USERS[0], isLoggedIn: true }));
      }
      
      localStorage.setItem('usloop_storage_version', STORAGE_VERSION);
    } else {
      if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify(INITIAL_USERS));
      }
    }
  } catch (e) {
    console.error('Error inicializando almacenamiento local de US-Loop:', e);
  }
}

// Inicializar de inmediato
initStorageIfEmpty();

// Estado de conexión del servidor (Hostinger PHP Backend)
let isServerAvailable = window.location.protocol.startsWith('http');

async function checkServerConnection() {
  if (window.location.protocol.startsWith('http')) {
    try {
      const res = await fetch(`api/ping.php?_t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        isServerAvailable = data && data.server === true;
      }
    } catch (e) {
      isServerAvailable = false;
    }
  } else {
    isServerAvailable = false;
  }
  return isServerAvailable;
}

// Comprobar conexión con el servidor al cargar
checkServerConnection().then(() => {
  if (typeof syncHomePageStatsAndFeed === 'function') {
    syncHomePageStatsAndFeed();
  }
});

// API Global de US-Loop con Sincronización Híbrida (Hostinger Server + LocalStorage Fallback)
window.USLoopAPI = {
  isServer: () => window.location.protocol.startsWith('http'),

  async getUsers() {
    initStorageIfEmpty();
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`api/users.php?_t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const serverUsers = await res.json();
          if (Array.isArray(serverUsers)) {
            localStorage.setItem('users', JSON.stringify(serverUsers));
            return serverUsers;
          }
        }
      } catch (e) {
        console.warn('Fallback a usuarios locales:', e);
      }
    }
    return JSON.parse(localStorage.getItem('users') || '[]');
  },

  async getDonations() {
    initStorageIfEmpty();
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`api/donations.php?_t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const serverDonations = await res.json();
          if (Array.isArray(serverDonations)) {
            localStorage.setItem('donations', JSON.stringify(serverDonations));
            return serverDonations;
          }
        }
      } catch (e) {
        console.warn('Fallback a almacenamiento local para donaciones:', e);
      }
    }
    return JSON.parse(localStorage.getItem('donations') || '[]');
  },

  async saveDonation(donation) {
    const donations = JSON.parse(localStorage.getItem('donations') || '[]');
    donations.unshift(donation);
    localStorage.setItem('donations', JSON.stringify(donations));

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(`api/donations.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', donation: donation }),
          cache: 'no-store'
        });
      } catch (e) {
        console.warn('No se pudo sincronizar donación con el servidor:', e);
      }
    }
    return donation;
  },

  async finishDonation(id) {
    let donations = JSON.parse(localStorage.getItem('donations') || '[]');
    donations = donations.filter(d => String(d.id) !== String(id));
    localStorage.setItem('donations', JSON.stringify(donations));

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(`api/donations.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'finish', id: id }),
          cache: 'no-store'
        });
      } catch (e) {
        console.warn('No se pudo sincronizar finalización de donación:', e);
      }
    }
    return { success: true };
  },

  async getExchanges() {
    initStorageIfEmpty();
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`api/exchanges.php?_t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const serverExchanges = await res.json();
          if (Array.isArray(serverExchanges)) {
            localStorage.setItem('exchanges', JSON.stringify(serverExchanges));
            return serverExchanges;
          }
        }
      } catch (e) {
        console.warn('Fallback a almacenamiento local para intercambios:', e);
      }
    }
    return JSON.parse(localStorage.getItem('exchanges') || '[]');
  },

  async saveExchange(exchange) {
    const exchanges = JSON.parse(localStorage.getItem('exchanges') || '[]');
    exchanges.unshift(exchange);
    localStorage.setItem('exchanges', JSON.stringify(exchanges));

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(`api/exchanges.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', exchange: exchange }),
          cache: 'no-store'
        });
      } catch (e) {
        console.warn('No se pudo sincronizar intercambio con el servidor:', e);
      }
    }
    return exchange;
  },

  async completeExchange(id) {
    let exchanges = JSON.parse(localStorage.getItem('exchanges') || '[]');
    exchanges = exchanges.filter(e => String(e.id) !== String(id));
    localStorage.setItem('exchanges', JSON.stringify(exchanges));

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(`api/exchanges.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'complete', id: id }),
          cache: 'no-store'
        });
      } catch (e) {
        console.warn('No se pudo sincronizar finalización de intercambio:', e);
      }
    }
    return { success: true };
  },

  async getRequests() {
    initStorageIfEmpty();
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`api/requests.php?_t=${Date.now()}`, { method: 'GET', cache: 'no-store' });
        if (res.ok) {
          const serverReqs = await res.json();
          if (Array.isArray(serverReqs)) {
            localStorage.setItem('tradeRequests', JSON.stringify(serverReqs));
            return serverReqs;
          }
        }
      } catch (e) {
        console.warn('Fallback a solicitudes locales:', e);
      }
    }
    return JSON.parse(localStorage.getItem('tradeRequests') || '[]');
  },

  async saveRequest(request) {
    const requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
    requests.unshift(request);
    localStorage.setItem('tradeRequests', JSON.stringify(requests));

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(`api/requests.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'save', request: request }),
          cache: 'no-store'
        });
      } catch (e) {
        console.warn('No se pudo guardar solicitud en servidor:', e);
      }
    }
    return request;
  },

  async updateRequestStatus(id, status) {
    let requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
    const idx = requests.findIndex(r => String(r.id) === String(id));
    if (idx !== -1) {
      requests[idx].status = status;
      localStorage.setItem('tradeRequests', JSON.stringify(requests));
    }

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(`api/requests.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_status', id: id, status: status }),
          cache: 'no-store'
        });
      } catch (e) {
        console.warn('No se pudo actualizar estado de solicitud en servidor:', e);
      }
    }
    return { success: true };
  },

  async confirmDelivery(id, confirmedBy) {
    let requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
    const idx = requests.findIndex(r => String(r.id) === String(id));
    let bothConfirmed = false;
    let updatedReq = null;
    if (idx !== -1) {
      if (confirmedBy === 'donor') requests[idx].donorConfirmed = true;
      if (confirmedBy === 'requester') requests[idx].requesterConfirmed = true;
      bothConfirmed = !!(requests[idx].donorConfirmed && requests[idx].requesterConfirmed);
      if (bothConfirmed) requests[idx].status = 'completed';
      localStorage.setItem('tradeRequests', JSON.stringify(requests));
      updatedReq = requests[idx];
    }

    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`api/requests.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'confirm_delivery', id: id, confirmedBy: confirmedBy }),
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          if (data && (data.request || data.bothConfirmed !== undefined)) {
            const freshReqs = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
            const rIdx = freshReqs.findIndex(r => String(r.id) === String(id));
            if (rIdx !== -1 && data.request) {
              freshReqs[rIdx] = { ...freshReqs[rIdx], ...data.request };
              if (data.bothConfirmed) freshReqs[rIdx].status = 'completed';
              localStorage.setItem('tradeRequests', JSON.stringify(freshReqs));
            }
            return data;
          }
        }
      } catch (e) {
        console.warn('No se pudo confirmar entrega en servidor:', e);
      }
    }
    return { success: true, bothConfirmed: bothConfirmed, request: updatedReq };
  },

  async deleteRequest(id) {
    let requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
    requests = requests.filter(r => String(r.id) !== String(id));
    localStorage.setItem('tradeRequests', JSON.stringify(requests));

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(`api/requests.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', id: id }),
          cache: 'no-store'
        });
      } catch (e) {
        console.warn('No se pudo eliminar solicitud en servidor:', e);
      }
    }
    return { success: true };
  },

  async getRequestsForUser(email, name) {
    const requests = await this.getRequests();
    const em = (email || '').trim().toLowerCase();
    const nm = (name || '').trim().toLowerCase();
    return requests.filter(req => {
      const targetEmail = (req.targetAuthorEmail || '').trim().toLowerCase();
      const targetName = (req.targetAuthorName || '').trim().toLowerCase();
      if (em && targetEmail && em === targetEmail) return true;
      if (nm && targetName && (nm === targetName || nm.includes(targetName) || targetName.includes(nm))) return true;
      return false;
    });
  },

  async loginUser(email, password) {
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`api/auth.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, password: password }),
          cache: 'no-store'
        });
        if (res.ok) {
          return await res.json();
        } else if (res.status === 401 || res.status === 404 || res.status === 400) {
          const errData = await res.json().catch(() => ({}));
          if (errData && errData.error) {
            throw new Error(errData.error);
          }
        }
      } catch (e) {
        if (e.message && (e.message.includes('incorrecta') || e.message.includes('no encontrado') || e.message.includes('Credenciales'))) {
          throw e;
        }
        console.warn('Servidor PHP no disponible para login, usando fallback local:', e);
      }
    }
    return null;
  },

  async signupUser(newUser) {
    // 1. Validar localmente si el correo ya existe
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const existingUser = users.find(u => (u.email || '').toLowerCase() === (newUser.email || '').toLowerCase());
    if (existingUser) {
      throw new Error('Ya existe una cuenta con este correo electrónico.');
    }

    // 2. Intentar guardar en backend PHP si está en HTTP
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`api/users.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'signup', ...newUser }),
          cache: 'no-store'
        });
        if (res.ok) {
          const data = await res.json();
          // Asegurar sincronización en local
          if (!users.some(u => (u.email || '').toLowerCase() === (newUser.email || '').toLowerCase())) {
            users.push(newUser);
            localStorage.setItem('users', JSON.stringify(users));
          }
          return data;
        } else {
          const errData = await res.json().catch(() => ({}));
          if (errData && errData.error) {
            throw new Error(errData.error);
          }
          console.warn('Servidor estático o LiveServer detectado (código ' + res.status + '). Continuando con almacenamiento local.');
        }
      } catch (err) {
        if (err.message && (err.message.includes('Ya existe') || err.message.includes('requeridos') || err.message.includes('electrónico'))) {
          throw err;
        }
        console.warn('Servidor PHP no disponible para registro, guardando en local:', err);
      }
    }

    // 3. Guardar en almacenamiento local
    if (!users.some(u => (u.email || '').toLowerCase() === (newUser.email || '').toLowerCase())) {
      users.push(newUser);
      localStorage.setItem('users', JSON.stringify(users));
    }
    return { success: true, user: newUser };
  },

  async updateUserStats(email, type) {
    if (!email) return;
    try {
      let users = JSON.parse(localStorage.getItem('users') || '[]');
      const userIdx = users.findIndex(u => (u.email || '').toLowerCase() === email.toLowerCase());
      if (userIdx !== -1) {
        if (type === 'donation') {
          users[userIdx].completedDonations = (users[userIdx].completedDonations || 0) + 1;
        } else if (type === 'trade') {
          users[userIdx].completedTrades = (users[userIdx].completedTrades || 0) + 1;
        }
        users[userIdx].loopPoints = ((users[userIdx].completedDonations || 0) * 25) + ((users[userIdx].completedTrades || 0) * 20);
        users[userIdx].ecoSaved = parseFloat((((users[userIdx].completedDonations || 0) * 3.2) + ((users[userIdx].completedTrades || 0) * 2.5)).toFixed(1));
        localStorage.setItem('users', JSON.stringify(users));

        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if ((currentUser.email || '').toLowerCase() === email.toLowerCase()) {
          Object.assign(currentUser, users[userIdx]);
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
      }

      if (window.location.protocol.startsWith('http')) {
        await fetch(`api/users.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update_stats', email: email, type: type }),
          cache: 'no-store'
        });
      }
    } catch (e) {
      console.warn('No se pudieron actualizar estadísticas:', e);
    }
  },

  async deleteUserAccount(email) {
    if (!email) return;
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    users = users.filter(u => (u.email || '').toLowerCase() !== email.toLowerCase());
    localStorage.setItem('users', JSON.stringify(users));

    let donations = JSON.parse(localStorage.getItem('donations') || '[]');
    donations = donations.filter(d => (d.authorEmail || d.donorEmail || '').toLowerCase() !== email.toLowerCase());
    localStorage.setItem('donations', JSON.stringify(donations));

    let exchanges = JSON.parse(localStorage.getItem('exchanges') || '[]');
    exchanges = exchanges.filter(e => (e.authorEmail || e.ownerEmail || '').toLowerCase() !== email.toLowerCase());
    localStorage.setItem('exchanges', JSON.stringify(exchanges));

    let requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
    requests = requests.filter(r => (r.targetAuthorEmail || '').toLowerCase() !== email.toLowerCase() && (r.requesterEmail || '').toLowerCase() !== email.toLowerCase());
    localStorage.setItem('tradeRequests', JSON.stringify(requests));

    localStorage.removeItem('currentUser');

    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(`api/users.php?_t=${Date.now()}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete_user', email: email }),
          cache: 'no-store'
        });
      } catch (e) {
        console.warn('No se pudo eliminar cuenta en servidor:', e);
      }
    }
  }
};

/* ==========================================================================
   SISTEMA DE MODALES Y TOASTS INTERACTIVOS
   ========================================================================== */

function getOrCreateToastContainer() {
  let container = document.querySelector('.usloop-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'usloop-toast-container';
    document.body.appendChild(container);
  }
  return container;
}

window.showCustomToast = function(message, type = 'info') {
  const container = getOrCreateToastContainer();
  const toast = document.createElement('div');
  toast.className = 'usloop-toast';

  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'warning') icon = '⚠️';
  else if (type === 'error') icon = '❌';

  toast.innerHTML = `
    <span class="usloop-toast-icon">${icon}</span>
    <span class="usloop-toast-text">${message}</span>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

window.showCustomAlert = function({ title = 'Aviso', message = '', icon = '✨', confirmText = 'Entendido' }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'usloop-modal-backdrop';

    backdrop.innerHTML = `
      <div class="usloop-modal-box">
        <div class="usloop-modal-icon-wrap">${icon}</div>
        <h3 class="usloop-modal-title">${title}</h3>
        <p class="usloop-modal-msg">${message.replace(/\n/g, '<br>')}</p>
        <div class="usloop-modal-actions">
          <button class="usloop-modal-btn usloop-btn-confirm" id="modal-confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('active'));

    const btn = backdrop.querySelector('#modal-confirm-btn');
    btn.focus();

    btn.addEventListener('click', () => {
      backdrop.classList.remove('active');
      setTimeout(() => {
        backdrop.remove();
        resolve(true);
      }, 250);
    });
  });
};

window.showCustomConfirm = function({ title = '¿Confirmar acción?', message = '', icon = '❓', confirmText = 'Confirmar', cancelText = 'Cancelar' }) {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'usloop-modal-backdrop';

    backdrop.innerHTML = `
      <div class="usloop-modal-box">
        <div class="usloop-modal-icon-wrap">${icon}</div>
        <h3 class="usloop-modal-title">${title}</h3>
        <p class="usloop-modal-msg">${message.replace(/\n/g, '<br>')}</p>
        <div class="usloop-modal-actions">
          <button class="usloop-modal-btn usloop-btn-cancel" id="modal-cancel-btn">${cancelText}</button>
          <button class="usloop-modal-btn usloop-btn-confirm" id="modal-confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    requestAnimationFrame(() => backdrop.classList.add('active'));

    const confirmBtn = backdrop.querySelector('#modal-confirm-btn');
    const cancelBtn = backdrop.querySelector('#modal-cancel-btn');
    confirmBtn.focus();

    confirmBtn.addEventListener('click', () => {
      backdrop.classList.remove('active');
      setTimeout(() => {
        backdrop.remove();
        resolve(true);
      }, 250);
    });

    cancelBtn.addEventListener('click', () => {
      backdrop.classList.remove('active');
      setTimeout(() => {
        backdrop.remove();
        resolve(false);
      }, 250);
    });
  });
};

/* Modal Interactivo para Solicitar Donación o Proponer Trueque */
window.openRequestModal = function({ type = 'donation', item, onSuccess }) {
  if (!item) return;

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isLoggedIn = currentUser && currentUser.email && currentUser.isLoggedIn !== false;

  if (!isLoggedIn) {
    const actionText = type === 'donation' ? 'solicitar un material donado' : 'proponer un trueque escolar';
    if (window.showCustomAlert) {
      window.showCustomAlert({
        title: 'Cuenta Requerida',
        message: `Para ${actionText} con otro compañero, necesitas iniciar sesión o crear tu cuenta estudiantil en US-Loop.`,
        icon: '🔒',
        confirmText: 'Iniciar sesión / Registrarme'
      }).then(() => {
        window.location.href = 'login.html#signup';
      });
    } else {
      alert(`Para ${actionText} necesitas iniciar sesión o registrarte.`);
      window.location.href = 'login.html#signup';
    }
    return;
  }

  const loggedName = currentUser.name || '';
  const loggedEmail = currentUser.email || '';
  const loggedGrade = currentUser.grade || '10° Grado';
  const loggedSchool = currentUser.institution || 'Institución Educativa Fagua sede principal';

  const isDonation = type === 'donation';
  const itemTitle = isDonation ? (item.title || 'Donación') : (item.offering || 'Artículo escolar');
  const targetAuthorName = item.authorName || item.donorName || item.ownerName || item.name || 'Estudiante';
  let targetAuthorEmail = (item.authorEmail || item.donorEmail || item.ownerEmail || '').toLowerCase().trim();
  const targetSchool = item.school || item.institution || 'Sede Escolar';

  if (!targetAuthorEmail) {
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const foundUser = users.find(u => (u.name || '').trim().toLowerCase() === targetAuthorName.trim().toLowerCase());
      if (foundUser && foundUser.email) {
        targetAuthorEmail = foundUser.email.toLowerCase().trim();
      }
    } catch (e) {}
  }

  // Fechas y horas por defecto para la programación
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  // Hora por defecto: siguiente hora en punto
  let defHour = today.getHours() + 1;
  if (defHour >= 24) defHour = 10;
  const defaultTime = `${String(defHour).padStart(2, '0')}:00`;

  // Crear modal backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'usloop-modal-backdrop';

  const modalBox = document.createElement('div');
  modalBox.className = 'usloop-modal-box usloop-request-modal-box';
  modalBox.style.maxWidth = isDonation ? '460px' : '490px';
  modalBox.style.textAlign = 'left';

  // Helper para calcular horario 10 a 20 min más temprano para el donante (15 min por defecto)
  function calculateReminderTimes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return { reminderTime: '15 min más temprano', rangeText: '10 a 20 min más temprano' };
    const [h, m] = timeStr.split(':').map(Number);
    const dateObj = new Date();
    dateObj.setHours(h, m, 0, 0);

    const rem15 = new Date(dateObj.getTime() - 15 * 60000);
    const rem20 = new Date(dateObj.getTime() - 20 * 60000);
    const rem10 = new Date(dateObj.getTime() - 10 * 60000);

    const formatH = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return {
      reminderTime: formatH(rem15),
      rangeText: `${formatH(rem20)} - ${formatH(rem10)}`
    };
  }

  const initialReminder = calculateReminderTimes(defaultTime);

  modalBox.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
      <div class="usloop-modal-icon-wrap" style="margin: 0; width: 50px; height: 50px; font-size: 1.6rem; flex-shrink: 0;">
        ${isDonation ? '🎁' : '⇄'}
      </div>
      <div>
        <h3 class="usloop-modal-title" style="margin: 0; font-size: 1.25rem;">
          ${isDonation ? 'Solicitar Donación' : 'Proponer Trueque'}
        </h3>
        <p style="margin: 2px 0 0; font-size: 0.86rem; color: #64748b;">
          Para: <strong>${targetAuthorName}</strong> (🏫 ${targetSchool})
        </p>
      </div>
    </div>

    <div style="background: rgba(47, 128, 237, 0.06); border: 1px solid rgba(47, 128, 237, 0.15); border-radius: 12px; padding: 12px 14px; margin-bottom: 18px;">
      <div style="font-size: 0.78rem; font-weight: 700; color: #2563eb; text-transform: uppercase; margin-bottom: 2px;">
        ${isDonation ? 'RECURSO DONADO' : 'Trueque Disponible'}
      </div>
      <div style="font-size: 1.05rem; font-weight: 800; color: #1e293b;">
        ${isDonation ? itemTitle : `Ofrece: ${itemTitle}`}
      </div>
      ${!isDonation && (item.seeking || item.lookingFor) ? `
        <div style="font-size: 0.86rem; color: #059669; font-weight: 600; margin-top: 4px;">
          Busca a cambio: ${item.seeking || item.lookingFor}
        </div>
      ` : ''}
      ${item.description ? `
        <div style="font-size: 0.84rem; color: #475569; margin-top: 6px; line-height: 1.4; background: rgba(255, 255, 255, 0.75); padding: 6px 10px; border-radius: 6px; border: 1px solid rgba(0, 0, 0, 0.05);">
          <strong>Descripción:</strong> ${item.description}
        </div>
      ` : ''}
    </div>

    <form id="usloop-request-form">
      ${isDonation ? `
        <!-- Sección de Programación de Fecha y Hora para Donaciones -->
        <div style="background: #f8fafc; border: 1.5px solid #e2e8f0; border-radius: 14px; padding: 14px; margin-bottom: 16px;">
          <div style="font-size: 0.88rem; font-weight: 700; color: #0f172a; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
            <span>📅</span> Programar Fecha y Hora de Entrega
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">
                Fecha *
              </label>
              <input type="date" id="req-schedule-date" required min="${todayStr}" value="${todayStr}" style="width: 100%; padding: 10px 10px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; box-sizing: border-box; background: #ffffff; color: #1e293b; font-weight: 600;" />
            </div>
            <div class="form-group" style="margin: 0;">
              <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">
                Tu hora deseada *
              </label>
              <input type="time" id="req-schedule-time" required value="${defaultTime}" style="width: 100%; padding: 10px 10px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; box-sizing: border-box; background: #ffffff; color: #1e293b; font-weight: 600;" />
            </div>
          </div>

          <!-- Banner Informativo del Recordatorio (10 a 20 minutos más temprano para el donante) -->
          <div id="reminder-preview-box" style="background: rgba(34, 197, 94, 0.08); border: 1px dashed rgba(34, 197, 94, 0.4); border-radius: 10px; padding: 10px 12px; font-size: 0.82rem; color: #166534; line-height: 1.45;">
            ⏰ <strong>Hora asignada al donante (${targetAuthorName}):</strong> Le llegará la notificación <strong>10 a 20 minutos más temprano</strong> (<span id="reminder-time-preview">${initialReminder.reminderTime}</span>) con el mensaje: <em>"Entregar en coordinación, por favor"</em>.
          </div>
        </div>
      ` : `
        <!-- Formulario completo para Trueques -->
        <div class="form-group" style="margin-bottom: 14px;">
          <label style="font-size: 0.86rem; font-weight: 700; color: #1e293b; display: block; margin-bottom: 4px;">
            ¿Qué artículo o útil ofreces a cambio? *
          </label>
          <input type="text" id="req-offered-item" required placeholder="Ej. Libro de Matemáticas 10° o Calculadora Casio" style="width: 100%; padding: 10px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 0.9rem; box-sizing: border-box;" />
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.84rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">
              Tu Nombre *
            </label>
            <input type="text" id="req-name" required value="${loggedName}" placeholder="Tu nombre" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; box-sizing: border-box;" />
          </div>
          <div class="form-group" style="margin: 0;">
            <label style="font-size: 0.84rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">
              Tu Grado *
            </label>
            <input type="text" id="req-grade" required value="${loggedGrade}" placeholder="Ej. 10° Grado" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; box-sizing: border-box;" />
          </div>
        </div>

        <div class="form-group" style="margin-bottom: 12px;">
          <label style="font-size: 0.84rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">
            Correo o Teléfono / WhatsApp de Contacto *
          </label>
          <input type="text" id="req-contact" required value="${loggedEmail}" placeholder="estudiante@colegio.edu o celular..." style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; box-sizing: border-box;" />
        </div>

        <div class="form-group" style="margin-bottom: 18px;">
          <label style="font-size: 0.84rem; font-weight: 600; color: #475569; display: block; margin-bottom: 4px;">
            Mensaje o Punto de Entrega sugerido
          </label>
          <textarea id="req-message" rows="2" placeholder="Ej. ¡Hola! ¿Podemos encontrarnos en el descanso o biblioteca del colegio?" style="width: 100%; padding: 9px 12px; border-radius: 10px; border: 1.5px solid #cbd5e1; font-size: 0.88rem; box-sizing: border-box; resize: vertical;"></textarea>
        </div>
      `}

      <div class="usloop-modal-actions" style="margin-top: 18px;">
        <button type="button" class="usloop-modal-btn usloop-btn-cancel" id="req-cancel-btn">Cancelar</button>
        <button type="submit" class="usloop-modal-btn usloop-btn-confirm" id="req-submit-btn">
          ${isDonation ? 'Programar y Solicitar Donación 🎁' : 'Enviar Propuesta 🤝'}
        </button>
      </div>
    </form>
  `;

  backdrop.appendChild(modalBox);
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('active'));

  const cancelBtn = modalBox.querySelector('#req-cancel-btn');
  const reqForm = modalBox.querySelector('#usloop-request-form');
  const timeInput = modalBox.querySelector('#req-schedule-time');
  const previewSpan = modalBox.querySelector('#reminder-time-preview');

  if (timeInput && previewSpan) {
    timeInput.addEventListener('input', () => {
      const updated = calculateReminderTimes(timeInput.value);
      previewSpan.innerText = `${updated.reminderTime} (${updated.rangeText})`;
    });
  }

  cancelBtn.addEventListener('click', () => {
    backdrop.classList.remove('active');
    setTimeout(() => backdrop.remove(), 250);
  });

  reqForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    let requesterName = loggedName || 'Estudiante';
    let requesterGrade = loggedGrade || 'General';
    let requesterContact = loggedEmail || '';
    let requesterMessage = '';
    let offeredItem = null;
    let scheduledDate = '';
    let scheduledTime = '';
    let scheduledDateTime = '';
    let reminderTime = '';

    if (isDonation) {
      const dateEl = modalBox.querySelector('#req-schedule-date');
      const timeEl = modalBox.querySelector('#req-schedule-time');
      scheduledDate = dateEl ? dateEl.value : todayStr;
      scheduledTime = timeEl ? timeEl.value : defaultTime;
      scheduledDateTime = `${scheduledDate}T${scheduledTime}:00`;

      const remCalc = calculateReminderTimes(scheduledTime);
      reminderTime = remCalc.reminderTime;
      requesterMessage = '';
    } else {
      requesterName = modalBox.querySelector('#req-name')?.value.trim() || loggedName;
      requesterGrade = modalBox.querySelector('#req-grade')?.value.trim() || loggedGrade;
      requesterContact = modalBox.querySelector('#req-contact')?.value.trim() || loggedEmail;
      requesterMessage = modalBox.querySelector('#req-message')?.value.trim() || '';
      offeredItem = modalBox.querySelector('#req-offered-item')?.value.trim() || '';
    }

    const newRequest = {
      id: 'req_' + Date.now(),
      itemId: item.id || ('item_' + Date.now()),
      itemTitle: itemTitle,
      itemCategory: item.category || 'Recurso escolar',
      itemGrade: item.grade || 'General',
      itemType: isDonation ? 'donation' : 'exchange',
      type: isDonation ? 'donation' : 'exchange',
      itemIcon: item.icon || (isDonation ? '🎁' : '⇄'),
      itemSeeking: isDonation ? '' : (item.seeking || item.lookingFor || ''),
      targetAuthorEmail: targetAuthorEmail,
      targetAuthorName: targetAuthorName,
      targetSchool: targetSchool,
      requesterAvatar: currentUser.avatar || '👨‍🎓',
      requesterName: requesterName,
      requesterEmail: requesterContact.includes('@') ? requesterContact : (currentUser.email || ''),
      requesterContact: requesterContact,
      requesterGrade: requesterGrade,
      requesterSchool: loggedSchool,
      requesterMessage: requesterMessage,
      offeredItem: offeredItem,
      scheduledDate: scheduledDate,
      scheduledTime: scheduledTime,
      scheduledDateTime: scheduledDateTime,
      reminderTime: reminderTime,
      reminderMinutesBefore: 15,
      deliveryLocation: 'Coordinación',
      status: 'pending',
      date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    };

    if (window.USLoopAPI) {
      await window.USLoopAPI.saveRequest(newRequest);
    } else {
      let tradeRequests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
      tradeRequests.unshift(newRequest);
      localStorage.setItem('tradeRequests', JSON.stringify(tradeRequests));
    }

    backdrop.classList.remove('active');
    setTimeout(() => backdrop.remove(), 250);

    if (window.showCustomAlert) {
      const alertMsg = isDonation
        ? `Tu solicitud para "${itemTitle}" fue fijada para el ${scheduledDate} a las ${scheduledTime}.\n\nAl donante (${targetAuthorName}) le llegará la notificación con una hora de 10 a 20 minutos más temprano (${reminderTime}) y el mensaje: "Entregar en coordinación, por favor".`
        : `Tu propuesta para "${itemTitle}" ha sido enviada exitosamente a ${targetAuthorName}.`;

      await window.showCustomAlert({
        title: isDonation ? '¡Entrega Programada Exitosamente!' : '¡Propuesta Enviada!',
        message: alertMsg,
        icon: isDonation ? '🎁' : '🤝',
        confirmText: 'Entendido'
      });
    } else if (window.showCustomToast) {
      window.showCustomToast(`✓ Solicitud enviada a ${targetAuthorName}. Entregar en coordinación, por favor.`, 'success');
    }

    if (onSuccess) onSuccess(newRequest);
  });
};

/* ==========================================================================
   SISTEMA GLOBAL DE NIVELES Y RANGOS (25 NIVELES / 5 RANGOS DE PRESTIGIO)
   ========================================================================== */
window.ALL_LOOP_RANKS = [
  {
    key: 'principiante',
    title: 'Principiante',
    icon: '🌱',
    levelRange: 'Niveles 1 a 5',
    ptsRange: '0 - 249 pts',
    minPts: 0,
    maxPts: 249,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981, #059669)',
    desc: 'Primeros pasos en la economía circular. Puedes publicar donaciones y solicitar trueques.',
    perk: '🎁 Publicaciones ilimitadas en catálogo'
  },
  {
    key: 'colaborador',
    title: 'Colaborador Activo',
    icon: '🤝',
    levelRange: 'Niveles 6 a 10',
    ptsRange: '250 - 749 pts',
    minPts: 250,
    maxPts: 749,
    color: '#2563eb',
    gradient: 'linear-gradient(135deg, #0284c7, #2563eb, #1d4ed8)',
    desc: 'Participación constante. Has demostrado compromiso con tus compañeros del campus.',
    perk: '⚡ Insignia de Colaborador Destacado'
  },
  {
    key: 'solidario',
    title: 'Estudiante Solidario',
    icon: '🌟',
    levelRange: 'Niveles 11 a 15',
    ptsRange: '750 - 1,499 pts',
    minPts: 750,
    maxPts: 1499,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706, #b45309)',
    desc: 'Pilar de generosidad en la comunidad escolar. Alta tasa de recursos donados e intercambiados.',
    perk: '🔍 Destacado preferente en búsquedas'
  },
  {
    key: 'lider',
    title: 'Líder Comunitario',
    icon: '🏆',
    levelRange: 'Niveles 16 a 20',
    ptsRange: '1,500 - 2,499 pts',
    minPts: 1500,
    maxPts: 2499,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #a855f7, #7c3aed, #5b21b6)',
    desc: 'Líder ejemplar con gran ahorro de huella ecológica y apoyo constante entre grados.',
    perk: '🛡️ Reconocimiento Institucional Fagua'
  },
  {
    key: 'leyenda',
    title: 'Embajador del Campus',
    icon: '👑',
    levelRange: 'Niveles 21 a 25',
    ptsRange: '2,500+ pts',
    minPts: 2500,
    maxPts: 99999,
    color: '#ec4899',
    gradient: 'linear-gradient(135deg, #f59e0b, #ec4899, #8b5cf6, #3b82f6)',
    desc: 'Rango Supremo de excelencia en US-Loop. Nivel legendario con efecto animado exclusivo.',
    perk: '👑 Insignia Holográfica & Diploma de Honor'
  }
];

window.calculateUserLevelInfo = function(points) {
  const totalPoints = Math.max(0, parseInt(points, 10) || 0);
  const maxLevel = 25;
  const levelMinPoints = [
    0,     // Nvl 1
    30,    // Nvl 2
    70,    // Nvl 3
    120,   // Nvl 4
    180,   // Nvl 5
    250,   // Nvl 6
    330,   // Nvl 7
    420,   // Nvl 8
    520,   // Nvl 9
    630,   // Nvl 10
    750,   // Nvl 11
    880,   // Nvl 12
    1020,  // Nvl 13
    1170,  // Nvl 14
    1330,  // Nvl 15
    1500,  // Nvl 16
    1680,  // Nvl 17
    1870,  // Nvl 18
    2070,  // Nvl 19
    2280,  // Nvl 20
    2500,  // Nvl 21
    2750,  // Nvl 22
    3020,  // Nvl 23
    3310,  // Nvl 24
    3600   // Nvl 25
  ];

  let levelNum = 1;
  for (let i = 0; i < levelMinPoints.length; i++) {
    if (totalPoints >= levelMinPoints[i]) {
      levelNum = i + 1;
    } else {
      break;
    }
  }
  if (levelNum > maxLevel) levelNum = maxLevel;

  let rankKey = 'principiante';
  let rankTitle = 'Principiante';
  let rankIcon = '🌱';
  let rankColor = '#10b981';
  let rankDesc = 'Primeros pasos en la economía circular escolar';
  let levelRange = 'Niveles 1 a 5';
  let minPts = 0;
  let maxPts = 249;

  if (levelNum <= 5) {
    rankKey = 'principiante';
    rankTitle = 'Principiante';
    rankIcon = '🌱';
    rankColor = '#10b981';
    rankDesc = 'Primeros pasos en la economía circular escolar';
    levelRange = 'Niveles 1 a 5';
    minPts = 0;
    maxPts = 249;
  } else if (levelNum <= 10) {
    rankKey = 'colaborador';
    rankTitle = 'Colaborador Activo';
    rankIcon = '🤝';
    rankColor = '#2563eb';
    rankDesc = 'Participación constante intercambiando y ayudando';
    levelRange = 'Niveles 6 a 10';
    minPts = 250;
    maxPts = 749;
  } else if (levelNum <= 15) {
    rankKey = 'solidario';
    rankTitle = 'Estudiante Solidario';
    rankIcon = '🌟';
    rankColor = '#f59e0b';
    rankDesc = 'Pilar de generosidad y apoyo en la comunidad estudiantil';
    levelRange = 'Niveles 11 a 15';
    minPts = 750;
    maxPts = 1499;
  } else if (levelNum <= 20) {
    rankKey = 'lider';
    rankTitle = 'Líder Comunitario';
    rankIcon = '🏆';
    rankColor = '#8b5cf6';
    rankDesc = 'Referente escolar con gran impacto ambiental y social';
    levelRange = 'Niveles 16 a 20';
    minPts = 1500;
    maxPts = 2499;
  } else {
    rankKey = 'leyenda';
    rankTitle = 'Embajador del Campus';
    rankIcon = '👑';
    rankColor = '#ec4899';
    rankDesc = 'Rango Supremo de excelencia Loop y liderazgo máximo';
    levelRange = 'Niveles 21 a 25';
    minPts = 2500;
    maxPts = 3600;
  }

  const currentBase = levelMinPoints[levelNum - 1] || 0;
  const nextTarget = levelNum < maxLevel ? (levelMinPoints[levelNum] || currentBase + 30) : currentBase;
  const pointsInCurrentLevel = totalPoints - currentBase;
  const levelSpan = Math.max(1, nextTarget - currentBase);
  const pointsNeeded = Math.max(0, nextTarget - totalPoints);
  const progressPct = levelNum >= maxLevel ? 100 : Math.min(100, Math.max(0, (pointsInCurrentLevel / levelSpan) * 100));

  const nextLevelNum = levelNum + 1;
  let nextRankTitle = 'Principiante 🌱';
  if (nextLevelNum <= 5) nextRankTitle = 'Principiante 🌱';
  else if (nextLevelNum <= 10) nextRankTitle = 'Colaborador Activo 🤝';
  else if (nextLevelNum <= 15) nextRankTitle = 'Estudiante Solidario 🌟';
  else if (nextLevelNum <= 20) nextRankTitle = 'Líder Comunitario 🏆';
  else nextRankTitle = 'Embajador del Campus 👑';

  return {
    level: levelNum,
    maxLevel: maxLevel,
    points: totalPoints,
    rankKey: rankKey,
    rankTitle: rankTitle,
    rankIcon: rankIcon,
    rankColor: rankColor,
    rankDesc: rankDesc,
    levelRange: levelRange,
    progressPct: progressPct,
    pointsNeeded: pointsNeeded,
    currentBase: currentBase,
    nextTarget: nextTarget,
    nextLevelNum: nextLevelNum,
    nextRankTitle: nextRankTitle,
    badgeClass: `user-level-badge rank-${rankKey}`,
    rankTagClass: `profile-rank-tag rank-${rankKey}`
  };
};

/* ==========================================================================
   MOTOR DE GAMIFICACIÓN: EVALUACIÓN DE LOGROS Y RECOMPENSAS DE XP LOOP
   ========================================================================== */
window.evaluateAllBadges = function(user, donCount, tradeCount, totalEco, activePostsCount) {
  const u = user || {};
  const dons = parseInt(donCount, 10) || 0;
  const trades = parseInt(tradeCount, 10) || 0;
  const totalOps = dons + trades;
  const ecoNum = parseFloat(totalEco) || ((dons * 3.2) + (trades * 2.5));
  const activePosts = parseInt(activePostsCount, 10) || 0;

  const hasProfileFilled = Boolean(u.name && u.institution && u.grade);
  const hasCustomAvatar = Boolean(u.avatar && u.avatar !== '👨‍🎓');
  const hasCustomBio = Boolean(u.bio && u.bio.trim().length > 10);

  const basePoints = Math.max((dons * 25) + (trades * 20), parseInt(u.loopPoints, 10) ? Math.max(0, parseInt(u.loopPoints, 10) - 1152) : 0);

  // Definición de las 36 medallas con su recompensa de XP balanceada
  const badgeDefs = [
    // 1. INICIACIÓN Y PERFIL (6 Logros)
    {
      id: 'ini-1', icon: '🌱', title: 'Semilla Solidaria', categoryKey: 'iniciacion', categoryName: 'Iniciación',
      tier: 'bronce', tierName: 'Bronce', tierIcon: '🥉', xpReward: 5,
      desc: 'Completa tu primer intercambio o donación entregada en la plataforma.',
      check: (pts, lvl) => totalOps >= 1,
      currentVal: () => totalOps, targetVal: 1,
      calcProgress: () => Math.min(100, Math.round((totalOps / 1) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${totalOps}/1)`
    },
    {
      id: 'ini-2', icon: '🎓', title: 'Perfil Estelar', categoryKey: 'iniciacion', categoryName: 'Iniciación',
      tier: 'bronce', tierName: 'Bronce', tierIcon: '🥉', xpReward: 3,
      desc: 'Completa tu nombre, sede educativa y grado en tu configuración.',
      check: (pts, lvl) => hasProfileFilled,
      currentVal: () => hasProfileFilled ? 1 : 0, targetVal: 1,
      calcProgress: () => hasProfileFilled ? 100 : 0,
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : '🔒 Datos pendientes'
    },
    {
      id: 'ini-3', icon: '📸', title: 'Identidad Propia', categoryKey: 'iniciacion', categoryName: 'Iniciación',
      tier: 'bronce', tierName: 'Bronce', tierIcon: '🥉', xpReward: 3,
      desc: 'Personaliza tu foto de perfil o avatar con tu estilo propio.',
      check: (pts, lvl) => hasCustomAvatar,
      currentVal: () => hasCustomAvatar ? 1 : 0, targetVal: 1,
      calcProgress: () => hasCustomAvatar ? 100 : 0,
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : '🔒 Cambia tu avatar'
    },
    {
      id: 'ini-4', icon: '✍️', title: 'Biografía Escolar', categoryKey: 'iniciacion', categoryName: 'Iniciación',
      tier: 'bronce', tierName: 'Bronce', tierIcon: '🥉', xpReward: 3,
      desc: 'Escribe sobre tus gustos o materias de interés en tu perfil.',
      check: (pts, lvl) => hasCustomBio,
      currentVal: () => hasCustomBio ? 1 : 0, targetVal: 1,
      calcProgress: () => hasCustomBio ? 100 : 0,
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : '🔒 Agrega tu biografía'
    },
    {
      id: 'ini-5', icon: '📦', title: 'Primer Publicador', categoryKey: 'iniciacion', categoryName: 'Iniciación',
      tier: 'bronce', tierName: 'Bronce', tierIcon: '🥉', xpReward: 5,
      desc: 'Publica al menos 1 recurso activo o completado en el catálogo.',
      check: (pts, lvl) => totalOps >= 1 || activePosts >= 1,
      currentVal: () => Math.max(totalOps, activePosts), targetVal: 1,
      calcProgress: () => (totalOps >= 1 || activePosts >= 1) ? 100 : 0,
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : '🔒 Publica un recurso'
    },
    {
      id: 'ini-6', icon: '📚', title: 'Catálogo Variado', categoryKey: 'iniciacion', categoryName: 'Iniciación',
      tier: 'plata', tierName: 'Plata', tierIcon: '🥈', xpReward: 10,
      desc: 'Publica o gestiona 3 recursos estudiantiles en tu inventario.',
      check: (pts, lvl) => totalOps >= 3 || activePosts >= 3,
      currentVal: () => Math.max(totalOps, activePosts), targetVal: 3,
      calcProgress: () => Math.min(100, Math.round((Math.max(totalOps, activePosts) / 3) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${Math.max(totalOps, activePosts)}/3)`
    },

    // 2. DONACIONES SOLIDARIAS (6 Logros)
    {
      id: 'don-1', icon: '🎁', title: 'Donante Solidario', categoryKey: 'donaciones', categoryName: 'Donaciones',
      tier: 'bronce', tierName: 'Bronce', tierIcon: '🥉', xpReward: 6,
      desc: 'Realiza 3 o más donaciones altruistas entregadas.',
      check: (pts, lvl) => dons >= 3,
      currentVal: () => dons, targetVal: 3,
      calcProgress: () => Math.min(100, Math.round((dons / 3) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${dons}/3)`
    },
    {
      id: 'don-2', icon: '📖', title: 'Guardián de Útiles', categoryKey: 'donaciones', categoryName: 'Donaciones',
      tier: 'plata', tierName: 'Plata', tierIcon: '🥈', xpReward: 12,
      desc: 'Realiza 5 donaciones de material de estudio o libros.',
      check: (pts, lvl) => dons >= 5,
      currentVal: () => dons, targetVal: 5,
      calcProgress: () => Math.min(100, Math.round((dons / 5) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${dons}/5)`
    },
    {
      id: 'don-3', icon: '💖', title: 'Corazón Generoso', categoryKey: 'donaciones', categoryName: 'Donaciones',
      tier: 'oro', tierName: 'Oro', tierIcon: '🥇', xpReward: 20,
      desc: 'Entrega 8 donaciones altruistas en el campus escolar.',
      check: (pts, lvl) => dons >= 8,
      currentVal: () => dons, targetVal: 8,
      calcProgress: () => Math.min(100, Math.round((dons / 8) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${dons}/8)`
    },
    {
      id: 'don-4', icon: '✨', title: 'Héroe del Campus', categoryKey: 'donaciones', categoryName: 'Donaciones',
      tier: 'oro', tierName: 'Oro', tierIcon: '🥇', xpReward: 30,
      desc: 'Entrega 12 o más recursos donados a tus compañeros.',
      check: (pts, lvl) => dons >= 12,
      currentVal: () => dons, targetVal: 12,
      calcProgress: () => Math.min(100, Math.round((dons / 12) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${dons}/12)`
    },
    {
      id: 'don-5', icon: '🌟', title: 'Gran Benefactor', categoryKey: 'donaciones', categoryName: 'Donaciones',
      tier: 'diamante', tierName: 'Diamante', tierIcon: '💎', xpReward: 45,
      desc: 'Realiza 18 donaciones altruistas entregadas con éxito.',
      check: (pts, lvl) => dons >= 18,
      currentVal: () => dons, targetVal: 18,
      calcProgress: () => Math.min(100, Math.round((dons / 18) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${dons}/18)`
    },
    {
      id: 'don-6', icon: '🕊️', title: 'Filántropo Supremo', categoryKey: 'donaciones', categoryName: 'Donaciones',
      tier: 'epico', tierName: 'Épico', tierIcon: '🔮', xpReward: 75,
      desc: 'Alcanza 25 donaciones completadas en la plataforma.',
      check: (pts, lvl) => dons >= 25,
      currentVal: () => dons, targetVal: 25,
      calcProgress: () => Math.min(100, Math.round((dons / 25) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${dons}/25)`
    },

    // 3. TRUEQUES Y RECURSOS (6 Logros)
    {
      id: 'tr-1', icon: '⇄', title: 'Maestro del Trueque', categoryKey: 'trueques', categoryName: 'Trueques',
      tier: 'bronce', tierName: 'Bronce', tierIcon: '🥉', xpReward: 6,
      desc: 'Concreta 3 intercambios de recursos escolares con éxito.',
      check: (pts, lvl) => trades >= 3,
      currentVal: () => trades, targetVal: 3,
      calcProgress: () => Math.min(100, Math.round((trades / 3) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${trades}/3)`
    },
    {
      id: 'tr-2', icon: '⚡', title: 'Negociador Experto', categoryKey: 'trueques', categoryName: 'Trueques',
      tier: 'plata', tierName: 'Plata', tierIcon: '🥈', xpReward: 12,
      desc: 'Completa 5 trueques escolares en coordinación con tus pares.',
      check: (pts, lvl) => trades >= 5,
      currentVal: () => trades, targetVal: 5,
      calcProgress: () => Math.min(100, Math.round((trades / 5) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${trades}/5)`
    },
    {
      id: 'tr-3', icon: '🔄', title: 'Comercio Justo', categoryKey: 'trueques', categoryName: 'Trueques',
      tier: 'oro', tierName: 'Oro', tierIcon: '🥇', xpReward: 20,
      desc: 'Completa 8 intercambios de artículos académicos.',
      check: (pts, lvl) => trades >= 8,
      currentVal: () => trades, targetVal: 8,
      calcProgress: () => Math.min(100, Math.round((trades / 8) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${trades}/8)`
    },
    {
      id: 'tr-4', icon: '🤝', title: 'Red Colaborativa', categoryKey: 'trueques', categoryName: 'Trueques',
      tier: 'oro', tierName: 'Oro', tierIcon: '🥇', xpReward: 30,
      desc: 'Completa 12 o más trueques colaborativos en el colegio.',
      check: (pts, lvl) => trades >= 12,
      currentVal: () => trades, targetVal: 12,
      calcProgress: () => Math.min(100, Math.round((trades / 12) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${trades}/12)`
    },
    {
      id: 'tr-5', icon: '🔥', title: 'Pacto de Honor', categoryKey: 'trueques', categoryName: 'Trueques',
      tier: 'diamante', tierName: 'Diamante', tierIcon: '💎', xpReward: 45,
      desc: 'Concreta 18 intercambios completados con éxito.',
      check: (pts, lvl) => trades >= 18,
      currentVal: () => trades, targetVal: 18,
      calcProgress: () => Math.min(100, Math.round((trades / 18) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${trades}/18)`
    },
    {
      id: 'tr-6', icon: '🌐', title: 'Economista Circular', categoryKey: 'trueques', categoryName: 'Trueques',
      tier: 'epico', tierName: 'Épico', tierIcon: '🔮', xpReward: 75,
      desc: 'Alcanza 25 intercambios de material escolar en el campus.',
      check: (pts, lvl) => trades >= 25,
      currentVal: () => trades, targetVal: 25,
      calcProgress: () => Math.min(100, Math.round((trades / 25) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${trades}/25)`
    },

    // 4. PUNTOS LOOP Y PROSPERIDAD (6 Logros)
    {
      id: 'pts-1', icon: '🪙', title: 'Primeros Ahorros', categoryKey: 'puntos', categoryName: 'Puntos Loop',
      tier: 'bronce', tierName: 'Bronce', tierIcon: '🥉', xpReward: 6,
      desc: 'Acumula tus primeros 50 Puntos Loop en tu balance.',
      check: (pts, lvl) => pts >= 50,
      currentVal: (pts) => pts, targetVal: 50,
      calcProgress: (pts) => Math.min(100, Math.round((pts / 50) * 100)),
      statusText: (unlocked, pts) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${pts}/50 pts)`
    },
    {
      id: 'pts-2', icon: '🌟', title: 'Líder Loop', categoryKey: 'puntos', categoryName: 'Puntos Loop',
      tier: 'plata', tierName: 'Plata', tierIcon: '🥈', xpReward: 12,
      desc: 'Alcanza más de 150 Puntos Loop en tu cuenta.',
      check: (pts, lvl) => pts >= 150,
      currentVal: (pts) => pts, targetVal: 150,
      calcProgress: (pts) => Math.min(100, Math.round((pts / 150) * 100)),
      statusText: (unlocked, pts) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${pts}/150 pts)`
    },
    {
      id: 'pts-3', icon: '💎', title: 'Bóveda Diamante', categoryKey: 'puntos', categoryName: 'Puntos Loop',
      tier: 'oro', tierName: 'Oro', tierIcon: '🥇', xpReward: 25,
      desc: 'Acumula más de 400 Puntos Loop participando activamente.',
      check: (pts, lvl) => pts >= 400,
      currentVal: (pts) => pts, targetVal: 400,
      calcProgress: (pts) => Math.min(100, Math.round((pts / 400) * 100)),
      statusText: (unlocked, pts) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${pts}/400 pts)`
    },
    {
      id: 'pts-4', icon: '🏆', title: 'Campeón Supremo', categoryKey: 'puntos', categoryName: 'Puntos Loop',
      tier: 'diamante', tierName: 'Diamante', tierIcon: '💎', xpReward: 45,
      desc: 'Acumula 800 o más Puntos Loop en la plataforma.',
      check: (pts, lvl) => pts >= 800,
      currentVal: (pts) => pts, targetVal: 800,
      calcProgress: (pts) => Math.min(100, Math.round((pts / 800) * 100)),
      statusText: (unlocked, pts) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${pts}/800 pts)`
    },
    {
      id: 'pts-5', icon: '👑', title: 'Millonario Loop', categoryKey: 'puntos', categoryName: 'Puntos Loop',
      tier: 'epico', tierName: 'Épico', tierIcon: '🔮', xpReward: 70,
      desc: 'Acumula 1,500 Puntos Loop en tu balance escolar.',
      check: (pts, lvl) => pts >= 1500,
      currentVal: (pts) => pts, targetVal: 1500,
      calcProgress: (pts) => Math.min(100, Math.round((pts / 1500) * 100)),
      statusText: (unlocked, pts) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${pts}/1500 pts)`
    },
    {
      id: 'pts-6', icon: '🌌', title: 'Fortuna Estudiantil', categoryKey: 'puntos', categoryName: 'Puntos Loop',
      tier: 'epico', tierName: 'Épico', tierIcon: '🔮', xpReward: 100,
      desc: 'Alcanza la colosal marca de 2,500 Puntos Loop acumulados.',
      check: (pts, lvl) => pts >= 2500,
      currentVal: (pts) => pts, targetVal: 2500,
      calcProgress: (pts) => Math.min(100, Math.round((pts / 2500) * 100)),
      statusText: (unlocked, pts) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${pts}/2500 pts)`
    },

    // 5. ECOLOGÍA Y SOSTENIBILIDAD (6 Logros)
    {
      id: 'eco-1', icon: '🌱', title: 'Semilla Verde', categoryKey: 'ecologia', categoryName: 'Ecología',
      tier: 'bronce', tierName: 'Bronce', tierIcon: '🥉', xpReward: 5,
      desc: 'Ahorra tus primeros 2.0 kg de huella de carbono ecológica.',
      check: (pts, lvl) => ecoNum >= 2.0,
      currentVal: () => ecoNum, targetVal: 2.0,
      calcProgress: () => Math.min(100, Math.round((ecoNum / 2.0) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${ecoNum.toFixed(1)}/2.0 kg)`
    },
    {
      id: 'eco-2', icon: '🌿', title: 'Eco-Lover', categoryKey: 'ecologia', categoryName: 'Ecología',
      tier: 'plata', tierName: 'Plata', tierIcon: '🥈', xpReward: 12,
      desc: 'Ahorra más de 8.0 kg de huella de carbono en el campus.',
      check: (pts, lvl) => ecoNum >= 8.0,
      currentVal: () => ecoNum, targetVal: 8.0,
      calcProgress: () => Math.min(100, Math.round((ecoNum / 8.0) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${ecoNum.toFixed(1)}/8.0 kg)`
    },
    {
      id: 'eco-3', icon: '🍃', title: 'Impacto Verde', categoryKey: 'ecologia', categoryName: 'Ecología',
      tier: 'oro', tierName: 'Oro', tierIcon: '🥇', xpReward: 20,
      desc: 'Ahorra más de 20.0 kg de emisiones evitando útiles nuevos.',
      check: (pts, lvl) => ecoNum >= 20.0,
      currentVal: () => ecoNum, targetVal: 20.0,
      calcProgress: () => Math.min(100, Math.round((ecoNum / 20.0) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${ecoNum.toFixed(1)}/20.0 kg)`
    },
    {
      id: 'eco-4', icon: '🌍', title: 'Guardián del Planeta', categoryKey: 'ecologia', categoryName: 'Ecología',
      tier: 'oro', tierName: 'Oro', tierIcon: '🥇', xpReward: 30,
      desc: 'Ahorra más de 40.0 kg de huella de carbono escolar.',
      check: (pts, lvl) => ecoNum >= 40.0,
      currentVal: () => ecoNum, targetVal: 40.0,
      calcProgress: () => Math.min(100, Math.round((ecoNum / 40.0) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${ecoNum.toFixed(1)}/40.0 kg)`
    },
    {
      id: 'eco-5', icon: '🌳', title: 'Bosque Escolar', categoryKey: 'ecologia', categoryName: 'Ecología',
      tier: 'diamante', tierName: 'Diamante', tierIcon: '💎', xpReward: 45,
      desc: 'Ahorra más de 75.0 kg de huella ecológica evitando residuos.',
      check: (pts, lvl) => ecoNum >= 75.0,
      currentVal: () => ecoNum, targetVal: 75.0,
      calcProgress: () => Math.min(100, Math.round((ecoNum / 75.0) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${ecoNum.toFixed(1)}/75.0 kg)`
    },
    {
      id: 'eco-6', icon: '♻️', title: 'Cero Residuos', categoryKey: 'ecologia', categoryName: 'Ecología',
      tier: 'epico', tierName: 'Épico', tierIcon: '🔮', xpReward: 75,
      desc: 'Supera los 120.0 kg de huella de carbono ahorrados.',
      check: (pts, lvl) => ecoNum >= 120.0,
      currentVal: () => ecoNum, targetVal: 120.0,
      calcProgress: () => Math.min(100, Math.round((ecoNum / 120.0) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${ecoNum.toFixed(1)}/120.0 kg)`
    },

    // 6. PRESTIGIO Y LEYENDAS (6 Logros)
    {
      id: 'pres-1', icon: '⭐', title: 'Rango Colaborador', categoryKey: 'prestigio', categoryName: 'Prestigio',
      tier: 'plata', tierName: 'Plata', tierIcon: '🥈', xpReward: 12,
      desc: 'Alcanza el Rango Colaborador Activo (Nivel 6).',
      check: (pts, lvl) => lvl >= 6,
      currentVal: (pts, lvl) => lvl, targetVal: 6,
      calcProgress: (pts, lvl) => Math.min(100, Math.round((lvl / 6) * 100)),
      statusText: (unlocked, pts, lvl) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (Nivel ${lvl}/6)`
    },
    {
      id: 'pres-2', icon: '🌟', title: 'Rango Solidario', categoryKey: 'prestigio', categoryName: 'Prestigio',
      tier: 'oro', tierName: 'Oro', tierIcon: '🥇', xpReward: 20,
      desc: 'Alcanza el Rango Estudiante Solidario (Nivel 11).',
      check: (pts, lvl) => lvl >= 11,
      currentVal: (pts, lvl) => lvl, targetVal: 11,
      calcProgress: (pts, lvl) => Math.min(100, Math.round((lvl / 11) * 100)),
      statusText: (unlocked, pts, lvl) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (Nivel ${lvl}/11)`
    },
    {
      id: 'pres-3', icon: '🏆', title: 'Rango Líder', categoryKey: 'prestigio', categoryName: 'Prestigio',
      tier: 'oro', tierName: 'Oro', tierIcon: '🥇', xpReward: 35,
      desc: 'Alcanza el Rango Líder Comunitario (Nivel 16).',
      check: (pts, lvl) => lvl >= 16,
      currentVal: (pts, lvl) => lvl, targetVal: 16,
      calcProgress: (pts, lvl) => Math.min(100, Math.round((lvl / 16) * 100)),
      statusText: (unlocked, pts, lvl) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (Nivel ${lvl}/16)`
    },
    {
      id: 'pres-4', icon: '👑', title: 'Embajador Supremo', categoryKey: 'prestigio', categoryName: 'Prestigio',
      tier: 'diamante', tierName: 'Diamante', tierIcon: '💎', xpReward: 55,
      desc: 'Alcanza el Rango Embajador del Campus (Nivel 21+).',
      check: (pts, lvl) => lvl >= 21,
      currentVal: (pts, lvl) => lvl, targetVal: 21,
      calcProgress: (pts, lvl) => Math.min(100, Math.round((lvl / 21) * 100)),
      statusText: (unlocked, pts, lvl) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (Nivel ${lvl}/21)`
    },
    {
      id: 'pres-5', icon: '🌠', title: 'Leyenda de US-Loop', categoryKey: 'prestigio', categoryName: 'Prestigio',
      tier: 'epico', tierName: 'Épico', tierIcon: '🔮', xpReward: 80,
      desc: 'Completa 30 transacciones totales (donaciones + trueques).',
      check: (pts, lvl) => totalOps >= 30,
      currentVal: () => totalOps, targetVal: 30,
      calcProgress: () => Math.min(100, Math.round((totalOps / 30) * 100)),
      statusText: (unlocked) => unlocked ? '✓ Desbloqueada' : `🔒 En progreso (${totalOps}/30)`
    },
    {
      id: 'pres-6', icon: '🏛️👑', title: 'Ícono Institucional', categoryKey: 'prestigio', categoryName: 'Prestigio',
      tier: 'epico', tierName: 'Épico', tierIcon: '🔮', xpReward: 100,
      desc: 'Alcanza el Nivel 25 Supremo. ¡Desbloquea el Avatar Exclusivo y Emblema de Honor "Ícono Institucional"!',
      check: (pts, lvl) => lvl >= 25,
      currentVal: (pts, lvl) => lvl, targetVal: 25,
      calcProgress: (pts, lvl) => Math.min(100, Math.round((lvl / 25) * 100)),
      statusText: (unlocked, pts, lvl) => unlocked ? '✓ ¡Ícono Supremo Desbloqueado!' : `🔒 En progreso (Nivel ${lvl}/25)`
    }
  ];

  // Cálculo convergente en hasta 4 pasadas
  let runningPoints = basePoints;
  let runningLevel = window.calculateUserLevelInfo ? window.calculateUserLevelInfo(runningPoints).level : 1;
  let unlockedBonus = 0;

  for (let pass = 0; pass < 4; pass++) {
    unlockedBonus = 0;
    badgeDefs.forEach(b => {
      const isUnl = b.check(runningPoints, runningLevel);
      if (isUnl) {
        unlockedBonus += b.xpReward;
      }
    });
    const newTotal = basePoints + unlockedBonus;
    const newLevel = window.calculateUserLevelInfo ? window.calculateUserLevelInfo(newTotal).level : 1;
    if (newTotal === runningPoints && newLevel === runningLevel) {
      break;
    }
    runningPoints = newTotal;
    runningLevel = newLevel;
  }

  const finalTotalPoints = basePoints + unlockedBonus;
  const finalLevelInfo = window.calculateUserLevelInfo
    ? window.calculateUserLevelInfo(finalTotalPoints)
    : { level: 1, maxLevel: 25, progressPct: 0, pointsNeeded: 30, nextTarget: 30, nextLevelNum: 2, rankKey: 'principiante', rankTitle: 'Principiante', rankIcon: '🌱' };

  // Construir objetos de insignias finales con todos los metadatos necesarios
  const finalBadges = badgeDefs.map(b => {
    const isUnl = b.check(finalTotalPoints, finalLevelInfo.level);
    const curVal = typeof b.currentVal === 'function' ? b.currentVal(finalTotalPoints, finalLevelInfo.level) : b.currentVal;
    const prog = typeof b.calcProgress === 'function' ? b.calcProgress(finalTotalPoints, finalLevelInfo.level) : 0;
    const stText = typeof b.statusText === 'function' ? b.statusText(isUnl, finalTotalPoints, finalLevelInfo.level) : (isUnl ? '✓ Desbloqueada' : '🔒 Bloqueada');

    return {
      id: b.id,
      icon: b.icon,
      title: b.title,
      categoryKey: b.categoryKey,
      categoryName: b.categoryName,
      tier: b.tier,
      tierName: b.tierName,
      tierIcon: b.tierIcon,
      xpReward: b.xpReward,
      desc: b.desc,
      unlocked: isUnl,
      currentVal: curVal,
      targetVal: b.targetVal,
      progressPct: Math.min(100, Math.max(0, prog)),
      status: stText
    };
  });

  return {
    badges: finalBadges,
    basePoints: basePoints,
    achievementBonus: unlockedBonus,
    totalPoints: finalTotalPoints,
    unlockedCount: finalBadges.filter(b => b.unlocked).length,
    totalBadges: finalBadges.length,
    levelInfo: finalLevelInfo
  };
};

/* ==========================================================================
   SISTEMA DE CONFIRMACIÓN MUTUA DE ENTREGA (2 CUENTAS REQUERIDAS)
   ========================================================================== */
window.handleMutualDeliveryConfirmation = async function(requestId) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (!currentUser || (!currentUser.email && !currentUser.name)) {
    if (window.showCustomAlert) {
      window.showCustomAlert({ title: 'Iniciar sesión', message: 'Debes iniciar sesión para confirmar la entrega.', icon: '🔒' });
    }
    return;
  }

  const currentEmail = (currentUser.email || '').trim().toLowerCase();
  const currentName = (currentUser.name || '').trim().toLowerCase();

  let requests = [];
  if (window.USLoopAPI) {
    requests = await window.USLoopAPI.getRequests();
  } else {
    requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
  }

  const req = requests.find(r => String(r.id) === String(requestId));
  if (!req) return;

  const isDonation = (req.itemType || req.type) === 'donation';
  const points = isDonation ? 25 : 20;

  const targetEmail = (req.targetAuthorEmail || req.target_author_email || '').trim().toLowerCase();
  const targetName = (req.targetAuthorName || req.target_author_name || '').trim().toLowerCase();
  const reqEmail = (req.requesterEmail || req.requester_email || '').trim().toLowerCase();
  const reqName = (req.requesterName || req.requester_name || '').trim().toLowerCase();

  const donorHasConfirmed = req.status === 'accepted_donor_confirmed' || req.status === 'completed' || !!(req.donorConfirmed || req.donor_confirmed);
  const requesterHasConfirmed = req.status === 'accepted_requester_confirmed' || req.status === 'completed' || !!(req.requesterConfirmed || req.requester_confirmed);

  // Verificar si es donante o solicitante
  let isDonor = (currentEmail && targetEmail && currentEmail === targetEmail) ||
                (currentName && targetName && (currentName === targetName || currentName.includes(targetName) || targetName.includes(currentName)));
  let isRequester = (currentEmail && reqEmail && currentEmail === reqEmail) ||
                    (currentName && reqName && (currentName === reqName || currentName.includes(reqName) || reqName.includes(currentName)));

  if (!isDonor && !isRequester) {
    const myDonations = JSON.parse(localStorage.getItem('donations') || '[]');
    const myExchanges = JSON.parse(localStorage.getItem('exchanges') || '[]');
    const ownsItem = myDonations.some(d => String(d.id) === String(req.itemId) || (d.title || '').trim().toLowerCase() === (req.itemTitle || '').trim().toLowerCase()) ||
                     myExchanges.some(e => String(e.id) === String(req.itemId) || (e.offering || '').trim().toLowerCase() === (req.itemTitle || '').trim().toLowerCase());
    if (ownsItem) {
      isDonor = true;
    } else {
      isRequester = true;
    }
  }

  const role = isDonor ? 'donor' : 'requester';
  const partnerName = isDonor ? (req.requesterName || 'Compañero') : (req.targetAuthorName || 'Donante');
  const itemTitle = req.itemTitle || 'el recurso';

  const alreadyConfirmedByMe = isDonor ? donorHasConfirmed : requesterHasConfirmed;
  const alreadyConfirmedByPartner = isDonor ? requesterHasConfirmed : donorHasConfirmed;

  if (alreadyConfirmedByMe) {
    if (window.showCustomAlert) {
      window.showCustomAlert({
        title: '⏳ Esperando a tu compañero',
        message: `Ya has dado tu permiso y confirmado la entrega de "${itemTitle}".\n\nFalta que ${partnerName} también confirme la entrega desde su cuenta para finalizar y sumar los +${points} Puntos Loop.`,
        icon: '⏳',
        confirmText: 'Entendido'
      });
    }
    return;
  }

  const confirmTitle = isDonation
    ? (isDonor ? '¿Confirmar Entrega de Donación?' : '¿Confirmar Recepción de Donación?')
    : '¿Confirmar Trueque Realizado?';

  let confirmMsg = '';
  let confirmBtnText = '';

  if (isDonation) {
    if (isDonor) {
      confirmMsg = alreadyConfirmedByPartner
        ? `🔔 ${partnerName} ya ha confirmado que recibió "${itemTitle}".\n\n¿Confirmas tú también la entrega para finalizar la donación y sumar tus +25 Puntos Loop?`
        : `¿Confirmas que ya realizaste la entrega de "${itemTitle}" a ${partnerName}?\n\nPara finalizar se requiere que ambas cuentas confirmen la entrega. Al completarse, sumarás tus +25 Puntos Loop de donante solidario.`;
      confirmBtnText = '✓ Sí, Confirmar Entrega (+25 pts)';
    } else {
      confirmMsg = alreadyConfirmedByPartner
        ? `🔔 ${partnerName} ya ha confirmado la entrega de "${itemTitle}".\n\n¿Confirmas tú también que ya recibiste el recurso para dar por finalizada la donación?`
        : `¿Confirmas que ya recibiste "${itemTitle}" de parte de ${partnerName}?\n\nAl confirmar ambos, la donación quedará registrada como completada en la plataforma escolar.`;
      confirmBtnText = '✓ Sí, Confirmar Recepción';
    }
  } else {
    confirmMsg = alreadyConfirmedByPartner
      ? `🔔 ${partnerName} ya ha confirmado el trueque de "${itemTitle}".\n\n¿Confirmas tú también que realizaron el intercambio para finalizar y sumar tus +20 Puntos Loop?`
      : `¿Confirmas que ya se realizó el trueque de "${itemTitle}" con ${partnerName}?\n\nPara finalizar se requiere que ambas cuentas den su confirmación. Al completarse, ambos sumarán +20 Puntos Loop.`;
    confirmBtnText = '✓ Sí, Confirmar Trueque (+20 pts)';
  }

  const userConfirmed = window.showCustomConfirm
    ? await window.showCustomConfirm({
        title: confirmTitle,
        message: confirmMsg,
        icon: isDonation ? '🎁' : '🤝',
        confirmText: confirmBtnText,
        cancelText: 'Cancelar'
      })
    : confirm(confirmMsg);

  if (!userConfirmed) return;

  // Registrar confirmación en servidor y local
  const result = await window.USLoopAPI.confirmDelivery(req.id, role);
  const isBoth = result && (result.bothConfirmed || (result.donorConfirmed && result.requesterConfirmed));

  if (isBoth) {
    // 1. Finalizar recurso en catálogo y servidor
    if (isDonation) {
      await window.USLoopAPI.finishDonation(req.itemId);
    } else {
      await window.USLoopAPI.completeExchange(req.itemId);
    }

    // 2. Limpieza en inventario local (por id o título)
    if (isDonation) {
      let donations = JSON.parse(localStorage.getItem('donations') || '[]');
      donations = donations.filter(d => String(d.id) !== String(req.itemId) && (d.title || '').trim().toLowerCase() !== (itemTitle || '').trim().toLowerCase());
      localStorage.setItem('donations', JSON.stringify(donations));
    } else {
      let exchanges = JSON.parse(localStorage.getItem('exchanges') || '[]');
      exchanges = exchanges.filter(e => String(e.id) !== String(req.itemId) && (e.offering || '').trim().toLowerCase() !== (itemTitle || '').trim().toLowerCase());
      localStorage.setItem('exchanges', JSON.stringify(exchanges));
    }

    // 3. Marcar solicitud como completed en localStorage
    let allReqs = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
    const rIdx = allReqs.findIndex(r => String(r.id) === String(req.id));
    if (rIdx !== -1) {
      allReqs[rIdx].status = 'completed';
      allReqs[rIdx].donorConfirmed = true;
      allReqs[rIdx].requesterConfirmed = true;
      localStorage.setItem('tradeRequests', JSON.stringify(allReqs));
    }

    // 4. Actualizar puntos de la cuenta actual
    if (currentUser.email) {
      if (isDonation) {
        if (isDonor) {
          // Solo quien hizo la donación suma +25 pts y donación completada
          await window.USLoopAPI.updateUserStats(currentUser.email, 'donation');
          currentUser.completedDonations = (currentUser.completedDonations || 0) + 1;
          currentUser.loopPoints = ((currentUser.completedDonations || 0) * 25) + ((currentUser.completedTrades || 0) * 20);
          currentUser.ecoSaved = parseFloat((((currentUser.completedDonations || 0) * 3.2) + ((currentUser.completedTrades || 0) * 2.5)).toFixed(1));
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
      } else {
        // En trueque ambos suman +20 pts
        await window.USLoopAPI.updateUserStats(currentUser.email, 'trade');
        currentUser.completedTrades = (currentUser.completedTrades || 0) + 1;
        currentUser.loopPoints = ((currentUser.completedDonations || 0) * 25) + ((currentUser.completedTrades || 0) * 20);
        currentUser.ecoSaved = parseFloat((((currentUser.completedDonations || 0) * 3.2) + ((currentUser.completedTrades || 0) * 2.5)).toFixed(1));
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
    }

    // 5. Actualizar puntos de la otra cuenta
    const partnerEmail = isDonor ? req.requesterEmail : req.targetAuthorEmail;
    if (partnerEmail) {
      if (isDonation) {
        if (!isDonor) {
          // Si el usuario actual fue el receptor, el compañero es el donante (+25 pts)
          await window.USLoopAPI.updateUserStats(partnerEmail, 'donation');
          try {
            let users = JSON.parse(localStorage.getItem('users') || '[]');
            const pIdx = users.findIndex(u => (u.email || '').toLowerCase() === partnerEmail.toLowerCase());
            if (pIdx !== -1) {
              users[pIdx].completedDonations = (users[pIdx].completedDonations || 0) + 1;
              users[pIdx].loopPoints = ((users[pIdx].completedDonations || 0) * 25) + ((users[pIdx].completedTrades || 0) * 20);
              users[pIdx].ecoSaved = parseFloat((((users[pIdx].completedDonations || 0) * 3.2) + ((users[pIdx].completedTrades || 0) * 2.5)).toFixed(1));
              localStorage.setItem('users', JSON.stringify(users));
            }
          } catch (e) {}
        }
      } else {
        // En trueque el compañero también suma +20 pts
        await window.USLoopAPI.updateUserStats(partnerEmail, 'trade');
        try {
          let users = JSON.parse(localStorage.getItem('users') || '[]');
          const pIdx = users.findIndex(u => (u.email || '').toLowerCase() === partnerEmail.toLowerCase());
          if (pIdx !== -1) {
            users[pIdx].completedTrades = (users[pIdx].completedTrades || 0) + 1;
            users[pIdx].loopPoints = ((users[pIdx].completedDonations || 0) * 25) + ((users[pIdx].completedTrades || 0) * 20);
            users[pIdx].ecoSaved = parseFloat((((users[pIdx].completedDonations || 0) * 3.2) + ((users[pIdx].completedTrades || 0) * 2.5)).toFixed(1));
            localStorage.setItem('users', JSON.stringify(users));
          }
        } catch (e) {}
      }
    }

    if (window.showCustomAlert) {
      let successMsg = '';
      if (isDonation) {
        if (isDonor) {
          successMsg = `¡Ambas cuentas (${currentUser.name} y ${partnerName}) han confirmado la entrega de "${itemTitle}"!\n\n¡Gracias por tu generosidad solidaria! Se han sumado +25 Puntos Loop a tu cuenta y se ha completado la donación con éxito.`;
        } else {
          successMsg = `¡Ambas cuentas (${currentUser.name} y ${partnerName}) han confirmado la recepción de "${itemTitle}"!\n\nHas recibido el recurso donado por ${partnerName}. ¡El ciclo escolar se ha completado con éxito!`;
        }
      } else {
        successMsg = `¡Ambas cuentas (${currentUser.name} y ${partnerName}) han confirmado el trueque de "${itemTitle}"!\n\nSe han sumado +20 Puntos Loop a tu cuenta y se ha completado el intercambio escolar con éxito.`;
      }

      await window.showCustomAlert({
        title: '🎉 ¡Finalizado con Éxito!',
        message: successMsg,
        icon: isDonation ? '🎁' : '🤝',
        confirmText: '¡Genial, gracias!'
      });
    }
  } else {
    // Solo esta cuenta ha confirmado; falta la otra
    if (window.showCustomAlert) {
      let waitMsg = '';
      if (isDonation) {
        if (isDonor) {
          waitMsg = `Has confirmado la entrega con éxito.\n\nSe ha enviado una solicitud a ${partnerName} para que confirme la recepción desde su cuenta. En cuanto confirme, se sumarán tus +25 Puntos Loop y se finalizará la donación.`;
        } else {
          waitMsg = `Has confirmado la recepción con éxito.\n\nSe ha notificado a ${partnerName}. En cuanto confirme la entrega desde su cuenta, la donación quedará finalizada en la plataforma.`;
        }
      } else {
        waitMsg = `Has confirmado la entrega con éxito.\n\nSe ha enviado una solicitud a ${partnerName} para que confirme desde su cuenta. En cuanto ambos confirmen, se sumarán tus +20 Puntos Loop y se finalizará el trueque.`;
      }

      await window.showCustomAlert({
        title: '✓ Permiso Registrado (1/2)',
        message: waitMsg,
        icon: '⏳',
        confirmText: 'Entendido'
      });
    }
  }

  if (typeof window.loadUserStatsAndItems === 'function') {
    window.loadUserStatsAndItems();
  }
};

/* ==========================================================================
   MOTOR GLOBAL DE RECORDATORIOS Y NOTIFICACIONES DE DONACIÓN Y TRUEQUES
   (Alertas de decisión, confirmación mutua y recordatorios para donantes)
   ========================================================================== */
window.initDonationReminderChecker = function() {
  if (window._donationReminderInterval) return;

  async function checkPendingReminders() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser || (!currentUser.email && !currentUser.name)) return;

    const currentEmail = (currentUser.email || '').toLowerCase().trim();
    const currentName = (currentUser.name || '').toLowerCase().trim();

    let requests = [];
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(`api/requests.php?_t=${Date.now()}`, { cache: 'no-store' });
        if (res.ok) {
          const sReqs = await res.json();
          if (Array.isArray(sReqs)) {
            requests = sReqs;
            localStorage.setItem('tradeRequests', JSON.stringify(requests));
          }
        }
      } catch (e) {}
    }
    if (requests.length === 0) {
      requests = JSON.parse(localStorage.getItem('tradeRequests') || '[]');
    }

    const now = new Date();

    // -------------------------------------------------------------
    // 1. RECORDATORIOS DE DONACIÓN (PARA EL DONANTE 10-20 MIN ANTES)
    // -------------------------------------------------------------
    const myDonationReqs = requests.filter(r => {
      const rType = r.itemType || r.type || 'donation';
      if (rType !== 'donation') return false;

      const targetEmail = (r.targetAuthorEmail || r.target_author_email || '').toLowerCase().trim();
      const targetName = (r.targetAuthorName || r.target_author_name || '').toLowerCase().trim();
      const reqEmail = (r.requesterEmail || r.requester_email || '').toLowerCase().trim();
      const reqName = (r.requesterName || r.requester_name || '').toLowerCase().trim();

      // Si el usuario actual es quien pidió la donación, NO es el donante
      const isRequester = (currentEmail && reqEmail && currentEmail === reqEmail) ||
                          (currentName && reqName && (currentName === reqName || currentName.includes(reqName)));
      if (isRequester) return false;

      // Debe ser el donante objetivo
      const isTargetDonor = (currentEmail && targetEmail && currentEmail === targetEmail) ||
                            (currentName && targetName && (currentName === targetName || currentName.includes(targetName)));

      return isTargetDonor;
    });

    myDonationReqs.forEach(req => {
      if (req.status === 'rejected' || req.status === 'completed' || req.status === 'finished') return;
      if (!req.scheduledDate || !req.scheduledTime) return;

      const scheduledDt = new Date(`${req.scheduledDate}T${req.scheduledTime}:00`);
      if (isNaN(scheduledDt.getTime())) return;

      const diffMs = scheduledDt.getTime() - now.getTime();
      const diffMinutes = Math.round(diffMs / (60 * 1000));

      // Ventana de alerta: entre 20 minutos antes y hasta 10 minutos después
      if (diffMinutes <= 20 && diffMinutes >= -10) {
        const storageKey = `usloop_notified_${req.id}_${req.scheduledDate}_${req.scheduledTime}`;
        if (!sessionStorage.getItem(storageKey)) {
          sessionStorage.setItem(storageKey, 'true');

          const donorHour = req.reminderTime || '15 min antes';
          const timeMsg = `⏰ ¡Recordatorio de Donación!\n\nTienes programada la entrega de "${req.itemTitle}" con ${req.requesterName}.\n\n📌 Hora de llegada para ti (10-20 min más temprano): ${donorHour} (Hora solicitada: ${req.scheduledTime}).\n\n🏫 Entregar en coordinación, por favor (${req.targetSchool || 'tu colegio'}).`;

          if (window.showCustomAlert) {
            window.showCustomAlert({
              title: '🔔 Recordatorio de Donación: Entregar en Coordinación',
              message: timeMsg,
              icon: '🏫',
              confirmText: 'Entendido, ¡entregaré en coordinación!'
            });
          } else if (window.showCustomToast) {
            window.showCustomToast(timeMsg, 'warning');
          }

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('🔔 US-Loop: Entregar en Coordinación', {
                body: `Hora asignada: ${donorHour} (En ${diffMinutes} min) - Entregar en coordinación, por favor. Material: "${req.itemTitle}"`,
                icon: 'img/logo.png'
              });
            } catch (err) {}
          }
        }
      }
    });

    // ---------------------------------------------------------------------------------
    // 2. NOTIFICACIÓN DE RESPUESTA (ACEPTADA O RECHAZADA) PARA QUIEN PIDIÓ O PROPUSO
    // ---------------------------------------------------------------------------------
    const myRequestedItems = requests.filter(r => {
      const reqEmail = (r.requesterEmail || r.requester_email || '').toLowerCase().trim();
      const reqName = (r.requesterName || r.requester_name || '').toLowerCase().trim();

      const isRequester = (currentEmail && reqEmail && currentEmail === reqEmail) ||
                          (currentName && reqName && (currentName === reqName || currentName.includes(reqName) || reqName.includes(currentName)));
      return isRequester;
    });

    myRequestedItems.forEach(async req => {
      const status = req.status || 'pending';
      if (status !== 'accepted' && status !== 'rejected') return;

      const userIdentifier = currentUser.email || currentUser.name || 'user';
      const notifKey = `usloop_decision_notified_${userIdentifier}_${req.id}_${status}`;

      if (localStorage.getItem(notifKey)) return;
      localStorage.setItem(notifKey, 'true');

      const isDonation = (req.itemType || req.type) === 'donation';
      const isAccepted = status === 'accepted';
      const partnerName = req.targetAuthorName || req.target_author_name || (isDonation ? 'La persona que dona' : 'El compañero de trueque');
      const partnerSchool = req.targetSchool || req.target_school || req.requesterSchool || 'la sede principal';
      const itemTitle = req.itemTitle || req.item_title || 'el recurso escolar';

      let alertTitle = '';
      let alertMessage = '';
      let alertIcon = '';
      let confirmBtnText = 'Entendido';

      if (isAccepted) {
        if (isDonation) {
          alertTitle = '¡Tu Solicitud de Donación fue ACEPTADA! 🎉';
          alertMessage = `¡Excelentes noticias! ${partnerName} ha ACEPTADO tu solicitud para donarte "${itemTitle}".\n\n📅 Fecha de entrega: ${req.scheduledDate || 'Fecha programada'}\n⏰ Tu hora de encuentro: ${req.scheduledTime || 'Hora acordada'}\n🏫 Lugar: Entregar en coordinación, por favor (${partnerSchool}).\n\n¡Por favor acude a coordinación en el horario indicado para recibir tu donación!`;
          alertIcon = '🎁';
          confirmBtnText = '¡Excelente, asistiré!';
        } else {
          alertTitle = '¡Tu Propuesta de Intercambio fue ACEPTADA! 🤝';
          alertMessage = `¡Buenas noticias! ${partnerName} ha ACEPTADO tu propuesta de intercambio para "${itemTitle}"${req.offeredItem ? ` (ofreciste a cambio: "${req.offeredItem}")` : ''}.\n\n🏫 Sede educativa: ${partnerSchool}\n📞 Contacto: ${req.targetAuthorEmail || 'Puedes coordinar directamente'}\n\n¡Coordina los detalles del encuentro para realizar el trueque con éxito!`;
          alertIcon = '🤝';
          confirmBtnText = '¡Genial, de acuerdo!';
        }
      } else {
        if (isDonation) {
          alertTitle = 'Solicitud de Donación Rechazada ❌';
          alertMessage = `${partnerName} ha RECHAZADO tu solicitud para el recurso "${itemTitle}".\n\nEl donante no pudo concretar la donación en esta ocasión. ¡Puedes seguir explorando más materiales escolares disponibles en US-Loop!`;
          alertIcon = '📦';
          confirmBtnText = 'Explorar otros recursos';
        } else {
          alertTitle = 'Propuesta de Intercambio Rechazada ❌';
          alertMessage = `${partnerName} ha RECHAZADO tu propuesta de intercambio para el recurso "${itemTitle}".\n\nPuedes proponer un intercambio con otro recurso de tu interés o buscar más opciones en el catálogo escolar.`;
          alertIcon = '🔄';
          confirmBtnText = 'Ver catálogo';
        }
      }

      if (window.showCustomAlert) {
        window.showCustomAlert({
          title: alertTitle,
          message: alertMessage,
          icon: alertIcon,
          confirmText: confirmBtnText
        }).then(() => {
          if (!isAccepted && (confirmBtnText === 'Explorar otros recursos' || confirmBtnText === 'Ver catálogo')) {
            if (window.location.pathname.indexOf('explorar.html') === -1) {
              window.location.href = 'explorar.html';
            }
          }
          if (typeof window.loadUserStatsAndItems === 'function') {
            window.loadUserStatsAndItems();
          }
        });
      } else if (window.showCustomToast) {
        window.showCustomToast(alertMessage, isAccepted ? 'success' : 'warning');
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(alertTitle, {
            body: isAccepted
              ? `${partnerName} aceptó tu ${isDonation ? 'solicitud de donación' : 'propuesta de intercambio'} para "${itemTitle}".`
              : `${partnerName} rechazó tu ${isDonation ? 'solicitud de donación' : 'propuesta de intercambio'} para "${itemTitle}".`,
            icon: 'img/logo.png'
          });
        } catch (err) {}
      }
    });

    // ---------------------------------------------------------------------------------
    // 3. SOLICITUD DE CONFIRMACIÓN MUTUA PARA FINALIZAR (2 CUENTAS REQUERIDAS)
    // ---------------------------------------------------------------------------------
    requests.forEach(req => {
      if (req.status !== 'accepted') return;

      const targetEmail = (req.targetAuthorEmail || req.target_author_email || '').toLowerCase().trim();
      const targetName = (req.targetAuthorName || req.target_author_name || '').toLowerCase().trim();
      const reqEmail = (req.requesterEmail || req.requester_email || '').toLowerCase().trim();
      const reqName = (req.requesterName || req.requester_name || '').toLowerCase().trim();

      const isDonor = (currentEmail && targetEmail && currentEmail === targetEmail) ||
                      (currentName && targetName && (currentName === targetName || currentName.includes(targetName)));
      const isRequester = (currentEmail && reqEmail && currentEmail === reqEmail) ||
                          (currentName && reqName && (currentName === reqName || currentName.includes(reqName)));

      if (!isDonor && !isRequester) return;

      const partnerConfirmed = isDonor ? (req.requesterConfirmed || req.requester_confirmed) : (req.donorConfirmed || req.donor_confirmed);
      const myConfirmed = isDonor ? (req.donorConfirmed || req.donor_confirmed) : (req.requesterConfirmed || req.requester_confirmed);

      // Si el compañero ya confirmó pero yo aún no he confirmado
      if (partnerConfirmed && !myConfirmed) {
        const notifKey = `usloop_partner_confirm_invite_${currentUser.email || currentUser.name}_${req.id}`;
        if (!sessionStorage.getItem(notifKey)) {
          sessionStorage.setItem(notifKey, 'true');

          const partnerName = isDonor ? req.requesterName : req.targetAuthorName;
          const isDon = (req.itemType || req.type) === 'donation';
          const points = isDon ? 25 : 20;

          if (window.showCustomConfirm) {
            window.showCustomConfirm({
              title: '🔔 Confirmación de Entrega Requerida',
              message: `${partnerName} ha confirmado que ya se realizó la entrega de "${req.itemTitle}".\n\n¿Confirmas tú también que recibiste/entregaste el recurso con éxito para finalizar la ${isDon ? 'donación' : 'propuesta de trueque'} y sumar tus +${points} Puntos Loop?`,
              icon: isDon ? '🎁' : '🤝',
              confirmText: `✓ Sí, Confirmar Entrega (+${points} pts)`,
              cancelText: 'Aún no'
            }).then(confirmed => {
              if (confirmed) {
                window.handleMutualDeliveryConfirmation(req.id);
              }
            });
          }

          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('🔔 US-Loop: Confirmación de Entrega Requerida', {
                body: `${partnerName} confirmó la entrega de "${req.itemTitle}". Entra para confirmar y ganar +${points} Puntos Loop.`,
                icon: 'img/logo.png'
              });
            } catch (err) {}
          }
        }
      }
    });
  }

  // Ejecutar inmediatamente y cada 10 segundos
  checkPendingReminders();
  window._donationReminderInterval = setInterval(checkPendingReminders, 10000);
};

// Iniciar verificador global de recordatorios y notificaciones
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.initDonationReminderChecker());
} else {
  window.initDonationReminderChecker();
}

/* ==========================================================================
   SISTEMA DE AVATAR Y FOTO DE PERFIL GLOBAL
   ========================================================================== */

/**
 * Renderiza el HTML adecuado para un avatar (ya sea imagen Base64, URL externa, o emoji/ícono).
 */
window.renderAvatarHtml = function(avatar, size = 24, isRound = true, extraClass = '') {
  const currentAvatar = avatar || '👨‍🎓';
  const borderRadius = isRound ? '50%' : '18px';
  const sizeStyle = typeof size === 'number' ? `${size}px` : size;

  // 1. ÍCONO DIVINO SUPREMO RECOMPENSA "DIOS DEL LOOP" ⚡🌌 (Vector SVG Celestial de Alta Definición)
  if (currentAvatar === '⚡🌌' || currentAvatar === 'DIOS_DEL_LOOP' || currentAvatar === 'DIOS_DE_LA_UNION' || currentAvatar === '🌌⚡' || currentAvatar === '⚡👑🌌') {
    return `<div class="dios-union-avatar-wrap ${extraClass}" style="width: ${sizeStyle}; height: ${sizeStyle}; display: flex; align-items: center; justify-content: center; position: relative; border-radius: ${borderRadius}; overflow: hidden; background: radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0c0a1f 65%, #020617 100%); box-shadow: 0 0 16px rgba(56, 189, 248, 0.55), 0 0 28px rgba(168, 85, 247, 0.45); border: 2px solid rgba(251, 191, 36, 0.85);" title="Título y Avatar Divino Supremo: Dios del Loop ⚡🌌">
      <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; display: block;">
        <defs>
          <!-- Gradientes Cósmicos Divinos -->
          <linearGradient id="diosCosmicGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#0f172a" />
            <stop offset="30%" stop-color="#2e1065" />
            <stop offset="70%" stop-color="#0369a1" />
            <stop offset="100%" stop-color="#0284c7" />
          </linearGradient>
          <linearGradient id="diosGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="25%" stop-color="#FDE047" />
            <stop offset="60%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#78350F" />
          </linearGradient>
          <linearGradient id="diosElectricGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="30%" stop-color="#7DD3FC" />
            <stop offset="70%" stop-color="#38BDF8" />
            <stop offset="100%" stop-color="#0284C7" />
          </linearGradient>
          <linearGradient id="diosNebulaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#C084FC" stop-opacity="0.8" />
            <stop offset="50%" stop-color="#818CF8" stop-opacity="0.5" />
            <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.1" />
          </linearGradient>
        </defs>

        <!-- Fondo Espacio Profundo y Nebulosa -->
        <circle cx="50" cy="50" r="48" fill="url(#diosCosmicGrad)" />
        <circle cx="50" cy="50" r="46" fill="url(#diosNebulaGrad)" />

        <!-- Estrellas y Chispas Cósmicas -->
        <circle cx="22" cy="24" r="1.2" fill="#FFFFFF" opacity="0.9" />
        <circle cx="78" cy="26" r="1.2" fill="#FFFFFF" opacity="0.9" />
        <circle cx="18" cy="70" r="1" fill="#7DD3FC" opacity="0.8" />
        <circle cx="82" cy="72" r="1" fill="#FDE047" opacity="0.8" />
        <circle cx="34" cy="82" r="0.8" fill="#FFFFFF" opacity="0.7" />
        <circle cx="68" cy="80" r="0.8" fill="#FFFFFF" opacity="0.7" />

        <!-- Anillos Orbitales de la Unión Celestial (Órbitas Divinas) -->
        <ellipse cx="50" cy="50" rx="43" ry="14" fill="none" stroke="url(#diosGoldGrad)" stroke-width="2" transform="rotate(-28 50 50)" opacity="0.9" />
        <ellipse cx="50" cy="50" rx="43" ry="14" fill="none" stroke="url(#diosElectricGrad)" stroke-width="1.8" transform="rotate(32 50 50)" opacity="0.9" />
        <circle cx="50" cy="50" r="38" fill="none" stroke="url(#diosGoldGrad)" stroke-width="1.2" stroke-dasharray="2,3" opacity="0.6" />

        <!-- Portal Central de Unión -->
        <circle cx="50" cy="50" r="22" fill="#090d16" stroke="url(#diosElectricGrad)" stroke-width="2.2" />

        <!-- Símbolo Loop Infinito de Neón Radiante en el Corazón -->
        <path d="M43 49 C37 42 31 55 39 59 C47 62 53 40 61 43 C69 46 64 60 57 54 C50 45 47 60 43 49 Z" fill="none" stroke="#80FF00" stroke-width="2.8" stroke-linecap="round" />

        <!-- Rayo Divino Eléctrico Relampagueante -->
        <path d="M53 13 L41 43 L50 43 L42 74 L64 39 L53 39 Z" fill="url(#diosGoldGrad)" stroke="#FFFFFF" stroke-width="1.2" />

        <!-- Corona Suprema de los Dioses -->
        <path d="M32 26 L27 13 L40 18 L50 7 L60 18 L73 13 L68 26 Z" fill="url(#diosGoldGrad)" stroke="#78350F" stroke-width="1.2" />
        <!-- Gemas Sagradas -->
        <circle cx="50" cy="7" r="2.5" fill="#EF4444" />
        <circle cx="27" cy="13" r="2" fill="#38BDF8" />
        <circle cx="73" cy="13" r="2" fill="#38BDF8" />
        <circle cx="50" cy="19" r="1.8" fill="#80FF00" />
        <circle cx="50" cy="75" r="2.4" fill="#FDE047" />
      </svg>
    </div>`;
  }

  // 2. Icono Especial Recompensa "Ícono Institucional" (Vector SVG de Alta Definición con Corona y Escudo Dorado)
  if (currentAvatar === '🏛️👑' || currentAvatar === 'ICONO_INSTITUCIONAL' || currentAvatar === '👑🏛️') {
    return `<div class="institutional-avatar-wrap ${extraClass}" style="width: ${sizeStyle}; height: ${sizeStyle}; display: flex; align-items: center; justify-content: center; position: relative; border-radius: ${borderRadius}; overflow: hidden; background: linear-gradient(135deg, #0f172a, #1e1b4b); box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);" title="Recompensa de Honor: Ícono Institucional US-Loop 👑">
      <svg viewBox="0 0 100 100" style="width: 100%; height: 100%; display: block;">
        <defs>
          <linearGradient id="instGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFBEB" />
            <stop offset="35%" stop-color="#FBBF24" />
            <stop offset="75%" stop-color="#D97706" />
            <stop offset="100%" stop-color="#78350F" />
          </linearGradient>
          <linearGradient id="instShieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#1E3A8A" />
            <stop offset="50%" stop-color="#2563EB" />
            <stop offset="100%" stop-color="#0284C7" />
          </linearGradient>
        </defs>
        <!-- Aura resplandeciente -->
        <circle cx="50" cy="50" r="46" fill="url(#instGoldGrad)" opacity="0.18" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="url(#instGoldGrad)" stroke-width="2.5" stroke-dasharray="3,2" />
        <!-- Escudo -->
        <path d="M50 16 L76 26 C76 54 50 82 50 82 C50 82 24 54 24 26 Z" fill="url(#instShieldGrad)" stroke="url(#instGoldGrad)" stroke-width="2.8" />
        <!-- Loop Infinito -->
        <path d="M42 48 C36 42 30 56 38 60 C46 64 54 44 62 48 C70 52 64 66 58 58 C50 48 48 64 42 48 Z" fill="none" stroke="#80FF00" stroke-width="3" stroke-linecap="round" />
        <!-- Corona Real -->
        <path d="M34 32 L30 18 L42 23 L50 11 L58 23 L70 18 L66 32 Z" fill="url(#instGoldGrad)" stroke="#78350F" stroke-width="1.2" />
        <circle cx="50" cy="11" r="2.5" fill="#EF4444" />
        <circle cx="30" cy="18" r="2" fill="#3B82F6" />
        <circle cx="70" cy="18" r="2" fill="#3B82F6" />
        <circle cx="50" cy="27" r="2" fill="#80FF00" />
        <circle cx="50" cy="74" r="2.5" fill="#FBBF24" />
      </svg>
    </div>`;
  }

  const isImage = typeof currentAvatar === 'string' && (
    currentAvatar.startsWith('data:image/') ||
    currentAvatar.startsWith('http://') ||
    currentAvatar.startsWith('https://') ||
    currentAvatar.startsWith('blob:') ||
    currentAvatar.startsWith('img/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(currentAvatar)
  );

  if (isImage) {
    return `<img src="${currentAvatar}" alt="Foto de perfil" class="${extraClass}" style="width: ${sizeStyle}; height: ${sizeStyle}; border-radius: ${borderRadius}; object-fit: cover; display: block;" onerror="this.outerHTML='<span class=\\'${extraClass}\\' style=\\'font-size:${typeof size === 'number' ? (size * 0.7) + 'px' : '1.2rem'}; line-height:1; display:flex; align-items:center; justify-content:center;\\'>👨‍🎓</span>'" />`;
  } else {
    const fontSize = typeof size === 'number' ? (size * 0.72) + 'px' : '1.2rem';
    return `<span class="${extraClass}" style="font-size: ${fontSize}; line-height: 1; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; user-select: none;">${currentAvatar}</span>`;
  }
};

/**
 * Procesa y optimiza cualquier archivo de imagen seleccionado por el usuario en el navegador
 * Redimensiona a dimensiones estándar y comprime a JPEG para almacenamiento instantáneo sin límites.
 */
window.processAvatarImageFile = function(file, maxWidth = 400, maxHeight = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('El archivo seleccionado no es una imagen válida (debe ser JPG, PNG, WEBP, etc.).'));
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('No se pudo procesar la imagen seleccionada.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsDataURL(file);
  });
};

/**
 * Guarda y propaga el avatar actualizado en localStorage y sincroniza la interfaz.
 */
window.updateUserAvatarGlobally = function(newAvatar) {
  try {
    const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    storedUser.avatar = newAvatar;
    localStorage.setItem('currentUser', JSON.stringify(storedUser));

    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const idx = users.findIndex(u => (u.email || '').toLowerCase() === (storedUser.email || '').toLowerCase());
    if (idx !== -1) {
      users[idx].avatar = newAvatar;
      localStorage.setItem('users', JSON.stringify(users));
    }

    if (typeof syncNavbarAuth === 'function') {
      syncNavbarAuth();
    }
    return true;
  } catch (err) {
    console.error('Error al actualizar avatar:', err);
    return false;
  }
};

/**
 * Concede el título especial "Dios del Loop" y el ícono divino supremo a la cuenta.
 */
window.claimDiosDelLoop = async function(user, onCompleted) {
  let currentUser = user || JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (!currentUser || !currentUser.email) return;

  currentUser.specialTitle = 'Dios del Loop';
  currentUser.avatar = '⚡🌌';
  currentUser.diosDelLoopClaimed = true;
  currentUser.diosDeLaUnionClaimed = true;
  currentUser.diosDelLoopClaimDate = new Date().toISOString();

  // Guardar en localStorage
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
  try {
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const uIdx = users.findIndex(u => (u.email || '').toLowerCase() === (currentUser.email || '').toLowerCase());
    if (uIdx !== -1) {
      users[uIdx].specialTitle = 'Dios del Loop';
      users[uIdx].avatar = '⚡🌌';
      users[uIdx].diosDelLoopClaimed = true;
      users[uIdx].diosDeLaUnionClaimed = true;
      users[uIdx].diosDelLoopClaimDate = currentUser.diosDelLoopClaimDate;
      localStorage.setItem('users', JSON.stringify(users));
    }
  } catch (e) {}

  // Sincronizar con backend si está disponible
  try {
    await fetch('api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_profile',
        email: currentUser.email,
        user: {
          specialTitle: 'Dios del Loop',
          avatar: '⚡🌌',
          diosDelLoopClaimed: true,
          diosDeLaUnionClaimed: true,
          diosDelLoopClaimDate: currentUser.diosDelLoopClaimDate
        }
      })
    });
  } catch (err) {}

  // Actualizaciones de UI en tiempo real
  if (typeof syncNavbarAuth === 'function') syncNavbarAuth();

  const userAvatarDisplay = document.getElementById('user-avatar-display');
  if (userAvatarDisplay && window.renderAvatarHtml) {
    userAvatarDisplay.innerHTML = window.renderAvatarHtml('⚡🌌', 90, false);
  }

  const settingsAvatarPreview = document.getElementById('settings-avatar-preview');
  if (settingsAvatarPreview && window.renderAvatarHtml) {
    settingsAvatarPreview.innerHTML = window.renderAvatarHtml('⚡🌌', 70, false);
  }

  const userRankTag = document.getElementById('user-rank-tag-display');
  if (userRankTag) {
    userRankTag.className = 'profile-rank-tag rank-dios-loop';
    userRankTag.innerHTML = `<span>⚡</span> <span>Dios del Loop</span> <span>🌌</span>`;
  }

  const userLevelBadge = document.getElementById('user-level-badge');
  if (userLevelBadge) {
    userLevelBadge.className = 'user-level-badge rank-dios-loop';
    userLevelBadge.innerHTML = `Nivel 25 Supremo <span class="badge-rank-icon">⚡</span>`;
  }

  // Si estamos en cuenta.html, refrescar gamificación para actualizar las tarjetas
  if (typeof window.triggerGamificationRefresh === 'function') {
    window.triggerGamificationRefresh();
  }

  // Toast de celebración cósmica
  if (window.showCustomToast) {
    window.showCustomToast('⚡ ¡Consagración Divina Exitosa! Has recibido el Título Especial «Dios del Loop» y el Ícono Divino Supremo. 🌌', 'success');
  }

  if (typeof onCompleted === 'function') {
    onCompleted(currentUser);
  }
};
window.claimDiosDeLaUnion = window.claimDiosDelLoop;

/**
 * Notificación Flotante de los Creadores de US-Loop
 */
window.showCreatorsLevel25FloatingNotice = async function(user) {
  if (document.getElementById('creators-level25-toast-notice')) return;
  if (sessionStorage.getItem('usloop_creators_notice_dismissed')) return;

  const currentUser = user || JSON.parse(localStorage.getItem('currentUser') || '{}');
  const userEmail = (currentUser.email || '').trim().toLowerCase();
  const isCreator = currentUser.isCreator || currentUser.specialRole === 'creator' || currentUser.specialTitle === 'El Creador' || currentUser.id === 'usr_1790041333118' || userEmail === 'xxmendingxxorigin@gmail.com';

  // 1. Si el usuario es EL CREADOR: avisar si hay candidatos de Nivel 25 pendientes de su aprobación
  if (isCreator) {
    let usersList = [];
    try {
      const res = await fetch('api/users.php');
      if (res.ok) usersList = await res.json();
    } catch (e) {
      usersList = JSON.parse(localStorage.getItem('users') || '[]');
    }

    const pendingCandidates = usersList.filter(u => {
      const uEm = (u.email || '').trim().toLowerCase();
      if (u.id === currentUser.id || uEm === userEmail || uEm === 'xxmendingxxorigin@gmail.com') return false;
      const pts = Number(u.loopPoints || 0);
      const isLvl25 = pts >= 3800 || (u.completedDonations >= 50) || (u.completedBadges && u.completedBadges.length >= 30);
      return isLvl25 && !u.consecrationApprovedByCreator;
    });

    if (pendingCandidates.length > 0) {
      const candidateNames = pendingCandidates.map(c => c.name || 'Estudiante').join(', ');
      const notice = document.createElement('div');
      notice.id = 'creators-level25-toast-notice';
      notice.className = 'creators-floating-notice';
      notice.style.borderColor = '#e11d48';
      notice.style.boxShadow = '0 10px 32px rgba(225, 29, 72, 0.4), 0 0 24px rgba(251, 191, 36, 0.4)';
      notice.innerHTML = `
        <div class="creators-notice-main">
          <div class="creators-notice-icon" style="background: linear-gradient(135deg, rgba(225, 29, 72, 0.3), rgba(251, 191, 36, 0.3)); border-color: #f59e0b;">👑</div>
          <div class="creators-notice-content">
            <div class="creators-notice-title" style="color: #fde047;">👑 ¡Aviso para El Creador! Hay candidatos de Nivel 25 ⚡</div>
            <div class="creators-notice-desc"><strong>${candidateNames}</strong> espera tu aprobación oficial para ser consagrado como un «Dios del Loop».</div>
          </div>
          <button type="button" class="btn-creators-close" onclick="window.dismissCreatorsFloatingNotice()" title="Cerrar aviso">✕</button>
        </div>
        <div class="creators-notice-actions">
          <button type="button" class="btn-creators-goto" onclick="window.goToCreatorsNotification()">📬 Revisar Aprobación</button>
        </div>
      `;
      document.body.appendChild(notice);
    }
    return;
  }

  // 2. Si es un estudiante normal: solo mostrar aviso si El Creador YA APROBÓ su consagración
  const isApproved = currentUser.consecrationApprovedByCreator === true;
  const isAlreadyClaimed = currentUser.specialTitle === 'Dios del Loop' || currentUser.specialTitle === 'Dios de la Unión' || currentUser.diosDelLoopClaimed || currentUser.diosDeLaUnionClaimed;

  if (!isApproved || isAlreadyClaimed) return;

  const notice = document.createElement('div');
  notice.id = 'creators-level25-toast-notice';
  notice.className = 'creators-floating-notice';
  notice.innerHTML = `
    <div class="creators-notice-main">
      <div class="creators-notice-icon">👑</div>
      <div class="creators-notice-content">
        <div class="creators-notice-title">¡Los creadores vieron tu nivel y han decidido preguntarte algo importante! ⚡</div>
        <div class="creators-notice-desc">Tienes una consulta oficial sobre tu título y consagración como un «Dios del Loop».</div>
      </div>
      <button type="button" class="btn-creators-close" onclick="window.dismissCreatorsFloatingNotice()" title="Cerrar aviso">✕</button>
    </div>
    <div class="creators-notice-actions">
      <button type="button" class="btn-creators-goto" onclick="window.goToCreatorsNotification()">📬 Ver en Notificaciones</button>
    </div>
  `;
  document.body.appendChild(notice);
};

window.dismissCreatorsFloatingNotice = function() {
  sessionStorage.setItem('usloop_creators_notice_dismissed', 'true');
  const notice = document.getElementById('creators-level25-toast-notice');
  if (notice) {
    notice.style.opacity = '0';
    notice.style.transform = 'translateY(20px)';
    notice.style.transition = 'all 0.2s ease';
    setTimeout(() => notice.remove(), 200);
  }
};

window.goToCreatorsNotification = function() {
  window.dismissCreatorsFloatingNotice();
  if (typeof window.switchDashboardTab === 'function') {
    window.switchDashboardTab('tab-requests');
  }
  setTimeout(() => {
    const card = document.getElementById('creator-approval-panel-card') || document.getElementById('creators-notification-card') || document.getElementById('creators-notification-card-container');
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.boxShadow = '0 0 35px rgba(251, 191, 36, 0.9), 0 0 60px rgba(225, 29, 72, 0.6)';
      card.style.transition = 'box-shadow 0.4s ease';
      setTimeout(() => {
        card.style.boxShadow = '';
      }, 2500);
    }
  }, 120);
};

window.handleAcceptDiosDelLoopFromCard = async function() {
  const btn = document.getElementById('card-dios-accept-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⚡ Consagrando cuenta...';
  }
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  await window.claimDiosDelLoop(currentUser, () => {
    if (typeof window.triggerGamificationRefresh === 'function') {
      window.triggerGamificationRefresh();
    }
    const container = document.getElementById('creators-notification-card-container');
    const updatedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (container && typeof window.renderCreatorsNotificationCard === 'function') {
      window.renderCreatorsNotificationCard(updatedUser, container);
    }
  });
};
window.handleAcceptDiosDeLaUnionFromCard = window.handleAcceptDiosDelLoopFromCard;

/**
 * Renderiza la tarjeta de notificación de consagración o el panel de aprobación según el rol.
 */
window.renderCreatorsNotificationCard = async function(user, container) {
  if (!container) return;
  const currentUser = user || JSON.parse(localStorage.getItem('currentUser') || '{}');
  const userEmail = (currentUser.email || '').trim().toLowerCase();
  const isCreator = currentUser.isCreator || currentUser.specialRole === 'creator' || currentUser.specialTitle === 'El Creador' || currentUser.id === 'usr_1790041333118' || userEmail === 'xxmendingxxorigin@gmail.com';

  // =========================================================================
  // CASO A: SI ES EL CREADOR -> MOSTRAR PANEL DE APROBACIÓN DE CANDIDATOS
  // =========================================================================
  if (isCreator) {
    return window.renderCreatorApprovalPanel(currentUser, container);
  }

  // =========================================================================
  // CASO B: SI ES UN ESTUDIANTE REGULAR DE NIVEL 25
  // =========================================================================
  const userName = currentUser.name || 'Estudiante';
  const isDiosLoop = currentUser.specialTitle === 'Dios del Loop' || currentUser.specialTitle === 'Dios de la Unión' || currentUser.diosDelLoopClaimed || currentUser.diosDeLaUnionClaimed;
  const isApproved = currentUser.consecrationApprovedByCreator === true;

  if (isDiosLoop) {
    container.innerHTML = `
      <div class="creators-consecration-card claimed" id="creators-notification-card">
        <div class="creators-card-header">
          <div class="creators-badge-pill" style="background: rgba(16, 185, 129, 0.18); border-color: rgba(16, 185, 129, 0.4); color: #10b981;">
            <span>✓</span> NOTIFICACIÓN OFICIAL • CONSAGRACIÓN CONCEDIDA
          </div>
          <span class="creators-level-pill">⚡ Nivel 25 Supremo</span>
        </div>
        <div class="creators-card-content">
          <div class="creators-avatar-showcase">
            ${window.renderAvatarHtml('⚡🌌', 68, false)}
          </div>
          <div class="creators-text-block">
            <h3 class="creators-card-title">
              👑 Eres oficialmente un «Dios del Loop» ⚡🌌
            </h3>
            <p class="creators-card-desc">
              Has concedido tu permiso y los creadores de US-Loop han consagrado tu cuenta con el Título Especial y el Ícono Divino Supremo.
            </p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button type="button" class="btn btn-sm btn-secondary" onclick="openAvatarPickerModal()" style="font-size: 0.85rem; padding: 6px 14px; border-radius: 10px;">
                🎭 Cambiar Foto / Avatar
              </button>
              <button type="button" class="btn btn-sm btn-outline" onclick="document.getElementById('creators-notification-card').remove()" style="font-size: 0.85rem; padding: 6px 12px; color: #94a3b8; border-color: rgba(255,255,255,0.2); border-radius: 10px;">
                🗑️ Quitar aviso
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    container.style.display = 'block';
    return;
  }

  // Si no ha sido aprobado por El Creador todavía:
  if (!isApproved) {
    container.innerHTML = `
      <div class="creators-consecration-card" id="creators-notification-card" style="border-color: rgba(251, 191, 36, 0.4);">
        <div class="creators-card-header">
          <div class="creators-badge-pill" style="background: rgba(56, 189, 248, 0.15); border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
            <span>⏳</span> REVISIÓN OFICIAL DE NIVEL 25 EN CURSO
          </div>
          <span class="creators-level-pill">⚡ Nivel 25 Máximo</span>
        </div>
        <div class="creators-card-content">
          <div class="creators-avatar-showcase" style="box-shadow: 0 0 20px rgba(56, 189, 248, 0.5);">
            ${window.renderAvatarHtml(currentUser.avatar || '👨‍🎓', 68, false)}
          </div>
          <div class="creators-text-block">
            <h3 class="creators-card-title">
              ¡Has alcanzado la cima escolar de US-Loop! 🏆
            </h3>
            <p class="creators-card-desc">
              ¡Felicidades, <strong>${userName}</strong>! Tu cuenta ha completado los 25 niveles. El Creador de la plataforma ha sido notificado para revisar tu trayectoria y autorizar la invitación oficial a tu consagración como <strong>un «Dios del Loop»</strong>.
            </p>
            <div style="font-size: 0.8rem; color: #94a3b8; display: flex; align-items: center; gap: 6px;">
              <span>🔔</span> Recibirás una notificación en cuanto El Creador apruebe tu distinción.
            </div>
          </div>
        </div>
      </div>
    `;
    container.style.display = 'block';
    return;
  }

  // Si YA FUE APROBADO por El Creador pero aún no ha reclamado:
  container.innerHTML = `
    <div class="creators-consecration-card" id="creators-notification-card">
      <div class="creators-card-header">
        <div class="creators-badge-pill">
          <span>👑</span> MENSAJE OFICIAL DE LOS CREADORES • US-LOOP
        </div>
        <span class="creators-level-pill">⚡ Nivel 25 Máximo</span>
      </div>
      <div class="creators-card-content">
        <div class="creators-avatar-showcase">
          ${window.renderAvatarHtml('⚡🌌', 68, false)}
        </div>
        <div class="creators-text-block">
          <h3 class="creators-card-title">
            ¿Aceptas ser consagrado como un «Dios del Loop»? ⚡🌌
          </h3>
          <p class="creators-card-desc">
            ¡Hola, <strong>${userName}</strong>! Los creadores de US-Loop vieron tu nivel y han decidido preguntarte algo muy importante: <strong>¿nos concedes tu permiso para otorgarle a tu cuenta el Título Especial «Dios del Loop» y el Ícono Divino Supremo Exclusivo?</strong>
          </p>

          <div class="creators-perks-grid">
            <div class="creators-perk-item">
              <span class="perk-icon">⚡</span>
              <div>
                <strong>Título Especial: «Dios del Loop»</strong>
                <p>Condecoración permanente visible en tu perfil, hero tag y catálogo escolar.</p>
              </div>
            </div>
            <div class="creators-perk-item">
              <span class="perk-icon">🌌</span>
              <div>
                <strong>Ícono Divino Supremo Exclusivo</strong>
                <p>Avatar vectorial animado con relámpagos galácticos y corona real.</p>
              </div>
            </div>
            <div class="creators-perk-item">
              <span class="perk-icon">👑</span>
              <div>
                <strong>Rango Nivel 25 Supremo</strong>
                <p>Estatus legendario de máxima excelencia y liderazgo en US-Loop.</p>
              </div>
            </div>
          </div>

          <div class="creators-card-actions">
            <button type="button" class="btn-dios-accept" id="card-dios-accept-btn" onclick="window.handleAcceptDiosDelLoopFromCard()">
              <span>⚡</span> ¡Acepto la Consagración Divina! <span>🌌</span>
            </button>
            <button type="button" class="btn-dios-later" onclick="window.dismissCreatorsFloatingNotice(); if(window.showCustomToast) window.showCustomToast('Puedes aceptar tu consagración en cualquier momento desde esta pestaña.', 'info');">
              <span>⏳</span> Preguntarme más tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  container.style.display = 'block';
};

/**
 * Panel de Aprobaciones Exclusivo de El Creador
 */
window.renderCreatorApprovalPanel = async function(creatorUser, container) {
  if (!container) return;
  let allUsers = [];
  try {
    const res = await fetch('api/users.php');
    if (res.ok) allUsers = await res.json();
  } catch (e) {
    allUsers = JSON.parse(localStorage.getItem('users') || '[]');
  }

  // Filtrar ÚNICAMENTE candidatos de Nivel 25 pendientes que NO han sido aprobados
  const pendingCandidates = allUsers.filter(u => {
    if (u.id === creatorUser.id || (u.email || '').toLowerCase() === (creatorUser.email || '').toLowerCase()) return false;
    const pts = Number(u.loopPoints || 0);
    const dons = Number(u.completedDonations || 0);
    const trades = Number(u.completedTrades || 0);
    const isLvl25 = pts >= 3800 || (dons + trades >= 100) || (u.completedBadges && u.completedBadges.length >= 30);
    return isLvl25 && !u.consecrationApprovedByCreator;
  });

  const pendingCount = pendingCandidates.length;

  let candidatesHtml = '';
  if (pendingCount === 0) {
    candidatesHtml = `
      <div style="background: rgba(15, 23, 42, 0.6); border: 1px dashed rgba(255,255,255,0.2); border-radius: 16px; padding: 22px; text-align: center; color: #94a3b8; font-size: 0.9rem;">
        🛡️ No hay solicitudes de consagración pendientes en este momento. Todas las autorizaciones han sido enviadas. Cuando otro estudiante alcance el Nivel 25, aparecerá aquí.
      </div>
    `;
  } else {
    candidatesHtml = pendingCandidates.map(c => {
      const pts = Number(c.loopPoints || 0);
      const dons = Number(c.completedDonations || 0);
      const trades = Number(c.completedTrades || 0);
      const safeName = (c.name || 'Estudiante').replace(/'/g, "\\'");

      return `
        <div class="creator-candidate-card" id="candidate-card-${c.id}">
          <div class="candidate-info-block">
            <div class="candidate-avatar-wrap">
              ${window.renderAvatarHtml(c.avatar || '👨‍🎓', 48, false)}
            </div>
            <div>
              <div class="candidate-meta-name">${c.name || 'Estudiante'}</div>
              <div class="candidate-meta-details">
                <span style="color: #94a3b8;">${c.email}</span>
                <span class="candidate-stat-pill">🪙 <strong>${pts}</strong> pts</span>
                <span class="candidate-stat-pill">🎁 <strong>${dons}</strong> donaciones</span>
                <span class="candidate-stat-pill">🔄 <strong>${trades}</strong> trueques</span>
              </div>
            </div>
          </div>
          <div class="candidate-actions">
            <button type="button" class="btn-creator-approve" onclick="window.approveUserConsecration('${c.id}', '${safeName}')">
              <span>✅</span> Aprobar y Enviar Invitación Oficial
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="creator-approval-panel" id="creator-approval-panel-card">
      <div class="creator-panel-header">
        <h3 class="creator-panel-title">
          <span>👑</span> Panel de Decisiones de El Creador: Aprobación de Consagraciones
        </h3>
        <div class="creator-panel-badge">
          ⚡ ${pendingCount} Pendiente${pendingCount === 1 ? '' : 's'} de Aprobación
        </div>
      </div>
      <p style="margin: 0 0 16px; font-size: 0.88rem; color: #cbd5e1; line-height: 1.5;">
        Como <strong>El Creador de US-Loop</strong>, tienes la potestad exclusiva de autorizar a qué estudiantes de <strong>Nivel 25</strong> se les envía la notificación oficial para consagrarse como <strong>un «Dios del Loop»</strong>.
      </p>
      <div class="creator-candidates-list">
        ${candidatesHtml}
      </div>
    </div>
  `;
  container.style.display = 'block';
};

/**
 * Acción de aprobación de consagración por parte de El Creador
 */
window.approveUserConsecration = async function(targetUserId, targetName) {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const btn = event ? event.target.closest('button') : null;
  const card = document.getElementById(`candidate-card-${targetUserId}`);
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '⚡ Aprobando en el servidor...';
  }

  if (card) {
    card.style.transition = 'all 0.35s ease';
    card.style.opacity = '0.4';
    card.style.transform = 'scale(0.98)';
  }

  try {
    const res = await fetch('api/users.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'approve_consecration',
        targetUserId: targetUserId,
        creatorEmail: currentUser.email || 'xxmendingxxorigin@gmail.com'
      })
    });
    const data = await res.json();
    console.log('[US-Loop] Aprobación de consagración:', data);
  } catch (err) {
    console.warn('Error comunicando con servidor, actualizando localmente:', err);
  }

  // Actualizar también en localStorage
  try {
    let users = JSON.parse(localStorage.getItem('users') || '[]');
    const idx = users.findIndex(u => u.id === targetUserId);
    if (idx !== -1) {
      users[idx].consecrationApprovedByCreator = true;
      users[idx].consecrationApprovedAt = new Date().toISOString();
      users[idx].consecrationApprovedBy = 'El Creador (Juan David Raigoso Gómez)';
      localStorage.setItem('users', JSON.stringify(users));
    }
  } catch (e) {}

  if (window.showCustomToast) {
    window.showCustomToast(`✨ ¡Has aprobado a ${targetName}! Se envió la notificación oficial para ser consagrado como un «Dios del Loop». ⚡`, 'success');
  }

  // Eliminar de la lista de pendientes y re-renderizar panel de creador y badges
  setTimeout(() => {
    const container = document.getElementById('creators-notification-card-container');
    if (container) {
      window.renderCreatorApprovalPanel(currentUser, container);
    }
    if (typeof window.loadUserStatsAndItems === 'function') {
      window.loadUserStatsAndItems();
    }
  }, 350);
};

/**
 * Modal interactivo y moderno para seleccionar o subir cualquier foto/avatar.
 */
window.openAvatarPickerModal = function(options = {}) {
  const onAvatarSelected = options.onAvatarSelected || null;
  const storedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  let selectedAvatar = storedUser.avatar || '👨‍🎓';

  const defaultEmojis = [
    '⚡🌌', '🏛️👑', '👑', '👨‍🎓', '👩‍🎓', '🧑‍🎓', '🧑‍🔬', '👩‍🔬', '👨‍🏫', 
    '👩‍🏫', '👩‍🎨', '🧑‍🎨', '🚀', '🌱', '⭐', 
    '🏆', '💡', '📚', '💻', '🎨', '🦊', 
    '🦉', '🐯', '🦁', '🐬', '⚡', '🔥'
  ];

  // Crear modal backdrop
  const backdrop = document.createElement('div');
  backdrop.className = 'usloop-modal-backdrop avatar-picker-backdrop';

  const modalBox = document.createElement('div');
  modalBox.className = 'usloop-modal-box usloop-avatar-modal';
  modalBox.style.maxWidth = '520px';
  modalBox.style.padding = '24px';
  modalBox.style.textAlign = 'left';

  modalBox.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <div class="usloop-modal-icon-wrap" style="margin: 0; width: 44px; height: 44px; font-size: 1.4rem;">📷</div>
        <div>
          <h3 class="usloop-modal-title" style="margin: 0; font-size: 1.25rem;">Cambiar Foto de Perfil</h3>
          <p style="margin: 2px 0 0; font-size: 0.84rem; color: #64748b;">Sube una imagen o elige un avatar estudiantil</p>
        </div>
      </div>
      <button type="button" id="avatar-close-x" style="background: none; border: none; font-size: 1.3rem; color: #94a3b8; cursor: pointer; padding: 4px 8px; border-radius: 8px;">✕</button>
    </div>

    <!-- Vista previa en vivo -->
    <div style="display: flex; align-items: center; gap: 18px; background: linear-gradient(135deg, rgba(37, 99, 235, 0.06), rgba(16, 185, 129, 0.06)); border: 1.5px dashed rgba(37, 99, 235, 0.25); border-radius: 16px; padding: 14px 18px; margin-bottom: 18px;">
      <div id="modal-avatar-preview-box" style="width: 74px; height: 74px; border-radius: 20px; background: #ffffff; box-shadow: 0 6px 18px rgba(0,0,0,0.12); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 2.5px solid #2563eb; flex-shrink: 0;">
        ${window.renderAvatarHtml(selectedAvatar, 74, false)}
      </div>
      <div style="flex: 1;">
        <div style="font-size: 0.75rem; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em;">Vista previa actual</div>
        <div id="modal-avatar-desc" style="font-size: 0.92rem; font-weight: 700; color: #1e293b; margin: 2px 0 4px;">Avatar seleccionado</div>
        <span style="font-size: 0.8rem; color: #64748b;">Se verá en tu cuenta, catálogo y solicitudes escolares.</span>
      </div>
    </div>

    <!-- Pestañas de Selección -->
    <div style="display: flex; gap: 8px; margin-bottom: 16px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
      <button type="button" class="avatar-modal-tab active" data-tab="upload" style="padding: 8px 16px; border-radius: 10px; border: none; background: #2563eb; color: #fff; font-weight: 700; font-size: 0.88rem; cursor: pointer; transition: all 0.2s;">
        📁 Subir Foto
      </button>
      <button type="button" class="avatar-modal-tab" data-tab="emojis" style="padding: 8px 16px; border-radius: 10px; border: 1px solid #e2e8f0; background: #f8fafc; color: #475569; font-weight: 600; font-size: 0.88rem; cursor: pointer; transition: all 0.2s;">
        🎭 Galería Emojis
      </button>
    </div>

    <!-- Contenido Pestaña 1: Subir Archivo -->
    <div id="avatar-tab-upload" class="avatar-modal-pane" style="display: block;">
      <input type="file" id="modal-file-input" accept="image/*" style="display: none;" />
      <div id="modal-dropzone" style="border: 2px dashed #cbd5e1; border-radius: 16px; padding: 28px 16px; text-align: center; cursor: pointer; background: #f8fafc; transition: all 0.2s ease;">
        <div style="font-size: 2.4rem; margin-bottom: 8px;">📸</div>
        <div style="font-weight: 700; color: #1e293b; font-size: 1rem; margin-bottom: 4px;">
          Haz clic o arrastra una foto aquí
        </div>
        <p style="font-size: 0.84rem; color: #64748b; margin: 0 0 14px;">Soporta fotos desde tu celular, JPG, PNG, WEBP o GIF</p>
        <button type="button" class="btn btn-primary btn-sm" style="padding: 8px 18px; font-size: 0.88rem; pointer-events: none;">
          Seleccionar imagen de mi dispositivo
        </button>
      </div>
      <div id="modal-upload-loading" style="display: none; text-align: center; padding: 12px; font-size: 0.88rem; color: #2563eb; font-weight: 600;">
        ⏳ Procesando y optimizando imagen...
      </div>
    </div>

    <!-- Contenido Pestaña 2: Galería Emojis -->
    <div id="avatar-tab-emojis" class="avatar-modal-pane" style="display: none;">
      <p style="font-size: 0.84rem; color: #64748b; margin: 0 0 10px;">Elige cualquiera de los siguientes íconos para tu perfil:</p>
      <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; max-height: 180px; overflow-y: auto; padding: 4px;">
        ${defaultEmojis.map(emo => `
          <button type="button" class="emoji-select-btn ${emo === selectedAvatar ? 'selected-emoji' : ''}" data-emoji="${emo}" style="font-size: 1.6rem; height: 46px; border-radius: 12px; border: 1.5px solid ${emo === selectedAvatar ? '#2563eb' : '#e2e8f0'}; background: ${emo === selectedAvatar ? '#eff6ff' : '#ffffff'}; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s ease, border-color 0.15s ease;">
            ${emo}
          </button>
        `).join('')}
      </div>
    </div>

    <!-- Botones de Acción -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 22px; padding-top: 14px; border-top: 1px solid #f1f5f9; flex-wrap: wrap; gap: 10px;">
      <button type="button" id="modal-reset-avatar" style="background: none; border: none; color: #64748b; font-size: 0.84rem; cursor: pointer; text-decoration: underline; padding: 4px;">
        Restablecer por defecto (👨‍🎓)
      </button>
      <div style="display: flex; gap: 10px;">
        <button type="button" class="usloop-modal-btn usloop-btn-cancel" id="modal-avatar-cancel" style="padding: 8px 18px;">Cancelar</button>
        <button type="button" class="usloop-modal-btn usloop-btn-confirm" id="modal-avatar-save" style="padding: 8px 20px;">
          Guardar Foto 💾
        </button>
      </div>
    </div>
  `;

  backdrop.appendChild(modalBox);
  document.body.appendChild(backdrop);
  requestAnimationFrame(() => backdrop.classList.add('active'));

  // Elementos de UI
  const previewBox = modalBox.querySelector('#modal-avatar-preview-box');
  const previewDesc = modalBox.querySelector('#modal-avatar-desc');
  const tabs = modalBox.querySelectorAll('.avatar-modal-tab');
  const panes = modalBox.querySelectorAll('.avatar-modal-pane');
  const dropzone = modalBox.querySelector('#modal-dropzone');
  const fileInput = modalBox.querySelector('#modal-file-input');
  const loadingEl = modalBox.querySelector('#modal-upload-loading');
  const emojiBtns = modalBox.querySelectorAll('.emoji-select-btn');
  const resetBtn = modalBox.querySelector('#modal-reset-avatar');
  const cancelBtn = modalBox.querySelector('#modal-avatar-cancel');
  const closeXBtn = modalBox.querySelector('#avatar-close-x');
  const saveBtn = modalBox.querySelector('#modal-avatar-save');

  function updateModalPreview(avatarValue, label = 'Avatar seleccionado') {
    selectedAvatar = avatarValue;
    previewBox.innerHTML = window.renderAvatarHtml(selectedAvatar, 74, false);
    previewDesc.textContent = label;
  }

  // Cambio de pestañas
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => {
        t.style.background = '#f8fafc';
        t.style.color = '#475569';
        t.style.border = '1px solid #e2e8f0';
        t.classList.remove('active');
      });
      tab.style.background = '#2563eb';
      tab.style.color = '#ffffff';
      tab.style.border = 'none';
      tab.classList.add('active');

      const target = tab.dataset.tab;
      panes.forEach(p => p.style.display = 'none');
      const targetPane = modalBox.querySelector(`#avatar-tab-${target}`);
      if (targetPane) targetPane.style.display = 'block';
    });
  });

  // Manejo de carga de archivos (Dropzone y File Input)
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#2563eb';
    dropzone.style.background = '#eff6ff';
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = '#cbd5e1';
    dropzone.style.background = '#f8fafc';
  });

  dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.style.borderColor = '#cbd5e1';
    dropzone.style.background = '#f8fafc';
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  });

  async function handleFileSelected(file) {
    try {
      loadingEl.style.display = 'block';
      const compressedDataUrl = await window.processAvatarImageFile(file, 400, 400, 0.85);
      loadingEl.style.display = 'none';
      updateModalPreview(compressedDataUrl, 'Foto personalizada cargada');
      if (window.showCustomToast) {
        window.showCustomToast('✓ Foto cargada correctamente en la vista previa.', 'success');
      }
    } catch (err) {
      loadingEl.style.display = 'none';
      alert(err.message || 'Error al procesar la imagen.');
    }
  }

  // Manejo de Emojis
  emojiBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      emojiBtns.forEach(b => {
        b.style.border = '1.5px solid #e2e8f0';
        b.style.background = '#ffffff';
      });
      btn.style.border = '2px solid #2563eb';
      btn.style.background = '#eff6ff';
      const emo = btn.dataset.emoji;
      updateModalPreview(emo, `Emoji: ${emo}`);
    });
  });

  // Restablecer por defecto
  resetBtn.addEventListener('click', () => {
    updateModalPreview('👨‍🎓', 'Avatar escolar por defecto');
    emojiBtns.forEach(b => {
      b.style.border = '1.5px solid #e2e8f0';
      b.style.background = '#ffffff';
    });
  });

  function closeModal() {
    backdrop.classList.remove('active');
    setTimeout(() => backdrop.remove(), 250);
  }

  cancelBtn.addEventListener('click', closeModal);
  closeXBtn.addEventListener('click', closeModal);

  // Guardar avatar
  saveBtn.addEventListener('click', () => {
    window.updateUserAvatarGlobally(selectedAvatar);
    closeModal();

    if (onAvatarSelected) {
      onAvatarSelected(selectedAvatar);
    }

    // Actualizar elementos en cuenta.html si existen
    const userAvatarDisplay = document.getElementById('user-avatar-display');
    if (userAvatarDisplay) {
      userAvatarDisplay.innerHTML = window.renderAvatarHtml(selectedAvatar, 90, false);
    }
    const settingsAvatarPreview = document.getElementById('settings-avatar-preview');
    if (settingsAvatarPreview) {
      settingsAvatarPreview.innerHTML = window.renderAvatarHtml(selectedAvatar, 70, false);
    }

    if (window.showCustomToast) {
      window.showCustomToast('✓ ¡Foto de perfil actualizada con éxito! 📸', 'success');
    }
  });
};

/* ==========================================================================
   SINCRONIZACIÓN DE BARRA DE NAVEGACIÓN (NAVBAR)
   ========================================================================== */

function syncNavbarAuth() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const isLoggedIn = currentUser && currentUser.email && currentUser.isLoggedIn !== false;

  const loginBtns = document.querySelectorAll('.login-btn');
  loginBtns.forEach(btn => {
    if (isLoggedIn) {
      btn.href = 'cuenta.html';
      btn.className = 'login-btn user-logged-btn';
      btn.innerHTML = `
        <span class="nav-avatar-icon">${window.renderAvatarHtml(currentUser.avatar || '👨‍🎓', 22, true)}</span>
        <span>${currentUser.name ? currentUser.name.split(' ')[0] : 'Perfil'}</span>
      `;
      btn.title = `Sesión iniciada como ${currentUser.name || 'Estudiante'} (Ir a Perfil)`;
    } else {
      btn.href = 'login.html';
      btn.className = 'login-btn';
      btn.innerHTML = 'Iniciar sesión';
      btn.title = 'Iniciar sesión en US-Loop';
    }
  });

  // Remover enlace a cuenta.html de las barras de menú/navegación si existe
  const navLinks = document.querySelectorAll('.nav-pills a, nav .nav-pills a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes('cuenta.html')) {
      link.remove();
    }
  });
}

/* ==========================================================================
   PÁGINA DE INICIO (INDEX.HTML) - RENDERIZADO DINÁMICO
   ========================================================================== */

async function syncHomePageStatsAndFeed() {
  let donations = JSON.parse(localStorage.getItem('donations') || '[]');
  let exchanges = JSON.parse(localStorage.getItem('exchanges') || '[]');
  let users = JSON.parse(localStorage.getItem('users') || '[]');

  // Sincronizar con backend si está disponible
  if (window.USLoopAPI && window.USLoopAPI.isServer && window.USLoopAPI.isServer()) {
    try {
      if (window.USLoopAPI.getUsers) users = await window.USLoopAPI.getUsers();
      if (window.USLoopAPI.getDonations) donations = await window.USLoopAPI.getDonations();
      if (window.USLoopAPI.getExchanges) exchanges = await window.USLoopAPI.getExchanges();
    } catch (e) {}
  }

  // Actualizar números en el hero (conteo real de cuentas creadas)
  const statStudents = document.getElementById('stat-hero-students');
  if (statStudents) {
    statStudents.textContent = users.length;
  }

  const statExchanges = document.getElementById('stat-hero-exchanges');
  if (statExchanges) {
    statExchanges.textContent = exchanges.length;
  }

  const statDonations = document.getElementById('stat-hero-donations');
  if (statDonations) {
    statDonations.textContent = donations.length;
  }

  const statCommunity = document.getElementById('stat-hero-community');
  if (statCommunity) {
    statCommunity.textContent = users.length > 0 ? '100%' : '0%';
  }

  // Actualizar tarjeta de oferta del día en el hero
  const heroOfferTitle = document.getElementById('hero-offer-title');
  const heroOfferDesc = document.getElementById('hero-offer-desc');
  const heroOfferTag = document.getElementById('hero-offer-tag');
  const heroOfferCount = document.getElementById('hero-offer-count');

  if (heroOfferTitle && heroOfferDesc) {
    const totalOffers = donations.length + exchanges.length;
    if (donations.length > 0) {
      const topDonation = donations[0];
      heroOfferTitle.textContent = topDonation.title || 'Donación destacada';
      heroOfferDesc.textContent = `${topDonation.category || 'Recurso'} • ${topDonation.grade || 'General'} • Por ${topDonation.donorName || topDonation.name || 'Estudiante'}`;
      if (heroOfferTag) heroOfferTag.textContent = '🎁 Donación Reciente';
      if (heroOfferCount) heroOfferCount.textContent = `${totalOffers} disponibles`;
    } else if (exchanges.length > 0) {
      const topExchange = exchanges[0];
      heroOfferTitle.textContent = `Trueque: ${topExchange.offering || 'Artículo'}`;
      heroOfferDesc.textContent = `Busca: ${topExchange.seeking || topExchange.lookingFor || 'Útiles'} • Por ${topExchange.ownerName || topExchange.name || 'Estudiante'}`;
      if (heroOfferTag) heroOfferTag.textContent = '⇄ Trueque Reciente';
      if (heroOfferCount) heroOfferCount.textContent = `${totalOffers} disponibles`;
    } else {
      heroOfferTitle.textContent = 'Sin ofertas activas';
      heroOfferDesc.textContent = 'Sé el primero en compartir un libro o útil escolar con tu comunidad.';
      if (heroOfferCount) heroOfferCount.textContent = '0 disponibles';
    }
  }

  // Actualizar feed de donaciones recientes en la sección donaciones de la home
  const homeDonationsContainer = document.getElementById('home-donations-container');
  const homeDonationsEmpty = document.getElementById('home-donations-empty');

  if (homeDonationsContainer) {
    if (donations.length === 0) {
      homeDonationsContainer.style.display = 'none';
      if (homeDonationsEmpty) homeDonationsEmpty.style.display = 'block';
    } else {
      if (homeDonationsEmpty) homeDonationsEmpty.style.display = 'none';
      homeDonationsContainer.style.display = 'grid';
      homeDonationsContainer.innerHTML = '';

      // Mostrar hasta 3 donaciones más recientes
      const recentDonations = donations.slice(0, 3);
      recentDonations.forEach(item => {
        const card = document.createElement('article');
        card.className = 'info-card';

        const imageHtml = item.photo 
          ? `<img src="${item.photo}" style="width: 100%; height: 160px; object-fit: cover; border-radius: 12px; margin-bottom: 16px;" alt="Foto del recurso">`
          : `<div style="width: 58px; height: 58px; display: grid; place-items: center; border-radius: 14px; background: linear-gradient(135deg, rgba(47, 128, 237, 0.14), rgba(34, 197, 94, 0.12)); color: #1d73f0; font-weight: 800; font-size: 1.5rem; margin-bottom: 16px;">${item.icon || '🎁'}</div>`;

        card.innerHTML = `
          ${imageHtml}
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span class="badge-donacion">✓ Donación</span>
            <span style="font-size: 0.8rem; color: #8896ab;">${item.date || 'Reciente'}</span>
          </div>
          <p style="font-size: 0.85rem; color: #5f6f86; margin: 4px 0 8px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.02em;">${item.category || 'Recurso'}</p>
          <h3 style="margin: 0 0 8px; color: #1f2937; font-size: 1.2rem; font-weight: 800;">${item.title}</h3>
          ${item.description ? `<p style="margin: 0 0 8px; color: #4b5563; font-size: 0.88rem; line-height: 1.45; background: #f8fafc; padding: 6px 10px; border-radius: 8px; border-left: 3px solid #22c55e;">${item.description}</p>` : ''}
          <p style="margin: 0 0 6px; color: #5f6f86; font-size: 0.9rem;">Grado: <strong>${item.grade || 'General'}</strong> • Estado: <strong>${item.condition || 'Bueno'}</strong></p>
          <p style="margin: 0 0 12px; color: #5f6f86; font-size: 0.85rem;">🏫 ${item.school || item.institution || 'Campus'} • Por: <strong>${item.name || item.donorName || 'Estudiante'}</strong></p>
          <a href="explorar.html" class="btn-card-action" style="text-align: center; text-decoration: none;">
            <span>Ver en el Catálogo 🎁</span>
          </a>
        `;
        homeDonationsContainer.appendChild(card);
      });
    }
  }
}

// Ejecutar sincronización al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  syncNavbarAuth();
  syncHomePageStatsAndFeed();
});
