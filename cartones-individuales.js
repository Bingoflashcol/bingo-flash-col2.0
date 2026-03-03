
/* ===== Cartones Individuales v2.1 (await composePage + limpieza de logos) ===== */
(function(){
  function isCanvas(x){ return x && typeof x.getContext === 'function'; }
  function isDataURL(x){ return typeof x === 'string' && x.startsWith('data:image/'); }
  function canvasToDataURL(cv){ try { return cv.toDataURL('image/jpeg', 0.95); } catch(e){ return cv.toDataURL(); } }
  function dataURLToBlob(dataURL){
    const parts = (dataURL||'').split(',');
    const mimeMatch = (parts[0]||'').match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]||'');
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while(n--) u8[n] = bstr.charCodeAt(n);
    return new Blob([u8], {type:mime});
  }

  function init(){
    const api = window.BF_COMBOS;
    if (!api || !api.composePage || !api.generateUniqueCards){
      console.warn("[CI] BF_COMBOS API no disponible");
      return;
    }
    // UI
    const btns = Array.from(document.querySelectorAll('button, input[type=button]'));
    let resetBtn = btns.find(b=>/reset\s*evento/i.test(b.textContent||b.value||''));
    if(!resetBtn) resetBtn = btns.find(b=>/reset/i.test(b.textContent||b.value||''));

    const wrap = document.createElement('div');
    wrap.style.display='flex'; wrap.style.gap='8px'; wrap.style.alignItems='center'; wrap.style.flexWrap='wrap';

    const label = document.createElement('span');
    label.textContent = "Cartones individuales:";
    label.style.color='#e5e7eb'; label.style.fontWeight='700';

    const select = document.createElement('select');
    [1,2,3,4,6,8,10].forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n+' cartón(es)'; select.appendChild(o); });
    select.style.background='#0b1325'; select.style.color='#e5e7eb'; select.style.border='1px solid rgba(255,255,255,.2)'; select.style.borderRadius='.45rem'; select.style.padding='.4rem .5rem';

    const btnPDF = document.createElement('button');
    btnPDF.textContent = 'Imprimir PDF';
    btnPDF.style.background = '#14b8a6'; btnPDF.style.border='1px solid rgba(255,255,255,.2)';
    btnPDF.style.color='#062412'; btnPDF.style.padding='.5rem .75rem'; btnPDF.style.borderRadius='.6rem'; btnPDF.style.fontWeight='700'; btnPDF.style.cursor='pointer';

    const btnJPG = document.createElement('button');
    btnJPG.textContent = 'Descargar JPGs';
    btnJPG.style.background = '#3b82f6'; btnJPG.style.border='1px solid rgba(255,255,255,.2)';
    btnJPG.style.color='#fff'; btnJPG.style.padding='.5rem .75rem'; btnJPG.style.borderRadius='.6rem'; btnJPG.style.fontWeight='700'; btnJPG.style.cursor='pointer';

    wrap.appendChild(label); wrap.appendChild(select); wrap.appendChild(btnPDF); wrap.appendChild(btnJPG);
    if(resetBtn && resetBtn.parentElement){ resetBtn.parentElement.appendChild(wrap); }
    else { document.body.appendChild(wrap); wrap.style.position='fixed'; wrap.style.bottom='16px'; wrap.style.left='16px'; }

    function isSalesLocked(evt){
      try{
        const db = JSON.parse(localStorage.getItem('bingo_events') || '{}');
        const meta = (db && db[evt] && db[evt].meta) || {};
        return !!(meta.salesLocked || meta.ventasBloqueadas);
      }catch(_){
        return false;
      }
    }

    async function makePages(n){
      /* BF_MAKEPAGES_HOOK: contaremos individuales desde este flujo también */
      const evt = (document.querySelector('#eventId')?.value || 'Evento').trim();
      if (isSalesLocked(evt)){
        alert('Las ventas de cartones están bloqueadas para este evento. No se pueden generar más cartones.');
        return { pages: [], evt };
      };
      const buyer = { name:(document.querySelector('#buyerName')?.value||'').trim(), phone:(document.querySelector('#buyerPhone')?.value||'').trim() };
      const cards = api.generateUniqueCards(n, evt, buyer, true);
      const pages = [];
      let i=0;
      while(i<cards.length){
        const slice = cards.slice(i, i+6);
        const cvOrPromise = api.composePage(slice, evt);
        const cv = (cvOrPromise && typeof cvOrPromise.then === 'function') ? await cvOrPromise : cvOrPromise;
        if (isCanvas(cv)) {
          pages.push(canvasToDataURL(cv));
        } else if (isDataURL(cv)) {
          pages.push(cv);
        } else {
          console.warn('[CI] composePage retorno desconocido', cv);
        }
        i += 6;
      }
      /* BF_INDIV_AT_RETURN */
      try{ if(window.__BF_ADD_INDIVIDUALES){ window.__BF_ADD_INDIVIDUALES(evt, (Array.isArray(cards)?cards.length:0)); } }catch(e){}
      return {pages, evt};
    }

    btnPDF.addEventListener('click', async ()=>{
      const evtId = (document.querySelector('#eventId')?.value || '').trim();
      if (!evtId){
        alert('Primero selecciona un evento antes de generar cartones.');
        return;
      }
      if (isSalesLocked(evtId)){
        alert('Las ventas están bloqueadas para este evento. No se pueden generar más cartones.');
        return;
      }
      const n = Number(select.value||1);
      const {pages, evt} = await makePages(n);
      if (api.downloadPDF) {
        api.downloadPDF(pages, `${evt}.pdf`);
      } else {
        pages.forEach(url=>{ const w = window.open(); w.document.write(`<img src="${url}">`); });
      }
    });

    btnJPG.addEventListener('click', async ()=>{
      const evtId = (document.querySelector('#eventId')?.value || '').trim();
      if (!evtId){
        alert('Primero selecciona un evento antes de generar cartones.');
        return;
      }
      if (isSalesLocked(evtId)){
        alert('Las ventas están bloqueadas para este evento. No se pueden generar más cartones.');
        return;
      }
      const n = Number(select.value||1);
      const {pages, evt} = await makePages(n);
      pages.forEach((url, idx)=>{
        const blob = dataURLToBlob(url);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${evt}_${idx+1}.jpg`;
        document.body.appendChild(a); a.click(); a.remove();
      });
    });
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    if (window.BF_COMBOS) init(); else setTimeout(init, 400);
  });
})();

/* v2.8 ensure overlay called with slice length */
(function(){
  function isCanvas(x){ return x && typeof x.getContext==='function'; }
  function isDataURL(x){ return typeof x==='string' && x.startsWith('data:image/'); }
  function canvasToDataURL(cv){ try{ return cv.toDataURL('image/jpeg',0.95);}catch(e){return cv.toDataURL();} }
  const api = window.BF_COMBOS||{};
  if (!api || !api.composePage || !api.generateUniqueCards) return;
  async function _build(n){
    const evt=(document.querySelector('#eventId')?.value||'Evento').trim();
    const buyer={name:(document.querySelector('#buyerName')?.value||'').trim(), phone:(document.querySelector('#buyerPhone')?.value||'').trim()};
    const cards=api.generateUniqueCards(n,evt,buyer, true);
    const pages=[];
    for(let i=0;i<cards.length;i+=6){
      const slice=cards.slice(i,i+6);
      let cv=api.composePage(slice,evt); if(cv&&typeof cv.then==='function') cv=await cv;
      let url=isCanvas(cv)?canvasToDataURL(cv):(isDataURL(cv)?cv:null); if(!url) continue;
      if(api.__overlayPageWithFreeLogo){ url=await api.__overlayPageWithFreeLogo(url, slice.length); }
      pages.push(url);
    }
    return {pages,evt};
  }
  window.__BF_CI_BUILD = _build;
})();

/* ===== Contador de cartones individuales por evento (usa mismo DB 'bingo_events') ===== */
(function(){
  function loadDB(){ try{return JSON.parse(localStorage.getItem('bingo_events')||'{}');}catch{ return {}; } }
  function saveDB(db){ localStorage.setItem('bingo_events', JSON.stringify(db)); }
  function getEvt(){ return (document.querySelector('#eventId')?.value||'default').trim()||'default'; }

  function addIndividuals(evt, add){
    const db=loadDB(); db[evt] = db[evt] || {cards:{}, seq:0, buyers:{}};
    db[evt].individuales_total = ((db[evt].individuales_total|0) + (add|0));
    saveDB(db);
    return db[evt].individuales_total|0;
  }
  function updateIndividualsUI(evt){
    let el = document.querySelector('#individualCounter');
    if(!el){
      const cc = document.querySelector('#comboCounter');
      if(cc){
        el = document.createElement('span');
        el.id = 'individualCounter';
        el.style.marginLeft = '12px';
        el.style.fontWeight = '600';
        cc.insertAdjacentElement('afterend', el);
      }
    }
    if(el){
      const db=loadDB(); const n=(db && db[evt] && db[evt].individuales_total)|0;
      el.textContent = `Individuales: ${n}`;
    }
  }

  document.addEventListener('DOMContentLoaded', function(){
    updateIndividualsUI(getEvt());
  });
  document.querySelector('#eventId')?.addEventListener('input', function(){
    updateIndividualsUI(getEvt());
  });
  document.querySelector('#resetEventBtn')?.addEventListener('click', function(){
    const evt = getEvt();
    const db=loadDB(); db[evt]=db[evt]||{cards:{},seq:0,buyers:{}}; db[evt].individuales_total=0; saveDB(db);
    updateIndividualsUI(evt);
  });

  // Hook: cuando el módulo de individuales construye páginas, sumamos n
  const prevBuild = window.__BF_CI_BUILD;
  if(typeof prevBuild === 'function'){
    window.__BF_CI_BUILD = async function(){
      const r = await prevBuild();
      try{
        const evt = getEvt();
        const n = (Array.isArray(r?.pages) ? r.pages.length : 0) * 6; // 6 cartones por página
        if(n>0) addIndividuals(evt, n);
        updateIndividualsUI(evt);
      }catch(e){}
      return r;
    }
  }
  window.BF_CI_COUNTER = { refresh: ()=>updateIndividualsUI(getEvt()) };
})();
