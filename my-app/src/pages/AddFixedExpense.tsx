import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { 
  FaHandPaper, 
  FaPen, 
  FaDollarSign, 
  FaMoneyBill, 
  FaClipboardList, 
  FaCheckCircle,
  FaArrowLeft,
  FaCalendarAlt,
  FaTag,
  FaHome,
  FaBolt,
  FaShieldAlt,
  FaCar,
  FaUtensils,
  FaHeart,
  FaGraduationCap,
  FaFilm,
  FaEllipsisH
} from 'react-icons/fa';
import { FixedExpense } from '../types';
import { storage } from '../utils/storage';
import { analytics } from '../utils/analytics';
import { notify } from '../utils/notifications';
import { formatCurrencyInput, getCurrencyForField, formatNumberWithSeparators } from '../utils/currencyFormatter';
import './AddDebt.css';

const getCurrencyName = (code: string): string => {
  const currencyNames: { [key: string]: string } = {
    'USD': 'US Dollar',
    'MXN': 'Peso Mexicano',
    'ARS': 'Peso Argentino',
    'CLP': 'Peso Chileno',
    'COP': 'Peso Colombiano',
    'PEN': 'Sol Peruano',
    'BRL': 'Real Brasileño',
    'CRC': 'Colones',
    'GTQ': 'Quetzal',
    'PAB': 'Balboa',
    'DOP': 'Peso Dominicano',
    'VES': 'Bolívar',
    'UYU': 'Peso Uruguayo',
    'PYG': 'Guaraní',
    'BOB': 'Boliviano',
    'HNL': 'Lempira',
    'NIO': 'Córdoba',
  };
  return currencyNames[code] || code;
};

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

interface StepData {
  name?: string;
  amountLocal?: number;
  amountDollars?: number;
  category?: string;
  dueDate?: string;
  notes?: string;
}

const AddFixedExpense: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>({});

  const steps: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: IconType;
    field?: keyof StepData;
    placeholder?: string;
    type?: string;
    optional?: boolean;
    options?: Array<{ value: string; label: string; icon: IconType }>;
  }> = [
    {
      id: 'welcome',
      title: t('addFixedExpense.title'),
      subtitle: t('addFixedExpense.subtitle'),
      icon: FaHandPaper,
    },
    {
      id: 'name',
      title: t('addFixedExpense.expenseName'),
      subtitle: t('addFixedExpense.expenseNameSubtitle'),
      icon: FaPen,
      field: 'name' as keyof StepData,
      placeholder: t('addFixedExpense.expenseNamePlaceholder'),
    },
    {
      id: 'amountLocal',
      title: t('addFixedExpense.amountLocal'),
      subtitle: t('addFixedExpense.amountLocalSubtitle', { currency: getCurrencyName(storage.getLocalCurrency()) }),
      icon: FaMoneyBill,
      field: 'amountLocal' as keyof StepData,
      placeholder: t('common.amountPlaceholder'),
      type: 'number',
    },
    {
      id: 'amountDollars',
      title: t('addFixedExpense.amountDollar'),
      subtitle: t('addFixedExpense.amountDollarSubtitle'),
      icon: FaDollarSign,
      field: 'amountDollars' as keyof StepData,
      placeholder: t('common.amountPlaceholder'),
      type: 'number',
    },
    {
      id: 'dueDate',
      title: t('addFixedExpense.dueDate'),
      subtitle: t('addFixedExpense.dueDateSubtitle'),
      icon: FaCalendarAlt,
      field: 'dueDate' as keyof StepData,
      placeholder: t('addFixedExpense.dueDatePlaceholder'),
      optional: true,
    },
    {
      id: 'notes',
      title: t('addFixedExpense.notes'),
      subtitle: t('addFixedExpense.notesSubtitle'),
      icon: FaClipboardList,
      field: 'notes' as keyof StepData,
      placeholder: t('addFixedExpense.notesPlaceholder'),
      optional: true,
    },
    {
      id: 'complete',
      title: t('common.allDone'),
      subtitle: t('addFixedExpense.success'),
      icon: FaCheckCircle,
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleInputChange = (value: string | number) => {
    const step = steps[currentStep];
    if (step.field) {
      setFormData({ ...formData, [step.field]: value });
    }
  };

  const handleOptionSelect = (value: string) => {
    const step = steps[currentStep];
    if (step.field) {
      setFormData({ ...formData, [step.field]: value });
      handleNext();
    }
  };

  const [currencyDisplayValues, setCurrencyDisplayValues] = useState<{ [key: string]: string }>({});

  const handleCurrencyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = steps[currentStep];
    if (step.field && step.type === 'number') {
      const currency = getCurrencyForField(step.id, storage.getLocalCurrency());
      const inputValue = e.target.value;
      
      let cleanedValue = inputValue.replace(new RegExp(`^${currency}\\s*`, 'i'), '').trim();
      cleanedValue = cleanedValue.replace(/,/g, '');
      const numericString = cleanedValue.replace(/[^\d.]/g, '');
      const formattedNumber = formatNumberWithSeparators(numericString);
      const displayValue = formattedNumber ? `${currency} ${formattedNumber}` : '';
      setCurrencyDisplayValues(prev => ({
        ...prev,
        [step.field!]: displayValue
      }));
      
      const numericValue = numericString ? parseFloat(numericString) : 0;
      const finalValue = isNaN(numericValue) ? 0 : numericValue;
      setFormData({ ...formData, [step.field]: finalValue });
    } else {
      handleInputChange(e.target.value);
    }
  };

  const getCurrencyInputValue = (): string => {
    const step = steps[currentStep];
    if (step.field && step.type === 'number') {
      const fieldKey = step.field;
      if (currencyDisplayValues[fieldKey] !== undefined) {
        return currencyDisplayValues[fieldKey];
      }
      const value = formData[fieldKey];
      if (value === undefined || value === null || (typeof value === 'number' && (isNaN(value) || value === 0))) return '';
      if (typeof value === 'number') {
        const currency = getCurrencyForField(step.id, storage.getLocalCurrency());
        return formatCurrencyInput(value, currency);
      }
    }
    return '';
  };

  useEffect(() => {
    if (currentStep === steps.length - 1 && steps[currentStep].id === 'complete') {
      const timer = setTimeout(() => {
        const dayNum = formData.dueDate ? parseInt(String(formData.dueDate).replace(/\D/g, ''), 10) : 0;
        const t = new Date();
        const paymentDate =
          dayNum >= 1 && dayNum <= 31
            ? `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
            : undefined;
        const newExpense: FixedExpense = {
          id: Date.now().toString(),
          name: formData.name || '',
          amountLocal: formData.amountLocal || 0,
          amountDollars: formData.amountDollars || 0,
          localCurrency: storage.getLocalCurrency(),
          dueDate: formData.dueDate || undefined,
          paymentDate,
          notes: formData.notes || undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        storage.saveFixedExpense(newExpense);
        analytics.addFixedExpense();
        notify.overviewUpdated();
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const getSubtitle = (step: typeof steps[0]) => {
    return step.subtitle;
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const canProceed = () => {
    if (currentStepData.id === 'welcome' || currentStepData.id === 'complete') return true;
    if (currentStepData.options) return true;
    if (currentStepData.optional) return true;
    if (currentStepData.field) {
      const value = formData[currentStepData.field];
      if (currentStepData.type === 'number') {
        return value !== undefined && value !== null && !isNaN(Number(value));
      }
      return value !== undefined && value !== '' && value !== null;
    }
    return false;
  };

  return (
    <div className="add-debt">
      <header className="page-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
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
            {currentStepData.icon && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring' }}
                className="step-icon"
              >
                <Icon component={currentStepData.icon} size={64} />
              </motion.div>
            )}

            <motion.h1
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="step-title"
            >
              {currentStepData.title}
            </motion.h1>

            {getSubtitle(currentStepData) && (
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="step-subtitle"
              >
                {getSubtitle(currentStepData)}
              </motion.p>
            )}

            <div className="step-input">
              {currentStepData.options ? (
                <div className="options-grid">
                  {currentStepData.options.map((option, index) => (
                    <motion.button
                      key={option.value}
                      type="button"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.05 * index }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="option-button"
                      onClick={() => handleOptionSelect(option.value)}
                    >
                      <Icon component={option.icon} className="option-icon" size={32} />
                      <span className="option-label">{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              ) : currentStepData.field ? (
                <motion.input
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  type={currentStepData.type === 'number' ? 'text' : (currentStepData.type || 'text')}
                  placeholder={currentStepData.placeholder}
                  inputMode={currentStepData.type === 'number' ? 'decimal' : undefined}
                  value={
                    currentStepData.type === 'number'
                      ? getCurrencyInputValue()
                      : typeof formData[currentStepData.field] === 'number'
                      ? formData[currentStepData.field]?.toString() || ''
                      : (formData[currentStepData.field] as string) || ''
                  }
                  onChange={(e) => {
                    if (currentStepData.type === 'number') {
                      handleCurrencyInputChange(e);
                    } else {
                      handleInputChange(e.target.value);
                    }
                  }}
                  className="step-input-field"
                  autoFocus
                />
              ) : null}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="step-actions">
          {currentStep > 0 && currentStepData.id !== 'complete' && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-back-step"
              onClick={handleBack}
            >
              {t('common.back')}
            </motion.button>
          )}
          {currentStepData.optional && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-skip"
              onClick={handleSkip}
            >
              {t('common.skip')}
            </motion.button>
          )}
          {currentStepData.id !== 'complete' && !currentStepData.options && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-next"
              onClick={handleNext}
              disabled={!canProceed()}
            >
              {t('common.next')}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddFixedExpense;
