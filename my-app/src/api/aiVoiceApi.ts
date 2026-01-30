/**
 * Interpretación de voz/texto con IA externa.
 * Envía el texto del usuario a una API de IA (OpenAI-compatible) que devuelve
 * una acción estructurada (AIAction) para ejecutar en la app.
 * Si no hay API key configurada o falla la llamada, se devuelve null para
 * usar el parser local como fallback.
 */

import type { AIAction } from '../types/ai';
import { isValidAIIntent } from './aiActions';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/** Último error de la API (para mostrar mensaje al usuario). */
let lastAIVoiceError: 'quota' | 'model_not_found' | null = null;

export interface InterpretVoiceContext {
  /** Idioma del usuario: 'es' | 'en' */
  lang: 'es' | 'en';
  /** Lista de deudas (id + nombre) para resolver debtId: "la de BBVA", "tarjeta Santander" */
  debts: { id: string; name: string }[];
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
Eres el interprete de voz de una app de finanzas personales. El usuario puede controlar la app 100% por voz/texto SIN tocar botones.
Tu trabajo: interpretar su frase y devolver UNA acción en JSON.

Responde ÚNICAMENTE con un objeto JSON, sin markdown ni texto extra:
- Acción: { "type": "<tipo>", "params": { ... } }
- No entendido o no es acción: { "type": null }

IDENTIFICAR ENTIDADES: Te pasamos listas con "nombre (id: xxx)". Para cualquier acción que necesite debtId, expenseId, assetId o incomeId, usa el id de la entidad cuyo nombre coincida con lo que dice el usuario. Ej: "eliminar la deuda BBVA" → debtId del item "BBVA" en Deudas; "editar el gasto de internet" → expenseId del item "Internet" en Gastos fijos.

ACCIONES COMPLETAS (todo lo que la app permite):

—— DEUDAS ——
- add_debt: name (requerido), type ("tarjeta"|"prestamo"), bankName, totalLocal/totalDollars, localFee/dollarFee (cuota mensual), paymentDate, cutDate, interestRate, bankPhone, currentPlan
- edit_debt: debtId (requerido, de lista Deudas), name, type, bankName, totalLocal, totalDollars, localFee, dollarFee, paymentDate, cutDate, interestRate
- delete_debt: debtId (requerido)
- complete_debt: debtId (requerido) — marcar deuda como pagada

—— COMPROMISOS DE PAGO (por deuda) ——
- add_commitment: debtId (requerido), amountLocal/amountDollars, date (ISO), notes
- edit_commitment: debtId, commitmentId (requeridos)
- delete_commitment: debtId, commitmentId (requeridos)
- complete_commitment: debtId, commitmentId (requeridos)

—— LLAMADAS AL BANCO ——
- add_call: debtId (requerido), notes, date (ISO)
- edit_call: debtId, callId (requeridos), notes, date
- delete_call: debtId, callId (requeridos)

—— GASTOS FIJOS ——
- add_fixed_expense: name (requerido), amountLocal/amountDollars, category, dueDate (día 1-31), notes
- edit_fixed_expense: expenseId (requerido, de lista Gastos fijos), name, amountLocal, amountDollars, category, dueDate, notes
- delete_fixed_expense: expenseId (requerido)

—— ACTIVOS ——
- add_asset: name (requerido), valueLocal/valueDollars, type (property|vehicle|investment|savings|other), purchaseDate, notes
- edit_asset: assetId (requerido, de lista Activos), name, type, valueLocal, valueDollars, purchaseDate, notes
- delete_asset: assetId (requerido)
- complete_asset: assetId (requerido) — liquidar activo

—— INGRESOS ——
- add_income: name (requerido), amountLocal/amountDollars, type (salary|freelance|investment|rental|other), frequency (monthly|weekly|biweekly|yearly|one-time), nextPaymentDate, notes
- edit_income: incomeId (requerido, de lista Ingresos), name, amountLocal, amountDollars, type, frequency, nextPaymentDate, notes
- delete_income: incomeId (requerido)

—— NAVEGACIÓN (si pide abrir una pantalla) ——
- navigate: params: { route: "/dashboard" | "/add-debt" | "/edit-debt/ID" | "/delete-debt/ID" | "/complete-debt/ID" | "/add-commitment/ID" | "/add-call/ID" | "/add-fixed-expense" | "/edit-fixed-expense/ID" | "/add-asset" | "/edit-asset/ID" | "/complete-asset/ID" | "/add-income" | "/edit-income/ID" | "/profile" | "/preferences" | "/about" | "/terms" }
  Reemplaza ID por el id real de la entidad cuando sea necesario.

—— CONSULTAS Y UI ——
- get_overview: sin params — "¿cuánto debo?", "resumen", "patrimonio"
- get_debts: sin params — listar deudas
- get_state: sin params — estado completo
- toggle_hide_amounts: sin params — "ocultar montos", "mostrar montos"

REGLAS: Extrae TODOS los datos que el usuario mencione (cuota, fechas, interés, categoría, frecuencia). Montos: "2 millones"=2000000, "5 mil"=5000. "dólares"/"dollars"→*Dollars; si no→*Local. Fechas en ISO YYYY-MM-DD; "día 15" → YYYY-MM-15 (año actual).
`;

  return `${langNote}\n\n${actionsDoc}`;
}

/**
 * Llama a la API de IA para interpretar el texto y devolver una AIAction.
 * Si no hay REACT_APP_OPENAI_API_KEY o la llamada falla, devuelve null (usar parser local).
 */
export async function interpretWithAI(
  text: string,
  context: InterpretVoiceContext
): Promise<AIAction | null> {
  const apiKey = process.env.REACT_APP_OPENAI_API_KEY || process.env.REACT_APP_AI_VOICE_API_KEY;
  if (!apiKey || !text.trim()) return null;

  const baseUrl = process.env.REACT_APP_AI_VOICE_API_URL || OPENAI_API_URL;

  const systemPrompt = buildSystemPrompt(context.lang);
  const userContent = [
    context.overview ? `Contexto actual: ${context.overview}` : '',
    context.debts.length > 0
      ? `Deudas (usa el id para debtId): ${context.debts.map((d) => `${d.name} (id: ${d.id})`).join(', ')}`
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

/** Indica si la interpretación por IA está disponible (hay API key). */
export function isAIVoiceEnabled(): boolean {
  return Boolean(
    process.env.REACT_APP_OPENAI_API_KEY || process.env.REACT_APP_AI_VOICE_API_KEY
  );
}

/** Último error conocido (quota, model_not_found). Para mostrar mensaje al usuario. */
export function getLastAIVoiceError(): 'quota' | 'model_not_found' | null {
  return lastAIVoiceError;
}
