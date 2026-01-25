import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaTrash, FaExclamationTriangle, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import { Debt } from '../types';
import { storage } from '../utils/storage';
import './AddDebt.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const DeleteDebt: React.FC = () => {
  const { t } = useTranslation();
  const { debtId } = useParams<{ debtId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
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

  const steps = [
    {
      id: 'confirm',
      title: t('deleteDebt.title'),
      subtitle: t('deleteDebt.subtitle'),
      icon: FaExclamationTriangle,
    },
    {
      id: 'complete',
      title: t('common.allDone'),
      subtitle: t('deleteDebt.success'),
      icon: FaCheckCircle,
    },
  ];

  const handleConfirm = () => {
    setCurrentStep(1);
  };

  const handleCancel = () => {
    navigate('/dashboard');
  };

  useEffect(() => {
    if (currentStep === 1 && debt) {
      const timer = setTimeout(() => {
        storage.deleteDebt(debt.id);
        // Remove from order
        const currentOrder = storage.getDebtsOrder() || [];
        const newOrder = currentOrder.filter(id => id !== debt.id);
        storage.setDebtsOrder(newOrder);
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

          {currentStep === 0 && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="delete-confirmation"
              style={{ marginTop: '32px', textAlign: 'center' }}
            >
              <p style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '24px' }}>
                {t('deleteDebt.confirmMessage', { debtName: debt.name })}
              </p>
            </motion.div>
          )}
        </motion.div>

        <div className="step-actions">
          {currentStep === 0 && (
            <>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-back-step"
                onClick={handleCancel}
              >
                {t('common.cancel')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-next"
                onClick={handleConfirm}
                style={{ background: '#f44336' }}
              >
                <Icon component={FaTrash} style={{ marginRight: '8px' }} />
                {t('common.delete')}
              </motion.button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteDebt;
