import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTimes, FaPhone, FaCalendarAlt } from 'react-icons/fa';
import { CallRecord, Debt } from '../types';
import { storage } from '../utils/storage';
import { useNavigate } from 'react-router-dom';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

interface AddCallModalProps {
  debt: Debt;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const AddCallModal: React.FC<AddCallModalProps> = ({
  debt,
  isOpen,
  onClose,
  onSave,
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Today's date
    notes: '',
    createCommitment: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newCall: CallRecord = {
      id: Date.now().toString(),
      debtId: debt.id,
      date: new Date(formData.date).toISOString(),
      notes: formData.notes,
      createdAt: new Date().toISOString(),
    };

    const updatedDebt: Debt = {
      ...debt,
      callHistory: [...(debt.callHistory || []), newCall],
      lastCallDate: newCall.date,
      updatedAt: new Date().toISOString(),
    };

    storage.saveDebt(updatedDebt);
    
    if (formData.createCommitment) {
      // Navigate to add commitment page
      navigate(`/add-commitment/${debt.id}`);
    }
    
    onSave();
    onClose();
    
    // Reset form
    setFormData({
      date: new Date().toISOString().split('T')[0],
      notes: '',
      createCommitment: false,
    });
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
              <Icon component={FaPhone} style={{ marginRight: '8px', display: 'inline' }} />
              Record Call
            </h2>
            <button className="modal-close" onClick={onClose}>
              <Icon component={FaTimes} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-form">
            <div className="form-group">
              <label>
                <Icon component={FaCalendarAlt} style={{ marginRight: '6px', display: 'inline' }} />
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="What did you discuss? Any agreements? Next steps?"
                rows={5}
                required
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.createCommitment}
                  onChange={(e) => setFormData({ ...formData, createCommitment: e.target.checked })}
                  style={{ width: 'auto', cursor: 'pointer' }}
                />
                <span>Create payment commitment from this call</span>
              </label>
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
                Save Call
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddCallModal;
