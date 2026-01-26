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
  FaArrowLeft,
  FaCheckCircle
} from 'react-icons/fa';
import { PaymentCommitment, Debt } from '../types';
import { storage } from '../utils/storage';
import { formatCurrencyInput, parseCurrencyInput, getCurrencyForField, formatNumberWithSeparators } from '../utils/currencyFormatter';
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
  setTotalLocal?: boolean;
  subtractFromTotalLocal?: boolean;
  setTotalDollars?: boolean;
  subtractFromTotalDollars?: boolean;
}

const AddCommitment: React.FC = () => {
  const { t } = useTranslation();
  const { debtId, commitmentId } = useParams<{ debtId: string; commitmentId?: string }>();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<StepData>({});
  const [debt, setDebt] = useState<Debt | null>(null);
  const [commitment, setCommitment] = useState<PaymentCommitment | null>(null);
  const [currencyDisplayValues, setCurrencyDisplayValues] = useState<{ [key: string]: string }>({});
  const isEditing = !!commitmentId;

  useEffect(() => {
    if (debtId) {
      const foundDebt = storage.getDebt(debtId);
      if (foundDebt) {
        setDebt(foundDebt);
        
        // If editing, load commitment data
        if (commitmentId) {
          const foundCommitment = foundDebt.commitments?.find(c => c.id === commitmentId);
          if (foundCommitment) {
            setCommitment(foundCommitment);
            setFormData({
              date: foundCommitment.date.split('T')[0],
              amountLocal: foundCommitment.amountLocal,
              amountDollars: foundCommitment.amountDollars,
              notes: foundCommitment.notes || '',
            });
          } else {
            navigate('/dashboard');
          }
        }
      } else {
        navigate('/dashboard');
      }
    }
  }, [debtId, commitmentId, navigate]);

  const steps: Array<{
    id: string;
    title: string;
    subtitle?: string;
    icon?: IconType;
    field?: keyof StepData;
    placeholder?: string;
    type?: string;
    optional?: boolean;
    hasOptions?: boolean;
    currencyType?: 'local' | 'dollars';
  }> = [
    {
      id: 'welcome',
      title: isEditing ? t('editCommitment.title') : t('addCommitment.title'),
      subtitle: isEditing 
        ? t('editCommitment.subtitle', { debtName: debt?.name || t('addCommitment.thisDebt') })
        : t('addCommitment.subtitle', { debtName: debt?.name || t('addCommitment.thisDebt') }),
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
      hasOptions: true,
      currencyType: 'local',
    },
    {
      id: 'amountDollars',
      title: t('addCommitment.paymentAmount'),
      subtitle: t('addCommitment.paymentAmountDollarSubtitle'),
      icon: FaDollarSign,
      field: 'amountDollars' as keyof StepData,
      placeholder: '0.00',
      type: 'number',
      hasOptions: true,
      currencyType: 'dollars',
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

  const handleCurrencyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const step = steps[currentStep];
    if (step.field && step.type === 'number' && debt) {
      const currency = getCurrencyForField(step.id, debt.localCurrency);
      const inputValue = e.target.value;
      
      // Remove currency prefix and spaces if present
      let cleanedValue = inputValue.replace(new RegExp(`^${currency}\\s*`, 'i'), '').trim();
      
      // Remove all thousand separators (commas) to get raw numeric string
      cleanedValue = cleanedValue.replace(/,/g, '');
      
      // Extract only numbers and decimal point
      const numericString = cleanedValue.replace(/[^\d.]/g, '');
      
      // Format with thousand separators
      const formattedNumber = formatNumberWithSeparators(numericString);
      
      // Store the display value (with currency prefix and formatted number)
      const displayValue = formattedNumber ? `${currency} ${formattedNumber}` : '';
      setCurrencyDisplayValues(prev => ({
        ...prev,
        [step.field!]: displayValue
      }));
      
      // Parse and store numeric value (always as number)
      const numericValue = numericString ? parseFloat(numericString) : 0;
      const finalValue = isNaN(numericValue) ? 0 : numericValue;
      setFormData({ ...formData, [step.field]: finalValue });
    } else {
      handleInputChange(e.target.value);
    }
  };

  const getCurrencyInputValue = (): string => {
    const step = steps[currentStep];
    if (step.field && step.type === 'number' && debt) {
      const fieldKey = step.field;
      // Use stored display value if available
      if (currencyDisplayValues[fieldKey] !== undefined) {
        return currencyDisplayValues[fieldKey];
      }
      // Otherwise format from numeric value
      const value = formData[fieldKey];
      if (value === undefined || value === null || (typeof value === 'number' && (isNaN(value) || value === 0))) return '';
      if (typeof value === 'number') {
        const currency = getCurrencyForField(step.id, debt.localCurrency);
        return formatCurrencyInput(value, currency);
      }
    }
    return '';
  };

  useEffect(() => {
    if (currentStep === steps.length - 1 && steps[currentStep].id === 'complete' && debt) {
      const timer = setTimeout(() => {
        let updatedDebt: Debt = { ...debt };

        if (isEditing && commitment) {
          // Update existing commitment
          const updatedCommitment: PaymentCommitment = {
            ...commitment,
            date: new Date(formData.date || commitment.date).toISOString(),
            amountLocal: formData.amountLocal || 0,
            amountDollars: formData.amountDollars || 0,
            notes: formData.notes,
            updatedAt: new Date().toISOString(),
          };

          updatedDebt = {
            ...updatedDebt,
            commitments: updatedDebt.commitments?.map(c => 
              c.id === commitment.id ? updatedCommitment : c
            ),
            updatedAt: new Date().toISOString(),
          };
        } else {
          // Create new commitment
          const newCommitment: PaymentCommitment = {
            id: Date.now().toString(),
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
            commitments: [...(updatedDebt.commitments || []), newCommitment],
            updatedAt: new Date().toISOString(),
          };
        }

        // Handle total updates based on options
        if (formData.setTotalLocal && formData.amountLocal !== undefined) {
          updatedDebt.totalLocal = formData.amountLocal;
          // If total reaches 0, set fee to 0
          if (formData.amountLocal === 0) {
            updatedDebt.localFee = 0;
          }
        } else if (formData.subtractFromTotalLocal && formData.amountLocal !== undefined) {
          updatedDebt.totalLocal = Math.max(0, (updatedDebt.totalLocal || 0) - formData.amountLocal);
          // If total reaches 0, set fee to 0
          if (updatedDebt.totalLocal === 0) {
            updatedDebt.localFee = 0;
          }
        }

        if (formData.setTotalDollars && formData.amountDollars !== undefined) {
          updatedDebt.totalDollars = formData.amountDollars;
          // If total reaches 0, set fee to 0
          if (formData.amountDollars === 0) {
            updatedDebt.dollarFee = 0;
          }
        } else if (formData.subtractFromTotalDollars && formData.amountDollars !== undefined) {
          updatedDebt.totalDollars = Math.max(0, (updatedDebt.totalDollars || 0) - formData.amountDollars);
          // If total reaches 0, set fee to 0
          if (updatedDebt.totalDollars === 0) {
            updatedDebt.dollarFee = 0;
          }
        }

        // inOrder is now calculated based on commitments only, not feeToUpdate
        updatedDebt.feeToUpdate = 0;
        updatedDebt.feeToUpdateDollars = 0;

        storage.saveDebt(updatedDebt);
        navigate('/dashboard');
      }, 1500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, debt, isEditing, commitment]);

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
          {t('common.loading')}
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
                <>
                  <motion.input
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    type={currentStepData.type === 'number' ? 'text' : (currentStepData.type || 'text')}
                    placeholder={currentStepData.placeholder}
                    value={
                      currentStepData.type === 'number'
                        ? getCurrencyInputValue()
                        : typeof formData[currentStepData.field] === 'number'
                        ? formData[currentStepData.field]?.toString() || ''
                        : (formData[currentStepData.field] as string) || ''
                    }
                    onChange={(e) => {
                      if (currentStepData.type === 'number') {
                        handleCurrencyInputChange(e);
                      } else if (currentStepData.type === 'date') {
                        handleInputChange(e.target.value);
                      } else {
                        handleInputChange(e.target.value);
                      }
                    }}
                    className="step-input-field"
                    autoFocus
                  />
                  {currentStepData.hasOptions && debt && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="commitment-options"
                      style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                    >
                      <motion.label
                        whileHover={{ scale: 1.02, backgroundColor: 'var(--overlay)' }}
                        whileTap={{ scale: 0.98 }}
                        className="commitment-option"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px 16px',
                          background: formData[currentStepData.currencyType === 'local' ? 'setTotalLocal' : 'setTotalDollars'] 
                            ? 'var(--primary-overlay)' 
                            : 'var(--bg-secondary)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: formData[currentStepData.currencyType === 'local' ? 'setTotalLocal' : 'setTotalDollars'] 
                            ? '2px solid var(--accent-color)' 
                            : '2px solid var(--bg-tertiary)',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => {
                          const field = currentStepData.currencyType === 'local' ? 'setTotalLocal' : 'setTotalDollars';
                          const otherField = currentStepData.currencyType === 'local' ? 'subtractFromTotalLocal' : 'subtractFromTotalDollars';
                          const amountField = currentStepData.currencyType === 'local' ? 'amountLocal' : 'amountDollars';
                          const totalValue = currentStepData.currencyType === 'local' ? debt.totalLocal : debt.totalDollars;
                          
                          setFormData(prev => ({
                            ...prev,
                            [field]: !prev[field],
                            [otherField]: false, // Uncheck the other option
                            [amountField]: !prev[field] ? totalValue : prev[amountField], // Auto-fill if checking
                          }));
                        }}
                      >
                        <Icon 
                          component={FaCheckCircle} 
                          size={20}
                          style={{ 
                            color: formData[currentStepData.currencyType === 'local' ? 'setTotalLocal' : 'setTotalDollars'] 
                              ? 'var(--accent-color)' 
                              : 'var(--text-muted)',
                            transition: 'color 0.2s',
                          }}
                        />
                        <span style={{ 
                          color: 'var(--text-primary)', 
                          fontSize: '14px',
                          fontWeight: formData[currentStepData.currencyType === 'local' ? 'setTotalLocal' : 'setTotalDollars'] ? 500 : 400,
                        }}>
                          {t('addCommitment.setTotal', { 
                            currency: currentStepData.currencyType === 'local' 
                              ? getCurrencyName(debt.localCurrency) 
                              : 'USD',
                            total: currentStepData.currencyType === 'local' 
                              ? debt.totalLocal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : debt.totalDollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          })}
                        </span>
                      </motion.label>
                      <motion.label
                        whileHover={{ scale: 1.02, backgroundColor: 'var(--overlay)' }}
                        whileTap={{ scale: 0.98 }}
                        className="commitment-option"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '14px 16px',
                          background: formData[currentStepData.currencyType === 'local' ? 'subtractFromTotalLocal' : 'subtractFromTotalDollars'] 
                            ? 'var(--primary-overlay)' 
                            : 'var(--bg-secondary)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          border: formData[currentStepData.currencyType === 'local' ? 'subtractFromTotalLocal' : 'subtractFromTotalDollars'] 
                            ? '2px solid var(--accent-color)' 
                            : '2px solid var(--bg-tertiary)',
                          transition: 'all 0.2s',
                        }}
                        onClick={() => {
                          const field = currentStepData.currencyType === 'local' ? 'subtractFromTotalLocal' : 'subtractFromTotalDollars';
                          const otherField = currentStepData.currencyType === 'local' ? 'setTotalLocal' : 'setTotalDollars';
                          setFormData(prev => ({
                            ...prev,
                            [field]: !prev[field],
                            [otherField]: false, // Uncheck the other option
                          }));
                        }}
                      >
                        <Icon 
                          component={FaCheckCircle} 
                          size={20}
                          style={{ 
                            color: formData[currentStepData.currencyType === 'local' ? 'subtractFromTotalLocal' : 'subtractFromTotalDollars'] 
                              ? 'var(--accent-color)' 
                              : 'var(--text-muted)',
                            transition: 'color 0.2s',
                          }}
                        />
                        <span style={{ 
                          color: 'var(--text-primary)', 
                          fontSize: '14px',
                          fontWeight: formData[currentStepData.currencyType === 'local' ? 'subtractFromTotalLocal' : 'subtractFromTotalDollars'] ? 500 : 400,
                        }}>
                          {t('addCommitment.subtractFromTotal', { 
                            currency: currentStepData.currencyType === 'local' 
                              ? getCurrencyName(debt.localCurrency) 
                              : 'USD'
                          })}
                        </span>
                      </motion.label>
                    </motion.div>
                  )}
                </>
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
