import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaCheckCircle } from 'react-icons/fa';
import { PaymentCommitment, Debt } from '../types';
import { storage } from '../utils/storage';
import { formatCurrencyInput, parseCurrencyInput, formatNumberWithSeparators, getCurrencyForField } from '../utils/currencyFormatter';

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

interface UpdateBalancesModalProps {
  debt: Debt;
  commitment: PaymentCommitment;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const UpdateBalancesModal: React.FC<UpdateBalancesModalProps> = ({
  debt,
  commitment,
  isOpen,
  onClose,
  onSave,
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    totalLocal: debt.totalLocal,
    totalDollars: debt.totalDollars,
    feeToUpdate: debt.feeToUpdate,
    feeToUpdateDollars: debt.feeToUpdateDollars,
  });
  const [currencyDisplayValues, setCurrencyDisplayValues] = useState<{ [key: string]: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Calculate inOrder based on feeToUpdate
    const inOrder = formData.feeToUpdate === 0 && formData.feeToUpdateDollars === 0;
    
    const updatedDebt: Debt = {
      ...debt,
      totalLocal: formData.totalLocal,
      totalDollars: formData.totalDollars,
      feeToUpdate: formData.feeToUpdate,
      feeToUpdateDollars: formData.feeToUpdateDollars,
      inOrder: inOrder,
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
            <h2>
              <Icon component={FaCheckCircle} style={{ marginRight: '8px', display: 'inline', color: 'var(--primary-bright)' }} />
              {t('updateBalances.title')}
            </h2>
            <button className="modal-close" onClick={onClose}>
              <Icon component={FaTimes} />
            </button>
          </div>

          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--dark-green)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              {t('updateBalances.message')}
            </p>
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--overlay)', borderRadius: '6px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>{t('updateBalances.paymentMade')}</p>
              {commitment.amountLocal > 0 && (
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '4px 0' }}>
                  {formatCurrency(commitment.amountLocal, storage.getLocalCurrency())}
                </p>
              )}
              {commitment.amountDollars > 0 && (
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '4px 0' }}>
                  {formatCurrency(commitment.amountDollars, 'USD')}
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>{t('updateBalances.totalDebtLocal')} ({storage.getLocalCurrency()})</label>
              <input
                type="text"
                value={getCurrencyInputValue('totalLocal', storage.getLocalCurrency())}
                onChange={(e) => handleCurrencyInputChange(e, 'totalLocal', storage.getLocalCurrency())}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('updateBalances.totalDebtDollar')}</label>
              <input
                type="text"
                value={getCurrencyInputValue('totalDollars', 'USD')}
                onChange={(e) => handleCurrencyInputChange(e, 'totalDollars', 'USD')}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('updateBalances.amountToUpdateLocal')} ({storage.getLocalCurrency()})</label>
              <input
                type="text"
                value={getCurrencyInputValue('feeToUpdate', storage.getLocalCurrency())}
                onChange={(e) => handleCurrencyInputChange(e, 'feeToUpdate', storage.getLocalCurrency())}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>{t('updateBalances.amountToUpdateDollar')}</label>
              <input
                type="text"
                value={getCurrencyInputValue('feeToUpdateDollars', 'USD')}
                onChange={(e) => handleCurrencyInputChange(e, 'feeToUpdateDollars', 'USD')}
                placeholder="0.00"
                required
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
                {t('common.skip')}
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-submit"
              >
                {t('updateBalances.updateBalances')}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateBalancesModal;
