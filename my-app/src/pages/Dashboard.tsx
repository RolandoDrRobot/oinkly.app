import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaPhone, FaCheck, FaTimes, FaChevronDown, FaChevronUp, FaFileInvoiceDollar, FaLandmark, FaCreditCard, FaMoneyBillWave } from 'react-icons/fa';
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
  const [expandedDebts, setExpandedDebts] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ debtId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
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

  const toggleExpand = (debtId: string) => {
    setExpandedDebts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(debtId)) {
        newSet.delete(debtId);
      } else {
        newSet.add(debtId);
      }
      return newSet;
    });
  };

  const startEditing = (debtId: string, field: string, currentValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingField({ debtId, field });
    setEditValue(currentValue.toString());
  };

  const saveEdit = (debtId: string, field: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt) return;

    let newValue: string | number = editValue;
    
    // Convert to number if it's a numeric field
    const numericFields = ['localFee', 'dollarFee', 'totalLocal', 'totalDollars', 'feeToUpdate'];
    if (numericFields.includes(field)) {
      newValue = parseFloat(editValue) || 0;
    }

    const updated = {
      ...debt,
      [field]: newValue,
      updatedAt: new Date().toISOString(),
    };
    
    storage.saveDebt(updated);
    loadDebts();
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
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
              {debts.map((debt, index) => {
                const isExpanded = expandedDebts.has(debt.id);
                return (
                  <motion.div
                    key={debt.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    whileHover={{ y: -2 }}
                    className="debt-card"
                  >
                    <div className="debt-header">
                      <div className="debt-header-main" onClick={() => toggleExpand(debt.id)}>
                        <div className="debt-header-info">
                          {editingField?.debtId === debt.id && editingField?.field === 'name' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(debt.id, 'name')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(debt.id, 'name');
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-edit-input"
                              autoFocus
                            />
                          ) : (
                            <h3 onClick={(e) => startEditing(debt.id, 'name', debt.name, e)} className="editable-field debt-name">
                              <Icon component={FaFileInvoiceDollar} className="debt-info-icon" />
                              {debt.name}
                            </h3>
                          )}
                          {editingField?.debtId === debt.id && editingField?.field === 'bankName' ? (
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveEdit(debt.id, 'bankName')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEdit(debt.id, 'bankName');
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-edit-input"
                              autoFocus
                            />
                          ) : (
                            <p className="debt-bank editable-field" onClick={(e) => startEditing(debt.id, 'bankName', debt.bankName, e)}>
                              <Icon component={FaLandmark} className="debt-info-icon" />
                              {debt.bankName}
                            </p>
                          )}
                          <p className="debt-type">
                            <Icon component={debt.type === 'prestamo' ? FaMoneyBillWave : FaCreditCard} className="debt-info-icon" />
                            {debt.type === 'prestamo' ? 'Loan' : 'Credit Card'}
                          </p>
                        </div>
                        <motion.button
                          className="btn-expand"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(debt.id);
                          }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          <Icon component={isExpanded ? FaChevronUp : FaChevronDown} />
                        </motion.button>
                      </div>
                      <div className="debt-header-actions">
                        <div className="debt-summary">
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
                        <div className="debt-actions">
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
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="debt-expanded-content"
                        >
                          <div className="debt-main-info">
                            <div className="debt-payments">
                              <div className="payment-item">
                                <span className="payment-label">Monthly ({debt.localCurrency})</span>
                                {editingField?.debtId === debt.id && editingField?.field === 'localFee' ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit(debt.id, 'localFee')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit(debt.id, 'localFee');
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-edit-input"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="payment-value editable-field" onClick={(e) => startEditing(debt.id, 'localFee', debt.localFee, e)}>
                                    {formatCurrency(debt.localFee, debt.localCurrency)}
                                  </span>
                                )}
                              </div>
                              <div className="payment-item">
                                <span className="payment-label">Monthly (USD)</span>
                                {editingField?.debtId === debt.id && editingField?.field === 'dollarFee' ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit(debt.id, 'dollarFee')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit(debt.id, 'dollarFee');
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-edit-input"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="payment-value editable-field" onClick={(e) => startEditing(debt.id, 'dollarFee', debt.dollarFee, e)}>
                                    {formatCurrency(debt.dollarFee, 'USD')}
                                  </span>
                                )}
                              </div>
                              <div className="payment-item total-debt">
                                <span className="payment-label">Total ({debt.localCurrency})</span>
                                {editingField?.debtId === debt.id && editingField?.field === 'totalLocal' ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit(debt.id, 'totalLocal')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit(debt.id, 'totalLocal');
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-edit-input"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="payment-value editable-field" onClick={(e) => startEditing(debt.id, 'totalLocal', debt.totalLocal, e)}>
                                    {formatCurrency(debt.totalLocal, debt.localCurrency)}
                                  </span>
                                )}
                              </div>
                              <div className="payment-item total-debt">
                                <span className="payment-label">Total (USD)</span>
                                {editingField?.debtId === debt.id && editingField?.field === 'totalDollars' ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit(debt.id, 'totalDollars')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit(debt.id, 'totalDollars');
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-edit-input"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="payment-value editable-field" onClick={(e) => startEditing(debt.id, 'totalDollars', debt.totalDollars, e)}>
                                    {formatCurrency(debt.totalDollars, 'USD')}
                                  </span>
                                )}
                              </div>
                              <div className="payment-item update-amount">
                                <span className="payment-label">To Update ({debt.localCurrency})</span>
                                {editingField?.debtId === debt.id && editingField?.field === 'feeToUpdate' ? (
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={() => saveEdit(debt.id, 'feeToUpdate')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') saveEdit(debt.id, 'feeToUpdate');
                                      if (e.key === 'Escape') cancelEdit();
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-edit-input"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="payment-value editable-field" onClick={(e) => startEditing(debt.id, 'feeToUpdate', debt.feeToUpdate, e)}>
                                    {formatCurrency(debt.feeToUpdate, debt.localCurrency)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {debt.currentPlan && (
                            <div className="debt-plan">
                              <span className="plan-label">Plan:</span>
                              {editingField?.debtId === debt.id && editingField?.field === 'currentPlan' ? (
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onBlur={() => saveEdit(debt.id, 'currentPlan')}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveEdit(debt.id, 'currentPlan');
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-edit-input"
                                  autoFocus
                                />
                              ) : (
                                <span className="plan-value editable-field" onClick={(e) => startEditing(debt.id, 'currentPlan', debt.currentPlan, e)}>
                                  {debt.currentPlan}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="debt-phone">
                            <Icon component={FaPhone} size={14} />
                            {editingField?.debtId === debt.id && editingField?.field === 'bankPhone' ? (
                              <input
                                type="tel"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveEdit(debt.id, 'bankPhone')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(debt.id, 'bankPhone');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input"
                                autoFocus
                                placeholder="Phone number"
                              />
                            ) : (
                              debt.bankPhone ? (
                                <a href={`tel:${debt.bankPhone}`} className="phone-link editable-field" onClick={(e) => startEditing(debt.id, 'bankPhone', debt.bankPhone || '', e)}>
                                  {debt.bankPhone}
                                </a>
                              ) : (
                                <span className="phone-link editable-field" onClick={(e) => startEditing(debt.id, 'bankPhone', '', e)} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  Add phone
                                </span>
                              )
                            )}
                          </div>

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
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fab-add-debt"
        onClick={() => navigate('/add-debt')}
      >
        <Icon component={FaPlus} />
      </motion.button>
    </motion.div>
  );
};

export default Dashboard;
