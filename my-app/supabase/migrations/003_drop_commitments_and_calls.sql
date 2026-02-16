-- ============================================================
-- Eliminar tablas que la app ya no usa (llamadas y compromisos de pago).
-- La app solo sincroniza: debts, fixed_expenses, assets, incomes,
-- notifications, subscriptions, user_preferences, list_orders.
--
-- Cómo aplicar: en el dashboard de Supabase → SQL Editor, pegar y ejecutar
-- este archivo. O con CLI: supabase db push (desde la raíz del proyecto).
-- ============================================================

-- Quitar políticas RLS
DROP POLICY IF EXISTS "payment_commitments_own" ON public.payment_commitments;
DROP POLICY IF EXISTS "call_records_own" ON public.call_records;

-- Eliminar tablas (call_records no tiene FK desde payment_commitments, ambas referencian debts)
DROP TABLE IF EXISTS public.call_records;
DROP TABLE IF EXISTS public.payment_commitments;
