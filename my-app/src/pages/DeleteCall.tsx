import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaTrash, FaExclamationTriangle, FaCheckCircle, FaArrowLeft } from 'react-icons/fa';
import { Debt, CallRecord } from '../types';
import { storage } from '../utils/storage';
import toast from 'react-hot-toast';
import './AddDebt.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const DeleteCall: React.FC = () => {
  const { t } = useTranslation();
  const { debtId, callId } = useParams<{ debtId: string; callId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [debt, setDebt] = useState<Debt | null>(null);
  const [call, setCall] = useState<CallRecord | null>(null);

  useEffect(() => {
    if (debtId && callId) {
      const foundDebt = storage.getDebt(debtId);
      if (foundDebt) {
        setDebt(foundDebt);
        const foundCall = foundDebt.callHistory?.find(c => c.id === callId);
        if (foundCall) {
          setCall(foundCall);
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    }
  }, [debtId, callId, navigate]);

  const steps = [
    {
      id: 'confirm',
      title: t('deleteCall.title'),
      subtitle: t('deleteCall.subtitle'),
      icon: FaExclamationTriangle,
    },
    {
      id: 'complete',
      title: t('common.allDone'),
      subtitle: t('deleteCall.success'),
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
    if (currentStep === 1 && debt && call) {
      const timer = setTimeout(() => {
        const updatedDebt: Debt = {
          ...debt,
          callHistory: debt.callHistory?.filter(c => c.id !== call.id),
          updatedAt: new Date().toISOString(),
        };
        
        storage.saveDebt(updatedDebt);
        toast.success(t('deleteCall.success'));
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, debt, call]);

  if (!debt || !call) {
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
                {t('deleteCall.confirmMessage')}
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

export default DeleteCall;
