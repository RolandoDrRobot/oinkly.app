import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { 
  FaCheckCircle,
  FaDollarSign,
  FaMoneyBill,
  FaChartLine,
  FaGift,
  FaArrowLeft
} from 'react-icons/fa';
import { Debt, PaymentCommitment } from '../types';
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

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

interface StepData {
  totalLocal?: number;
  totalDollars?: number;
  feeToUpdate?: number;
  feeToUpdateDollars?: number;
  updateBalances?: boolean;
}

const CompleteCommitment: React.FC = () => {
  const { t } = useTranslation();
  const { debtId, commitmentId } = useParams<{ debtId: string; commitmentId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>({});
  const [debt, setDebt] = useState<Debt | null>(null);
  const [commitment, setCommitment] = useState<PaymentCommitment | null>(null);

  useEffect(() => {
    if (debtId && commitmentId) {
      const foundDebt = storage.getDebt(debtId);
      if (foundDebt) {
        setDebt(foundDebt);
        const foundCommitment = foundDebt.commitments?.find(c => c.id === commitmentId);
        if (foundCommitment) {
          setCommitment(foundCommitment);
          setFormData({
            totalLocal: foundDebt.totalLocal,
            totalDollars: foundDebt.totalDollars,
            feeToUpdate: foundDebt.feeToUpdate,
            feeToUpdateDollars: foundDebt.feeToUpdateDollars,
            updateBalances: false,
          });
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    }
  }, [debtId, commitmentId, navigate]);

  const getSteps = (): Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: IconType;
    field?: keyof StepData;
    placeholder?: string;
    type?: string;
  }> => {
    const baseSteps = [
      {
        id: 'welcome',
        title: t('completeCommitment.title'),
        subtitle: t('completeCommitment.subtitle'),
        icon: FaCheckCircle,
      },
      {
        id: 'updateBalances',
        title: t('completeCommitment.updateBalances'),
        subtitle: t('completeCommitment.updateBalancesSubtitle'),
        icon: FaChartLine,
        type: 'boolean',
      },
    ];

    if (formData.updateBalances === true) {
      return [
        ...baseSteps,
        {
          id: 'totalLocal',
          title: t('completeCommitment.totalDebtLocal'),
          subtitle: t('completeCommitment.totalDebtLocalSubtitle', { currency: debt ? getCurrencyName(debt.localCurrency) : getCurrencyName(storage.getLocalCurrency()) }),
          icon: FaMoneyBill,
          field: 'totalLocal' as keyof StepData,
          type: 'number',
          placeholder: '0.00',
        },
        {
          id: 'totalDollars',
          title: t('completeCommitment.totalDebtDollar'),
          subtitle: t('completeCommitment.totalDebtDollarSubtitle'),
          icon: FaDollarSign,
          field: 'totalDollars' as keyof StepData,
          type: 'number',
          placeholder: '0.00',
        },
        {
          id: 'feeToUpdate',
          title: t('completeCommitment.amountToUpdateLocal'),
          subtitle: t('completeCommitment.amountToUpdateLocalSubtitle', { currency: debt ? getCurrencyName(debt.localCurrency) : getCurrencyName(storage.getLocalCurrency()) }),
          icon: FaMoneyBill,
          field: 'feeToUpdate' as keyof StepData,
          type: 'number',
          placeholder: '0.00',
        },
        {
          id: 'feeToUpdateDollars',
          title: t('completeCommitment.amountToUpdateDollar'),
          subtitle: t('completeCommitment.amountToUpdateDollarSubtitle'),
          icon: FaDollarSign,
          field: 'feeToUpdateDollars' as keyof StepData,
          type: 'number',
          placeholder: '0.00',
        },
        {
          id: 'complete',
          title: t('common.allDone'),
          subtitle: t('completeCommitment.success'),
          icon: FaGift,
        },
      ];
    }

    return [
      ...baseSteps,
      {
        id: 'complete',
        title: t('common.allDone'),
        subtitle: t('completeCommitment.success'),
        icon: FaGift,
      },
    ];
  };

  const steps = getSteps();

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

  const handleBooleanSelect = (value: boolean) => {
    setFormData(prev => ({ ...prev, updateBalances: value }));
  };

  useEffect(() => {
    if (formData.updateBalances === true && currentStep === 1) {
      // User selected "Yes", go to totalLocal (index 2)
      setTimeout(() => {
        setCurrentStep(2);
      }, 300);
    } else if (formData.updateBalances === false && currentStep === 1) {
      // User selected "No", go to complete
      const steps = getSteps();
      setTimeout(() => {
        setCurrentStep(steps.length - 1);
      }, 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.updateBalances, currentStep]);

  const handleInputChange = (value: any) => {
    const currentSteps = getSteps();
    const currentStepData = currentSteps[currentStep];
    if (currentStepData.field) {
      const field = currentStepData.field as keyof StepData;
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  useEffect(() => {
    const currentSteps = getSteps();
    if (currentStep === currentSteps.length - 1 && currentSteps[currentStep].id === 'complete' && debt && commitment) {
      const timer = setTimeout(() => {
        // Mark commitment as completed
        const updatedCommitment: PaymentCommitment = {
          ...commitment,
          status: 'completed',
          completedAt: new Date().toISOString(),
        };

        let updatedDebt: Debt = {
          ...debt,
          commitments: debt.commitments?.map(c => 
            c.id === commitment.id ? updatedCommitment : c
          ),
          updatedAt: new Date().toISOString(),
        };

        // Update balances if user chose to
        if (formData.updateBalances === true) {
          const inOrder = (formData.feeToUpdate || 0) === 0 && (formData.feeToUpdateDollars || 0) === 0;
          updatedDebt = {
            ...updatedDebt,
            totalLocal: formData.totalLocal || 0,
            totalDollars: formData.totalDollars || 0,
            feeToUpdate: formData.feeToUpdate || 0,
            feeToUpdateDollars: formData.feeToUpdateDollars || 0,
            inOrder: inOrder,
          };
        }

        storage.saveDebt(updatedDebt);
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, formData.updateBalances, formData.totalLocal, formData.totalDollars, formData.feeToUpdate, formData.feeToUpdateDollars]);

  const canProceed = (): boolean => {
    const currentSteps = getSteps();
    const currentStepData = currentSteps[currentStep];
    if (currentStepData.field) {
      const value = formData[currentStepData.field];
      if (currentStepData.type === 'number') {
        return value !== undefined && value !== null && !isNaN(Number(value)) && Number(value) >= 0;
      }
      if (typeof value === 'string') {
        return value !== undefined && value !== '' && value !== null;
      }
      return value !== undefined && value !== null;
    }
    return false;
  };

  if (!debt || !commitment) {
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
                  <Icon component={FaCheckCircle} className="boolean-icon" size={32} />
                  <span>{t('common.no')}</span>
                </motion.button>
              </div>
            ) : currentStepData.field && currentStepData.type === 'number' ? (
              <motion.input
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 }}
                type="number"
                placeholder={currentStepData.placeholder}
                value={
                  typeof formData[currentStepData.field] === 'number'
                    ? formData[currentStepData.field]?.toString() || ''
                    : ''
                }
                onChange={(e) =>
                  handleInputChange(parseFloat(e.target.value) || 0)
                }
                className="step-input-field"
                autoFocus
              />
            ) : null}
          </div>
        </motion.div>

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

export default CompleteCommitment;
