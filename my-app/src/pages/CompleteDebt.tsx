import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { 
  FaCheckCircle,
  FaArrowLeft
} from 'react-icons/fa';
import { Debt } from '../types';
import { storage } from '../utils/storage';
import { analytics } from '../utils/analytics';
import { notify } from '../utils/notifications';
import './AddDebt.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const CompleteDebt: React.FC = () => {
  const { t } = useTranslation();
  const { debtId } = useParams<{ debtId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [debt, setDebt] = useState<Debt | null>(null);

  const hasPendingCommitments = (debt: Debt): boolean => {
    if (!debt.commitments || debt.commitments.length === 0) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return debt.commitments.some(commitment => {
      if (commitment.status === 'completed') {
        return false;
      }

      const commitmentDate = new Date(commitment.date);
      commitmentDate.setHours(0, 0, 0, 0);
      const diffTime = commitmentDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays < 0 || commitment.status === 'pending';
    });
  };

  useEffect(() => {
    if (debtId) {
      const foundDebt = storage.getDebt(debtId);
      if (foundDebt) {
        // Check if there are pending commitments
        if (hasPendingCommitments(foundDebt)) {
          // Redirect to dashboard if there are pending commitments
          navigate('/dashboard');
          return;
        }
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
    type?: string;
  }> = [
    {
      id: 'welcome',
      title: t('completeDebt.title'),
      subtitle: t('completeDebt.subtitle', { debtName: debt?.name || t('completeDebt.thisDebt') }),
      icon: FaCheckCircle,
    },
    {
      id: 'complete',
      title: t('common.allDone'),
      subtitle: t('completeDebt.success'),
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

  useEffect(() => {
    if (currentStep === steps.length - 1 && steps[currentStep].id === 'complete' && debt) {
      const timer = setTimeout(() => {
        // Mark debt as paid off (closed, not deleted)
        const updatedDebt: Debt = {
          ...debt,
          totalLocal: 0,
          totalDollars: 0,
          localFee: 0,
          dollarFee: 0,
          inOrder: true,
          closedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        storage.saveDebt(updatedDebt);
        analytics.completeDebt();
        notify.overviewUpdated();
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, debt]);

  if (!debt) {
    return (
      <div className="add-debt">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
          {t('common.loading')}
        </div>
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

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
          {currentStepData.id !== 'complete' && (
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

export default CompleteDebt;
