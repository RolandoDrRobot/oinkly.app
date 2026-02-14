# Plan de migración a Supabase – Mapeo completo de datos

Este documento mapea **todos** los modelos y datos de la app a tablas de Supabase y define un plan de migración para conectar la app por completo a Supabase sin omitir datos.

---

## 1. Mapeo de datos actuales (localStorage + Auth)

| Origen | Clave / Origen | Descripción | Destino Supabase |
|--------|----------------|-------------|------------------|
| **Auth** | Supabase Auth + `user` en localStorage | Usuario (id, email, name, avatarUrl) | `auth.users` (existente) + tabla `profiles` (opcional espejo) |
| **Auth** | `isLoggedIn` | Flag de sesión | Derivado de `supabase.auth.getSession()` |
| **storage** | `subscription_{userId}` | Plan, status, endsAt, interval | Tabla `subscriptions` |
| **storage** | `debts` | Lista de deudas (con commitments y callHistory anidados) | Tablas `debts`, `payment_commitments`, `call_records` |
| **storage** | `debtsOrder` | Orden de tarjetas de deudas (array de ids) | Tabla `list_orders` (o `user_preferences`) |
| **storage** | `fixedExpenses` | Gastos fijos | Tabla `fixed_expenses` |
| **storage** | `fixedExpensesOrder` | Orden de gastos fijos | Tabla `list_orders` |
| **storage** | `assets` | Activos | Tabla `assets` |
| **storage** | `assetsOrder` | Orden de activos | Tabla `list_orders` |
| **storage** | `incomes` | Ingresos | Tabla `incomes` |
| **storage** | `incomesOrder` | Orden de ingresos | Tabla `list_orders` |
| **storage** | `notifications` | Notificaciones (id, message, type, createdAt, read, meta) | Tabla `notifications` |
| **storage** | `localCurrency` | Moneda local (ej. USD, CRC) | Tabla `user_preferences` |
| **storage** | `language` | Idioma (en, es) | Tabla `user_preferences` |
| **storage** | `themeMode` | light / dark | Tabla `user_preferences` |
| **storage** | `colorScheme` | Esquema de color | Tabla `user_preferences` |
| **storage** | `openaiApiKey` | API key OpenAI (sensible) | Opcional en `user_preferences` cifrada o solo cliente |
| **Dashboard** | `hideAmounts` | Ocultar montos en UI | Tabla `user_preferences` |
| **Preferences** | `hasSeenInitialSetup` | Onboarding visto | Tabla `user_preferences` |

**Nota:** Hoy la app guarda todo en localStorage sin `user_id`. Al migrar, **todos** los datos deben asociarse a `user_id` (Supabase Auth). Usuarios no logueados no tendrán datos en Supabase.

---

## 2. Modelos de datos (TypeScript → SQL)

### 2.1 User (ya existe en Auth)

- **auth.users**: id (uuid), email, raw_user_meta_data (name, avatar_url/picture), etc.
- **profiles** (opcional): espejo para nombre, avatar, preferencias por usuario.

### 2.2 Debt + PaymentCommitment + CallRecord

- **Debt**: id, name, type, local_currency, local_fee, dollar_fee, total_local, total_dollars, fee_to_update, fee_to_update_dollars, in_order, current_plan, bank_name, bank_phone, has_call_task, call_completed, payment_date, cut_date, interest_rate, closed_at, created_at, updated_at, **user_id**.
- **PaymentCommitment**: id, **debt_id**, date, amount_local, amount_dollars, status, payment_type, notes, created_at, updated_at, completed_at.
- **CallRecord**: id, **debt_id**, date, notes, commitments_created (jsonb o array), created_at.

### 2.3 FixedExpense

- id, **user_id**, name, amount_local, amount_dollars, local_currency, category, due_date, payment_date, paid_for_month, notes, created_at, updated_at.

### 2.4 Asset

- id, **user_id**, name, type, value_local, value_dollars, local_currency, purchase_date, notes, created_at, updated_at.

### 2.5 Income

- id, **user_id**, name, amount_local, amount_dollars, local_currency, type, frequency, next_payment_date, notes, created_at, updated_at.

### 2.6 Notification

- id, **user_id**, message, type, created_at, read, meta (jsonb).

### 2.7 Subscription

- **user_id** (PK), plan, status, ends_at, interval, created_at, updated_at.

### 2.8 User preferences y órdenes

- **user_preferences**: user_id (PK), local_currency, language, theme_mode, color_scheme, hide_amounts, has_seen_initial_setup, (openai_api_key opcional), updated_at.
- **list_orders**: user_id, list_type ('debts'|'fixed_expenses'|'assets'|'incomes'), order (jsonb array de ids), updated_at. PK (user_id, list_type).

---

## 3. Esquema SQL para Supabase

Crear en el orden indicado (por dependencias y RLS).

```sql
-- ============================================================
-- 1. EXTENSION (si se usa UUID gen random)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 2. PROFILES (opcional: espejo de auth.users para app)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 3. SUBSCRIPTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
  status TEXT CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  ends_at TIMESTAMPTZ,
  interval TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. DEBTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.debts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('prestamo', 'tarjeta')),
  local_currency TEXT NOT NULL DEFAULT 'USD',
  local_fee NUMERIC NOT NULL DEFAULT 0,
  dollar_fee NUMERIC NOT NULL DEFAULT 0,
  total_local NUMERIC NOT NULL DEFAULT 0,
  total_dollars NUMERIC NOT NULL DEFAULT 0,
  fee_to_update NUMERIC NOT NULL DEFAULT 0,
  fee_to_update_dollars NUMERIC NOT NULL DEFAULT 0,
  in_order BOOLEAN NOT NULL DEFAULT true,
  current_plan TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_phone TEXT,
  has_call_task BOOLEAN NOT NULL DEFAULT false,
  call_completed BOOLEAN NOT NULL DEFAULT false,
  payment_date DATE,
  cut_date DATE,
  interest_rate NUMERIC,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_debts_user_id ON public.debts(user_id);

-- ============================================================
-- 5. PAYMENT_COMMITMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_commitments (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  amount_local NUMERIC NOT NULL DEFAULT 0,
  amount_dollars NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'overdue')),
  payment_type TEXT CHECK (payment_type IN ('partial', 'full', 'settlement')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_commitments_debt_id ON public.payment_commitments(debt_id);

-- ============================================================
-- 6. CALL_RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.call_records (
  id TEXT PRIMARY KEY,
  debt_id TEXT NOT NULL REFERENCES public.debts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  commitments_created JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_call_records_debt_id ON public.call_records(debt_id);

-- ============================================================
-- 7. FIXED_EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fixed_expenses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_local NUMERIC NOT NULL DEFAULT 0,
  amount_dollars NUMERIC NOT NULL DEFAULT 0,
  local_currency TEXT NOT NULL DEFAULT 'USD',
  category TEXT,
  due_date TEXT,
  payment_date DATE,
  paid_for_month TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fixed_expenses_user_id ON public.fixed_expenses(user_id);

-- ============================================================
-- 8. ASSETS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.assets (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('property', 'vehicle', 'investment', 'savings', 'other')),
  value_local NUMERIC NOT NULL DEFAULT 0,
  value_dollars NUMERIC NOT NULL DEFAULT 0,
  local_currency TEXT NOT NULL DEFAULT 'USD',
  purchase_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);

-- ============================================================
-- 9. INCOMES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incomes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_local NUMERIC NOT NULL DEFAULT 0,
  amount_dollars NUMERIC NOT NULL DEFAULT 0,
  local_currency TEXT NOT NULL DEFAULT 'USD',
  type TEXT NOT NULL CHECK (type IN ('salary', 'freelance', 'investment', 'rental', 'other')),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'weekly', 'biweekly', 'yearly', 'one-time')),
  next_payment_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incomes_user_id ON public.incomes(user_id);

-- ============================================================
-- 10. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'success' CHECK (type IN ('success', 'info', 'warning', 'error')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  meta JSONB
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- ============================================================
-- 11. USER_PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  local_currency TEXT NOT NULL DEFAULT 'USD',
  language TEXT NOT NULL DEFAULT 'en',
  theme_mode TEXT CHECK (theme_mode IN ('light', 'dark')),
  color_scheme TEXT,
  hide_amounts BOOLEAN NOT NULL DEFAULT false,
  has_seen_initial_setup BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 12. LIST_ORDERS (orden de listas por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.list_orders (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL CHECK (list_type IN ('debts', 'fixed_expenses', 'assets', 'incomes')),
  order_ids JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, list_type)
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_orders ENABLE ROW LEVEL SECURITY;

-- Policies: usuario solo accede a sus filas (auth.uid() = user_id o debt_id → user_id)
CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "subscriptions_own" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "debts_own" ON public.debts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "payment_commitments_own" ON public.payment_commitments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.debts d WHERE d.id = debt_id AND d.user_id = auth.uid())
);
CREATE POLICY "call_records_own" ON public.call_records FOR ALL USING (
  EXISTS (SELECT 1 FROM public.debts d WHERE d.id = debt_id AND d.user_id = auth.uid())
);
CREATE POLICY "fixed_expenses_own" ON public.fixed_expenses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "assets_own" ON public.assets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "incomes_own" ON public.incomes FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_preferences_own" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "list_orders_own" ON public.list_orders FOR ALL USING (auth.uid() = user_id);
```

---

## 4. Plan de migración por fases

### Fase 0 – Preparación (sin tocar app en producción)

1. Crear proyecto Supabase (si no existe) y configurar Auth (Google OAuth ya usado).
2. Ejecutar el SQL anterior en el SQL Editor de Supabase (crear tablas + RLS).
3. Opcional: trigger en `auth.users` para insertar/actualizar `profiles` al registrarse.

### Fase 1 – Capa de datos (servicio Supabase)

1. **Crear módulo de API Supabase** (`src/lib/supabaseData.ts` o `src/api/supabase/`):
   - Funciones por entidad: `getDebts(userId)`, `saveDebt(userId, debt)`, `deleteDebt(userId, id)`, etc.
   - Para debts: leer debt + commitments + call_records y armar el objeto `Debt` como espera la app.
   - Para list_orders: leer/guardar `list_orders` por `list_type`.
   - Para user_preferences: leer/guardar todas las preferencias (moneda, idioma, theme, hide_amounts, has_seen_initial_setup).
2. **Mantener tipos** en `src/types/index.ts`; los DTOs de Supabase mapear a esos tipos (fechas ISO, números, etc.).

### Fase 2 – Migración de storage a Supabase (una entidad a la vez)

Orden sugerido para no romper la app:

1. **User + Auth**  
   Ya usas Supabase Auth. Asegurar que tras login siempre haya `user_id` disponible (session.user.id). No migrar “user” de localStorage a tabla si ya usas solo Auth; opcionalmente rellenar `profiles` desde Auth.

2. **user_preferences + list_orders**  
   - Al cargar la app (con user logueado): leer de Supabase `user_preferences` y `list_orders`; si no hay fila, crear por defecto (y opcionalmente rellenar desde localStorage una sola vez como “migración inicial”).
   - Sustituir en `storage` (o en un adapter): `getLocalCurrency` / `setLocalCurrency` → Supabase; igual para language, themeMode, colorScheme, hideAmounts, hasSeenInitialSetup y los cuatro `*Order` (debts, fixedExpenses, assets, incomes).

3. **subscriptions**  
   - Reemplazar `storage.getSubscription(userId)` / `storage.setSubscription(userId, data)` por lecturas/escrituras a la tabla `subscriptions`.
   - Mantener misma interfaz para `SubscriptionContext`.

4. **notifications**  
   - Reemplazar `saveNotification`, `getNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`, `clearAllNotifications`, `getUnreadNotificationsCount` por llamadas a la tabla `notifications` (siempre con `user_id`).

5. **debts + payment_commitments + call_records**  
   - Al guardar una deuda: insert/update en `debts`; para cada commitment en `debt.commitments` insert/update en `payment_commitments`; para cada call en `debt.callHistory` insert/update en `call_records`.
   - Al leer: una query a `debts` + queries (o join) a `payment_commitments` y `call_records`; armar el objeto `Debt` con `commitments` y `callHistory`.
   - Reemplazar `getDebts`, `getDebt`, `saveDebt`, `deleteDebt` en el adapter para que usen Supabase.
   - Actualizar `setDebtsOrder`/`getDebtsOrder` con `list_orders` (list_type = 'debts').

6. **fixed_expenses**  
   - Reemplazar get/save/delete/update por Supabase; orden con `list_orders` (list_type = 'fixed_expenses').

7. **assets**  
   - Igual que fixed_expenses; orden con `list_orders` (list_type = 'assets').

8. **incomes**  
   - Igual; orden con `list_orders` (list_type = 'incomes').

### Fase 3 – Adapter único de “storage”

1. Crear `storageAdapter` que implemente la misma interfaz que el `storage` actual:
   - Si hay sesión (user_id): usar solo Supabase (lecturas/escrituras ya implementadas en Fase 1–2).
   - Opcionalmente, modo “offline”: cache en memoria y sincronizar cuando haya conexión (se puede dejar para una fase posterior).
2. Sustituir en toda la app las importaciones de `storage` por el adapter (o hacer que `storage` sea el adapter que por dentro llama a Supabase cuando hay user).
3. Eliminar (o no usar) todas las escrituras/lecturas directas a localStorage para: debts, fixedExpenses, assets, incomes, notifications, subscriptions, user_preferences, list_orders.
4. Mantener en localStorage solo lo que decidas que sea “solo cliente” (por ejemplo `openaiApiKey` si no la subes a Supabase).

### Fase 4 – Migración de datos existentes (localStorage → Supabase)

1. **Script o flujo “importar mis datos”** (una vez por usuario):
   - Si hay user logueado y no hay datos en Supabase para ese user (por ejemplo, 0 debts), ofrecer “Importar datos desde este dispositivo”.
   - Leer de localStorage: debts, fixedExpenses, assets, incomes, notifications, subscriptions, user_preferences, list_orders.
   - Insertar en las tablas de Supabase con el `user_id` actual.
   - Opcional: después de importar, marcar “datos importados” para no volver a ofrecer o para no sobrescribir.
2. Documentar que, tras migración, los datos “viven” en Supabase; localStorage puede quedar como respaldo temporal o vaciarse.

### Fase 5 – Limpieza y pruebas

1. Eliminar código muerto de localStorage para las entidades migradas.
2. Probar: alta/baja/edición de deudas, compromisos, llamadas, gastos fijos, activos, ingresos; notificaciones; preferencias; órdenes de listas; suscripción.
3. Probar RLS: que un usuario solo vea y edite sus propios datos.
4. Opcional: triggers `updated_at` en cada tabla con `updated_at TIMESTAMPTZ DEFAULT now()` y `ON UPDATE` (o equivalente en Supabase).

---

## 5. Checklist de datos (no olvidar nada)

| Dato | localStorage actual | Tabla Supabase | Migrado |
|------|---------------------|----------------|---------|
| User (id, email, name, avatar) | `user` | auth.users + profiles | Auth ya en uso |
| isLoggedIn | `isLoggedIn` | Session | Session |
| Subscription | `subscription_{userId}` | subscriptions | Fase 2.3 |
| Debts | `debts` | debts | Fase 2.5 |
| Payment commitments | dentro de debt | payment_commitments | Fase 2.5 |
| Call records | dentro de debt | call_records | Fase 2.5 |
| Debts order | `debtsOrder` | list_orders | Fase 2.2 |
| Fixed expenses | `fixedExpenses` | fixed_expenses | Fase 2.6 |
| Fixed expenses order | `fixedExpensesOrder` | list_orders | Fase 2.2 |
| Assets | `assets` | assets | Fase 2.7 |
| Assets order | `assetsOrder` | list_orders | Fase 2.2 |
| Incomes | `incomes` | incomes | Fase 2.8 |
| Incomes order | `incomesOrder` | list_orders | Fase 2.2 |
| Notifications | `notifications` | notifications | Fase 2.4 |
| localCurrency | `localCurrency` | user_preferences | Fase 2.2 |
| language | `language` | user_preferences | Fase 2.2 |
| themeMode | `themeMode` | user_preferences | Fase 2.2 |
| colorScheme | `colorScheme` | user_preferences | Fase 2.2 |
| hideAmounts | `hideAmounts` | user_preferences | Fase 2.2 |
| hasSeenInitialSetup | `hasSeenInitialSetup` | user_preferences | Fase 2.2 |
| openaiApiKey | `openaiApiKey` | (opcional) user_preferences o solo cliente | Decisión de producto |

---

## 6. Orden de archivos a tocar (resumen)

1. **Nuevo:** SQL de migración (este doc o archivo `.sql` en repo).
2. **Nuevo:** `src/lib/supabaseData.ts` (o `src/api/supabase/*`) con todas las llamadas a Supabase.
3. **Modificar:** `src/utils/storage.ts` → convertirlo en adapter que use Supabase cuando hay `user_id`, o crear `storageAdapter.ts` y cambiar imports.
4. **Modificar:** Contextos que usen storage (SubscriptionContext, etc.) para que sigan usando la misma interfaz.
5. **Modificar:** Cualquier uso directo de `localStorage` para debts, expenses, assets, incomes, notifications, preferences, orders: que pase por el adapter.
6. **Opcional:** Pantalla o flujo “Importar datos desde este dispositivo” para migración única desde localStorage.

Con esto tienes un mapeo completo de la app a Supabase y un plan de migración paso a paso sin omitir datos.
