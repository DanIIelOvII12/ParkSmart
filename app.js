/**
 * app.js
 * Sistema Inteligente de Gestion de Parqueaderos
 * Aplicacion de pagina unica (SPA) compatible con GitHub Pages.
 *
 * Arquitectura:
 *   - Estado global en el objeto `state`
 *   - Funciones de renderizado puro que leen `state` y actualizan el DOM
 *   - Listeners de eventos al final del archivo
 *   - Sin dependencias externas: solo HTML, CSS y JS vanilla
 */

'use strict';

/* =============================================================
   1. ESTADO GLOBAL DE LA APLICACION
   Contiene todos los datos en memoria (simula una base de datos)
============================================================= */
const state = {
  /** Usuario actualmente autenticado; null si no hay sesion */
  currentUser: null,

  /** Vista activa en el SPA */
  activeView: 'inicio',

  /**
   * Espacios del parqueadero.
   * Estados posibles: 'available' | 'occupied' | 'reserved' | 'disabled'
   * Tipos: 'Estandar' | 'Discapacitados' | 'Motos' | 'VIP'
   */
  spaces: _generateSpaces(),

  /** Reservas activas y pasadas del sistema */
  reservations: [],

  /** Registro de accesos (entradas/salidas de vehiculos) */
  accessLog: _generateAccessLog(),

  /**
   * Usuarios registrados en el sistema.
   * Las contrasenas se almacenan en texto para la demo;
   * en produccion se usaria hashing (bcrypt).
   */
  users: [
    { id: 1, name: 'Administrador',    email: 'admin@park.co',  password: 'admin123', role: 'admin',  status: 'active' },
    { id: 2, name: 'Maria Gonzalez',   email: 'user@park.co',   password: 'user123',  role: 'user',   status: 'active' },
    { id: 3, name: 'Carlos Perez',     email: 'carlos@park.co', password: 'pass123',  role: 'user',   status: 'active' },
    { id: 4, name: 'Ana Rodriguez',    email: 'ana@park.co',    password: 'pass456',  role: 'user',   status: 'inactive' },
  ],

  /** Espacio seleccionado actualmente en el mapa */
  selectedSpaceId: null,

  /** Filtro de zona activo en el mapa */
  activeZoneFilter: 'all',
};


/* =============================================================
   2. GENERADORES DE DATOS DE PRUEBA
   Crean conjuntos de datos iniciales realistas para la demo
============================================================= */

/**
 * Genera 24 espacios distribuidos en 3 zonas (A, B, C)
 * con estados aleatorios para la demo.
 * @returns {Array<Object>} Lista de espacios
 */
function _generateSpaces() {
  const zones = ['A', 'B', 'C'];
  const types = ['Estandar', 'Estandar', 'Estandar', 'Motos', 'Discapacitados', 'VIP'];
  const statuses = ['available', 'available', 'available', 'occupied', 'occupied', 'reserved'];
  const spaces = [];

  zones.forEach(zone => {
    for (let i = 1; i <= 8; i++) {
      const typeIdx   = Math.floor(Math.random() * types.length);
      const statusIdx = Math.floor(Math.random() * statuses.length);
      spaces.push({
        id:     `${zone}-${String(i).padStart(2, '0')}`,
        zone,
        type:   types[typeIdx],
        status: statuses[statusIdx],
      });
    }
  });

  return spaces;
}

/**
 * Genera un historial de accesos simulado para la demo.
 * @returns {Array<Object>} Lista de registros de acceso
 */
function _generateAccessLog() {
  const spaceIds = ['A-01','A-03','B-02','B-05','C-01','C-04'];
  const plates   = ['ABC-123','XYZ-987','LMN-456','QRS-321'];
  const log = [];

  for (let i = 0; i < 12; i++) {
    const entry = new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000);
    const duration = Math.floor(Math.random() * 5) + 1; // 1-5 horas
    const exit = new Date(entry.getTime() + duration * 3600 * 1000);

    log.push({
      id:       i + 1,
      userId:   Math.random() > 0.5 ? 2 : 3,
      spaceId:  spaceIds[i % spaceIds.length],
      plate:    plates[i % plates.length],
      entryAt:  entry,
      exitAt:   exit,
      duration: `${duration}h`,
      status:   'completed',
    });
  }

  return log.sort((a, b) => b.entryAt - a.entryAt);
}


/* =============================================================
   3. UTILIDADES GENERALES
============================================================= */

/**
 * Muestra una notificacion toast temporal en pantalla.
 * @param {string} message - Texto del mensaje
 * @param {'info'|'success'|'error'|'warning'} type - Tipo de alerta
 * @param {number} duration - Duracion en ms antes de desaparecer
 */
function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  // Quitar el toast con animacion de salida despues de `duration` ms
  setTimeout(() => {
    toast.classList.add('toast--out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}

/**
 * Formatea un objeto Date a cadena legible en espanol.
 * @param {Date} date
 * @returns {string} Ej: "27/05/2026 14:30"
 */
function formatDate(date) {
  return date.toLocaleString('es-CO', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
    hour:  '2-digit',
    minute:'2-digit',
  });
}

/**
 * Calcula las estadisticas generales de los espacios.
 * @returns {{ available: number, occupied: number, reserved: number, disabled: number }}
 */
function getSpaceStats() {
  return state.spaces.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] || 0) + 1;
    return acc;
  }, { available: 0, occupied: 0, reserved: 0, disabled: 0 });
}

/**
 * Genera un ID numerico unico basado en la hora actual.
 * @returns {number}
 */
function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}


/* =============================================================
   4. NAVEGACION SPA
   Oculta todas las secciones y muestra solo la activa
============================================================= */

/**
 * Cambia la vista activa del SPA.
 * @param {string} viewId - ID de la seccion a mostrar
 */
function navigateTo(viewId) {
  // Ocultar todas las vistas
  document.querySelectorAll('[data-view]').forEach(el => {
    el.hidden = true;
  });

  // Mostrar la vista solicitada
  const target = document.querySelector(`[data-view="${viewId}"]`);
  if (target) {
    target.hidden = false;
    state.activeView = viewId;
  }

  // Actualizar el estado activo de los links del navbar
  document.querySelectorAll('.navbar__link, .navbar__mobile-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === viewId);
  });

  // Ejecutar la funcion de renderizado correspondiente a la vista
  switch (viewId) {
    case 'inicio':        renderHero();        break;
    case 'disponibilidad': renderParkingMap(); break;
    case 'reservas':      renderReservas();    break;
    case 'historial':     renderHistorial();   break;
    case 'admin':         renderAdmin();       break;
  }

  // Cerrar el menu movil al navegar
  closeMobileMenu();
}


/* =============================================================
   5. AUTENTICACION
   Simula login, logout y registro de usuarios
============================================================= */

/**
 * Intenta autenticar al usuario con las credenciales dadas.
 * Actualiza `state.currentUser` si son correctas.
 * @param {string} email
 * @param {string} password
 * @returns {{ ok: boolean, message: string }}
 */
function login(email, password) {
  const user = state.users.find(
    u => u.email === email && u.password === password
  );

  if (!user) {
    return { ok: false, message: 'Correo o contrasena incorrectos.' };
  }
  if (user.status === 'inactive') {
    return { ok: false, message: 'Esta cuenta esta desactivada.' };
  }

  state.currentUser = user;
  updateAuthUI();
  return { ok: true, message: `Bienvenido, ${user.name}` };
}

/**
 * Registra un nuevo usuario en el sistema.
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {{ ok: boolean, message: string }}
 */
function register(name, email, password) {
  if (state.users.find(u => u.email === email)) {
    return { ok: false, message: 'Ya existe una cuenta con ese correo.' };
  }
  if (password.length < 8) {
    return { ok: false, message: 'La contrasena debe tener al menos 8 caracteres.' };
  }

  const newUser = {
    id:       generateId(),
    name,
    email,
    password, // En produccion: hashear con bcrypt antes de guardar
    role:     'user',
    status:   'active',
  };

  state.users.push(newUser);
  state.currentUser = newUser;
  updateAuthUI();
  return { ok: true, message: `Cuenta creada. Bienvenido, ${name}` };
}

/**
 * Cierra la sesion del usuario actual.
 */
function logout() {
  state.currentUser = null;
  updateAuthUI();
  navigateTo('inicio');
  showToast('Sesion cerrada correctamente.', 'info');
}

/**
 * Actualiza todos los elementos de la UI que dependen
 * del estado de autenticacion.
 */
function updateAuthUI() {
  const userBadge   = document.getElementById('userBadge');
  const btnOpenAuth = document.getElementById('btnOpenAuth');
  const userBadgeName = document.getElementById('userBadgeName');

  if (state.currentUser) {
    userBadge.hidden   = false;
    btnOpenAuth.hidden = true;
    userBadgeName.textContent = state.currentUser.name.split(' ')[0];
  } else {
    userBadge.hidden   = true;
    btnOpenAuth.hidden = false;
  }
}


/* =============================================================
   6. RENDERIZADO: SECCION HERO
============================================================= */

/**
 * Renderiza el hero: estadisticas y mapa miniatura.
 */
function renderHero() {
  const stats = getSpaceStats();

  // Actualizar contadores del hero
  document.getElementById('statDisponibles').textContent = stats.available  || 0;
  document.getElementById('statOcupados').textContent    = stats.occupied   || 0;
  document.getElementById('statReservados').textContent  = stats.reserved   || 0;

  // Renderizar el mapa en miniatura
  renderMiniMap();
}

/**
 * Construye la cuadricula de casillas miniatura del hero.
 */
function renderMiniMap() {
  const container = document.getElementById('heroMiniMap');
  container.innerHTML = '';

  // Mostrar hasta 24 espacios en la miniatura
  state.spaces.slice(0, 24).forEach(space => {
    const slot = document.createElement('div');
    slot.className = `mini-slot mini-slot--${space.status}`;
    slot.title = `${space.id}: ${space.status}`;
    container.appendChild(slot);
  });
}


/* =============================================================
   7. RENDERIZADO: MAPA DE DISPONIBILIDAD
============================================================= */

/**
 * Renderiza la cuadricula completa de espacios,
 * aplicando el filtro de zona activo.
 */
function renderParkingMap() {
  const grid = document.getElementById('parkingGrid');
  grid.innerHTML = '';

  // Filtrar espacios segun la zona seleccionada
  const filtered = state.activeZoneFilter === 'all'
    ? state.spaces
    : state.spaces.filter(s => s.zone === state.activeZoneFilter);

  filtered.forEach(space => {
    const slot = document.createElement('div');
    slot.className    = `parking-slot parking-slot--${space.status}`;
    slot.dataset.id   = space.id;
    slot.tabIndex     = 0;
    slot.role         = 'listitem';
    slot.setAttribute('aria-label', `Espacio ${space.id}, ${space.status}`);

    // Marcar como seleccionado si corresponde
    if (space.id === state.selectedSpaceId) {
      slot.classList.add('selected');
    }

    slot.innerHTML = `
      <span class="slot__id">${space.id}</span>
      <span class="slot__status">${_translateStatus(space.status)}</span>
    `;

    // Seleccionar al hacer click o pulsar Enter
    slot.addEventListener('click', () => selectSpace(space.id));
    slot.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        selectSpace(space.id);
      }
    });

    grid.appendChild(slot);
  });

  // Si habia un espacio seleccionado, actualizar su panel de detalle
  if (state.selectedSpaceId) {
    renderSpaceDetail(state.selectedSpaceId);
  }
}

/**
 * Muestra el panel de detalle del espacio seleccionado.
 * @param {string} spaceId
 */
function selectSpace(spaceId) {
  state.selectedSpaceId = spaceId;
  renderParkingMap(); // Re-renderizar para reflejar la seleccion
  renderSpaceDetail(spaceId);
}

/**
 * Construye y muestra el panel lateral de detalle.
 * @param {string} spaceId
 */
function renderSpaceDetail(spaceId) {
  const space  = state.spaces.find(s => s.id === spaceId);
  const panel  = document.getElementById('spaceDetail');
  const actions = document.getElementById('detailActions');

  if (!space) { panel.hidden = true; return; }

  // Rellenar datos del espacio
  document.getElementById('detailSpaceId').textContent = space.id;
  document.getElementById('detailZone').textContent    = `Zona ${space.zone}`;
  document.getElementById('detailStatus').textContent  = _translateStatus(space.status);
  document.getElementById('detailType').textContent    = space.type;

  // Construir botones de accion segun el estado del espacio y el usuario
  actions.innerHTML = '';

  if (space.status === 'available') {
    const btnReserve = document.createElement('button');
    btnReserve.className = 'btn btn--primary';
    btnReserve.textContent = 'Reservar este espacio';
    btnReserve.addEventListener('click', () => openReservaModal(space));
    actions.appendChild(btnReserve);
  }

  if (space.status === 'reserved') {
    // Verificar si la reserva pertenece al usuario actual para permitir cancelacion
    const myReservation = state.reservations.find(
      r => r.spaceId === spaceId && r.userId === state.currentUser?.id && r.status === 'active'
    );
    if (myReservation) {
      const btnCancel = document.createElement('button');
      btnCancel.className = 'btn btn--outline';
      btnCancel.textContent = 'Cancelar mi reserva';
      btnCancel.addEventListener('click', () => cancelReservation(myReservation.id));
      actions.appendChild(btnCancel);
    }
  }

  panel.hidden = false;
}

/**
 * Traduce el estado interno del espacio al espanol.
 * @param {string} status
 * @returns {string}
 */
function _translateStatus(status) {
  const map = {
    available: 'Disponible',
    occupied:  'Ocupado',
    reserved:  'Reservado',
    disabled:  'Deshabilitado',
  };
  return map[status] || status;
}


/* =============================================================
   8. RESERVAS
============================================================= */

/**
 * Abre el modal de confirmacion de reserva para un espacio.
 * Verifica que el usuario este autenticado antes de continuar.
 * @param {Object} space - Espacio a reservar
 */
function openReservaModal(space) {
  if (!state.currentUser) {
    showToast('Debes iniciar sesion para reservar.', 'warning');
    openAuthModal();
    return;
  }

  document.getElementById('reservaEspacioId').textContent = space.id;
  document.getElementById('reservaZona').textContent      = `Zona ${space.zone}`;
  document.getElementById('reservaDuracion').value        = '2';
  document.getElementById('reservaPlaca').value           = '';
  hideError('reservaError');

  // Guardar el ID del espacio en el modal para usarlo al confirmar
  document.getElementById('reservaModal').dataset.spaceId = space.id;
  openModal('reservaModal');
}

/**
 * Crea una nueva reserva en el sistema.
 * @param {string} spaceId
 * @param {number} duration - Duracion en horas
 * @param {string} plate    - Placa del vehiculo
 */
function createReservation(spaceId, duration, plate) {
  const space = state.spaces.find(s => s.id === spaceId);
  if (!space || space.status !== 'available') {
    showToast('El espacio ya no esta disponible.', 'error');
    return false;
  }

  const now        = new Date();
  const expiresAt  = new Date(now.getTime() + duration * 3600 * 1000);

  const reservation = {
    id:        generateId(),
    userId:    state.currentUser.id,
    spaceId,
    plate,
    duration,
    createdAt: now,
    expiresAt,
    status:    'active',
  };

  state.reservations.push(reservation);

  // Actualizar el estado del espacio a 'reservado'
  space.status = 'reserved';

  showToast(`Espacio ${spaceId} reservado hasta ${formatDate(expiresAt)}`, 'success');
  closeModal('reservaModal');
  renderParkingMap();
  renderHero();

  return true;
}

/**
 * Cancela una reserva activa.
 * Solo es posible si faltan mas de 15 minutos para que expire (RF-06).
 * @param {number} reservationId
 */
function cancelReservation(reservationId) {
  const reservation = state.reservations.find(r => r.id === reservationId);
  if (!reservation) return;

  // Verificar anticipacion minima de 15 minutos (RF-06)
  const minutesLeft = (reservation.expiresAt - Date.now()) / 60000;
  if (minutesLeft < 15) {
    showToast('Solo puedes cancelar con al menos 15 minutos de anticipacion.', 'warning');
    return;
  }

  reservation.status = 'cancelled';

  // Liberar el espacio
  const space = state.spaces.find(s => s.id === reservation.spaceId);
  if (space) space.status = 'available';

  showToast('Reserva cancelada. El espacio ha sido liberado.', 'success');
  renderParkingMap();
  renderReservas();
  renderHero();
}

/**
 * Renderiza el listado de reservas del usuario actual.
 */
function renderReservas() {
  const authWall  = document.getElementById('reservasAuthWall');
  const list      = document.getElementById('reservasList');
  const container = document.getElementById('reservasContainer');

  if (!state.currentUser) {
    authWall.hidden = false;
    list.hidden     = true;
    return;
  }

  authWall.hidden = true;
  list.hidden     = false;

  // Filtrar las reservas del usuario actual
  const myReservations = state.reservations.filter(r => r.userId === state.currentUser.id);

  container.innerHTML = '';

  if (myReservations.length === 0) {
    container.innerHTML = `
      <p style="color:var(--color-text-muted); padding:40px 0; text-align:center;">
        No tienes reservas registradas.
      </p>`;
    return;
  }

  myReservations.forEach(r => {
    const card = document.createElement('div');
    card.className = 'reserva-card';
    card.role      = 'listitem';

    // Determinar el badge de estado para la reserva
    const badgeClass = r.status === 'active' ? 'badge--active'
      : r.status === 'cancelled' ? 'badge--cancelled'
      : 'badge--expired';

    card.innerHTML = `
      <div class="reserva-card__main">
        <div class="reserva-card__id">Espacio ${r.spaceId}</div>
        <div class="reserva-card__meta">
          Placa: ${r.plate} &bull; ${r.duration}h &bull;
          Creada: ${formatDate(r.createdAt)} &bull;
          Expira: ${formatDate(r.expiresAt)}
        </div>
      </div>
      <span class="badge ${badgeClass}">${_translateReservationStatus(r.status)}</span>
    `;

    // Boton de cancelacion para reservas activas
    if (r.status === 'active') {
      const btnCancel = document.createElement('button');
      btnCancel.className   = 'btn btn--outline btn--sm';
      btnCancel.textContent = 'Cancelar';
      btnCancel.addEventListener('click', () => cancelReservation(r.id));
      card.appendChild(btnCancel);
    }

    container.appendChild(card);
  });
}

/**
 * Traduce el estado de una reserva al espanol.
 * @param {string} status
 * @returns {string}
 */
function _translateReservationStatus(status) {
  const map = { active: 'Activa', cancelled: 'Cancelada', expired: 'Expirada' };
  return map[status] || status;
}


/* =============================================================
   9. HISTORIAL DE ACCESOS
============================================================= */

/**
 * Renderiza la tabla de historial del usuario actual.
 * Soporta busqueda por espacio o fecha.
 */
function renderHistorial() {
  const authWall = document.getElementById('historialAuthWall');
  const list     = document.getElementById('historialList');
  const body     = document.getElementById('historialBody');
  const search   = document.getElementById('historialSearch');

  if (!state.currentUser) {
    authWall.hidden = false;
    list.hidden     = true;
    return;
  }

  authWall.hidden = false;
  list.hidden     = false;
  authWall.hidden = true;

  // Filtrar registros del usuario actual
  const query = (search?.value || '').toLowerCase();
  const logs = state.accessLog.filter(entry => {
    if (state.currentUser.role !== 'admin' && entry.userId !== state.currentUser.id) {
      return false;
    }
    if (query) {
      return entry.spaceId.toLowerCase().includes(query) ||
             formatDate(entry.entryAt).includes(query);
    }
    return true;
  });

  body.innerHTML = '';

  if (logs.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center; color:var(--color-text-muted); padding:40px 0;">
          No hay registros que coincidan con la busqueda.
        </td>
      </tr>`;
    return;
  }

  logs.forEach(entry => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${formatDate(entry.entryAt)}</td>
      <td>${entry.spaceId}</td>
      <td>${entry.entryAt.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}</td>
      <td>${entry.exitAt.toLocaleTimeString('es-CO',  { hour:'2-digit', minute:'2-digit' })}</td>
      <td>${entry.duration}</td>
      <td><span class="badge badge--active">Completado</span></td>
    `;
    body.appendChild(tr);
  });
}


/* =============================================================
   10. PANEL ADMINISTRADOR
============================================================= */

/**
 * Renderiza el panel completo de administracion.
 * Verifica que el usuario tenga rol 'admin'.
 */
function renderAdmin() {
  const authWall   = document.getElementById('adminAuthWall');
  const content    = document.getElementById('adminContent');

  const isAdmin = state.currentUser?.role === 'admin';

  authWall.hidden  = isAdmin;
  content.hidden   = !isAdmin;

  if (!isAdmin) return;

  renderKPIs();
  renderAdminEspacios();
  renderAdminUsuarios();
  renderReportes();
}

/**
 * Renderiza las tarjetas de KPIs del panel admin.
 */
function renderKPIs() {
  const stats   = getSpaceStats();
  const total   = state.spaces.length;
  const ocupPct = Math.round(((stats.occupied + stats.reserved) / total) * 100);

  const kpiData = [
    { label: 'Total espacios',    value: total,           sub: 'en el sistema',     mod: '' },
    { label: 'Disponibles',       value: stats.available, sub: 'listos para usar',  mod: 'kpi-card--green' },
    { label: 'Ocupados',          value: stats.occupied,  sub: 'en este momento',   mod: 'kpi-card--red' },
    { label: 'Reservados',        value: stats.reserved,  sub: 'confirmados',       mod: 'kpi-card--yellow' },
    { label: 'Ocupacion',         value: `${ocupPct}%`,   sub: 'del total',         mod: 'kpi-card--accent' },
    { label: 'Usuarios activos',  value: state.users.filter(u=>u.status==='active').length, sub: 'cuentas', mod: '' },
    { label: 'Reservas hoy',      value: state.reservations.length, sub: 'en el sistema', mod: '' },
  ];

  const grid = document.getElementById('kpiGrid');
  grid.innerHTML = kpiData.map(k => `
    <div class="kpi-card ${k.mod}">
      <div class="kpi-card__label">${k.label}</div>
      <div class="kpi-card__value">${k.value}</div>
      <div class="kpi-card__sub">${k.sub}</div>
    </div>
  `).join('');
}

/**
 * Renderiza la tabla de espacios del panel admin.
 */
function renderAdminEspacios() {
  const body = document.getElementById('adminEspaciosBody');
  body.innerHTML = '';

  state.spaces.forEach(space => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${space.id}</strong></td>
      <td>Zona ${space.zone}</td>
      <td>${space.type}</td>
      <td><span class="badge badge--${_badgeClassForStatus(space.status)}">${_translateStatus(space.status)}</span></td>
      <td>
        <button class="btn btn--ghost btn--sm" data-action="edit-space"   data-id="${space.id}">Editar</button>
        <button class="btn btn--ghost btn--sm" data-action="toggle-space" data-id="${space.id}">
          ${space.status === 'disabled' ? 'Habilitar' : 'Deshabilitar'}
        </button>
        <button class="btn btn--ghost btn--sm" style="color:var(--color-occupied);"
                data-action="delete-space" data-id="${space.id}">Eliminar</button>
      </td>
    `;
    body.appendChild(tr);
  });
}

/**
 * Renderiza la tabla de usuarios del panel admin.
 */
function renderAdminUsuarios() {
  const body = document.getElementById('adminUsuariosBody');
  body.innerHTML = '';

  state.users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.id}</td>
      <td>${user.name}</td>
      <td>${user.email}</td>
      <td><span class="badge ${user.role === 'admin' ? 'badge--active' : 'badge--reserved'}">${user.role}</span></td>
      <td><span class="badge ${user.status === 'active' ? 'badge--active' : 'badge--expired'}">${user.status === 'active' ? 'Activo' : 'Inactivo'}</span></td>
      <td>
        <button class="btn btn--ghost btn--sm" data-action="toggle-user" data-id="${user.id}">
          ${user.status === 'active' ? 'Desactivar' : 'Activar'}
        </button>
        <button class="btn btn--ghost btn--sm" style="color:var(--color-occupied);"
                data-action="delete-user" data-id="${user.id}">Eliminar</button>
      </td>
    `;
    body.appendChild(tr);
  });
}

/**
 * Devuelve la clase de badge correspondiente a un estado de espacio.
 * @param {string} status
 * @returns {string}
 */
function _badgeClassForStatus(status) {
  const map = {
    available: 'active',
    occupied:  'cancelled',
    reserved:  'reserved',
    disabled:  'expired',
  };
  return map[status] || 'expired';
}


/* =============================================================
   11. REPORTES Y GRAFICA DE OCUPACION
============================================================= */

/**
 * Renderiza la grafica de barras de ocupacion por hora y
 * la tabla de resumen por zona.
 */
function renderReportes() {
  renderOcupacionChart();
  renderReporteTable();
}

/**
 * Dibuja una grafica de barras de ocupacion promedio por hora
 * usando Canvas 2D (sin libreria externa).
 */
function renderOcupacionChart() {
  const canvas = document.getElementById('ocupacionChart');
  if (!canvas) return;

  const ctx    = canvas.getContext('2d');
  const W      = canvas.width;
  const H      = canvas.height;

  // Datos simulados: porcentaje de ocupacion para cada hora del dia
  const hours = [6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22];
  const occ   = [10,25,55,80,85,70,90,88,75,65,72,80,60,45,30,20,12];

  // Estilos
  const colorBar    = '#f97316';
  const colorBarBg  = '#1a2236';
  const colorText   = '#64748b';
  const colorGrid   = '#1e2d45';
  const padding     = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW      = W - padding.left - padding.right;
  const chartH      = H - padding.top  - padding.bottom;
  const barGap      = 4;
  const barW        = (chartW / hours.length) - barGap;

  ctx.clearRect(0, 0, W, H);

  // Lineas de cuadricula horizontales
  for (let i = 0; i <= 4; i++) {
    const y   = padding.top + (chartH / 4) * i;
    const val = 100 - i * 25;
    ctx.strokeStyle = colorGrid;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(W - padding.right, y);
    ctx.stroke();

    ctx.fillStyle  = colorText;
    ctx.font       = '11px DM Sans, sans-serif';
    ctx.textAlign  = 'right';
    ctx.fillText(`${val}%`, padding.left - 8, y + 4);
  }

  // Barras de datos
  hours.forEach((hour, idx) => {
    const x      = padding.left + idx * (barW + barGap);
    const pct    = occ[idx] / 100;
    const barH   = chartH * pct;
    const y      = padding.top + chartH - barH;

    // Barra de fondo
    ctx.fillStyle = colorBarBg;
    ctx.fillRect(x, padding.top, barW, chartH);

    // Barra de valor con esquinas redondeadas (simulado)
    ctx.fillStyle = colorBar;
    const r = Math.min(4, barW / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + barW - r, y);
    ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
    ctx.lineTo(x + barW, y + barH);
    ctx.lineTo(x, y + barH);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.fill();

    // Etiqueta de hora en el eje X
    ctx.fillStyle  = colorText;
    ctx.font       = '11px DM Sans, sans-serif';
    ctx.textAlign  = 'center';
    ctx.fillText(`${hour}h`, x + barW / 2, H - 10);
  });
}

/**
 * Renderiza la tabla de resumen de ocupacion por zona.
 */
function renderReporteTable() {
  const body = document.getElementById('reporteBody');
  body.innerHTML = '';

  const zones = ['A', 'B', 'C'];
  zones.forEach(zone => {
    const zoneSpaces = state.spaces.filter(s => s.zone === zone);
    const occupied   = zoneSpaces.filter(s => s.status === 'occupied' || s.status === 'reserved').length;
    const pct        = Math.round((occupied / zoneSpaces.length) * 100);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>Zona ${zone}</strong></td>
      <td>${zoneSpaces.length}</td>
      <td>${pct}%</td>
      <td>${pct + Math.floor(Math.random() * 15)}%</td>
    `;
    body.appendChild(tr);
  });
}

/**
 * Exporta los datos de reporte como archivo CSV descargable.
 * Cumple con el requisito RF-10 (generacion de reportes exportables).
 */
function exportReportCSV() {
  const rows = [['Zona', 'Total Espacios', 'Ocupados', 'Disponibles', 'Reservados']];

  ['A', 'B', 'C'].forEach(zone => {
    const zs = state.spaces.filter(s => s.zone === zone);
    rows.push([
      `Zona ${zone}`,
      zs.length,
      zs.filter(s => s.status === 'occupied').length,
      zs.filter(s => s.status === 'available').length,
      zs.filter(s => s.status === 'reserved').length,
    ]);
  });

  const csv     = rows.map(r => r.join(',')).join('\n');
  const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url     = URL.createObjectURL(blob);
  const link    = document.createElement('a');
  link.href     = url;
  link.download = `reporte-parqueaderos-${Date.now()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Reporte exportado correctamente.', 'success');
}


/* =============================================================
   12. GESTION DE MODALES
============================================================= */

/**
 * Abre un modal por su ID.
 * @param {string} id - ID del elemento modal-overlay
 */
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.hidden = false;
    // Enfocar el primer input del modal para accesibilidad
    const firstInput = modal.querySelector('input, button');
    if (firstInput) setTimeout(() => firstInput.focus(), 50);
  }
}

/**
 * Cierra un modal por su ID.
 * @param {string} id
 */
function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.hidden = true;
}

/**
 * Abre el modal de autenticacion (login/registro).
 */
function openAuthModal() {
  openModal('authModal');
}

/**
 * Muestra un mensaje de error dentro de un formulario.
 * @param {string} elementId - ID del div .form-error
 * @param {string} message
 */
function showError(elementId, message) {
  const el = document.getElementById(elementId);
  if (el) {
    el.textContent = message;
    el.hidden = false;
  }
}

/**
 * Oculta el mensaje de error de un formulario.
 * @param {string} elementId
 */
function hideError(elementId) {
  const el = document.getElementById(elementId);
  if (el) el.hidden = true;
}

/**
 * Cierra cualquier modal al hacer click en el overlay (fuera del dialogo).
 * @param {Event} e
 * @param {string} modalId
 */
function handleOverlayClick(e, modalId) {
  if (e.target.id === modalId) closeModal(modalId);
}


/* =============================================================
   13. MENU MOVIL
============================================================= */

/**
 * Alterna la visibilidad del menu de navegacion movil.
 */
function toggleMobileMenu() {
  const menu   = document.getElementById('mobileMenu');
  const burger = document.getElementById('hamburger');
  const isOpen = !menu.hidden;

  menu.hidden = isOpen;
  burger.setAttribute('aria-expanded', String(!isOpen));
}

/**
 * Cierra el menu movil si esta abierto.
 */
function closeMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.hidden = true;
  document.getElementById('hamburger').setAttribute('aria-expanded', 'false');
}


/* =============================================================
   14. ACCIONES DEL PANEL ADMIN
   Delegacion de eventos para la tabla de espacios y usuarios
============================================================= */

/**
 * Maneja las acciones de la tabla de espacios (editar, deshabilitar, eliminar).
 * Usa delegacion de eventos sobre el tbody para evitar multiples listeners.
 * @param {Event} e
 */
function handleEspacioAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action  = btn.dataset.action;
  const spaceId = btn.dataset.id;
  const space   = state.spaces.find(s => s.id === spaceId);
  if (!space) return;

  if (action === 'edit-space') {
    // Pre-rellenar el formulario de edicion y abrir el modal
    document.getElementById('espacioEditId').value = space.id;
    document.getElementById('espacioNumero').value  = space.id;
    document.getElementById('espacioZona').value    = space.zone;
    document.getElementById('espacioTipo').value    = space.type;
    document.getElementById('espacioEstado').value  = space.status;
    document.getElementById('espacioModalTitle').textContent = `Editar espacio ${space.id}`;
    openModal('espacioModal');
  }

  if (action === 'toggle-space') {
    // Deshabilitar si esta activo; habilitar si esta deshabilitado
    space.status = space.status === 'disabled' ? 'available' : 'disabled';
    renderAdminEspacios();
    renderParkingMap();
    renderKPIs();
    showToast(`Espacio ${spaceId} ${space.status === 'disabled' ? 'deshabilitado' : 'habilitado'}.`, 'info');
  }

  if (action === 'delete-space') {
    if (!confirm(`¿Eliminar el espacio ${spaceId}? Esta accion no se puede deshacer.`)) return;
    const idx = state.spaces.findIndex(s => s.id === spaceId);
    if (idx !== -1) {
      state.spaces.splice(idx, 1);
      renderAdminEspacios();
      renderParkingMap();
      renderKPIs();
      showToast(`Espacio ${spaceId} eliminado.`, 'warning');
    }
  }
}

/**
 * Maneja las acciones de la tabla de usuarios (activar/desactivar, eliminar).
 * @param {Event} e
 */
function handleUsuarioAction(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;

  const action = btn.dataset.action;
  const userId = Number(btn.dataset.id);
  const user   = state.users.find(u => u.id === userId);
  if (!user) return;

  // Proteccion: no permitir eliminar al admin principal
  if (userId === 1 && (action === 'delete-user' || action === 'toggle-user')) {
    showToast('No puedes modificar la cuenta de administrador principal.', 'warning');
    return;
  }

  if (action === 'toggle-user') {
    user.status = user.status === 'active' ? 'inactive' : 'active';
    renderAdminUsuarios();
    renderKPIs();
    showToast(`Usuario ${user.name} ${user.status === 'active' ? 'activado' : 'desactivado'}.`, 'info');
  }

  if (action === 'delete-user') {
    if (!confirm(`¿Eliminar la cuenta de ${user.name}? Esta accion no se puede deshacer.`)) return;
    const idx = state.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      state.users.splice(idx, 1);
      renderAdminUsuarios();
      renderKPIs();
      showToast(`Usuario ${user.name} eliminado.`, 'warning');
    }
  }
}

/**
 * Guarda los cambios de un espacio editado o crea uno nuevo.
 */
function saveEspacio() {
  const editId  = document.getElementById('espacioEditId').value;
  const numero  = document.getElementById('espacioNumero').value.trim();
  const zona    = document.getElementById('espacioZona').value;
  const tipo    = document.getElementById('espacioTipo').value;
  const estatus = document.getElementById('espacioEstado').value;

  if (!numero) {
    showToast('El numero del espacio es obligatorio.', 'error');
    return;
  }

  if (editId) {
    // Modo edicion: actualizar espacio existente
    const space = state.spaces.find(s => s.id === editId);
    if (space) {
      space.id     = numero;
      space.zone   = zona;
      space.type   = tipo;
      space.status = estatus;
    }
  } else {
    // Modo creacion: verificar que no exista un espacio con el mismo ID
    if (state.spaces.find(s => s.id === numero)) {
      showToast('Ya existe un espacio con ese ID.', 'error');
      return;
    }
    state.spaces.push({ id: numero, zone: zona, type: tipo, status: estatus });
  }

  closeModal('espacioModal');
  renderAdminEspacios();
  renderParkingMap();
  renderKPIs();
  showToast('Espacio guardado correctamente.', 'success');
}


/* =============================================================
   15. SCROLL: NAVBAR SHADOW
   Agrega clase 'scrolled' al navbar al desplazarse hacia abajo
============================================================= */
window.addEventListener('scroll', () => {
  const navbar = document.getElementById('navbar');
  navbar.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });


/* =============================================================
   16. REGISTRO DE TODOS LOS LISTENERS DE EVENTOS
   Se ejecuta cuando el DOM esta completamente cargado
============================================================= */
document.addEventListener('DOMContentLoaded', () => {

  /* --- Navegacion SPA --- */

  // Links del navbar principal
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigateTo(link.dataset.section);
    });
  });

  // Boton del hero: ver mapa
  document.getElementById('btnVerMapa')
    ?.addEventListener('click', () => navigateTo('disponibilidad'));

  // Boton del hero: reservar
  document.getElementById('btnReservar')
    ?.addEventListener('click', () => {
      if (!state.currentUser) { openAuthModal(); return; }
      navigateTo('disponibilidad');
    });

  // Botones de los auth walls que llevan al login
  document.getElementById('btnLoginFromReservas')
    ?.addEventListener('click', openAuthModal);
  document.getElementById('btnLoginFromHistorial')
    ?.addEventListener('click', openAuthModal);
  document.getElementById('btnLoginFromAdmin')
    ?.addEventListener('click', openAuthModal);


  /* --- Autenticacion --- */

  // Abrir modal de login
  document.getElementById('btnOpenAuth')
    ?.addEventListener('click', openAuthModal);

  // Cerrar modal de login
  document.getElementById('btnCloseAuth')
    ?.addEventListener('click', () => closeModal('authModal'));
  document.getElementById('authModal')
    ?.addEventListener('click', e => handleOverlayClick(e, 'authModal'));

  // Cambio de pestana: login / registro
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab, .auth-panel').forEach(el => {
        el.classList.remove('active');
        if (el.classList.contains('auth-panel')) el.hidden = true;
      });
      tab.classList.add('active');
      const panel = document.getElementById(`auth${tab.dataset.auth.charAt(0).toUpperCase() + tab.dataset.auth.slice(1)}`);
      if (panel) { panel.classList.add('active'); panel.hidden = false; }
    });
  });

  // Enviar login
  document.getElementById('btnLogin')?.addEventListener('click', () => {
    const email    = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    hideError('loginError');
    const result = login(email, password);
    if (result.ok) {
      closeModal('authModal');
      showToast(result.message, 'success');
      navigateTo(state.activeView); // Re-renderizar la vista actual con usuario autenticado
    } else {
      showError('loginError', result.message);
    }
  });

  // Enviar registro
  document.getElementById('btnRegister')?.addEventListener('click', () => {
    const name     = document.getElementById('regNombre').value.trim();
    const email    = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    hideError('registerError');

    if (!name || !email || !password) {
      showError('registerError', 'Todos los campos son obligatorios.');
      return;
    }

    const result = register(name, email, password);
    if (result.ok) {
      closeModal('authModal');
      showToast(result.message, 'success');
      navigateTo(state.activeView);
    } else {
      showError('registerError', result.message);
    }
  });

  // Cerrar sesion
  document.getElementById('btnLogout')?.addEventListener('click', logout);


  /* --- Filtros del mapa --- */

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeZoneFilter = btn.dataset.zone;
      renderParkingMap();
    });
  });


  /* --- Modal de reserva --- */

  document.getElementById('btnCloseReserva')
    ?.addEventListener('click', () => closeModal('reservaModal'));
  document.getElementById('reservaModal')
    ?.addEventListener('click', e => handleOverlayClick(e, 'reservaModal'));

  document.getElementById('btnConfirmarReserva')?.addEventListener('click', () => {
    const spaceId  = document.getElementById('reservaModal').dataset.spaceId;
    const duration = parseInt(document.getElementById('reservaDuracion').value, 10);
    const plate    = document.getElementById('reservaPlaca').value.trim().toUpperCase();

    hideError('reservaError');

    if (!plate) {
      showError('reservaError', 'Ingresa la placa del vehiculo.');
      return;
    }
    if (!duration || duration < 1 || duration > 8) {
      showError('reservaError', 'La duracion debe estar entre 1 y 8 horas.');
      return;
    }

    createReservation(spaceId, duration, plate);
  });


  /* --- Modal de espacio (admin) --- */

  document.getElementById('btnNuevoEspacio')?.addEventListener('click', () => {
    document.getElementById('espacioEditId').value = '';
    document.getElementById('espacioNumero').value  = '';
    document.getElementById('espacioZona').value    = 'A';
    document.getElementById('espacioTipo').value    = 'Estandar';
    document.getElementById('espacioEstado').value  = 'available';
    document.getElementById('espacioModalTitle').textContent = 'Nuevo espacio';
    openModal('espacioModal');
  });

  document.getElementById('btnCloseEspacio')
    ?.addEventListener('click', () => closeModal('espacioModal'));
  document.getElementById('espacioModal')
    ?.addEventListener('click', e => handleOverlayClick(e, 'espacioModal'));
  document.getElementById('btnGuardarEspacio')
    ?.addEventListener('click', saveEspacio);


  /* --- Delegacion de eventos en tablas admin --- */

  document.getElementById('adminEspaciosBody')
    ?.addEventListener('click', handleEspacioAction);
  document.getElementById('adminUsuariosBody')
    ?.addEventListener('click', handleUsuarioAction);


  /* --- Pestanas del panel admin --- */

  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      // Desactivar todas las pestanas y paneles
      document.querySelectorAll('.tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      document.querySelectorAll('.tab-panel').forEach(p => {
        p.classList.remove('active');
        p.hidden = true;
      });
      // Activar la pestana seleccionada
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      const panel = document.getElementById(`tab${_capitalize(tab.dataset.tab)}`);
      if (panel) { panel.classList.add('active'); panel.hidden = false; }
    });
  });


  /* --- Exportar reporte CSV --- */

  document.getElementById('btnExportReporte')
    ?.addEventListener('click', exportReportCSV);


  /* --- Busqueda en historial --- */

  document.getElementById('historialSearch')
    ?.addEventListener('input', renderHistorial);


  /* --- Menu hamburguesa movil --- */

  document.getElementById('hamburger')
    ?.addEventListener('click', toggleMobileMenu);

  // Cerrar menu movil al redimensionar a escritorio
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeMobileMenu();
  });


  /* --- Cerrar modales con tecla Escape --- */

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    ['authModal', 'reservaModal', 'espacioModal'].forEach(closeModal);
  });


  /* --- Inicializacion: mostrar la vista de inicio --- */
  navigateTo('inicio');
});


/* =============================================================
   17. UTILIDADES INTERNAS
============================================================= */

/**
 * Capitaliza la primera letra de una cadena.
 * @param {string} str
 * @returns {string}
 */
function _capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}
