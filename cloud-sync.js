
// BF Cloud Sync + Usuarios (Auth + Firestore por usuario) - sin UI (lo maneja auth-ui.js)
(function(){
  if (!window.BF_FIREBASE_CONFIG){
    console.warn('[BF Cloud] No hay configuración de Firebase.');
    return;
  }

  if (!window.firebase){
    console.error('[BF Cloud] SDK de Firebase no encontrado (firebase-* scripts).');
    return;
  }

  var app;
  if (firebase.apps && firebase.apps.length){
    app = firebase.apps[0];
  }else{
    app = firebase.initializeApp(window.BF_FIREBASE_CONFIG);
  }
  var auth = app.auth();
  var db   = app.firestore();

  window.BF_AUTH = auth;
  window.BF_DB   = db;

  var syncingFromCloud = false;
  var lastUserId = null;

  function getUserDocRef(){
    var u = auth.currentUser;
    if (!u) return null;
    return db.collection('users').doc(u.uid);
  }

  function loadLocalDB(){
    try{
      var raw = window.localStorage.getItem('bingo_events') || '{}';
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' ? obj : {};
    }catch(_){
      return {};
    }
  }

  function saveLocalDB(dbObj){
    try{
      syncingFromCloud = true;
      window.localStorage.setItem('bingo_events', JSON.stringify(dbObj || {}));
    }finally{
      syncingFromCloud = false;
    }
  }

  
  function mergeEventObjects(base, incoming){
    base = base && typeof base === 'object' ? base : {};
    incoming = incoming && typeof incoming === 'object' ? incoming : {};
    var out = Object.assign({}, base, incoming);

    // ---- Deletion (tombstone) support ----
    // If an event is deleted on any device, it should not "revive" when another device syncs.
    var bMeta = (base.meta && typeof base.meta === 'object') ? base.meta : {};
    var iMeta = (incoming.meta && typeof incoming.meta === 'object') ? incoming.meta : {};
    var bDelAt = Number(bMeta.deletedAt || 0);
    var iDelAt = Number(iMeta.deletedAt || 0);
    var delAt = Math.max(bDelAt, iDelAt);

    // updatedAt/createdAt merge (keep max)
    var bUp = Number(bMeta.updatedAt || 0);
    var iUp = Number(iMeta.updatedAt || 0);
    var bCr = Number(bMeta.createdAt || 0);
    var iCr = Number(iMeta.createdAt || 0);

    out.meta = Object.assign({}, bMeta, iMeta);
    out.meta.updatedAt = Math.max(bUp, iUp);
    out.meta.createdAt = Math.max(bCr, iCr);

    if (delAt > 0){
      out.meta.deletedAt = delAt;
      out.meta.deleted = true;

      // When deleted, keep a minimal tombstone to avoid resurrection.
      // Keep name/id so UI can show (optional), but wipe heavy data.
      out.ids = {};
      out.cards = {};
      out.buyers = {};
      out.vendors = {};
      out.generated = [];
      out.won = {};
      out.sales = {};
      out.combos_total = 0;
      out.individuales_total = 0;
      return out;
    }

    // ---- Normal merge ----
    // Deep merge for maps
    out.ids = Object.assign({}, (base.ids||{}), (incoming.ids||{}));
    out.cards = Object.assign({}, (base.cards||{}), (incoming.cards||{}));
    out.buyers = Object.assign({}, (base.buyers||{}), (incoming.buyers||{}));
    out.vendors = Object.assign({}, (base.vendors||{}), (incoming.vendors||{}));
    out.won = Object.assign({}, (base.won||{}), (incoming.won||{}));
    out.sales = Object.assign({}, (base.sales||{}), (incoming.sales||{}));

    // generated list: union by card id
    var genA = Array.isArray(base.generated) ? base.generated : [];
    var genB = Array.isArray(incoming.generated) ? incoming.generated : [];
    var seen = {};
    var mergedGen = [];
    function pushGen(x){
      if (!x) return;
      var id = null;
      if (typeof x === 'string') id = x;
      else if (typeof x === 'object') id = x.id || x.cardId;
      if (!id) return;
      if (!seen[id]){
        seen[id] = 1;
        mergedGen.push(x);
      }
    }
    genA.forEach(pushGen);
    genB.forEach(pushGen);
    out.generated = mergedGen;

    // totals: keep max (safe for multi-device)
    out.combos_total = Math.max(Number(base.combos_total||0), Number(incoming.combos_total||0));
    out.individuales_total = Math.max(Number(base.individuales_total||0), Number(incoming.individuales_total||0));

    return out;
  }
function mergeBingoDB(localObj, remoteObj){
    localObj = localObj && typeof localObj === 'object' ? localObj : {};
    remoteObj = remoteObj && typeof remoteObj === 'object' ? remoteObj : {};
    var out = Object.assign({}, remoteObj); // start from remote
    Object.keys(localObj).forEach(function(eventKey){
      out[eventKey] = mergeEventObjects(remoteObj[eventKey], localObj[eventKey]);
    });
    return out;
  }

function syncLocalToCloud(){
    var docRef = getUserDocRef();
    if (!docRef) return;

    var localObj = loadLocalDB();

    // Usar transacción para evitar "pisar" escrituras concurrentes entre dispositivos.
    db.runTransaction(function(tx){
      return tx.get(docRef).then(function(snap){
        var remoteObj = {};
        if (snap.exists){
          var data = snap.data() || {};
          var payload = data.bingo_events;
          if (payload){
            try{ remoteObj = typeof payload === 'string' ? JSON.parse(payload) : payload; }catch(_){ remoteObj = {}; }
          }
        }
        var merged = mergeBingoDB(localObj, remoteObj);
        var payloadOut = JSON.stringify(merged || {});
        tx.set(docRef, {
          bingo_events: payloadOut,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });
    }).catch(function(err){
      console.error('[BF Cloud] Error subiendo datos a la nube', err);
    });
  }

  function syncCloudToLocal(){
    var docRef = getUserDocRef();
    if (!docRef) return;
    docRef.get().then(function(snap){
      if (!snap.exists) return;
      var data = snap.data() || {};
      var payload = data.bingo_events;
      if (!payload) return;
      try{
        var remoteObj = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (!remoteObj || typeof remoteObj !== 'object') return;

        // Mezclar nube + local para no perder cambios locales (por ejemplo, ventas recientes).
        var localObj = loadLocalDB();
        var merged = mergeBingoDB(localObj, remoteObj);

        saveLocalDB(merged);
        console.log('[BF Cloud] Datos de eventos sincronizados desde la nube.');
      }catch(e){
        console.error('[BF Cloud] No se pudo aplicar datos desde la nube', e);
      }
    }).catch(function(err){
      console.error('[BF Cloud] Error leyendo datos desde la nube', err);
    });
  }

  // Enganchar cambios de localStorage
  (function(){
    try{
      var originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = function(k, v){
        originalSetItem.call(window.localStorage, k, v);
        if (syncingFromCloud) return;
        if (k === 'bingo_events' && auth.currentUser){
          setTimeout(syncLocalToCloud, 300);
        }
      };
    }catch(e){
      console.error('[BF Cloud] No se pudo enganchar localStorage', e);
    }
  })();

  // Sincronizar cuando cambie el usuario
  auth.onAuthStateChanged(function(user){
    if (user){
      if (user.uid !== lastUserId){
        lastUserId = user.uid;
        syncCloudToLocal();
      }
    }else{
      lastUserId = null;
    }
  });

  window.BF_SYNC_NOW_FROM_CLOUD = syncCloudToLocal;
  window.BF_SYNC_NOW_TO_CLOUD   = syncLocalToCloud;
})();
