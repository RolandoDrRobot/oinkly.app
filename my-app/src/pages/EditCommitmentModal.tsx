import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes } from 'react-icons/fa';
import { PaymentCommitment, Debt } from '../types';
import { storage } from '../utils/storage';

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
  const [formData, setFormData] = useState({
    date: commitment.date.split('T')[0], // Extract date part from ISO string
    amountLocal: commitment.amountLocal,
    amountDollars: commitment.amountDollars,
    notes: commitment.notes || '',
  });

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
            <h2>Edit Commitment</h2>
            <button className="modal-close" onClick={onClose}>
              <Icon component={FaTimes} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Amount ({storage.getLocalCurrency()})</label>
              <input
                type="number"
                step="0.01"
                value={formData.amountLocal}
                onChange={(e) => setFormData({ ...formData, amountLocal: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Amount (USD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amountDollars}
                onChange={(e) => setFormData({ ...formData, amountDollars: parseFloat(e.target.value) || 0 })}
                placeholder="0.00"
                required
              />
            </div>

            <div className="form-group">
              <label>Notes (optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes about this commitment"
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
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-submit"
              >
                Save
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditCommitmentModal;
