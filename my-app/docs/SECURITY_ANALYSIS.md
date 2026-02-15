# Análisis de seguridad – Frontend Oinkly

Objetivo: identificar vulnerabilidades y puntos a reforzar para que el frontend sea muy seguro.

**Mejoras aplicadas** (excepto punto 2 – API key): login dev desactivado en producción, cabeceras de seguridad (Vercel + Netlify), logs sin datos de usuario en producción, nota de seguridad en Preferencias.

---

## Resumen ejecutivo

| Área | Nivel de riesgo | Notas |
|------|------------------|--------|
| Autenticación / sesión | Medio | Supabase bien usado; existe bypass de login en producción. |
| Datos sensibles en cliente | Medio–Alto | API key de OpenAI y datos financieros en localStorage. |
| Exposición de secretos | Bajo | Solo anon key y URLs; .env en .gitignore. |
| XSS / inyección | Bajo | Sin `dangerouslySetInnerHTML`; React escapa por defecto. |
| Terceros (scripts) | Medio | gtag y fuentes sin SRI/CSP. |
| Backend (Supabase) | Bajo | RLS activo y políticas por usuario. |

---

## 1. Autenticación y sesión

### 1.1 Supabase Auth (positivo)
- Uso de **Supabase Auth** con OAuth (Google); no hay contraseñas en el frontend.
- **Redirect post-OAuth** fijado a `window.location.origin + '/dashboard'` (no se usa entrada del usuario), por tanto no hay open redirect desde el cliente.
- **Hash de tokens** se limpia con `history.replaceState` tras procesar sesión; el token no queda expuesto en la barra de direcciones más de lo necesario.
- **`detectSessionInUrl: false`**: la sesión se establece explícitamente en código; control claro del flujo.

### 1.2 Bypass de login en producción (vulnerabilidad)
- En **AuthContext** existe `login(email, name)` que crea un usuario local con `id: Date.now().toString()` y lo guarda en `storage` **sin validar credenciales**.
- En **Landing**, cuando el usuario ya está autenticado y está en el último paso, el botón “Volver al Dashboard” usa `handleGetStarted`, que llama a `login('rolando@gmail.com', 'Rolo')`.
- **Riesgo**: en producción, si por error o flujo raro un usuario “autenticado” llega a ese botón, su sesión real podría verse reemplazada por un usuario local falso (rolando@gmail.com). Además, cualquier código que invoque `login()` puede crear una “sesión” sin backend.
- **Recomendación**: eliminar o desactivar el `login()` de desarrollo en producción (por ejemplo, no exponerlo cuando `NODE_ENV === 'production'` o cuando Supabase esté configurado) y que “Volver al Dashboard” solo haga `navigate('/dashboard')` sin llamar a `login`.

### 1.3 Persistencia de sesión
- Supabase guarda el **refresh/access token** en el cliente (por defecto localStorage vía el cliente de Supabase).
- Si el dispositivo se compromete o hay malware, esos tokens y todo lo que está en localStorage son legibles.
- **Recomendación**: documentar que el uso en dispositivos compartidos o no confiables implica riesgo; valorar en el futuro opciones de sesión más estrictas (ej. ventanas de tiempo cortas, revocación).

---

## 2. Datos sensibles en el cliente

### 2.1 localStorage
Se guarda en el navegador (sin cifrado adicional):

- **Usuario**: `user` (id, email, name, avatarUrl), `isLoggedIn`.
- **Datos financieros**: deudas, gastos fijos, activos, ingresos, compromisos, llamadas, notificaciones, órdenes de listas.
- **Preferencias**: moneda, idioma, tema, `hideAmounts`, `hasSeenInitialSetup`.
- **OpenAI API Key**: bajo la clave `openaiApiKey` (si el usuario la introduce en Preferencias).
- **Suscripción**: por usuario (`subscription_<userId>`).

**Riesgos**:
- Cualquier script en la misma origen (XSS) o acceso físico al dispositivo puede leer todo esto.
- La **API key de OpenAI** es un secreto; en localStorage queda expuesta a XSS y a cualquier extensión/otro script con acceso a la página.
- Los datos financieros son sensibles (RGPD / privacidad).

**Recomendaciones**:
- **OpenAI**: idealmente no enviar la API key desde el frontend. Usar un backend que reciba texto del usuario, llame a OpenAI y devuelva solo el resultado. Si se mantiene en el cliente, al menos no almacenarla en texto plano en localStorage (y asumir que el riesgo sigue siendo alto).
- **Datos financieros**: el modelo actual (SPA + Supabase + localStorage como caché) es aceptable si se asume que el dispositivo es de confianza; documentar y reforzar recomendaciones al usuario (dispositivo bloqueado, no compartido).
- Considerar **sessionStorage** para datos muy sensibles si no se necesitan entre pestañas (reduce superficie en algunas situaciones).

### 2.2 Envío de la API key de OpenAI
- En **aiVoiceApi.ts** la key se envía en el header `Authorization: Bearer ${apiKey}` a `api.openai.com` (o a `REACT_APP_AI_VOICE_API_URL` si se configura).
- Si la key viene de **env** (`REACT_APP_OPENAI_API_KEY`), queda embebida en el bundle de producción: **cualquiera puede verla** abriendo las herramientas de red o el código fuente.
- **Recomendación**: no poner nunca la API key de OpenAI en variables `REACT_APP_*` para producción; usar solo backend proxy o key introducida por el usuario sabiendo que es un riesgo menor pero controlado.

---

## 3. Exposición de secretos y variables de entorno

### 3.1 Qué se expone en el bundle
- **REACT_APP_SUPABASE_URL** y **REACT_APP_SUPABASE_ANON_KEY**: se incluyen en el bundle. Es el diseño esperado de Supabase: la anon key es pública y la seguridad se basa en **RLS** y en no exponer la `service_role` key.
- **REACT_APP_GA_MEASUREMENT_ID**: identificador público de Analytics.
- **REACT_APP_OPENAI_API_KEY** / **REACT_APP_AI_VOICE_API_KEY**: si se usan en producción, la key queda en el bundle (crítico).
- **REACT_APP_AI_VOICE_API_URL**, **REACT_APP_OPENAI_MODEL**: no son secretos; solo configuración.

### 3.2 .gitignore
- `.env`, `.env.local`, `.env.*.local` están en `.gitignore`: bien para no subir secretos al repo.

---

## 4. XSS e inyección

### 4.1 Contenido generado por el usuario
- No se usa `dangerouslySetInnerHTML`, `innerHTML`, `eval` ni `document.write` en el código revisado.
- React escapa por defecto el contenido en JSX; los nombres de deudas, notas, etc. se muestran como texto.
- **Conclusión**: riesgo XSS clásico bajo si no se introduce luego contenido HTML/script sin sanitizar.

### 4.2 URLs y navegación
- **Redirect OAuth**: solo `window.location.origin + '/dashboard'` (origen controlado).
- **Contact**: `mailto` y enlaces sociales usan `CONTACT_EMAIL` fijo o `item.url` de un array estático (`https://x.com/oinklyapp`); no hay inyección desde input del usuario en la URL.
- **searchParams** en Subscribe: solo se usa `plan` para analytics/preferencia; no se usa para redirección ni para inyectar en DOM.

### 4.3 Respuesta de la IA (aiVoiceApi)
- Se hace **JSON.parse** del contenido devuelto por OpenAI. Si la API devolviera algo malicioso, podría provocar excepciones o lógica inesperada; no se inyecta en HTML. `isValidAIIntent` limita los tipos de acción; aun así, los `params` se usan en la app (navegación, edición). Recomendación: validar y sanitizar siempre los `params` antes de usarlos (IDs, rutas, etc.).

---

## 5. Terceros y contenido externo

### 5.1 Google Tag (gtag.js)
- Script en **index.html**: `https://www.googletagmanager.com/gtag/js?id=G-8RTP2EJ69Z`.
- **Riesgos**: el script de un tercero puede cambiar; si se compromete, podría ejecutar código en tu dominio. SRI no está disponible de forma estable para gtag.
- **Aplicado**: cabeceras de seguridad en servidor (X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) en `vercel.json` y `public/_headers` (Netlify).

### 5.2 Fuentes (Google Fonts)
- `fonts.googleapis.com` y `fonts.gstatic.com`. Riesgo menor (fuentes, no script ejecutable en tu contexto), pero CSP puede incluir estos orígenes de forma explícita.

### 5.3 Cabeceras de seguridad (aplicado)
- **Vercel**: `vercel.json` con `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), microphone=(self)`.
- **Netlify**: `public/_headers` con las mismas cabeceras para el deploy.
- CSP estricta no añadida para no romper el bundle de CRA/React por defecto; se puede endurecer más adelante.

---

## 6. Backend (Supabase) – desde la óptica del frontend

### 6.1 RLS
- En **001_initial_schema.sql** todas las tablas relevantes tienen **RLS** activado y políticas “own” por `auth.uid()` (o por relación con `debts` del usuario).
- El frontend usa el cliente de Supabase con la anon key; la autorización real la hace Supabase con el JWT del usuario. No se confía en que el cliente envíe “user_id” para decidir acceso.

### 6.2 Uso consistente de user_id
- En **supabaseData.ts** las operaciones usan `userId` obtenido del usuario autenticado (storage/context), no de parámetros de URL o inputs. Con RLS, incluso si hubiera un error y se enviara otro id, el backend rechazaría las filas ajenas.

---

## 7. Otros puntos

### 7.1 Console / información de depuración (mejorado)
- **supabase.ts** (`mapSupabaseUser`): eliminados logs con id/email/metadata; solo `console.info` en desarrollo y sin PII.
- **AuthContext**: eliminados `console.info` de loginWithGoogle y logout en producción; los de logout solo en `NODE_ENV === 'development'`.

### 7.2 Dependencias
- No se ha hecho auditoría de `npm audit` / dependencias conocidas. Recomendación: ejecutar `npm audit` y corregir vulnerabilidades críticas/altas; revisar dependencias transitivas.

### 7.3 HTTPS
- La SPA debe servirse solo por **HTTPS** en producción (configuración de hosting). Supabase y OAuth lo esperan.

---

## 8. Checklist de prioridades (para ser “súper seguro”)

| Prioridad | Acción |
|-----------|--------|
| Alta | Quitar o desactivar en producción el login de desarrollo y que “Volver al Dashboard” no llame a `login('rolando@gmail.com', 'Rolo')`. |
| Alta | No usar `REACT_APP_OPENAI_API_KEY` en producción; mover llamadas a OpenAI a un backend. |
| Alta | Configurar CSP y cabeceras de seguridad (X-Frame-Options, X-Content-Type-Options) en el servidor que sirve la SPA. |
| Media | Evitar guardar la API key de OpenAI en localStorage; si se mantiene en cliente, documentar el riesgo y valorar alternativas. |
| Media | Revisar y eliminar `console.info`/`console.warn` que expongan datos de usuario o sesión en producción. |
| Media | Valorar SRI para gtag y scripts de terceros; endurecer CSP. |
| Baja | Ejecutar `npm audit` y actualizar dependencias con vulnerabilidades. |
| Baja | Documentar para el usuario: uso en dispositivo de confianza, no compartir dispositivo, bloqueo de pantalla. |

---

## Conclusión

- **Puntos fuertes**: Supabase Auth y RLS bien usados, sin open redirect en cliente, sin XSS por `dangerouslySetInnerHTML`, .env fuera del repo.
- **Principales riesgos**: bypass de autenticación con `login()` en producción, exposición de API key de OpenAI (env o localStorage), datos sensibles y tokens en localStorage sin capa extra de protección, y falta de CSP/cabeceras de seguridad en el servidor.

Con las acciones de prioridad alta y media anteriores, el frontend queda en una postura mucho más segura y alineada con el objetivo de que sea “súper seguro”.
