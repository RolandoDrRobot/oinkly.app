import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';
import { Debt } from '../types';
import { storage } from '../utils/storage';
import { formatCurrencyInput, getCurrencyForField, formatNumberWithSeparators } from '../utils/currencyFormatter';
import './EditDebt.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const EditDebt: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Debt | null>(null);
  const [currencyDisplayValues, setCurrencyDisplayValues] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (id) {
      const debt = storage.getDebt(id);
      if (debt) {
        setFormData(debt);
      } else {
        navigate('/dashboard');
      }
    }
  }, [id, navigate]);

  if (!formData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="edit-debt"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          {t('common.loading')}
        </motion.div>
      </motion.div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    // Handle date fields - convert to ISO string
    if (type === 'date' && value) {
      setFormData(prev => ({
        ...prev!,
        [name]: new Date(value).toISOString(),
      }));
    } else {
      setFormData(prev => ({
        ...prev!,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name } = e.target;
    const inputValue = e.target.value;
    
    if (!formData) return;
    
    const currency = getCurrencyForField(name, formData.localCurrency || storage.getLocalCurrency());
    
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
      [name]: displayValue
    }));
    
    // Parse and store numeric value (always as number)
    const numericValue = numericString ? parseFloat(numericString) : 0;
    const finalValue = isNaN(numericValue) ? 0 : numericValue;
    
    const updated = {
      ...formData,
      [name]: finalValue,
    };
    
    // inOrder is now calculated based on commitments only, not feeToUpdate
    
    // If total reaches 0, set corresponding fee to 0
    if (name === 'totalLocal' && finalValue === 0) {
      updated.localFee = 0;
    }
    if (name === 'totalDollars' && finalValue === 0) {
      updated.dollarFee = 0;
    }
    
    setFormData(updated);
  };

  const getCurrencyInputValue = (name: string): string => {
    // Handle interestRate differently
    if (name === 'interestRate') {
      if (currencyDisplayValues[name] !== undefined) {
        return currencyDisplayValues[name];
      }
      const value = formData?.[name];
      if (value === undefined || value === null || (typeof value === 'number' && (isNaN(value) || value === 0))) return '';
      return typeof value === 'number' ? `${value}%` : '';
    }
    if (!formData) return '';
    
    // Use stored display value if available
    if (currencyDisplayValues[name] !== undefined) {
      return currencyDisplayValues[name];
    }
    
    // Otherwise format from numeric value
    const value = formData[name as keyof Debt];
    if (value === undefined || value === null || typeof value !== 'number' || value === 0) return '';
    const currency = getCurrencyForField(name, formData.localCurrency || storage.getLocalCurrency());
    return formatCurrencyInput(value, currency);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      // If total reaches 0, set corresponding fee to 0
      const finalData = { ...formData };
      if (finalData.totalLocal === 0) {
        finalData.localFee = 0;
      }
      if (finalData.totalDollars === 0) {
        finalData.dollarFee = 0;
      }
      
      storage.saveDebt({
        ...finalData,
        localCurrency: storage.getLocalCurrency(), // Use currency from preferences
        feeToUpdate: 0,
        feeToUpdateDollars: 0,
        // inOrder will be calculated based on commitments
        updatedAt: new Date().toISOString(),
      });
      navigate('/dashboard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="edit-debt"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="page-header"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-back"
          onClick={() => navigate('/dashboard')}
        >
          <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
        </motion.button>
        <h1>{t('editDebt.title')}</h1>
      </motion.header>

      <div className="form-container">
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="debt-form"
        >
          <div className="form-group">
            <input
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder={t('addDebt.debtName')}
              required
            />
          </div>

          <div className="form-group">
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              required
            >
              <option value="prestamo">{t('addDebt.loan')}</option>
              <option value="tarjeta">{t('addDebt.creditCard')}</option>
            </select>
          </div>

          <div className="form-group">
            <input
              name="bankName"
              type="text"
              value={formData.bankName}
              onChange={handleChange}
              placeholder={t('addDebt.bankName')}
              required
            />
          </div>

          <div className="form-group">
            <input
              name="bankPhone"
              type="tel"
              value={formData.bankPhone || ''}
              onChange={handleChange}
              placeholder={t('editDebt.phoneOptional')}
            />
          </div>

          <div className="form-group">
            <input
              name="localFee"
              type="text"
              value={getCurrencyInputValue('localFee')}
              onChange={handleNumberChange}
              placeholder={t('editDebt.monthlyPaymentLocal')}
              required
            />
          </div>

          <div className="form-group">
            <input
              name="dollarFee"
              type="text"
              value={getCurrencyInputValue('dollarFee')}
              onChange={handleNumberChange}
              placeholder={t('editDebt.monthlyPaymentDollar')}
              required
            />
          </div>

          <div className="form-group">
            <input
              name="totalLocal"
              type="text"
              value={getCurrencyInputValue('totalLocal')}
              onChange={handleNumberChange}
              placeholder={t('editDebt.totalDebtLocal')}
              required
            />
          </div>

          <div className="form-group">
            <input
              name="totalDollars"
              type="text"
              value={getCurrencyInputValue('totalDollars')}
              onChange={handleNumberChange}
              placeholder={t('editDebt.totalDebtDollar')}
              required
            />
          </div>


          <div className="form-group">
            <input
              name="currentPlan"
              type="text"
              value={formData.currentPlan}
              onChange={handleChange}
              placeholder={t('editDebt.currentPlan')}
              required
            />
          </div>

          <div className="form-group">
            <input
              name="paymentDate"
              type="date"
              value={formData.paymentDate ? (formData.paymentDate.includes('T') ? formData.paymentDate.split('T')[0] : formData.paymentDate) : ''}
              onChange={handleChange}
              placeholder={t('editDebt.paymentDate')}
            />
          </div>

          {formData.type === 'tarjeta' && (
            <div className="form-group">
              <input
                name="cutDate"
                type="date"
                value={formData.cutDate ? (formData.cutDate.includes('T') ? formData.cutDate.split('T')[0] : formData.cutDate) : ''}
                onChange={handleChange}
                placeholder={t('editDebt.cutDate')}
              />
            </div>
          )}

          <div className="form-group">
            <input
              name="interestRate"
              type="text"
              value={getCurrencyInputValue('interestRate')}
              onChange={handleNumberChange}
              placeholder={t('editDebt.interestRate')}
            />
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="hasCallTask"
                checked={formData.hasCallTask}
                onChange={handleChange}
              />
              <span>{t('editDebt.callReminder')}</span>
            </label>
          </div>

          {formData.hasCallTask && (
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="callCompleted"
                  checked={formData.callCompleted}
                  onChange={handleChange}
                />
                <span className={formData.callCompleted ? 'completed' : ''}>
                  {t('common.completed')}
                </span>
              </label>
            </div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="form-actions"
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              className="btn-cancel"
              onClick={() => navigate('/dashboard')}
            >
                {t('common.cancel')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="btn-submit"
              >
                {t('common.save')}
              </motion.button>
          </motion.div>
        </motion.form>
      </div>
    </motion.div>
  );
};

export default EditDebt;
