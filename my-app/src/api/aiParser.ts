/**
 * Parser de texto/voz a AIAction.
 * Convierte frases en español/inglés a acciones estructuradas para executeAIAction.
 * Extrae nombre, montos y moneda cuando el usuario crea una entrada; lo no capturado queda 0 o vacío.
 */

import type { AIAction } from '../types/ai';
import type { Debt } from '../types';
import { getSummaryText } from './aiContext';

/** Extrae nombre y monto (y si es dólares) del resto del texto. Ej: "Tarjeta BBVA 5000 pesos" -> { name, amountLocal }; "Card 2000 dollars" -> { name, amountDollars }. */
function parseNameAndAmount(
  rest: string,
  defaultIsDollars: boolean = false
): { name: string; amountLocal?: number; amountDollars?: number } {
  const trimmed = rest.trim();
  if (!trimmed) return { name: '' };

  // Número con posible decimal y opcional palabra de moneda al final
  const withAmount = trimmed.match(/^(.+?)\s+(\d+(?:[.,]\d+)?)\s*(pesos|dólares|dollars|usd|dólar)?\s*$/i);
  if (withAmount) {
    const name = withAmount[1].trim();
    const amount = parseFloat(withAmount[2].replace(',', '.')) || 0;
    const currencyWord = (withAmount[3] || '').toLowerCase();
    const isDollars = defaultIsDollars || /dollars|usd|dólares|dólar/.test(currencyWord);
    if (isDollars) return { name, amountDollars: amount };
    return { name, amountLocal: amount };
  }

  // Solo nombre (sin número): monto 0
  return { name: trimmed };
}

/** Quita el prefijo del comando y devuelve el resto. */
function stripPrefix(text: string, prefixes: RegExp): string {
  const m = text.trim().match(prefixes);
  return m ? text.slice(m[0].length).trim() : text.trim();
}

/** Extrae un monto del texto: "2 millones" -> 2000000, "1.5 millones" -> 1500000, "5 mil" -> 5000, "5000" -> 5000. */
function parseAmountFromText(text: string): number | undefined {
  const t = text.replace(/,/g, '.');
  const millones = t.match(/(\d+(?:\.\d+)?)\s*mill[oó]n(?:es)?/i);
  if (millones) return parseFloat(millones[1]) * 1000000;
  const mil = t.match(/(\d+(?:\.\d+)?)\s*mil(?:\s|$|s)/i);
  if (mil) return parseFloat(mil[1]) * 1000;
  const num = t.match(/\d+(?:[.,]\d+)?/);
  if (num) return parseFloat(num[0].replace(',', '.'));
  return undefined;
}

/** Indica si en el texto se menciona dólares/USD. */
function isDollarsMentioned(text: string): boolean {
  return /\bdólares\b|\bdollars\b|\busd\b|\bdólar\b|\$\s*\d/i.test(text);
}

/**
 * Extrae nombre y monto de frases naturales tipo:
 * "tengo un ingreso, trabajo en una empresa llamada forj y gano $5000 al mes"
 * "I have an income, I work at a company called Forj and I earn $5000 per month"
 */
function parseNaturalIncome(text: string): { name: string; amountLocal?: number; amountDollars?: number } | null {
  const hasIncome =
    /tengo\s+(un\s+)?ingreso|I\s+have\s+(an\s+)?income|trabajo\s+en|work\s+at|gano\s+\$?\d|earn\s+\$?\d|recibo\s+(un\s+)?sueldo|mi\s+salario|me\s+pagan|ingreso\s+de\s+alquiler|ingreso\s+por\s+inversiones|salary|they\s+pay\s+me|empresa\s+se\s+llama|compañía\s+llamada|company\s+called|mi\s+ingreso/i.test(
      text
    );
  if (!hasIncome) return null;

  let name = '';
  let amount: number | undefined;
  let isDollars = isDollarsMentioned(text);

  // Nombre: "empresa llamada X" / "company called X" / "empresa se llama X" / "compañía llamada X"
  const llamadaMatch = text.match(/(?:empresa\s+)?(?:se\s+)?llamada\s+([^,.\d]+?)(?=\s+y\s+|\s*,|\s+gano|\s+earn|$)/i);
  if (llamadaMatch) name = llamadaMatch[1].trim();
  const calledEn = text.match(/(?:company\s+)?called\s+([^,.\d]+?)(?=\s+and\s+|\s*,|\s+earn|$)/i);
  if (calledEn && !name) name = calledEn[1].trim();
  const empresaMatch = text.match(/(?:empresa|compañía)\s+(?:que\s+)?(?:se\s+)?llama\s+([a-záéíóúñ\w\s]+?)(?=\s+,|\s+y\s+|\s*\.|$)/i);
  if (empresaMatch && !name) name = empresaMatch[1].trim();
  // "trabajo en X" / "work at X"
  const trabajoMatch = text.match(/(?:trabajo\s+en\s+(?:una\s+empresa\s+)?(?:llamada\s+)?)([a-záéíóúñ\w\s]+?)(?=\s+y\s+|\s*,|\s+gano|$)/i);
  if (trabajoMatch && !name) name = trabajoMatch[1].trim();
  const workMatch = text.match(/(?:work\s+at\s+(?:a\s+company\s+)?(?:called\s+)?)([a-záéíóúñ\w\s]+?)(?=\s+and\s+|\s*,|\s+earn|$)/i);
  if (workMatch && !name) name = workMatch[1].trim();
  // "empleado de X" / "trabajo para X"
  const empleadoMatch = text.match(/(?:empleado\s+de|trabajo\s+para\s+(?:una\s+)?(?:empresa\s+)?(?:llamada\s+)?)([a-záéíóúñ\w\s]+?)(?=\s+,|\s+y\s+|\s*\.|$)/i);
  if (empleadoMatch && !name) name = empleadoMatch[1].trim();
  // Tipo de ingreso como nombre: "ingreso de alquiler", "freelance"
  if (!name && /ingreso\s+de\s+alquiler|ingreso\s+por\s+inversiones|freelance/i.test(text)) {
    if (/alquiler|rental/i.test(text)) name = 'Alquiler';
    else if (/inversiones|investment/i.test(text)) name = 'Inversiones';
    else if (/freelance/i.test(text)) name = 'Freelance';
  }

  const ganoMatch = text.match(/gano\s*\$?\s*(\d+(?:[.,]\d+)?)/i);
  const earnMatch = text.match(/earn\s*\$?\s*(\d+(?:[.,]\d+)?)/i);
  const salarioMatch = text.match(/(?:sueldo|salario|salary)\s+(?:de\s+)?\$?\s*(\d+(?:[.,]\d+)?)/i);
  const dollarMatch = text.match(/\$\s*(\d+(?:[.,]\d+)?)/);
  const mePaganMatch = text.match(/me\s+pagan\s+(\d+(?:[.,]\d+)?)/i);
  const reciboMatch = text.match(/recibo\s+(?:un\s+)?(?:sueldo\s+de\s+)?\$?\s*(\d+(?:[.,]\d+)?)/i);
  if (ganoMatch) amount = parseFloat(ganoMatch[1].replace(',', '.'));
  else if (earnMatch) amount = parseFloat(earnMatch[1].replace(',', '.'));
  else if (salarioMatch) amount = parseFloat(salarioMatch[1].replace(',', '.'));
  else if (reciboMatch) amount = parseFloat(reciboMatch[1].replace(',', '.'));
  else if (mePaganMatch) amount = parseFloat(mePaganMatch[1].replace(',', '.'));
  else if (dollarMatch) amount = parseFloat(dollarMatch[1].replace(',', '.'));
  else amount = parseAmountFromText(text);

  if (!name && !amount) return null;
  if (!name) name = 'Ingreso';

  return {
    name: name.trim() || 'Ingreso',
    ...(amount !== undefined && (isDollars ? { amountDollars: amount } : { amountLocal: amount })),
  };
}

/** Deuda en lenguaje natural: "tengo una deuda con BBVA", "debo 15000 en tarjeta", "préstamo con Banamex". */
function parseNaturalDebt(text: string): { name: string; totalLocal?: number; totalDollars?: number; type?: 'prestamo' | 'tarjeta'; bankName?: string } | null {
  const hasDebt =
    /tengo\s+(una\s+)?deuda|I\s+have\s+a\s+debt|debo\s+\d|I\s+owe|préstamo|crédito\s+con|tarjeta\s+de|credit\s+card|add\s+debt|nueva\s+deuda|deuda\s+con|loan/i.test(
      text
    );
  if (!hasDebt) return null;

  let name = '';
  let bankName = '';
  let type: 'prestamo' | 'tarjeta' = 'prestamo';
  if (/tarjeta|credit\s+card|tarjeta\s+de\s+crédito/i.test(text)) type = 'tarjeta';

  const deboMatch = text.match(/(?:debo|owe)\s+(\d+(?:[.,]\d+)?)\s*(?:pesos|dólares|dollars|usd)?/i);
  const tengoDeudaMatch = text.match(/(?:tengo\s+(?:una\s+)?deuda\s+de\s+)(\d+(?:[.,]\d+)?)/i);
  const amount = parseAmountFromText(text) ?? (deboMatch ? parseFloat(deboMatch[1].replace(',', '.')) : undefined) ?? (tengoDeudaMatch ? parseFloat(tengoDeudaMatch[1].replace(',', '.')) : undefined);
  const isDollars = isDollarsMentioned(text);

  // "con el banco X" / "con X" / "tarjeta X" / "préstamo con X"
  const conMatch = text.match(/(?:deuda\s+)?con\s+(?:el\s+banco\s+)?([a-záéíóúñ\w\s]+?)(?=\s*,|\s+y\s+|\s+es\s+|\s*\.|$)/i);
  if (conMatch) {
    bankName = conMatch[1].trim();
    name = bankName;
  }
  const tarjetaMatch = text.match(/tarjeta\s+(?:de\s+)?([a-záéíóúñ\w\s]+?)(?=\s*,|\s+,|\s+y\s+|\s+me\s+|\s*\.|$)/i);
  if (tarjetaMatch && !name) name = 'Tarjeta ' + tarjetaMatch[1].trim();
  const creditoMatch = text.match(/crédito\s+(?:con\s+)?([a-záéíóúñ\w\s]+?)(?=\s*,|\s+,|\s+\d|$)/i);
  if (creditoMatch && !name) name = creditoMatch[1].trim();
  const prestamoMatch = text.match(/préstamo\s+(?:personal\s+)?(?:con\s+)?([a-záéíóúñ\w\s]+?)(?=\s+de\s+|\s*,|\s+\d|$)/i);
  if (prestamoMatch && !name) name = prestamoMatch[1].trim();
  const addDebtMatch = text.match(/(?:agregar\s+deuda|add\s+debt|nueva\s+deuda)[:\s]+([^,]+?)(?:\s*,|\s+debo\s+|\s*,\s*(\d+)|$)/i);
  if (addDebtMatch) {
    if (!name) name = addDebtMatch[1].trim();
    if (addDebtMatch[2] && amount === undefined) {
      const n = parseFloat(addDebtMatch[2].replace(',', '.'));
      if (!isNaN(n)) {
        // amount will be set below from parseAmountFromText or we use this
      }
    }
  }
  const laTarjetaMatch = text.match(/la\s+tarjeta\s+de\s+([a-záéíóúñ\w]+)/i);
  if (laTarjetaMatch && !name) name = 'Tarjeta ' + laTarjetaMatch[1].trim();
  if (!name && bankName) name = bankName;
  if (!name) name = 'Deuda';

  const finalAmount = amount ?? parseAmountFromText(text);
  if (!name && finalAmount === undefined) return null;

  const params: Record<string, unknown> = { name: name.trim(), type, bankName: bankName || name.trim() };
  if (finalAmount !== undefined) {
    if (isDollars) params.totalDollars = finalAmount;
    else params.totalLocal = finalAmount;
  }
  return params as { name: string; totalLocal?: number; totalDollars?: number; type?: 'prestamo' | 'tarjeta'; bankName?: string };
}

/** Gasto fijo en lenguaje natural: "tengo un gasto de renta", "pago 8000 de internet". */
function parseNaturalExpense(text: string): { name: string; amountLocal?: number; amountDollars?: number } | null {
  const hasExpense =
    /tengo\s+(un\s+)?gasto|I\s+have\s+a\s+fixed\s+expense|pago\s+\d|I\s+pay|gasto\s+fijo|fixed\s+expense|agregar\s+gasto|add\s+expense|mi\s+gasto\s+de|renta|internet|luz|seguro|colegiatura|gym|streaming|teléfono|phone\s+bill/i.test(
      text
    );
  if (!hasExpense) return null;

  let name = '';
  const pagoMatch = text.match(/pago\s+(\d+(?:[.,]\d+)?)/i);
  const amount = parseAmountFromText(text) ?? (pagoMatch ? parseFloat(pagoMatch[1].replace(',', '.')) : undefined);
  const isDollars = isDollarsMentioned(text);

  const gastoDeMatch = text.match(/gasto\s+(?:fijo\s+)?de\s+([a-záéíóúñ\w\s]+?)(?=\s*,|\s+pago\s+|\s*\.|$)/i);
  if (gastoDeMatch) name = gastoDeMatch[1].trim();
  const pagoDeMatch = text.match(/pago\s+(?:\d+\s+)?de\s+([a-záéíóúñ\w\s]+?)(?=\s+cada|\s+al\s+|\s*\.|$)/i);
  if (pagoDeMatch && !name) name = pagoDeMatch[1].trim();
  const addGastoMatch = text.match(/(?:agregar\s+gasto|add\s+expense)[:\s]+([^,]+?)(?:\s*,|\s+\d|$)/i);
  if (addGastoMatch && !name) name = addGastoMatch[1].trim();
  if (!name && /renta|rent/i.test(text)) name = 'Renta';
  if (!name && /internet/i.test(text)) name = 'Internet';
  if (!name && /luz|electricity/i.test(text)) name = 'Luz';
  if (!name && /seguro|insurance/i.test(text)) name = 'Seguro';
  if (!name && /colegiatura|school/i.test(text)) name = 'Colegiatura';
  if (!name && /gym/i.test(text)) name = 'Gym';
  if (!name && /streaming|netflix|spotify/i.test(text)) name = 'Streaming';
  if (!name && /teléfono|phone|celular/i.test(text)) name = 'Teléfono';
  if (!name && /gas|gasolina/i.test(text)) name = 'Gas';
  if (!name && /agua|water/i.test(text)) name = 'Agua';
  if (!name) name = 'Gasto';

  return {
    name: name.trim(),
    ...(amount !== undefined && (isDollars ? { amountDollars: amount } : { amountLocal: amount })),
  };
}

/** Activo en lenguaje natural: "tengo un activo, es mi casa, valuada en 2 millones". */
function parseNaturalAsset(text: string): { name: string; valueLocal?: number; valueDollars?: number } | null {
  const hasAsset =
    /tengo\s+(un\s+)?activo|I\s+have\s+an\s+asset|vale\s+(?:aproximadamente\s+)?\d|worth\s+\d|valuada\s+en|valued\s+at|agregar\s+activo|add\s+asset|mi\s+(?:casa|carro|moto)|cuenta\s+de\s+ahorro|inversión|portafolio/i.test(
      text
    );
  if (!hasAsset) return null;

  let name = '';
  const amount = parseAmountFromText(text);
  const isDollars = isDollarsMentioned(text);

  const valuadaMatch = text.match(/(?:valuada\s+en|valued\s+at|worth\s+about?)\s*\$?\s*([\d.,]+\s*(?:millones?|mil)?)/i);
  const valeMatch = text.match(/(?:vale\s+(?:aproximadamente\s+)?|worth\s+)\$?\s*([\d.,]+\s*(?:millones?|mil)?)/i);
  const value = amount ?? (valuadaMatch ? parseAmountFromText(valuadaMatch[0]) : undefined) ?? (valeMatch ? parseAmountFromText(valeMatch[0]) : undefined);

  if (/es\s+mi\s+casa|mi\s+casa|my\s+house|house/i.test(text)) name = 'Casa';
  else if (/mi\s+carro|my\s+car|carro/i.test(text)) name = 'Carro';
  else if (/mi\s+moto|moto/i.test(text)) name = 'Moto';
  else if (/cuenta\s+de\s+ahorro|savings\s+account/i.test(text)) name = 'Cuenta de ahorro';
  else if (/inversión|investment|portafolio/i.test(text)) name = text.match(/inversión\s+en\s+(\w+)/i)?.[1] ? 'Inversión ' + text.match(/inversión\s+en\s+(\w+)/i)![1] : 'Inversión';
  else if (/terreno/i.test(text)) name = 'Terreno';
  else if (/departamento|property/i.test(text)) name = 'Departamento';
  else if (/oro|gold/i.test(text)) name = 'Oro';
  else if (/cripto|crypto/i.test(text)) name = 'Cripto';
  else if (/equipo\s+de\s+cómputo|computer/i.test(text)) name = 'Equipo de cómputo';
  const addAssetMatch = text.match(/(?:agregar\s+activo|add\s+asset)[:\s]+([^,]+?)(?:\s+con\s+|\s*,|\s+\d|$)/i);
  if (addAssetMatch && !name) name = addAssetMatch[1].trim();
  if (!name) name = 'Activo';

  return {
    name: name.trim(),
    ...(value !== undefined && (isDollars ? { valueDollars: value } : { valueLocal: value })),
  };
}

/** Compromiso de pago en lenguaje natural: "acordé pagar 3000 el día 15", "compromiso con BBVA de 5000". */
function parseNaturalCommitment(text: string, debts: Debt[]): { debtId: string; amountLocal?: number; amountDollars?: number } | null {
  const hasCommitment =
    /acordé\s+pag(?:ar|o)|compromiso\s+(?:de\s+)?pago|voy\s+a\s+pag(?:ar|o)|agregar\s+compromiso|add\s+commitment|I\s+have\s+a\s+payment\s+commitment|pagar\s+\d|pay\s+\d|cita\s+de\s+pago/i.test(
      text
    );
  if (!hasCommitment) return null;

  const pagarMatch = text.match(/(?:pagar|pay)\s+(\d+(?:[.,]\d+)?)/i);
  const amount = parseAmountFromText(text) ?? (pagarMatch ? parseFloat(pagarMatch[1].replace(',', '.')) : undefined);
  const isDollars = isDollarsMentioned(text);

  let debt: Debt | undefined;
  const conMatch = text.match(/(?:compromiso\s+)?(?:con\s+)?(?:el\s+)?(?:banco\s+)?([a-záéíóúñ\w]+)/i);
  const paraMatch = text.match(/(?:para\s+la\s+tarjeta|para\s+mi\s+préstamo|de\s+la\s+deuda\s+de)\s+([a-záéíóúñ\w\s]+)/i);
  const debtName = (conMatch?.[1] || paraMatch?.[1] || '').trim();
  if (debtName) debt = debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()));
  if (!debt && debts.length > 0) debt = debts[0];

  if (!debt) return null;
  const params: Record<string, unknown> = { debtId: debt.id };
  if (amount !== undefined) {
    if (isDollars) params.amountDollars = amount;
    else params.amountLocal = amount;
  }
  return params as { debtId: string; amountLocal?: number; amountDollars?: number };
}

/** Llamada al banco en lenguaje natural: "registrar llamada con BBVA", "llamé al banco ayer". */
function parseNaturalCall(text: string, debts: Debt[]): { debtId: string } | null {
  const hasCall =
    /registrar\s+llamada|record\s+call|llamé\s+al\s+banco|llamada\s+con|hablé\s+con|registrar\s+que\s+llamé/i.test(
      text
    );
  if (!hasCall) return null;

  let debt: Debt | undefined;
  const conMatch = text.match(/(?:llamada\s+)?(?:con\s+)?(?:el\s+)?(?:banco\s+)?([a-záéíóúñ\w]+)/i);
  const paraMatch = text.match(/(?:llamada\s+)?(?:para\s+la\s+tarjeta)\s+([a-záéíóúñ\w]+)/i);
  const debtName = (conMatch?.[1] || paraMatch?.[1] || '').trim();
  if (debtName) debt = debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()));
  if (!debt && debts.length > 0) debt = debts[0];
  if (!debt) return null;

  return { debtId: debt.id };
}

export function parseTextToAIAction(text: string, debts: Debt[]): AIAction | null {
  const lower = text.toLowerCase().trim();
  const trimmed = text.trim();

  // —— Resumen y UI (sin captura de datos) ——
  if (/resumen|overview|total|cuánto debo|how much|patrimonio|net worth/i.test(lower)) {
    return { type: 'get_overview' };
  }
  if (/ocultar montos|hide amounts|mostrar montos|show amounts/i.test(lower)) {
    return { type: 'toggle_hide_amounts' };
  }
  if (/sobre|about|método|method/i.test(lower)) {
    return { type: 'navigate', params: { route: '/about' } };
  }
  if (/perfil|profile/i.test(lower)) {
    return { type: 'navigate', params: { route: '/profile' } };
  }
  if (/preferencias|preferences/i.test(lower)) {
    return { type: 'navigate', params: { route: '/preferences' } };
  }

  // —— Agregar deuda: comando directo primero (para "agregar deuda" sin más -> abrir formulario) ——
  if (/^(agregar|add|nueva|new)\s+(deuda|debt)/i.test(trimmed)) {
    const rest = stripPrefix(trimmed, /^(agregar|add|nueva|new)\s+(deuda|debt)\s+/i);
    const { name, amountLocal, amountDollars } = parseNameAndAmount(rest);
    if (!name) return { type: 'navigate', params: { route: '/add-debt' } };
    const params: Record<string, unknown> = { name };
    if (amountLocal != null) params.totalLocal = amountLocal;
    if (amountDollars != null) params.totalDollars = amountDollars;
    return { type: 'add_debt', params };
  }

  // —— Agregar deuda: frases naturales "tengo deuda con BBVA", "debo 15000 en tarjeta" ——
  const naturalDebt = parseNaturalDebt(trimmed);
  if (naturalDebt?.name) {
    const params: Record<string, unknown> = { name: naturalDebt.name };
    if (naturalDebt.totalLocal != null) params.totalLocal = naturalDebt.totalLocal;
    if (naturalDebt.totalDollars != null) params.totalDollars = naturalDebt.totalDollars;
    if (naturalDebt.type) params.type = naturalDebt.type;
    if (naturalDebt.bankName) params.bankName = naturalDebt.bankName;
    return { type: 'add_debt', params };
  }

  // —— Agregar ingreso: frases naturales primero ——
  const naturalIncome = parseNaturalIncome(trimmed);
  if (naturalIncome?.name) {
    const params: Record<string, unknown> = { name: naturalIncome.name };
    if (naturalIncome.amountLocal != null) params.amountLocal = naturalIncome.amountLocal;
    if (naturalIncome.amountDollars != null) params.amountDollars = naturalIncome.amountDollars;
    return { type: 'add_income', params };
  }

  // —— Agregar ingreso: comando directo "agregar ingreso X 5000" ——
  if (/^(agregar|add|nuevo|new)\s+(ingreso|income)/i.test(trimmed)) {
    const rest = stripPrefix(trimmed, /^(agregar|add|nuevo|new)\s+(ingreso|income)\s+/i);
    const { name, amountLocal, amountDollars } = parseNameAndAmount(rest);
    if (!name) return { type: 'navigate', params: { route: '/add-income' } };
    const params: Record<string, unknown> = { name };
    if (amountLocal != null) params.amountLocal = amountLocal;
    if (amountDollars != null) params.amountDollars = amountDollars;
    return { type: 'add_income', params };
  }

  // —— Agregar gasto fijo: frases naturales primero ——
  const naturalExpense = parseNaturalExpense(trimmed);
  if (naturalExpense?.name) {
    const params: Record<string, unknown> = { name: naturalExpense.name };
    if (naturalExpense.amountLocal != null) params.amountLocal = naturalExpense.amountLocal;
    if (naturalExpense.amountDollars != null) params.amountDollars = naturalExpense.amountDollars;
    return { type: 'add_fixed_expense', params };
  }

  // —— Agregar gasto fijo: comando directo ——
  if (/^(agregar|add)\s+(gasto|expense)|gasto fijo|fixed expense/i.test(trimmed)) {
    const rest = stripPrefix(trimmed, /^(agregar|add)\s+(gasto|expense)\s+|gasto fijo\s+|fixed expense\s+/i);
    const { name, amountLocal, amountDollars } = parseNameAndAmount(rest);
    if (!name) return { type: 'navigate', params: { route: '/add-fixed-expense' } };
    const params: Record<string, unknown> = { name };
    if (amountLocal != null) params.amountLocal = amountLocal;
    if (amountDollars != null) params.amountDollars = amountDollars;
    return { type: 'add_fixed_expense', params };
  }

  // —— Agregar activo: frases naturales primero ——
  const naturalAsset = parseNaturalAsset(trimmed);
  if (naturalAsset?.name) {
    const params: Record<string, unknown> = { name: naturalAsset.name };
    if (naturalAsset.valueLocal != null) params.valueLocal = naturalAsset.valueLocal;
    if (naturalAsset.valueDollars != null) params.valueDollars = naturalAsset.valueDollars;
    return { type: 'add_asset', params };
  }

  // —— Agregar activo: comando directo ——
  if (/^(agregar|add|nuevo|new)\s+(activo|asset)/i.test(trimmed)) {
    const rest = stripPrefix(trimmed, /^(agregar|add|nuevo|new)\s+(activo|asset)\s+/i);
    const { name, amountLocal, amountDollars } = parseNameAndAmount(rest);
    if (!name) return { type: 'navigate', params: { route: '/add-asset' } };
    const params: Record<string, unknown> = { name };
    if (amountLocal != null) params.valueLocal = amountLocal;
    if (amountDollars != null) params.valueDollars = amountDollars;
    return { type: 'add_asset', params };
  }

  // —— Compromiso: frases naturales primero ——
  const naturalCommitment = parseNaturalCommitment(trimmed, debts);
  if (naturalCommitment) {
    return { type: 'add_commitment', params: naturalCommitment };
  }

  // —— Compromiso: comando directo "agregar compromiso para [deuda] [monto]" ——
  const commitmentMatch = lower.match(
    /(?:agregar|add|crear|create)\s*(?:compromiso|commitment)\s*(?:para|to|de|for)?\s*(.+?)(?:\s+con|\s+with|\s+de|\s+of)?\s*(\d+(?:[.,]\d+)?)/i
  );
  if (commitmentMatch) {
    const debtName = commitmentMatch[1]?.trim();
    const amount = parseFloat(commitmentMatch[2].replace(',', '.')) || 0;
    const debt = debts.find((d) => d.name.toLowerCase().includes(debtName?.toLowerCase() || ''));
    if (debt && amount > 0) {
      return {
        type: 'add_commitment',
        params: { debtId: debt.id, amountLocal: amount, amountDollars: 0 },
      };
    }
  }

  // —— Completar compromiso: "completar compromiso [deuda]" ——
  if (/completar compromiso|complete commitment|pago realizado|payment made/i.test(lower)) {
    const debtMatch = lower.match(/(?:para|to|de|for)?\s*(.+?)(?:\s+compromiso|\s+commitment)?$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : debts[0];
    if (debt?.commitments?.length) {
      const pending = debt.commitments.find((c) => c.status === 'pending');
      if (pending) {
        return { type: 'complete_commitment', params: { debtId: debt.id, commitmentId: pending.id } };
      }
      return { type: 'navigate', params: { route: `/complete-commitment/${debt.id}/${debt.commitments[0].id}` } };
    }
  }

  // —— Eliminar deuda ——
  if (/eliminar deuda|delete debt|borrar deuda/i.test(lower)) {
    const debtMatch = lower.match(/(?:deuda|debt)?\s*(.+?)$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : null;
    if (debt) {
      return { type: 'delete_debt', params: { debtId: debt.id } };
    }
  }

  // —— Registrar llamada: frases naturales primero ——
  const naturalCall = parseNaturalCall(trimmed, debts);
  if (naturalCall) {
    return { type: 'add_call', params: naturalCall };
  }

  // —— Registrar llamada: comando directo ——
  if (/registrar llamada|record call|llamada/i.test(lower)) {
    const debtMatch = lower.match(/(?:para|to|de|for)?\s*(.+?)$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : debts[0];
    if (debt) {
      return { type: 'add_call', params: { debtId: debt.id } };
    }
  }

  // —— Editar deuda (abrir pantalla) ——
  if (/editar deuda|edit debt/i.test(lower)) {
    const debtMatch = lower.match(/(?:deuda|debt)?\s*(.+?)$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : null;
    if (debt) {
      return { type: 'navigate', params: { route: `/edit-debt/${debt.id}` } };
    }
  }

  // —— Marcar deuda como pagada ——
  if (/completar deuda|complete debt|deuda pagada|debt paid/i.test(lower)) {
    const debtMatch = lower.match(/(?:deuda|debt)?\s*(.+?)$/i);
    const debtName = debtMatch?.[1]?.trim();
    const debt = debtName
      ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase()))
      : null;
    if (debt) {
      return { type: 'complete_debt', params: { debtId: debt.id } };
    }
  }

  return null;
}

/** Construye mensaje de respuesta para el usuario a partir del resultado del ejecutor y la acción. */
export function getMessageForActionResult(
  action: AIAction,
  result: { success: boolean; message?: string; error?: string; data?: unknown },
  lang: 'es' | 'en'
): string {
  if (!result.success) {
    const err = result.error || result.message || '';
    return lang === 'es' ? `Error: ${err}` : `Error: ${err}`;
  }
  if (action.type === 'get_overview' || action.type === 'get_debts') {
    return getSummaryText(lang);
  }
  if (action.type === 'get_state') {
    return lang === 'es' ? 'Estado cargado.' : 'State loaded.';
  }
  if (action.type === 'toggle_hide_amounts') {
    return lang === 'es' ? 'Montos ocultos/mostrados.' : 'Amounts hidden/shown.';
  }
  if (action.type === 'navigate') {
    const route = (action.params?.route as string) || '';
    return lang === 'es' ? `Navegando a ${route}.` : `Navigating to ${route}.`;
  }
  return (result.message as string) || (lang === 'es' ? 'Listo.' : 'Done.');
}
