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

/** Tipos de ingreso soportados por la app. */
type IncomeType = 'salary' | 'freelance' | 'investment' | 'rental' | 'other';
/** Frecuencia de ingreso. */
type IncomeFrequency = 'monthly' | 'weekly' | 'biweekly' | 'yearly' | 'one-time';

/**
 * Extrae nombre, monto, tipo y frecuencia de frases naturales tipo:
 * "tengo un ingreso, trabajo en Forj y gano 5000 al mes"
 */
function parseNaturalIncome(text: string): { name: string; amountLocal?: number; amountDollars?: number; type?: IncomeType; frequency?: IncomeFrequency } | null {
  if (isEditDeleteCompleteIntent(text)) return null;
  const hasIncome =
    /tengo\s+(un\s+)?ingreso|I\s+have\s+(an\s+)?income|trabajo\s+en|work\s+at|gano\s+\$?\d|earn\s+\$?\d|recibo\s+(un\s+)?sueldo|mi\s+salario|me\s+pagan|ingreso\s+de\s+alquiler|ingreso\s+por\s+inversiones|salary|they\s+pay\s+me|empresa\s+se\s+llama|compañía\s+llamada|company\s+called|mi\s+ingreso/i.test(
      text
    );
  if (!hasIncome) return null;

  let name = '';
  let amount: number | undefined;
  let isDollars = isDollarsMentioned(text);
  let type: IncomeType = 'salary';
  let frequency: IncomeFrequency = 'monthly';

  // Tipo de ingreso
  if (/freelance|por\s+cuenta\s+propia|self[- ]employed/i.test(text)) type = 'freelance';
  else if (/alquiler|rental|renta/i.test(text)) type = 'rental';
  else if (/inversiones|investment|dividendos/i.test(text)) type = 'investment';
  else if (/sueldo|salario|salary|empleo|trabajo\s+en|work\s+at/i.test(text)) type = 'salary';

  // Frecuencia
  if (/semanal|weekly|semana|cada\s+semana/i.test(text)) frequency = 'weekly';
  else if (/quincenal|biweekly|quincena|cada\s+quincena/i.test(text)) frequency = 'biweekly';
  else if (/anual|yearly|al\s+año|per\s+year/i.test(text)) frequency = 'yearly';
  else if (/al\s+mes|mensual|monthly|mes|cada\s+mes|per\s+month/i.test(text)) frequency = 'monthly';

  // Nombre: "empresa llamada X" / "company called X" / "trabajo en X"
  const llamadaMatch = text.match(/(?:empresa\s+)?(?:se\s+)?llamada\s+([^,.\d]+?)(?=\s+y\s+|\s*,|\s+gano|\s+earn|$)/i);
  if (llamadaMatch) name = llamadaMatch[1].trim();
  const calledEn = text.match(/(?:company\s+)?called\s+([^,.\d]+?)(?=\s+and\s+|\s*,|\s+earn|$)/i);
  if (calledEn && !name) name = calledEn[1].trim();
  const empresaMatch = text.match(/(?:empresa|compañía)\s+(?:que\s+)?(?:se\s+)?llama\s+([a-záéíóúñ\w\s]+?)(?=\s+,|\s+y\s+|\s*\.|$)/i);
  if (empresaMatch && !name) name = empresaMatch[1].trim();
  const trabajoMatch = text.match(/(?:trabajo\s+en\s+(?:una\s+empresa\s+)?(?:llamada\s+)?)([a-záéíóúñ\w\s]+?)(?=\s+y\s+|\s*,|\s+gano|$)/i);
  if (trabajoMatch && !name) name = trabajoMatch[1].trim();
  const workMatch = text.match(/(?:work\s+at\s+(?:a\s+company\s+)?(?:called\s+)?)([a-záéíóúñ\w\s]+?)(?=\s+and\s+|\s*,|\s+earn|$)/i);
  if (workMatch && !name) name = workMatch[1].trim();
  const empleadoMatch = text.match(/(?:empleado\s+de|trabajo\s+para\s+(?:una\s+)?(?:empresa\s+)?(?:llamada\s+)?)([a-záéíóúñ\w\s]+?)(?=\s+,|\s+y\s+|\s*\.|$)/i);
  if (empleadoMatch && !name) name = empleadoMatch[1].trim();
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

  const result: { name: string; amountLocal?: number; amountDollars?: number; type?: IncomeType; frequency?: IncomeFrequency } = {
    name: name.trim() || 'Ingreso',
    type,
    frequency,
    ...(amount !== undefined && (isDollars ? { amountDollars: amount } : { amountLocal: amount })),
  };
  return result;
}

/** Extrae día del mes (1-31) para paymentDate/cutDate: "cada 30", "día 15", "el 20". */
function parseDayOfMonth(text: string): string | undefined {
  const cada = text.match(/(?:pago\s+)?cada\s+(\d{1,2})\b/i);
  if (cada) {
    const d = parseInt(cada[1], 10);
    return d >= 1 && d <= 31 ? String(d) : undefined;
  }
  const dia = text.match(/(?:día|dia|el)\s+(\d{1,2})\b/i);
  if (dia) {
    const d = parseInt(dia[1], 10);
    return d >= 1 && d <= 31 ? String(d) : undefined;
  }
  const corte = text.match(/cort[ae]\s+(?:el\s+)?(\d{1,2})\b/i);
  if (corte) {
    const d = parseInt(corte[1], 10);
    return d >= 1 && d <= 31 ? String(d) : undefined;
  }
  return undefined;
}

/** Indica si el texto expresa intención de editar/eliminar/completar (no agregar). */
function isEditDeleteCompleteIntent(text: string): boolean {
  return /editar|modificar|cambiar|actualizar|eliminar|borrar|quitar|completar|liquidar|cerrar|dar de baja|edit|delete|modify|update|remove|complete/i.test(text);
}

/** Deuda en lenguaje natural: incluye cuota mensual, fecha de pago, corte, tasa de interés. */
function parseNaturalDebt(text: string): {
  name: string;
  totalLocal?: number;
  totalDollars?: number;
  type?: 'prestamo' | 'tarjeta';
  bankName?: string;
  localFee?: number;
  dollarFee?: number;
  paymentDate?: string;
  cutDate?: string;
  interestRate?: number;
} | null {
  if (isEditDeleteCompleteIntent(text)) return null;
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

  // Cuota / pago mensual (solo de frases explícitas para no confundir con monto total)
  let localFee: number | undefined;
  let dollarFee: number | undefined;
  const pagoMensualMatch = text.match(/(?:pago\s+)?(?:mensual\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:mil|millones?)?\s*(?:colones|pesos|dólares|dollars)?\s*(?:de\s+)?(?:pago\s+)?(?:mensual|al\s+mes)?/i);
  const cuotaMatch = text.match(/cuota\s+(?:de\s+)?(\d+(?:[.,]\d+)?)\s*(?:mil|millones?)?\s*(?:colones|pesos|dólares|dollars)?/i);
  const pagoMatch = text.match(/pago\s+(\d+(?:[.,]\d+)?)\s*(?:mil|millones?)?\s*(?:colones|pesos|dólares|dollars)?\s*(?:de\s+pago\s+)?(?:mensual|al\s+mes)?/i);
  const pagoCadaMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(?:mil|millones?)?\s*(?:colones|pesos)?\s*de\s+pago\s+(?:mensual|mensuales)/i);
  let feeAmount: number | undefined;
  let feeIsDollars = false;
  if (pagoMensualMatch) {
    const raw = pagoMensualMatch[1].replace(',', '.');
    const mult = /mil/i.test(pagoMensualMatch[0]) ? 1000 : /mill[oó]n/i.test(pagoMensualMatch[0]) ? 1000000 : 1;
    feeAmount = parseFloat(raw) * mult;
    feeIsDollars = /dólares|dollars/i.test(pagoMensualMatch[0]);
  } else if (cuotaMatch) {
    const raw = cuotaMatch[1].replace(',', '.');
    const mult = /mil/i.test(cuotaMatch[0]) ? 1000 : /mill[oó]n/i.test(cuotaMatch[0]) ? 1000000 : 1;
    feeAmount = parseFloat(raw) * mult;
    feeIsDollars = /dólares|dollars/i.test(cuotaMatch[0]);
  } else if (pagoMatch) {
    const raw = pagoMatch[1].replace(',', '.');
    const mult = /mil/i.test(pagoMatch[0]) ? 1000 : /mill[oó]n/i.test(pagoMatch[0]) ? 1000000 : 1;
    feeAmount = parseFloat(raw) * mult;
    feeIsDollars = /dólares|dollars/i.test(pagoMatch[0]);
  } else if (pagoCadaMatch) {
    const raw = pagoCadaMatch[1].replace(',', '.');
    const mult = /mil/i.test(pagoCadaMatch[0]) ? 1000 : /mill[oó]n/i.test(pagoCadaMatch[0]) ? 1000000 : 1;
    feeAmount = parseFloat(raw) * mult;
    feeIsDollars = false;
  }
  if (feeAmount != null) {
    if (feeIsDollars) dollarFee = feeAmount;
    else localFee = feeAmount;
  }

  // Fecha de pago (día del mes)
  const paymentDate = parseDayOfMonth(text);

  // Fecha de corte (tarjetas)
  let cutDate: string | undefined;
  const corteMatch = text.match(/cort[ae]\s+(?:el\s+)?(\d{1,2})\b/i);
  if (corteMatch) {
    const d = parseInt(corteMatch[1], 10);
    if (d >= 1 && d <= 31) cutDate = String(d);
  }

  // Tasa de interés
  let interestRate: number | undefined;
  const tasaMatch = text.match(/(?:tasa|interés|interes)\s+(?:del\s+)?(\d+(?:[.,]\d+)?)\s*%?/i);
  const porcMatch = text.match(/(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s+)?(?:interés|interes)/i);
  if (tasaMatch) interestRate = parseFloat(tasaMatch[1].replace(',', '.'));
  else if (porcMatch) interestRate = parseFloat(porcMatch[1].replace(',', '.'));

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
  if (addDebtMatch && !name) name = addDebtMatch[1].trim();
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
  if (localFee != null) params.localFee = localFee;
  if (dollarFee != null) params.dollarFee = dollarFee;
  if (paymentDate) params.paymentDate = paymentDate;
  if (cutDate) params.cutDate = cutDate;
  if (interestRate != null) params.interestRate = interestRate;
  return params as {
    name: string;
    totalLocal?: number;
    totalDollars?: number;
    type?: 'prestamo' | 'tarjeta';
    bankName?: string;
    localFee?: number;
    dollarFee?: number;
    paymentDate?: string;
    cutDate?: string;
    interestRate?: number;
  };
}

/** Gasto fijo en lenguaje natural: "tengo un gasto de renta", "pago 8000 de internet el día 5". */
function parseNaturalExpense(text: string): { name: string; amountLocal?: number; amountDollars?: number; dueDate?: string; category?: string } | null {
  if (isEditDeleteCompleteIntent(text)) return null;
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

  const dueDate = parseDayOfMonth(text);
  const category = name.trim() || undefined;

  const result: { name: string; amountLocal?: number; amountDollars?: number; dueDate?: string; category?: string } = {
    name: name.trim(),
    ...(amount !== undefined && (isDollars ? { amountDollars: amount } : { amountLocal: amount })),
  };
  if (dueDate) result.dueDate = dueDate;
  if (category) result.category = category;
  return result;
}

/** Tipos de activo soportados por la app. */
type AssetType = 'property' | 'vehicle' | 'investment' | 'savings' | 'other';

/** Activo en lenguaje natural: "tengo un activo, es mi casa, valuada en 2 millones". */
function parseNaturalAsset(text: string): { name: string; valueLocal?: number; valueDollars?: number; type?: AssetType; purchaseDate?: string } | null {
  if (isEditDeleteCompleteIntent(text)) return null;
  const hasAsset =
    /tengo\s+(un\s+)?activo|I\s+have\s+an\s+asset|vale\s+(?:aproximadamente\s+)?\d|worth\s+\d|valuada\s+en|valued\s+at|agregar\s+activo|add\s+asset|mi\s+(?:casa|carro|moto)|cuenta\s+de\s+ahorro|inversión|portafolio/i.test(
      text
    );
  if (!hasAsset) return null;

  let name = '';
  let type: AssetType = 'other';
  const amount = parseAmountFromText(text);
  const isDollars = isDollarsMentioned(text);

  const valuadaMatch = text.match(/(?:valuada\s+en|valued\s+at|worth\s+about?)\s*\$?\s*([\d.,]+\s*(?:millones?|mil)?)/i);
  const valeMatch = text.match(/(?:vale\s+(?:aproximadamente\s+)?|worth\s+)\$?\s*([\d.,]+\s*(?:millones?|mil)?)/i);
  const value = amount ?? (valuadaMatch ? parseAmountFromText(valuadaMatch[0]) : undefined) ?? (valeMatch ? parseAmountFromText(valeMatch[0]) : undefined);

  if (/es\s+mi\s+casa|mi\s+casa|my\s+house|house|departamento|property/i.test(text)) {
    name = /departamento/i.test(text) ? 'Departamento' : 'Casa';
    type = 'property';
  } else if (/mi\s+carro|my\s+car|carro|moto/i.test(text)) {
    name = /moto/i.test(text) ? 'Moto' : 'Carro';
    type = 'vehicle';
  } else if (/cuenta\s+de\s+ahorro|savings\s+account/i.test(text)) {
    name = 'Cuenta de ahorro';
    type = 'savings';
  } else if (/inversión|investment|portafolio|acciones|fondos/i.test(text)) {
    name = text.match(/inversión\s+en\s+(\w+)/i)?.[1] ? 'Inversión ' + text.match(/inversión\s+en\s+(\w+)/i)![1] : 'Inversión';
    type = 'investment';
  } else if (/terreno/i.test(text)) {
    name = 'Terreno';
    type = 'property';
  } else if (/oro|gold/i.test(text)) {
    name = 'Oro';
  } else if (/cripto|crypto/i.test(text)) {
    name = 'Cripto';
    type = 'investment';
  } else if (/equipo\s+de\s+cómputo|computer/i.test(text)) {
    name = 'Equipo de cómputo';
  }
  const addAssetMatch = text.match(/(?:agregar\s+activo|add\s+asset)[:\s]+([^,]+?)(?:\s+con\s+|\s*,|\s+\d|$)/i);
  if (addAssetMatch && !name) name = addAssetMatch[1].trim();
  if (!name) name = 'Activo';

  let purchaseDate: string | undefined;
  const fechaCompraMatch = text.match(/(?:comprado|compra|adquirido)\s+(?:el\s+)?(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/i);
  if (fechaCompraMatch) {
    const [, d, m, y] = fechaCompraMatch;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    purchaseDate = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const result: { name: string; valueLocal?: number; valueDollars?: number; type?: AssetType; purchaseDate?: string } = {
    name: name.trim(),
    type,
    ...(value !== undefined && (isDollars ? { valueDollars: value } : { valueLocal: value })),
  };
  if (purchaseDate) result.purchaseDate = purchaseDate;
  return result;
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

export interface ParseTextContext {
  /** Compromisos (deuda + commitmentId) para editar/eliminar/completar por voz */
  commitments?: { debtId: string; debtName: string; commitmentId: string; date?: string }[];
  /** Llamadas al banco (deuda + callId) para editar/eliminar por voz */
  calls?: { debtId: string; debtName: string; callId: string; date?: string }[];
  fixedExpenses?: { id: string; name: string }[];
  assets?: { id: string; name: string }[];
  incomes?: { id: string; name: string }[];
}

export function parseTextToAIAction(
  text: string,
  debts: Debt[],
  context?: ParseTextContext
): AIAction | null {
  const lower = text.toLowerCase().trim();
  const trimmed = text.trim();
  const fixedExpenses = context?.fixedExpenses ?? [];
  const assets = context?.assets ?? [];
  const incomes = context?.incomes ?? [];
  const commitments = context?.commitments ?? [];
  const calls = context?.calls ?? [];

  // —— Navegación: inicio, agregar pantallas ——
  if (/ir al inicio|abrir dashboard|volver al inicio|go to dashboard|dashboard/i.test(lower) && !/deuda|debt|gasto|income|asset/i.test(lower)) {
    return { type: 'navigate', params: { route: '/dashboard' } };
  }
  if (/^(agregar|add|nueva|new)\s+(deuda|debt)$/i.test(trimmed) || /abrir (formulario |pantalla )?para agregar deuda/i.test(lower)) {
    return { type: 'navigate', params: { route: '/add-debt' } };
  }
  if (/^(agregar|add)\s+(gasto|expense)$/i.test(trimmed) && !/\d/.test(trimmed)) {
    return { type: 'navigate', params: { route: '/add-fixed-expense' } };
  }
  if (/^(agregar|add|nuevo|new)\s+(activo|asset)$/i.test(trimmed) && !/\d/.test(trimmed)) {
    return { type: 'navigate', params: { route: '/add-asset' } };
  }
  if (/^(agregar|add|nuevo|new)\s+(ingreso|income)$/i.test(trimmed) && !/\d/.test(trimmed)) {
    return { type: 'navigate', params: { route: '/add-income' } };
  }
  if (/^(agregar|add|crear)\s+(compromiso|commitment)$/i.test(trimmed) && !/\d/.test(trimmed) && debts.length > 0) {
    return { type: 'navigate', params: { route: `/add-commitment/${debts[0].id}` } };
  }
  const addCommitmentForMatch = trimmed.match(/^(agregar|add|crear)\s+(compromiso|commitment)\s+(?:para|de|to|for)\s+([a-záéíóúñ\w\s]+?)$/i);
  if (addCommitmentForMatch && !/\d/.test(trimmed) && debts.length > 0) {
    const debtName = addCommitmentForMatch[3]?.trim();
    const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : debts[0];
    if (debt) return { type: 'navigate', params: { route: `/add-commitment/${debt.id}` } };
  }
  if (/^(agregar|add|registrar)\s+(llamada|call)$/i.test(trimmed) && debts.length > 0) {
    return { type: 'navigate', params: { route: `/add-call/${debts[0].id}` } };
  }
  const addCallForMatch = trimmed.match(/^(agregar|add|registrar)\s+(llamada|call)\s+(?:para|de|con|to|for)\s+([a-záéíóúñ\w\s]+?)$/i);
  if (addCallForMatch && debts.length > 0) {
    const debtName = addCallForMatch[3]?.trim();
    const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : debts[0];
    if (debt) return { type: 'navigate', params: { route: `/add-call/${debt.id}` } };
  }

  // —— Resumen y UI (sin captura de datos) ——
  if (/resumen|overview|total|cuánto debo|how much|patrimonio|net worth|dame el resumen|ver resumen|cuál es mi patrimonio/i.test(lower)) {
    return { type: 'get_overview' };
  }
  if (/listar (mis )?deudas|ver deudas|get debts/i.test(lower)) {
    return { type: 'get_debts' };
  }
  if (/ocultar montos|hide amounts|mostrar montos|show amounts|no quiero ver los montos|quiero ver los montos/i.test(lower)) {
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

  // —— Eliminar TODAS las entidades (por voz: "eliminar todas las deudas", "borrar todos los gastos", etc.) ——
  if (/eliminar\s+(todas?|todos)\s+(las?|los)\s+deudas?|borrar\s+(todas?|todos)\s+(las?|los)\s+deudas?|quitar\s+todas?\s+las?\s+deudas?|delete\s+all\s+debts?|remove\s+all\s+debts?/i.test(lower)) {
    return { type: 'delete_all_debts', params: {} };
  }
  if (/eliminar\s+(todas?|todos)\s+(las?|los)\s+gastos?|borrar\s+(todas?|todos)\s+(las?|los)\s+gastos?|quitar\s+todas?\s+las?\s+gastos?|delete\s+all\s+(fixed\s+)?expenses?|remove\s+all\s+expenses?/i.test(lower)) {
    return { type: 'delete_all_fixed_expenses', params: {} };
  }
  if (/eliminar\s+(todas?|todos)\s+(las?|los)\s+activos?|borrar\s+(todas?|todos)\s+(las?|los)\s+activos?|quitar\s+todas?\s+las?\s+activos?|delete\s+all\s+assets?|remove\s+all\s+assets?/i.test(lower)) {
    return { type: 'delete_all_assets', params: {} };
  }
  if (/eliminar\s+(todas?|todos)\s+(las?|los)\s+ingresos?|borrar\s+(todas?|todos)\s+(las?|los)\s+ingresos?|quitar\s+todas?\s+las?\s+ingresos?|delete\s+all\s+incomes?|remove\s+all\s+incomes?/i.test(lower)) {
    return { type: 'delete_all_incomes', params: {} };
  }

  // —— Editar / eliminar / completar DEUDA (ANTES de "agregar" para no crear en vez de editar) ——
  const extractDebtName = (): string | null => {
    const withCon = lower.match(/(?:deuda|debt)\s+con\s+([a-záéíóúñ\w\s]+?)(?:\s*$|\.|,)/i);
    if (withCon?.[1]) return withCon[1].trim();
    // "la deuda de BBVA", "deuda del Scotiabank", "la deuda BBVA"
    const deLaDeuda = lower.match(/(?:deuda|debt)\s+(?:de\s+|del\s+)([a-záéíóúñ\w\s]+?)(?:\s*$|\.|,)/i);
    if (deLaDeuda?.[1]) return deLaDeuda[1].trim();
    const laDeudaDe = lower.match(/la\s+(?:deuda|debt)\s+de\s+([a-záéíóúñ\w\s]+?)(?:\s*$|\.|,)/i);
    if (laDeudaDe?.[1]) return laDeudaDe[1].trim();
    // "editar la deuda X", "modificar la deuda de X", "quiero editar la deuda X"
    const afterVerb = lower.match(/(?:quiero\s+|necesito\s+|puedo\s+)?(?:editar|modificar|cambiar|actualizar|eliminar|borrar|completar|edit|delete|complete)\s+(?:la\s+|mi\s+)?(?:deuda\s+)?(?:de\s+)?(?:la\s+)?(?:tarjeta\s+)?([a-záéíóúñ\w\s]+?)(?:\s*$|\.|,)/i);
    if (afterVerb?.[1]) return afterVerb[1].trim();
    const deDeuda = lower.match(/(?:deuda|debt)\s+(?:de\s+|del\s+)?([a-záéíóúñ\w\s]+?)(?:\s*$|\.|,)/i);
    if (deDeuda?.[1]) return deDeuda[1].trim();
    // "editar la tarjeta BBVA", "modificar tarjeta Scotiabank"
    const tarjetaMatch = lower.match(/(?:la\s+)?(?:tarjeta\s+)(?:de\s+)?([a-záéíóúñ\w\s]+?)(?:\s*$|\.|,)/i);
    if (tarjetaMatch?.[1]) return tarjetaMatch[1].trim();
    return null;
  };

  const isEditDebtIntent = /(?:quiero\s+|necesito\s+|puedo\s+)?(?:editar|modificar|cambiar|actualizar|corregir|arreglar|edit|modify|update)/i.test(lower);
  const mentionsDebt = /deuda|debt|tarjeta|préstamo/i.test(lower);

  if (isEditDebtIntent && mentionsDebt) {
    const debtName = extractDebtName();
    let debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : null;
    if (!debt && debts.length > 0) debt = debts[0]; // "editar una deuda" / "editar la deuda" sin nombre → primera
    if (debt) return { type: 'navigate', params: { route: `/edit-debt/${debt.id}` } };
  }
  if (/eliminar|borrar|quitar|delete|remove/i.test(lower) && mentionsDebt) {
    const debtName = extractDebtName();
    const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : null;
    if (debt) return { type: 'delete_debt', params: { debtId: debt.id } };
  }
  if (/completar|cerrar|liquidar|complete|paid|pagada|marcar\s+(?:la\s+)?(?:deuda\s+)?como\s+pagada|ya\s+pagu[eé]/i.test(lower) && mentionsDebt) {
    const debtName = extractDebtName();
    const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : debts[0];
    if (debt) return { type: 'complete_debt', params: { debtId: debt.id } };
  }

  // —— Actualizaciones parciales por voz: "cambiar la cuota de X a N", "cambiar el gasto X a N", etc. ——
  const updateAmount = parseAmountFromText(trimmed);
  if (updateAmount != null) {
    if (/(?:cambiar|actualizar|poner)\s+(?:la\s+)?(?:cuota|pago\s+mensual)\s+(?:de\s+)?(?:la\s+)?(?:deuda\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+/i.test(lower) && mentionsDebt) {
      const debtNameMatch = lower.match(/(?:cuota|pago\s+mensual)\s+(?:de\s+)?(?:la\s+)?(?:deuda\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+/i);
      const debtName = debtNameMatch?.[1]?.trim();
      const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : debts[0];
      if (debt) {
        const isDollars = isDollarsMentioned(trimmed);
        return { type: 'edit_debt', params: { debtId: debt.id, ...(isDollars ? { dollarFee: updateAmount } : { localFee: updateAmount }) } };
      }
    }
    if (/(?:cambiar|actualizar)\s+(?:la\s+)?fecha\s+(?:de\s+pago)?\s+(?:de\s+)?(?:la\s+)?(?:deuda\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+(?:al\s+)?d[ií]a\s+/i.test(lower)) {
      const dayMatch = trimmed.match(/(?:al\s+)?d[ií]a\s+(\d{1,2})\b/i) ?? trimmed.match(/\b(\d{1,2})\s*$/);
      const day = dayMatch ? parseInt(dayMatch[1], 10) : undefined;
      const debtNameMatch = lower.match(/(?:deuda\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+(?:al\s+)?d[ií]a/i);
      const debtName = debtNameMatch?.[1]?.trim();
      const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : debts[0];
      if (debt && day != null && day >= 1 && day <= 31) return { type: 'edit_debt', params: { debtId: debt.id, paymentDate: String(day) } };
    }
    if (/(?:cambiar|actualizar)\s+(?:el\s+)?monto\s+(?:del\s+)?(?:compromiso\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+/i.test(lower) && commitments.length > 0) {
      const debtNameMatch = lower.match(/(?:compromiso\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+/i);
      const debtName = debtNameMatch?.[1]?.trim();
      const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : null;
      if (debt) {
        const commitmentForDebt = commitments.find((c) => c.debtId === debt.id);
        if (commitmentForDebt) {
          const isDollars = isDollarsMentioned(trimmed);
          return { type: 'edit_commitment', params: { debtId: debt.id, commitmentId: commitmentForDebt.commitmentId, ...(isDollars ? { amountDollars: updateAmount } : { amountLocal: updateAmount }) } };
        }
      }
    }
    if (/(?:cambiar|actualizar)\s+(?:el\s+)?(?:gasto\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+\d/i.test(lower) && fixedExpenses.length > 0) {
      const nameMatch = lower.match(/(?:gasto\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+/i);
      const name = nameMatch?.[1]?.trim();
      const expense = name ? fixedExpenses.find((e) => e.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (expense) {
        const isDollars = isDollarsMentioned(trimmed);
        return { type: 'edit_fixed_expense', params: { expenseId: expense.id, ...(isDollars ? { amountDollars: updateAmount } : { amountLocal: updateAmount }) } };
      }
    }
    if (/(?:cambiar|actualizar)\s+(?:el\s+)?valor\s+(?:del\s+)?(?:activo\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+\d/i.test(lower) && assets.length > 0) {
      const nameMatch = lower.match(/(?:activo\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+/i);
      const name = nameMatch?.[1]?.trim();
      const asset = name ? assets.find((a) => a.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (asset) {
        const isDollars = isDollarsMentioned(trimmed);
        return { type: 'edit_asset', params: { assetId: asset.id, ...(isDollars ? { valueDollars: updateAmount } : { valueLocal: updateAmount }) } };
      }
    }
    if (/(?:cambiar|actualizar)\s+(?:mi\s+)?(?:ingreso\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+\d/i.test(lower) && incomes.length > 0) {
      const nameMatch = lower.match(/(?:ingreso\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+?)\s+a\s+/i);
      const name = nameMatch?.[1]?.trim();
      const income = name ? incomes.find((i) => i.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (income) {
        const isDollars = isDollarsMentioned(trimmed);
        return { type: 'edit_income', params: { incomeId: income.id, ...(isDollars ? { amountDollars: updateAmount } : { amountLocal: updateAmount }) } };
      }
    }
  }

  // —— Compromisos: editar, eliminar, completar (por nombre de deuda; requiere context.commitments para ID) ——
  const extractDebtNameFromCommitmentOrCall = (): string | null => {
    const m = lower.match(/(?:compromiso|commitment|llamada|call)\s+(?:de\s+|del\s+)?(?:la\s+deuda\s+)?([a-záéíóúñ\w\s]+?)(?:\s*$|\.|,)/i);
    if (m?.[1]) return m[1].trim();
    const m2 = lower.match(/(?:editar|eliminar|borrar|completar|edit|delete|complete)\s+(?:el\s+)?(?:compromiso|commitment|llamada|call)\s+(?:de\s+)?([a-záéíóúñ\w\s]+?)(?:\s*$|\.|,)/i);
    if (m2?.[1]) return m2[1].trim();
    return null;
  };
  if (/(?:editar|modificar|edit)\s+(?:el\s+)?(?:compromiso|commitment)/i.test(lower)) {
    const debtName = extractDebtNameFromCommitmentOrCall();
    const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : debts[0];
    if (debt) {
      const commitmentForDebt = commitments.find((c) => c.debtId === debt.id);
      if (commitmentForDebt) return { type: 'navigate', params: { route: `/edit-commitment/${debt.id}/${commitmentForDebt.commitmentId}` } };
      return { type: 'navigate', params: { route: `/edit-debt/${debt.id}` } };
    }
  }
  if (/(?:eliminar|borrar|quitar|delete|remove)\s+(?:el\s+)?(?:compromiso|commitment)/i.test(lower)) {
    const debtName = extractDebtNameFromCommitmentOrCall();
    const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : null;
    if (debt) {
      const commitmentForDebt = commitments.find((c) => c.debtId === debt.id);
      if (commitmentForDebt) return { type: 'delete_commitment', params: { debtId: debt.id, commitmentId: commitmentForDebt.commitmentId } };
    }
  }
  if (/(?:editar|modificar|edit)\s+(?:la\s+)?(?:llamada|call)/i.test(lower)) {
    const debtName = extractDebtNameFromCommitmentOrCall();
    const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : debts[0];
    if (debt) {
      const callForDebt = calls.find((c) => c.debtId === debt.id);
      if (callForDebt) return { type: 'navigate', params: { route: `/edit-call/${debt.id}/${callForDebt.callId}` } };
      return { type: 'navigate', params: { route: `/edit-debt/${debt.id}` } };
    }
  }
  if (/(?:eliminar|borrar|quitar|delete|remove)\s+(?:la\s+)?(?:llamada|call)/i.test(lower)) {
    const debtName = extractDebtNameFromCommitmentOrCall();
    const debt = debtName ? debts.find((d) => d.name.toLowerCase().includes(debtName.toLowerCase())) : null;
    if (debt) {
      const callForDebt = calls.find((c) => c.debtId === debt.id);
      if (callForDebt) return { type: 'delete_call', params: { debtId: debt.id, callId: callForDebt.callId } };
    }
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

  // —— Agregar deuda: frases naturales (incl. cuota, fecha pago, corte, interés) ——
  const naturalDebt = parseNaturalDebt(trimmed);
  if (naturalDebt?.name) {
    const params: Record<string, unknown> = { name: naturalDebt.name };
    if (naturalDebt.totalLocal != null) params.totalLocal = naturalDebt.totalLocal;
    if (naturalDebt.totalDollars != null) params.totalDollars = naturalDebt.totalDollars;
    if (naturalDebt.type) params.type = naturalDebt.type;
    if (naturalDebt.bankName) params.bankName = naturalDebt.bankName;
    if (naturalDebt.localFee != null) params.localFee = naturalDebt.localFee;
    if (naturalDebt.dollarFee != null) params.dollarFee = naturalDebt.dollarFee;
    if (naturalDebt.paymentDate) params.paymentDate = naturalDebt.paymentDate;
    if (naturalDebt.cutDate) params.cutDate = naturalDebt.cutDate;
    if (naturalDebt.interestRate != null) params.interestRate = naturalDebt.interestRate;
    return { type: 'add_debt', params };
  }

  // —— Agregar ingreso: frases naturales (incl. tipo y frecuencia) ——
  const naturalIncome = parseNaturalIncome(trimmed);
  if (naturalIncome?.name) {
    const params: Record<string, unknown> = { name: naturalIncome.name };
    if (naturalIncome.amountLocal != null) params.amountLocal = naturalIncome.amountLocal;
    if (naturalIncome.amountDollars != null) params.amountDollars = naturalIncome.amountDollars;
    if (naturalIncome.type) params.type = naturalIncome.type;
    if (naturalIncome.frequency) params.frequency = naturalIncome.frequency;
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

  // —— Agregar gasto fijo: frases naturales (incl. dueDate, category) ——
  const naturalExpense = parseNaturalExpense(trimmed);
  if (naturalExpense?.name) {
    const params: Record<string, unknown> = { name: naturalExpense.name };
    if (naturalExpense.amountLocal != null) params.amountLocal = naturalExpense.amountLocal;
    if (naturalExpense.amountDollars != null) params.amountDollars = naturalExpense.amountDollars;
    if (naturalExpense.dueDate) params.dueDate = naturalExpense.dueDate;
    if (naturalExpense.category) params.category = naturalExpense.category;
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

  // —— Agregar activo: frases naturales (incl. type, purchaseDate) ——
  const naturalAsset = parseNaturalAsset(trimmed);
  if (naturalAsset?.name) {
    const params: Record<string, unknown> = { name: naturalAsset.name };
    if (naturalAsset.valueLocal != null) params.valueLocal = naturalAsset.valueLocal;
    if (naturalAsset.valueDollars != null) params.valueDollars = naturalAsset.valueDollars;
    if (naturalAsset.type) params.type = naturalAsset.type;
    if (naturalAsset.purchaseDate) params.purchaseDate = naturalAsset.purchaseDate;
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
    const deMatch = lower.match(/(?:completar|complete)\s+(?:compromiso|commitment)\s+(?:de\s+|del\s+|para\s+|to\s+|for\s+)([a-záéíóúñ\w\s]+?)$/i);
    const debtName = deMatch?.[1]?.trim() ?? lower.match(/(?:para|to|de|for)\s+([a-záéíóúñ\w\s]+?)(?:\s+compromiso|\s+commitment)?$/i)?.[1]?.trim();
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

  // —— Editar / eliminar gasto fijo (por nombre, requiere context.fixedExpenses) ——
  if (fixedExpenses.length > 0) {
    if (/editar (el )?gasto|edit (fixed )?expense|modificar gasto|actualizar gasto/i.test(lower)) {
      const nameMatch = lower.match(/(?:gasto|expense)\s+(?:de\s+|del\s+)?([a-záéíóúñ\w\s]+?)(?:\s+$|\.|,)/i) ?? lower.match(/(?:editar|edit|modificar|actualizar)\s+(?:el\s+)?(?:gasto\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+)/i);
      const name = nameMatch?.[1]?.trim();
      const expense = name ? fixedExpenses.find((e) => e.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (expense) return { type: 'navigate', params: { route: `/edit-fixed-expense/${expense.id}` } };
    }
    if (/eliminar (el )?gasto|borrar gasto|delete (fixed )?expense|quitar (el )?gasto/i.test(lower)) {
      const nameMatch = lower.match(/(?:gasto|expense)\s+(?:de\s+|del\s+)?([a-záéíóúñ\w\s]+?)(?:\s+$|\.|,)/i) ?? lower.match(/(?:eliminar|borrar|delete|quitar)\s+(?:el\s+)?(?:gasto\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+)/i);
      const name = nameMatch?.[1]?.trim();
      const expense = name ? fixedExpenses.find((e) => e.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (expense) return { type: 'delete_fixed_expense', params: { expenseId: expense.id } };
    }
  }

  // —— Editar / eliminar / liquidar activo (por nombre, requiere context.assets) ——
  if (assets.length > 0) {
    if (/editar (el )?activo|edit asset|modificar activo|actualizar activo|cambiar (valor del )?activo/i.test(lower)) {
      const nameMatch = lower.match(/(?:activo|asset)\s+(?:de\s+|del\s+)?([a-záéíóúñ\w\s]+?)(?:\s+$|\.|,)/i) ?? lower.match(/(?:editar|edit|modificar|actualizar)\s+(?:el\s+)?(?:activo\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+)/i);
      const name = nameMatch?.[1]?.trim();
      const asset = name ? assets.find((a) => a.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (asset) return { type: 'navigate', params: { route: `/edit-asset/${asset.id}` } };
    }
    if (/eliminar (el )?activo|borrar activo|delete asset|quitar (el )?activo/i.test(lower)) {
      const nameMatch = lower.match(/(?:activo|asset)\s+(?:de\s+|del\s+)?([a-záéíóúñ\w\s]+?)(?:\s+$|\.|,)/i) ?? lower.match(/(?:eliminar|borrar|delete|quitar)\s+(?:el\s+)?(?:activo\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+)/i);
      const name = nameMatch?.[1]?.trim();
      const asset = name ? assets.find((a) => a.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (asset) return { type: 'delete_asset', params: { assetId: asset.id } };
    }
    if (/liquidar (el )?activo|completar activo|complete asset|vender (el )?activo|dar de baja activo/i.test(lower)) {
      const nameMatch = lower.match(/(?:activo|asset)\s+(?:de\s+|del\s+)?([a-záéíóúñ\w\s]+?)(?:\s+$|\.|,)/i) ?? lower.match(/(?:liquidar|completar|complete|vender)\s+(?:el\s+)?(?:activo\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+)/i);
      const name = nameMatch?.[1]?.trim();
      const asset = name ? assets.find((a) => a.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (asset) return { type: 'complete_asset', params: { assetId: asset.id } };
    }
  }

  // —— Editar / eliminar ingreso (por nombre, requiere context.incomes) ——
  if (incomes.length > 0) {
    if (/editar (el )?ingreso|edit income|modificar ingreso|actualizar ingreso|cambiar ingreso/i.test(lower)) {
      const nameMatch = lower.match(/(?:ingreso|income)\s+(?:de\s+|del\s+)?([a-záéíóúñ\w\s]+?)(?:\s+$|\.|,)/i) ?? lower.match(/(?:editar|edit|modificar|actualizar)\s+(?:el\s+)?(?:ingreso\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+)/i);
      const name = nameMatch?.[1]?.trim();
      const income = name ? incomes.find((i) => i.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (income) return { type: 'navigate', params: { route: `/edit-income/${income.id}` } };
    }
    if (/eliminar (el )?ingreso|borrar ingreso|delete income|quitar (el )?ingreso/i.test(lower)) {
      const nameMatch = lower.match(/(?:ingreso|income)\s+(?:de\s+|del\s+)?([a-záéíóúñ\w\s]+?)(?:\s+$|\.|,)/i) ?? lower.match(/(?:eliminar|borrar|delete|quitar)\s+(?:el\s+)?(?:ingreso\s+)?(?:de\s+)?([a-záéíóúñ\w\s]+)/i);
      const name = nameMatch?.[1]?.trim();
      const income = name ? incomes.find((i) => i.name.toLowerCase().includes(name.toLowerCase())) : null;
      if (income) return { type: 'delete_income', params: { incomeId: income.id } };
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
  if (action.type === 'delete_all_debts') return lang === 'es' ? 'Se eliminaron todas las deudas.' : (result.message as string) || 'All debts deleted.';
  if (action.type === 'delete_all_fixed_expenses') return lang === 'es' ? 'Se eliminaron todos los gastos fijos.' : (result.message as string) || 'All fixed expenses deleted.';
  if (action.type === 'delete_all_assets') return lang === 'es' ? 'Se eliminaron todos los activos.' : (result.message as string) || 'All assets deleted.';
  if (action.type === 'delete_all_incomes') return lang === 'es' ? 'Se eliminaron todos los ingresos.' : (result.message as string) || 'All incomes deleted.';
  return (result.message as string) || (lang === 'es' ? 'Listo.' : 'Done.');
}
