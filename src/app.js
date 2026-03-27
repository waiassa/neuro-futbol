// Minimal frontend to interact with Apps Script web app
let API_BASE = '';

function qs(sel){ return document.querySelector(sel); }

async function fetchJSON(path){
  const url = API_BASE + '?op=' + path;
  const res = await fetch(url);
  return res.json();
}

async function loadSchedules(){
  const schedules = await fetchJSON('getSchedules');
  const counts = await fetchJSON('getCounts');
  const container = qs('#schedules');
  container.innerHTML = '';

  schedules.forEach(s => {
    const c = counts[s.id] || 0;
    const el = document.createElement('div');
    el.className = 'schedule';
    el.innerHTML = `<strong>${s.category}</strong> — ${s.day} ${s.time} — <span class="count">${c}</span> inscritos
      <br><button data-id="${s.id}" class="register">Inscribir</button>`;
    container.appendChild(el);
  });

  document.querySelectorAll('.register').forEach(btn => {
    btn.onclick = async () => {
      const scheduleId = btn.dataset.id;
      const parentEmail = prompt('Email del padre/tutor:');
      const childName = prompt('Nombre del niño:');
      if(!parentEmail || !childName) return alert('Datos incompletos');
      const url = API_BASE + `?op=register&scheduleId=${encodeURIComponent(scheduleId)}&parentEmail=${encodeURIComponent(parentEmail)}&childName=${encodeURIComponent(childName)}`;
      const r = await fetch(url);
      const j = await r.json();
      alert(j.message || 'OK');
      loadSchedules();
    }
  });
}

qs('#loadBtn').addEventListener('click', ()=>{
  API_BASE = qs('#apiBase').value.trim();
  if(!API_BASE) return alert('Pega la URL del Web App de Apps Script');
  loadSchedules();
});

// Admin: agregar turno
qs('#addScheduleBtn').addEventListener('click', async ()=>{
  const key = qs('#adminKey').value.trim();
  if(!key) return alert('Admin key requerida');
  const category = qs('#newCategory').value.trim();
  const day = qs('#newDay').value.trim();
  const time = qs('#newTime').value.trim();
  if(!category||!day||!time) return alert('Completa todos los campos');
  const url = API_BASE + `?op=adminAddSchedule&adminKey=${encodeURIComponent(key)}&category=${encodeURIComponent(category)}&day=${encodeURIComponent(day)}&time=${encodeURIComponent(time)}`;
  const r = await fetch(url);
  const j = await r.json();
  alert(j.message || 'OK');
  loadSchedules();
});

// Small helper to run on load if desired
window.app = { loadSchedules };
