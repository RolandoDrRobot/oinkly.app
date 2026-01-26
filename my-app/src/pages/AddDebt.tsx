import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { 
  FaHandPaper, 
  FaPen, 
  FaCreditCard, 
  FaMoneyBillWave, 
  FaLandmark, 
  FaPhone, 
  FaDollarSign, 
  FaMoneyBill, 
  FaClipboardList, 
  FaCheckCircle, 
  FaPhoneAlt,
  FaGift,
  FaTimes,
  FaArrowLeft
} from 'react-icons/fa';
import { Debt } from '../types';
import { storage } from '../utils/storage';
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
  type?: 'prestamo' | 'tarjeta';
  bankName?: string;
  bankPhone?: string;
  localFee?: number;
  dollarFee?: number;
  totalLocal?: number;
  totalDollars?: number;
  currentPlan?: string;
  hasCallTask?: boolean;
}

const AddDebt: React.FC = () => {
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
      title: t('addDebt.title'),
      subtitle: t('addDebt.subtitle'),
      icon: FaHandPaper,
    },
    {
      id: 'name',
      title: t('addDebt.debtName'),
      subtitle: t('addDebt.debtNameSubtitle'),
      icon: FaPen,
      field: 'name' as keyof StepData,
      placeholder: t('addDebt.debtNamePlaceholder'),
    },
    {
      id: 'type',
      title: t('addDebt.debtType'),
      subtitle: t('addDebt.debtTypeSubtitle'),
      icon: FaCreditCard,
      options: [
        { value: 'prestamo', label: t('addDebt.loan'), icon: FaMoneyBillWave },
        { value: 'tarjeta', label: t('addDebt.creditCard'), icon: FaCreditCard },
      ],
    },
    {
      id: 'bank',
      title: t('addDebt.bankName'),
      subtitle: t('addDebt.bankNameSubtitle'),
      icon: FaLandmark,
      field: 'bankName' as keyof StepData,
      placeholder: t('addDebt.bankNamePlaceholder'),
    },
    {
      id: 'phone',
      title: t('addDebt.bankPhone'),
      subtitle: t('addDebt.bankPhoneSubtitle'),
      icon: FaPhone,
      field: 'bankPhone' as keyof StepData,
      placeholder: '+1 234 567 8900',
      optional: true,
    },
    {
      id: 'localFee',
      title: t('addDebt.monthlyPaymentLocal'),
      subtitle: t('addDebt.monthlyPaymentLocalSubtitle', { currency: getCurrencyName(storage.getLocalCurrency()) }),
      icon: FaMoneyBill,
      field: 'localFee' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'dollarFee',
      title: t('addDebt.monthlyPaymentDollar'),
      subtitle: t('addDebt.monthlyPaymentDollarSubtitle'),
      icon: FaDollarSign,
      field: 'dollarFee' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'totalLocal',
      title: t('addDebt.totalDebtLocal'),
      subtitle: t('addDebt.totalDebtLocalSubtitle', { currency: getCurrencyName(storage.getLocalCurrency()) }),
      icon: FaMoneyBill,
      field: 'totalLocal' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'totalDollars',
      title: t('addDebt.totalDebtDollar'),
      subtitle: t('addDebt.totalDebtDollarSubtitle'),
      icon: FaDollarSign,
      field: 'totalDollars' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'currentPlan',
      title: t('addDebt.paymentPlan'),
      subtitle: t('addDebt.paymentPlanSubtitle'),
      icon: FaClipboardList,
      field: 'currentPlan' as keyof StepData,
      placeholder: t('addDebt.paymentPlanPlaceholder'),
    },
    {
      id: 'callTask',
      title: t('addDebt.callReminder'),
      subtitle: t('addDebt.callReminderSubtitle'),
      icon: FaPhoneAlt,
      type: 'boolean',
    },
    {
      id: 'complete',
      title: t('common.allDone'),
      subtitle: t('addDebt.success'),
      icon: FaGift,
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

  const handleOptionSelect = (value: string) => {
    const step = steps[currentStep];
    if (step.id === 'type') {
      setFormData({ ...formData, type: value as 'prestamo' | 'tarjeta' });
    }
    setTimeout(() => handleNext(), 300);
  };

  const handleInputChange = (value: string | number) => {
    const step = steps[currentStep];
    if (step.field) {
      setFormData({ ...formData, [step.field]: value });
    }
  };

  const [currencyDisplayValues, setCurrencyDisplayValues] = useState<{ [key: string]: string }>({});

  const handleCurrencyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = steps[currentStep];
    if (step.field && step.type === 'number') {
      const currency = getCurrencyForField(step.id, storage.getLocalCurrency());
      const inputValue = e.target.value;
      
      // Remove currency prefix and spaces if present
      let cleanedValue = inputValue.replace(new RegExp(`^${currency}\\s*`, 'i'), '').trim();
      
      // Remove all thousand separators (commas) to get raw numeric string
      cleanedValue = cleanedValue.replace(/,/g, '');
      
      // Extract only numbers and decimal point
      const numericString = cleanedValue.replace(/[^\d.]/g, '');
      
      // Format with thousand separators
      const formattedNumber = formatNumberWithSeparators(numericString);
      
      // Store the display value (with currency prefix and formatted number)
      const displayValue = formattedNumber ? `${currency} ${formattedNumber}` : '';
      setCurrencyDisplayValues(prev => ({
        ...prev,
        [step.field!]: displayValue
      }));
      
      // Parse and store numeric value (always as number)
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
      // Use stored display value if available
      if (currencyDisplayValues[fieldKey] !== undefined) {
        return currencyDisplayValues[fieldKey];
      }
      // Otherwise format from numeric value
      const value = formData[fieldKey];
      if (value === undefined || value === null || (typeof value === 'number' && (isNaN(value) || value === 0))) return '';
      if (typeof value === 'number') {
        const currency = getCurrencyForField(step.id, storage.getLocalCurrency());
        return formatCurrencyInput(value, currency);
      }
    }
    return '';
  };

  const handleBooleanSelect = (value: boolean) => {
    const step = steps[currentStep];
    if (step.id === 'callTask') {
      setFormData({ ...formData, hasCallTask: value });
    }
    setTimeout(() => handleNext(), 300);
  };

  useEffect(() => {
    if (currentStep === steps.length - 1 && steps[currentStep].id === 'complete') {
      const timer = setTimeout(() => {
        const newDebt: Debt = {
          id: Date.now().toString(),
          name: formData.name || '',
          type: formData.type || 'prestamo',
          localCurrency: storage.getLocalCurrency(),
          localFee: formData.localFee || 0,
          dollarFee: formData.dollarFee || 0,
          totalLocal: formData.totalLocal || 0,
          totalDollars: formData.totalDollars || 0,
          feeToUpdate: 0,
          feeToUpdateDollars: 0,
          inOrder: true, // Default to true, will be calculated based on commitments
          currentPlan: formData.currentPlan || '',
          bankName: formData.bankName || '',
          bankPhone: formData.bankPhone || '',
          hasCallTask: formData.hasCallTask || false,
          callCompleted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        storage.saveDebt(newDebt);
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Get dynamic subtitle based on current step and form data
  const getSubtitle = (step: typeof steps[0]) => {
    // Subtitles are already translated in the steps array
    return step.subtitle;
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const canProceed = () => {
    if (currentStepData.id === 'welcome' || currentStepData.id === 'complete') return true;
    if (currentStepData.options) return true;
    if (currentStepData.type === 'boolean') return true;
    if (currentStepData.optional) return true;
    if (currentStepData.field) {
      const value = formData[currentStepData.field];
      if (currentStepData.type === 'number') {
        // Allow 0 as valid value, but require that the field has been touched (not undefined)
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
              ) : currentStepData.type === 'boolean' ? (
                <div className="boolean-options">
                  <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="boolean-button yes"
                    onClick={() => handleBooleanSelect(true)}
                  >
                    <Icon component={FaCheckCircle} className="boolean-icon" size={32} />
                    <span>{t('common.yes')}</span>
                  </motion.button>
                  <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="boolean-button no"
                    onClick={() => handleBooleanSelect(false)}
                  >
                    <Icon component={FaTimes} className="boolean-icon" size={32} />
                    <span>{t('common.no')}</span>
                  </motion.button>
                </div>
              ) : currentStepData.field ? (
                <motion.input
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  type={currentStepData.type === 'number' ? 'text' : (currentStepData.type || 'text')}
                  placeholder={currentStepData.placeholder}
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
          {currentStepData.id !== 'complete' &&
            !currentStepData.options &&
            currentStepData.type !== 'boolean' && (
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

export default AddDebt;
