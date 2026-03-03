/* ===== Bingo Figuras Widget v1.5 ===== */
const BFW_FIGURES = [{"id": "blackout", "nombre": "Cartón Lleno", "mask": [[1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1]]}, {"id": "diagonal_p", "nombre": "Diagonal Principal", "mask": [[1, 0, 0, 0, 0], [0, 1, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 1, 0], [0, 0, 0, 0, 1]]}, {"id": "diagonal_s", "nombre": "Diagonal Secundaria", "mask": [[0, 0, 0, 0, 1], [0, 0, 0, 1, 0], [0, 0, 1, 0, 0], [0, 1, 0, 0, 0], [1, 0, 0, 0, 0]]}, {"id": "cruz", "nombre": "Cruz (+)", "mask": [[0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]]}, {"id": "x", "nombre": "Equis (X)", "mask": [[1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0], [0, 1, 0, 1, 0], [1, 0, 0, 0, 1]]}, {"id": "cuatro_esquinas", "nombre": "Cuatro Esquinas", "mask": [[1, 0, 0, 0, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 0, 0, 0, 1]]}, {"id": "cuadro", "nombre": "Cuadro (borde)", "mask": [[1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]]}, {"id": "cuadro3", "nombre": "Cuadro 3×3 (borde)", "mask": [[0, 0, 0, 0, 0], [0, 1, 1, 1, 0], [0, 1, 0, 1, 0], [0, 1, 1, 1, 0], [0, 0, 0, 0, 0]]}, {"id": "diamante", "nombre": "Diamante", "mask": [[0, 0, 1, 0, 0], [0, 1, 0, 1, 0], [1, 0, 1, 0, 1], [0, 1, 0, 1, 0], [0, 0, 1, 0, 0]]}, {"id": "letra_t", "nombre": "Letra T", "mask": [[1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]]}, {"id": "letra_l", "nombre": "Letra L", "mask": [[1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 1, 1, 1, 1]]}, {"id": "letra_z", "nombre": "Letra Z", "mask": [[1, 1, 1, 1, 1], [0, 0, 0, 1, 0], [0, 0, 1, 0, 0], [0, 1, 0, 0, 0], [1, 1, 1, 1, 1]]}, {"id": "letra_u", "nombre": "Letra U", "mask": [[1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1]]}, {"id": "h", "nombre": "Letra H", "mask": [[1, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 1, 1], [1, 0, 0, 0, 1], [1, 0, 0, 0, 1]]}, {"id": "esquinas_y_centro", "nombre": "Esquinas + Centro", "mask": [[1, 0, 0, 0, 1], [0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 0], [1, 0, 0, 0, 1]]}, {"id": "serpiente", "nombre": "Serpiente", "mask": [[1, 1, 1, 1, 1], [0, 0, 0, 0, 1], [1, 1, 1, 1, 1], [1, 0, 0, 0, 0], [1, 1, 1, 1, 1]]}, {"id": "zigzag", "nombre": "Zig-Zag", "mask": [[1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [1, 0, 0, 0, 1], [0, 1, 0, 1, 0], [1, 0, 0, 0, 1]]}, {"id": "cruz_diagonales", "nombre": "Cruz + Diagonales", "mask": [[1, 0, 1, 0, 1], [0, 0, 1, 0, 0], [1, 1, 1, 1, 1], [0, 0, 1, 0, 0], [1, 0, 1, 0, 1]]}, {"id": "corazon", "nombre": "Corazón", "mask": [[0, 1, 0, 1, 0], [1, 1, 1, 1, 1], [1, 1, 1, 1, 1], [0, 1, 1, 1, 0], [0, 0, 1, 0, 0]]}, {"id": "calabaza", "nombre": "Calabaza", "mask": [[0, 1, 1, 1, 0], [1, 0, 1, 0, 1], [1, 1, 1, 1, 1], [1, 0, 1, 0, 1], [0, 1, 1, 1, 0]]}, {"id": "copo_nieve", "nombre": "Copo de Nieve", "mask": [[0, 1, 0, 1, 0], [1, 0, 1, 0, 1], [0, 1, 1, 1, 0], [1, 0, 1, 0, 1], [0, 1, 0, 1, 0]]}, {"id": "fila_1", "nombre": "Línea Horizontal (Fila 1)", "mask": [[1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]}, {"id": "fila_2", "nombre": "Línea Horizontal (Fila 2)", "mask": [[0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]}, {"id": "fila_3", "nombre": "Línea Horizontal (Fila 3)", "mask": [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]]}, {"id": "fila_4", "nombre": "Línea Horizontal (Fila 4)", "mask": [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 1, 1, 1, 1], [0, 0, 0, 0, 0]]}, {"id": "fila_5", "nombre": "Línea Horizontal (Fila 5)", "mask": [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 1, 1, 1, 1]]}, {"id": "col_1", "nombre": "Línea Vertical (Columna 1)", "mask": [[1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 0, 0, 0, 0], [1, 0, 0, 0, 0]]}, {"id": "col_2", "nombre": "Línea Vertical (Columna 2)", "mask": [[0, 1, 0, 0, 0], [0, 1, 0, 0, 0], [0, 1, 0, 0, 0], [0, 1, 0, 0, 0], [0, 1, 0, 0, 0]]}, {"id": "col_3", "nombre": "Línea Vertical (Columna 3)", "mask": [[0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0], [0, 0, 1, 0, 0]]}, {"id": "col_4", "nombre": "Línea Vertical (Columna 4)", "mask": [[0, 0, 0, 1, 0], [0, 0, 0, 1, 0], [0, 0, 0, 1, 0], [0, 0, 0, 1, 0], [0, 0, 0, 1, 0]]}, {"id": "col_5", "nombre": "Línea Vertical (Columna 5)", "mask": [[0, 0, 0, 0, 1], [0, 0, 0, 0, 1], [0, 0, 0, 0, 1], [0, 0, 0, 0, 1], [0, 0, 0, 0, 1]]},
  {
    id: "marco_cruz",
    nombre: "Marco + Cruz",
    mask: [
      [1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1],
      [1, 0, 1, 0, 1],
      [1, 1, 1, 1, 1]
    ]
  },
  {
    id: "estrella",
    nombre: "Estrella (X + Cruz)",
    mask: [
      [1, 0, 1, 0, 1],
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [1, 0, 1, 0, 1]
    ]
  },
  {
    id: "letra_h_grande",
    nombre: "Letra H Grande",
    mask: [
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 1, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 0, 0, 0, 1]
    ]
  },
  {
    id: "casi_blackout",
    nombre: "Casi Cartón Lleno",
    mask: [
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0]
    ]
  },
  {
    id: "doble_cuadro",
    nombre: "Doble Cuadro",
    mask: [
      [1, 1, 1, 1, 1],
      [1, 1, 0, 1, 1],
      [1, 0, 0, 0, 1],
      [1, 1, 0, 1, 1],
      [1, 1, 1, 1, 1]
    ]
  },
  {
    id: "escalera_diagonal",
    nombre: "Escalera Diagonal",
    mask: [
      [1, 0, 0, 0, 0],
      [1, 1, 0, 0, 0],
      [0, 1, 1, 0, 0],
      [0, 0, 1, 1, 0],
      [0, 0, 0, 1, 1]
    ]
  },
  {
    id: "cruz_gruesa",
    nombre: "Cruz Gruesa",
    mask: [
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0]
    ]
  },
  {
    id: "rombo",
    nombre: "Rombo",
    mask: [
      [0, 0, 1, 0, 0],
      [0, 1, 1, 1, 0],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0]
    ]
  }
];

function bfwRenderMini(mask) {
  const el = document.createElement("div");
  el.className = "bfw-mini";
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const cell = document.createElement("div");
      cell.className = "bfw-cell";
      if (r === 2 && c === 2) cell.classList.add("free");
      if (mask[r][c] === 1) cell.classList.add("req");
      el.appendChild(cell);
    }
  }
  return el;
}
function isNumericText(t){ return /^\d+(?:[\.,]\d+)?$/.test((t||'').toString().trim()); }
function normalizeNumber(t){ return Number((t+'').replace(/\./g,'').replace(',', '.')); }
function fmtMoney(v){ try { return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(v||0)); } catch { return v; } }
function displayPrize(obj){
  if(obj.prizeType==='text') return obj.prizeRaw;
  return "$ " + fmtMoney(obj.premio || 0);
}
function matchesSearch(nombre, term) {
  return nombre.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,"")
    .includes(term.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu,""));
}

/** options: title (default "TUS PREMIOS") */
function initBingoFiguresWidget(options = {}, _doc = document) {
  const mount = _doc.querySelector(options.mountSelector || "body");
  if (!mount) return console.warn("[BFW] mount no encontrado");


const container = _doc.createElement("div");
container.id = "bfw-container";

const row = _doc.createElement("div");
row.className = "bfw-row";

const btnFig = _doc.createElement("button");
btnFig.className = "bfw-btn";
btnFig.textContent = "➕ Agregar figuras a este evento";

const btnFull = _doc.createElement("button");
btnFull.className = "bfw-btn alt";
btnFull.textContent = "🧩 Agregar Cartón Lleno";

const btnPresenter = _doc.createElement("button");
btnPresenter.className = "bfw-btn alt";
btnPresenter.type = "button";
btnPresenter.textContent = "🎥 Modo presentador";

btnPresenter.addEventListener("click", () => {
  try{
    const w = window.open("presenter.html", "bingo_presenter", "width=1280,height=720");
    if (!w) {
      alert("Activa las ventanas emergentes para usar el modo presentador.");
    }
  }catch(e){
    console.error("[BFW] No se pudo abrir el modo presentador", e);
  }
});

row.appendChild(btnFig);
row.appendChild(btnFull);
row.appendChild(btnPresenter);

container.appendChild(row);

  const panel = _doc.createElement("div"); panel.id = "bfw-panel";
  panel.innerHTML = `<input id="bfw-search" type="text" placeholder="Buscar figura..." /><div id="bfw-grid"></div>`;
  container.appendChild(panel);

  const selected = _doc.querySelector("#bfw-selected") || _doc.createElement("aside");
  selected.id = "bfw-selected";
  selected.innerHTML = `<div class="bfw-title"><h3>${options.title || "TUS PREMIOS"}</h3></div><div class="bfw-selected-list" id="bfw-selected-list"></div>`;
  if (!selected.parentElement) _doc.body.appendChild(selected);
  mount.appendChild(container);

  const state = { term: "", items: [] };
  const STORAGE_KEY = "bfw_event_config_v15";
  function save(){ try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)); } catch {} }
  function load(){ try { const v = JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]"); state.items = Array.isArray(v)?v:[]; } catch { state.items=[]; } }

  function askPrize(defaultValue, isFull){
    const hint = "Valor (ej: 100.000) o artículo (ej: Bicicleta)";
    const txt = window.prompt(`Configura el premio\n${hint}`, defaultValue ?? (isFull ? "1.000.000" : "300.000"));
    if (txt == null) return null; // cancel
    const trimmed = txt.trim();
    if (isNumericText(trimmed)){
      return { prizeType: "money", premio: normalizeNumber(trimmed), prizeRaw: trimmed };
    } else {
      return { prizeType: "text", premio: 0, prizeRaw: trimmed };
    }
  }

  function renderGrid(){
    const grid = panel.querySelector("#bfw-grid"); grid.innerHTML = "";
    BFW_FIGURES.filter(f => !state.term || matchesSearch(f.nombre, state.term)).forEach(fig => {
      const card = _doc.createElement("div"); card.className = "bfw-card";
      const title = _doc.createElement("h4"); title.textContent = fig.nombre;
      const toggle = _doc.createElement("button"); toggle.className = "bfw-toggle"; toggle.textContent = "Agregar";
      toggle.addEventListener("click", () => addItem(fig));
      const head = _doc.createElement("div"); head.style.display="flex"; head.style.justifyContent="space-between"; head.style.alignItems="center";
      head.appendChild(title); head.appendChild(toggle);
      const mini = bfwRenderMini(fig.mask);
      card.appendChild(head); card.appendChild(mini); grid.appendChild(card);
    });
  }

  function addItem(fig){
    const isFull = (fig.id==='blackout');
    const prizeObj = askPrize(null, isFull);
    if (prizeObj === null) return; // canceled
    state.items.push({ id: fig.id, nombre: fig.nombre, mask: fig.mask, tipo: isFull?'full':'fig', ...prizeObj });
    renderSelected(); save(); _doc.dispatchEvent(new CustomEvent("bfw:eventChanged", { detail: state.items }));
  }
  function addFullCard(){
    const full = BFW_FIGURES.find(f=>f.id==='blackout');
    addItem(full);
  }

  function renderSelected(){
    const list = selected.querySelector("#bfw-selected-list"); list.innerHTML = "";
    state.items.forEach((it, idx) => {
      const card = _doc.createElement("div"); card.className = "bfw-selected-item";

      const prizeTop = _doc.createElement("div"); 
      prizeTop.className = "bfw-prize-display " + (it.tipo==='full' ? 'full' : 'fig');
      prizeTop.textContent = displayPrize(it);
      prizeTop.title = "Click para editar";
      prizeTop.addEventListener("click", () => {
        const seed = it.prizeType==='text' ? it.prizeRaw : (it.premio ? fmtMoney(it.premio) : "");
        const edited = askPrize(seed, it.tipo==='full');
        if (edited){
          Object.assign(it, edited);
          prizeTop.textContent = displayPrize(it);
          save(); _doc.dispatchEvent(new CustomEvent("bfw:eventChanged", { detail: state.items }));
        }
      });
      card.appendChild(prizeTop);

      const mini = bfwRenderMini(it.mask);
      card.appendChild(mini);

      const remove = _doc.createElement("button"); remove.className="bfw-remove"; remove.textContent="✕"; remove.title="Quitar";
      remove.addEventListener("click", () => { state.items.splice(idx,1); renderSelected(); save(); _doc.dispatchEvent(new CustomEvent("bfw:eventChanged", { detail: state.items })); });
      card.appendChild(remove);

      list.appendChild(card);
    });
  }

  btnFig.addEventListener("click", () => panel.classList.toggle("open"));
  btnFull.addEventListener("click", () => addFullCard());
  panel.querySelector("#bfw-search").addEventListener("input", (e) => { state.term = e.target.value; renderGrid(); });

  renderGrid(); load(); renderSelected();
  _doc.dispatchEvent(new CustomEvent("bfw:eventChanged", { detail: state.items }));

  window.BingoFigurasWidget = {
    getEventConfig: () => state.items.slice(),
    setEventConfig: (arr) => { state.items = Array.isArray(arr)?arr:[]; renderSelected(); save(); },
    clearEvent: () => { state.items = []; renderSelected(); save(); }
  };
}