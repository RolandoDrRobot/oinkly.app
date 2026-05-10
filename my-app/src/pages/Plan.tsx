import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaChartLine, FaBolt, FaPiggyBank, FaCheckCircle, FaExclamationTriangle, FaTrophy } from 'react-icons/fa';
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
    const debts = storage.getDebts().filter(d => !d.closedAt);
    const incomes = storage.getIncomes();
    const fixedExpenses = storage.getFixedExpenses();
    const assets = storage.getAssets();
    const rate = parseFloat(localStorage.getItem('cashflow_exchange_rate') || '500') || 500;
    const savingsLocal = parseFloat(localStorage.getItem('cashflow_savings_local') || '0') || 0;
    const savingsUSD = parseFloat(localStorage.getItem('cashflow_savings_usd') || '0') || 0;

    const toUSD = (local: number) => local / rate;

    const activeIncomeUSD = incomes.reduce((a, i) => a + (i.amountDollars || 0) + toUSD(i.amountLocal || 0), 0);
    const passiveIncomeUSD = assets.reduce((a, as) => a + (as.monthlyIncomeUSD || 0) + toUSD(as.monthlyIncomeLocal || 0), 0);
    const totalIncomeUSD = activeIncomeUSD + passiveIncomeUSD;

    const fixedExpensesUSD = fixedExpenses.reduce((a, e) => a + (e.amountDollars || 0) + toUSD(e.amountLocal || 0), 0);
    const debtPaymentsUSD = debts.reduce((a, d) => a + (d.dollarFee || 0) + toUSD(d.localFee || 0), 0);
    const totalExpensesUSD = fixedExpensesUSD + debtPaymentsUSD;
    const cashflowUSD = totalIncomeUSD - totalExpensesUSD;

    const totalSavingsUSD = savingsUSD + toUSD(savingsLocal);

    return { debts, rate, toUSD, activeIncomeUSD, passiveIncomeUSD, totalIncomeUSD, fixedExpensesUSD, debtPaymentsUSD, totalExpensesUSD, cashflowUSD, totalSavingsUSD };
  }, []);

  // Q1 & Q2: Snowball — debts sorted smallest total to largest
  const snowball = useMemo(() => {
    const { debts, toUSD, cashflowUSD, debtPaymentsUSD } = data;
    if (debts.length === 0) return [];

    const sorted = [...debts]
      .map(d => ({
        ...d,
        totalUSD: (d.totalDollars || 0) + toUSD(d.totalLocal || 0),
        feeUSD: (d.dollarFee || 0) + toUSD(d.localFee || 0),
      }))
      .sort((a, b) => a.totalUSD - b.totalUSD);

    let extraCashflow = Math.max(cashflowUSD, 0);
    let cumulativeMonths = 0;
    const results: { name: string; totalUSD: number; feeUSD: number; months: number; cumulativeMonths: number; newCashflow: number }[] = [];

    for (const debt of sorted) {
      const monthlyAttack = debt.feeUSD + extraCashflow;
      const months = monthlyAttack > 0 ? Math.ceil(debt.totalUSD / monthlyAttack) : Infinity;
      cumulativeMonths += months === Infinity ? 0 : months;
      extraCashflow += debt.feeUSD;
      results.push({
        name: debt.name,
        totalUSD: debt.totalUSD,
        feeUSD: debt.feeUSD,
        months,
        cumulativeMonths,
        newCashflow: extraCashflow - debtPaymentsUSD + data.cashflowUSD + debt.feeUSD,
      });
    }
    return results;
  }, [data]);

  // Q3: Meses de gastos cubiertos por ahorros
  const emergencyMonths = useMemo(() => {
    const monthly = data.totalExpensesUSD;
    if (monthly <= 0) return Infinity;
    return data.totalSavingsUSD / monthly;
  }, [data]);

  // Q4: DTI — debt-to-income ratio
  const dti = useMemo(() => {
    if (data.totalIncomeUSD <= 0) return 0;
    return (data.debtPaymentsUSD / data.totalIncomeUSD) * 100;
  }, [data]);

  // Q5: Libertad financiera
  const freedomGap = useMemo(() => {
    const gap = data.totalExpensesUSD - data.passiveIncomeUSD;
    const pct = data.totalExpensesUSD > 0 ? Math.min((data.passiveIncomeUSD / data.totalExpensesUSD) * 100, 100) : 0;
    return { gap, pct };
  }, [data]);

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
  };

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

        {/* Q1: Snowball */}
        <motion.div custom={0} variants={cardVariants} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaChartLine} className="plan-icon" />
            <div>
              <h2 className="plan-question">¿En qué orden eliminar mis deudas?</h2>
              <p className="plan-subtitle">Método Snowball — ataca la más pequeña primero, libera cashflow, usa ese extra en la siguiente.</p>
            </div>
          </div>

          {snowball.length === 0 ? (
            <p className="plan-empty">No tienes deudas activas. ¡Excelente!</p>
          ) : data.cashflowUSD <= 0 ? (
            <div className="plan-alert">
              <Icon component={FaExclamationTriangle} /> Tu cashflow es negativo ({fmt(data.cashflowUSD)}). Primero necesitas reducir gastos o aumentar ingresos para poder atacar deudas.
            </div>
          ) : (
            <div className="plan-snowball-list">
              {snowball.map((s, i) => (
                <div key={s.name} className="plan-snowball-item">
                  <div className="plan-snowball-step">{i + 1}</div>
                  <div className="plan-snowball-info">
                    <span className="plan-snowball-name">{s.name}</span>
                    <span className="plan-snowball-detail">
                      {fmt(s.totalUSD)} · cuota {fmt(s.feeUSD)}/mes
                    </span>
                  </div>
                  <div className="plan-snowball-result">
                    {s.months === Infinity ? (
                      <span className="plan-snowball-months plan-red">∞</span>
                    ) : (
                      <span className="plan-snowball-months">{s.months} {s.months === 1 ? 'mes' : 'meses'}</span>
                    )}
                    <span className="plan-snowball-cumulative">~{s.cumulativeMonths} acumulados</span>
                  </div>
                </div>
              ))}
              <div className="plan-snowball-footer">
                <Icon component={FaTrophy} style={{ color: 'var(--primary)', marginRight: 6 }} />
                Libre de deudas en aproximadamente <strong>{snowball[snowball.length - 1]?.cumulativeMonths} meses</strong> ({Math.ceil((snowball[snowball.length - 1]?.cumulativeMonths || 0) / 12 * 10) / 10} años)
              </div>
            </div>
          )}
        </motion.div>

        {/* Q2: Cashflow liberado por deuda */}
        <motion.div custom={1} variants={cardVariants} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaBolt} className="plan-icon" />
            <div>
              <h2 className="plan-question">¿Cuánto cashflow libero al liquidar cada deuda?</h2>
              <p className="plan-subtitle">Cada deuda eliminada suma su cuota mensual a tu flujo libre.</p>
            </div>
          </div>
          {snowball.length === 0 ? (
            <p className="plan-empty">No tienes deudas activas.</p>
          ) : (
            <div className="plan-table">
              <div className="plan-table-row plan-table-header">
                <span>Deuda</span>
                <span>Cuota/mes</span>
                <span>Cashflow después</span>
              </div>
              {snowball.map((s, i) => {
                const freed = snowball.slice(0, i + 1).reduce((a, x) => a + x.feeUSD, 0);
                const newCF = data.cashflowUSD + freed;
                return (
                  <div key={s.name} className="plan-table-row">
                    <span className="plan-table-name">{s.name}</span>
                    <span className="plan-green">+{fmt(s.feeUSD)}</span>
                    <span className={newCF >= 0 ? 'plan-green' : 'plan-red'}>{fmt(newCF)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Q3: Fondo de emergencia */}
        <motion.div custom={2} variants={cardVariants} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaPiggyBank} className="plan-icon" />
            <div>
              <h2 className="plan-question">¿Cuántos meses de gastos cubren tus ahorros?</h2>
              <p className="plan-subtitle">Regla general: tener 3–6 meses de gastos ahorrados como fondo de emergencia.</p>
            </div>
          </div>
          <div className="plan-stat-row">
            <div className="plan-stat">
              <span className="plan-stat-label">Ahorros totales</span>
              <span className="plan-stat-value">{fmt(data.totalSavingsUSD)}</span>
            </div>
            <div className="plan-stat">
              <span className="plan-stat-label">Gastos mensuales</span>
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
              <div className="plan-progress-marker" style={{ left: '50%' }} title="3 meses" />
            </div>
            <div className="plan-progress-labels">
              <span>0</span><span>3 meses</span><span>6 meses</span>
            </div>
          </div>
          {emergencyMonths < 3 && data.totalExpensesUSD > 0 && (
            <p className="plan-tip">Necesitas ahorrar {fmt(3 * data.totalExpensesUSD - data.totalSavingsUSD)} más para alcanzar 3 meses de cobertura.</p>
          )}
        </motion.div>

        {/* Q4: DTI */}
        <motion.div custom={3} variants={cardVariants} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaExclamationTriangle} className="plan-icon" />
            <div>
              <h2 className="plan-question">¿Qué tan cargada está tu deuda vs tus ingresos?</h2>
              <p className="plan-subtitle">Debt-to-Income (DTI). Sano: menos del 36%. Crítico: más del 50%.</p>
            </div>
          </div>
          <div className="plan-stat-row">
            <div className="plan-stat">
              <span className="plan-stat-label">Pagos de deuda/mes</span>
              <span className="plan-stat-value">{fmt(data.debtPaymentsUSD)}</span>
            </div>
            <div className="plan-stat">
              <span className="plan-stat-label">Ingresos totales/mes</span>
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
              <div className="plan-dti-marker" style={{ left: '36%' }} title="36%" />
              <div className="plan-dti-marker" style={{ left: '50%' }} title="50%" />
            </div>
            <div className="plan-progress-labels">
              <span>0%</span><span>36%</span><span>50%</span><span>100%</span>
            </div>
          </div>
          <p className="plan-tip">
            {dti <= 36 ? '✅ Tu DTI está en zona sana.' : dti <= 50 ? '⚠️ Tu DTI es elevado. Considera reducir deudas antes de contraer nuevas.' : '🚨 Tu DTI es crítico. Prioriza eliminar deudas cuanto antes.'}
          </p>
        </motion.div>

        {/* Q5: Libertad financiera */}
        <motion.div custom={4} variants={cardVariants} initial="hidden" animate="visible" className="plan-card">
          <div className="plan-card-header">
            <Icon component={FaCheckCircle} className="plan-icon" />
            <div>
              <h2 className="plan-question">¿Qué tan cerca estás de la libertad financiera?</h2>
              <p className="plan-subtitle">Libertad financiera = ingresos pasivos (de activos) ≥ gastos totales mensuales.</p>
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
              Necesitas {fmt(freedomGap.gap)}/mes más en ingresos pasivos para ser libre. Agrégalos a tus activos como ingreso mensual.
            </p>
          )}
        </motion.div>

      </div>
    </motion.div>
  );
};

export default Plan;
