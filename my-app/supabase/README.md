# Supabase – Migración

## Antes de usar la app con Supabase

1. Crea un proyecto en [Supabase](https://supabase.com) (si aún no existe).
2. En el dashboard: **SQL Editor** → **New query**.
3. Copia y ejecuta todo el contenido de **`migrations/001_initial_schema.sql`**.
4. Asegúrate de tener en `.env`:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`

Tras eso, al iniciar sesión la app cargará los datos desde Supabase y seguirá guardando en Supabase (y en localStorage como copia local).
