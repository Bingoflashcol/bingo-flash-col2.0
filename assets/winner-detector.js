
/* ===== Winner Detector v3 (usa renderCard, replica exacta + figura dorada, sin repetir cartón) ===== */
(function(){
  function getEvt(){ return (document.querySelector('#eventId')?.value||'').trim() || 'default'; }
  function loadDB(){ try{return JSON.parse(localStorage.getItem('bingo_events')||'{}');}catch{ return {}; } }
  function saveDB(db){ localStorage.setItem('bingo_events', JSON.stringify(db)); }
  function toSet(arr){ const s=new Set(); for(const n of arr) s.add(Number(n)); return s; }
  function inCalled(val, set){ return val===0 || set.has(val); } // 0 = centro libre
  function maskWins(cols, mask, calledSet){
    for(let r=0;r<5;r++){
      for(let c=0;c<5;c++){
        if(mask[r][c]===1 && !inCalled(cols[c][r], calledSet)) return false;
      }
    }
    return true;
  }

  function playWinSound(fig){
    try{
      if(typeof window === 'undefined') return;
      const isFull = fig && (fig.tipo === 'full' || fig.id === 'blackout');

      // Voz de ganador
      if('speechSynthesis' in window){
        const synth = window.speechSynthesis;
        const text = isFull
          ? '¡Bingo! Cartón lleno. ¡Tenemos ganador!'
          : '¡Tenemos ganador!';
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'es-ES';
        u.rate = 1;
        u.pitch = 1.05;
        try{ synth.cancel(); }catch(_){}
        synth.speak(u);
      }

      // Pequeño efecto sonoro alegre (acorde corto)
      try{
        const AC = window.AudioContext || window.webkitAudioContext;
        if(AC){
          const ctx = window.__BF_WIN_AUDIO || new AC();
          window.__BF_WIN_AUDIO = ctx;
          const now = ctx.currentTime;

          function tone(freq, t0, dur, gainVal){
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, t0);
            gain.gain.linearRampToValueAtTime(gainVal, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + dur + 0.02);
          }

          const base = isFull ? 523.25 : 440; // DO5 o LA4
          tone(base,       now,     0.25, 0.3);
          tone(base*1.25,  now,     0.25, 0.2);
          tone(base*1.5,   now+0.1, 0.30, 0.25);
        }
      }catch(_){}

      // Efecto visual de celebración
      try{
        triggerWinVisuals(isFull);
      }catch(_){}
    }catch(e){
      console.error('playWinSound failed', e);
    }
  }

  function triggerWinVisuals(isFull){
    try{
      if(typeof document === 'undefined') return;
      let overlay = document.getElementById('bf-confetti-overlay');
      if(!overlay){
        overlay = document.createElement('div');
        overlay.id = 'bf-confetti-overlay';
        overlay.className = 'bf-confetti-overlay';
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = '';
      const pieces = isFull ? 140 : 80;
      for(let i=0;i<pieces;i++){
        const s = document.createElement('span');
        s.className = 'bf-confetti-piece';
        const left = Math.random()*100;
        const delay = Math.random()*0.6;
        const dur = 1.8 + Math.random()*0.7;
        s.style.left = left + '%';
        s.style.animationDelay = delay + 's';
        s.style.animationDuration = dur + 's';
        overlay.appendChild(s);
      }
      overlay.classList.add('bf-confetti-active');
      document.body.classList.add('bf-win-flash');
      setTimeout(()=>{
        overlay.classList.remove('bf-confetti-active');
        document.body.classList.remove('bf-win-flash');
        overlay.innerHTML = '';
      }, 2500);
    }catch(e){
      console.error('triggerWinVisuals failed', e);
    }
  }


  let currentFigures = []; // {idx, id, nombre, mask, disabled}
  const listSel = ()=>document.querySelectorAll('#bfw-selected-list .bfw-selected-item');
  function refreshSelectedIndex(){ listSel().forEach((el, idx)=>{ el.dataset.idx = String(idx); }); }

  document.addEventListener('bfw:eventChanged', (ev)=>{
    const cfg = Array.isArray(ev.detail) ? ev.detail : [];
    currentFigures = cfg.map((it, idx)=>({ idx, id: it.id, nombre: it.nombre||it.id, mask: it.mask, disabled: !!it.disabled, tipo: it.tipo||'fig' }));
    refreshSelectedIndex();
  });

  async function createCardCanvas(card, mask, calledSet){
    try{
      const api = window.BF_COMBOS || {};
      const renderCard = api.renderCard;
      if(typeof renderCard!=='function') return null;
      const width = 520, height = 560; // tamaño base, luego se escala por CSS
      const base = await renderCard(card, {width, height});
      if(!base) return null;
      // Clonar y sobreponer la figura dorada
      const c = document.createElement('canvas');
      c.width = base.width; c.height = base.height;
      const k = c.getContext('2d');
      k.drawImage(base, 0, 0);

      // Coordenadas del grid: copiadas de renderCard
      const inset = 16;
      const panelX = 8 + inset;
      const panelY = 8 + inset;
      const panelW = width - 16 - 2*inset;
      const panelH = height - 16 - 2*inset;
      const FOOTER_H = 78;
      const headerY = panelY + 12;
      const headerH = 58;
      const gridTop = headerY + headerH + 14;
      const gridBottom = panelY + panelH - FOOTER_H - 14;
      const gw = panelW - 32;
      const gh = gridBottom - gridTop;
      const gx = panelX + 16;
      const gy = gridTop;
      const cw = gw/5, ch = gh/5;

      for(let r=0;r<5;r++){
        for(let cidx=0;cidx<5;cidx++){
          const val = card.cols[cidx][r];
          const x = gx + cidx*cw;
          const y = gy + r*ch;
          const pad = 4;
          // Todas las bolas cantadas sobre este cartón en verde suave
          if(inCalled(val, calledSet)){
            k.fillStyle = 'rgba(34, 197, 94, 0.6)'; // verde
            k.fillRect(x+pad, y+pad, cw-2*pad, ch-2*pad);
          }
          // Figura ganadora encima, en dorado sólido
          if(mask[r][cidx]===1 && inCalled(val, calledSet)){
            k.fillStyle = 'rgba(250, 204, 21, 0.9)'; // dorado
            k.fillRect(x+pad, y+pad, cw-2*pad, ch-2*pad);
            k.strokeStyle = '#92400e';
            k.lineWidth = 2;
            k.strokeRect(x+pad+0.5, y+pad+0.5, cw-2*pad-1, ch-2*pad-1);
          }
        }
      }

      // Redibujar la franja inferior para mostrar serial + nombre más legibles
      try{
        const footerTop = panelY + panelH - FOOTER_H;
        const footerH = FOOTER_H;
        const cx = panelX + panelW / 2;
        // Fondo oscuro encima del original
        k.fillStyle = '#020617';
        k.fillRect(panelX, footerTop, panelW, footerH);
        // Serial en una línea
        k.fillStyle = '#f9fafb';
        k.textAlign = 'center';
        k.textBaseline = 'middle';
        k.font = 'bold 22px "Inter", system-ui, sans-serif';
        const idText = String(card.id || '');
        k.fillText(idText, cx, footerTop + footerH*0.40);
        // Nombre en segunda línea, más pequeño
        const buyerName = String((card.buyer && card.buyer.name) || '');
        if(buyerName){
          k.font = '16px "Inter", system-ui, sans-serif';
          k.fillStyle = '#9ca3af';
          k.fillText(buyerName, cx, footerTop + footerH*0.78);
        }
      }catch(e){
        console.error('footer overlay failed', e);
      }

      return c;
    }catch(e){
      console.error('createCardCanvas failed', e);
      return null;
    }
  }

  function makeDraggable(card, modal){
    const header = card.querySelector('h3') || card;
    let dragging = false, startX=0, startY=0, origX=0, origY=0;

    function onDown(e){
      dragging = true;
      const rect = card.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      startX = e.clientX;
      startY = e.clientY;
      card.style.position = 'absolute';
      card.style.left = origX + 'px';
      card.style.top = origY + 'px';
      card.style.transform = 'none';
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      e.preventDefault();
    }
    function onMove(e){
      if(!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      card.style.left = (origX + dx) + 'px';
      card.style.top  = (origY + dy) + 'px';
    }
    function onUp(){
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    header.addEventListener('mousedown', onDown);
  }

  function showWinners(figureName, winners, mask, calledSet){
    const modal = document.createElement('div'); modal.className='bf-modal'; modal.style.pointerEvents='none';
    const card = document.createElement('div'); card.className='bf-card'; card.style.pointerEvents='auto';
    card.innerHTML = `<h3>¡Ganador${winners.length>1?'es':''} de ${figureName}!</h3>`;
    const cont = document.createElement('div'); cont.className='bf-winner-list';
    winners.forEach(w=>{
      const block = document.createElement('div'); block.className='bf-card-winner-block';
      const title = document.createElement('div'); title.className='bf-card-winner-title';
      title.textContent = `ID: ${w.id} — Comprador: ${w.buyer?.name||'—'}`;
      block.appendChild(title);
      const preview = document.createElement('div'); preview.className='bf-card-preview';
      block.appendChild(preview);
      cont.appendChild(block);
      // Renderizar mini-carta async
      (async()=>{
        const canvas = await createCardCanvas({id:w.id, cols:w.cols, buyer:w.buyer}, mask, calledSet);
        if(canvas) preview.appendChild(canvas);
      })();
    });
    const btn = document.createElement('button'); btn.textContent='Continuar';
    btn.addEventListener('click', ()=>{ modal.remove(); document.dispatchEvent(new CustomEvent('bf:resume')); });
    card.appendChild(cont); card.appendChild(btn); modal.appendChild(card); document.body.appendChild(modal);
    makeDraggable(card, modal);
  }

  function markFigure(idx, disabled){ const node = listSel()[idx]; if(node){ node.classList.add('won'); if(disabled) node.classList.add('disabled'); } }

  document.addEventListener('bf:ball', (ev)=>{
    try{
      const calledSet = toSet(ev?.detail?.called || []);
      const evt = getEvt();
      const db = loadDB(); const eventObj = db?.[evt] || {}; eventObj.generated = Array.isArray(eventObj.generated)?eventObj.generated:[]; eventObj.won = eventObj.won || {};
      const won = eventObj.won;

      for(const fig of currentFigures){
        if(fig.disabled) continue;
        const isFullNow = (fig.tipo === 'full' || fig.id === 'blackout');
        // Cartón lleno solo se evalúa cuando todas las figuras anteriores estén resueltas/cerradas
        if(isFullNow){
          const pendingBefore = currentFigures.some(other => {
            if(other.idx >= fig.idx) return false;
            const otherTipo = other.tipo || (other.id === 'blackout' ? 'full' : 'fig');
            if(otherTipo === 'full') return false;
            return !other.disabled;
          });
          if(pendingBefore) continue;
        }
        const winners = [];
        for(const c of eventObj.generated){
          if(!c?.cols || !c?.id) continue;
          const rec = won[c.id];
          if(rec){
            const prevTipo = rec.tipo || (rec.figure === 'blackout' ? 'full' : 'fig');
            if(!isFullNow){
              // Ya ganó alguna figura o llenazo: no puede ganar otra figura
              continue;
            }else{
              // Evaluando cartón lleno: solo se bloquea si ya ganó lleno antes
              if(prevTipo === 'full') continue;
            }
          }
          if(maskWins(c.cols, fig.mask, calledSet)){
            winners.push({ id: c.id, buyer: c.buyer||{}, cols: c.cols });
          }
        }
        if(winners.length>0){
          fig.disabled = true;
          const stamp = Date.now();
          eventObj.winHistory = Array.isArray(eventObj.winHistory) ? eventObj.winHistory : [];
          eventObj.winHistory.push({
            figId: fig.id,
            figName: (fig.nombre || fig.id),
            tipo: (fig.tipo || (fig.id === 'blackout' ? 'full' : 'fig')),
            at: stamp,
            winners: winners.map(w=>({ id: w.id, buyer: w.buyer||{} }))
          });
          winners.forEach(w=>{
            won[w.id] = {
              figure: fig.id,
              name: (fig.nombre || fig.id),
              tipo: (fig.tipo || (fig.id === 'blackout' ? 'full' : 'fig')),
              at: stamp
            };
          });
          eventObj.won = won; db[evt] = eventObj; saveDB(db);
          document.dispatchEvent(new CustomEvent('bf:pause'));
          markFigure(fig.idx, true);
          showWinners(fig.nombre || fig.id, winners, fig.mask, calledSet);
          try{ playWinSound(fig); }catch(_){}
          break;
        }
      }
    }catch(e){ console.error('winner-detector failed', e); }
  });

  setTimeout(()=>{
    if(window.BingoFigurasWidget){
      const arr = window.BingoFigurasWidget.getEventConfig?.() || [];
      currentFigures = arr.map((it, idx)=>({ idx, id: it.id, nombre: it.nombre||it.id, mask: it.mask, disabled: !!it.disabled, tipo: it.tipo||'fig' }));
      refreshSelectedIndex();
    }
  }, 1000);
})();
