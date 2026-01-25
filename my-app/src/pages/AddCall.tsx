import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { 
  FaHandPaper, 
  FaCalendarAlt,
  FaClipboardList,
  FaPhoneAlt,
  FaGift,
  FaArrowLeft,
  FaCheckCircle,
  FaFileInvoiceDollar,
  FaDollarSign,
  FaMoneyBill
} from 'react-icons/fa';
import { CallRecord, Debt, PaymentCommitment } from '../types';
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
  notes?: string;
  createCommitment?: boolean;
  amountLocal?: number;
  amountDollars?: number;
}

const AddCall: React.FC = () => {
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

  // Get steps dynamically based on whether user wants to create commitment
  const getSteps = (): Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: IconType;
    field?: keyof StepData;
    placeholder?: string;
    type?: string;
    optional?: boolean;
  }> => {
    const baseSteps = [
      {
        id: 'welcome',
        title: t('addCall.title'),
        subtitle: t('addCall.subtitle', { debtName: debt?.name || t('addCall.thisDebt') }),
        icon: FaPhoneAlt,
      },
      {
        id: 'date',
        title: t('addCall.date'),
        subtitle: t('addCall.dateSubtitle'),
        icon: FaCalendarAlt,
        field: 'date' as keyof StepData,
        type: 'date',
      },
      {
        id: 'notes',
        title: t('addCall.notes'),
        subtitle: t('addCall.notesSubtitle'),
        icon: FaClipboardList,
        field: 'notes' as keyof StepData,
        placeholder: t('addCall.notesPlaceholder'),
        type: 'textarea',
      },
      {
        id: 'createCommitment',
        title: t('addCall.createCommitmentTitle'),
        subtitle: t('addCall.createCommitmentSubtitle'),
        icon: FaFileInvoiceDollar,
        type: 'boolean',
      },
    ];

    // If user selected to create commitment, add amount steps
    if (formData.createCommitment === true) {
      return [
        ...baseSteps,
        {
          id: 'amountLocal',
          title: t('addCall.amountLocal'),
          subtitle: t('addCall.amountLocalSubtitle', { currency: debt ? getCurrencyName(debt.localCurrency) : getCurrencyName(storage.getLocalCurrency()) }),
          icon: FaMoneyBill,
          field: 'amountLocal' as keyof StepData,
          placeholder: '0.00',
          type: 'number',
        },
        {
          id: 'amountDollars',
          title: t('addCall.amountDollar'),
          subtitle: t('addCall.amountDollarSubtitle'),
          icon: FaDollarSign,
          field: 'amountDollars' as keyof StepData,
          placeholder: '0.00',
          type: 'number',
        },
        {
          id: 'complete',
          title: t('common.allDone'),
          subtitle: t('addCall.success'),
          icon: FaGift,
        },
      ];
    }

    // If user selected not to create commitment or hasn't selected yet
    return [
      ...baseSteps,
      {
        id: 'complete',
        title: t('common.allDone'),
        subtitle: t('addCall.success'),
        icon: FaGift,
      },
    ];
  };

  const handleNext = () => {
    const currentSteps = getSteps();
    if (currentStep < currentSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      // If going back from amount steps, need to handle dynamic steps
      const currentSteps = getSteps();
      const currentStepData = currentSteps[currentStep];
      
      // If we're on amountLocal (step 4 when commitment=true) and going back, go to createCommitment (step 3)
      if (currentStepData.id === 'amountLocal') {
        setCurrentStep(3);
      } else if (currentStepData.id === 'amountDollars') {
        // If on amountDollars, go back to amountLocal
        setCurrentStep(4);
      } else {
        // Normal back navigation
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const handleSkip = () => {
    handleNext();
  };

  const handleInputChange = (value: any) => {
    const currentSteps = getSteps();
    const currentStepData = currentSteps[currentStep];
    if (currentStepData.field) {
      const field = currentStepData.field as keyof StepData;
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleBooleanSelect = (value: boolean) => {
    setFormData(prev => ({ ...prev, createCommitment: value }));
    
    // Navigate based on selection after state update
    setTimeout(() => {
      if (value) {
        // User selected "Yes", go to amountLocal step (index 4: welcome, date, notes, createCommitment, amountLocal)
        setCurrentStep(4);
      } else {
        // User selected "No", go to complete step (index 4: welcome, date, notes, createCommitment, complete)
        setCurrentStep(4);
      }
    }, 300);
  };

  const canProceed = (): boolean => {
    const currentSteps = getSteps();
    const currentStepData = currentSteps[currentStep];
    
    // If step doesn't have a field (like welcome step), allow proceeding
    if (!currentStepData.field) {
      return true;
    }
    
    const value = formData[currentStepData.field];
    if (currentStepData.type === 'date') {
      return value !== undefined && value !== '' && value !== null;
    }
    if (currentStepData.type === 'textarea') {
      return value !== undefined && value !== '' && value !== null;
    }
    if (currentStepData.type === 'number') {
      return value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) >= 0;
    }
    return value !== undefined && value !== '' && value !== null;
  };

  useEffect(() => {
    if (!debt) return;
    
    const currentSteps = getSteps();
    const isLastStep = currentStep === currentSteps.length - 1;
    const isCompleteStep = currentSteps[currentStep]?.id === 'complete';
    
    if (isLastStep && isCompleteStep) {
      const timer = setTimeout(() => {
        const newCall: CallRecord = {
          id: Date.now().toString(),
          debtId: debt.id,
          date: new Date(formData.date || new Date().toISOString()).toISOString(),
          notes: formData.notes || '',
          createdAt: new Date().toISOString(),
        };

        let updatedDebt: Debt = {
          ...debt,
          callHistory: [...(debt.callHistory || []), newCall],
          lastCallDate: newCall.date,
          updatedAt: new Date().toISOString(),
        };

        // If user wants to create commitment, create it now
        if (formData.createCommitment === true && 
            formData.amountLocal !== undefined && 
            formData.amountDollars !== undefined &&
            (formData.amountLocal > 0 || formData.amountDollars > 0)) {
          const newCommitment: PaymentCommitment = {
            id: Date.now().toString() + '-commitment',
            debtId: debt.id,
            date: new Date(formData.date || new Date().toISOString()).toISOString(),
            amountLocal: formData.amountLocal || 0,
            amountDollars: formData.amountDollars || 0,
            status: 'pending',
            notes: formData.notes,
            createdAt: new Date().toISOString(),
          };

          updatedDebt = {
            ...updatedDebt,
            commitments: [...(debt.commitments || []), newCommitment],
          };

          // Link commitment to call
          newCall.commitmentsCreated = [newCommitment.id];
        }

        storage.saveDebt(updatedDebt);
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData.createCommitment, formData.amountLocal, formData.amountDollars]);

  if (!debt) {
    return (
      <div className="add-debt">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          {t('common.loading')}
        </div>
      </div>
    );
  }

  const currentSteps = getSteps();
  const currentStepData = currentSteps[currentStep];
  const progress = ((currentStep + 1) / currentSteps.length) * 100;

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

            {currentStepData.subtitle && (
              <motion.p
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="step-subtitle"
              >
                {currentStepData.subtitle}
              </motion.p>
            )}

            <div className="step-input">
              {currentStepData.type === 'boolean' ? (
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
                    <Icon component={FaPhoneAlt} className="boolean-icon" size={32} />
                    <span>{t('common.no')}</span>
                  </motion.button>
                </div>
              ) : currentStepData.field ? (
                currentStepData.type === 'textarea' ? (
                  <motion.textarea
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    placeholder={currentStepData.placeholder}
                    value={(formData[currentStepData.field] as string) || ''}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="step-input-field"
                    style={{ minHeight: '120px', resize: 'vertical' }}
                    autoFocus
                  />
                ) : (
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
                )
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

export default AddCall;
