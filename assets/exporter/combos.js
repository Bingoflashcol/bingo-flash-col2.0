
// === Tamaño de combo por evento (default 6) ===
window.__BF_getEventComboSize = window.__BF_getEventComboSize || function(){
  try{
    const evt = (document.querySelector('#eventId')?.value||'').trim();
    const db  = JSON.parse(localStorage.getItem('bingo_events')||'{}');
    const cs  = db?.[evt]?.meta?.comboSize;
    const n   = parseInt(cs, 10);
    return (n && n > 0) ? n : 6;
  }catch(_){ return 6; }
};


// === Color de cartón por evento (solo bordes / azules) ===
window.__BF_getEventCardColor = window.__BF_getEventCardColor || function(){
  try{
    const evt = (document.querySelector('#eventId')?.value||'').trim();
    const db  = JSON.parse(localStorage.getItem('bingo_events')||'{}');
    return db?.[evt]?.meta?.cardColor || 'default';
  }catch(_){ return 'default'; }
};

window.__BF_getCardPalette = window.__BF_getCardPalette || function(){
  const theme = (window.__BF_getEventCardColor ? window.__BF_getEventCardColor() : 'default') || 'default';

  // Paleta base (igual a la original del proyecto)
  const base = {
    BLUE:    '#0B1222',
    STRIP:   '#16253F',
    GRID:    '#2B3A55',
    CELL:    '#FFFFFF',
    NUM:     '#0B1222',
    HEADTXT: '#E8F0FF',
    CHIP:    {B:'#2E6CF9', I:'#F05454', N:'#22C55E', G:'#F59E0B', O:'#8B5CF6'}
  };

  // Variantes: solo tocan los tonos azules (bordes / líneas / textos),
  // dejando igual las casillas, el título BINGO y los chips de colores.
  const variants = {
    rojo:   { BLUE:'#7f1d1d', STRIP:'#991b1b', GRID:'#b91c1c', NUM:'#450a0a' },
    verde:  { BLUE:'#064e3b', STRIP:'#047857', GRID:'#059669', NUM:'#022c22' },
    morado: { BLUE:'#4c1d95', STRIP:'#5b21b6', GRID:'#7c3aed', NUM:'#2e1065' },
    naranja:{ BLUE:'#92400e', STRIP:'#f97316', GRID:'#fb923c', NUM:'#78350f' },
    // 'default' u otros valores: se usa la paleta original azul
  };

  const v = variants[theme] || {};
  return {
    ...base,
    BLUE:  v.BLUE  || base.BLUE,
    STRIP: v.STRIP || base.STRIP,
    GRID:  v.GRID  || base.GRID,
    NUM:   v.NUM   || base.NUM
  };
};





const $=(s)=>document.querySelector(s);
const eventId=$('#eventId'), comboCount=$('#comboCount'), uniqueCheck=$('#uniqueCheck');
const buyerName=$('#buyerName'), buyerPhone=$('#buyerPhone');
const genBtn=$('#genBtn'), resetEventBtn=$('#resetEventBtn');
const outputFmt=$('#outputFmt'), saveEventBtn=$('#saveEventBtn'), loadEventBtn=$('#loadEventBtn');
const comboCounter=$('#comboCounter');
function loadDB(){ try{return JSON.parse(localStorage.getItem('bingo_events')||'{}');}catch{ return {}; } }
function saveDB(db){ localStorage.setItem('bingo_events', JSON.stringify(db)); }
function isSalesLocked(evt){
  try{
    const db = loadDB();
    const meta = (db && db[evt] && db[evt].meta) || {};
    return !!(meta.salesLocked || meta.ventasBloqueadas);
  }catch(_){
    return false;
  }
}


// === CONTADOR DE COMBOS (acumulado por evento) ===
function getTotalCombos(evt){
  try{ const db=loadDB(); return (db && db[evt] && db[evt].combos_total)|0; }catch(e){ return 0; }
}
function notifyParticipants(evt,buyer,deltaCombos){ try{ window.__BF_ADD_PARTICIPANT && window.__BF_ADD_PARTICIPANT(evt,buyer,deltaCombos,0); }catch(_){}}
function addTotalCombos(evt, add){
  try{
    const db=loadDB(); db[evt] = db[evt] || {cards:{}, seq:0, buyers:{}};
    db[evt].combos_total = ((db[evt].combos_total|0) + (add|0));
    saveDB(db);
    return db[evt].combos_total|0;
  }catch(e){ return 0; }
}
function setTotalCombos(evt, n){
  try{
    const db=loadDB(); db[evt] = db[evt] || {cards:{}, seq:0, buyers:{}};
    db[evt].combos_total = (n|0);
    saveDB(db);
    return db[evt].combos_total|0;
  }catch(e){ return 0; }
}
function updateComboCounter(evt){
  if(comboCounter){ comboCounter.textContent = `Combos generados: ${getTotalCombos(evt)}`; }
  if(window.__BF_UPDATE_AUTO_PROGRESS){ try{ window.__BF_UPDATE_AUTO_PROGRESS(evt); }catch(_){ } }
}
// === FIN CONTADOR ===
const COLS=[[1,15],[16,30],[31,45],[46,60],[61,75]];
function sample(a,n){const p=a.slice(),o=[];for(let i=0;i<n;i++){const j=Math.floor(Math.random()*p.length);o.push(p.splice(j,1)[0]);}return o.sort((x,y)=>x-y);}
function genCols(){const cols=COLS.map(([a,b])=>sample(Array.from({length:b-a+1},(_,i)=>i+a),5)); cols[2][2]=0; return cols;}
function sign(cols){return JSON.stringify([0,1,2,3,4].flatMap(ci=>[0,1,2,3,4].map(ri=>cols[ci][ri]|0)));}
function makeId(evt, seq){
  const up = String(evt || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12);
  const base36 = (Number(seq) || 0).toString(36).toUpperCase().padStart(5, '0');
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BF-${up}-${base36}-${rand}`;
}
function round(ctx,x,y,w,h,r,fill,stroke,color){
  if(typeof r==='number') r={tl:r,tr:r,br:r,bl:r};
  ctx.beginPath();
  ctx.moveTo(x+r.tl,y); ctx.lineTo(x+w-r.tr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r.tr);
  ctx.lineTo(x+w,y+h-r.br); ctx.quadraticCurveTo(x+w,y+h,x+w-r.br,y+h);
  ctx.lineTo(x+r.bl,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r.bl);
  ctx.lineTo(x,y+r.tl); ctx.quadraticCurveTo(x,y,x+r.tl,y);
  if(fill){const prev=ctx.fillStyle; if(color) ctx.fillStyle=color; ctx.fill(); ctx.fillStyle=prev;} if(stroke) ctx.stroke();
}

async function renderCard(card,{width=800,height=860}={}){
  const c=document.createElement('canvas'); c.width=width; c.height=height; const k=c.getContext('2d');
  const logo=await new Promise(res=>{ const i=new Image(); i.onload=()=>res(i); i.onerror=()=>res(null); i.src='assets/logo-center.png'; });

  // Palette & sizes (permite cambiar solo bordes por evento)
  const __pal = (window.__BF_getCardPalette ? window.__BF_getCardPalette() : null) || null;
  const BLUE    = __pal?.BLUE    || '#0B1222';
  const STRIP   = __pal?.STRIP   || '#16253F';
  const GRID    = __pal?.GRID    || '#2B3A55';
  const CELL    = __pal?.CELL    || '#FFFFFF';
  const NUM     = __pal?.NUM     || '#0B1222';
  const HEADTXT = __pal?.HEADTXT || '#E8F0FF';
  const CHIP    = __pal?.CHIP    || {B:'#2E6CF9', I:'#F05454', N:'#22C55E', G:'#F59E0B', O:'#8B5CF6'};

  // Base rounded blue card
  const R=24;
  function roundRect(ctx,x,y,w,h,r,fill,stroke,color){
    if(typeof r==='number') r={tl:r,tr:r,br:r,bl:r};
    ctx.beginPath();
    ctx.moveTo(x+r.tl,y);
    ctx.lineTo(x+w-r.tr,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r.tr);
    ctx.lineTo(x+w,y+h-r.br); ctx.quadraticCurveTo(x+w,y+h,x+w-r.br,y+h);
    ctx.lineTo(x+r.bl,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r.bl);
    ctx.lineTo(x,y+r.tl); ctx.quadraticCurveTo(x,y,x+r.tl,y);
    if(fill){ const prev=ctx.fillStyle; if(color) ctx.fillStyle=color; ctx.fill(); ctx.fillStyle=prev; }
    if(stroke) ctx.stroke();
  }
  roundRect(k, 8, 8, width-16, height-16, R, true, false, BLUE);

  // Inner white panel (leaves a visible blue frame all around)
  const inset=16;
  const panel = {x: 8+inset, y: 8+inset, w: width-16-2*inset, h: height-16-2*inset};
  k.fillStyle=CELL; k.fillRect(panel.x, panel.y, panel.w, panel.h);

  // Footer blue band (thicker bottom)
  const FOOTER_H=78;
  k.fillStyle=BLUE; k.fillRect(panel.x, panel.y+panel.h-FOOTER_H, panel.w, FOOTER_H);

  // Header strip
  const header={x:panel.x+14,y:panel.y+12,w:panel.w-28,h:58,r:16};
  roundRect(k, header.x, header.y, header.w, header.h, header.r, true, false, STRIP);
  const letters=['B','I','N','G','O']; const chipW=(header.w-24)/5, chipH=36, chipR=10;
  for(let i=0;i<5;i++){
    const x=header.x+12 + i*chipW, y=header.y+11;
    roundRect(k, x, y, chipW-12, chipH, chipR, true, false, CHIP[letters[i]]);
    k.fillStyle=HEADTXT; k.font='bold 30px system-ui,Segoe UI,Arial'; k.textAlign='center'; k.textBaseline='middle';
    k.fillText(letters[i], x+(chipW-12)/2, y+chipH/2);
  }

  // Grid area height excludes footer
  const gridTop = header.y + header.h + 14;
  const gridBottom = panel.y + panel.h - FOOTER_H - 14;
  const gw = panel.w - 32;
  const gh = gridBottom - gridTop;
  const gx = panel.x + 16;
  const gy = gridTop;
  const cw = gw/5, ch = gh/5;

  // Cells
  for(let ci=0;ci<5;ci++){
    for(let ri=0;ri<5;ri++){
      const x=gx+ci*cw, y=gy+ri*ch;
      k.strokeStyle=GRID; k.lineWidth=3; k.strokeRect(x,y,cw,ch);
      const v=card.cols[ci][ri];
      if(ci===2 && ri===2){
        if(logo){
          const ar=logo.width/logo.height; const maxH=ch*0.70; let h=maxH, w=h*ar; if(w>cw*0.70){ w=cw*0.70; h=w/ar; }
          k.drawImage(logo, x+(cw-w)/2, y+(ch-h)/2, w, h);
        }
      }else{
        k.fillStyle=NUM; k.font='bold 52px system-ui,Segoe UI,Arial'; k.textAlign='center'; k.textBaseline='middle';
        k.fillText(String(v), x+cw/2, y+ch/2);
      }
    }
  }

  // Footer text BIG and white
  k.fillStyle='#FFFFFF'; k.font='bold 30px system-ui,Segoe UI,Arial';
  k.textAlign='left';  k.fillText(card.id||'', panel.x+18, panel.y+panel.h-FOOTER_H/2+10);
  const rightBits=[]; if(card.buyer?.name) rightBits.push(card.buyer.name); if(card.buyer?.phone) rightBits.push(card.buyer.phone);
  if(rightBits.length){ k.textAlign='right'; k.fillText(rightBits.join(' - '), panel.x+panel.w-18, panel.y+panel.h-FOOTER_H/2+10); }

  return c;
}

async function composePage(cards){
  const PW=2550, PH=3300;
  const page=document.createElement('canvas'); page.width=PW; page.height=PH;
  const g=page.getContext('2d');
  g.fillStyle='#FFFFFF'; g.fillRect(0,0,PW,PH);
  const pad=120, gap=80, C=2, R=3;
  const cardW=Math.floor((PW - pad*2 - gap*(C-1))/C);
  const cardH=Math.floor((PH - pad*2 - gap*(R-1))/R);
  for(let i=0;i<cards.length;i++){
    const r=Math.floor(i/C), c=i% C;
    const x=pad + c*(cardW+gap), y=pad + r*(cardH+gap);
    const img=await renderCard(cards[i], {width:cardW, height:cardH});
    g.drawImage(img, x, y);
  }
  return page.toDataURL('image/jpeg', 0.95);
}
function b64ToBytes(dataURL){ const b64=dataURL.split(',')[1]||dataURL; const bin=atob(b64); const bytes=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i); return bytes; }
function downloadPDF(pages, filename){
  const pageW=612, pageH=792;
  const enc=s=>new TextEncoder().encode(s);
  let buf=enc('%PDF-1.4\n'); const xref=[{off:0}];
  function obj(content){ const id=xref.length; const head=enc(id+' 0 obj\n'); const body=(content instanceof Uint8Array)?content:enc(content); const tail=enc('\nendobj\n'); const off=buf.length; const tmp=new Uint8Array(buf.length+head.length+body.length+tail.length); tmp.set(buf,0); tmp.set(head,buf.length); tmp.set(body,buf.length+head.length); tmp.set(tail,buf.length+head.length+body.length); buf=tmp; xref.push({off}); return id; }
  const pageIds=[];
  pages.forEach((dataURL,idx)=>{ const jpeg=b64ToBytes(dataURL); const w=2550,h=3300;
    const imgId=obj(new Uint8Array([...enc(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`), ...jpeg, ...enc('\nendstream')]));
    const content=`q\n${pageW} 0 0 ${pageH} 0 0 cm\n/Im${idx+1} Do\nQ\n`; const contId=obj(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    const resId=obj(`<< /XObject << /Im${idx+1} ${imgId} 0 R >> >>`); const pageId=obj(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Resources ${resId} 0 R /Contents ${contId} 0 R >>`); pageIds.push(pageId); });
  const kids=pageIds.map(id=>`${id} 0 R`).join(' ');
  const pagesId=obj(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pageIds.length} >>`);
  const catalogId=obj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  const xrefStart=buf.length; let x='xref\n0 '+(xref.length)+'\n0000000000 65535 f \n'; for(let i=1;i<xref.length;i++) x+=String(xref[i].off).padStart(10,'0')+' 00000 n \n';
  buf = new Uint8Array([...buf, ...enc(x), ...enc(`trailer\n<< /Size ${xref.length} /Root ${catalogId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`)]);
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([buf],{type:'application/pdf'})); a.download=filename||'cartones_letter.pdf'; document.body.appendChild(a); a.click(); a.remove();
}
function generateUniqueCards(n, evt, buyer, avoidRepeat=true){
  const db = loadDB();
  db[evt] ||= { cards:{}, ids:{}, generated:[], won:{}, seq:0, buyers:{}, combos_total:0, individuales_total:0, meta:{}, vendors:{} };
  const ref = db[evt];
  const used = ref.cards || (ref.cards = {});
  const usedIds = ref.ids  || (ref.ids  = {});
  if (!Array.isArray(ref.generated)) ref.generated = [];
  if (!ref.won) ref.won = {};
  const cards = [];
  let tries = 0;
  while (cards.length < n && tries < n * 2000) {
    const cols = genCols();
    const s = sign(cols);
    if (!avoidRepeat || !used[s]) {
      let id;
      do {
        ref.seq = (ref.seq|0) + 1;
        id = makeId(evt, ref.seq);
      } while (usedIds[id]);
      used[s] = 1;
      usedIds[id] = 1;
      const c = { cols, id, buyer };
      cards.push(c);
      try { ref.generated.push({ id, cols, buyer, t: Date.now() }); } catch(_) {}
    }
    tries++;
  }
  saveDB(db);
  return cards;
}
async function onGenerate(){
  const evt=(eventId?.value||'').trim(); 
  if(!evt) return alert('Evento es obligatorio');
  if (isSalesLocked(evt)){
    alert('Las ventas de cartones están bloqueadas para este evento. No se pueden generar más cartones.');
    return;
  }

const combos=Math.max(1,Math.min(999, Number(comboCount?.value)||1));
  const vendorSel = document.getElementById('buyerVendor');
  const vendorId = vendorSel && vendorSel.value ? String(vendorSel.value).trim() : '';
  const buyer={name:(buyerName?.value||'').trim(), phone:(buyerPhone?.value||'').trim(), vendorId};
  const avoid = true; // siempre evitar repetir combinaciones dentro del evento
  // (ignoramos el checkbox de unicidad para máxima seguridad)
  const pages=[];
  for(let c=0;c<combos;c++){ const six=generateUniqueCards((window.__BF_getEventComboSize?window.__BF_getEventComboSize():6), evt, buyer, avoid); pages.push(await composePage(six)); comboCounter && (comboCounter.textContent=`Combos generados: ${c+1}`); }
  if(outputFmt?.value==='jpg'){ for(let i=0;i<pages.length;i++){ const a=document.createElement('a'); a.href=pages[i]; a.download=`${evt}-combo-${String(i+1).padStart(3,'0')}.jpg`; document.body.appendChild(a); a.click(); a.remove(); } }
  else downloadPDF(pages, `${evt}.pdf`);
  addTotalCombos(evt, combos);
      notifyParticipants(evt, buyer, combos);
  updateComboCounter(evt);
  if(buyerName) buyerName.value = '';
  if(buyerPhone) buyerPhone.value = '';
  if(vendorSel) vendorSel.value = '';
}
genBtn && genBtn.addEventListener('click', onGenerate);

document.addEventListener('DOMContentLoaded', function(){
  const evt=(eventId?.value||'').trim()||'default';
  updateComboCounter(evt);
});
eventId && eventId.addEventListener('input', function(){
  const evt=(eventId?.value||'').trim()||'default';
  updateComboCounter(evt);
});
resetEventBtn && resetEventBtn.addEventListener('click', function(){
  const evt=(eventId?.value||'').trim()||'default';
  setTotalCombos(evt, 0);
  updateComboCounter(evt);
});



/* ---- Non-intrusive API export for other modules ---- */
try {
  window.BF_COMBOS = window.BF_COMBOS || {
    genCols: typeof genCols!=='undefined' ? genCols : null,
    renderCard: typeof renderCard!=='undefined' ? renderCard : null,
    composePage: typeof composePage!=='undefined' ? composePage : null,
    downloadPDF: typeof downloadPDF!=='undefined' ? downloadPDF : null,
    generateUniqueCards: typeof generateUniqueCards!=='undefined' ? generateUniqueCards : null
  };
} catch(e) {}




// === Multi-evento: helpers + Guardar/Cargar (mínimo, sin tocar generación) ===
function ensureEvent(db, evt){
  db[evt] = db[evt] || { cards:{}, seq:0, buyers:{}, combos_total:(db[evt]?.combos_total|0), individuales_total:(db[evt]?.individuales_total|0) };
  return db;
}
function timestampStr(d=new Date()){
  const pad=n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}
if (saveEventBtn) saveEventBtn.addEventListener('click', ()=>{
  try{
    const evt=(eventId?.value||'').trim()||'default';
    const db=loadDB();
    if(!db[evt]){ alert('No hay datos para este evento.'); return; }
    const payload={eventId:evt, data:db[evt]};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`${evt}_${timestampStr()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
  }catch(e){ console.error(e); alert('No se pudo guardar el evento.'); }
});
if (loadEventBtn) loadEventBtn.addEventListener('click', ()=>{
  const inp=document.createElement('input'); inp.type='file'; inp.accept='application/json';
  inp.onchange=async (e)=>{
    const f=e.target.files?.[0]; if(!f) return;
    try{
      const text=await f.text();
      const obj=JSON.parse(text);
      const eid=obj?.eventId, data=obj?.data;
      if(!eid || !data){ alert('Archivo inválido.'); return; }
      const db=loadDB(); ensureEvent(db, eid); db[eid]=data; saveDB(db);
      if(eventId) eventId.value=eid;
      try{ updateComboCounter && updateComboCounter(eid); }catch(_){}
      try{ window.__BF_ADD_INDIVIDUALES && window.__BF_ADD_INDIVIDUALES(eid, 0); }catch(_){}
      alert(`Evento "${eid}" cargado correctamente ✅`);
    }catch(err){ console.error(err); alert('No se pudo leer el archivo.'); }
  };
  inp.click();
});


// === Auditoría de IDs / Grillas por evento ===
function auditEvent(evt){
  try{
    const db = loadDB();
    const ev = db && db[evt];
    if(!ev){ alert('No existe el evento "'+evt+'".'); return; }

    const idsMap = (ev.ids && typeof ev.ids==='object') ? ev.ids : {};
    const cardsMap = (ev.cards && typeof ev.cards==='object') ? ev.cards : {};

    const ids = Object.keys(idsMap);
    let dupIds = 0;
    for(const id of ids){ if((idsMap[id]|0) > 1) dupIds++; }

    const detailed = Object.keys(cardsMap).length;
    const indTotal = (ev.individuales_total|0);
    const comboTotal = (ev.combos_total|0);

    const uniq = new Set();
    const addCols = (cols)=>{ if(Array.isArray(cols)) { try{ uniq.add(JSON.stringify(cols)); }catch(_){ } } };

    for(const id of Object.keys(cardsMap)){
      const c = cardsMap[id];
      if(c && Array.isArray(c.cols)) addCols(c.cols);
    }

    // Fallback: versiones viejas guardaban `generated` como array de strings "id|[cols]".
    if(uniq.size===0 && Array.isArray(ev.generated)){
      for(const row of ev.generated){
        if(typeof row !== 'string') continue;
        const p = row.split('|');
        if(p.length<2) continue;
        try{ addCols(JSON.parse(p[1])); }catch(_){ }
      }
    }

    alert(
      'Auditoría de "'+evt+'":
' +
      '• IDs en tabla: ' + ids.length + '
' +
      '• IDs duplicados: ' + dupIds + '
' +
      '• Cartones detallados: ' + detailed + '
' +
      '• Individuales (contador): ' + indTotal + '
' +
      '• Combos (contador): ' + comboTotal + '
' +
      '• Grillas únicas: ' + uniq.size
    );
  }catch(e){ console.error(e); alert('No se pudo auditar el evento.'); }
}
// === Reparación de evento (estructura y datos) ===
function repairEvent(evt){
  try{
    const db = loadDB(); db[evt] = db[evt] || {}; const ev = db[evt];
    ev.cards ||= {}; ev.ids ||= {}; ev.generated = Array.isArray(ev.generated)?ev.generated:[]; ev.won ||= {};
    ev.buyers ||= {}; ev.combos_total = ev.combos_total|0; ev.individuales_total = ev.individuales_total|0; ev.meta ||= {};
    for(const c of ev.generated){ if(c?.id) ev.ids[c.id] = 1; }
    let maxSeq = 0; const rx=/^BF-[A-Z0-9]*-([0-9A-Z]{5})-/;
    for(const id of Object.keys(ev.ids)){ const m=rx.exec(String(id)); if(m){ const s=parseInt(m[1],36)||0; if(s>maxSeq) maxSeq=s; } }
    if(!ev.seq || ev.seq < maxSeq) ev.seq = maxSeq;
    saveDB(db);
    alert('✅ Evento reparado: '+evt+'\n• cards:'+Object.keys(ev.cards).length+'\n• ids:'+Object.keys(ev.ids).length+'\n• generated:'+ev.generated.length+'\n• seq:'+(ev.seq|0));
  }catch(e){ console.error(e); alert('No se pudo reparar el evento.'); }
}
document.addEventListener('DOMContentLoaded', function(){
  const auditBtn = document.querySelector('#auditIdsBtn'); 
  auditBtn && auditBtn.addEventListener('click', function(){ const evt=(eventId?.value||'').trim(); if(!evt) return alert('Primero escribe un evento.'); auditEvent(evt); });
  const repairBtn = document.querySelector('#repairEventBtn'); 
  repairBtn && repairBtn.addEventListener('click', function(){ const evt=(eventId?.value||'').trim(); if(!evt) return alert('Primero escribe un evento.'); repairEvent(evt); });
});
