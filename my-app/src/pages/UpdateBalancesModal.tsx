import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaCheckCircle } from 'react-icons/fa';
import { PaymentCommitment, Debt } from '../types';
import { storage } from '../utils/storage';

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
  const [formData, setFormData] = useState({
    totalLocal: debt.totalLocal,
    totalDollars: debt.totalDollars,
    feeToUpdate: debt.feeToUpdate,
    feeToUpdateDollars: debt.feeToUpdateDollars,
  });

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

  const formatCurrency = (amount: number, currency: string) => {
    const currencyMap: { [key: string]: string } = {
      'CRC': 'CRC',
      'ARS': 'ARS',
      'USD': 'USD',
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
              Update Balances
            </h2>
            <button className="modal-close" onClick={onClose}>
              <Icon component={FaTimes} />
            </button>
          </div>

          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--dark-green)' }}>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
              Great! You completed a payment commitment. Would you like to update your debt balances?
            </p>
            <div style={{ marginTop: '12px', padding: '12px', background: 'var(--overlay)', borderRadius: '6px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 4px 0' }}>Payment made:</p>
              {commitment.amountLocal > 0 && (
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', margin: '4px 0' }}>
                  {formatCurrency(commitment.amountLocal, debt.localCurrency)}
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
              <label>Total Debt ({debt.localCurrency})</label>
              <input
                type="number"
                step="0.01"
                value={formData.totalLocal}
                onChange={(e) => setFormData({ ...formData, totalLocal: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Total Debt (USD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.totalDollars}
                onChange={(e) => setFormData({ ...formData, totalDollars: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Amount to Update ({debt.localCurrency})</label>
              <input
                type="number"
                step="0.01"
                value={formData.feeToUpdate}
                onChange={(e) => setFormData({ ...formData, feeToUpdate: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Amount to Update (USD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.feeToUpdateDollars}
                onChange={(e) => setFormData({ ...formData, feeToUpdateDollars: parseFloat(e.target.value) || 0 })}
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
                Skip
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-submit"
              >
                Update Balances
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UpdateBalancesModal;
