# Bingo Flash (Render + Firebase)

## Si ves el error: `Firebase: Error (auth/api-key-not-valid-please-pass-a-valid-api-key)`
Eso NO es un error del código. Es un **bloqueo/restricción de la API Key** o un API key incorrecto en el proyecto de Firebase.

### 1) Autoriza el dominio en Firebase Auth
1. Firebase Console → **Authentication**
2. **Settings / Configuración** → **Authorized domains / Dominios autorizados**
3. Agrega tu dominio de Render:
   - `bingo-flash-col2-0.onrender.com`
   - (si usas otro subdominio, agrega ese también)

### 2) Revisa restricciones del API Key (Google Cloud)
1. Firebase Console → ícono de engranaje **⚙️** → **Project settings**
2. En la sección de la app web, ubica el **apiKey**.
3. Luego abre Google Cloud Console:
   - APIs & Services → **Credentials**
   - Busca esa **API key**
4. En **Application restrictions**:
   - Opción recomendada para pruebas: **None**
   - Si usas **HTTP referrers**, agrega:
     - `https://bingo-flash-col2-0.onrender.com/*`
5. Guarda cambios.

## Código (importante)
- La config que usa el proyecto es `window.BF_FIREBASE_CONFIG` en `index.html`.
- `cloud-sync.js` inicializa Firebase con esa config y usa Auth + Firestore.

## Deploy en Render
- Start command: `npm start`
- Render detecta el puerto automáticamente (el server usa `process.env.PORT`).
