// Frontend with separated entries for families and admin.
const SCRIPT_EXEC_URL = 'https://script.google.com/macros/s/AKfycbyP9Ozbq7RKXfRf67TAbHBIE6ojTIAqhq2WXbUd34e8-TF-sPtfOTuxhjTSfquSYcE/exec';
const PARENT_API_BASE = `${SCRIPT_EXEC_URL}?route=parent`;
const ADMIN_API_BASE = `${SCRIPT_EXEC_URL}?route=admin`;

function qs(sel){ return document.querySelector(sel); }

function buildUrl(baseUrl, params){
  const sep = baseUrl.includes('?') ? '&' : '?';
  return baseUrl + sep + new URLSearchParams(params).toString();
}

async function fetchJSON(baseUrl, op){
  const url = buildUrl(baseUrl, { op: op });
  const res = await fetch(url);
  return res.json();
}

function getRole(){
  return document.body.dataset.role || 'parent';
}

async function loadSchedules(){
  const role = getRole();
  const schedules = await fetchJSON(PARENT_API_BASE, 'getSchedules');
  const counts = await fetchJSON(PARENT_API_BASE, 'getCounts');
  const container = qs('#schedules');
  if(!container) return;
  container.innerHTML = '';

  schedules.forEach(s => {
    const c = counts[s.id] || 0;
    const el = document.createElement('div');
    el.className = 'schedule';
    const registerButton = role === 'parent' ? `<br><button data-id="${s.id}" class="register">Inscribir</button>` : '';
    el.innerHTML = `<strong>${s.category}</strong> — ${s.day} ${s.time} — <span class="count">${c}</span> inscritos${registerButton}`;
    container.appendChild(el);
  });

  if(role === 'parent'){
    document.querySelectorAll('.register').forEach(btn => {
      btn.onclick = async () => {
        const scheduleId = btn.dataset.id;
        const parentEmail = prompt('Email del padre/tutor:');
        const childName = prompt('Nombre del niño:');
        if(!parentEmail || !childName) return alert('Datos incompletos');
        const url = buildUrl(PARENT_API_BASE, {
          op: 'register',
          scheduleId: scheduleId,
          parentEmail: parentEmail,
          childName: childName
        });
        const r = await fetch(url);
        const j = await r.json();
        alert(j.message || 'OK');
        loadSchedules();
      };
    });
  }
}

async function addSchedule(){
  const key = qs('#adminKey').value.trim();
  if(!key) return alert('Admin key requerida');
  const category = qs('#newCategory').value.trim();
  const day = qs('#newDay').value.trim();
  const time = qs('#newTime').value.trim();
  if(!category || !day || !time) return alert('Completa todos los campos');

  const url = buildUrl(ADMIN_API_BASE, {
    op: 'adminAddSchedule',
    adminKey: key,
    category: category,
    day: day,
    time: time
  });
  const r = await fetch(url);
  const j = await r.json();
  alert(j.message || 'OK');
  loadSchedules();
}

window.addEventListener('DOMContentLoaded', () => {
  const reloadBtn = qs('#reloadBtn');
  if(reloadBtn) reloadBtn.addEventListener('click', loadSchedules);

  const addBtn = qs('#addScheduleBtn');
  if(addBtn) addBtn.addEventListener('click', addSchedule);

  loadSchedules();
});
