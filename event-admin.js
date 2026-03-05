
/* ===== Administrador de Eventos (con comboSize) ===== */
(() => {
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
  const norm = (s)=>String(s||'').trim();

  function loadDB(){ try{return JSON.parse(localStorage.getItem('bingo_events')||'{}');}catch{ return {}; } }
  function saveDB(db){ localStorage.setItem('bingo_events', JSON.stringify(db||{})); }

  // Claves internas (metadata) dentro del DB (no deben listarse como eventos)
  function __bf_isMetaKey(k){
    return typeof k === 'string' && (k === '__deletedEvents' || k.startsWith('__'));
  }
  function ensureEvent(db, key){
    db[key] = db[key] || { cards:{}, ids:{}, generated:[], won:{}, seq:0, buyers:{}, combos_total:0, individuales_total:0, meta:{}, vendors:{} };
  }

  // ===== Utilidad: formato y parseo de valores en COP =====
  function __bf_formatCOP(n){
    try{
      return (Number(n)||0).toLocaleString('es-CO', {maximumFractionDigits:0});
    }catch(_){
      const v = Math.floor(Math.abs(Number(n)||0)).toString();
      const s = v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return (Number(n) < 0 ? '-' : '') + s;
    }
  }
  window.__BF_formatCOP = window.__BF_formatCOP || __bf_formatCOP;

  function __bf_parseCOPInput(v){
    if(v == null) return 0;
    v = String(v).trim();
    if(!v) return 0;
    v = v.replace(/\./g, '').replace(/,/g, '.');
    const n = parseFloat(v);
    return Number.isNaN(n) ? 0 : n;
  }

  // ===== Resumen por evento (cartones, dinero, comisiones) =====
  function __bf_getEventPricesForReport(evt){
    const db = loadDB();
    try{
      const meta = (db && db[evt] && db[evt].meta) || {};
      const priceCarton = Number(meta.priceCarton) || 0;
      let priceCombo = Number(meta.priceCombo) || 0;
      if(!priceCombo || priceCombo <= 0){
        const comboSize = parseInt(meta.comboSize, 10) > 0 ? parseInt(meta.comboSize, 10) : 6;
        priceCombo = comboSize * priceCarton;
      }
      return { priceCarton, priceCombo };
    }catch(_){
      return { priceCarton:0, priceCombo:0 };
    }
  }

  function __bf_computeEventReport(evt){
    evt = norm(evt||'');
    if(!evt) return null;
    const db = loadDB();
    ensureEvent(db, evt);
    const ev = db[evt] || {};
    const meta = ev.meta || {};
    const participants = ev.participants || {};
    const vendors = ev.vendors || {};

    const comboSize = (parseInt(meta.comboSize,10) > 0 ? parseInt(meta.comboSize,10) : 6);

    // Totales físicos (generador de combos + individuales sueltos)
    const combosGenerados = ev.combos_total|0;
    const individualesGenerados = ev.individuales_total|0;
    const cartonesFisicosTotales = combosGenerados * comboSize + individualesGenerados;

    // Totales por participantes (lo que se ha asignado/vendido)
    let combosVendidos = 0;
    let individualesVendidos = 0;
    Object.values(participants).forEach(p=>{
      if(!p) return;
      combosVendidos += (p.combos|0);
      individualesVendidos += (p.individuales|0);
    });
    const cartonesVendidos = combosVendidos * comboSize + individualesVendidos;

    // Precios y recaudo físico estimado
    const prices = __bf_getEventPricesForReport(evt);
    let recaudoFisico = 0;
    if(prices.priceCarton > 0 || prices.priceCombo > 0){
      recaudoFisico = (combosVendidos * (prices.priceCombo || 0)) + (individualesVendidos * prices.priceCarton);
    }

    // Ventas en línea + comisiones por vendedor
    let cartonesOnline = 0;
    let recaudoOnline = 0;
    let comisionCartones = 0;
    let comisionDinero = 0;

    Object.entries(vendors).forEach(([id, v])=>{
      if(!v) return;
      const stats = v.stats || {};
      const pct = v.commissionPct || 0;

      // Ventas online registradas
      const onlineCart = stats.cartones || 0;
      const ventasOnline = Number(stats.ventas) || 0;
      const comisionOnline = Number(stats.comision) || 0;
      cartonesOnline += onlineCart;
      recaudoOnline += ventasOnline;
      comisionDinero += comisionOnline;

      // Combos / individuales físicos asociados a este vendedor
      let combosV = 0;
      let indivV = 0;
      Object.values(participants).forEach(p=>{
        if(p && p.vendorId === id){
          combosV += (p.combos|0);
          indivV  += (p.individuales|0);
        }
      });

      const cartonesFisicosV = combosV * comboSize + indivV;
      if(prices.priceCarton > 0 || prices.priceCombo > 0){
        const valorFisicoV = (combosV * (prices.priceCombo || 0)) + (indivV * prices.priceCarton);
        comisionCartones += valorFisicoV * (pct/100);
      }else{
        // Modo compatibilidad: sin precios, se usa cartones equivalentes como base
        const totalEq = cartonesFisicosV + onlineCart;
        comisionCartones += totalEq * (pct/100);
      }
    });

    const recaudoTotal = recaudoFisico + recaudoOnline;
    const comisionesTotales = comisionCartones + comisionDinero;
    const neto = recaudoTotal - comisionesTotales;

    return {
      id: evt,
      nombre: meta.name || '',
      comboSize,
      combosGenerados,
      individualesGenerados,
      cartonesFisicosTotales,
      combosVendidos,
      individualesVendidos,
      cartonesVendidos,
      cartonesOnline,
      recaudoFisico,
      recaudoOnline,
      recaudoTotal,
      comisionCartones,
      comisionDinero,
      comisionesTotales,
      neto
    };
  }



  function ui(){
    if($('#ev-admin')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="ev-admin-backdrop" style="position:fixed;inset:0;display:none;background:rgba(0,0,0,.5);z-index:1000"></0iv>
      <div id="ev-admin" style="position:fixed;inset:10% 15%;display:none;background:#0b1220;color:#e5e7eb;border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.6);z-index:1001;overflow:auto">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid rgba(255,255,255,.08)">
          <h3 style="margin:0;font-size:18px">Administrador de eventos</h3>
          <div>
            <button id="ev-admin-close" class="secondary" style="margin-right:6px">Cerrar ✖</button>
            <button id="ev-admin-new" class="primary">Nuevo evento ➕</button>
          </div>
        </div>
        <div style="padding:16px">
          <div id="ev-list" style="display:grid;gap:8px"></div>
          <hr style="border-color:rgba(255,255,255,.1);margin:12px 0">
          <div id="ev-form" style="display:none">
            <h4 style="margin:.25rem 0">Editar/Crear evento</h4>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <label style="min-width:130px">ID (único):</label>
              <input id="ev-id" type="text" placeholder="ej. NocheFiesta2025" style="flex:1">
            </div>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <label style="min-width:130px">Nombre:</label>
              <input id="ev-name" type="text" placeholder="Nombre visible (opcional)" style="flex:1">
            </div>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <label style="min-width:130px">Cartones/Combo:</label>
              <input id="ev-combo-size" type="number" min="1" max="30" value="6" style="width:120px">
              <small style="opacity:.75">Solo cálculos y reportes. También ajusta impresión.</small>
            </div>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <label style="min-width:130px">Precio cartón (COP):</label>
              <input id="ev-price-carton" type="text" inputmode="numeric" placeholder="Ej. 1.000" style="width:120px">
              <small style="opacity:.75">Usado para calcular comisión por ventas físicas.</small>
            </div>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <label style="min-width:130px">Precio combo (COP):</label>
              <input id="ev-price-combo" type="text" inputmode="numeric" placeholder="Opcional" style="width:120px">
              <small style="opacity:.75">Si se deja en 0, se usa Cartones/Combo × precio cartón.</small>
            </div>
            <!-- BF: Barra de progreso automática por evento (cartones impresos) -->
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0;flex-direction:column;align-items:stretch">
              <div style="display:flex;align-items:center;gap:8px;width:100%">
                <label style="min-width:130px">Meta cartones:</label>
                <input id="ev-auto-target" type="number" min="0" step="1" placeholder="Ej. 600" style="width:130px">
                <small style="opacity:.75">Suma combos e individuales impresos.</small>
              </div>
              <div class="bf-progress" style="margin-top:4px">
                <div id="ev-auto-progress-bar" class="bf-progress-inner"></div>
              </div>
              <div id="ev-auto-progress-summary" style="font-size:.85em;opacity:.8;margin-top:4px">0 / 0 cartones (0%)</div>
            </div>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <label style="min-width:130px">Reporte rápido:</label>
              <button id="ev-report-btn" type="button" class="secondary">Ver resumen del evento</button>
              <small style="opacity:.75">Usa los datos de combos, participantes y vendedores.</small>
            </div>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <label style="min-width:130px">Color cartones:</label>
              <select id="ev-card-color" style="flex:1">
                <option value="default">Azul original</option>
                <option value="rojo">Rojo</option>
                <option value="verde">Verde</option>
                <option value="morado">Morado</option>
                <option value="naranja">Naranja</option>
              </select>
            </div>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <label style="min-width:130px">Fecha de cantada:</label>
              <input id="ev-cantada-date" type="date" style="width:160px">
              <label style="min-width:80px">Hora:</label>
              <input id="ev-cantada-time" type="time" style="width:110px">
            </div>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <button id="ev-close-sales" class="danger">Cerrar ventas</button>
              <button id="ev-open-sales" class="secondary">Reabrir ventas</button>
              <div id="ev-sales-state" style="margin-left:auto;font-size:.85em;opacity:.9;"></div>
            </div>
            <div class="controls" style="display:flex;gap:8px;align-items:center;margin:.25rem 0">
              <button id="ev-capture-figs" class="secondary">Tomar figuras de la selección actual</button>
              <button id="ev-apply-figs" class="secondary">Aplicar figuras guardadas a la selección</button>
            </div>
            <div class="controls" style="display:flex;gap:8px;justify-content:flex-end">
              <button id="ev-save" class="primary">Guardar</button>
              <button id="ev-cancel" class="secondary">Cancelar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  function openModal(){ document.getElementById('ev-admin-backdrop').style.display='block'; document.getElementById('ev-admin').style.display='block'; refreshList(); document.getElementById('ev-form').style.display='none'; }
  function closeModal(){ document.getElementById('ev-admin-backdrop').style.display='none'; document.getElementById('ev-admin').style.display='none'; }

  function refreshList(){
    const cont = document.getElementById('ev-list'); cont.innerHTML = '';
    const db = loadDB();
    const keys = Object.keys(db).filter(k=>!__bf_isMetaKey(k)).sort((a,b)=>a.localeCompare(b));
    if(!keys.length){
      cont.innerHTML = `<div style="opacity:.75">Aún no hay eventos. Crea uno con “Nuevo evento”.</div>`;
      return;
    }
    keys.forEach(k=>{
      const meta = (db[k] && db[k].meta) || {};
      const row = document.createElement('div');
      row.style.cssText = "display:flex;align-items:center;gap:10px;padding:10px;border:1px solid rgba(255,255,255,.08);border-radius:12px;background:#0f172a";
      row.innerHTML = `
        <div style="flex:1">
          <div style="font-weight:700">${k}</div>
          <div style="opacity:.8;font-size:.9em">${meta.name||''}</div>
          <div style="opacity:.7;font-size:.85em">Combos: ${(db[k].combos_total|0)} · Individuales: ${(db[k].individuales_total|0)} · Combo: ${(meta.comboSize||6)}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button data-k="${k}" class="ev-use primary">Usar</button>
          <button data-k="${k}" class="ev-edit">Editar</button>
          <button data-k="${k}" class="ev-del danger">Eliminar</button>
        </div>
      `;
      cont.appendChild(row);
    });

    cont.querySelectorAll('.ev-use').forEach(btn=>btn.addEventListener('click', (e)=>{
      const k = e.currentTarget.getAttribute('data-k');
      const eventInput = document.querySelector('#eventId');
      if(eventInput){ eventInput.value = k; eventInput.dispatchEvent(new Event('input')); }
      try{
        const db=loadDB(); const cfg=db[k]?.meta?.figuras;
        if(cfg && window.BingoFigurasWidget?.setEventConfig){
          window.BingoFigurasWidget.setEventConfig(cfg);
        }
      }catch{}
      closeModal();
    }));

    cont.querySelectorAll('.ev-edit').forEach(btn=>btn.addEventListener('click', (e)=>{
      const k = e.currentTarget.getAttribute('data-k');
      const db=loadDB(); const meta=db[k]?.meta||{};
      document.getElementById('ev-form').style.display='block';
      document.getElementById('ev-id').value = k;
      document.getElementById('ev-id').dataset.original = k;
      document.getElementById('ev-name').value = meta.name || '';
      document.getElementById('ev-combo-size').value = meta.comboSize || 6;
      var priceCartonInput = document.getElementById('ev-price-carton');
      if(priceCartonInput){ priceCartonInput.value = (meta.priceCarton != null ? __bf_formatCOP(meta.priceCarton) : ''); }
      var priceComboInput = document.getElementById('ev-price-combo');
      if(priceComboInput){ priceComboInput.value = (meta.priceCombo != null ? __bf_formatCOP(meta.priceCombo) : ''); }
      var selColor = document.getElementById('ev-card-color');
      if(selColor){ selColor.value = meta.cardColor || 'default'; }

      // Fecha y hora de cantada
      const cantada = meta.cantadaFechaHora || '';
      const dInput = document.getElementById('ev-cantada-date');
      const tInput = document.getElementById('ev-cantada-time');
      if (cantada && dInput && tInput){
        const parts = cantada.split('T');
        dInput.value = parts[0] || '';
        tInput.value = (parts[1] || '').slice(0,5);
      }else{
        if(dInput) dInput.value = '';
        if(tInput) tInput.value = '';
      }

      // Estado de ventas
      const salesStateEl = document.getElementById('ev-sales-state');
      if (salesStateEl){
        const locked = !!meta.salesLocked;
        salesStateEl.textContent = locked ? 'Ventas BLOQUEADAS' : 'Ventas ABIERTAS';
        salesStateEl.style.color = locked ? '#fca5a5' : '#bbf7d0';
      }
    }));

    cont.querySelectorAll('.ev-del').forEach(btn=>btn.addEventListener('click', (e)=>{
      const k = e.currentTarget.getAttribute('data-k');
      if(!confirm(`¿Eliminar evento "${k}"? Esta acción no se puede deshacer.`)) return;
      const db=loadDB();
      db.__deletedEvents = db.__deletedEvents || {};
      db.__deletedEvents[k] = Date.now();
      delete db[k];
      saveDB(db);
      const eventInput = document.querySelector('#eventId');
      if(eventInput && (eventInput.value||'').trim() === k){ eventInput.value = ''; eventInput.dispatchEvent(new Event('input')); }
      refreshList();
    }));
  }

  function wire(){
    const eventRow = document.querySelector('#eventId')?.closest('.controls');
    if(eventRow && !document.querySelector('#ev-admin-open')){
      const btn = document.createElement('button');
      btn.id = 'ev-admin-open';
      btn.textContent = 'Administrador de eventos';
      btn.className = 'secondary';
      btn.style.marginLeft = '8px';
      eventRow.appendChild(btn);
      btn.addEventListener('click', openModal);
    }

    document.addEventListener('click', (e)=>{
      if(e.target?.id==='ev-admin-close' || e.target?.id==='ev-admin-backdrop') closeModal();
    });

    document.addEventListener('click', (e)=>{
      if(e.target?.id==='ev-admin-new'){
        document.getElementById('ev-form').style.display='block';
        document.getElementById('ev-id').value=''; document.getElementById('ev-id').dataset.original=''; document.getElementById('ev-name').value=''; document.getElementById('ev-combo-size').value=6;
        var pc = document.getElementById('ev-price-carton'); if(pc){ pc.value=''; }
        var pco = document.getElementById('ev-price-combo'); if(pco){ pco.value=''; }
        var dCant = document.getElementById('ev-cantada-date'); if(dCant){ dCant.value=''; }
        var tCant = document.getElementById('ev-cantada-time'); if(tCant){ tCant.value=''; }
        var sState = document.getElementById('ev-sales-state'); if(sState){ sState.textContent=''; }
      }
      if(e.target?.id==='ev-cancel'){ document.getElementById('ev-form').style.display='none'; }
      if(e.target?.id==='ev-capture-figs'){
        try{
          if(window.BingoFigurasWidget?.getEventConfig){
            const cfg = window.BingoFigurasWidget.getEventConfig();
            document.getElementById('ev-capture-figs').dataset.figuras = JSON.stringify(cfg);
            alert('Figuras capturadas ✅');
          }else{
            alert('No se encontró el selector de figuras.');
          }
        }catch(err){ console.error(err); alert('No se pudo capturar.'); }
      }
      if(e.target?.id==='ev-apply-figs'){
        try{
          const raw = document.getElementById('ev-capture-figs').dataset.figuras || '[]';
          const cfg = JSON.parse(raw);
          if(window.BingoFigurasWidget?.setEventConfig){
            window.BingoFigurasWidget.setEventConfig(cfg);
            alert('Figuras aplicadas ✅');
          }
        }catch(err){ console.error(err); alert('No se pudo aplicar.'); }
      }
      
      if(e.target?.id==='ev-close-sales'){
        const evt = __bf_getCurrentEventId();
        if(!evt){
          alert('Primero selecciona un evento en el campo principal.');
        }else if(confirm('¿Cerrar ventas para este evento?\nNo se podrán agregar más cartones hasta que las reabras.')){
          __bf_setSalesLocked(evt, true);
        }
      }

      if(e.target?.id==='ev-report-btn'){
        const idInput = document.getElementById('ev-id');
        let evt = norm(idInput?.value || '');
        if(!evt){
          evt = __bf_getCurrentEventId();
        }
        if(!evt){
          alert('Primero guarda o selecciona un evento.');
          return;
        }
        try{
          const rep = __bf_computeEventReport(evt);
          if(!rep){
            alert('No se encontraron datos para este evento.');
            return;
          }
          const lines = [];
          lines.push(`Evento: ${evt}${rep.nombre ? ' — ' + rep.nombre : ''}`);
          lines.push('');
          lines.push(`Cartones generados (físicos): ${rep.cartonesFisicosTotales}`);
          lines.push(`  · Combos generados: ${rep.combosGenerados}`);
          lines.push(`  · Individuales generados: ${rep.individualesGenerados}`);
          lines.push('');
          lines.push(`Cartones vendidos (participantes): ${rep.cartonesVendidos}`);
          lines.push(`  · Combos vendidos: ${rep.combosVendidos}`);
          lines.push(`  · Individuales vendidos: ${rep.individualesVendidos}`);
          lines.push('');
          lines.push(`Recaudo físico estimado: $${__bf_formatCOP(rep.recaudoFisico)}`);
          lines.push(`Recaudo ventas en línea: $${__bf_formatCOP(rep.recaudoOnline)}`);
          lines.push(`Recaudo total: $${__bf_formatCOP(rep.recaudoTotal)}`);
          lines.push('');
          lines.push(`Comisiones por cartones: $${__bf_formatCOP(rep.comisionCartones)}`);
          lines.push(`Comisiones por dinero en línea: $${__bf_formatCOP(rep.comisionDinero)}`);
          lines.push(`Comisiones totales: $${__bf_formatCOP(rep.comisionesTotales)}`);
          lines.push('');
          lines.push(`Neto aproximado del evento: $${__bf_formatCOP(rep.neto)}`);
          alert(lines.join('\n'));
        }catch(err){
          console.error(err);
          alert('No se pudo generar el reporte del evento.');
        }
      }
      if(e.target?.id==='ev-open-sales'){
        const evt = __bf_getCurrentEventId();
        if(!evt){
          alert('Primero selecciona un evento en el campo principal.');
        }else if(confirm('¿Reabrir ventas para este evento?')){
          __bf_setSalesLocked(evt, false);
        }
      }
if(e.target?.id==='ev-save'){
        const id = norm(document.getElementById('ev-id').value);
        if(!id){ alert('Ingresa un ID para el evento.'); return; }
        const name = norm(document.getElementById('ev-name').value);
        const cs = parseInt(document.getElementById('ev-combo-size').value||'6',10) || 6;
        const priceCarton = __bf_parseCOPInput(document.getElementById('ev-price-carton')?.value || '0');
        const priceCombo  = __bf_parseCOPInput(document.getElementById('ev-price-combo')?.value || '0');
        const color = (document.getElementById('ev-card-color')?.value || 'default');
        const autoTarget = parseInt(document.getElementById('ev-auto-target')?.value||'0',10) || 0;

        // Cantada: fecha y hora
        const cantadaDate = (document.getElementById('ev-cantada-date')?.value || '').trim();
        const cantadaTime = (document.getElementById('ev-cantada-time')?.value || '').trim();
        const hasCantada  = !!(cantadaDate && cantadaTime);
        const cantadaISO  = hasCantada ? (cantadaDate + 'T' + cantadaTime) : '';

        const db = loadDB();
        const original = document.getElementById('ev-id').dataset.original || id;

        if(original && original!==id && db[original]){
          if(db[id]){ alert('Ya existe un evento con ese ID.'); return; }
          db[id] = db[original];
          delete db[original];
        }
        ensureEvent(db, id);
        db[id].meta = db[id].meta || {};
        db[id].meta.name = name;
        db[id].meta.comboSize = Math.max(1, Math.min(30, cs));
        db[id].meta.priceCarton = Math.max(0, priceCarton);
        db[id].meta.priceCombo  = Math.max(0, priceCombo);
        db[id].meta.cardColor = color || 'default';
        db[id].meta.autoTargetCards = autoTarget;

        // Guardar configuración de cantada
        db[id].meta.cantadaFechaHora = cantadaISO;
        if (!cantadaISO){
          db[id].meta.salesAutoLockDone = false;
        }

        try{
          const raw = document.getElementById('ev-capture-figs').dataset.figuras;
          if(raw){ db[id].meta.figuras = JSON.parse(raw); }
        }catch{}

        db.__deletedEvents = db.__deletedEvents || {};
        if (db.__deletedEvents[id]) delete db.__deletedEvents[id];
        db[id].updatedAt = Date.now();
        saveDB(db);
        if(window.__BF_SETUP_SALES_AUTOLOCK){ try{ window.__BF_SETUP_SALES_AUTOLOCK(); }catch(_){}}
        if(window.__BF_UPDATE_AUTO_PROGRESS){
          try{ window.__BF_UPDATE_AUTO_PROGRESS(id); }catch(_){}
        }
        const eventInput = document.querySelector('#eventId');
        if(eventInput){ eventInput.value = id; eventInput.dispatchEvent(new Event('input')); }
        refreshList();
        document.getElementById('ev-form').style.display='none';
      }
    });
  }


  // ===== Bloqueo de ventas por fecha/hora de cantada =====
  function __bf_getCurrentEventId(){
    const ev = document.querySelector('#eventId');
    return (ev && (ev.value||'').trim()) || '';
  }

  function __bf_updateSalesStateUI(){
    try{
      const evt = __bf_getCurrentEventId();
      if(!evt) return;
      const db = loadDB();
      const meta = (db && db[evt] && db[evt].meta) || {};
      const salesStateEl = document.getElementById('ev-sales-state');
      if (salesStateEl){
        const locked = !!meta.salesLocked;
        salesStateEl.textContent = locked ? 'Ventas BLOQUEADAS' : 'Ventas ABIERTAS';
        salesStateEl.style.color = locked ? '#fca5a5' : '#bbf7d0';
      }
    }catch(_){}
  }

  function __bf_setSalesLocked(evt, locked){
    const db = loadDB();
    ensureEvent(db, evt);
    db[evt].meta = db[evt].meta || {};
    db[evt].meta.salesLocked = !!locked;
    saveDB(db);
    if (window.BF_SYNC_NOW_TO_CLOUD){
      try{ window.BF_SYNC_NOW_TO_CLOUD(); }catch(_){}
    }
    __bf_updateSalesStateUI();
  }

  let __bf_salesAutoLockTimer = null;
  function __bf_checkSalesAutoLock(){
    try{
      const evt = __bf_getCurrentEventId();
      if(!evt) return;
      const db = loadDB();
      const meta = (db && db[evt] && db[evt].meta) || {};
      const iso = meta.cantadaFechaHora;
      if(!iso) return;

      const t = Date.parse(iso);
      if(!t || isNaN(t)) return;

      const now = Date.now();
      const fifteen = 15 * 60 * 1000;
      if (now >= (t - fifteen) && !meta.salesAutoLockDone){
        meta.salesLocked = true;
        meta.salesAutoLockDone = true;
        db[evt].meta = meta;
        saveDB(db);
        if (window.BF_SYNC_NOW_TO_CLOUD){
          try{ window.BF_SYNC_NOW_TO_CLOUD(); }catch(_){}
        }
        __bf_updateSalesStateUI();
      }
    }catch(_){}
  }

  window.__BF_SETUP_SALES_AUTOLOCK = function(){
    if (__bf_salesAutoLockTimer){
      clearInterval(__bf_salesAutoLockTimer);
      __bf_salesAutoLockTimer = null;
    }
    __bf_checkSalesAutoLock();
    __bf_salesAutoLockTimer = setInterval(__bf_checkSalesAutoLock, 30000);
  };
  document.addEventListener('DOMContentLoaded', ()=>{ ui(); wire(); if(window.__BF_SETUP_SALES_AUTOLOCK){ try{ window.__BF_SETUP_SALES_AUTOLOCK(); }catch(_){}} __bf_updateSalesStateUI(); });
})();
