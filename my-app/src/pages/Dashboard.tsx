import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaPhone, FaCheck, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { Debt } from '../types';
import { storage } from '../utils/storage';
import './Dashboard.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const Dashboard: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = () => {
    const allDebts = storage.getDebts();
    setDebts(allDebts);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this debt?')) {
      storage.deleteDebt(id);
      loadDebts();
    }
  };

  const handleToggleCallTask = (debt: Debt) => {
    const updated = {
      ...debt,
      hasCallTask: !debt.hasCallTask,
      callCompleted: false,
    };
    storage.saveDebt(updated);
    loadDebts();
  };

  const handleToggleCallCompleted = (debt: Debt) => {
    const updated = {
      ...debt,
      callCompleted: !debt.callCompleted,
    };
    storage.saveDebt(updated);
    loadDebts();
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Map currency codes to Intl.NumberFormat compatible codes
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
      // Fallback for currencies that might not be supported
      return `${currencyCode} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="dashboard"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="dashboard-header"
      >
        <div className="header-content">
          <div>
            <h1>Debts</h1>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-logout"
            onClick={logout}
          >
            Logout
          </motion.button>
        </div>
      </motion.header>

      <div className="dashboard-content">
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-add-debt"
          onClick={() => navigate('/add-debt')}
        >
          <Icon component={FaPlus} style={{ marginRight: '8px' }} /> Add Debt
        </motion.button>

        <AnimatePresence mode="wait">
          {debts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.3 }}
              className="empty-state"
            >
              <p>No debts yet</p>
              <p className="empty-subtitle">Add your first debt to get started</p>
            </motion.div>
          ) : (
            <motion.div
              key="debts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.3 }}
              className="debts-container"
            >
              {debts.map((debt, index) => (
                <motion.div
                  key={debt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * index }}
                  whileHover={{ y: -2 }}
                  className="debt-card"
                >
                  <div className="debt-header">
                    <div>
                      <h3>{debt.name}</h3>
                      <p className="debt-bank">{debt.bankName}</p>
                      <p className="debt-type">{debt.type === 'prestamo' ? 'Loan' : 'Credit Card'}</p>
                    </div>
                    <div className="debt-actions">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="btn-edit"
                        onClick={() => navigate(`/edit-debt/${debt.id}`)}
                      >
                        <Icon component={FaEdit} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="btn-delete"
                        onClick={() => handleDelete(debt.id)}
                      >
                        <Icon component={FaTrash} />
                      </motion.button>
                    </div>
                  </div>

                  <div className="debt-main-info">
                    <div className="debt-payments">
                      <div className="payment-item">
                        <span className="payment-label">Monthly ({debt.localCurrency})</span>
                        <span className="payment-value">{formatCurrency(debt.localFee, debt.localCurrency)}</span>
                      </div>
                      <div className="payment-item">
                        <span className="payment-label">Monthly (USD)</span>
                        <span className="payment-value">{formatCurrency(debt.dollarFee, 'USD')}</span>
                      </div>
                      <div className="payment-item total-debt">
                        <span className="payment-label">Total ({debt.localCurrency})</span>
                        <span className="payment-value">{formatCurrency(debt.totalLocal, debt.localCurrency)}</span>
                      </div>
                      <div className="payment-item total-debt">
                        <span className="payment-label">Total (USD)</span>
                        <span className="payment-value">{formatCurrency(debt.totalDollars, 'USD')}</span>
                      </div>
                      <div className="payment-item update-amount">
                        <span className="payment-label">To Update ({debt.localCurrency})</span>
                        <span className="payment-value">{formatCurrency(debt.feeToUpdate, debt.localCurrency)}</span>
                      </div>
                    </div>
                    <div className="debt-status">
                      {debt.inOrder ? (
                        <span className="status-badge in-order">
                          <Icon component={FaCheck} size={12} /> In Order
                        </span>
                      ) : (
                        <span className="status-badge not-in-order">
                          <Icon component={FaTimes} size={12} /> Not in Order
                        </span>
                      )}
                    </div>
                  </div>

                  {debt.currentPlan && (
                    <div className="debt-plan">
                      <span className="plan-label">Plan:</span>
                      <span className="plan-value">{debt.currentPlan}</span>
                    </div>
                  )}

                  {debt.bankPhone && (
                    <div className="debt-phone">
                      <Icon component={FaPhone} size={14} />
                      <a href={`tel:${debt.bankPhone}`} className="phone-link">
                        {debt.bankPhone}
                      </a>
                    </div>
                  )}

                  <div className="debt-task">
                    <label className="task-checkbox">
                      <input
                        type="checkbox"
                        checked={debt.hasCallTask}
                        onChange={() => handleToggleCallTask(debt)}
                      />
                      <span>Call bank</span>
                    </label>
                    {debt.hasCallTask && (
                      <label className="task-checkbox">
                        <input
                          type="checkbox"
                          checked={debt.callCompleted}
                          onChange={() => handleToggleCallCompleted(debt)}
                        />
                        <span className={debt.callCompleted ? 'completed' : ''}>Completed</span>
                      </label>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Dashboard;
