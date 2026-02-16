# Análisis de preparación para producción – Oinkly

**Fecha:** Febrero 2026  
**Estado:** ✅ Listo para producción (con recomendaciones menores)

---

## 1. Términos y condiciones / Protección legal

### ✅ Estado: Bien cubierto

Los términos y la política de privacidad están alineados con la app actual y te protegen frente a reclamaciones:

- **Beta y uso bajo tu propio riesgo:** Aviso explícito de que la app es BETA, puede tener defectos o discontinuarse, y que el usuario la usa bajo su **exclusivo riesgo**. Los desarrolladores **no asumen responsabilidad** por pérdidas o daños.
- **Aceptación:** El uso implica aceptar los términos y **eximir a los desarrolladores de responsabilidad** en la máxima medida permitida por la ley.
- **Responsabilidad del usuario:** El usuario es el único responsable de la exactitud de los datos, de respaldarlos y de **todas las decisiones financieras**. La app es solo una herramienta.
- **Sin garantía de exactitud:** No se garantiza exactitud, integridad ni puntualidad. Nada en la app constituye asesoría profesional.
- **Renuncia de garantías:** “Tal cual” y “según disponibilidad”, sin garantías (incluidas comerciabilidad e idoneidad).
- **Limitación de responsabilidad:** Exención amplia de daños (directos, indirectos, etc.). Remedio único: dejar de usar la app. Responsabilidad total limitada a lo pagado (o cero si es gratuita).

**Nota:** Esto te protege frente a **reclamaciones por uso de la app o por decisiones del usuario**. Para proteger la **propiedad intelectual** (que nadie “robe” el código o la idea) conviene: copyright en el código, posible marca registrada y, si aplica, licencia de uso en los términos.

---

## 2. Google Analytics

### ✅ Estado: Correctamente configurado

- **Script en `public/index.html`:** gtag.js se carga con el ID `G-8RTP2EJ69Z` (async).
- **ID en código:** `src/utils/analytics.ts` usa `REACT_APP_GA_MEASUREMENT_ID` o, por defecto, `G-8RTP2EJ69Z`. Coincide con el del HTML.
- **Rutas:** `GoogleAnalyticsRouteTracker` envía `page_view` en cada cambio de ruta (path + search).
- **Eventos:** Se envían eventos para:
  - Adquisición: `landing_view`, `sign_in_start`, `sign_in_success`, `sign_in_error`
  - Activación: `onboarding_complete`, `first_debt_created`, `first_call_recorded`
  - Suscripción: `view_plans`, `view_subscribe`, `start_checkout`, `purchase`
  - Uso: `add_debt`, `edit_debt`, `complete_debt`, `add_fixed_expense`, `add_asset`, `add_income`, `ai_assistant_used`
  - Errores: `error`, `ai_voice_error`

**Recomendación:** En producción, si quieres otro property, define `REACT_APP_GA_MEASUREMENT_ID` en el entorno de build y actualiza el script en `index.html` para usar ese mismo ID (o un build que inyecte el ID desde env).

---

## 3. Tests

### ✅ Estado: Todos pasan

- **121 tests, 18 suites** – todos en verde.
- Se han corregido:
  - **Profile.test.tsx:** mock de `window.matchMedia` y componente Profile defensivo ante entornos sin `matchMedia`.
  - **AddFixedExpense.test.tsx:** flujo actualizado (sin paso de categoría).
  - **AddDebt.test.tsx:** flujo actualizado (sin paso bankName; paso bankPhone opcional con skip).

**Comando:** `npm test -- --watchAll=false`

---

## 4. Build de producción

### ✅ Estado: Compila correctamente

- `npm run build` (también con `CI=true`) termina sin errores.
- Se eliminaron imports no usados que rompían el build en CI: `FaPlus` (Dashboard), `FaTag` (EditFixedExpense).

---

## 5. Checklist rápido

| Área | Estado |
|------|--------|
| Términos / Beta / Limitación responsabilidad | ✅ |
| Privacidad (datos, almacenamiento, sync) | ✅ |
| Google Analytics (script + rutas + eventos) | ✅ |
| Tests (121) | ✅ |
| Build producción | ✅ |
| i18n (en/es) | ✅ |
| Variables de entorno documentadas | Revisar `.env.example` |

---

## 6. Recomendaciones opcionales antes de producción

1. **Variables de entorno:** Tener `.env.example` con `REACT_APP_GA_MEASUREMENT_ID`, `REACT_APP_SUPABASE_URL`, `REACT_APP_SUPABASE_ANON_KEY`, y opcionales para OpenAI. No commitear `.env` con valores reales.
2. **Consola:** Hay `console.log` / `console.warn` en aiExecutor, aiVoiceApi, AuthContext, supabaseData, etc. En producción suelen dejarse los `warn` para diagnóstico; los `console.log` de depuración (p. ej. en aiExecutor) se pueden quitar o envolver en `if (process.env.NODE_ENV === 'development')`.
3. **Supabase:** Si en producción usas Supabase, ejecutar la migración `003_drop_commitments_and_calls.sql` en el proyecto para alinear el esquema con la app.
4. **HTTPS:** Servir la app solo por HTTPS en producción.
5. **Política de cookies / aviso:** Si en algún momento usas cookies además de local storage, puede ser necesario un banner de consentimiento según la jurisdicción.

---

## Resumen

- **Términos:** Te protegen bien frente a reclamaciones por uso de la app y decisiones del usuario (beta, uso bajo tu propio riesgo, limitación de responsabilidad).
- **Google Analytics:** Configurado (gtag en HTML, mismo ID en código, rutas y eventos coherentes).
- **Tests y build:** Todos los tests pasan y el build de producción compila correctamente.

Con esto, la app está en condiciones de ir a producción desde el punto de vista legal (términos), analítica y técnico (tests y build).
