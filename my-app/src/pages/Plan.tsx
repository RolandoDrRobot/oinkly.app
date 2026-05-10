import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaChartLine, FaBolt, FaPiggyBank, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { storage } from '../utils/storage';
import './AddDebt.css';
import './Plan.css';

const Icon = ({ component: C, ...p }: { component: any; [k: string]: any }) =>
  C ? <C {...p} /> : null;

const fmt = (n: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const Plan: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const data = useMemo(() => {
    // Load ALL debts (same as Dashboard — no closedAt filter)
    const allDebts = storage.getDebts();
    const incomes = storage.getIncomes();
    const fixedExpenses = storage.getFixedExpenses();
    const assets = storage.getAssets();
    const rate = parseFloat(localStorage.getItem('cashflow_exchange_rate') || '500') || 500;
    const savingsLocal = parseFloat(localStorage.getItem('cashflow_savings_local') || '0') || 0;
    const savingsUSD = parseFloat(localStorage.getItem('cashflow_savings_usd') || '0') || 0;

    const toUSD = (local: number) => local / rate;

    // Exact same formula as Dashboard's calculateCashflow()
    const activeIncomeUSD = incomes.reduce((a, i) => a + (i.amountDollars || 0) + toUSD(i.amountLocal || 0), 0);
    const passiveIncomeUSD = assets.reduce((a, as) => a + (as.monthlyIncomeUSD || 0) + toUSD(as.monthlyIncomeLocal || 0), 0);
    const totalIncomeUSD = activeIncomeUSD + passiveIncomeUSD;

    const fixedExpensesUSD = fixedExpenses.reduce((a, e) => a + (e.amountDollars || 0) + toUSD(e.amountLocal || 0), 0);
    const debtPaymentsUSD = allDebts.reduce((a, d) => a + (d.dollarFee || 0) + toUSD(d.localFee || 0), 0);
    const totalExpensesUSD = fixedExpensesUSD + debtPaymentsUSD;
    const cashflowUSD = totalIncomeUSD - totalExpensesUSD;
    const totalSavingsUSD = savingsUSD + toUSD(savingsLocal);

    // For display: only active debts, sorted by monthly fee descending
    const debtsSorted = allDebts
      .filter(d => !d.closedAt)
      .map(d => ({
        id: d.id,
        name: d.name,
        totalUSD: (d.totalDollars || 0) + toUSD(d.totalLocal || 0),
        feeUSD: (d.dollarFee || 0) + toUSD(d.localFee || 0),
      }))
      .filter(d => d.feeUSD > 0)
      .sort((a, b) => b.feeUSD - a.feeUSD);

    return {
      allDebts, debtsSorted, rate, toUSD,
      activeIncomeUSD, passiveIncomeUSD, totalIncomeUSD,
      fixedExpensesUSD, debtPaymentsUSD, totalExpensesUSD,
      cashflowUSD, totalSavingsUSD,
    };
  }, []);

  // Emergency fund
  const emergencyMonths = useMemo(() => {
    const monthly = data.totalExpensesUSD;
    if (monthly <= 0) return Infinity;
    return data.totalSavingsUSD / monthly;
  }, [data]);

  // DTI
  const dti = useMemo(() => {
    if (data.totalIncomeUSD <= 0) return 0;
    return (data.debtPaymentsUSD / data.totalIncomeUSD) * 100;
  }, [data]);

  // Financial freedom
  const freedomGap = useMemo(() => {
    const gap = data.totalExpensesUSD - data.passiveIncomeUSD;
    const pct = data.totalExpensesUSD > 0 ? Math.min((data.passiveIncomeUSD / data.totalExpensesUSD) * 100, 100) : 0;
    return { gap, pct };
  }, [data]);

  const card = (i: number) => ({
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { delay: i * 0.08 } },
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="plan-page">
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="page-header"
        style={{ paddingTop: 0 }}
      >
        <div className="header-content">
          <h1>Mi Plan</h1>
          <motion.button
            type="button"
            className="btn-back"
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon component={FaArrowLeft} style={{ marginRight: 8 }} /> {t('common.back')}
          </motion.button>
        </div>
      </motion.header>

      <div className="plan-content">

        {/* Q1: Cashflow liberado por deuda */}
        <motion.div variants={card(0)} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaBolt} className="plan-icon" />
            <div>
              <h2 className="plan-question">¿Qué deuda libera más cashflow si la pagas de golpe?</h2>
              <p className="plan-subtitle">Ordenadas de mayor a menor impacto mensual. La primera es la que más te libera.</p>
            </div>
          </div>

          {data.debtsSorted.length === 0 ? (
            <p className="plan-empty">No tienes deudas activas. ¡Excelente!</p>
          ) : (
            <>
              {/* Cashflow actual */}
              <div className="plan-cf-current">
                <span className="plan-cf-current-label">Cashflow actual</span>
                <span className={`plan-cf-current-value ${data.cashflowUSD >= 0 ? 'plan-green' : 'plan-red'}`}>
                  {fmt(data.cashflowUSD)}<span className="plan-cf-per-month">/mes</span>
                </span>
              </div>

              <div className="plan-debt-list">
                {data.debtsSorted.map((d, i) => {
                  const freedSoFar = data.debtsSorted.slice(0, i + 1).reduce((a, x) => a + x.feeUSD, 0);
                  const cfAfter = data.cashflowUSD + freedSoFar;
                  return (
                    <div key={d.id} className="plan-debt-row">
                      <div className="plan-debt-rank">{i + 1}</div>
                      <div className="plan-debt-info">
                        <span className="plan-debt-name">{d.name}</span>
                        <span className="plan-debt-total">Costo de pagar: {fmt(d.totalUSD)}</span>
                      </div>
                      <div className="plan-debt-impact">
                        <span className="plan-debt-freed">+{fmt(d.feeUSD)}/mes</span>
                        <span className={`plan-debt-cf-after ${cfAfter >= 0 ? 'plan-green' : 'plan-red'}`}>
                          → {fmt(cfAfter)}/mes
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Si pagas todo */}
              <div className="plan-debt-all-free">
                <span>Si pagas todas las deudas</span>
                <span className={`plan-debt-all-free-value ${(data.cashflowUSD + data.debtPaymentsUSD) >= 0 ? 'plan-green' : 'plan-red'}`}>
                  {fmt(data.cashflowUSD + data.debtPaymentsUSD)}/mes
                </span>
              </div>
            </>
          )}
        </motion.div>

        {/* Q2: DTI */}
        <motion.div variants={card(1)} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaExclamationTriangle} className="plan-icon" />
            <div>
              <h2 className="plan-question">¿Qué porcentaje de tus ingresos se van a deudas?</h2>
              <p className="plan-subtitle">Debt-to-Income (DTI). Sano: menos del 36%. Crítico: más del 50%.</p>
            </div>
          </div>
          <div className="plan-stat-row">
            <div className="plan-stat">
              <span className="plan-stat-label">Pagos deuda/mes</span>
              <span className="plan-stat-value">{fmt(data.debtPaymentsUSD)}</span>
            </div>
            <div className="plan-stat">
              <span className="plan-stat-label">Ingresos/mes</span>
              <span className="plan-stat-value">{fmt(data.totalIncomeUSD)}</span>
            </div>
            <div className="plan-stat">
              <span className="plan-stat-label">DTI</span>
              <span className={`plan-stat-value ${dti <= 36 ? 'plan-green' : dti <= 50 ? 'plan-orange' : 'plan-red'}`}>
                {dti.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="plan-dti-bar-wrap">
            <div className="plan-dti-bar">
              <div className={`plan-dti-fill ${dti <= 36 ? 'plan-dti-green' : dti <= 50 ? 'plan-dti-orange' : 'plan-dti-red'}`}
                style={{ width: `${Math.min(dti, 100)}%` }} />
              <div className="plan-dti-marker" style={{ left: '36%' }} />
              <div className="plan-dti-marker" style={{ left: '50%' }} />
            </div>
            <div className="plan-progress-labels">
              <span>0%</span><span>36%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <p className="plan-tip">
            {dti <= 36 ? '✅ Tu DTI está en zona sana.' : dti <= 50 ? '⚠️ DTI elevado. Considera eliminar deudas antes de contraer nuevas.' : '🚨 DTI crítico. Prioriza eliminar deudas cuanto antes.'}
          </p>
        </motion.div>

        {/* Q3: Fondo de emergencia */}
        <motion.div variants={card(2)} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaPiggyBank} className="plan-icon" />
            <div>
              <h2 className="plan-question">¿Cuántos meses de gastos cubren tus ahorros?</h2>
              <p className="plan-subtitle">Regla general: 3–6 meses de gastos como fondo de emergencia.</p>
            </div>
          </div>
          <div className="plan-stat-row">
            <div className="plan-stat">
              <span className="plan-stat-label">Ahorros totales</span>
              <span className="plan-stat-value">{fmt(data.totalSavingsUSD)}</span>
            </div>
            <div className="plan-stat">
              <span className="plan-stat-label">Gastos/mes</span>
              <span className="plan-stat-value">{fmt(data.totalExpensesUSD)}</span>
            </div>
            <div className="plan-stat">
              <span className="plan-stat-label">Cobertura</span>
              <span className={`plan-stat-value ${emergencyMonths >= 3 ? 'plan-green' : 'plan-red'}`}>
                {emergencyMonths === Infinity ? '∞' : emergencyMonths.toFixed(1)} meses
              </span>
            </div>
          </div>
          <div className="plan-progress-wrap">
            <div className="plan-progress-bar">
              <div className="plan-progress-fill" style={{ width: `${Math.min((emergencyMonths / 6) * 100, 100)}%` }} />
              <div className="plan-progress-marker" style={{ left: '50%' }} />
            </div>
            <div className="plan-progress-labels">
              <span>0</span><span>3 meses</span><span>6 meses</span>
            </div>
          </div>
          {emergencyMonths < 3 && data.totalExpensesUSD > 0 && (
            <p className="plan-tip">Necesitas ahorrar {fmt(3 * data.totalExpensesUSD - data.totalSavingsUSD)} más para 3 meses de cobertura.</p>
          )}
        </motion.div>

        {/* Q4: Libertad financiera */}
        <motion.div variants={card(3)} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaCheckCircle} className="plan-icon" />
            <div>
              <h2 className="plan-question">¿Qué tan cerca estás de la libertad financiera?</h2>
              <p className="plan-subtitle">Libertad = ingresos pasivos (de activos) ≥ todos tus gastos mensuales.</p>
            </div>
          </div>
          <div className="plan-stat-row">
            <div className="plan-stat">
              <span className="plan-stat-label">Ingresos pasivos/mes</span>
              <span className="plan-stat-value plan-green">{fmt(data.passiveIncomeUSD)}</span>
            </div>
            <div className="plan-stat">
              <span className="plan-stat-label">Gastos totales/mes</span>
              <span className="plan-stat-value">{fmt(data.totalExpensesUSD)}</span>
            </div>
            <div className="plan-stat">
              <span className="plan-stat-label">Gap</span>
              <span className={`plan-stat-value ${freedomGap.gap <= 0 ? 'plan-green' : 'plan-red'}`}>
                {freedomGap.gap <= 0 ? '🎉 Libre' : `-${fmt(freedomGap.gap)}`}
              </span>
            </div>
          </div>
          <div className="plan-progress-wrap">
            <div className="plan-progress-bar">
              <div className="plan-progress-fill plan-progress-fill--freedom" style={{ width: `${freedomGap.pct}%` }} />
            </div>
            <div className="plan-progress-labels">
              <span>0%</span>
              <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{freedomGap.pct.toFixed(1)}% cubierto</span>
              <span>100%</span>
            </div>
          </div>
          {freedomGap.gap > 0 && (
            <p className="plan-tip">
              Necesitas {fmt(freedomGap.gap)}/mes más en ingresos pasivos. Agrégalos a tus activos como ingreso mensual.
            </p>
          )}
        </motion.div>

        {/* Q5: Resumen cashflow */}
        <motion.div variants={card(4)} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaChartLine} className="plan-icon" />
            <div>
              <h2 className="plan-question">Resumen de tu cashflow mensual</h2>
              <p className="plan-subtitle">Desglose de ingresos y egresos en USD.</p>
            </div>
          </div>
          <div className="plan-table">
            <div className="plan-cf-summary-row">
              <span className="plan-cf-summary-label">Ingresos activos</span>
              <span className="plan-green">+{fmt(data.activeIncomeUSD)}</span>
            </div>
            {data.passiveIncomeUSD > 0 && (
              <div className="plan-cf-summary-row">
                <span className="plan-cf-summary-label">Ingresos pasivos</span>
                <span className="plan-green">+{fmt(data.passiveIncomeUSD)}</span>
              </div>
            )}
            <div className="plan-cf-summary-row">
              <span className="plan-cf-summary-label">Gastos fijos</span>
              <span className="plan-red">-{fmt(data.fixedExpensesUSD)}</span>
            </div>
            <div className="plan-cf-summary-row">
              <span className="plan-cf-summary-label">Pagos de deudas</span>
              <span className="plan-red">-{fmt(data.debtPaymentsUSD)}</span>
            </div>
            <div className="plan-cf-summary-divider" />
            <div className="plan-cf-summary-row plan-cf-summary-total">
              <span className="plan-cf-summary-label">Cashflow neto</span>
              <span className={data.cashflowUSD >= 0 ? 'plan-green' : 'plan-red'}>
                {data.cashflowUSD >= 0 ? '+' : ''}{fmt(data.cashflowUSD)}
              </span>
            </div>
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Plan;
