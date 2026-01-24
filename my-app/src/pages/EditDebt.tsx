import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft } from 'react-icons/fa';
import { Debt } from '../types';
import { storage } from '../utils/storage';
import './EditDebt.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const EditDebt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Debt | null>(null);

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
          Loading...
        </motion.div>
      </motion.div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev!,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = parseFloat(value) || 0;
    const updated = {
      ...formData!,
      [name]: newValue,
    };
    
    // Calculate inOrder automatically if feeToUpdate or feeToUpdateDollars changed
    if (name === 'feeToUpdate' || name === 'feeToUpdateDollars') {
      const feeToUpdate = name === 'feeToUpdate' ? newValue : (updated.feeToUpdate || 0);
      const feeToUpdateDollars = name === 'feeToUpdateDollars' ? newValue : (updated.feeToUpdateDollars || 0);
      updated.inOrder = feeToUpdate === 0 && feeToUpdateDollars === 0;
    }
    
    setFormData(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      const feeToUpdate = formData.feeToUpdate || 0;
      const feeToUpdateDollars = formData.feeToUpdateDollars || 0;
      const inOrder = feeToUpdate === 0 && feeToUpdateDollars === 0;
      
      storage.saveDebt({
        ...formData,
        feeToUpdateDollars: feeToUpdateDollars,
        inOrder: inOrder,
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
          <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> Back
        </motion.button>
        <h1>Edit Debt</h1>
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
              placeholder="Debt name"
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
              <option value="prestamo">Loan</option>
              <option value="tarjeta">Credit Card</option>
            </select>
          </div>

          <div className="form-group">
            <input
              name="bankName"
              type="text"
              value={formData.bankName}
              onChange={handleChange}
              placeholder="Bank name"
              required
            />
          </div>

          <div className="form-group">
            <input
              name="bankPhone"
              type="tel"
              value={formData.bankPhone || ''}
              onChange={handleChange}
              placeholder="Phone (optional)"
            />
          </div>

          <div className="form-group">
            <select
              name="localCurrency"
              value={formData.localCurrency}
              onChange={handleChange}
              required
            >
              <option value="CRC">CRC (Colones)</option>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="form-group">
            <input
              name="localFee"
              type="number"
              step="0.01"
              value={formData.localFee}
              onChange={handleNumberChange}
              placeholder="Monthly payment (local currency)"
              required
            />
          </div>

          <div className="form-group">
            <input
              name="dollarFee"
              type="number"
              step="0.01"
              value={formData.dollarFee}
              onChange={handleNumberChange}
              placeholder="Monthly payment (USD)"
              required
            />
          </div>

          <div className="form-group">
            <input
              name="totalLocal"
              type="number"
              step="0.01"
              value={formData.totalLocal}
              onChange={handleNumberChange}
              placeholder="Total debt (local currency)"
              required
            />
          </div>

          <div className="form-group">
            <input
              name="totalDollars"
              type="number"
              step="0.01"
              value={formData.totalDollars}
              onChange={handleNumberChange}
              placeholder="Total debt (USD)"
              required
            />
          </div>

          <div className="form-group">
            <input
              name="feeToUpdate"
              type="number"
              step="0.01"
              value={formData.feeToUpdate}
              onChange={handleNumberChange}
              placeholder="Amount to update (local currency)"
              required
            />
          </div>

          <div className="form-group">
            <input
              name="feeToUpdateDollars"
              type="number"
              step="0.01"
              value={formData.feeToUpdateDollars || 0}
              onChange={handleNumberChange}
              placeholder="Amount to update (USD)"
              required
            />
          </div>

          <div className="form-group">
            <input
              name="currentPlan"
              type="text"
              value={formData.currentPlan}
              onChange={handleChange}
              placeholder="Current plan"
              required
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
              <span>Call reminder</span>
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
                  Completed
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
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="btn-submit"
            >
              Save
            </motion.button>
          </motion.div>
        </motion.form>
      </div>
    </motion.div>
  );
};

export default EditDebt;
