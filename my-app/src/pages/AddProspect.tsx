import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { IconType } from 'react-icons';
import {
  FaHandPaper, FaPen, FaDollarSign, FaPercent, FaCalendarAlt,
  FaTools, FaHome, FaMoneyBillWave, FaChartLine, FaClipboardList,
  FaCheckCircle, FaArrowLeft,
} from 'react-icons/fa';
import { Prospect } from '../types';
import { storage } from '../utils/storage';
import { formatNumberWithSeparators } from '../utils/currencyFormatter';
import './AddDebt.css';

const Icon = ({ component: C, ...p }: { component: any; [k: string]: any }) =>
  C ? <C {...p} /> : null;

interface StepData {
  name?: string;
  propertyValueUSD?: number;
  loanAmountUSD?: number;
  interestRate?: number;
  loanTermYears?: number;
  renovationCostUSD?: number;
  monthlyExpensesUSD?: number;
  monthlyRentUSD?: number;
  vacancyRatePct?: number;
  appreciationRatePct?: number;
  notes?: string;
}

const AddProspect: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>({});
  const [displayValues, setDisplayValues] = useState<Record<string, string>>({});

  const steps: Array<{
    id: string; title: string; subtitle?: string; icon?: IconType;
    field?: keyof StepData; placeholder?: string; type?: string; optional?: boolean;
  }> = [
    { id: 'welcome', title: '¡Analicemos esta propiedad!', subtitle: 'Vamos a calcular si esta inversión genera cashflow positivo.', icon: FaHandPaper },
    { id: 'name', title: '¿Cómo se llama o dónde está?', subtitle: 'Dirección o nombre del prospecto.', icon: FaPen, field: 'name', placeholder: 'Ej: Apartamento en Escazú' },
    { id: 'propertyValueUSD', title: 'Valor de la propiedad', subtitle: 'Precio de compra en USD.', icon: FaHome, field: 'propertyValueUSD', placeholder: '0', type: 'usd' },
    { id: 'loanAmountUSD', title: '¿Cuánto vas a financiar?', subtitle: 'Monto del préstamo en USD. El resto es tu enganche.', icon: FaDollarSign, field: 'loanAmountUSD', placeholder: '0', type: 'usd' },
    { id: 'interestRate', title: 'Tasa de interés anual', subtitle: 'Tasa del préstamo hipotecario (% anual).', icon: FaPercent, field: 'interestRate', placeholder: 'Ej: 7.5', type: 'percent' },
    { id: 'loanTermYears', title: 'Plazo del préstamo', subtitle: 'Años para pagar el préstamo.', icon: FaCalendarAlt, field: 'loanTermYears', placeholder: 'Ej: 20', type: 'integer' },
    { id: 'renovationCostUSD', title: 'Costo de reparaciones', subtitle: 'Lo que necesitás gastar para dejarla lista (USD).', icon: FaTools, field: 'renovationCostUSD', placeholder: '0', type: 'usd', optional: true },
    { id: 'monthlyExpensesUSD', title: 'Gastos mensuales de la propiedad', subtitle: 'Impuestos, seguro, mantenimiento, HOA, etc. (USD/mes).', icon: FaMoneyBillWave, field: 'monthlyExpensesUSD', placeholder: '0', type: 'usd' },
    { id: 'monthlyRentUSD', title: '¿Cuánto pretendés alquilarla?', subtitle: 'Ingreso mensual esperado por alquiler bruto (USD/mes).', icon: FaDollarSign, field: 'monthlyRentUSD', placeholder: '0', type: 'usd' },
    { id: 'vacancyRatePct', title: '¿Qué vacancia estimás?', subtitle: 'Porcentaje del año que estará sin alquilar. Por defecto 5%.', icon: FaPercent, field: 'vacancyRatePct', placeholder: '5', type: 'percent', optional: true },
    { id: 'appreciationRatePct', title: 'Plusvalía estimada anual', subtitle: '¿Cuánto estimás que sube de valor cada año? (% anual).', icon: FaChartLine, field: 'appreciationRatePct', placeholder: 'Ej: 5', type: 'percent', optional: true },
    { id: 'notes', title: 'Notas adicionales', subtitle: 'Cualquier detalle extra que querás recordar.', icon: FaClipboardList, field: 'notes', placeholder: 'Ej: Cerca del centro, buen vecindario...', optional: true },
    { id: 'complete', title: '¡Prospecto guardado!', subtitle: 'Podés ver el análisis completo en la lista.', icon: FaCheckCircle },
  ];

  const handleNext = () => currentStep < steps.length - 1 && setCurrentStep(s => s + 1);
  const handleBack = () => currentStep > 0 && setCurrentStep(s => s - 1);

  const handleInputChange = (value: string) => {
    const step = steps[currentStep];
    if (!step.field) return;
    setFormData(prev => ({ ...prev, [step.field!]: value }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = steps[currentStep];
    if (!step.field) return;
    const raw = e.target.value.replace(/,/g, '').replace(/[^\d.]/g, '');
    const formatted = formatNumberWithSeparators(raw);
    const prefix = step.type === 'usd' ? '$ ' : '';
    const suffix = step.type === 'percent' ? '%' : '';
    setDisplayValues(prev => ({ ...prev, [step.field!]: prefix + formatted + suffix }));
    setFormData(prev => ({ ...prev, [step.field!]: raw ? parseFloat(raw) : undefined }));
  };

  const getDisplayValue = () => {
    const step = steps[currentStep];
    if (!step.field) return '';
    if (displayValues[step.field] !== undefined) return displayValues[step.field];
    const val = formData[step.field];
    if (val === undefined || val === null || val === '') return '';
    if (step.type === 'usd') return `$ ${formatNumberWithSeparators(String(val))}`;
    if (step.type === 'percent') return `${val}%`;
    return String(val);
  };

  const canProceed = () => {
    const step = steps[currentStep];
    if (!step.field || step.optional) return true;
    const val = formData[step.field];
    if (step.type === 'usd' || step.type === 'percent' || step.type === 'integer') {
      return val !== undefined && val !== null && !isNaN(Number(val));
    }
    return val !== undefined && val !== '';
  };

  useEffect(() => {
    const step = steps[currentStep];
    if (step.id === 'complete') {
      const timer = setTimeout(() => {
        const prospect: Prospect = {
          id: Date.now().toString(),
          name: formData.name || 'Propiedad sin nombre',
          propertyValueUSD: formData.propertyValueUSD || 0,
          loanAmountUSD: formData.loanAmountUSD || 0,
          interestRate: formData.interestRate || 0,
          loanTermYears: formData.loanTermYears || 20,
          renovationCostUSD: formData.renovationCostUSD || 0,
          monthlyExpensesUSD: formData.monthlyExpensesUSD || 0,
          monthlyRentUSD: formData.monthlyRentUSD || 0,
          vacancyRatePct: formData.vacancyRatePct ?? 5,
          appreciationRatePct: formData.appreciationRatePct || 0,
          notes: formData.notes || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        storage.saveProspect(prospect);
        navigate('/prospects');
      }, 1200);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const step = steps[currentStep];
  const isNumberField = step.type === 'usd' || step.type === 'percent' || step.type === 'integer';
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="add-debt">
      <header className="page-header">
        <button className="btn-back" onClick={() => navigate('/prospects')}>
          <Icon component={FaArrowLeft} style={{ marginRight: 8 }} /> Volver
        </button>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="form-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="step-content"
          >
            {step.icon && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }} className="step-icon">
                <Icon component={step.icon} size={64} />
              </motion.div>
            )}
            <motion.h1 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="step-title">
              {step.title}
            </motion.h1>
            {step.subtitle && (
              <motion.p initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="step-subtitle">
                {step.subtitle}
              </motion.p>
            )}
            <div className="step-input">
              {step.field && (
                <motion.input
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  type={isNumberField ? 'text' : 'text'}
                  inputMode={isNumberField ? 'decimal' : 'text'}
                  placeholder={step.placeholder}
                  value={isNumberField ? getDisplayValue() : (formData[step.field] as string) || ''}
                  onChange={isNumberField ? handleNumberChange : (e) => handleInputChange(e.target.value)}
                  className="step-input-field"
                  autoFocus
                />
              )}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="step-actions">
          {currentStep > 0 && step.id !== 'complete' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-back-step" onClick={handleBack}>
              Atrás
            </motion.button>
          )}
          {step.optional && step.id !== 'complete' && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="btn-skip" onClick={handleNext}>
              Saltar
            </motion.button>
          )}
          {step.id !== 'complete' && (
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="btn-next"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Siguiente
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddProspect;
