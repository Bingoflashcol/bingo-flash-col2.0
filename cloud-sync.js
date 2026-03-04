// cloud-sync.js
(function(){
  const CFG = window.BF_FIREBASE_CONFIG;
  if(!CFG || !window.firebase){
    console.warn("[BF Cloud] Firebase no está cargado o falta config.");
    return;
  }

  // Init Firebase (compat)
  if(!firebase.apps.length){
    firebase.initializeApp(CFG);
  }

  const db = firebase.firestore();
  const auth = firebase.auth();

  const STORAGE_KEY = "bingo_events";
  let pendingLocalChanges = false; // <- cambios hechos antes de que auth esté listo
  let bootstrapping = false;

  function safeParse(json, fallback){
    try{ return JSON.parse(json); }catch(_){ return fallback; }
  }

  function readLocal(){
    const raw = localStorage.getItem(STORAGE_KEY);
    return safeParse(raw, {});
  }

  function writeLocal(obj){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }

  // Merge “profundo” pero simple para tu estructura actual
  function mergeEvents(remote, local){
    const out = JSON.parse(JSON.stringify(remote || {}));

    for(const eventId of Object.keys(local || {})){
      if(!out[eventId]) out[eventId] = {};

      const rE = out[eventId] || {};
      const lE = local[eventId] || {};

      // meta
      out[eventId].meta = Object.assign({}, rE.meta || {}, lE.meta || {});

      // ids (map id->1)
      out[eventId].ids = Object.assign({}, rE.ids || {}, lE.ids || {});

      // cards (map id->cardObj)
      out[eventId].cards = Object.assign({}, rE.cards || {}, lE.cards || {});

      // generated (array)
      const rGen = Array.isArray(rE.generated) ? rE.generated : [];
      const lGen = Array.isArray(lE.generated) ? lE.generated : [];
      const seen = new Set();
      const mergedGen = [];
      for(const c of rGen){ if(c && c.id && !seen.has(c.id)){ seen.add(c.id); mergedGen.push(c); } }
      for(const c of lGen){ if(c && c.id && !seen.has(c.id)){ seen.add(c.id); mergedGen.push(c); } }
      out[eventId].generated = mergedGen;

      // buyers/vendors/won etc.
      out[eventId].buyers  = Object.assign({}, rE.buyers  || {}, lE.buyers  || {});
      out[eventId].vendors = Object.assign({}, rE.vendors || {}, lE.vendors || {});
      out[eventId].won     = Object.assign({}, rE.won     || {}, lE.won     || {});

      // counters (preferimos el MAYOR, para no “perder” conteos)
      const rSeq = Number(rE.seq || 0);
      const lSeq = Number(lE.seq || 0);
      out[eventId].seq = Math.max(rSeq, lSeq);

      const rCT = Number(rE.combos_total || 0);
      const lCT = Number(lE.combos_total || 0);
      out[eventId].combos_total = Math.max(rCT, lCT);

      const rIT = Number(rE.individuales_total || 0);
      const lIT = Number(lE.individuales_total || 0);
      out[eventId].individuales_total = Math.max(rIT, lIT);
    }

    return out;
  }

  function userDocRef(uid){
    return db.collection("users").doc(uid);
  }

  async function syncLocalToCloud(){
    const user = auth.currentUser;
    if(!user){
      pendingLocalChanges = true;
      return;
    }

    const uid = user.uid;
    const localData = readLocal();

    await db.runTransaction(async (tx)=>{
      const ref = userDocRef(uid);
      const snap = await tx.get(ref);
      const remoteData = snap.exists ? (snap.data().bingo_events || {}) : {};

      const merged = mergeEvents(remoteData, localData);

      tx.set(ref, {
        bingo_events: merged,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // dejamos local “normalizado” también
      writeLocal(merged);
    });

    pendingLocalChanges = false;
    console.log("[BF Cloud] Local -> Cloud OK");
  }

  async function syncCloudToLocal(){
    const user = auth.currentUser;
    if(!user) return;

    const uid = user.uid;
    const snap = await userDocRef(uid).get();
    const remoteData = snap.exists ? (snap.data().bingo_events || {}) : {};

    // mergeando por seguridad (si quedó algo local)
    const localData = readLocal();
    const merged = mergeEvents(remoteData, localData);

    // guardamos ambos lados
    writeLocal(merged);

    // y si había algo local que no estaba en cloud, lo empujamos
    // (esto evita perder ventas hechas “offline” o antes de auth)
    await db.set(userDocRef(uid), {
      bingo_events: merged,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });

    console.log("[BF Cloud] Cloud -> Local OK (y normalizado)");
  }

  // *** LA CLAVE: bootstrap = primero sube local, luego baja cloud ***
  async function bootstrapSync(){
    if(bootstrapping) return;
    bootstrapping = true;
    try{
      // si hubo cambios antes de auth listo, esto los rescata
      await syncLocalToCloud();
      await syncCloudToLocal();
      console.log("[BF Cloud] Bootstrap sync completo.");
    }catch(e){
      console.error("[BF Cloud] Bootstrap sync error:", e);
    }finally{
      bootstrapping = false;
    }
  }

  // Hook a localStorage.setItem para disparar sync cuando cambie STORAGE_KEY
  const _setItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function(k, v){
    _setItem(k, v);

    if(k === STORAGE_KEY){
      if(auth.currentUser){
        // mejor en cola microtask para no trabar UI
        Promise.resolve().then(()=>syncLocalToCloud()).catch(()=>{});
      }else{
        pendingLocalChanges = true;
      }
    }
  };

  // Exponer helpers
  window.BF_SYNC_NOW_FROM_CLOUD = async function(){
    // conservar compat: solo baja
    await syncCloudToLocal();
  };

  window.BF_SYNC_BOOTSTRAP = async function(){
    await bootstrapSync();
  };

  // Auth lifecycle
  auth.onAuthStateChanged(async (user)=>{
    if(user){
      await bootstrapSync();
      // si por alguna razón quedaron cambios pendientes:
      if(pendingLocalChanges){
        await bootstrapSync();
      }
    }
  });

})();
