(function(){
  function letterOf(n){
    n = Number(n) || 0;
    if (n <= 15) return 'B';
    if (n <= 30) return 'I';
    if (n <= 45) return 'N';
    if (n <= 60) return 'G';
    return 'O';
  }

  let lastNumberShown = null;

  function showFlyingBallPresenter(num){
    const overlay = document.getElementById('flyOverlayPresenter');
    if (!overlay) return;

    overlay.innerHTML = '';
    const ballEl = document.createElement('div');
    ballEl.className = 'fly-ball';
    ballEl.textContent = letterOf(num) + ' ' + num;
    overlay.appendChild(ballEl);
    overlay.classList.add('show');

    const vw = window.innerWidth || document.documentElement.clientWidth;
    const vh = window.innerHeight || document.documentElement.clientHeight;
    const startX = vw / 2;
    const startY = vh / 2;

    // Destino: chip del tablero en la ventana de presentador
    let targetX = startX;
    let targetY = startY + 220;
    const chip = document.querySelector('[data-num="' + num + '"]');
    if (chip && chip.getBoundingClientRect){
      const r = chip.getBoundingClientRect();
      targetX = r.left + r.width/2;
      targetY = r.top + r.height/2;
    }

    ballEl.style.position = 'fixed';
    ballEl.style.left = '0px';
    ballEl.style.top = '0px';

    try{
      const anim = ballEl.animate([
        { transform:'translate(' + startX + 'px,' + (startY+140) + 'px) scale(.4)', opacity:0 },
        { transform:'translate(' + startX + 'px,' + startY + 'px) scale(1.2)', opacity:1, offset:0.3 },
        { transform:'translate(' + targetX + 'px,' + targetY + 'px) scale(.45)', opacity:0 }
      ], {
        duration: 1800,
        easing: 'ease-in-out',
        fill: 'forwards'
      });
      anim.onfinish = function(){
        overlay.classList.remove('show');
        overlay.innerHTML = '';
      };
    }catch(e){
      setTimeout(function(){
        overlay.classList.remove('show');
        overlay.innerHTML = '';
      }, 1800);
    }
  }

  function sync(){
    try{
      if (!window.opener || window.opener.closed) {
        return;
      }
      const srcDoc = window.opener.document;

      // Bola actual
      const srcLetter = srcDoc.getElementById('curLetter');
      const srcBall = srcDoc.getElementById('curBall');
      const dstLetter = document.getElementById('presenter-curLetter');
      const dstBall = document.getElementById('presenter-curBall');
      if (srcLetter && dstLetter) dstLetter.textContent = srcLetter.textContent || '—';
      if (srcBall && dstBall) dstBall.textContent = srcBall.textContent || '—';

      // Detectar número actual para la animación
      const currentNumText = srcBall && srcBall.textContent ? srcBall.textContent.trim() : '';
      const currentNum = parseInt(currentNumText, 10);
      if (!isNaN(currentNum) && currentNum !== lastNumberShown){
        lastNumberShown = currentNum;
        showFlyingBallPresenter(currentNum);
      }

      // Historial
      const srcHist = srcDoc.getElementById('historyList');
      const dstHist = document.getElementById('presenter-historyList');
      if (srcHist && dstHist) dstHist.innerHTML = srcHist.innerHTML;

      // Tablero principal
      const srcBoard = srcDoc.getElementById('board');
      const dstBoard = document.getElementById('presenter-board');
      if (srcBoard && dstBoard) dstBoard.innerHTML = srcBoard.innerHTML;
    }catch(e){
      console.error('[Presenter] Error al sincronizar con la ventana principal', e);
    }
  }

  window.addEventListener('load', function(){
    sync();
    setInterval(sync, 600);
  });
})();
