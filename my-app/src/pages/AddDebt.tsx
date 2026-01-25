import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  FaChartLine, 
  FaClipboardList, 
  FaCheckCircle, 
  FaPhoneAlt,
  FaGift,
  FaTimes,
  FaArrowLeft
} from 'react-icons/fa';
import { Debt } from '../types';
import { storage } from '../utils/storage';
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
  feeToUpdate?: number;
  feeToUpdateDollars?: number;
  currentPlan?: string;
  hasCallTask?: boolean;
}

const AddDebt: React.FC = () => {
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
      title: 'New Debt',
      subtitle: 'Let\'s add your debt step by step',
      icon: FaHandPaper,
    },
    {
      id: 'name',
      title: 'Debt Name',
      subtitle: 'Give this debt a name to identify it',
      icon: FaPen,
      field: 'name' as keyof StepData,
      placeholder: 'e.g. Personal Loan, Credit Card',
    },
    {
      id: 'type',
      title: 'Debt Type',
      subtitle: 'What type of debt is this?',
      icon: FaCreditCard,
      options: [
        { value: 'prestamo', label: 'Loan', icon: FaMoneyBillWave },
        { value: 'tarjeta', label: 'Credit Card', icon: FaCreditCard },
      ],
    },
    {
      id: 'bank',
      title: 'Bank Name',
      subtitle: 'Which bank is this debt with?',
      icon: FaLandmark,
      field: 'bankName' as keyof StepData,
      placeholder: 'e.g. National Bank',
    },
    {
      id: 'phone',
      title: 'Bank Phone',
      subtitle: 'Bank contact number (optional)',
      icon: FaPhone,
      field: 'bankPhone' as keyof StepData,
      placeholder: '+1 234 567 8900',
      optional: true,
    },
    {
      id: 'localFee',
      title: 'Monthly Payment',
      subtitle: 'How much do you pay monthly in local currency?',
      icon: FaMoneyBill,
      field: 'localFee' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'dollarFee',
      title: 'Monthly Payment',
      subtitle: 'How much do you pay monthly in US Dollars?',
      icon: FaDollarSign,
      field: 'dollarFee' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'totalLocal',
      title: 'Total Debt Amount',
      subtitle: 'What is the total debt amount in local currency?',
      icon: FaMoneyBill,
      field: 'totalLocal' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'totalDollars',
      title: 'Total Debt Amount',
      subtitle: 'What is the total debt amount in US Dollars?',
      icon: FaDollarSign,
      field: 'totalDollars' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'feeToUpdate',
      title: 'Amount to Update',
      subtitle: 'How much do you need to pay to be up to date?',
      icon: FaChartLine,
      field: 'feeToUpdate' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'feeToUpdateDollars',
      title: 'Amount to Update',
      subtitle: 'How much do you need to pay to be up to date in US Dollars?',
      icon: FaDollarSign,
      field: 'feeToUpdateDollars' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'currentPlan',
      title: 'Payment Plan',
      subtitle: 'Describe your current payment plan',
      icon: FaClipboardList,
      field: 'currentPlan' as keyof StepData,
      placeholder: 'e.g. 12 monthly installments',
    },
    {
      id: 'callTask',
      title: 'Call Reminder',
      subtitle: 'Do you want a reminder to call the bank?',
      icon: FaPhoneAlt,
      type: 'boolean',
    },
    {
      id: 'complete',
      title: 'All Done!',
      subtitle: 'Your debt has been added successfully',
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
        const feeToUpdate = formData.feeToUpdate || 0;
        const feeToUpdateDollars = formData.feeToUpdateDollars || 0;
        const inOrder = feeToUpdate === 0 && feeToUpdateDollars === 0;
        
        const newDebt: Debt = {
          id: Date.now().toString(),
          name: formData.name || '',
          type: formData.type || 'prestamo',
          localCurrency: storage.getLocalCurrency(),
          localFee: formData.localFee || 0,
          dollarFee: formData.dollarFee || 0,
          totalLocal: formData.totalLocal || 0,
          totalDollars: formData.totalDollars || 0,
          feeToUpdate: feeToUpdate,
          feeToUpdateDollars: feeToUpdateDollars,
          inOrder: inOrder,
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
    const localCurrency = storage.getLocalCurrency();
    const currencyName = getCurrencyName(localCurrency);
    
    if (step.id === 'localFee') {
      return `How much do you pay monthly in ${currencyName}?`;
    }
    if (step.id === 'totalLocal') {
      return `What is the total debt amount in ${currencyName}?`;
    }
    if (step.id === 'feeToUpdate') {
      return `How much do you need to pay in ${currencyName} to be up to date?`;
    }
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
          <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> Back
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
                    <span>Yes</span>
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
                    <span>No</span>
                  </motion.button>
                </div>
              ) : currentStepData.field ? (
                <motion.input
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  type={currentStepData.type || 'text'}
                  placeholder={currentStepData.placeholder}
                  value={
                    typeof formData[currentStepData.field] === 'number'
                      ? formData[currentStepData.field]?.toString() || ''
                      : (formData[currentStepData.field] as string) || ''
                  }
                  onChange={(e) =>
                    handleInputChange(
                      currentStepData.type === 'number'
                        ? parseFloat(e.target.value) || 0
                        : e.target.value
                    )
                  }
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
              Back
            </motion.button>
          )}
          {currentStepData.optional && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-skip"
              onClick={handleSkip}
            >
              Skip
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
                Next
              </motion.button>
            )}
        </div>
      </div>
    </div>
  );
};

export default AddDebt;
