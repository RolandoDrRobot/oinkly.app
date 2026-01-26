import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { 
  FaCheckCircle,
  FaGift,
  FaArrowLeft
} from 'react-icons/fa';
import { Debt, PaymentCommitment } from '../types';
import { storage } from '../utils/storage';
import './AddDebt.css';


const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

interface StepData {
  // No fields needed - totals are calculated automatically
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
          setFormData({});
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
    return [
      {
        id: 'welcome',
        title: t('completeCommitment.title'),
        subtitle: t('completeCommitment.subtitle'),
        icon: FaCheckCircle,
      },
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

        // Handle debt total updates based on payment type (automatic logic only)
        const paymentType = commitment.paymentType || 'partial';
        let newTotalLocal = debt.totalLocal || 0;
        let newTotalDollars = debt.totalDollars || 0;

        // Handle local currency
        if (commitment.amountLocal > 0) {
          if (paymentType === 'full' || paymentType === 'settlement') {
            // Full payment or settlement: set total to 0
            newTotalLocal = 0;
          } else {
            // Partial payment: subtract amount from total
            newTotalLocal = Math.max(0, newTotalLocal - commitment.amountLocal);
          }
        }

        // Handle dollars
        if (commitment.amountDollars > 0) {
          if (paymentType === 'full' || paymentType === 'settlement') {
            // Full payment or settlement: set total to 0
            newTotalDollars = 0;
          } else {
            // Partial payment: subtract amount from total
            newTotalDollars = Math.max(0, newTotalDollars - commitment.amountDollars);
          }
        }

        let updatedDebt: Debt = {
          ...debt,
          commitments: debt.commitments?.map(c => 
            c.id === commitment.id ? updatedCommitment : c
          ),
          totalLocal: newTotalLocal,
          totalDollars: newTotalDollars,
          feeToUpdate: 0,
          feeToUpdateDollars: 0,
          updatedAt: new Date().toISOString(),
        };

        // If total reaches 0, set corresponding fee to 0
        if (newTotalLocal === 0) {
          updatedDebt.localFee = 0;
        }
        if (newTotalDollars === 0) {
          updatedDebt.dollarFee = 0;
        }

        // Calculate inOrder based on commitments
        const calculateInOrder = (debt: Debt): boolean => {
          if (!debt.commitments || debt.commitments.length === 0) {
            return true;
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const hasPendingOrOverdue = debt.commitments.some(commitment => {
            if (commitment.status === 'completed') {
              return false;
            }

            const commitmentDate = new Date(commitment.date);
            commitmentDate.setHours(0, 0, 0, 0);
            const diffTime = commitmentDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays < 0 || commitment.status === 'pending';
          });

          return !hasPendingOrOverdue;
        };

        updatedDebt.inOrder = calculateInOrder(updatedDebt);

        storage.saveDebt(updatedDebt);
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);


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

          {/* No input fields - totals are calculated automatically based on payment type */}
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
