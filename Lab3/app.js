
const $ = id => document.getElementById(id);

let map, marker;
let currentImageDataUrl = null;
let gridSize = 4; 
let pieceSize = 125; 

function initMap(){
  map = L.map('map').setView([52.2297,21.0122], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
    crossOrigin: true
  }).addTo(map);
}

async function requestLocationPermission(){
  if(!('geolocation' in navigator)){
    alert('Geolokalizacja niedostępna');
    return;
  }
  navigator.geolocation.getCurrentPosition(pos=>{
    console.log('permission granted, position:', pos.coords);
    $('status').textContent = 'Lokalizacja dostępna.';
  }, err=>{
    console.warn(err);
    $('status').textContent = 'Brak dostępu do lokalizacji.';
  });
}

async function requestNotificationPermission(){
  if(!('Notification' in window)){
    alert('Powiadomienia nie są obsługiwane');
    return;
  }
  const res = await Notification.requestPermission();
  $('status').textContent = 'Uprawnienia powiadomień: ' + res;
}

function goMyLocation(){
  if(!('geolocation' in navigator)) return alert('Geolokalizacja niedostępna');
  navigator.geolocation.getCurrentPosition(pos=>{
    const lat = pos.coords.latitude.toFixed(6);
    const lon = pos.coords.longitude.toFixed(6);
    if(marker) map.removeLayer(marker);
    marker = L.marker([lat,lon]).addTo(map).bindPopup(`Moja lokalizacja:<br>${lat}, ${lon}`).openPopup();
    map.setView([lat,lon], 15);
    $('status').textContent = `Współrzędne: ${lat}, ${lon}`;
  }, err=>{
    alert('Nie udało się pobrać lokalizacji: ' + err.message);
  });
}

async function exportMapAsImage(){
  const mapEl = document.getElementById('map');
  $('status').textContent = 'Tworzę obraz mapy...';
  const canvas = await html2canvas(mapEl, {useCORS:true, allowTaint:false, scale:2});
  const dataUrl = canvas.toDataURL('image/png');
  currentImageDataUrl = dataUrl;
  const a = $('download-link');
  a.href = dataUrl;
  a.download = 'map.png';
  a.style.display = 'inline';
  a.textContent = 'Pobierz obraz mapy (kliknij prawym i zapisz lub kliknij tutaj)';
  $('status').textContent = 'Obraz mapy utworzony.';
  createPuzzleFromImage(canvas);
}

function createPuzzleFromImage(canvas){
  // read dynamic settings
  gridSize =  4;
  pieceSize =  125;

  const size = pieceSize * gridSize;
  const out = document.createElement('canvas');
  out.width = size; out.height = size;
  const ctx = out.getContext('2d');
  // draw the map canvas into a square area (center-crop)
  const minSide = Math.min(canvas.width, canvas.height);
  const sx = (canvas.width - minSide)/2;
  const sy = (canvas.height - minSide)/2;
  ctx.drawImage(canvas, sx, sy, minSide, minSide, 0, 0, out.width, out.height);

  const table = $('table');
  const tray = $('tray');
  table.innerHTML = '';
  tray.innerHTML = '';

  for(let r=0;r<gridSize;r++){
    for(let c=0;c<gridSize;c++){
      const idx = r*gridSize + c;
      const t = document.createElement('div');
      t.className = 'target';
      t.style.left = (c*pieceSize + 10) + 'px';
      t.style.top  = (r*pieceSize + 10) + 'px';
      t.dataset.index = idx;
      t.dataset.occupied = 'false';
      t.style.width = pieceSize + 'px';
      t.style.height = pieceSize + 'px';
      table.appendChild(t);
    }
  }

  const pieces = [];
  for(let r=0;r<gridSize;r++){
    for(let c=0;c<gridSize;c++){
      const px = c*pieceSize;
      const py = r*pieceSize;
      const pc = document.createElement('canvas');
      pc.width = pieceSize; pc.height = pieceSize;
      const pctx = pc.getContext('2d');
      pctx.drawImage(out, px, py, pieceSize, pieceSize, 0, 0, pieceSize, pieceSize);
      const img = new Image();
      img.src = pc.toDataURL();
      img.className = 'piece';
      img.draggable = true;
      img.dataset.index = r*gridSize + c; 
      pieces.push(img);
    }
  }

  const shuffled = pieces.slice();
  for(let i=shuffled.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }


  shuffled.forEach((img, i)=>{
    const wrap = document.createElement('div');
    wrap.style.width = pieceSize + 'px';
    wrap.style.height = pieceSize + 'px';
    wrap.style.display = 'inline-block';
    wrap.appendChild(img);
    img.style.userSelect = 'none';
    img.addEventListener('dragstart', onDragStart);
    img.addEventListener('touchstart', onTouchStart, {passive:false});
    $('tray').appendChild(wrap);
  });

  // make targets droppable
  table.querySelectorAll('.target').forEach(t=>{
    t.addEventListener('dragover', e=>e.preventDefault());
    t.addEventListener('drop', onDrop);
    // touch support: allow simple tap to place (advanced dragging can be improved)
  });

  // also allow dropping back to tray
  $('tray').addEventListener('dragover', e=>e.preventDefault());
  $('tray').addEventListener('drop', e=>{
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const el = document.querySelector(`[data-drag-id='${id}']`);
    if(el){
      // remove from any target
      const parentTarget = el.parentElement.closest('.target');
      if(parentTarget){parentTarget.dataset.occupied='false'; parentTarget.classList.remove('correct');}
      // move to tray
      e.currentTarget.appendChild(el);
      el.style.position='';
      el.style.left=''; el.style.top='';
      checkAllCorrect();
    }
  });

  $('status').textContent = 'Puzzle utworzone. Przeciągnij elementy na planszę.';
}

function onDragStart(e){
  const el = e.target;
  // give each dragging element a unique id for dataTransfer
  const uid = 'p' + Math.random().toString(36).slice(2,9);
  el.dataset.dragId = uid;
  e.dataTransfer.setData('text/plain', uid);
  // attach reference
  // store element in window map
  window._dragging = window._dragging || {};
  window._dragging[uid] = el;
}

// Basic touch fallback: start dragging by cloning element and move with touch
function onTouchStart(e){
  e.preventDefault();
  const touch = e.touches[0];
  const el = e.target;
  const clone = el.cloneNode(true);
  clone.style.position='fixed';
  clone.style.left = (touch.clientX - el.width/2) + 'px';
  clone.style.top  = (touch.clientY - el.height/2) + 'px';
  clone.style.zIndex = 9999;
  document.body.appendChild(clone);
  function move(ev){
    const t = ev.touches[0];
    clone.style.left = (t.clientX - el.width/2) + 'px';
    clone.style.top  = (t.clientY - el.height/2) + 'px';
  }
  function up(ev){
    document.removeEventListener('touchmove', move);
    document.removeEventListener('touchend', up);
    // detect element under
    const t = ev.changedTouches[0];
    const dropEl = document.elementFromPoint(t.clientX, t.clientY);
    // find closest target
    const target = dropEl && dropEl.closest('.target');
    if(target){
      placePieceAt(el, target);
    } else {
      // return to tray
    }
    clone.remove();
  }
  document.addEventListener('touchmove', move, {passive:false});
  document.addEventListener('touchend', up);
}

function onDrop(e){
  e.preventDefault();
  const uid = e.dataTransfer.getData('text/plain');
  const el = window._dragging && window._dragging[uid];
  const target = e.currentTarget;
  if(!el) return;
  placePieceAt(el, target);
}

function placePieceAt(el, target){
  // if target already has a child, swap back to tray
  if(target.dataset.occupied === 'true'){
    // move existing piece back to tray
    const existing = target.querySelector('.piece');
    if(existing) {
      $('tray').appendChild(existing);
      existing.style.position='';
    }
  }
  // move el into target
  target.appendChild(el);
  el.style.position = 'absolute';
  el.style.left = '0px';
  el.style.top = '0px';
  target.dataset.occupied = 'true';

  // check correctness
  const correctIdx = parseInt(target.dataset.index,10);
  const pieceIdx = parseInt(el.dataset.index,10);
  if(correctIdx === pieceIdx){
    target.classList.add('correct');
    el.style.pointerEvents = 'none'; // lock in place
  } else {
    target.classList.remove('correct');
  }

  checkAllCorrect();
}

function checkAllCorrect(){
  const targets = document.querySelectorAll('.target');
  let ok = true;
  for(const t of targets){
    if(!t.querySelector('.piece')){ ok = false; break; }
    const child = t.querySelector('.piece');
    if(parseInt(child.dataset.index,10) !== parseInt(t.dataset.index,10)) { ok=false; break; }
  }
  if(ok){
    $('status').textContent = 'Gratulacje! Ułożono wszystkie elementy.';
    notifySuccess();
  } else {
    // nothing
  }
}

function notifySuccess(){
  const title = 'Puzzle ułożone!';
  const body = 'Ułożyłeś wszystkie części mapy.';
  if('Notification' in window && Notification.permission === 'granted'){
    const n = new Notification(title, {body});
    n.onclick = ()=>window.focus();
  } else {
    alert(title + '\n' + body);
  }
}

// Event wiring
window.addEventListener('load', ()=>{
  initMap();
  $('btn-loc').addEventListener('click', requestLocationPermission);
  $('btn-notif').addEventListener('click', requestNotificationPermission);
  $('btn-mypos').addEventListener('click', goMyLocation);
  $('btn-export').addEventListener('click', exportMapAsImage);

  $('grid-size').addEventListener('change', ()=>{
    // nothing, used on export
  });
  $('piece-size').addEventListener('change', ()=>{
    // nothing, used on export
  });
  $('reset').addEventListener('click', ()=>{ $('table').innerHTML=''; $('tray').innerHTML=''; $('download-link').style.display='none'; $('status').textContent='Zresetowano.' });
});

// End of app.js