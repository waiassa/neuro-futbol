// Apps Script Web App to use Google Sheets as simple backend
// Sheets expected: Schedules, Registrations

function _getSheet(name){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

function _json(data){
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function _routeFromRequest(e){
  const routeParam = e && e.parameter && e.parameter.route ? String(e.parameter.route).trim().toLowerCase() : '';
  if(routeParam) return routeParam;
  const raw = (e && e.pathInfo ? String(e.pathInfo) : '').trim().toLowerCase();
  if(!raw) return '';
  return raw.split('/')[0];
}

function _isAllowedOp(route, op){
  const parentOps = { getSchedules:true, getCounts:true, register:true };
  const adminOps = { adminAddSchedule:true };
  if(route === 'parent') return !!parentOps[op];
  if(route === 'admin') return !!adminOps[op];
  return false;
}

function doGet(e){
  const op = e.parameter.op || '';
  const route = _routeFromRequest(e);
  try{
    if(!route) return _json({error:'Ruta inválida. Usa route=parent o route=admin'});
    if(!_isAllowedOp(route, op)) return _json({error:'Operación no permitida para esta ruta'});
    if(op === 'getSchedules') return _json(getSchedules());
    if(op === 'getCounts') return _json(getCounts());
    if(op === 'register') return _json(register(e.parameter));
    if(op === 'adminAddSchedule') return _json(adminAddSchedule(e.parameter));
  }catch(err){
    return _json({error:err.message});
  }
  return _json({error:'op no reconocido'});
}

function getSchedules(){
  const sh = _getSheet('Schedules');
  if(!sh) return [];
  const data = sh.getDataRange().getValues();
  const rows = [];
  for(let i=1;i<data.length;i++){
    const r = data[i];
    rows.push({ id: String(r[0]), category: r[1], day: r[2], time: r[3] });
  }
  return rows;
}

function getCounts(){
  const sh = _getSheet('Registrations');
  if(!sh) return {};
  const data = sh.getDataRange().getValues();
  const counts = {};
  for(let i=1;i<data.length;i++){
    const r = data[i];
    const scheduleId = String(r[1]);
    counts[scheduleId] = (counts[scheduleId]||0) + 1;
  }
  return counts;
}

function register(params){
  const sh = _getSheet('Registrations');
  if(!sh) return { success:false, message:'Hoja Registrations no encontrada' };
  const scheduleId = params.scheduleId || '';
  const parentEmail = params.parentEmail || '';
  const childName = params.childName || '';
  if(!scheduleId||!parentEmail||!childName) return { success:false, message:'Faltan parámetros' };
  sh.appendRow([new Date(), scheduleId, parentEmail, childName]);
  return { success:true, message:'Inscripción registrada' };
}

function adminAddSchedule(params){
  const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if(!key || params.adminKey !== key) return { success:false, message:'adminKey inválida' };
  const sh = _getSheet('Schedules');
  if(!sh) return { success:false, message:'Hoja Schedules no encontrada' };
  // id: timestamp
  const id = String(new Date().getTime());
  sh.appendRow([id, params.category||'', params.day||'', params.time||'']);
  return { success:true, message:'Turno agregado', id:id };
}

// Helper: establecer el permiso de la hoja activa como "Anyone with link can edit".
// Ejecuta esta función desde el editor de Apps Script (requiere autorización).
function makeSheetPublicEditable(){
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var id = ss.getId();
  var file = DriveApp.getFileById(id);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
  return { success:true, message: 'Sheet set to anyone with link can edit', id: id };
}

// Ejecuta esta función desde el editor de Apps Script para introducir la clave
// ADMIN_KEY de forma interactiva (no la pongas en el repositorio).
function setAdminKeyFromPrompt(){
  var ui = SpreadsheetApp.getUi();
  var resp = ui.prompt('ADMIN_KEY', 'Introduce la ADMIN_KEY (no la compartas):', ui.ButtonSet.OK_CANCEL);
  if(resp.getSelectedButton() != ui.Button.OK) return { success:false, message:'Cancelado' };
  var key = resp.getResponseText();
  if(!key) return { success:false, message:'Clave vacía' };
  PropertiesService.getScriptProperties().setProperty('ADMIN_KEY', key);
  ui.alert('ADMIN_KEY guardada correctamente');
  return { success:true, message:'ADMIN_KEY guardada' };
}
