import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import type { IconType } from 'react-icons';
import { 
  FaCalendarAlt,
  FaClipboardList,
  FaPhoneAlt,
  FaGift,
  FaArrowLeft,
  FaCheckCircle
} from 'react-icons/fa';
import { CallRecord, Debt } from '../types';
import { storage } from '../utils/storage';
import toast from 'react-hot-toast';
import './AddDebt.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

interface StepData {
  date?: string;
  notes?: string;
}

const EditCall: React.FC = () => {
  const { t } = useTranslation();
  const { debtId, callId } = useParams<{ debtId: string; callId: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>({});
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
          setFormData({
            date: foundCall.date.split('T')[0],
            notes: foundCall.notes || '',
          });
        } else {
          navigate('/dashboard');
        }
      } else {
        navigate('/dashboard');
      }
    }
  }, [debtId, callId, navigate]);

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
      title: t('editCall.title'),
      subtitle: t('editCall.subtitle', { debtName: debt?.name || t('editCall.thisDebt') }),
      icon: FaPhoneAlt,
    },
    {
      id: 'date',
      title: t('editCall.date'),
      subtitle: t('editCall.dateSubtitle'),
      icon: FaCalendarAlt,
      field: 'date' as keyof StepData,
      type: 'date',
    },
    {
      id: 'notes',
      title: t('editCall.notes'),
      subtitle: t('editCall.notesSubtitle'),
      icon: FaClipboardList,
      field: 'notes' as keyof StepData,
      placeholder: t('editCall.notesPlaceholder'),
      type: 'textarea',
    },
    {
      id: 'complete',
      title: t('common.allDone'),
      subtitle: t('editCall.success'),
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

  const handleInputChange = (value: any) => {
    const currentStepData = steps[currentStep];
    if (currentStepData.field) {
      const field = currentStepData.field as keyof StepData;
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const canProceed = (): boolean => {
    const currentStepData = steps[currentStep];
    
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
    return value !== undefined && value !== '' && value !== null;
  };

  useEffect(() => {
    if (!debt || !call) return;
    
    const isLastStep = currentStep === steps.length - 1;
    const isCompleteStep = steps[currentStep]?.id === 'complete';
    
    if (isLastStep && isCompleteStep) {
      const timer = setTimeout(() => {
        const updatedCall: CallRecord = {
          ...call,
          date: new Date(formData.date || call.date).toISOString(),
          notes: formData.notes || '',
        };

        const updatedDebt: Debt = {
          ...debt,
          callHistory: debt.callHistory?.map(c =>
            c.id === call.id ? updatedCall : c
          ),
          updatedAt: new Date().toISOString(),
        };

        storage.saveDebt(updatedDebt);
        toast.success(t('editCall.success'));
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
              {currentStepData.field && (
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
                    value={(formData[currentStepData.field] as string) || ''}
                    onChange={(e) => handleInputChange(e.target.value)}
                    className="step-input-field"
                    autoFocus
                  />
                )
              )}
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
              onClick={handleNext}
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

export default EditCall;
