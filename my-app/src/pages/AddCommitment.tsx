import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { 
  FaHandPaper, 
  FaCalendarAlt,
  FaDollarSign, 
  FaMoneyBill, 
  FaClipboardList,
  FaGift,
  FaArrowLeft
} from 'react-icons/fa';
import { PaymentCommitment, Debt } from '../types';
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
  date?: string;
  amountLocal?: number;
  amountDollars?: number;
  notes?: string;
}

const AddCommitment: React.FC = () => {
  const { t } = useTranslation();
  const { debtId } = useParams<{ debtId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>({});
  const [debt, setDebt] = useState<Debt | null>(null);

  useEffect(() => {
    if (debtId) {
      const foundDebt = storage.getDebt(debtId);
      if (foundDebt) {
        setDebt(foundDebt);
      } else {
        navigate('/dashboard');
      }
    }
  }, [debtId, navigate]);

  const steps: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: IconType;
    field?: keyof StepData;
    placeholder?: string;
    type?: string;
    optional?: boolean;
  }> = [
    {
      id: 'welcome',
      title: t('addCommitment.title'),
      subtitle: t('addCommitment.subtitle', { debtName: debt?.name || t('addCommitment.thisDebt') }),
      icon: FaHandPaper,
    },
    {
      id: 'date',
      title: t('addCommitment.commitmentDate'),
      subtitle: t('addCommitment.commitmentDateSubtitle'),
      icon: FaCalendarAlt,
      field: 'date' as keyof StepData,
      type: 'date',
    },
    {
      id: 'amountLocal',
      title: t('addCommitment.paymentAmount'),
      subtitle: t('addCommitment.paymentAmountLocalSubtitle', { currency: debt ? getCurrencyName(storage.getLocalCurrency()) : t('addCommitment.localCurrency') }),
      icon: FaMoneyBill,
      field: 'amountLocal' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'amountDollars',
      title: t('addCommitment.paymentAmount'),
      subtitle: t('addCommitment.paymentAmountDollarSubtitle'),
      icon: FaDollarSign,
      field: 'amountDollars' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'notes',
      title: t('addCommitment.notes'),
      subtitle: t('addCommitment.notesSubtitle'),
      icon: FaClipboardList,
      field: 'notes' as keyof StepData,
      placeholder: t('addCommitment.notesPlaceholder'),
      optional: true,
    },
    {
      id: 'complete',
      title: t('common.allDone'),
      subtitle: t('addCommitment.success'),
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

  const handleInputChange = (value: string | number) => {
    const step = steps[currentStep];
    if (step.field) {
      setFormData({ ...formData, [step.field]: value });
    }
  };

  useEffect(() => {
    if (currentStep === steps.length - 1 && steps[currentStep].id === 'complete' && debt) {
      const timer = setTimeout(() => {
        const newCommitment: PaymentCommitment = {
          id: Date.now().toString(),
          debtId: debt.id,
          date: formData.date || new Date().toISOString().split('T')[0],
          amountLocal: formData.amountLocal || 0,
          amountDollars: formData.amountDollars || 0,
          status: 'pending',
          notes: formData.notes,
          createdAt: new Date().toISOString(),
        };

        // Add commitment to debt
        const updatedDebt: Debt = {
          ...debt,
          commitments: [...(debt.commitments || []), newCommitment],
          updatedAt: new Date().toISOString(),
        };

        storage.saveDebt(updatedDebt);
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, debt]);

  // Get dynamic subtitle based on current step and form data
  const getSubtitle = (step: typeof steps[0]) => {
    // Subtitles are already translated in the steps array
    return step.subtitle;
  };

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;
  const canProceed = () => {
    if (currentStepData.id === 'welcome' || currentStepData.id === 'complete') return true;
    if (currentStepData.optional) return true;
    if (currentStepData.field) {
      const value = formData[currentStepData.field];
      if (currentStepData.type === 'number') {
        return value !== undefined && value !== null && !isNaN(Number(value));
      }
      if (currentStepData.type === 'date') {
        return value !== undefined && value !== '' && value !== null;
      }
      return value !== undefined && value !== '' && value !== null;
    }
    return false;
  };

  if (!debt) {
    return (
      <div className="add-debt">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          Loading...
        </div>
      </div>
    );
  }

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
              {currentStepData.field ? (
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
                  onChange={(e) => {
                    if (currentStepData.type === 'number') {
                      handleInputChange(parseFloat(e.target.value) || 0);
                    } else if (currentStepData.type === 'date') {
                      handleInputChange(e.target.value);
                    } else {
                      handleInputChange(e.target.value);
                    }
                  }}
                  className="step-input-field"
                  autoFocus
                />
              ) : currentStepData.id === 'notes' ? (
                <motion.textarea
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  placeholder={currentStepData.placeholder}
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange(e.target.value)}
                  className="step-input-field"
                  style={{ minHeight: '120px', resize: 'vertical' }}
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
          {currentStepData.id !== 'complete' && (
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

export default AddCommitment;
