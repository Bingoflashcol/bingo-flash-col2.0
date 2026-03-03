
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

  function syncLocalToCloud(){
    var docRef = getUserDocRef();
    if (!docRef) return;
    var dbObj = loadLocalDB();
    try{
      var payload = JSON.stringify(dbObj || {});
      docRef.set({
        bingo_events: payload,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function(err){
        console.error('[BF Cloud] Error subiendo datos a la nube', err);
      });
    }catch(e){
      console.error('[BF Cloud] No se pudo serializar bingo_events', e);
    }
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
        var obj = typeof payload === 'string' ? JSON.parse(payload) : payload;
        if (!obj || typeof obj !== 'object') return;
        saveLocalDB(obj);
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
