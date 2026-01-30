import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import { PaymentCommitment, Debt } from '../types';
import { storage } from '../utils/storage';
import { formatCurrencyInput, formatNumberWithSeparators } from '../utils/currencyFormatter';
import { notify } from '../utils/notifications';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

interface EditCommitmentModalProps {
  commitment: PaymentCommitment;
  debt: Debt;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const EditCommitmentModal: React.FC<EditCommitmentModalProps> = ({
  commitment,
  debt,
  isOpen,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    date: commitment.date.split('T')[0], // Extract date part from ISO string
    amountLocal: commitment.amountLocal,
    amountDollars: commitment.amountDollars,
    paymentTypeLocal: commitment.paymentType || 'partial',
    paymentTypeDollars: commitment.paymentType || 'partial',
    notes: commitment.notes || '',
  });
  const [currencyDisplayValues, setCurrencyDisplayValues] = useState<{ [key: string]: string }>({});
  
  // Only allow editing pending commitments
  const isCompleted = commitment.status === 'completed';

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: commitment.date.split('T')[0],
        amountLocal: commitment.amountLocal,
        amountDollars: commitment.amountDollars,
        paymentTypeLocal: commitment.paymentType || 'partial',
        paymentTypeDollars: commitment.paymentType || 'partial',
        notes: commitment.notes || '',
      });
      // Reset currency display values when modal opens
      setCurrencyDisplayValues({});
    }
  }, [commitment, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine payment type
    const paymentType = formData.paymentTypeLocal === formData.paymentTypeDollars 
      ? formData.paymentTypeLocal 
      : (formData.paymentTypeLocal || formData.paymentTypeDollars || commitment.paymentType || 'partial');
    
    const updatedCommitment: PaymentCommitment = {
      ...commitment,
      date: new Date(formData.date).toISOString(),
      amountLocal: formData.amountLocal,
      amountDollars: formData.amountDollars,
      paymentType: paymentType as 'partial' | 'full' | 'settlement',
      notes: formData.notes || undefined,
      updatedAt: new Date().toISOString(),
    };

    // Update the commitment in the debt
    let updatedDebt: Debt = {
      ...debt,
      commitments: debt.commitments?.map(c =>
        c.id === commitment.id ? updatedCommitment : c
      ),
      updatedAt: new Date().toISOString(),
    };

    // Note: Pending commitments don't affect totals until they are completed.
    // When a pending commitment is edited, we only update the commitment data.
    // The totals will be updated when the commitment is completed.
    
    // However, we need to recalculate inOrder based on updated commitments
    const calculateInOrder = (debt: Debt): boolean => {
      if (!debt.commitments || debt.commitments.length === 0) {
        return true;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const hasPendingOrOverdue = debt.commitments.some(c => {
        if (c.status === 'completed') {
          return false;
        }

        const commitmentDate = new Date(c.date);
        commitmentDate.setHours(0, 0, 0, 0);
        const diffTime = commitmentDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays < 0 || c.status === 'pending';
      });

      return !hasPendingOrOverdue;
    };

    const oldInOrder = debt.inOrder;
    updatedDebt.inOrder = calculateInOrder(updatedDebt);

    storage.saveDebt(updatedDebt);
    
    // Notify if status changed automatically
    if (oldInOrder !== updatedDebt.inOrder) {
      notify.debtStatusChanged(debt.name, updatedDebt.inOrder);
    }
    
    onSave();
    onClose();
  };

  const handleCurrencyInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: string, currency: string) => {
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
      [field]: displayValue
    }));
    
    // Parse and store numeric value (always as number)
    const numericValue = numericString ? parseFloat(numericString) : 0;
    const finalValue = isNaN(numericValue) ? 0 : numericValue;
    
    setFormData(prev => ({ ...prev, [field]: finalValue }));
  };

  const getCurrencyInputValue = (field: string, currency: string): string => {
    // Use stored display value if available
    if (currencyDisplayValues[field] !== undefined) {
      return currencyDisplayValues[field];
    }
    
    // Otherwise format from numeric value
    const value = formData[field as keyof typeof formData];
    if (value === undefined || value === null || value === 0) return '';
    return formatCurrencyInput(value, currency);
  };

  if (!isOpen) return null;

  // Block editing if commitment is completed
  if (isCompleted) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="modal-overlay"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t('editCommitment.title')}</h2>
              <button className="modal-close" onClick={onClose}>
                <Icon component={FaTimes} />
              </button>
            </div>
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '16px' }}>
                {t('editCommitment.cannotEditCompleted')}
              </p>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-submit"
                onClick={onClose}
              >
                {t('common.close')}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="modal-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>{t('editCommitment.title')}</h2>
            <button className="modal-close" onClick={onClose}>
              <Icon component={FaTimes} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>{t('editCommitment.date')}</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>{t('editCommitment.amountLocal')} ({storage.getLocalCurrency()})</label>
              <input
                type="text"
                value={getCurrencyInputValue('amountLocal', storage.getLocalCurrency())}
                onChange={(e) => handleCurrencyInputChange(e, 'amountLocal', storage.getLocalCurrency())}
                placeholder={t('common.amountPlaceholder')}
                required
              />
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', borderRadius: '6px', background: formData.paymentTypeLocal === 'partial' ? 'var(--primary-overlay)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="paymentTypeLocal"
                    checked={formData.paymentTypeLocal === 'partial'}
                    onChange={() => setFormData(prev => ({ ...prev, paymentTypeLocal: 'partial' }))}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px' }}>{t('addCommitment.paymentPartial')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', borderRadius: '6px', background: formData.paymentTypeLocal === 'full' ? 'var(--primary-overlay)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="paymentTypeLocal"
                    checked={formData.paymentTypeLocal === 'full'}
                    onChange={() => {
                      setFormData(prev => ({ 
                        ...prev, 
                        paymentTypeLocal: 'full',
                        amountLocal: debt.totalLocal
                      }));
                    }}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px' }}>{t('addCommitment.paymentFull')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', borderRadius: '6px', background: formData.paymentTypeLocal === 'settlement' ? 'var(--primary-overlay)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="paymentTypeLocal"
                    checked={formData.paymentTypeLocal === 'settlement'}
                    onChange={() => setFormData(prev => ({ ...prev, paymentTypeLocal: 'settlement' }))}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px' }}>{t('addCommitment.paymentSettlement')}</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>{t('editCommitment.amountDollar')}</label>
              <input
                type="text"
                value={getCurrencyInputValue('amountDollars', 'USD')}
                onChange={(e) => handleCurrencyInputChange(e, 'amountDollars', 'USD')}
                placeholder={t('common.amountPlaceholder')}
                required
              />
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', borderRadius: '6px', background: formData.paymentTypeDollars === 'partial' ? 'var(--primary-overlay)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="paymentTypeDollars"
                    checked={formData.paymentTypeDollars === 'partial'}
                    onChange={() => setFormData(prev => ({ ...prev, paymentTypeDollars: 'partial' }))}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px' }}>{t('addCommitment.paymentPartial')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', borderRadius: '6px', background: formData.paymentTypeDollars === 'full' ? 'var(--primary-overlay)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="paymentTypeDollars"
                    checked={formData.paymentTypeDollars === 'full'}
                    onChange={() => {
                      setFormData(prev => ({ 
                        ...prev, 
                        paymentTypeDollars: 'full',
                        amountDollars: debt.totalDollars
                      }));
                    }}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px' }}>{t('addCommitment.paymentFull')}</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px', borderRadius: '6px', background: formData.paymentTypeDollars === 'settlement' ? 'var(--primary-overlay)' : 'transparent' }}>
                  <input
                    type="radio"
                    name="paymentTypeDollars"
                    checked={formData.paymentTypeDollars === 'settlement'}
                    onChange={() => setFormData(prev => ({ ...prev, paymentTypeDollars: 'settlement' }))}
                    style={{ margin: 0 }}
                  />
                  <span style={{ fontSize: '14px' }}>{t('addCommitment.paymentSettlement')}</span>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>{t('editCommitment.notesOptional')}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('editCommitment.notesPlaceholder')}
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-cancel"
                onClick={onClose}
              >
                {t('common.cancel')}
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-submit"
              >
                {t('common.save')}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditCommitmentModal;
