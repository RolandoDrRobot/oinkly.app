-- ============================================================
-- Migración inicial: esquema completo de la app en Supabase
-- Ejecutar en Supabase SQL Editor o con Supabase CLI
-- ============================================================

-- ============================================================
-- 1. PROFILES (espejo opcional de auth.users)
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
-- 2. SUBSCRIPTIONS
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
-- 3. DEBTS
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
-- 4. PAYMENT_COMMITMENTS
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
-- 5. CALL_RECORDS
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
-- 6. FIXED_EXPENSES
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
-- 7. ASSETS
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
-- 8. INCOMES
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
-- 9. NOTIFICATIONS
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
-- 10. USER_PREFERENCES
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
-- 11. LIST_ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.list_orders (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  list_type TEXT NOT NULL CHECK (list_type IN ('debts', 'fixed_expenses', 'assets', 'incomes')),
  order_ids JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, list_type)
);

-- ============================================================
-- RLS
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

DROP POLICY IF EXISTS "profiles_own" ON public.profiles;
CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "subscriptions_own" ON public.subscriptions;
CREATE POLICY "subscriptions_own" ON public.subscriptions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "debts_own" ON public.debts;
CREATE POLICY "debts_own" ON public.debts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "payment_commitments_own" ON public.payment_commitments;
CREATE POLICY "payment_commitments_own" ON public.payment_commitments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.debts d WHERE d.id = debt_id AND d.user_id = auth.uid())
);

DROP POLICY IF EXISTS "call_records_own" ON public.call_records;
CREATE POLICY "call_records_own" ON public.call_records FOR ALL USING (
  EXISTS (SELECT 1 FROM public.debts d WHERE d.id = debt_id AND d.user_id = auth.uid())
);

DROP POLICY IF EXISTS "fixed_expenses_own" ON public.fixed_expenses;
CREATE POLICY "fixed_expenses_own" ON public.fixed_expenses FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "assets_own" ON public.assets;
CREATE POLICY "assets_own" ON public.assets FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "incomes_own" ON public.incomes;
CREATE POLICY "incomes_own" ON public.incomes FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_own" ON public.notifications;
CREATE POLICY "notifications_own" ON public.notifications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_own" ON public.user_preferences;
CREATE POLICY "user_preferences_own" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "list_orders_own" ON public.list_orders;
CREATE POLICY "list_orders_own" ON public.list_orders FOR ALL USING (auth.uid() = user_id);
