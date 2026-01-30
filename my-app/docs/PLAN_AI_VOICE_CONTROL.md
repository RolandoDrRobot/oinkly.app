# Plan: Control total de la app por IA y voz

Objetivo: que cualquier IA (externa o integrada) pueda **leer todos los datos**, **dar análisis** y **ejecutar todas las acciones** que hoy se hacen en la UI, incluyendo por voz.

---

## Fase 1 — Capa de lectura (datos para la IA)

**Objetivo:** La IA tiene acceso a todos los datos necesarios para leer y analizar.

| Tarea | Descripción |
|-------|-------------|
| 1.1 | Crear módulo `src/api/aiContext.ts` (o similar) que exponga: `getFullState()` → devuelve `{ debts, fixedExpenses, assets, incomes }` desde storage. |
| 1.2 | Añadir `getOverviewForAI()`: totales por categoría (deuda total, gastos fijos, activos, ingresos), patrimonio neto, moneda local. Formato JSON estable. |
| 1.3 | Opcional: `getSummaryText(lang)` que devuelva un texto resumido en español/inglés para que la IA lo use en respuestas en lenguaje natural. |

**Entregable:** La IA (o el módulo que hable con ella) puede leer todo el estado de la app sin tocar la UI.

---

## Fase 2 — Formato de acciones (contrato para “cualquier IA”)

**Objetivo:** Definir un contrato único que cualquier IA pueda usar para ejecutar acciones.

| Tarea | Descripción |
|-------|-------------|
| 2.1 | Definir tipo `AIAction` en `src/types/ai.ts`: `{ type: string, params?: Record<string, unknown> }`. |
| 2.2 | Documentar la lista de **intents** y sus parámetros, por ejemplo: |
| | **Deudas:** `add_debt`, `edit_debt`, `delete_debt`, `complete_debt` |
| | **Compromisos:** `add_commitment`, `edit_commitment`, `delete_commitment`, `complete_commitment` |
| | **Llamadas:** `add_call`, `edit_call`, `delete_call` |
| | **Gastos fijos:** `add_fixed_expense`, `edit_fixed_expense`, `delete_fixed_expense` |
| | **Activos:** `add_asset`, `edit_asset`, `delete_asset`, `complete_asset` |
| | **Ingresos:** `add_income`, `edit_income`, `delete_income` |
| | **UI:** `navigate`, `toggle_hide_amounts`, `get_overview`, `get_debts`, etc. |
| 2.3 | Crear `src/api/aiActions.ts` con la lista de tipos válidos y parámetros requeridos/opcionales (para validación y documentación). |

**Entregable:** Especificación clara de acciones que la IA puede enviar (JSON). Sirve tanto para parsing local como para IA externa.

---

## Fase 3 — Ejecutor de acciones (una sola función que hace todo)

**Objetivo:** Una función que recibe una acción y la ejecuta (storage + notificaciones + navegación cuando aplique).

| Tarea | Descripción |
|-------|-------------|
| 3.1 | Crear `executeAIAction(action: AIAction, context: { navigate, storage, notify, ... }): Promise<{ success, message?, error? }>`. |
| 3.2 | Implementar cada intent: llamar a `storage.saveDebt`, `storage.deleteDebt`, etc., y a `notify.overviewUpdated()` (u otros) cuando corresponda. |
| 3.3 | Para acciones que hoy son “abrir formulario” (ej. agregar deuda con muchos campos), decidir: (A) solo navegar con params en estado/URL, o (B) crear/editar con los params que vengan y navegar después. Priorizar (B) para “crear deuda Tarjeta X 5000” sin tocar la UI. |
| 3.4 | Generar IDs (uuid o timestamp) para entidades nuevas creadas por la IA. |
| 3.5 | Devolver mensaje de éxito/error en el idioma del usuario para que la IA (o la UI) lo muestre. |

**Entregable:** Cualquier acción documentada en Fase 2 se puede ejecutar con una sola llamada a `executeAIAction`.

---

## Fase 4 — Integrar ejecutor en la app (Dashboard + AIAgent)

**Objetivo:** El flujo actual de voz/texto usa el ejecutor en lugar de lógica duplicada.

| Tarea | Descripción |
|-------|-------------|
| 4.1 | En Dashboard: reemplazar `parseAICommand` + `handleAIAction` por: texto → (parsing o IA externa) → `AIAction` → `executeAIAction`. |
| 4.2 | Ampliar el parsing local (keywords/regex) para generar `AIAction` para todas las acciones ya soportadas + nuevas (gastos, activos, ingresos, editar, etc.). |
| 4.3 | Si se usa el componente AIAgent: que reciba `getFullState` / `getOverviewForAI` y que sus respuestas usen esos datos; y que envíe `AIAction` al Dashboard (o al ejecutor) en lugar de tipos propios. |
| 4.4 | Mantener reconocimiento de voz (Web Speech API); el texto resultante se sigue pasando al parser o a la IA externa. |

**Entregable:** Misma UX de voz/chat, pero respaldada por la capa única de acciones y datos.

---

## Fase 5 — Punto de entrada para IA externa (opcional)

**Objetivo:** Conectar “cualquier IA” sin depender del parsing local.

| Tarea | Descripción |
|-------|-------------|
| 5.1 | Exponer en ventana (para inyectar script o extensión): `window.OinklyAI = { getState(), getOverview(), executeAction(action) }`. |
| 5.2 | O crear un pequeño backend que reciba texto/voz, llame a la IA externa, reciba JSON de acción y lo reenvíe a la app (por ejemplo por WebSocket o postMessage). |
| 5.3 | Documentar el contrato (tipos de acción y params) para que terceros implementen el cliente de la IA. |

**Entregable:** La IA externa puede leer estado y ejecutar acciones sin tocar el código interno del parser.

---

## Fase 6 — Cobertura completa de la UI

**Objetivo:** Ninguna acción de la UI quede sin equivalente en intents.

| Tarea | Descripción |
|-------|-------------|
| 6.1 | Checklist por pantalla: Deudas (crear, editar, eliminar, completar, reordenar), Compromisos (CRUD + completar), Llamadas (CRUD), Gastos fijos (CRUD), Activos (CRUD + liquidar), Ingresos (CRUD), Navegación, Preferencias. |
| 6.2 | Para cada una: si hay botón/formulario en la UI, debe existir un intent con params suficientes y su implementación en `executeAIAction`. |
| 6.3 | Añadir respuestas de “análisis” si la IA pide: “¿cuánto debo?”, “¿cuál es mi patrimonio?”, “listar deudas”, etc., usando `getOverviewForAI` y listas. |

**Entregable:** Paridad funcional: todo lo que el usuario puede hacer en la UI, la IA puede hacerlo por voz/texto (con los params adecuados).

---

## Orden sugerido de implementación

1. **Fase 2** (contrato de acciones) y **Fase 1** (lectura) — poco código, mucho valor para diseñar bien.
2. **Fase 3** (ejecutor) — núcleo; implementar intents por bloques (primero deudas, luego compromisos/llamadas, luego gastos/activos/ingresos).
3. **Fase 4** (integrar en Dashboard/AIAgent) — unificar voz y chat con el ejecutor.
4. **Fase 6** (completar cobertura) — rellenar lo que falte según checklist.
5. **Fase 5** (IA externa) — cuando el resto esté estable.

---

## Resumen

| Fase | Nombre | Resultado |
|------|--------|-----------|
| 1 | Lectura | IA puede leer todos los datos y resumen. |
| 2 | Contrato | Lista de intents y params (JSON) para cualquier IA. |
| 3 | Ejecutor | Una función ejecuta cualquier acción (storage + notify + navegación). |
| 4 | Integración | Voz y chat usan el ejecutor; datos desde getOverview/getState. |
| 5 | IA externa | (Opcional) API/bridge para conectar cualquier IA. |
| 6 | Cobertura | Toda la UI tiene equivalente por voz/IA. |

Con esto, **sí es posible** que la app sea manejable al 100% por IA (leer, analizar, cambiar información por voz); el plan anterior es la hoja de ruta para implementarlo.

---

## ¿Listo? ¿Env? ¿API de IA?

- **¿Está listo?** Sí. Voz y texto en el Dashboard funcionan sin pasos extra (parsing local → ejecutor).
- **¿Variables de entorno?** Para la capa de IA: **no**. Para login (Supabase) en producción sí usas las que ya tengas (`REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`).
- **¿Conexión con API de IA?** **No**. Hoy no hay llamada a OpenAI ni a ningún servicio externo. El “entendimiento” es local (frases clave en es/en). Si más adelante quieres conectar una IA externa: envías el texto a tu API, la IA devuelve un JSON `{ type, params }` (mismo contrato que `AIAction`), y en la app llamas `executeAIAction(accion, { navigate })`. La API key iría en tu backend, no en el cliente.

---

## Implementado (Fases 1–4)

- **Fase 1:** `src/api/aiContext.ts` — `getFullState()`, `getOverviewForAI()`, `getSummaryText(lang)`.
- **Fase 2:** `src/types/ai.ts` — tipo `AIAction` y `AIIntent`; `src/api/aiActions.ts` — lista de intents y params.
- **Fase 3:** `src/api/aiExecutor.ts` — `executeAIAction(action, { navigate })` con todas las acciones (deudas, compromisos, llamadas, gastos, activos, ingresos).
- **Fase 4:** Dashboard usa `parseTextToAIAction` → `executeAIAction`; respuestas con toast para resumen/error.
- **Barrel:** `src/api/index.ts` exporta todo lo anterior.
