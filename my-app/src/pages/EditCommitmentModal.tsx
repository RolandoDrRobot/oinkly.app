import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaTimes } from 'react-icons/fa';
import { PaymentCommitment, Debt } from '../types';
import { storage } from '../utils/storage';
import { formatCurrencyInput, parseCurrencyInput, formatNumberWithSeparators } from '../utils/currencyFormatter';

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
    notes: commitment.notes || '',
  });
  const [currencyDisplayValues, setCurrencyDisplayValues] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      setFormData({
        date: commitment.date.split('T')[0],
        amountLocal: commitment.amountLocal,
        amountDollars: commitment.amountDollars,
        notes: commitment.notes || '',
      });
    }
  }, [commitment, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedCommitment: PaymentCommitment = {
      ...commitment,
      date: new Date(formData.date).toISOString(),
      amountLocal: formData.amountLocal,
      amountDollars: formData.amountDollars,
      notes: formData.notes || undefined,
      updatedAt: new Date().toISOString(),
    };

    const updatedDebt: Debt = {
      ...debt,
      commitments: debt.commitments?.map(c =>
        c.id === commitment.id ? updatedCommitment : c
      ),
      updatedAt: new Date().toISOString(),
    };

    storage.saveDebt(updatedDebt);
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

  const formatCurrency = (amount: number, currency: string) => {
    const currencyMap: { [key: string]: string } = {
      'USD': 'USD',
      'MXN': 'MXN',
      'ARS': 'ARS',
      'CLP': 'CLP',
      'COP': 'COP',
      'PEN': 'PEN',
      'BRL': 'BRL',
      'CRC': 'CRC',
      'GTQ': 'GTQ',
      'PAB': 'PAB',
      'DOP': 'DOP',
      'VES': 'VES',
      'UYU': 'UYU',
      'PYG': 'PYG',
      'BOB': 'BOB',
      'HNL': 'HNL',
      'NIO': 'NIO',
    };
    
    const currencyCode = currencyMap[currency] || 'USD';
    
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch (e) {
      return `${currencyCode} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  if (!isOpen) return null;

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
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('editCommitment.amountDollar')}</label>
              <input
                type="text"
                value={getCurrencyInputValue('amountDollars', 'USD')}
                onChange={(e) => handleCurrencyInputChange(e, 'amountDollars', 'USD')}
                placeholder="0.00"
                required
              />
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
