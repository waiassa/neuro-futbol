const SUPABASE_URL = 'https://csioueutdscvjkltkyen.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_4IddZb0z_QdO7t3pKCGwqg_kVrRMHXn';

function qs(sel){ return document.querySelector(sel); }

function getRole(){
  return document.body.dataset.role || 'parent';
}

function isConfigured(){
  return !SUPABASE_URL.includes('YOUR_PROJECT_REF') && !SUPABASE_ANON_KEY.includes('YOUR_SUPABASE_ANON_KEY');
}

function createClient(){
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

function renderScheduleCard(container, schedule, count, showRegister){
  const el = document.createElement('div');
  el.className = 'schedule';

  const title = document.createElement('strong');
  title.textContent = String(schedule.category || 'Sin categoría');
  el.appendChild(title);

  const info = document.createElement('span');
  info.textContent = ` — ${String(schedule.day || '')} ${String(schedule.time || '')} — ${count} inscritos`;
  el.appendChild(info);

  if(showRegister){
    el.appendChild(document.createElement('br'));
    const btn = document.createElement('button');
    btn.className = 'register';
    btn.dataset.id = schedule.id;
    btn.textContent = 'Inscribir';
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

  const [schedulesRes, countsRes] = await Promise.all([
    supabase.from('schedules').select('id, category, day, time, created_at').order('created_at', { ascending: true }),
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
  (schedulesRes.data || []).forEach((s) => {
    renderScheduleCard(container, s, counts[s.id] || 0, role === 'parent');
  });

  if(role === 'parent'){
    document.querySelectorAll('.register').forEach((btn) => {
      btn.onclick = async () => {
        const scheduleId = btn.dataset.id;
        const parentEmail = prompt('Email del padre/tutor:');
        const childName = prompt('Nombre del niño:');
        if(!parentEmail || !childName) return alert('Datos incompletos');

        const { error } = await supabase.from('registrations').insert({
          schedule_id: scheduleId,
          parent_email: parentEmail,
          child_name: childName
        });

        if(error) return alert(error.message);
        alert('Inscripción registrada');
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

  if(!isConfigured()) return alert('Configurá Supabase en src/app.js');

  const supabase = createClient();
  const { error } = await supabase.rpc('admin_add_schedule', {
    p_admin_key: key,
    p_category: category,
    p_day: day,
    p_time: time
  });

  if(error) return alert(error.message);

  alert('Turno agregado');
  loadSchedules();
}

window.addEventListener('DOMContentLoaded', () => {
  const reloadBtn = qs('#reloadBtn');
  if(reloadBtn) reloadBtn.addEventListener('click', loadSchedules);

  const addBtn = qs('#addScheduleBtn');
  if(addBtn) addBtn.addEventListener('click', addSchedule);

  loadSchedules();
});
