const SUPABASE_URL = 'https://csioueutdscvjkltkyen.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4IddZb0z_QdO7t3pKCGwqg_kVrRMHXn';
const ADMIN_SESSION_KEY = 'neuro_futbol_admin_session';
const FAMILY_SESSION_KEY = 'neuro_futbol_family_session';
let adminSessionMemory = null;
let familySessionMemory = null;
let adminSchedulesCache = [];
let adminCalendarCursor = new Date();
adminCalendarCursor.setDate(1);

function qs(sel){ return document.querySelector(sel); }

function formatScheduleLabel(schedule){
  if(schedule && schedule.start_at){
    const dt = new Date(schedule.start_at);
    if(!Number.isNaN(dt.getTime())){
      return new Intl.DateTimeFormat('es-AR', {
        weekday: 'short',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      }).format(dt);
    }
  }
  return `${String(schedule.day || '')} ${String(schedule.time || '')}`.trim();
}

function dateKey(d){
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function renderAdminCalendar(schedules){
  if(getRole() !== 'admin') return;
  const grid = qs('#adminCalendarGrid');
  const monthLabel = qs('#calendarMonthLabel');
  if(!grid || !monthLabel) return;

  const viewYear = adminCalendarCursor.getFullYear();
  const viewMonth = adminCalendarCursor.getMonth();
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = firstOfMonth.getDay();
  const firstCellDate = new Date(viewYear, viewMonth, 1 - startWeekday);
  const itemsByDay = {};

  (schedules || []).forEach((s) => {
    if(!s.start_at) return;
    const d = new Date(s.start_at);
    if(Number.isNaN(d.getTime())) return;
    const key = dateKey(d);
    if(!itemsByDay[key]) itemsByDay[key] = [];
    itemsByDay[key].push(s);
  });

  monthLabel.textContent = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(firstOfMonth);
  grid.innerHTML = '';

  for(let i=0;i<42;i++){
    const dayDate = new Date(firstCellDate);
    dayDate.setDate(firstCellDate.getDate() + i);
    const key = dateKey(dayDate);
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    if(dayDate.getMonth() !== viewMonth) cell.classList.add('muted');

    const header = document.createElement('div');
    header.className = 'calendar-day-header';
    header.textContent = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(dayDate);
    cell.appendChild(header);

    (itemsByDay[key] || []).forEach((s) => {
      const item = document.createElement('div');
      item.className = 'calendar-item';
      const timeLabel = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' }).format(new Date(s.start_at));
      item.textContent = `${timeLabel} · ${s.category}`;
      cell.appendChild(item);
    });

    grid.appendChild(cell);
  }
}

function getRole(){
  return document.body.dataset.role || 'parent';
}

function isConfigured(){
  return !SUPABASE_URL.includes('YOUR_PROJECT_REF') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');
}

function createClient(){
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function getAdminSession(){
  try{
    const raw = sessionStorage.getItem(ADMIN_SESSION_KEY);
    if(!raw) return adminSessionMemory;
    const parsed = JSON.parse(raw);
    if(!parsed || !parsed.username || !parsed.password) return adminSessionMemory;
    return parsed;
  }catch(e){
    return adminSessionMemory;
  }
}

function setAdminSession(username, password){
  adminSessionMemory = { username: username, password: password };
  try{
    sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminSessionMemory));
  }catch(e){
    // ignore storage errors; memory fallback keeps session for this tab
  }
}

function clearAdminSession(){
  adminSessionMemory = null;
  try{
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  }catch(e){
    // ignore storage errors
  }
}

function getFamilySession(){
  try{
    const raw = sessionStorage.getItem(FAMILY_SESSION_KEY);
    if(!raw) return familySessionMemory;
    const parsed = JSON.parse(raw);
    if(!parsed || !parsed.username || !parsed.pin) return familySessionMemory;
    return parsed;
  }catch(e){
    return familySessionMemory;
  }
}

function setFamilySession(username, pin){
  familySessionMemory = { username: username, pin: pin };
  try{
    sessionStorage.setItem(FAMILY_SESSION_KEY, JSON.stringify(familySessionMemory));
  }catch(e){
    // ignore storage errors; memory fallback keeps session for this tab
  }
}

function clearFamilySession(){
  familySessionMemory = null;
  try{
    sessionStorage.removeItem(FAMILY_SESSION_KEY);
  }catch(e){
    // ignore storage errors
  }
}

function updateAdminUi(){
  if(getRole() !== 'admin') return;
  const session = getAdminSession();
  const status = qs('#adminSessionStatus');
  const loginPanel = qs('#adminLoginPanel');
  const protectedPanel = qs('#adminProtected');
  const usernameInput = qs('#adminUsername');
  const passwordInput = qs('#adminPassword');
  if(status) status.textContent = session ? `Conectado como ${session.username}` : 'No autenticado';
  if(loginPanel) loginPanel.style.display = session ? 'none' : 'block';
  if(protectedPanel) protectedPanel.style.display = session ? 'block' : 'none';
  if(!session && usernameInput) usernameInput.focus();
  if(!session && passwordInput) passwordInput.value = '';
}

function updateFamilyUi(){
  if(getRole() !== 'parent') return;
  const session = getFamilySession();
  const status = qs('#familySessionStatus');
  const panel = qs('#familyLoginPanel');
  const container = qs('#schedules');
  const usernameInput = qs('#familyUsername');
  const pinInput = qs('#familyPin');
  const loginBtn = qs('#familyLoginBtn');
  if(status) status.textContent = session ? `Conectado como ${session.username}` : 'No autenticado';
  if(panel) panel.style.display = 'block';
  if(usernameInput) usernameInput.disabled = !!session;
  if(pinInput) pinInput.disabled = !!session;
  if(loginBtn) loginBtn.disabled = !!session;
  if(container && !session){
    container.innerHTML = '<p>Iniciá sesión para ver tus turnos.</p>';
  }
}

async function adminLogin(){
  const username = qs('#adminUsername') ? qs('#adminUsername').value.trim() : '';
  const password = qs('#adminPassword') ? qs('#adminPassword').value : '';
  if(!username || !password) return alert('Usuario y contraseña requeridos');

  const supabase = createClient();
  const { data, error } = await supabase.rpc('verify_admin_login', {
    p_username: username,
    p_password: password
  });
  if(error) return alert(error.message);
  if(!data) return alert('Usuario o contraseña inválidos');

  setAdminSession(username, password);
  updateAdminUi();
  loadSchedules();
  alert('Sesión iniciada');
}

function adminLogout(){
  clearAdminSession();
  updateAdminUi();
}

async function ensureAdminSession(){
  let session = getAdminSession();
  if(session) return session;

  const username = qs('#adminUsername') ? qs('#adminUsername').value.trim() : '';
  const password = qs('#adminPassword') ? qs('#adminPassword').value : '';
  if(!username || !password) return null;

  const supabase = createClient();
  const { data, error } = await supabase.rpc('verify_admin_login', {
    p_username: username,
    p_password: password
  });
  if(error || !data) return null;

  setAdminSession(username, password);
  updateAdminUi();
  return { username: username, password: password };
}

async function familyLogin(){
  const username = qs('#familyUsername') ? qs('#familyUsername').value.trim() : '';
  const pin = qs('#familyPin') ? qs('#familyPin').value.trim() : '';
  if(!username || !pin) return alert('Usuario y código requeridos');
  if(!/^\d{4}$/.test(pin)) return alert('El código debe tener 4 números');

  const supabase = createClient();
  const { data, error } = await supabase.rpc('family_login', {
    p_username: username,
    p_pin: pin
  });
  if(error) return alert(error.message);
  if(!data || !data.length) return alert('Usuario o código inválidos');

  setFamilySession(username, pin);
  updateFamilyUi();
  loadSchedules();
}

function familyLogout(){
  clearFamilySession();
  updateFamilyUi();
}

function renderScheduleCard(container, schedule, count, showRegister){
  const el = document.createElement('div');
  el.className = 'schedule';

  const title = document.createElement('strong');
  title.textContent = String(schedule.category || 'Sin categoría');
  el.appendChild(title);

  const info = document.createElement('span');
  info.textContent = ` — ${formatScheduleLabel(schedule)} — ${count} inscriptos`;
  el.appendChild(info);

  if(showRegister){
    el.appendChild(document.createElement('br'));
    const btn = document.createElement('button');
    const isRegistered = !!schedule.is_registered;
    btn.className = isRegistered ? 'cancel' : 'register';
    btn.dataset.id = schedule.id;
    btn.dataset.action = isRegistered ? 'cancel' : 'register';
    btn.textContent = isRegistered ? 'Borrar turno' : 'Inscribir';
    el.appendChild(btn);
  }

  container.appendChild(el);
}

function mapCounts(rows){
  const out = {};
  (rows || []).forEach((r) => {
    out[String(r.schedule_id)] = Number(r.total || 0);
  });
  return out;
}

async function loadSchedules(){
  const role = getRole();
  const container = qs('#schedules');
  if(!container) return;
  container.innerHTML = '';

  if(!isConfigured()){
    container.innerHTML = '<p>Configurá SUPABASE_URL y SUPABASE_ANON_KEY en src/app.js</p>';
    return;
  }

  const supabase = createClient();
  if(role === 'admin' && !getAdminSession()){
    updateAdminUi();
    return;
  }
  if(role === 'parent'){
    const session = getFamilySession();
    if(!session){
      updateFamilyUi();
      return;
    }
    const { data, error } = await supabase.rpc('get_family_schedules', {
      p_username: session.username,
      p_pin: session.pin
    });
    if(error){
      container.innerHTML = `<p>Error cargando turnos: ${error.message}</p>`;
      return;
    }
    (data || []).forEach((s) => {
      renderScheduleCard(container, s, Number(s.total || 0), true);
    });
    document.querySelectorAll('.register, .cancel').forEach((btn) => {
      btn.onclick = async () => {
        const scheduleId = btn.dataset.id;
        const action = btn.dataset.action || 'register';
        if(action === 'cancel'){
          const { error: delError } = await supabase.rpc('cancel_family_registration', {
            p_username: session.username,
            p_pin: session.pin,
            p_schedule_id: scheduleId
          });
          if(delError) return alert(delError.message);
          alert('Turno borrado');
          loadSchedules();
          return;
        }

        const parentEmail = `${session.username}@familia.neurofutbol.local`;
        const childName = session.username;
        const { error: regError } = await supabase.rpc('register_family', {
          p_username: session.username,
          p_pin: session.pin,
          p_schedule_id: scheduleId,
          p_parent_email: parentEmail,
          p_child_name: childName
        });
        if(regError) return alert(regError.message);
        alert('Turno reservado');
        loadSchedules();
      };
    });
    return;
  }

  const [schedulesRes, countsRes] = await Promise.all([
    supabase.from('schedules').select('id, category, start_at, created_at').order('start_at', { ascending: true }).order('created_at', { ascending: true }),
    supabase.rpc('get_schedule_counts')
  ]);
  if(schedulesRes.error){
    container.innerHTML = `<p>Error cargando turnos: ${schedulesRes.error.message}</p>`;
    return;
  }
  if(countsRes.error){
    container.innerHTML = `<p>Error cargando conteos: ${countsRes.error.message}</p>`;
    return;
  }
  const counts = mapCounts(countsRes.data);
  adminSchedulesCache = (schedulesRes.data || []);
  adminSchedulesCache.forEach((s) => {
    renderScheduleCard(container, s, counts[s.id] || 0, false);
  });
  renderAdminCalendar(adminSchedulesCache);
}

async function addSchedule(){
  const session = await ensureAdminSession();
  if(!session) return alert('Primero iniciá sesión de admin');

  const category = qs('#newCategory').value.trim();
  const date = qs('#newDate').value.trim();
  const time = qs('#newTime').value.trim();
  if(!category || !date || !time) return alert('Completa categoría, fecha y hora');
  if(!/^\d{2}:00$/.test(time)) return alert('Solo se permiten horarios en punto (ej: 09:00, 13:00)');
  const startAt = new Date(`${date}T${time}:00`);
  if(Number.isNaN(startAt.getTime())) return alert('Fecha u hora inválida');

  if(!isConfigured()) return alert('Configurá Supabase en src/app.js');

  const supabase = createClient();
  const { error } = await supabase.rpc('admin_add_schedule', {
    p_username: session.username,
    p_password: session.password,
    p_category: category,
    p_start_at: startAt.toISOString()
  });

  if(error) return alert(error.message);

  alert('Turno agregado');
  loadSchedules();
}

async function createFamilyUser(){
  const session = await ensureAdminSession();
  if(!session) return alert('Primero iniciá sesión de admin');
  const familyUsername = qs('#familyNewUsername').value.trim();
  const familyPin = qs('#familyNewPin').value.trim();
  const familyCategory = qs('#familyNewCategory').value.trim();
  if(!familyUsername || !familyPin || !familyCategory) return alert('Completa usuario, código y categoría');
  if(!/^\d{4}$/.test(familyPin)) return alert('El código debe tener 4 números');

  const supabase = createClient();
  const { error } = await supabase.rpc('admin_create_family_user', {
    p_admin_username: session.username,
    p_admin_password: session.password,
    p_family_username: familyUsername,
    p_family_pin: familyPin,
    p_family_category: familyCategory
  });
  if(error) return alert(error.message);
  alert('Usuario de familia creado/actualizado');
}

window.addEventListener('DOMContentLoaded', () => {
  if(getRole() === 'admin'){
    clearAdminSession();
  }

  const reloadBtn = qs('#reloadBtn');
  if(reloadBtn) reloadBtn.addEventListener('click', loadSchedules);

  const addBtn = qs('#addScheduleBtn');
  if(addBtn) addBtn.addEventListener('click', addSchedule);

  const loginBtn = qs('#adminLoginBtn');
  if(loginBtn) loginBtn.addEventListener('click', adminLogin);

  const logoutBtn = qs('#adminLogoutBtn');
  if(logoutBtn) logoutBtn.addEventListener('click', adminLogout);

  const createFamilyBtn = qs('#createFamilyBtn');
  if(createFamilyBtn) createFamilyBtn.addEventListener('click', createFamilyUser);

  const familyLoginBtn = qs('#familyLoginBtn');
  if(familyLoginBtn) familyLoginBtn.addEventListener('click', familyLogin);

  const familyLogoutBtn = qs('#familyLogoutBtn');
  if(familyLogoutBtn) familyLogoutBtn.addEventListener('click', familyLogout);

  const calendarPrevBtn = qs('#calendarPrevBtn');
  if(calendarPrevBtn) calendarPrevBtn.addEventListener('click', () => {
    adminCalendarCursor.setMonth(adminCalendarCursor.getMonth() - 1);
    renderAdminCalendar(adminSchedulesCache);
  });

  const calendarNextBtn = qs('#calendarNextBtn');
  if(calendarNextBtn) calendarNextBtn.addEventListener('click', () => {
    adminCalendarCursor.setMonth(adminCalendarCursor.getMonth() + 1);
    renderAdminCalendar(adminSchedulesCache);
  });

  updateAdminUi();
  updateFamilyUi();

  loadSchedules();
});
