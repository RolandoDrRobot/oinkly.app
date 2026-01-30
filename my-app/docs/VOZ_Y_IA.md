# Sistema de voz y IA

La app permite controlar acciones por **voz** y **texto**. El flujo es:

1. **Captura de voz** (Web Speech API) o texto escrito.
2. **Interpretación**: se intenta primero con una **API de IA** (OpenAI u compatible) si está configurada; si no, se usa el **parser local** (keywords/regex en español e inglés).
3. **Ejecución**: la acción resultante (`AIAction`) se ejecuta con `executeAIAction` (storage, notificaciones, navegación).

Así se consigue un **mapeo lo más lenguaje natural posible**: la IA entiende frases como “tengo una deuda con BBVA de 15 mil pesos” o “registrar llamada con Santander” y devuelve el JSON de acción correcto.

Con la IA configurada y el contexto completo (deudas, gastos fijos, activos, ingresos con id y nombre), **la app se puede manejar 100% por voz sin tocar botones**: agregar, editar, eliminar y completar deudas, compromisos, llamadas, gastos, activos e ingresos; navegar a cualquier pantalla; consultar resumen o listas.

---

## Cobertura: todo lo que la app permite por voz

La IA recibe el estado actual (listas de deudas, gastos fijos, activos, ingresos con id y name) y puede ejecutar **todas** las acciones que la UI permite:

| Área | Acciones por voz |
|------|------------------|
| **Deudas** | Agregar, editar, eliminar, marcar como pagada. Params: nombre, monto total, cuota mensual, fecha de pago, corte, interés, banco. |
| **Compromisos** | Agregar, editar, eliminar, completar (por deuda). |
| **Llamadas** | Agregar, editar, eliminar (por deuda). |
| **Gastos fijos** | Agregar, editar, eliminar. Params: nombre, monto, categoría, día de pago. |
| **Activos** | Agregar, editar, eliminar, liquidar. Params: nombre, valor, tipo, fecha de compra. |
| **Ingresos** | Agregar, editar, eliminar. Params: nombre, monto, tipo, frecuencia. |
| **Navegación** | Ir a dashboard, pantallas de agregar/editar/eliminar, perfil, preferencias, about, términos. |
| **Consultas** | Resumen, listar deudas, ocultar/mostrar montos. |

Para editar o eliminar una entidad concreta, el usuario la identifica por nombre (ej. "eliminar el gasto de internet", "editar la deuda BBVA"). La IA usa el id de la lista que recibe en el contexto.

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
