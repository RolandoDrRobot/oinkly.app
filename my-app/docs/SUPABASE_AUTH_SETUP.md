# Configuración de Auth con Supabase (Google OAuth)

## Si el login con Google te lleva a la raíz (ej. oinkly.app) en vez del dashboard

La app **lee los tokens del hash** al volver de Google, establece la sesión y **redirige a `/dashboard`**. Para que eso funcione:

1. En Supabase, **Redirect URLs** debe incluir la **raíz** del sitio (ahí es donde Supabase suele redirigir con `#access_token=...`).
2. La app, al detectar ese hash, hace login y cambia la URL a `/dashboard`.

## Dónde configurar en el dashboard de Supabase

1. **Authentication → URL Configuration**
   - **Site URL**: en producción `https://oinkly.app` (o tu dominio). En desarrollo `http://localhost:3000`.
   - **Redirect URLs**: incluir **raíz y dashboard** para cada entorno:
     - Desarrollo: `http://localhost:3000`, `http://localhost:3000/`, `http://localhost:3000/dashboard`
     - Producción (oinkly.app): `https://oinkly.app`, `https://oinkly.app/`, `https://oinkly.app/dashboard`

2. **Authentication → Providers → Google**
   - Google OAuth debe estar **habilitado**.
   - Client ID y Client Secret de Google Cloud Console configurados.
   - En Google Cloud Console, en "Authorized redirect URIs" debe estar la URL de callback de Supabase, algo como:
     - `https://<TU_PROYECTO>.supabase.co/auth/v1/callback`

## Variables de entorno (.env)

- `REACT_APP_SUPABASE_URL`: URL del proyecto (ej. `https://xxxx.supabase.co`).
- `REACT_APP_SUPABASE_ANON_KEY`: anon/public key del proyecto.

**Si ves "No API key found in request" o 401:** las variables no están definidas en el entorno donde se ejecuta la app. En desarrollo, crea `.env` en la raíz de `my-app` con esas dos variables y reinicia `npm start`. En producción (Vercel, Netlify, etc.), configúralas en el panel de variables de entorno del proyecto.

**Si ves "Session as retrieved from URL was issued in the future":** el reloj del dispositivo o del navegador va atrasado respecto al servidor. Supabase rechaza la sesión por seguridad. Solución: sincronizar la hora del sistema (ajustes de fecha/hora del SO o del dispositivo).

## Flujo actual en la app (login con Google y guardado de datos)

1. Usuario hace clic en "Sign in with Google".
2. Redirige a Google; Supabase Auth crea o actualiza el usuario en `auth.users` y redirige a tu app con `#access_token=...&refresh_token=...`.
3. La app parsea el hash, llama a `supabase.auth.setSession()` y obtiene `session.user`.
4. **Usuario en la app:** `mapSupabaseUser(session.user)` mapea a `{ id, email, name, avatarUrl }` (desde `user_metadata` / `identities[0].identity_data` de Google).
5. Se guarda el usuario en estado y en `storage.setUser(mappedUser)` (localStorage).
6. **Datos en Supabase:** se llama a `hydrateFromSupabase(userId)` (debts, expenses, assets, preferences, etc.). Para usuarios nuevos se llama a `ensureUserDefaultsInSupabase`: se crea fila en `subscriptions` (plan `free`) y en `user_preferences` (moneda, idioma, etc.) si no existen.
7. Esos datos se escriben en localStorage con `storage.hydrateToLocalStorage(data, userId)`.
8. Redirección a `/dashboard`.

**Creación del perfil en BD:** la migración `002_handle_new_user_profile.sql` define un trigger en `auth.users`: al hacer `INSERT` (p. ej. primer login con Google), se inserta una fila en `public.profiles` (id, email, name, avatar_url). Ejecuta esa migración en el proyecto de Supabase para que el perfil se cree automáticamente.
