const $=id=>document.getElementById(id);

const board=$('board');
const curLetter=$('curLetter'), curBall=$('curBall');
const startBtn=$('start'), pauseBtn=$('pause'), nextBtn=$('next'), repeatBtn=$('repeat'), resetBtn=$('reset'), fsBtn=$('fullscreen');
const repeatAuto=$('repeatAuto'), speakToggle=$('speak'); 
const speedEl=$('speed'), speedVal=$('speedVal'), volumeEl=$('volume');
const manualToggle=$('manualMode');
const voiceSelect=$('voiceSelect');

let balls=[], called=[], timer=null, lastBall=null, willRepeat=false, manualMode=false, lastNumbers=[];
let availableVoices=[], selectedVoiceName='';

function updateHistory(num){
  try{
    lastNumbers.unshift(num);
    lastNumbers = lastNumbers.slice(0,5);
    const historyList = $('historyList');
    if(!historyList) return;
    historyList.innerHTML = lastNumbers.map(n=>'<div class="hitem">'+n+'</div>').join('');
  }catch(e){}
}

function showFlyingBall(num){
  const overlay = $('flyOverlay');
  if (!overlay) return;

  // crear bola grande
  overlay.innerHTML = '';
  const ballEl = document.createElement('div');
  ballEl.className = 'fly-ball';
  ballEl.textContent = `${letterOf(num)} ${num}`;
  overlay.appendChild(ballEl);
  overlay.classList.add('show');

  // posición inicial: centro de la pantalla
  const vw = window.innerWidth || document.documentElement.clientWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const startX = vw / 2;
  const startY = vh / 2;

  // posición destino: chip del tablero (si existe)
  let targetX = startX;
  let targetY = startY + 220;
  const chip = typeof chipOf === 'function' ? chipOf(num) : null;
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
      { transform:`translate(${startX}px,${startY+140}px) scale(.4)`, opacity:0 },
      { transform:`translate(${startX}px,${startY}px) scale(1.2)`, opacity:1, offset:0.3 },
      { transform:`translate(${targetX}px,${targetY}px) scale(.45)`, opacity:0 }
    ], {
      duration: 1800,
      easing: 'ease-in-out',
      fill: 'forwards'
    });
    anim.onfinish = ()=>{
      overlay.classList.remove('show');
      overlay.innerHTML = '';
    };
  }catch(e){
    setTimeout(()=>{
      overlay.classList.remove('show');
      overlay.innerHTML = '';
    }, 1800);
  }
}


function buildBoard(){
  board.innerHTML='';
  const cols=['b','i','n','g','o'];
  for(let c=0;c<5;c++){
    const col=document.createElement('div'); col.className='col '+cols[c];
    for(let r=1;r<=15;r++){
      const n = c*15 + r;
      const chip=document.createElement('div');
      chip.className='chip'; chip.dataset.num=String(n); chip.textContent=String(n);
      chip.addEventListener('click', ()=>{
        if(!manualMode) return;
        if(called.includes(n)) return;
        called.push(n);
        showBall(n);
        document.dispatchEvent(new CustomEvent("bf:ball", { detail: { n, called: called.slice() } }));
      });
      col.appendChild(chip);
    }
    board.appendChild(col);
  }
}
function chipOf(n){ return board.querySelector('.chip[data-num="'+n+'"]'); }
function mark(n){
  const el=chipOf(n);
  if (el){
    el.classList.add('hit');
    el.classList.add('flash');
    setTimeout(()=> el.classList.remove('flash'), 900);
  }
}
function letterOf(n){ return n<=15?'B':n<=30?'I':n<=45?'N':n<=60?'G':'O'; }
function speak(text){
  try{
    if (!speakToggle.checked) return;
    const u = new SpeechSynthesisUtterance(text);
    // Intentar usar la voz seleccionada si existe
    let voice = null;
    if (selectedVoiceName && Array.isArray(availableVoices) && availableVoices.length){
      voice = availableVoices.find(v => v.name === selectedVoiceName) || null;
    }
    if (voice){ u.voice = voice; u.lang = voice.lang || u.lang; }
    else { u.lang = 'es-MX'; }
    u.rate = 1.0; u.pitch = 1; u.volume = parseFloat(volumeEl.value||'0.9');
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }catch(e){}
}

function init(){
  balls = Array.from({length:75},(_,i)=>i+1);
  called = []; lastBall=null; willRepeat=false; lastNumbers=[];
  curLetter.textContent='—'; curBall.textContent='—';
  const historyList = $('historyList'); if(historyList) historyList.innerHTML='';
  const overlay = $('flyOverlay'); if(overlay){ overlay.classList.remove('show'); overlay.innerHTML=''; }
  clearInterval(timer); timer=null;
  buildBoard();
}
function pick(){ if (!balls.length) return null; const idx=Math.floor(Math.random()*balls.length); return balls.splice(idx,1)[0]; }
function showBall(n){
  lastBall=n;
  const L=letterOf(n);
  curLetter.textContent=L; curBall.textContent=String(n);
  try{
    curBall.classList.remove('is-new');
    void curBall.offsetWidth;
    curBall.classList.add('is-new');
  }catch(e){}
  mark(n);
  updateHistory(n);
  showFlyingBall(n);
  speak(`${L}, ${n}`);
}
function callNext(){
  if (manualMode) return;
  if (willRepeat && lastBall!=null){ willRepeat=false; speak(`${letterOf(lastBall)}, ${lastBall}`); return; }
  const n = pick(); if (n==null){ stop(); return; }
  called.push(n); showBall(n);
  document.dispatchEvent(new CustomEvent("bf:ball", { detail: { n, called: called.slice() } }));
  if (repeatAuto.checked) willRepeat=true;
}
function start(){
  if (manualMode) return;
  stop(); const ms=parseInt(speedEl.value,10); timer=setInterval(callNext, ms); speedVal.textContent=(ms/1000).toFixed(1)+'s'; }
function stop(){ if (timer){ clearInterval(timer); timer=null; } }

startBtn.addEventListener('click', start);
pauseBtn.addEventListener('click', stop);
nextBtn.addEventListener('click', callNext);
repeatBtn.addEventListener('click', ()=>{ if (lastBall!=null) speak(`${letterOf(lastBall)}, ${lastBall}`); });
resetBtn.addEventListener('click', init);
speedEl.addEventListener('input', ()=>{ speedVal.textContent=(parseInt(speedEl.value,10)/1000).toFixed(1)+'s'; if (timer) start(); });
fsBtn.addEventListener('click', ()=>{
  const el=document.documentElement;
  if (!document.fullscreenElement){ el.requestFullscreen?.(); } else { document.exitFullscreen?.(); }
});

manualToggle && manualToggle.addEventListener('change', ()=>{
  manualMode = !!manualToggle.checked;
  if (manualMode) {
    stop();
  }
});


function refreshVoices(){
  try{
    if (!('speechSynthesis' in window)) return;
    const list = window.speechSynthesis.getVoices() || [];
    availableVoices = list.filter(v => v && v.lang && v.lang.toLowerCase().startsWith('es'));
    if (!voiceSelect) return;
    const current = selectedVoiceName;
    voiceSelect.innerHTML = '';
    const optAuto = document.createElement('option');
    optAuto.value = '';
    optAuto.textContent = 'Auto';
    voiceSelect.appendChild(optAuto);
    for (const v of availableVoices){
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = v.name + ' (' + v.lang + ')';
      if (v.name === current) opt.selected = true;
      voiceSelect.appendChild(opt);
    }
  }catch(e){}
}
if ('speechSynthesis' in window){
  window.speechSynthesis.onvoiceschanged = refreshVoices;
  setTimeout(refreshVoices, 500);
}
voiceSelect && voiceSelect.addEventListener('change', ()=>{
  selectedVoiceName = voiceSelect.value || '';
});

document.addEventListener("bf:pause", ()=>stop());
document.addEventListener("bf:resume", ()=>{ if(!timer){ start(); } });
init();

const splash = document.getElementById('splash');
const splashBtn = document.getElementById('startBtnSplash');
if (splash && splashBtn){
  splashBtn.addEventListener('click', ()=>{
    splash.style.display = 'none';
  });
}
