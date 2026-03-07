// BF Cloud Sync + Usuarios (Auth + Firestore por usuario)
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
  var syncTimer = null;

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
      out[field] = Object.assign({}, a, b); // union; incoming gana en colisiones
    }

    mergeMapField('cards');
    mergeMapField('ids');
    mergeMapField('won');
    mergeMapField('buyers');
    mergeMapField('vendors');
    mergeMapField('participants');
    mergeMapField('meta');

    var aGen = Array.isArray(base.generated) ? base.generated : [];
    var bGen = Array.isArray(incoming.generated) ? incoming.generated : [];
    var seen = {};
    var mergedGen = [];
    for (var i=0;i<aGen.length;i++){ var v=aGen[i]; if (!seen[v]){ seen[v]=1; mergedGen.push(v);} }
    for (var j=0;j<bGen.length;j++){ var v2=bGen[j]; if (!seen[v2]){ seen[v2]=1; mergedGen.push(v2);} }
    out.generated = mergedGen;

    out.seq = Math.max(Number(base.seq||0), Number(incoming.seq||0));
    out.combos_total = Math.max(Number(base.combos_total||0), Number(incoming.combos_total||0));
    out.individuales_total = Math.max(Number(base.individuales_total||0), Number(incoming.individuales_total||0));

    return out;
  }

  function mergeBingoDB(localObj, remoteObj){
    localObj = localObj && typeof localObj === 'object' ? localObj : {};
    remoteObj = remoteObj && typeof remoteObj === 'object' ? remoteObj : {};

    var localDeleted = (localObj.__deletedEvents && typeof localObj.__deletedEvents === 'object') ? localObj.__deletedEvents : {};
    var remoteDeleted = (remoteObj.__deletedEvents && typeof remoteObj.__deletedEvents === 'object') ? remoteObj.__deletedEvents : {};
    var deleted = Object.assign({}, remoteDeleted, localDeleted);

    var out = {};
    Object.keys(remoteObj).forEach(function(eventKey){
      if (eventKey === '__deletedEvents') return;
      if (eventKey.charAt(0) === '_') return;
      if (deleted[eventKey]) return;
      out[eventKey] = remoteObj[eventKey];
    });
    Object.keys(localObj).forEach(function(eventKey){
      if (eventKey === '__deletedEvents') return;
      if (eventKey.charAt(0) === '_') return;
      if (deleted[eventKey]) {
        delete out[eventKey];
        return;
      }
      out[eventKey] = mergeEventObjects(remoteObj[eventKey], localObj[eventKey]);
    });
    if (Object.keys(deleted).length){
      out.__deletedEvents = deleted;
    }
    return out;
  }

  function syncLocalToCloud(){
    var docRef = getUserDocRef();
    if (!docRef) return Promise.resolve();

    var localObj = loadLocalDB();

    return db.runTransaction(function(tx){
      return tx.get(docRef).then(function(snap){
        var remoteObj = {};
        if (snap.exists){
          var data = snap.data() || {};
          var payload = data.bingo_events;
          if (payload){
            try{ remoteObj = (typeof payload === 'string') ? JSON.parse(payload) : payload; }catch(_){ remoteObj = {}; }
          }
        }
        var merged = mergeBingoDB(localObj, remoteObj);
        tx.set(docRef, {
          bingo_events: JSON.stringify(merged || {}),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge:true });
      });
    }).catch(function(err){
      console.error('[BF Cloud] Error subiendo datos a la nube', err);
    });
  }

  function syncCloudToLocal(){
    var docRef = getUserDocRef();
    if (!docRef) return Promise.resolve();

    return docRef.get().then(function(snap){
      if (!snap.exists) return;
      var data = snap.data() || {};
      var payload = data.bingo_events;
      if (!payload) return;
      try{
        var remoteObj = (typeof payload === 'string') ? JSON.parse(payload) : payload;
        if (!remoteObj || typeof remoteObj !== 'object') return;
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

  function scheduleSync(){
    if (syncTimer) clearTimeout(syncTimer);
    syncTimer = setTimeout(function(){
      syncTimer = null;
      syncLocalToCloud();
    }, 350);
  }

  // Hook a localStorage para disparar sync (sin depender de eventos storage entre tabs)
  (function(){
    try{
      var originalSetItem = window.localStorage.setItem;
      window.localStorage.setItem = function(k, v){
        originalSetItem.call(window.localStorage, k, v);
        if (syncingFromCloud) return;
        if (k === 'bingo_events' && auth.currentUser){
          scheduleSync();
        }
      };
    }catch(e){
      console.error('[BF Cloud] No se pudo enganchar localStorage', e);
    }
  })();

  function flushOnHide(){
    if (!auth.currentUser) return;
    if (syncTimer){
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    // En iOS, abrir el diálogo de imprimir pausa JS. Subimos ya.
    syncLocalToCloud();
  }
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'hidden') flushOnHide();
  });
  window.addEventListener('pagehide', flushOnHide);

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
  window.BF_SYNC_FLUSH_NOW      = flushOnHide;
})();
