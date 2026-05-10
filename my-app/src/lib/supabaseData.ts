/**
 * Capa de datos Supabase: CRUD para todas las entidades de la app.
 * Todas las funciones son async y requieren userId (auth.uid()).
 *
 * Tablas en uso (deben coincidir con el esquema en Supabase):
 * - debts, fixed_expenses, assets, incomes, notifications,
 *   subscriptions, user_preferences, list_orders.
 * (payment_commitments y call_records fueron eliminadas; ver migración 003.)
 */

import { supabase } from './supabase';
import type {
  Debt,
  FixedExpense,
  Asset,
  Income,
  Notification,
  Subscription,
  NotificationMeta,
} from '../types';

type ListType = 'debts' | 'fixed_expenses' | 'assets' | 'incomes';

// --- Helpers: date to ISO string for app
function toISODate(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
}
function toISODateTime(val: string | null | undefined): string | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d.toISOString();
}
function num(val: unknown): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  return 0;
}

// ============ DEBTS ============

export async function getDebts(userId: string): Promise<Debt[]> {
  const { data: rows, error } = await supabase
    .from('debts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[supabaseData] getDebts error:', error);
    return [];
  }
  if (!rows?.length) return [];

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name || '',
    type: r.type || 'prestamo',
    localCurrency: r.local_currency || 'USD',
    localFee: num(r.local_fee),
    dollarFee: num(r.dollar_fee),
    totalLocal: num(r.total_local),
    totalDollars: num(r.total_dollars),
    feeToUpdate: num(r.fee_to_update),
    feeToUpdateDollars: num(r.fee_to_update_dollars),
    inOrder: !!r.in_order,
    currentPlan: r.current_plan || '',
    bankName: r.bank_name || '',
    bankPhone: r.bank_phone,
    hasCallTask: !!r.has_call_task,
    callCompleted: !!r.call_completed,
    paymentDay: r.payment_date ? parseInt(String(r.payment_date).slice(8, 10), 10) || undefined : undefined,
    cutDay: r.cut_date ? parseInt(String(r.cut_date).slice(8, 10), 10) || undefined : undefined,
    interestRate: r.interest_rate != null ? num(r.interest_rate) : undefined,
    closedAt: toISODateTime(r.closed_at),
    createdAt: r.created_at || '',
    updatedAt: r.updated_at || '',
    commitments: [],
    callHistory: [],
  }));
}

export async function saveDebt(userId: string, debt: Debt): Promise<void> {
  const now = new Date().toISOString();
  const row = {
    id: debt.id,
    user_id: userId,
    name: debt.name,
    type: debt.type,
    local_currency: debt.localCurrency || 'USD',
    local_fee: debt.localFee ?? 0,
    dollar_fee: debt.dollarFee ?? 0,
    total_local: debt.totalLocal ?? 0,
    total_dollars: debt.totalDollars ?? 0,
    fee_to_update: debt.feeToUpdate ?? 0,
    fee_to_update_dollars: debt.feeToUpdateDollars ?? 0,
    in_order: debt.inOrder ?? true,
    current_plan: debt.currentPlan || '',
    bank_name: debt.bankName || '',
    bank_phone: debt.bankPhone ?? null,
    has_call_task: debt.hasCallTask ?? false,
    call_completed: debt.callCompleted ?? false,
    payment_date: debt.paymentDay ? `2000-01-${String(debt.paymentDay).padStart(2, '0')}` : null,
    cut_date: debt.cutDay ? `2000-01-${String(debt.cutDay).padStart(2, '0')}` : null,
    interest_rate: debt.interestRate ?? null,
    closed_at: debt.closedAt || null,
    updated_at: now,
  };

  const { error: debtError } = await supabase.from('debts').upsert(row, { onConflict: 'id' });
  if (debtError) {
    console.warn('[supabaseData] saveDebt upsert error:', debtError);
    throw debtError;
  }
}

export async function deleteDebt(userId: string, id: string): Promise<void> {
  await supabase.from('debts').delete().eq('id', id).eq('user_id', userId);
}

// ============ FIXED EXPENSES ============

function fixedExpenseToRow(e: FixedExpense, userId: string): Record<string, unknown> {
  return {
    id: e.id,
    user_id: userId,
    name: e.name,
    amount_local: e.amountLocal ?? 0,
    amount_dollars: e.amountDollars ?? 0,
    local_currency: e.localCurrency || 'USD',
    due_date: e.paymentDay ? String(e.paymentDay) : null,
    payment_date: e.paymentDay ? `2000-01-${String(e.paymentDay).padStart(2, '0')}` : null,
    paid_for_month: e.paidForMonth || null,
    notes: e.notes || null,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
  };
}

export async function getFixedExpenses(userId: string): Promise<FixedExpense[]> {
  const { data, error } = await supabase.from('fixed_expenses').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) {
    console.warn('[supabaseData] getFixedExpenses error:', error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name || '',
    amountLocal: num(r.amount_local),
    amountDollars: num(r.amount_dollars),
    localCurrency: r.local_currency || 'USD',
    paymentDay: r.due_date ? parseInt(String(r.due_date), 10) || undefined : undefined,
    paidForMonth: r.paid_for_month,
    notes: r.notes,
    createdAt: r.created_at || '',
    updatedAt: r.updated_at || '',
  }));
}

export async function saveFixedExpense(userId: string, expense: FixedExpense): Promise<void> {
  const row = fixedExpenseToRow(expense, userId);
  const { error } = await supabase.from('fixed_expenses').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteFixedExpense(userId: string, id: string): Promise<void> {
  await supabase.from('fixed_expenses').delete().eq('id', id).eq('user_id', userId);
}

// ============ ASSETS ============

export async function getAssets(userId: string): Promise<Asset[]> {
  const { data, error } = await supabase.from('assets').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) {
    console.warn('[supabaseData] getAssets error:', error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name || '',
    type: r.type || 'other',
    valueLocal: num(r.value_local),
    valueDollars: num(r.value_dollars),
    localCurrency: r.local_currency || 'USD',
    purchaseDate: toISODate(r.purchase_date),
    notes: r.notes,
    createdAt: r.created_at || '',
    updatedAt: r.updated_at || '',
  }));
}

export async function saveAsset(userId: string, asset: Asset): Promise<void> {
  const row = {
    id: asset.id,
    user_id: userId,
    name: asset.name,
    type: asset.type,
    value_local: asset.valueLocal ?? 0,
    value_dollars: asset.valueDollars ?? 0,
    local_currency: asset.localCurrency || 'USD',
    purchase_date: asset.purchaseDate || null,
    notes: asset.notes || null,
    created_at: asset.createdAt,
    updated_at: asset.updatedAt,
  };
  const { error } = await supabase.from('assets').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteAsset(userId: string, id: string): Promise<void> {
  await supabase.from('assets').delete().eq('id', id).eq('user_id', userId);
}

// ============ INCOMES ============

export async function getIncomes(userId: string): Promise<Income[]> {
  const { data, error } = await supabase.from('incomes').select('*').eq('user_id', userId).order('created_at', { ascending: true });
  if (error) {
    console.warn('[supabaseData] getIncomes error:', error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    name: r.name || '',
    amountLocal: num(r.amount_local),
    amountDollars: num(r.amount_dollars),
    localCurrency: r.local_currency || 'USD',
    type: r.type || 'other',
    frequency: r.frequency || 'monthly',
    paymentDay: r.next_payment_date ? parseInt(String(r.next_payment_date).slice(8, 10), 10) || undefined : undefined,
    notes: r.notes,
    createdAt: r.created_at || '',
    updatedAt: r.updated_at || '',
  }));
}

export async function saveIncome(userId: string, income: Income): Promise<void> {
  const row = {
    id: income.id,
    user_id: userId,
    name: income.name,
    amount_local: income.amountLocal ?? 0,
    amount_dollars: income.amountDollars ?? 0,
    local_currency: income.localCurrency || 'USD',
    type: income.type,
    frequency: income.frequency,
    next_payment_date: income.paymentDay ? `2000-01-${String(income.paymentDay).padStart(2, '0')}` : null,
    notes: income.notes || null,
    created_at: income.createdAt,
    updated_at: income.updatedAt,
  };
  const { error } = await supabase.from('incomes').upsert(row, { onConflict: 'id' });
  if (error) throw error;
}

export async function deleteIncome(userId: string, id: string): Promise<void> {
  await supabase.from('incomes').delete().eq('id', id).eq('user_id', userId);
}

// ============ NOTIFICATIONS ============

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
  if (error) {
    console.warn('[supabaseData] getNotifications error:', error);
    return [];
  }
  return (data || []).map((r: any) => ({
    id: r.id,
    message: r.message || '',
    type: (r.type || 'success') as Notification['type'],
    createdAt: r.created_at || '',
    read: !!r.read,
    meta: r.meta as NotificationMeta | undefined,
  }));
}

export async function saveNotification(userId: string, notification: Notification): Promise<void> {
  await supabase.from('notifications').insert({
    id: notification.id,
    user_id: userId,
    message: notification.message,
    type: notification.type,
    created_at: notification.createdAt,
    read: notification.read,
    meta: notification.meta || null,
  });
}

export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId);
}

export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId);
}

export async function deleteNotification(userId: string, notificationId: string): Promise<void> {
  await supabase.from('notifications').delete().eq('id', notificationId).eq('user_id', userId);
}

export async function clearAllNotifications(userId: string): Promise<void> {
  await supabase.from('notifications').delete().eq('user_id', userId);
}

// ============ SUBSCRIPTIONS ============

export async function getSubscription(userId: string): Promise<Subscription | null> {
  const { data, error } = await supabase.from('subscriptions').select('*').eq('user_id', userId).single();
  if (error || !data) return null;
  return {
    plan: data.plan || 'free',
    status: data.status,
    endsAt: data.ends_at ? new Date(data.ends_at).toISOString() : undefined,
    interval: data.interval,
  };
}

export async function setSubscription(userId: string, subscription: Subscription): Promise<void> {
  await supabase.from('subscriptions').upsert({
    user_id: userId,
    plan: subscription.plan,
    status: subscription.status || null,
    ends_at: subscription.endsAt || null,
    interval: subscription.interval || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

// ============ USER PREFERENCES ============

export interface UserPreferencesRow {
  localCurrency: string;
  language: string;
  themeMode: string | null;
  colorScheme: string | null;
  hideAmounts: boolean;
  hasSeenInitialSetup: boolean;
}

export async function getUserPreferences(userId: string): Promise<UserPreferencesRow | null> {
  const { data, error } = await supabase.from('user_preferences').select('*').eq('user_id', userId).single();
  if (error || !data) return null;
  return {
    localCurrency: data.local_currency || 'USD',
    language: data.language || 'en',
    themeMode: data.theme_mode,
    colorScheme: data.color_scheme,
    hideAmounts: !!data.hide_amounts,
    hasSeenInitialSetup: !!data.has_seen_initial_setup,
  };
}

export async function setUserPreferences(userId: string, prefs: Partial<UserPreferencesRow>): Promise<void> {
  const row: any = { user_id: userId, updated_at: new Date().toISOString() };
  if (prefs.localCurrency !== undefined) row.local_currency = prefs.localCurrency;
  if (prefs.language !== undefined) row.language = prefs.language;
  if (prefs.themeMode !== undefined) row.theme_mode = prefs.themeMode;
  if (prefs.colorScheme !== undefined) row.color_scheme = prefs.colorScheme;
  if (prefs.hideAmounts !== undefined) row.hide_amounts = prefs.hideAmounts;
  if (prefs.hasSeenInitialSetup !== undefined) row.has_seen_initial_setup = prefs.hasSeenInitialSetup;
  await supabase.from('user_preferences').upsert(row, { onConflict: 'user_id' });
}

// ============ LIST ORDERS ============

export async function getListOrder(userId: string, listType: ListType): Promise<string[]> {
  const { data, error } = await supabase.from('list_orders').select('order_ids').eq('user_id', userId).eq('list_type', listType).single();
  if (error || !data?.order_ids) return [];
  return Array.isArray(data.order_ids) ? data.order_ids : [];
}

export async function setListOrder(userId: string, listType: ListType, orderIds: string[]): Promise<void> {
  await supabase.from('list_orders').upsert({
    user_id: userId,
    list_type: listType,
    order_ids: orderIds,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,list_type' });
}

// ============ HYDRATE: fetch all data from Supabase into localStorage shape ============

export type HydratePayload = {
  debts: Debt[];
  fixedExpenses: FixedExpense[];
  assets: Asset[];
  incomes: Income[];
  notifications: Notification[];
  subscription: Subscription | null;
  preferences: UserPreferencesRow | null;
  debtsOrder: string[];
  fixedExpensesOrder: string[];
  assetsOrder: string[];
  incomesOrder: string[];
};

export async function hydrateFromSupabase(userId: string): Promise<HydratePayload> {
  const [
    debts,
    fixedExpenses,
    assets,
    incomes,
    notifications,
    subscription,
    preferences,
    debtsOrder,
    fixedExpensesOrder,
    assetsOrder,
    incomesOrder,
  ] = await Promise.all([
    getDebts(userId),
    getFixedExpenses(userId),
    getAssets(userId),
    getIncomes(userId),
    getNotifications(userId),
    getSubscription(userId),
    getUserPreferences(userId),
    getListOrder(userId, 'debts'),
    getListOrder(userId, 'fixed_expenses'),
    getListOrder(userId, 'assets'),
    getListOrder(userId, 'incomes'),
  ]);

  return {
    debts,
    fixedExpenses,
    assets,
    incomes,
    notifications,
    subscription,
    preferences,
    debtsOrder,
    fixedExpensesOrder,
    assetsOrder,
    incomesOrder,
  };
}
