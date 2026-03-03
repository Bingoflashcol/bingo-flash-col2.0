
/* ===== Vendedores por evento (comisión + link + resumen) ===== */
(() => {
  const $ = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
  const norm = (s)=>String(s||'').trim();

  const LS_KEY = 'bingo_events';
  let editingVendorId = null;

  function loadDB(){ 
    try{ return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch{ return {}; }
  }
  function saveDB(db){ localStorage.setItem(LS_KEY, JSON.stringify(db)); }


  // Utilidad compartida: formato COP con puntos
  window.__BF_formatCOP = window.__BF_formatCOP || function(n){
    try{
      return (Number(n)||0).toLocaleString('es-CO', {maximumFractionDigits:0});
    }catch(_){
      const v = Math.floor(Math.abs(Number(n)||0)).toString();
      const s = v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return (Number(n) < 0 ? '-' : '') + s;
    }
  };


  function getCurrentEvent(){
    const el = document.querySelector('#eventId');
    const v = norm(el?.value || '');
    return v || 'default';
  }

  function ensureEvent(db, evt){
    db[evt] = db[evt] || { 
      cards:{}, 
      ids:{}, 
      generated:[], 
      won:{}, 
      seq:0, 
      buyers:{}, 
      combos_total:0, 
      individuales_total:0, 
      meta:{},
      vendors:{},
      participants:{}
    };
    db[evt].vendors = db[evt].vendors || {};
    db[evt].participants = db[evt].participants || {};
  }

  function getComboSize(evt){
    try{
      if(typeof window.__BF_getEventComboSize === 'function'){
        return window.__BF_getEventComboSize();
      }
    }catch(_){}
    // fallback 6
    return 6;
  }

  function getEventPrices(evt){
    const db = loadDB();
    try{
      const meta = (db && db[evt] && db[evt].meta) || {};
      const priceCarton = Number(meta.priceCarton) || 0;
      let priceCombo = Number(meta.priceCombo) || 0;
      if(!priceCombo || priceCombo <= 0){
        const comboSize = getComboSize(evt);
        priceCombo = comboSize * priceCarton;
      }
      return { priceCarton, priceCombo };
    }catch(_){
      return { priceCarton:0, priceCombo:0 };
    }
  }

  function generateVendorId(name, phone, vendors){
    const base = ('v-' + (name || '').toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9\-]/g,'')).replace(/-+/g,'-') || 'vendedor';
    let id = base;
    let i = 1;
    while(vendors[id]){ id = base + '-' + (++i); }
    return id;
  }

  function generateToken(){
    return Math.random().toString(36).slice(2,10);
  }

  function buildLink(evt, vendor){
    try{
      const url = new URL(window.location.href);
      url.searchParams.set('ev', evt);
      url.searchParams.set('vendor', vendor.linkToken || vendor.id);
      return url.toString();
    }catch(_){
      return '';
    }
  }

  function computeVendorStats(evt, vendorId){
    const db = loadDB(); 
    ensureEvent(db, evt);
    const ev = db[evt];
    const vendors = ev.vendors || {};
    const participants = ev.participants || {};
    const vendor = vendors[vendorId];
    if(!vendor) return { físicos:0, online:0, total:0, combos:0, indiv:0, comisionCartones:0, comisionDinero:(vendor.stats?.comision || 0) };

    const comboSize = getComboSize(evt);

    let combos = 0;
    let indiv  = 0;
    Object.values(participants).forEach(p=>{
      if(p && p.vendorId === vendorId){
        combos += (p.combos|0);
        indiv  += (p.individuales|0);
      }
    });

    const cartonesFisicos = combos*comboSize + indiv;
    const online = vendor.stats?.cartones || 0;
    const total = cartonesFisicos + online;
    const pct = vendor.commissionPct || 0;

    const prices = getEventPrices(evt);
    let comisionCartones = 0;
    if((prices.priceCarton > 0) || (prices.priceCombo > 0)){
      const valorFisico = (combos * (prices.priceCombo || 0)) + (indiv * (prices.priceCarton || 0));
      comisionCartones = valorFisico * (pct/100);
    }else{
      // Compatibilidad: si no hay precios configurados, usamos cartones equivalentes como antes
      comisionCartones = total * (pct/100);
    }
    const comisionDinero = vendor.stats?.comision || 0;

    return {
      físicos: cartonesFisicos,
      online,
      total,
      combos,
      indiv,
      comisionCartones,
      comisionDinero
    };
  }

  function renderVendorSelects(evt){
    const db = loadDB(); 
    ensureEvent(db, evt);
    const vendors = db[evt].vendors || {};
    const entries = Object.entries(vendors).sort((a,b)=>String(a[1].name||'').toLowerCase().localeCompare(String(b[1].name||'').toLowerCase()));

    const optionsHtml = ['<option value=\"\">(sin vendedor)</option>'].concat(
      entries.map(([id,v])=>`<option value=\"${id}\">${v.name || '(sin nombre)'}</option>`)
    ).join('');

    const buyerVendor = document.getElementById('buyerVendor');
    if(buyerVendor){
      const prev = buyerVendor.value;
      buyerVendor.innerHTML = optionsHtml;
      if(prev && vendors[prev]) buyerVendor.value = prev;
    }

    const pVendor = document.getElementById('p-vendor');
    if(pVendor){
      const prev2 = pVendor.value;
      pVendor.innerHTML = optionsHtml;
      if(prev2 && vendors[prev2]) pVendor.value = prev2;
    }
  }

  function renderList(evt = getCurrentEvent()){
    const tbody = $('#vendors-tbody'); 
    if(!tbody) return;

    const db = loadDB(); 
    ensureEvent(db, evt);
    const vendors = db[evt].vendors || {};

    const q = (document.querySelector('#v-search')?.value || '').toLowerCase().trim();

    let entries = Object.entries(vendors);
    if(q){
      entries = entries.filter(([id,v])=> 
        String(v.name||'').toLowerCase().includes(q) ||
        String(v.phone||'').toLowerCase().includes(q)
      );
    }

    entries.sort((a,b)=>String(a[1].name||'').toLowerCase().localeCompare(String(b[1].name||'').toLowerCase()));

    const rows = entries.map(([id,v])=>{
      const link = buildLink(evt, v);
      const stats = v.stats || {};
      const computed = computeVendorStats(evt, id);

      return `
        <tr data-id="${id}">
          <td>${v.name || ''}</td>
          <td>${v.phone || ''}</td>
          <td style="text-align:right">${(v.commissionPct ?? 0).toFixed(1)}%</td>
          <td>
            <input type="text" value="${link}" readonly style="width:100%;font-size:.8rem;background:#020617;border:1px solid rgba(148,163,184,.5);border-radius:6px;padding:2px 4px" />
          </td>
          <td style="text-align:right">${computed.físicos}</td>
          <td style="text-align:right">${computed.online}</td>
          <td style="text-align:right">${computed.total}</td>
          <td style="text-align:right">$${window.__BF_formatCOP(computed.comisionCartones)}</td>
          <td>
            <button class="mini v-edit" data-id="${id}">Editar</button>
            <button class="mini v-detail" data-id="${id}">Detalle</button>
            <button class="mini danger v-del" data-id="${id}">Eliminar</button>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows || `<tr><td colspan="9" style="opacity:.7">Sin vendedores aún.</td></tr>`;

    $$('.v-del', tbody).forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = e.currentTarget.dataset.id;
        if(!id) return;
        if(!confirm('¿Eliminar este vendedor? Esta acción no se puede deshacer.')) return;
        const db2 = loadDB(); 
        ensureEvent(db2, evt);
        delete db2[evt].vendors[id];
        saveDB(db2);
        renderVendorSelects(evt);
        renderList(evt);
      });
    });

    $$('.v-edit', tbody).forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = e.currentTarget.dataset.id;
        if(!id) return;
        const db2 = loadDB();
        ensureEvent(db2, evt);
        const vendor = db2[evt].vendors?.[id];
        if(!vendor) return;
        const nameInput = document.getElementById('v-name');
        const phoneInput = document.getElementById('v-phone');
        const commInput = document.getElementById('v-commission');
        if(nameInput) nameInput.value = vendor.name || '';
        if(phoneInput) phoneInput.value = vendor.phone || '';
        if(commInput) commInput.value = (vendor.commissionPct ?? 10);
        editingVendorId = id;
        const form = document.getElementById('vendors-form');
        if(form && typeof form.scrollIntoView === 'function'){
          form.scrollIntoView({behavior:'smooth', block:'start'});
        }
      });
    });

    $$('.v-detail', tbody).forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        const id = e.currentTarget.dataset.id;
        if(!id) return;
        showVendorDetail(evt, id);
      });
    });
  }

  function showVendorDetail(evt, vendorId){
    const db = loadDB(); 
    ensureEvent(db, evt);
    const ev = db[evt];
    const vendors = ev.vendors || {};
    const parts = ev.participants || {};
    const vendor = vendors[vendorId];
    if(!vendor){ alert('Vendedor no encontrado.'); return; }

    const comboSize = getComboSize(evt);
    const stats = computeVendorStats(evt, vendorId);

    let msg = '';
    msg += (vendor.name || '(Sin nombre)');
    if(vendor.phone){ msg += ' · ' + vendor.phone; }
    msg += '\\nComisión: ' + (vendor.commissionPct ?? 0).toFixed(1) + '%';

    msg += '\\n\\nCartones físicos: ' + stats.físicos;
    msg += '\\nCartones online: ' + stats.online;
    msg += '\\nCartones totales: ' + stats.total;
    msg += '\\nComisión física (COP): $' + window.__BF_formatCOP(stats.comisionCartones);
    if(stats.comisionDinero){
      msg += '\\nComisión online (dinero): $' + window.__BF_formatCOP(stats.comisionDinero);
    }

    const rows = [];
    Object.entries(parts).forEach(([k,p])=>{
      if(p && p.vendorId === vendorId){
        const totalCartones = (p.combos|0)*comboSize + (p.individuales|0);
        rows.push({
          name: p.name || '(Sin nombre)',
          phone: p.phone || '',
          combos: p.combos|0,
          indiv: p.individuales|0,
          totalCartones
        });
      }
    });

    if(rows.length){
      msg += '\\n\\nParticipantes asignados a este vendedor:';
      rows.sort((a,b)=>b.totalCartones - a.totalCartones);
      rows.forEach((r, idx)=>{
        msg += `\\n${idx+1}. ${r.name}`;
        if(r.phone) msg += ' · ' + r.phone;
        msg += ` — Combos: ${r.combos}, Individ.: ${r.indiv}, Cartones: ${r.totalCartones}`;
      });
    }else{
      msg += '\\n\\n(Sin participantes asignados explícitamente a este vendedor.)';
    }

    alert(msg);
  }

  function wireForm(){
    const form = $('#vendors-form'); 
    if(!form) return;

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const evt = getCurrentEvent();
      if(!evt){ alert('Primero selecciona/ingresa un Evento.'); return; }

      const name = norm($('#v-name').value);
      const phone = norm($('#v-phone').value);
      const commission = parseFloat($('#v-commission').value || '0') || 0;

      if(!name){
        alert('El nombre del vendedor es obligatorio.');
        return;
      }

      const db = loadDB(); 
      ensureEvent(db, evt);
      const vendors = db[evt].vendors;

      let id = editingVendorId && vendors[editingVendorId] ? editingVendorId : null;

      if(!id){
        id = Object.keys(vendors).find(k=>{
          const v = vendors[k];
          return norm(v.name) === name && norm(v.phone) === phone;
        });
      }

      if(!id){
        id = generateVendorId(name, phone, vendors);
      }

      const current = vendors[id] || {};
      if(!current.linkToken){
        current.linkToken = generateToken();
      }

      current.id = id;
      current.name = name;
      current.phone = phone;
      current.commissionPct = Math.max(0, Math.min(100, commission));
      current.stats = current.stats || { cartones:0, ventas:0, comision:0 };

      vendors[id] = current;
      saveDB(db);

      editingVendorId = null;

      $('#v-name').value = '';
      $('#v-phone').value = '';
      $('#v-commission').value = '10';

      renderVendorSelects(evt);
      renderList(evt);
    });
  }

  
  function wireOverlay(){
    const backdrop = document.getElementById('vendors-backdrop');
    const modal = document.getElementById('vendors-overlay');
    const closeBtn = document.getElementById('vendors-close');
    const headerBtn = document.getElementById('btn-vendedores');

    if(!backdrop || !modal) return;

    const open = ()=>{
      backdrop.style.display = 'block';
      modal.style.display = 'flex';
      const evt = getCurrentEvent();
      renderVendorSelects(evt);
      renderList(evt);
    };
    const close = ()=>{
      backdrop.style.display = 'none';
      modal.style.display = 'none';
    };

    // Exponer función global para abrir desde otros módulos (auth-ui, etc.)
    window.__BF_OPEN_VENDORS = open;

    if(headerBtn){
      headerBtn.addEventListener('click', open);
    }
    backdrop.addEventListener('click', close);
    closeBtn?.addEventListener('click', close);

    document.getElementById('v-search')?.addEventListener('input', ()=>renderList());
    const ev = document.querySelector('#eventId');
    ev?.addEventListener('input', ()=>{
      const evt = getCurrentEvent();
      renderVendorSelects(evt);
      renderList(evt);
    });
  }


  /* ===== Hook global para ventas en línea ===== */
  window.__BF_REGISTER_ONLINE_SALE = function({eventId, vendorToken, cartones=0, monto=0}){
    const evt = norm(eventId || getCurrentEvent());
    if(!evt || !vendorToken) return;

    const db = loadDB(); 
    ensureEvent(db, evt);
    const vendors = db[evt].vendors || {};

    const vendor = Object.values(vendors).find(v => (v.linkToken === vendorToken || v.id === vendorToken));
    if(!vendor) return;

    const c = cartones|0;
    const amount = Number(monto) || 0;
    vendor.stats = vendor.stats || { cartones:0, ventas:0, comision:0 };

    vendor.stats.cartones += c;
    vendor.stats.ventas  += amount;
    const pct = vendor.commissionPct || 0;
    vendor.stats.comision += amount * (pct / 100);

    saveDB(db);
  };

  document.addEventListener('DOMContentLoaded', ()=>{
    wireForm();
    wireOverlay();
    // inicializar selects al cargar
    const evt = getCurrentEvent();
    renderVendorSelects(evt);
  });
})();
