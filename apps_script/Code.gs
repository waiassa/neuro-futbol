// Apps Script Web App to use Google Sheets as simple backend
// Sheets expected: Schedules, Registrations

function _getSheet(name){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(name);
}

function doGet(e){
  const op = e.parameter.op || '';
  try{
    if(op === 'getSchedules') return ContentService.createTextOutput(JSON.stringify(getSchedules())).setMimeType(ContentService.MimeType.JSON);
    if(op === 'getCounts') return ContentService.createTextOutput(JSON.stringify(getCounts())).setMimeType(ContentService.MimeType.JSON);
    if(op === 'register') return ContentService.createTextOutput(JSON.stringify(register(e.parameter))).setMimeType(ContentService.MimeType.JSON);
    if(op === 'adminAddSchedule') return ContentService.createTextOutput(JSON.stringify(adminAddSchedule(e.parameter))).setMimeType(ContentService.MimeType.JSON);
  }catch(err){
    return ContentService.createTextOutput(JSON.stringify({error:err.message})).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({error:'op no reconocido'})).setMimeType(ContentService.MimeType.JSON);
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
