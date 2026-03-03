
// UI de autenticación para Bingo Flash Tradicional
(function(){
  function createOverlay(){
    if (document.getElementById('bf-auth-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'bf-auth-overlay';
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:9998',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'background:radial-gradient(circle at top,#020617 0,#020617 40%,rgba(15,23,42,0.96) 100%)',
      'backdrop-filter:blur(10px)'
    ].join(';');

    overlay.innerHTML = `
      <div style="
        width: min(420px, 92vw);
        background: rgba(15,23,42,0.96);
        border-radius: 28px;
        padding: 28px 26px 24px;
        box-shadow: 0 24px 80px rgba(15,23,42,0.95);
        border: 1px solid rgba(148,163,184,0.4);
        color:#e5e7eb;
        font-family: system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;
      ">
        <div style="text-align:center;margin-bottom:18px;">
          <div style="font-size:13px;letter-spacing:.28em;text-transform:uppercase;color:#38bdf8;margin-bottom:4px;">Bingo Flash</div>
          <div style="font-size:22px;font-weight:800;color:#f9fafb;">Tu cuenta de organizador</div>
          <div style="font-size:13px;color:#9ca3af;margin-top:6px;">
            Inicia sesión o crea tu cuenta para sincronizar tus eventos en todos tus dispositivos.
          </div>
        </div>

        <div style="display:flex;gap:6px;margin-bottom:16px;background:#020617;padding:3px;border-radius:999px;">
          <button id="bf-tab-login" type="button" style="
            flex:1;border:none;border-radius:999px;padding:6px 0;font-size:13px;
            background:#0f172a;color:#e5e7eb;font-weight:600;cursor:pointer;
          ">Iniciar sesión</button>
          <button id="bf-tab-register" type="button" style="
            flex:1;border:none;border-radius:999px;padding:6px 0;font-size:13px;
            background:transparent;color:#9ca3af;font-weight:500;cursor:pointer;
          ">Crear cuenta</button>
        </div>

        <form id="bf-auth-form" style="display:flex;flex-direction:column;gap:10px;">
          <label style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#9ca3af;">
            Correo electrónico
            <input id="bf-email" type="email" required autocomplete="email" placeholder="tucorreo@ejemplo.com" style="
              margin-top:4px;width:100%;padding:8px 10px;border-radius:12px;border:1px solid rgba(148,163,184,.6);
              background:#020617;color:#e5e7eb;font-size:13px;outline:none;
            ">
          </label>

          <label style="font-size:12px;text-transform:uppercase;letter-spacing:.12em;color:#9ca3af;">
            Contraseña
            <div style="position:relative;margin-top:4px;">
              <input id="bf-password" type="password" required autocomplete="current-password" minlength="6" placeholder="Mínimo 6 caracteres" style="
                width:100%;padding:8px 34px 8px 10px;border-radius:12px;border:1px solid rgba(148,163,184,.6);
                background:#020617;color:#e5e7eb;font-size:13px;outline:none;
              ">
              <button id="bf-toggle-pass" type="button" style="
                position:absolute;right:8px;top:50%;transform:translateY(-50%);
                border:none;background:transparent;color:#9ca3af;font-size:11px;cursor:pointer;
              ">Ver</button>
            </div>
          </label>

          <button id="bf-forgot-pass" type="button" style="
          margin-top:6px;
          background:none;
          border:none;
          padding:0;
          font-size:11px;
          color:#38bdf8;
          cursor:pointer;
          text-align:left;
        ">¿Olvidaste tu contraseña?</button>

          <div id="bf-auth-error" style="min-height:16px;font-size:11px;color:#f97373;margin-top:2px;"></div>

          <button id="bf-auth-submit" type="submit" style="
            margin-top:4px;width:100%;padding:9px 0;border:none;border-radius:999px;
            background:linear-gradient(90deg,#22c55e,#4ade80);color:#022c22;
            font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 12px 30px rgba(16,185,129,.45);
          ">Continuar</button>
        </form>

        <div style="margin-top:10px;font-size:11px;color:#6b7280;text-align:center;">
          Podrás cerrar sesión desde la esquina superior derecha dentro del juego.
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    wireAuthUI();
  }

  function wireAuthUI(){
    var overlay  = document.getElementById('bf-auth-overlay');
    if (!overlay) return;
    var tabLogin = document.getElementById('bf-tab-login');
    var tabReg   = document.getElementById('bf-tab-register');
    var form     = document.getElementById('bf-auth-form');
    var emailInp = document.getElementById('bf-email');
    var passInp  = document.getElementById('bf-password');
    var toggle   = document.getElementById('bf-toggle-pass');
    var errBox   = document.getElementById('bf-auth-error');
    var submit   = document.getElementById('bf-auth-submit');
    var forgotBtn = document.getElementById('bf-forgot-pass');

    if (!window.BF_AUTH){
      errBox.textContent = 'No se pudo inicializar Firebase.';
      return;
    }
    var auth = window.BF_AUTH;

    var mode = 'login';
    function setMode(newMode){
      mode = newMode;
      if (mode === 'login'){
        tabLogin.style.background = '#0f172a';
        tabLogin.style.color      = '#e5e7eb';
        tabLogin.style.fontWeight = '600';
        tabReg.style.background   = 'transparent';
        tabReg.style.color        = '#9ca3af';
        tabReg.style.fontWeight   = '500';
        submit.textContent        = 'Iniciar sesión';
      }else{
        tabLogin.style.background = 'transparent';
        tabLogin.style.color      = '#9ca3af';
        tabLogin.style.fontWeight = '500';
        tabReg.style.background   = '#0f172a';
        tabReg.style.color        = '#e5e7eb';
        tabReg.style.fontWeight   = '600';
        submit.textContent        = 'Crear cuenta';
      }
      errBox.textContent = '';
      if (forgotBtn){ forgotBtn.style.display = (mode === 'login') ? 'inline' : 'none'; }
    }

    tabLogin.addEventListener('click', function(){ setMode('login'); });
    tabReg.addEventListener('click', function(){ setMode('register'); });

    toggle.addEventListener('click', function(){
      if (passInp.type === 'password'){
        passInp.type = 'text';
        toggle.textContent = 'Ocultar';
      }else{
        passInp.type = 'password';
        toggle.textContent = 'Ver';
      }
    });
    if (forgotBtn){
      forgotBtn.addEventListener('click', function(){
        errBox.textContent = '';
        errBox.style.color = '#f97373';
        var email = (emailInp.value || '').trim();
        if (!email){
          errBox.textContent = 'Escribe primero tu correo para enviarte el enlace de recuperación.';
          emailInp.focus();
          return;
        }
        forgotBtn.disabled = true;
        var oldText = forgotBtn.textContent;
        forgotBtn.textContent = 'Enviando enlace...';
        auth.sendPasswordResetEmail(email)
          .then(function(){
            errBox.style.color = '#22c55e';
            errBox.textContent = 'Te enviamos un correo para restablecer tu contraseña.';
          })
          .catch(function(err){
            console.error('[BF Auth UI] Error al enviar reset password', err);
            errBox.style.color = '#f97373';
            errBox.textContent = (err && err.message)
              ? err.message
              : 'No se pudo enviar el correo de recuperación.';
          })
          .finally(function(){
            forgotBtn.disabled = false;
            forgotBtn.textContent = oldText;
          });
      });
    }


    form.addEventListener('submit', function(e){
      e.preventDefault();
      errBox.textContent = '';
      var email = emailInp.value.trim();
      var pwd   = passInp.value;
      if (!email || !pwd){
        errBox.textContent = 'Completa tu correo y contraseña.';
        return;
      }
      var op = (mode === 'login')
        ? auth.signInWithEmailAndPassword(email, pwd)
        : auth.createUserWithEmailAndPassword(email, pwd);

      op.then(function(){
        // éxito: el listener de onAuthStateChanged se encargará de ocultar el overlay
      }).catch(function(err){
        console.error('[BF Auth UI] Error de autenticación', err);
        var msg = (err && err.message) ? err.message : 'No se pudo completar la operación.';
        errBox.textContent = msg;
      });
    });

    // Actualizar UI cuando cambie el usuario
    window.BF_AUTH.onAuthStateChanged(function(user){
      if (user){
        overlay.style.display = 'none';
        // Mostrar mini chip de usuario / botón de salir
        ensureUserChip(user);
        if (window.BF_SYNC_NOW_FROM_CLOUD){
          window.BF_SYNC_NOW_FROM_CLOUD();
        }
      }else{
        overlay.style.display = 'flex';
        if (window.__bfUserChip){
          window.__bfUserChip.remove();
          window.__bfUserChip = null;
        }
      }
    });
  }

  function ensureUserChip(user){
    // Si ya existe, solo actualizamos el correo y salimos
    if (window.__bfUserChip){
      var emailSpan = document.getElementById('bf-pop-email');
      if (emailSpan){
        emailSpan.textContent = user.email || ('Usuario ' + user.uid.substring(0,6));
      }
      return window.__bfUserChip;
    }

    // Contenedor del botón redondo
    var chip = document.createElement('div');
    chip.id = 'bf-user-chip';
    chip.style.cssText = [
      'position:fixed',
      'bottom:14px',
      'right:14px',
      'z-index:9997',
      'display:flex',
      'align-items:center',
      'justify-content:center'
    ].join(';');

    // Botón redondo (solo inicial del correo)
    var btn = document.createElement('button');
    btn.id = 'bf-user-avatar';
    btn.type = 'button';
    btn.style.cssText = [
      'width:32px',
      'height:32px',
      'border-radius:999px',
      'border:none',
      'cursor:pointer',
      'background:radial-gradient(circle at 30% 20%,#4ade80,#22c55e,#0f766e)',
      'color:#022c22',
      'font-weight:700',
      'font-size:14px',
      'box-shadow:0 8px 24px rgba(16,185,129,.6)'
    ].join(';');
    var initial = (user.email || 'U').trim().charAt(0).toUpperCase();
    btn.textContent = initial || 'U';

    // Popover oculto con correo + botón salir
    var pop = document.createElement('div');
    pop.id = 'bf-user-popover';
    pop.style.cssText = [
      'position:absolute',
      'bottom:42px',
      'right:0',
      'min-width:220px',
      'background:rgba(15,23,42,.98)',
      'border-radius:16px',
      'padding:10px 12px',
      'border:1px solid rgba(148,163,184,.5)',
      'color:#e5e7eb',
      'font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
      'font-size:11px',
      'box-shadow:0 18px 40px rgba(15,23,42,.85)',
      'display:none'
    ].join(';');
    pop.innerHTML = `
      <div style="font-weight:600;margin-bottom:4px;">Cuenta</div>
      <div id="bf-pop-email" style="font-size:11px;opacity:.9;margin-bottom:8px;word-break:break-all;"></div>
      <button id="bf-pop-logout" type="button" style="
        width:100%;
        border:none;
        border-radius:999px;
        padding:4px 0;
        background:#ef4444;
        color:#f9fafb;
        font-size:11px;
        font-weight:600;
        cursor:pointer;
      ">Cerrar sesión</button>
    `;

    chip.appendChild(btn);

    // Botón de vendedores independiente, al lado del avatar
    var vendBtn = document.createElement('button');
    vendBtn.id = 'bf-vendors-button';
    vendBtn.type = 'button';
    vendBtn.textContent = 'Vendedores';
    vendBtn.title = 'Vendedores';
    vendBtn.style.cssText = [
      'margin-left:8px',
      'border:none',
      'border-radius:999px',
      'padding:8px 10px',
      'background:#0ea5e9',
      'color:#0f172a',
      'font-size:11px',
      'font-weight:600',
      'cursor:pointer',
      'box-shadow:0 8px 24px rgba(14,165,233,.6)',
      'display:inline-flex',
      'align-items:center',
      'justify-content:center'
    ].join(';');
    vendBtn.addEventListener('click', function(ev){
      ev.stopPropagation();
      if (window.__BF_OPEN_VENDORS){
        try{ window.__BF_OPEN_VENDORS(); }catch(_){}
      }
    });
    chip.appendChild(vendBtn);

    chip.appendChild(pop);
    document.body.appendChild(chip);
    window.__bfUserChip = chip;

    // Rellenar correo
    var emailSpan = pop.querySelector('#bf-pop-email');
    if (emailSpan){
      emailSpan.textContent = user.email || ('Usuario ' + user.uid.substring(0,6));
    }

    // Botón salir
    var logoutBtn = pop.querySelector('#bf-pop-logout');
    if (logoutBtn){
      logoutBtn.addEventListener('click', function(){
        if (window.BF_AUTH){
          window.BF_AUTH.signOut();
        }
      });
    }

    // Botón vendedores
    var vendorsBtn = pop.querySelector('#bf-pop-vendors');
    if (vendorsBtn){
      vendorsBtn.addEventListener('click', function(){
        try{
          if (window.__BF_OPEN_VENDORS){
            window.__BF_OPEN_VENDORS();
          }
          // cerrar el popover
          pop.style.display = 'none';
        }catch(_){}
      });
    }

    // Abrir / cerrar popover
    btn.addEventListener('click', function(ev){
      ev.stopPropagation();
      pop.style.display = (pop.style.display === 'none' || !pop.style.display)
        ? 'block'
        : 'none';
    });

    // Cerrar al hacer clic fuera
    document.addEventListener('click', function(){
      pop.style.display = 'none';
    });

    return chip;
  }

  document.addEventListener('DOMContentLoaded', createOverlay);
})();
