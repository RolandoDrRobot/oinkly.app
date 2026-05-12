import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft, FaHome, FaTrash, FaChevronDown, FaChevronUp,
  FaCheckCircle, FaExclamationTriangle, FaTimesCircle,
} from 'react-icons/fa';
import { Prospect } from '../types';
import { storage } from '../utils/storage';
import './AddDebt.css';
import './Prospects.css';

const Icon = ({ component: C, ...p }: { component: any; [k: string]: any }) =>
  C ? <C {...p} /> : null;

const usd = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);

const pct = (n: number, d = 1) => `${n.toFixed(d)}%`;

// PMT — cuota mensual hipoteca
const pmt = (principal: number, annualRate: number, years: number): number => {
  if (principal <= 0) return 0;
  if (annualRate === 0) return principal / (years * 12);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  return principal * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};

// Saldo restante del préstamo después de K meses
const remainingBalance = (principal: number, annualRate: number, years: number, monthsPaid: number): number => {
  if (principal <= 0) return 0;
  if (annualRate === 0) return Math.max(0, principal - (principal / (years * 12)) * monthsPaid);
  const r = annualRate / 100 / 12;
  const n = years * 12;
  const payment = pmt(principal, annualRate, years);
  return principal * Math.pow(1 + r, monthsPaid) - payment * (Math.pow(1 + r, monthsPaid) - 1) / r;
};

const analyze = (p: Prospect) => {
  const vacancy = (p.vacancyRatePct ?? 5) / 100;
  const effectiveRent = p.monthlyRentUSD * (1 - vacancy);

  const downPayment = p.propertyValueUSD - p.loanAmountUSD;
  const totalInvestment = Math.max(downPayment, 0) + p.renovationCostUSD;
  const mortgage = pmt(p.loanAmountUSD, p.interestRate, p.loanTermYears);

  const monthlyCashflow = effectiveRent - mortgage - p.monthlyExpensesUSD;
  const annualCashflow = monthlyCashflow * 12;

  // NOI usa renta efectiva
  const noi = (effectiveRent - p.monthlyExpensesUSD) * 12;
  const capRate = p.propertyValueUSD > 0 ? (noi / p.propertyValueUSD) * 100 : 0;
  const cashOnCash = totalInvestment > 0 ? (annualCashflow / totalInvestment) * 100 : 0;

  // LTV
  const ltv = p.propertyValueUSD > 0 ? (p.loanAmountUSD / p.propertyValueUSD) * 100 : 0;

  // DSCR = NOI / Debt Service anual
  const annualDebtService = mortgage * 12;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;

  // Break-even occupancy = (Mortgage + Expenses) / Gross Rent
  const breakEvenOcc = p.monthlyRentUSD > 0
    ? ((mortgage + p.monthlyExpensesUSD) / p.monthlyRentUSD) * 100
    : 100;

  // Regla del 1%
  const onePercentRule = p.propertyValueUSD > 0 ? (p.monthlyRentUSD / p.propertyValueUSD) * 100 : 0;
  const passesOnePercent = onePercentRule >= 1;

  // GRM (Gross Rent Multiplier)
  const grm = p.monthlyRentUSD > 0 ? p.propertyValueUSD / (p.monthlyRentUSD * 12) : 0;

  // Proyección 5 años — con amortización real
  const valueAt5 = p.propertyValueUSD * Math.pow(1 + p.appreciationRatePct / 100, 5);
  const loanRemaining5 = remainingBalance(p.loanAmountUSD, p.interestRate, p.loanTermYears, 60);
  const equityAt5 = valueAt5 - loanRemaining5;
  const totalGainAt5 = equityAt5 - totalInvestment + annualCashflow * 5;

  return {
    effectiveRent, downPayment, totalInvestment, mortgage,
    monthlyCashflow, annualCashflow, noi,
    capRate, cashOnCash, ltv, dscr, breakEvenOcc,
    onePercentRule, passesOnePercent, grm,
    valueAt5, loanRemaining5, equityAt5, totalGainAt5,
  };
};

// Editable number field
const EditableField: React.FC<{
  label: string; value: number;
  prefix?: string; suffix?: string;
  onChange: (v: number) => void; onSave: () => void;
}> = ({ label, value, prefix = '', suffix = '', onChange, onSave }) => {
  const [raw, setRaw] = useState(value > 0 ? String(value) : '');
  useEffect(() => { setRaw(value > 0 ? String(value) : ''); }, [value]);
  return (
    <div className="prospect-edit-row">
      <span className="prospect-edit-label">{label}</span>
      <div className="prospect-edit-input-wrap">
        {prefix && <span className="prospect-edit-affix">{prefix}</span>}
        <input
          className="prospect-edit-input"
          type="text" inputMode="decimal" value={raw}
          onChange={e => {
            const v = e.target.value.replace(/[^\d.]/g, '');
            setRaw(v);
            const n = parseFloat(v);
            onChange(isNaN(n) ? 0 : n);
          }}
          onBlur={() => { const n = parseFloat(raw); onChange(isNaN(n) ? 0 : n); onSave(); }}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        />
        {suffix && <span className="prospect-edit-affix">{suffix}</span>}
      </div>
    </div>
  );
};

// Badge de indicador
const Badge: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className={`prospect-badge ${ok ? 'prospect-badge--ok' : 'prospect-badge--bad'}`}>{label}</span>
);

const Verdict: React.FC<{ a: ReturnType<typeof analyze> }> = ({ a }) => {
  const score = [
    a.cashOnCash >= 8, a.capRate >= 5, a.dscr >= 1.25,
    a.passesOnePercent, a.breakEvenOcc < 85,
  ].filter(Boolean).length;
  if (score >= 4) return <div className="prospect-verdict prospect-verdict--good"><Icon component={FaCheckCircle} /> Excelente inversión ({score}/5 criterios)</div>;
  if (score >= 2) return <div className="prospect-verdict prospect-verdict--ok"><Icon component={FaExclamationTriangle} /> Inversión moderada ({score}/5 criterios)</div>;
  return <div className="prospect-verdict prospect-verdict--bad"><Icon component={FaTimesCircle} /> Inversión débil ({score}/5 criterios)</div>;
};

const MetricRow: React.FC<{ label: string; value: string; color?: string; hint?: string }> = ({ label, value, color, hint }) => (
  <div className="prospect-row">
    <span>{label}{hint && <span className="prospect-hint"> · {hint}</span>}</span>
    <span style={color ? { color } : undefined}>{value}</span>
  </div>
);

const ProspectCard: React.FC<{ prospect: Prospect; onDelete: (id: string) => void }> = ({ prospect, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [data, setData] = useState<Prospect>({ ...prospect, vacancyRatePct: prospect.vacancyRatePct ?? 5 });
  const a = analyze(data);

  const set = (field: keyof Prospect) => (v: number) =>
    setData(prev => ({ ...prev, [field]: v }));

  const save = useCallback(() => {
    storage.saveProspect({ ...data, updatedAt: new Date().toISOString() });
  }, [data]);

  const cfColor = a.monthlyCashflow >= 0 ? 'var(--primary)' : '#ef4444';
  const dscrColor = a.dscr >= 1.25 ? 'var(--primary)' : a.dscr >= 1 ? '#f59e0b' : '#ef4444';
  const ltvColor = a.ltv <= 80 ? 'var(--primary)' : a.ltv <= 90 ? '#f59e0b' : '#ef4444';
  const beColor = a.breakEvenOcc <= 80 ? 'var(--primary)' : a.breakEvenOcc <= 90 ? '#f59e0b' : '#ef4444';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="prospect-card">
      {/* Collapsed */}
      <div className="prospect-card-top" onClick={() => setExpanded(e => !e)}>
        <div className="prospect-card-left">
          <span className="prospect-card-name">{data.name}</span>
          <span className="prospect-card-value">{usd(data.propertyValueUSD)}</span>
        </div>
        <div className="prospect-card-right">
          <span className="prospect-cf" style={{ color: cfColor }}>
            {a.monthlyCashflow >= 0 ? '+' : ''}{usd(a.monthlyCashflow)}/mes
          </span>
          <Icon component={expanded ? FaChevronUp : FaChevronDown} size={13} style={{ opacity: 0.5, marginLeft: 4 }} />
        </div>
      </div>

      {/* Quick metrics */}
      <div className="prospect-quick-metrics">
        <div className="prospect-metric">
          <span className="prospect-metric-label">Cap Rate</span>
          <span className="prospect-metric-value" style={{ color: a.capRate >= 5 ? 'var(--primary)' : a.capRate >= 3 ? '#f59e0b' : '#ef4444' }}>{pct(a.capRate)}</span>
        </div>
        <div className="prospect-metric">
          <span className="prospect-metric-label">DSCR</span>
          <span className="prospect-metric-value" style={{ color: dscrColor }}>{a.dscr.toFixed(2)}</span>
        </div>
        <div className="prospect-metric">
          <span className="prospect-metric-label">Cash-on-Cash</span>
          <span className="prospect-metric-value" style={{ color: a.cashOnCash >= 8 ? 'var(--primary)' : a.cashOnCash >= 4 ? '#f59e0b' : '#ef4444' }}>{pct(a.cashOnCash)}</span>
        </div>
        <div className="prospect-metric">
          <span className="prospect-metric-label">LTV</span>
          <span className="prospect-metric-value" style={{ color: ltvColor }}>{pct(a.ltv)}</span>
        </div>
      </div>

      {/* Badges */}
      <div className="prospect-badges">
        <Badge ok={a.passesOnePercent} label={`Regla 1% (${pct(a.onePercentRule, 2)})`} />
        <Badge ok={a.dscr >= 1.25} label={`DSCR ≥ 1.25`} />
        <Badge ok={a.ltv <= 80} label={`LTV ≤ 80%`} />
        <Badge ok={a.breakEvenOcc < 85} label={`Break-even ${pct(a.breakEvenOcc, 0)}`} />
      </div>

      {/* Expanded */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="prospect-detail">
              <div className="prospect-section-title">Variables — tocá para editar</div>
              <EditableField label="Valor propiedad" value={data.propertyValueUSD} prefix="$" onChange={set('propertyValueUSD')} onSave={save} />
              <EditableField label="Financiamiento" value={data.loanAmountUSD} prefix="$" onChange={set('loanAmountUSD')} onSave={save} />
              <EditableField label="Tasa de interés" value={data.interestRate} suffix="%" onChange={set('interestRate')} onSave={save} />
              <EditableField label="Plazo" value={data.loanTermYears} suffix="años" onChange={set('loanTermYears')} onSave={save} />
              <EditableField label="Reparaciones" value={data.renovationCostUSD} prefix="$" onChange={set('renovationCostUSD')} onSave={save} />
              <EditableField label="Gastos mensuales" value={data.monthlyExpensesUSD} prefix="$" suffix="/mes" onChange={set('monthlyExpensesUSD')} onSave={save} />
              <EditableField label="Alquiler bruto" value={data.monthlyRentUSD} prefix="$" suffix="/mes" onChange={set('monthlyRentUSD')} onSave={save} />
              <EditableField label="Vacancia estimada" value={data.vacancyRatePct ?? 5} suffix="%" onChange={set('vacancyRatePct')} onSave={save} />
              <EditableField label="Plusvalía anual" value={data.appreciationRatePct} suffix="%" onChange={set('appreciationRatePct')} onSave={save} />

              <div className="prospect-divider" />

              <div className="prospect-section-title">Inversión inicial</div>
              <MetricRow label="Enganche" value={usd(a.downPayment)} />
              <MetricRow label="Reparaciones" value={usd(data.renovationCostUSD)} />
              <div className="prospect-row prospect-row--total"><span>Total invertido</span><span>{usd(a.totalInvestment)}</span></div>

              <div className="prospect-divider" />

              <div className="prospect-section-title">Flujo mensual</div>
              <MetricRow label={`Alquiler efectivo (${pct(100 - (data.vacancyRatePct ?? 5), 0)} ocu.)`} value={`+${usd(a.effectiveRent)}`} color="var(--primary)" />
              <MetricRow label="Hipoteca/mes" value={`-${usd(a.mortgage)}`} color="#ef4444" />
              <MetricRow label="Gastos prop./mes" value={`-${usd(data.monthlyExpensesUSD)}`} color="#ef4444" />
              <div className="prospect-row prospect-row--total">
                <span>Cashflow neto</span>
                <span style={{ color: cfColor }}>{a.monthlyCashflow >= 0 ? '+' : ''}{usd(a.monthlyCashflow)}/mes</span>
              </div>

              <div className="prospect-divider" />

              <div className="prospect-section-title">Métricas de inversión</div>
              <MetricRow label="Cap Rate" value={pct(a.capRate)} hint="≥5% bueno" color={a.capRate >= 5 ? 'var(--primary)' : '#f59e0b'} />
              <MetricRow label="Cash-on-Cash" value={pct(a.cashOnCash)} hint="≥8% excelente" color={a.cashOnCash >= 8 ? 'var(--primary)' : a.cashOnCash >= 4 ? '#f59e0b' : '#ef4444'} />
              <MetricRow label="DSCR" value={a.dscr.toFixed(2)} hint="≥1.25 banco aprueba" color={dscrColor} />
              <MetricRow label="LTV" value={pct(a.ltv)} hint="≤80% sano" color={ltvColor} />
              <MetricRow label="Break-even ocupación" value={pct(a.breakEvenOcc)} hint="cuánto necesitás alquilado" color={beColor} />
              <MetricRow label="GRM" value={a.grm.toFixed(1)} hint="precio vs renta anual bruta" />
              <MetricRow label="Regla del 1%" value={pct(a.onePercentRule, 2)} hint="≥1% mínimo mercado" color={a.passesOnePercent ? 'var(--primary)' : '#ef4444'} />

              <div className="prospect-divider" />

              <div className="prospect-section-title">Proyección 5 años</div>
              <MetricRow label="Valor estimado" value={usd(a.valueAt5)} />
              <MetricRow label="Saldo préstamo restante" value={usd(a.loanRemaining5)} />
              <MetricRow label="Equity en 5 años" value={usd(a.equityAt5)} color="var(--primary)" />
              <MetricRow label="Cashflow acumulado 5a" value={usd(a.annualCashflow * 5)} color={a.annualCashflow >= 0 ? 'var(--primary)' : '#ef4444'} />
              <div className="prospect-row prospect-row--total">
                <span>Ganancia total 5a</span>
                <span style={{ color: a.totalGainAt5 >= 0 ? 'var(--primary)' : '#ef4444' }}>{usd(a.totalGainAt5)}</span>
              </div>

              <div className="prospect-divider" />

              <Verdict a={a} />

              {data.notes && <p className="prospect-notes">{data.notes}</p>}

              <button className="prospect-delete-btn" onClick={() => onDelete(data.id)}>
                <Icon component={FaTrash} size={12} style={{ marginRight: 6 }} /> Eliminar prospecto
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const Prospects: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [prospects, setProspects] = useState<Prospect[]>([]);

  useEffect(() => {
    setProspects(storage.getProspects().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  }, []);

  const handleDelete = (id: string) => {
    storage.deleteProspect(id);
    setProspects(prev => prev.filter(p => p.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prospects-page">
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="page-header">
        <div className="header-content">
          <h1>Prospectos</h1>
          <motion.button type="button" className="btn-back" onClick={() => navigate('/dashboard')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Icon component={FaArrowLeft} style={{ marginRight: 8 }} /> {t('common.back')}
          </motion.button>
        </div>
      </motion.header>

      <div className="prospects-content">
        {prospects.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="prospects-empty">
            <Icon component={FaHome} size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p>No tenés prospectos aún.</p>
            <p style={{ fontSize: 13, opacity: 0.6 }}>Usá el botón + para analizar una propiedad.</p>
          </motion.div>
        ) : (
          <div className="prospects-list">
            {prospects.map(p => <ProspectCard key={p.id} prospect={p} onDelete={handleDelete} />)}
          </div>
        )}
      </div>

      <div className="prospects-fab-wrap">
        <motion.button type="button" className="prospects-fab" onClick={() => navigate('/add-prospect')}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
          +
        </motion.button>
      </div>
    </motion.div>
  );
};

export default Prospects;
