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

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

interface StepData {
  name?: string;
  type?: 'prestamo' | 'tarjeta';
  bankName?: string;
  bankPhone?: string;
  localCurrency?: string;
  localFee?: number;
  dollarFee?: number;
  feeToUpdate?: number;
  currentPlan?: string;
  inOrder?: boolean;
  hasCallTask?: boolean;
}

const AddDebt: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>({});

  const steps: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon?: IconType;
    field?: keyof StepData;
    placeholder?: string;
    type?: string;
    optional?: boolean;
    options?: Array<{ value: string; label: string; icon: IconType }>;
  }> = [
    {
      id: 'welcome',
      title: '¡Hola!',
      subtitle: 'Vamos a agregar una nueva deuda',
      icon: FaHandPaper,
    },
    {
      id: 'name',
      title: '¿Cómo se llama esta deuda?',
      subtitle: 'Dale un nombre que te ayude a identificarla',
      icon: FaPen,
      field: 'name' as keyof StepData,
      placeholder: 'Ej: Préstamo Personal',
    },
    {
      id: 'type',
      title: '¿Qué tipo de deuda es?',
      subtitle: 'Selecciona una opción',
      icon: FaCreditCard,
      options: [
        { value: 'prestamo', label: 'Préstamo', icon: FaMoneyBillWave },
        { value: 'tarjeta', label: 'Tarjeta de Crédito', icon: FaCreditCard },
      ],
    },
    {
      id: 'bank',
      title: '¿De qué banco es?',
      subtitle: 'Escribe el nombre del banco',
      icon: FaLandmark,
      field: 'bankName' as keyof StepData,
      placeholder: 'Ej: Banco Nación',
    },
    {
      id: 'phone',
      title: '¿Tienes el teléfono del banco?',
      subtitle: 'Opcional, pero útil para llamar',
      icon: FaPhone,
      field: 'bankPhone' as keyof StepData,
      placeholder: 'Ej: +54 11 1234-5678',
      optional: true,
    },
    {
      id: 'currency',
      title: '¿En qué moneda está?',
      subtitle: 'Selecciona la moneda principal',
      icon: FaDollarSign,
      options: [
        { value: 'ARS', label: 'Pesos Argentinos', icon: FaDollarSign },
        { value: 'USD', label: 'Dólares', icon: FaDollarSign },
      ],
    },
    {
      id: 'localFee',
      title: '¿Cuánto pagas en moneda local?',
      subtitle: 'Ingresa el monto de la cuota',
      icon: FaMoneyBill,
      field: 'localFee' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'dollarFee',
      title: '¿Cuánto pagas en dólares?',
      subtitle: 'Ingresa el monto de la cuota',
      icon: FaDollarSign,
      field: 'dollarFee' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'feeToUpdate',
      title: '¿Cuánto necesitas para ponerla al día?',
      subtitle: 'El monto total para actualizar',
      icon: FaChartLine,
      field: 'feeToUpdate' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
    },
    {
      id: 'plan',
      title: '¿Cuál es tu plan actual?',
      subtitle: 'Describe tu plan de pago',
      icon: FaClipboardList,
      field: 'currentPlan' as keyof StepData,
      placeholder: 'Ej: Plan 12 cuotas',
    },
    {
      id: 'inOrder',
      title: '¿Está al día?',
      subtitle: 'Marca si está en orden',
      icon: FaCheckCircle,
      type: 'boolean',
    },
    {
      id: 'callTask',
      title: '¿Quieres recordatorio para llamar?',
      subtitle: 'Te ayudamos a no olvidar',
      icon: FaPhoneAlt,
      type: 'boolean',
    },
    {
      id: 'complete',
      title: '¡Listo!',
      subtitle: 'Tu deuda ha sido agregada',
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
    } else if (step.id === 'currency') {
      setFormData({ ...formData, localCurrency: value });
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
    if (step.id === 'inOrder') {
      setFormData({ ...formData, inOrder: value });
    } else if (step.id === 'callTask') {
      setFormData({ ...formData, hasCallTask: value });
    }
    setTimeout(() => handleNext(), 300);
  };

  const handleSubmit = () => {
    const newDebt: Debt = {
      id: Date.now().toString(),
      name: formData.name || '',
      type: formData.type || 'prestamo',
      localCurrency: formData.localCurrency || 'ARS',
      localFee: formData.localFee || 0,
      dollarFee: formData.dollarFee || 0,
      feeToUpdate: formData.feeToUpdate || 0,
      inOrder: formData.inOrder || false,
      currentPlan: formData.currentPlan || '',
      bankName: formData.bankName || '',
      bankPhone: formData.bankPhone || '',
      hasCallTask: formData.hasCallTask || false,
      callCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.saveDebt(newDebt);
    setTimeout(() => navigate('/dashboard'), 1500);
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
        return value !== undefined && value !== null && Number(value) >= 0;
      }
      return value !== undefined && value !== '' && value !== null;
    }
    return false;
  };

  useEffect(() => {
    if (currentStep === steps.length - 1 && steps[currentStep].id === 'complete') {
      const timer = setTimeout(() => {
        const newDebt: Debt = {
          id: Date.now().toString(),
          name: formData.name || '',
          type: formData.type || 'prestamo',
          localCurrency: formData.localCurrency || 'ARS',
          localFee: formData.localFee || 0,
          dollarFee: formData.dollarFee || 0,
          feeToUpdate: formData.feeToUpdate || 0,
          inOrder: formData.inOrder || false,
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

  return (
    <div className="add-debt">
      <header className="page-header">
        <button className="btn-back" onClick={() => navigate('/dashboard')}>
          <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> Volver
        </button>
        <div className="progress-bar-container">
          <div className="progress-bar" style={{ width: `${progress}%` }} />
        </div>
        <div className="step-indicator">
          Paso {currentStep + 1} de {steps.length}
        </div>
      </header>

      <div className="form-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="step-content"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring' }}
              className="step-icon"
            >
              {currentStepData.icon && <Icon component={currentStepData.icon} size={80} />}
            </motion.div>

            <motion.h1
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="step-title"
            >
              {currentStepData.title}
            </motion.h1>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="step-subtitle"
            >
              {currentStepData.subtitle}
            </motion.p>

            <div className="step-input">
              {currentStepData.options ? (
                <div className="options-grid">
                  {currentStepData.options.map((option, index) => (
                    <motion.button
                      key={option.value}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.1 * index }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="option-button"
                      onClick={() => handleOptionSelect(option.value)}
                    >
                      {option.icon && <Icon component={option.icon} className="option-icon" size={48} />}
                      <span className="option-label">{option.label}</span>
                    </motion.button>
                  ))}
                </div>
              ) : currentStepData.type === 'boolean' ? (
                <div className="boolean-options">
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="boolean-button yes"
                    onClick={() => handleBooleanSelect(true)}
                  >
                    <Icon component={FaCheckCircle} className="boolean-icon" size={48} />
                    <span>Sí</span>
                  </motion.button>
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="boolean-button no"
                    onClick={() => handleBooleanSelect(false)}
                  >
                    <Icon component={FaTimes} className="boolean-icon" size={48} />
                    <span>No</span>
                  </motion.button>
                </div>
              ) : currentStepData.field ? (
                <motion.input
                  initial={{ scale: 0.9, opacity: 0 }}
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
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-back-step"
              onClick={handleBack}
            >
              ← Atrás
            </motion.button>
          )}
          {currentStepData.optional && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-skip"
              onClick={handleSkip}
            >
              Omitir
            </motion.button>
          )}
          {currentStepData.id !== 'complete' &&
            !currentStepData.options &&
            currentStepData.type !== 'boolean' && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-next"
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Continuar →
              </motion.button>
            )}
        </div>
      </div>
    </div>
  );
};

export default AddDebt;
