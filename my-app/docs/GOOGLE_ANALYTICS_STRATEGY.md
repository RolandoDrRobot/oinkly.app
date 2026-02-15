# Estrategia de eventos Google Analytics (gtag) – Oinkly

Objetivo: **vender más** (conversión a Premium) y **medir para mejorar** (uso, fricción, retención). Esta estrategia define qué eventos enviar y cómo usarlos.

---

## 1. Objetivos de negocio y qué medir

| Objetivo | Qué medir | Cómo ayuda |
|----------|-----------|------------|
| **Vender más Premium** | Embudo: Landing → registro → ver planes → checkout → activación | Ver dónde se pierden usuarios y optimizar ese paso. |
| **Activar usuarios** | Primer uso: primera deuda, primera llamada, preferencias completadas | Usuarios que “activan” retienen más y convierten más. |
| **Entender valor de Premium** | Uso de asistente de voz, pantallas Premium, intentos de uso bloqueado | Saber qué valor tiene Premium y dónde mostrarlo mejor. |
| **Reducir abandono** | Salidas en pasos críticos, tiempo en pantalla, errores | Detectar fricción y bugs que afectan conversión y retención. |
| **Mejorar producto** | Uso de funciones clave (deudas, compromisos, llamadas, gastos) | Priorizar mejoras y guiar el roadmap. |

---

## 2. Convención de nombres de eventos

- **Categoría** (primer parámetro o `event_category`): área del producto.  
  Ejemplos: `acquisition`, `subscription`, `engagement`, `feature`, `error`.
- **Acción** (nombre del evento): verbo + sustantivo, en inglés, snake_case.  
  Ejemplos: `view_plans`, `start_checkout`, `add_debt`, `record_call`.
- **Etiquetas opcionales**: `label` para detalle (ej. pantalla o tipo de plan).

Así en GA4 podrás filtrar por categoría, comparar embudos y crear audiencias.

---

## 3. Embudo de adquisición y conversión (para vender más)

Orden sugerido de implementación.

### 3.1 Adquisición (Landing y registro)

| Evento | Cuándo | Parámetros útiles | Para qué |
|--------|--------|-------------------|----------|
| `landing_view` | Vista de Landing (o paso 0 del onboarding) | `step` (0,1,2…) si hay pasos | Ver cuántos llegan y en qué paso abandonan. |
| `sign_in_start` | Clic en “Iniciar sesión con Google” | — | Inicio del registro. |
| `sign_in_success` | Login correcto (Google o email) | `method`: `google` / `email` | Registros completados. |
| `sign_in_error` | Error al iniciar sesión | `error_message` (opcional) | Detectar problemas de registro. |

**Métrica clave:** `sign_in_success / landing_view` = tasa de registro desde landing.

### 3.2 Activación (primer uso)

| Evento | Cuándo | Parámetros | Para qué |
|--------|--------|------------|----------|
| `onboarding_complete` | Usuario termina preferencias iniciales y va al Dashboard | — | Usuario “activado”. |
| `first_debt_created` | Primera deuda guardada (solo si es la primera del usuario) | — | Engagement temprano. |
| `first_call_recorded` | Primera llamada registrada (idem) | — | Uso del flujo clave. |

**Métrica clave:** % de usuarios que llegan a `onboarding_complete` y luego a `first_debt_created`. Si baja, mejorar onboarding o primer uso.

### 3.3 Consideración de Premium (ver planes y precio)

| Evento | Cuándo | Parámetros | Para qué |
|--------|--------|------------|----------|
| `view_plans` | Entra en /subscription o pantalla de planes | `source`: pantalla de origen (ej. `profile`, `ai_locked`, `dashboard`) | Ver qué pantallas generan más interés. |
| `view_subscribe` | Entra en /subscribe (checkout) | `plan`: `monthly` / `yearly` | Intención de compra por tipo de plan. |
| `start_checkout` | Clic en “Confirmar y activar Premium” (antes de simular pago) | `plan`, `value` (precio si quieres) | Inicio de checkout. |
| `purchase` | Premium activado correctamente | `plan`, `value`, `currency` | Conversión; conectar con ingresos. |
| `checkout_abandon` | Sale de /subscribe sin comprar (opcional: al salir o al volver atrás) | `plan` | Abandono de checkout. |

**Métricas clave:**  
- `purchase / view_plans` = conversión desde “ver planes”.  
- `purchase / start_checkout` = conversión en checkout.  
- Si `view_plans` sube y `purchase` no, el problema está en precio, mensaje o fricción en checkout.

### 3.4 Uso de Premium y “deseo” de compra

| Evento | Cuándo | Parámetros | Para qué |
|--------|--------|------------|----------|
| `ai_assistant_locked_click` | Clic en el asistente de voz cuando está bloqueado (ej. “Ver planes”) | `source`: `dashboard` / otro | Cuántos quieren usar voz y no pueden = demanda de Premium. |
| `ai_assistant_used` | Usa el asistente de voz (Premium) | `action_type` si puedes (ej. `add_debt`, `navigate`) | Demostrar valor de Premium; retención. |
| `premium_feature_used` | Uso de cualquier flujo solo Premium (si hay más en el futuro) | `feature_name` | Qué features Premium se usan más. |

**Para vender más:** Si `ai_assistant_locked_click` es alto y `view_plans` bajo, hace falta un CTA más claro desde el asistente bloqueado hacia “ver planes”.

---

## 4. Engagement y producto (medir para mejorar)

### 4.1 Funciones clave (usage)

| Evento | Cuándo | Parámetros | Para qué |
|--------|--------|------------|----------|
| `screen_view` | Ya lo cubres con page_view por ruta; opcional: enviar como evento con `screen_name` | `screen_name`, `previous_screen` | Consistencia con GA4 “screen”. |
| `add_debt` | Deuda creada | — | Salud del uso core. |
| `edit_debt` | Deuda editada | — | Engagement. |
| `add_commitment` | Compromiso agregado | `debt_id` (opcional) | Uso del flujo de compromisos. |
| `record_call` | Llamada registrada | `debt_id` (opcional) | Uso del flujo de llamadas. |
| `add_fixed_expense` | Gasto fijo agregado | — | Uso de gastos. |
| `add_asset` | Activo agregado | — | Uso de activos. |
| `complete_debt` | Deuda marcada como completada | — | Logro; buen indicador de valor. |

Agrupa por `event_category: 'feature'` (o similar) para dashboards de “qué se usa más”.

### 4.2 Errores y fricción

| Evento | Cuándo | Parámetros | Para qué |
|--------|--------|------------|----------|
| `error` | Cualquier error que muestres al usuario (toast, pantalla de error) | `error_type`, `screen`, `message` (sin datos personales) | Ver qué falla y dónde; priorizar fixes. |
| `ai_voice_error` | Error del asistente de voz | `error_type` si tienes | Mejorar experiencia de voz. |

---

## 5. Prioridad de implementación

**Fase 1 – Embudo de venta (rápido impacto)**  
1. `sign_in_start`, `sign_in_success`, `sign_in_error`  
2. `onboarding_complete`  
3. `view_plans`, `view_subscribe`, `start_checkout`, `purchase`  
4. `ai_assistant_locked_click`, `ai_assistant_used`  

**Fase 2 – Activación y producto**  
5. `landing_view` (y paso si aplica)  
6. `first_debt_created`, `first_call_recorded`  
7. `add_debt`, `record_call`, `complete_debt` (y otros `feature_*` que quieras)  

**Fase 3 – Calidad**  
8. `error`, `ai_voice_error`  
9. `checkout_abandon` si quieres afinar checkout  

---

## 6. Cómo usar los datos para vender más y mejorar

- **Vender más**  
  - Embudo: Landing → registro → view_plans → start_checkout → purchase.  
  - Identificar el paso con mayor caída y mejorar ese paso (copy, diseño, eliminación de fricción).  
  - Cruzar `view_plans` con `source`: si la mayoría viene de `ai_locked`, refuerza ese CTA.  
  - Crear audiencia “vio planes pero no compró” y (si tienes) remarketing o mensaje in-app.

- **Medir para mejorar**  
  - Dashboards: embudo de conversión, eventos por pantalla, uso de features, errores por tipo/pantalla.  
  - Si `first_debt_created` o `onboarding_complete` bajan, revisar onboarding y primer flujo.  
  - Si `record_call` o `add_commitment` son bajos respecto a `add_debt`, puede que esos flujos sean confusos o poco visibles.  
  - Errores: ordenar por frecuencia y pantalla; priorizar lo que afecte a más usuarios o a pasos de pago.

---

## 7. Resumen de eventos (checklist)

| # | Evento | Categoría sugerida | Fase |
|---|--------|--------------------|------|
| 1 | `landing_view` | acquisition | 2 |
| 2 | `sign_in_start` | acquisition | 1 |
| 3 | `sign_in_success` | acquisition | 1 |
| 4 | `sign_in_error` | acquisition | 1 |
| 5 | `onboarding_complete` | activation | 1 |
| 6 | `first_debt_created` | activation | 2 |
| 7 | `first_call_recorded` | activation | 2 |
| 8 | `view_plans` | subscription | 1 |
| 9 | `view_subscribe` | subscription | 1 |
| 10 | `start_checkout` | subscription | 1 |
| 11 | `purchase` | subscription | 1 |
| 12 | `checkout_abandon` | subscription | 3 |
| 13 | `ai_assistant_locked_click` | subscription | 1 |
| 14 | `ai_assistant_used` | engagement | 1 |
| 15 | `add_debt` | feature | 2 |
| 16 | `edit_debt` | feature | 2 |
| 17 | `add_commitment` | feature | 2 |
| 18 | `record_call` | feature | 2 |
| 19 | `complete_debt` | feature | 2 |
| 20 | `add_fixed_expense` | feature | 2 |
| 21 | `add_asset` | feature | 2 |
| 22 | `error` | error | 3 |
| 23 | `ai_voice_error` | error | 3 |

Cuando quieras, el siguiente paso es implementar en código estos eventos con `trackEvent()` y los parámetros acordados (empezando por Fase 1).
