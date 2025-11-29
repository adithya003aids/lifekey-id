// script placeholder
// ---------- CONFIG: change this to real backend URL when available ----------
const CONFIG = {
  API_BASE: "", // e.g. "https://abcd.ngrok.io" or "https://your-backend.com"
  USE_MOCK: true // true => demo works offline using localStorage
};

// ---------- small helpers ----------
function $(id){ return document.getElementById(id); }
function showView(name){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $('view-' + name).classList.add('active');
  window.scrollTo(0,0);
}
function nowISO(){ return new Date().toISOString(); }
function randomId(){ return 'LK-' + Math.random().toString(36).slice(2,10).toUpperCase(); }

// ---------- local demo DB helpers ----------
function savePatientLocal(patient){
  let db = JSON.parse(localStorage.getItem('lk_demo')||'{"patients":[]}');
  const idx = db.patients.findIndex(p=>p.lifeKeyId===patient.lifeKeyId);
  if(idx>=0) db.patients[idx]=patient; else db.patients.push(patient);
  localStorage.setItem('lk_demo', JSON.stringify(db));
}
function getPatientById(lk){
  const db = JSON.parse(localStorage.getItem('lk_demo')||'{"patients":[]}');
  return db.patients.find(p=>p.lifeKeyId===lk);
}
function seedDemoData(){
  if(localStorage.getItem('lk_demo')) return;
  const sample = { patients:[
    { lifeKeyId:'LK-A1B2C3D4', name:'John Doe', phone:'+919876543210', age:45, blood_group:'O+', allergies:['Penicillin','Seafood'], conditions:['Diabetes'], medications:['Metformin'], emergency_contact:'+919876543210', last_updated:nowISO() },
    { lifeKeyId:'LK-E5F6G7H8', name:'Anita Rao', phone:'+919123456780', age:28, blood_group:'A+', allergies:[], conditions:['Asthma'], medications:['Salbutamol'], emergency_contact:'+919123456780', last_updated:nowISO() }
  ]};
  localStorage.setItem('lk_demo', JSON.stringify(sample));
}

// ---------- UI wiring ----------
document.addEventListener('DOMContentLoaded', ()=> {
  seedDemoData();
  showView('home');

  // navigation
  $('btn-patient').onclick = ()=> showView('patient');
  $('btn-doctor').onclick = ()=> showView('doctor');
  document.querySelectorAll('.back').forEach(b => b.addEventListener('click', e => {
    showView(e.target.dataset.target || 'home');
  }));

  // patient form
  const form = $('patient-form');
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const p = {
      lifeKeyId: randomId(),
      name: $('p-name').value.trim(),
      phone: $('p-phone').value.trim(),
      age: $('p-age').value,
      blood_group: $('p-blood').value,
      allergies: $('p-allergies').value.split(',').map(s=>s.trim()).filter(Boolean),
      conditions: $('p-conditions').value.split(',').map(s=>s.trim()).filter(Boolean),
      medications: $('p-medications').value.split(',').map(s=>s.trim()).filter(Boolean),
      emergency_contact: $('p-emer').value.trim(),
      last_updated: nowISO()
    };
    savePatientLocal(p);
    showLifeKeyCard(p);
  });

  $('btn-patient-clear').onclick = ()=> {
    form.reset();
    $('lifekey-card').classList.add('hidden');
  };

  // Lookup
  $('btn-lookup').onclick = async ()=>{
    const id = $('d-lkid').value.trim().toUpperCase();
    if(!id){ alert('Enter a LifeKey ID'); return; }
    if(CONFIG.USE_MOCK || !CONFIG.API_BASE){
      const patient = getPatientById(id);
      displayDoctorResult(patient);
    } else {
      // call backend (doctor must be authenticated in real build)
      try{
        const res = await fetch(`${CONFIG.API_BASE}/api/patient/lk/${encodeURIComponent(id)}/emergency`, { method:'GET' });
        if(!res.ok) throw new Error('Not found');
        const data = await res.json();
        displayDoctorResult(data);
      }catch(err){
        displayDoctorResult(null, 'No patient found or API error');
      }
    }
  };

  $('btn-clear-result').onclick = ()=>{
    $('doctor-result').classList.add('hidden');
  };

  // copy id
  $('lk-copy').onclick = ()=>{
    const id = $('lk-id').innerText;
    navigator.clipboard?.writeText(id).then(()=> alert('Copied ID'));
  };

  // download QR
  $('lk-download').onclick = ()=>{
    // QR image is inside qrcode element as <img> or <canvas>
    const q = $('qrcode').querySelector('img,canvas');
    if(!q) return alert('QR not ready');
    let dataURL;
    if(q.tagName === 'CANVAS') dataURL = q.toDataURL('image/png');
    else {
      // img
      // create a canvas and draw
      const img = q;
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      const ctx = c.getContext('2d'); ctx.drawImage(img,0,0);
      dataURL = c.toDataURL('image/png');
    }
    $('lk-download').href = dataURL;
    $('lk-download').download = ( $('lk-id').innerText || 'lifekey' ) + '.png';
  };

}); // DOMContentLoaded

// ---------- renderers ----------
function showLifeKeyCard(p){
  $('lifekey-card').classList.remove('hidden');
  $('lk-id').innerText = p.lifeKeyId;
  $('lk-updated').innerText = new Date(p.last_updated).toLocaleString();
  // generate QR
  const qbox = $('qrcode'); qbox.innerHTML=''; // clear
  new QRCode(qbox, { text: p.lifeKeyId, width:180, height:180, colorDark:"#000", colorLight:"#fff" });
}

// result display
function displayDoctorResult(patient, err){
  const block = $('doctor-result'), alertEl = $('result-alert'), body = $('result-body');
  if(err || !patient){
    block.classList.remove('hidden');
    alertEl.className = 'alert red'; alertEl.innerText = err || 'No patient found with this LifeKey ID';
    body.innerHTML = '<div>No data</div>';
    return;
  }
  block.classList.remove('hidden');
  // choose alert color
  if(patient.allergies && patient.allergies.length) {
    alertEl.className = 'alert red'; alertEl.innerHTML = '<b>Allergies:</b> ' + patient.allergies.join(', ');
  } else if(patient.conditions && patient.conditions.length){
    alertEl.className = 'alert orange'; alertEl.innerHTML = '<b>Conditions:</b> ' + patient.conditions.join(', ');
  } else {
    alertEl.className = 'alert green'; alertEl.innerHTML = 'No immediate red-flag information';
  }
  body.innerHTML = `
    <div><b>Name:</b> ${patient.name || '-'}</div>
    <div><b>Age:</b> ${patient.age || '-'}</div>
    <div><b>Blood Group:</b> ${patient.blood_group || '-'}</div>
    <div><b>Medications:</b> ${(patient.medications||[]).join(', ') || '-'}</div>
    <div><b>Emergency Contact:</b> ${patient.emergency_contact || '-'}</div>
    <div style="margin-top:6px"><small>Last updated: ${new Date(patient.last_updated).toLocaleString()}</small></div>
  `;
}
