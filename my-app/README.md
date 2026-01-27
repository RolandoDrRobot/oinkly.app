# Proyecto React con TypeScript

Este proyecto fue creado con React y TypeScript.

## Configuración de Supabase

Este proyecto utiliza Supabase para autenticación con Google OAuth.

### Pasos para configurar:

1. Crea un archivo `.env` en la raíz del proyecto (copia de `.env.example` si existe)
2. Obtén tus credenciales de Supabase:
   - Ve a tu proyecto en [Supabase](https://supabase.com)
   - Ve a Settings > API
   - Copia la **URL del proyecto** y la **anon/public key**

3. Agrega las siguientes variables al archivo `.env`:
   ```
   REACT_APP_SUPABASE_URL=tu_url_de_supabase
   REACT_APP_SUPABASE_ANON_KEY=tu_anon_key
   ```

4. Configura Google OAuth en Supabase:
   - Ve a Authentication > Providers en tu dashboard de Supabase
   - Habilita el proveedor de Google
   - Agrega tus credenciales de Google OAuth (Client ID y Client Secret)
   - Configura la URL de redirección: `http://localhost:3000/dashboard` (para desarrollo) y tu URL de producción

### Nota importante:
- El archivo `.env` está en `.gitignore` y no se subirá al repositorio
- Asegúrate de tener las variables de entorno configuradas antes de ejecutar la aplicación

## Scripts disponibles

En el directorio del proyecto, puedes ejecutar:

### `npm start`

Ejecuta la aplicación en modo desarrollo.
Abre [http://localhost:3000](http://localhost:3000) para verla en el navegador.

### `npm run build`

Construye la aplicación para producción en la carpeta `build`.

### `npm test`

Ejecuta las pruebas en modo interactivo.
