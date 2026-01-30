# Sistema de voz y IA

La app permite controlar acciones por **voz** y **texto**. El flujo es:

1. **Captura de voz** (Web Speech API) o texto escrito.
2. **Interpretación**: se intenta primero con una **API de IA** (OpenAI u compatible) si está configurada; si no, se usa el **parser local** (keywords/regex en español e inglés).
3. **Ejecución**: la acción resultante (`AIAction`) se ejecuta con `executeAIAction` (storage, notificaciones, navegación).

Así se consigue un **mapeo lo más lenguaje natural posible**: la IA entiende frases como “tengo una deuda con BBVA de 15 mil pesos” o “registrar llamada con Santander” y devuelve el JSON de acción correcto.

Con la IA configurada y el contexto completo (deudas, compromisos, llamadas, gastos fijos, activos, ingresos con id y nombre), **la app se puede manejar 100% por voz sin tocar botones**: agregar, editar, eliminar y completar deudas, compromisos, llamadas, gastos, activos e ingresos; navegar a cualquier pantalla; consultar resumen o listas.

---

## Cobertura: todo lo que la app permite por voz

La IA y el parser local reciben el estado actual (listas con id y nombre) y pueden ejecutar **todas** las acciones que la UI permite:

| Área | Crear | Editar | Eliminar | Completar / Marcar pagado | Eliminar todas |
|------|--------|--------|----------|----------------------------|----------------|
| **Deudas** | add_debt (nombre, monto, cuota, pago, corte, interés) | navigate /edit-debt/ID | delete_debt, delete_all_debts | complete_debt (marcar como pagada) | delete_all_debts |
| **Compromisos** | add_commitment (deuda + monto); o navigate /add-commitment/ID | navigate /edit-commitment/ID o edit_commitment | delete_commitment | complete_commitment (pago realizado) | — |
| **Llamadas** | add_call (deuda); o navigate /add-call/ID | navigate /edit-call/ID o edit_call | delete_call | — | — |
| **Gastos fijos** | add_fixed_expense | navigate /edit-fixed-expense/ID | delete_fixed_expense, delete_all_fixed_expenses | — | delete_all_fixed_expenses |
| **Activos** | add_asset | navigate /edit-asset/ID | delete_asset, delete_all_assets | complete_asset (liquidar) | delete_all_assets |
| **Ingresos** | add_income | navigate /edit-income/ID | delete_income, delete_all_incomes | — | delete_all_incomes |
| **Navegación** | — | — | — | — | — |
| **Consultas / UI** | — | — | — | — | get_overview, get_debts, toggle_hide_amounts |

Para editar o eliminar una entidad concreta, el usuario la identifica por nombre (ej. "eliminar el gasto de internet", "editar la deuda BBVA", "eliminar compromiso de BBVA", "eliminar llamada de Scotiabank"). El contexto incluye compromisos y llamadas (con commitmentId/callId por deuda) para poder resolver edit/delete por voz.

**Atributos editables por voz (actualizaciones parciales):** La IA y el parser pueden actualizar uno o varios atributos sin abrir la pantalla. Ejemplos: "cambiar la cuota de BBVA a 50 mil" → edit_debt { debtId, localFee: 50000 }; "cambiar la fecha de pago de BBVA al día 20" → edit_debt { debtId, paymentDate: "20" }; "cambiar el monto del compromiso de BBVA a 4000" → edit_commitment { debtId, commitmentId, amountLocal: 4000 }; "actualizar las notas de la llamada de Scotiabank a 'acordé plazo'" → edit_call { debtId, callId, notes: "acordé plazo" }; "cambiar el gasto de internet a 60 dólares" → edit_fixed_expense { expenseId, amountDollars: 60 }; "cambiar el valor del activo casa a 2.5 millones" → edit_asset { assetId, valueLocal: 2500000 }; "cambiar mi ingreso de Forj a 6000" → edit_income { incomeId, amountLocal: 6000 }. Todos los atributos de cada entidad (nombre, montos, fechas, notas, tipo, frecuencia, etc.) están documentados en el prompt de la IA para crear y actualizar por voz.

---

## Variables de entorno (IA por voz)

Opcionales. Si no se configuran, solo se usa el parser local.

| Variable | Descripción |
|----------|-------------|
| `REACT_APP_OPENAI_API_KEY` | API key de OpenAI (o de un endpoint compatible). |
| `REACT_APP_AI_VOICE_API_KEY` | Alternativa al anterior (mismo uso). |
| `REACT_APP_AI_VOICE_API_URL` | URL del endpoint de chat (por defecto `https://api.openai.com/v1/chat/completions`). |
| `REACT_APP_OPENAI_MODEL` | Modelo a usar (por defecto `gpt-4o-mini`). **Recomendado:** `gpt-4o-mini`; no requiere acceso especial. `gpt-4-turbo` puede dar 404 si tu cuenta no tiene acceso a GPT-4. |

Ejemplo en `.env`:

```
REACT_APP_OPENAI_API_KEY=sk-...
# Opcional; si no pones modelo o pones gpt-4o-mini, suele funcionar sin acceso especial.
# gpt-4-turbo puede dar 404 si tu cuenta no tiene acceso a GPT-4.
REACT_APP_OPENAI_MODEL=gpt-4o-mini
```

**Seguridad:** En producción, evita exponer la API key en el cliente. Lo ideal es un backend que reciba el texto, llame a la IA y devuelva el `AIAction`; el front solo llamaría a ese backend.

---

## Mapeo lenguaje natural → acciones

El contrato de acciones está en `src/types/ai.ts` y `src/api/aiActions.ts`. La IA recibe un *system prompt* que describe:

- Todos los **tipos de acción** (`add_debt`, `add_income`, `add_commitment`, `navigate`, `get_overview`, etc.).
- Los **parámetros** requeridos y opcionales de cada uno.
- Cómo resolver **debtId** cuando el usuario dice “con BBVA” (se le pasa la lista de deudas con `id` y `name`).
- Cómo interpretar **montos** (“2 millones”, “5 mil”, “dólares” vs moneda local).

Ejemplos de frases que la IA puede mapear:

- *“Tengo una deuda con el banco BBVA, tarjeta, debo 15000 pesos”* → `add_debt` con `name`, `totalLocal`, `type: "tarjeta"`.
- *“Gano 5000 al mes en Forj”* → `add_income` con `name: "Forj"`, `amountLocal: 5000`.
- *“Registrar llamada con Santander”* → `add_call` con `debtId` de la deuda cuyo nombre contenga “Santander”.
- *“¿Cuánto debo?”* → `get_overview`.

El parser local (`src/api/aiParser.ts`) cubre muchas de estas frases sin IA; la IA mejora variaciones y frases más libres.

---

## Componentes del sistema

| Módulo | Función |
|--------|--------|
| `src/hooks/useVoiceCapture.ts` | Hook reutilizable para Web Speech API (idioma, transcripción en vivo, start/stop). |
| `src/api/aiVoiceApi.ts` | `interpretWithAI(text, context)` → llama a la API de IA y devuelve `AIAction \| null`. `isAIVoiceEnabled()` indica si hay API key. |
| `src/api/aiParser.ts` | `parseTextToAIAction(text, debts)` → parser local, fallback cuando no hay IA. |
| `src/api/aiExecutor.ts` | `executeAIAction(action, { navigate })` → ejecuta la acción en la app. |
| Dashboard | Integra voz + texto: primero `interpretWithAI` (si está habilitado), luego `parseTextToAIAction`, y finalmente `executeAIAction`. |

---

## Ejemplos de voz en la app

En el Dashboard, el usuario puede:

1. Pulsar el micrófono, hablar (ej. “agregar deuda Tarjeta BBVA 5000 pesos”) y al parar se envía el texto.
2. Escribir en el campo de texto y enviar.
3. Si está configurada la API de IA, se usa para interpretar; si no, el parser local.

Las respuestas (éxito/error o resumen) se muestran por toast.
