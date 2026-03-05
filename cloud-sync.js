
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
    var out = Object.assign({}, base);

    function mergeMapField(field){
      var a = (base[field] && typeof base[field] === 'object') ? base[field] : {};
      var b = (incoming[field] && typeof incoming[field] === 'object') ? incoming[field] : {};
      out[field] = Object.assign({}, a, b); // union; incoming wins on key collision
    }

    // maps
    mergeMapField('cards');
    mergeMapField('ids');
    mergeMapField('won');
    mergeMapField('buyers');
    mergeMapField('vendors');
    mergeMapField('meta');

    // arrays (generated): unir por id (NO por referencia de objeto)
    var aGen = Array.isArray(base.generated) ? base.generated : [];
    var bGen = Array.isArray(incoming.generated) ? incoming.generated : [];
    if (aGen.length || bGen.length){
      var map = {};
      var mergedGen = [];
      function add(arr){
        for (var i=0;i<arr.length;i++){
          var it = arr[i];
          if (!it || typeof it !== 'object') continue;
          var id = it.id || it.cardId || it.key;
          if (!id) continue;
          if (!map[id]){ map[id]=it; mergedGen.push(it); }
          else{
            var old = map[id];
            var oldTs = Number(old.ts||old.updatedAt||0);
            var newTs = Number(it.ts||it.updatedAt||0);
            if (newTs > oldTs){
              map[id]=it;
              for (var k=0;k<mergedGen.length;k++){
                var mid = mergedGen[k] && (mergedGen[k].id||mergedGen[k].cardId||mergedGen[k].key);
                if (mid===id){ mergedGen[k]=it; break; }
              }
            }
          }
        }
      }
      add(aGen);
      add(bGen);
      out.generated = mergedGen;
    }

    // counters / seq: keep max
    out.seq = Math.max(Number(base.seq||0), Number(incoming.seq||0));
    out.combos_total = Math.max(Number(base.combos_total||0), Number(incoming.combos_total||0));
    out.individuales_total = Math.max(Number(base.individuales_total||0), Number(incoming.individuales_total||0));

    return out;
  }

  function __bf_isMetaKey(k){
    return typeof k === 'string' && (k === '__deletedEvents' || k.startsWith('__'));
  }

  function __bf_eventUpdatedAt(ev){
    if (!ev || typeof ev !== 'object') return 0;
    var a = Number(ev.updatedAt||0);
    var b = Number(ev.savedAt||0);
    var c = Number(ev.createdAt||0);
    return Math.max(a,b,c);
  }

  function mergeBingoDB(localObj, remoteObj){
    localObj = localObj && typeof localObj === 'object' ? localObj : {};
    remoteObj = remoteObj && typeof remoteObj === 'object' ? remoteObj : {};

    var out = {};
    // 1) tombstones / borrados
    var delA = (remoteObj.__deletedEvents && typeof remoteObj.__deletedEvents === 'object') ? remoteObj.__deletedEvents : {};
    var delB = (localObj.__deletedEvents && typeof localObj.__deletedEvents === 'object') ? localObj.__deletedEvents : {};
    var delOut = Object.assign({}, delA);
    Object.keys(delB).forEach(function(k){
      var v = Number(delB[k]||0);
      if (!delOut[k] || v > Number(delOut[k]||0)) delOut[k] = v;
    });
    if (Object.keys(delOut).length) out.__deletedEvents = delOut;

    // 2) eventos: unión de ambos lados, pero respetando borrados recientes
    var keys = {};
    Object.keys(remoteObj).forEach(function(k){ if (!__bf_isMetaKey(k)) keys[k]=1; });
    Object.keys(localObj).forEach(function(k){ if (!__bf_isMetaKey(k)) keys[k]=1; });

    Object.keys(keys).forEach(function(eventKey){
      var aEv = remoteObj[eventKey];
      var bEv = localObj[eventKey];
      var mergedEv = mergeEventObjects(aEv, bEv);

      var delTs = Number((delOut && delOut[eventKey]) || 0);
      var evTs = __bf_eventUpdatedAt(mergedEv);
      // Si hay marca de borrado más nueva que el evento, NO lo revivimos.
      if (delTs && delTs > evTs) return;

      out[eventKey] = mergedEv;
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
