/**
 * Interpretación de voz/texto con IA externa.
 * Envía el texto del usuario a una API de IA (OpenAI-compatible) que devuelve
 * una acción estructurada (AIAction) para ejecutar en la app.
 * Si no hay API key configurada o falla la llamada, se devuelve null para
 * usar el parser local como fallback.
 */

import type { AIAction } from '../types/ai';
import { isValidAIIntent } from './aiActions';
import { storage } from '../utils/storage';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/** Último error de la API (para mostrar mensaje al usuario). */
let lastAIVoiceError: 'quota' | 'model_not_found' | null = null;

export interface InterpretVoiceContext {
  /** Idioma del usuario: 'es' | 'en' */
  lang: 'es' | 'en';
  /** Lista de deudas (id + nombre) para resolver debtId: "la de BBVA", "tarjeta Santander" */
  debts: { id: string; name: string }[];
  /** Compromisos de pago (deuda + commitmentId) para editar/eliminar/completar por voz */
  commitments?: { debtId: string; debtName: string; commitmentId: string; date?: string }[];
  /** Llamadas al banco (deuda + callId) para editar/eliminar por voz */
  calls?: { debtId: string; debtName: string; callId: string; date?: string }[];
  /** Gastos fijos (id + nombre) para resolver expenseId: "el gasto de internet", "renta" */
  fixedExpenses?: { id: string; name: string }[];
  /** Activos (id + nombre) para resolver assetId: "el activo casa", "mi carro" */
  assets?: { id: string; name: string }[];
  /** Ingresos (id + nombre) para resolver incomeId: "el ingreso de Forj", "mi sueldo" */
  incomes?: { id: string; name: string }[];
  /** Resumen en texto para que la IA sepa el estado actual (opcional) */
  overview?: string;
}

/**
 * Construye el system prompt que enseña a la IA a mapear lenguaje natural a AIAction.
 */
function buildSystemPrompt(lang: 'es' | 'en'): string {
  const langNote = lang === 'es'
    ? 'El usuario habla en español. Responde SIEMPRE con un único JSON válido.'
    : 'The user speaks in English. Always respond with a single valid JSON only.';

  const actionsDoc = `
Eres el interprete de voz de una app de finanzas personales. El usuario puede controlar la app 100% por voz/texto: CREAR, ELIMINAR y ACTUALIZAR deudas, compromisos, llamadas al banco, gastos fijos, activos e ingresos, con todos sus atributos.

Responde ÚNICAMENTE con un objeto JSON, sin markdown ni texto extra:
- Acción: { "type": "<tipo>", "params": { ... } }
- No entendido: { "type": null }

REGLA #1 — PRIORIDAD EDITAR/ELIMINAR/COMPLETAR (nunca confundir con agregar):
- Si el usuario MODIFICA algo existente (editar, modificar, cambiar, actualizar, corregir, ajustar, fix) → usa edit_* con los params que mencione, o navigate a /edit-*/ID.
- Si dice eliminar/borrar/quitar → delete_* con el id de la entidad.
- Solo add_* cuando claramente AGREGA algo nuevo ("tengo una deuda", "nueva deuda", "agregar deuda", "gano X", etc.).

REGLA #2 — ACTUALIZACIONES PARCIALES POR VOZ:
- Puedes ACTUALIZAR uno o varios atributos sin tocar el resto. Si el usuario dice "cambiar la cuota de BBVA a 50 mil" → edit_debt { debtId: id_BBVA, localFee: 50000 }. Solo incluye en params los atributos que el usuario quiera cambiar.
- "cambiar el gasto de internet a 60 dólares" → edit_fixed_expense { expenseId, amountDollars: 60 }
- "cambiar el valor del activo casa a 2.5 millones" → edit_asset { assetId, valueLocal: 2500000 }
- "cambiar mi ingreso de Forj a 6000" → edit_income { incomeId, amountLocal: 6000 }

IDENTIFICAR ENTIDADES: Te pasamos listas con id y nombre. Para edit/delete/complete usa SIEMPRE el id de la entidad existente (deudas, gastos, activos, ingresos).

—— DEUDAS (crear, editar, eliminar, marcar pagada) ——
add_debt — params: name (requerido), type ("tarjeta"|"prestamo"), bankName, bankPhone, totalLocal, totalDollars, localFee, dollarFee, paymentDate, cutDate, interestRate, currentPlan, hasCallTask.
edit_debt — params: debtId (requerido). Atributos editables: name, type, bankName, bankPhone, totalLocal, totalDollars, localFee, dollarFee, feeToUpdate, feeToUpdateDollars, paymentDate, cutDate, interestRate, currentPlan, hasCallTask, callCompleted.
delete_debt: debtId. delete_all_debts: {}.
complete_debt: debtId — marcar deuda como pagada.

—— GASTOS FIJOS (crear, editar, eliminar) ——
add_fixed_expense — params: name (requerido), amountLocal, amountDollars, category, dueDate (día 1-31 o ISO), notes.
edit_fixed_expense — params: expenseId (requerido). Atributos editables: name, amountLocal, amountDollars, category, dueDate, notes.
delete_fixed_expense: expenseId. delete_all_fixed_expenses: {}.

—— ACTIVOS (crear, editar, eliminar, liquidar) ——
add_asset — params: name (requerido), type (property|vehicle|investment|savings|other), valueLocal, valueDollars, purchaseDate, notes.
edit_asset — params: assetId (requerido). Atributos editables: name, type, valueLocal, valueDollars, purchaseDate, notes.
delete_asset: assetId. delete_all_assets: {}. complete_asset: assetId — liquidar.

—— INGRESOS (crear, editar, eliminar) ——
add_income — params: name (requerido), amountLocal, amountDollars, type (salary|freelance|investment|rental|other), frequency (monthly|weekly|biweekly|yearly|one-time), nextPaymentDate, notes.
edit_income — params: incomeId (requerido). Atributos editables: name, amountLocal, amountDollars, type, frequency, nextPaymentDate, notes.
delete_income: incomeId. delete_all_incomes: {}.

—— NAVEGACIÓN ——
navigate: params: { route: "/dashboard"|"/edit-debt/ID"|"/delete-debt/ID"|"/complete-debt/ID"|"/edit-fixed-expense/ID"|"/edit-asset/ID"|"/complete-asset/ID"|"/edit-income/ID"|"/profile"|"/preferences"|"/about"|"/terms" }. Reemplaza ID por el id real. No uses /add-debt, /add-fixed-expense, /add-asset ni /add-income; crear solo con acciones add_debt, add_fixed_expense, add_asset, add_income y los params.

—— CONSULTAS Y UI ——
get_overview, get_debts, get_state: sin params. toggle_hide_amounts: sin params.

REGLAS: Extrae TODOS los datos que el usuario mencione. Montos: "2 millones"=2000000, "5 mil"=5000. "dólares"/"dollars"→*Dollars; si no→*Local. Fechas: ISO YYYY-MM-DD; "día 15" → año actual + mes actual + 15.

EJEMPLOS (usa los ids de las listas que te pasan):
CREAR: "tengo una deuda con BBVA de 15000" → add_debt { name: "BBVA", totalLocal: 15000 }. "deuda DaviBank 3 millones cuota 30 mil pago día 30 tasa 18%" → add_debt { name: "DaviBank", totalLocal: 3000000, localFee: 30000, paymentDate: "30", interestRate: 18 }. "gasto internet 50 dólares día 10" → add_fixed_expense { name: "Internet", amountDollars: 50, dueDate: "10" }. "activo casa 2 millones tipo property" → add_asset { name: "Casa", valueLocal: 2000000, type: "property" }. "gano 5000 al mes en Forj" → add_income { name: "Forj", amountLocal: 5000, type: "salary", frequency: "monthly" }.
ACTUALIZAR (solo los atributos que mencione): "cambiar la cuota de la deuda BBVA a 50 mil" → edit_debt { debtId, localFee: 50000 }. "cambiar la fecha de pago de BBVA al día 20" → edit_debt { debtId, paymentDate: "20" }. "cambiar el gasto de internet a 60 dólares" → edit_fixed_expense { expenseId, amountDollars: 60 }. "cambiar el valor del activo casa a 2.5 millones" → edit_asset { assetId, valueLocal: 2500000 }. "cambiar mi ingreso de Forj a 6000" → edit_income { incomeId, amountLocal: 6000 }. "editar deuda Santander" (sin atributos) → navigate { route: "/edit-debt/ID" }.
ELIMINAR: "eliminar deuda BBVA" → delete_debt { debtId }. "eliminar todas las deudas" → delete_all_debts {}. "eliminar gasto internet" → delete_fixed_expense { expenseId }. "eliminar activo carro" → delete_asset { assetId }. "eliminar ingreso Forj" → delete_income { incomeId }.
COMPLETAR: "completar deuda Scotiabank" / "marcar deuda BBVA como pagada" → complete_debt { debtId }. "liquidar activo casa" → complete_asset { assetId }.
OTROS: "resumen" / "¿cuánto debo?" → get_overview. "ocultar montos" → toggle_hide_amounts. "ir al inicio" → navigate { route: "/dashboard" }. "agregar deuda" (sin más) → responde en JSON con type "reply" o pide nombre/monto en chat; no navegues a /add-debt.
`;

  return `${langNote}\n\n${actionsDoc}`;
}

/**
 * Llama a la API de IA para interpretar el texto y devolver una AIAction.
 * Si no hay REACT_APP_OPENAI_API_KEY o la llamada falla, devuelve null (usar parser local).
 */
function getOpenAIApiKey(): string {
  return (
    process.env.REACT_APP_OPENAI_API_KEY ||
    process.env.REACT_APP_AI_VOICE_API_KEY ||
    storage.getOpenAIApiKey() ||
    ''
  ).trim();
}

export async function interpretWithAI(
  text: string,
  context: InterpretVoiceContext
): Promise<AIAction | null> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey || !text.trim()) return null;

  const baseUrl = process.env.REACT_APP_AI_VOICE_API_URL || OPENAI_API_URL;

  const systemPrompt = buildSystemPrompt(context.lang);
  const userContent = [
    context.overview ? `Contexto actual: ${context.overview}` : '',
    context.debts.length > 0
      ? `Deudas (usa el id para debtId): ${context.debts.map((d) => `${d.name} (id: ${d.id})`).join(', ')}`
      : '',
    (context.commitments?.length ?? 0) > 0
      ? `Compromisos de pago (deuda + commitmentId): ${context.commitments!.map((c) => `${c.debtName} → commitmentId: ${c.commitmentId}`).join('; ')}`
      : '',
    (context.calls?.length ?? 0) > 0
      ? `Llamadas al banco (deuda + callId): ${context.calls!.map((c) => `${c.debtName} → callId: ${c.callId}`).join('; ')}`
      : '',
    (context.fixedExpenses?.length ?? 0) > 0
      ? `Gastos fijos (usa el id para expenseId): ${context.fixedExpenses!.map((e) => `${e.name} (id: ${e.id})`).join(', ')}`
      : '',
    (context.assets?.length ?? 0) > 0
      ? `Activos (usa el id para assetId): ${context.assets!.map((a) => `${a.name} (id: ${a.id})`).join(', ')}`
      : '',
    (context.incomes?.length ?? 0) > 0
      ? `Ingresos (usa el id para incomeId): ${context.incomes!.map((i) => `${i.name} (id: ${i.id})`).join(', ')}`
      : '',
    `Texto del usuario (voz o escrito): "${text.trim()}"`,
  ]
    .filter(Boolean)
    .join('\n');

  // gpt-4o-mini suele estar disponible sin acceso especial; gpt-4-turbo puede dar 404 si la cuenta no tiene acceso
  const preferredModel = (process.env.REACT_APP_OPENAI_MODEL || 'gpt-4o-mini').trim() || 'gpt-4o-mini';
  const fallbackModel = 'gpt-4o-mini';

  const doRequest = async (model: string) => {
    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.2,
      max_tokens: 500,
    };
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    return { res, status: res.status };
  };

  try {
    let res = (await doRequest(preferredModel)).res;
    const status = res.status;

    // 404 suele ser "model not found" (cuenta sin acceso a ese modelo); reintentar con modelo más accesible
    if (status === 404 && preferredModel !== fallbackModel) {
      console.warn('[aiVoiceApi] 404 con modelo', preferredModel, '– reintentando con', fallbackModel);
      res = (await doRequest(fallbackModel)).res;
    }

    if (!res.ok) {
      const text = await res.text();
      console.warn('[aiVoiceApi] API error:', res.status, text);
      lastAIVoiceError = res.status === 429 ? 'quota' : res.status === 404 ? 'model_not_found' : null;
      if (lastAIVoiceError === null) {
        try {
          const err = JSON.parse(text) as { error?: { code?: string } };
          if (err?.error?.code === 'insufficient_quota') lastAIVoiceError = 'quota';
        } catch (_) {}
      }
      return null;
    }

    lastAIVoiceError = null;
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content?.trim();
    if (!content) return null;

    // Quitar posibles bloques de código markdown
    let jsonStr = content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr) as { type: string | null; params?: Record<string, unknown> };
    if (parsed.type == null || parsed.type === 'null') return null;
    if (!isValidAIIntent(parsed.type)) {
      console.warn('[aiVoiceApi] invalid type from AI:', parsed.type);
      return null;
    }

    const action: AIAction = {
      type: parsed.type as AIAction['type'],
      params: parsed.params || {},
    };
    return action;
  } catch (err) {
    console.warn('[aiVoiceApi] interpret error:', err);
    return null;
  }
}

/** Indica si la interpretación por IA está disponible (hay API key en env o en preferencias). */
export function isAIVoiceEnabled(): boolean {
  return Boolean(getOpenAIApiKey());
}

/** Último error conocido (quota, model_not_found). Para mostrar mensaje al usuario. */
export function getLastAIVoiceError(): 'quota' | 'model_not_found' | null {
  return lastAIVoiceError;
}
