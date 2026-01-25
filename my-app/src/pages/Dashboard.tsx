import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaPlus, FaEdit, FaTrash, FaPhone, FaCheck, FaTimes, FaChevronDown, FaChevronUp, FaFileInvoiceDollar, FaLandmark, FaCreditCard, FaMoneyBillWave, FaUser, FaChartLine, FaDollarSign, FaMoneyBill, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { Debt, PaymentCommitment } from '../types';
import { storage } from '../utils/storage';
import EditCommitmentModal from './EditCommitmentModal';
import AddCallModal from './AddCallModal';
import UpdateBalancesModal from './UpdateBalancesModal';
import './Dashboard.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [expandedDebts, setExpandedDebts] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ debtId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editingCommitment, setEditingCommitment] = useState<{ debt: Debt; commitment: PaymentCommitment } | null>(null);
  const [addingCall, setAddingCall] = useState<Debt | null>(null);
  const [updatingBalances, setUpdatingBalances] = useState<{ debt: Debt; commitment: PaymentCommitment } | null>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = () => {
    const allDebts = storage.getDebts();
    // Update inOrder for all debts based on feeToUpdate and feeToUpdateDollars
    // Also ensure feeToUpdateDollars exists for old debts
    const updatedDebts = allDebts.map(debt => {
      const feeToUpdate = debt.feeToUpdate || 0;
      const feeToUpdateDollars = debt.feeToUpdateDollars ?? 0;
      const inOrder = feeToUpdate === 0 && feeToUpdateDollars === 0;
      
      // Ensure commitments and callHistory arrays exist
      if (!debt.commitments) debt.commitments = [];
      if (!debt.callHistory) debt.callHistory = [];
      
      // Update if inOrder changed or feeToUpdateDollars is missing
      if (debt.inOrder !== inOrder || debt.feeToUpdateDollars === undefined) {
        const updated = { 
          ...debt, 
          feeToUpdateDollars: feeToUpdateDollars,
          inOrder, 
          updatedAt: new Date().toISOString() 
        };
        storage.saveDebt(updated);
        return updated;
      }
      return debt;
    });
    
    // Sort by snowball method: smallest total debt first
    // Total debt = totalLocal + totalDollars (converted to a common base)
    // For simplicity, we'll use totalDollars as primary, then totalLocal
    const sortedDebts = [...updatedDebts].sort((a, b) => {
      // Calculate total in a common currency (using USD as base)
      // For simplicity, we'll prioritize by totalDollars first, then totalLocal
      const totalA = a.totalDollars + (a.totalLocal * 0.001); // Simple conversion approximation
      const totalB = b.totalDollars + (b.totalLocal * 0.001);
      return totalA - totalB; // Ascending order (smallest first
    });
    
    setDebts(sortedDebts);
  };

  const handleDelete = (id: string) => {
    if (window.confirm(t('debt.deleteConfirm'))) {
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
    const numericFields = ['localFee', 'dollarFee', 'totalLocal', 'totalDollars', 'feeToUpdate', 'feeToUpdateDollars'];
    if (numericFields.includes(field)) {
      newValue = parseFloat(editValue) || 0;
    }

    const updated = {
      ...debt,
      [field]: newValue,
      updatedAt: new Date().toISOString(),
    };
    
    // Calculate inOrder automatically based on feeToUpdate and feeToUpdateDollars
    const feeToUpdate = field === 'feeToUpdate' ? (newValue as number) : (updated.feeToUpdate || 0);
    const feeToUpdateDollars = field === 'feeToUpdateDollars' ? (newValue as number) : (updated.feeToUpdateDollars || 0);
    updated.inOrder = feeToUpdate === 0 && feeToUpdateDollars === 0;
    
    storage.saveDebt(updated);
    loadDebts();
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  // Get commitment status based on date
  const getCommitmentStatus = (commitment: PaymentCommitment): 'pending' | 'completed' | 'overdue' | 'due-today' | 'due-tomorrow' => {
    if (commitment.status === 'completed') return 'completed';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const commitmentDate = new Date(commitment.date);
    commitmentDate.setHours(0, 0, 0, 0);
    const diffTime = commitmentDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue'; // Vencido
    if (diffDays === 0) return 'due-today'; // Hoy
    if (diffDays === 1) return 'due-tomorrow'; // Mañana
    return 'pending'; // Pendiente normal
  };

  // Check if debt has commitments that need attention
  const hasUrgentCommitments = (debt: Debt): { hasUrgent: boolean; count: number; highestPriority: 'overdue' | 'due-today' | 'due-tomorrow' | null } => {
    if (!debt.commitments || debt.commitments.length === 0) {
      return { hasUrgent: false, count: 0, highestPriority: null };
    }

    const urgentStatuses: Array<'overdue' | 'due-today' | 'due-tomorrow'> = ['overdue', 'due-today', 'due-tomorrow'];
    const priorityOrder = { 'overdue': 3, 'due-today': 2, 'due-tomorrow': 1 };
    
    const urgentCommitments = debt.commitments.filter(c => {
      const status = getCommitmentStatus(c);
      return urgentStatuses.includes(status as any);
    });

    if (urgentCommitments.length === 0) {
      return { hasUrgent: false, count: 0, highestPriority: null };
    }

    const highestPriority = urgentCommitments.reduce((highest, c) => {
      const status = getCommitmentStatus(c);
      const currentPriority = priorityOrder[status as keyof typeof priorityOrder] || 0;
      const highestPriorityValue = priorityOrder[highest as keyof typeof priorityOrder] || 0;
      return currentPriority > highestPriorityValue ? status : highest;
    }, urgentCommitments[0] ? getCommitmentStatus(urgentCommitments[0]) : null) as 'overdue' | 'due-today' | 'due-tomorrow' | null;

    return {
      hasUrgent: true,
      count: urgentCommitments.length,
      highestPriority,
    };
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatCurrency = (amount: number, currency: string) => {
    // Map currency codes to Intl.NumberFormat compatible codes
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
      // Fallback for currencies that might not be supported
      return `${currencyCode} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const localCurrency = storage.getLocalCurrency();
    
    const totals = debts.reduce((acc, debt) => {
      acc.totalLocal += debt.totalLocal || 0;
      acc.totalDollars += debt.totalDollars || 0;
      acc.monthlyLocal += debt.localFee || 0;
      acc.monthlyDollars += debt.dollarFee || 0;
      acc.toUpdate += debt.feeToUpdate || 0;
      acc.toUpdateDollars += debt.feeToUpdateDollars || 0;
      
      return acc;
    }, {
      totalLocal: 0,
      totalDollars: 0,
      monthlyLocal: 0,
      monthlyDollars: 0,
      toUpdate: 0,
      toUpdateDollars: 0,
    });

    return {
      ...totals,
      mostCommonCurrency: localCurrency,
    };
  };

  const totals = calculateTotals();

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
            <h1>{t('dashboard.title')}</h1>
          </div>
          <div className="header-actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-profile"
              onClick={() => navigate('/profile')}
            >
              <Icon component={FaUser} />
            </motion.button>
          </div>
        </div>
      </motion.header>

      <div className="dashboard-content">
        {debts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="dashboard-summary"
          >
            <div className="summary-card">
              <div className="summary-section">
                <div className="summary-card-header">
                  <Icon component={FaChartLine} className="summary-icon" />
                  <span className="summary-label">{t('dashboard.totalDebt')}</span>
                </div>
                <div className="summary-values">
                  <div className="summary-value">
                    <span className="summary-currency">{totals.mostCommonCurrency}</span>
                    <span className="summary-amount">{formatCurrency(totals.totalLocal, totals.mostCommonCurrency)}</span>
                  </div>
                  <div className="summary-value">
                    <span className="summary-currency">USD</span>
                    <span className="summary-amount">{formatCurrency(totals.totalDollars, 'USD')}</span>
                  </div>
                </div>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-section">
                <div className="summary-card-header">
                  <Icon component={FaMoneyBill} className="summary-icon" />
                  <span className="summary-label">{t('dashboard.monthlyPayment')}</span>
                </div>
                <div className="summary-values">
                  <div className="summary-value">
                    <span className="summary-currency">{totals.mostCommonCurrency}</span>
                    <span className="summary-amount">{formatCurrency(totals.monthlyLocal, totals.mostCommonCurrency)}</span>
                  </div>
                  <div className="summary-value">
                    <span className="summary-currency">USD</span>
                    <span className="summary-amount">{formatCurrency(totals.monthlyDollars, 'USD')}</span>
                  </div>
                </div>
              </div>

              <div className="summary-divider"></div>

              <div className="summary-section">
                <div className="summary-card-header">
                  <Icon component={FaDollarSign} className="summary-icon" />
                  <span className="summary-label">{t('dashboard.toUpdate')}</span>
                </div>
                <div className="summary-values">
                  {totals.toUpdate > 0 && (
                    <div className="summary-value">
                      <span className="summary-currency">{totals.mostCommonCurrency}</span>
                      <span className="summary-amount">{formatCurrency(totals.toUpdate, totals.mostCommonCurrency)}</span>
                    </div>
                  )}
                  {totals.toUpdateDollars > 0 && (
                    <div className="summary-value">
                      <span className="summary-currency">USD</span>
                      <span className="summary-amount">{formatCurrency(totals.toUpdateDollars, 'USD')}</span>
                    </div>
                  )}
                  {totals.toUpdate === 0 && totals.toUpdateDollars === 0 && (
                    <div className="summary-value-main">
                      <span className="summary-amount-large">{t('dashboard.allUpToDate')}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

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
              <p>{t('dashboard.noDebts')}</p>
              <p className="empty-subtitle">{t('dashboard.noDebtsSubtitle')}</p>
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
                    onClick={() => toggleExpand(debt.id)}
                  >
                    <div className="debt-header">
                      <div className="debt-header-main">
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
                            <h3 onClick={(e) => {
                              e.stopPropagation();
                              startEditing(debt.id, 'name', debt.name, e);
                            }} className="editable-field debt-name">
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
                            <p className="debt-bank editable-field" onClick={(e) => {
                              e.stopPropagation();
                              startEditing(debt.id, 'bankName', debt.bankName, e);
                            }}>
                              <Icon component={FaLandmark} className="debt-info-icon" />
                              {debt.bankName}
                            </p>
                          )}
                          <p className="debt-type">
                            <Icon component={debt.type === 'prestamo' ? FaMoneyBillWave : FaCreditCard} className="debt-info-icon" />
                            {debt.type === 'prestamo' ? t('addDebt.loan') : t('addDebt.creditCard')}
                          </p>
                        </div>
                      </div>
                      <div className="debt-header-actions" onClick={(e) => e.stopPropagation()}>
                        <div className="debt-summary">
                          <div className="debt-status">
                            {debt.inOrder ? (
                              <span className="status-badge in-order">
                                <Icon component={FaCheck} size={12} /> {t('dashboard.inOrder')}
                              </span>
                            ) : (
                              <span className="status-badge not-in-order">
                                <Icon component={FaTimes} size={12} /> {t('dashboard.notInOrder')}
                              </span>
                            )}
                          </div>
                          {(() => {
                            const urgent = hasUrgentCommitments(debt);
                            if (urgent.hasUrgent) {
                              const alertConfig = {
                                'overdue': { color: 'var(--error)', bg: 'var(--error-light)', label: t('dashboard.overdue'), icon: FaExclamationTriangle },
                                'due-today': { color: 'var(--error)', bg: 'var(--error-light)', label: t('dashboard.dueToday'), icon: FaExclamationTriangle },
                                'due-tomorrow': { color: 'var(--warning)', bg: 'var(--warning-overlay)', label: t('dashboard.dueTomorrow'), icon: FaExclamationTriangle },
                              };
                              const config = urgent.highestPriority ? alertConfig[urgent.highestPriority] : alertConfig['due-tomorrow'];
                              return (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="commitment-alert-badge"
                                  style={{ 
                                    background: config.bg,
                                    borderColor: config.color,
                                    color: config.color,
                                  }}
                                  title={t('dashboard.commitmentsNeedAttention', { count: urgent.count })}
                                >
                                  <Icon component={config.icon} size={12} />
                                  <span>{urgent.count}</span>
                                </motion.div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div className="debt-actions">
                          {debt.hasCallTask && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="call-task-icon"
                              title={t('debt.callTask')}
                            >
                              <Icon component={FaPhone} />
                            </motion.div>
                          )}
                          {debt.callCompleted && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="call-completed-icon"
                              title={t('debt.callCompleted')}
                            >
                              <Icon component={FaCheck} />
                            </motion.div>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="btn-delete"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(debt.id);
                            }}
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
                                <span className="payment-label">{t('dashboard.monthly')} ({storage.getLocalCurrency()})</span>
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
                                  <span className="payment-value editable-field" onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(debt.id, 'localFee', debt.localFee, e);
                                  }}>
                                    {formatCurrency(debt.localFee, storage.getLocalCurrency())}
                                  </span>
                                )}
                              </div>
                              <div className="payment-item">
                                <span className="payment-label">{t('dashboard.monthly')} (USD)</span>
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
                                  <span className="payment-value editable-field" onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(debt.id, 'dollarFee', debt.dollarFee, e);
                                  }}>
                                    {formatCurrency(debt.dollarFee, 'USD')}
                                  </span>
                                )}
                              </div>
                              <div className="payment-item total-debt">
                                <span className="payment-label">{t('dashboard.total')} ({storage.getLocalCurrency()})</span>
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
                                  <span className="payment-value editable-field" onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(debt.id, 'totalLocal', debt.totalLocal, e);
                                  }}>
                                    {formatCurrency(debt.totalLocal, storage.getLocalCurrency())}
                                  </span>
                                )}
                              </div>
                              <div className="payment-item total-debt">
                                <span className="payment-label">{t('dashboard.total')} (USD)</span>
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
                                  <span className="payment-value editable-field" onClick={(e) => {
                                    e.stopPropagation();
                                    startEditing(debt.id, 'totalDollars', debt.totalDollars, e);
                                  }}>
                                    {formatCurrency(debt.totalDollars, 'USD')}
                                  </span>
                                )}
                              </div>
                              {(debt.feeToUpdate > 0 || debt.feeToUpdateDollars > 0) && (
                                <>
                                  {debt.feeToUpdate > 0 && (
                                    <div className="payment-item update-amount">
                                      <span className="payment-label">{t('dashboard.toUpdate')} ({storage.getLocalCurrency()})</span>
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
                                        <span className="payment-value editable-field" onClick={(e) => {
                                          e.stopPropagation();
                                          startEditing(debt.id, 'feeToUpdate', debt.feeToUpdate, e);
                                        }}>
                                          {formatCurrency(debt.feeToUpdate, storage.getLocalCurrency())}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {debt.feeToUpdateDollars > 0 && (
                                    <div className="payment-item update-amount">
                                      <span className="payment-label">{t('dashboard.toUpdate')} (USD)</span>
                                      {editingField?.debtId === debt.id && editingField?.field === 'feeToUpdateDollars' ? (
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editValue}
                                          onChange={(e) => setEditValue(e.target.value)}
                                          onBlur={() => saveEdit(debt.id, 'feeToUpdateDollars')}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') saveEdit(debt.id, 'feeToUpdateDollars');
                                            if (e.key === 'Escape') cancelEdit();
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          className="inline-edit-input"
                                          autoFocus
                                        />
                                      ) : (
                                        <span className="payment-value editable-field" onClick={(e) => {
                                          e.stopPropagation();
                                          startEditing(debt.id, 'feeToUpdateDollars', debt.feeToUpdateDollars || 0, e);
                                        }}>
                                          {formatCurrency(debt.feeToUpdateDollars || 0, 'USD')}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                              {(debt.feeToUpdate === 0 && debt.feeToUpdateDollars === 0) && (
                                <div className="payment-item update-amount" style={{ background: 'var(--overlay)', border: '1px solid var(--primary-bright)' }}>
                                  <span className="payment-label">{t('dashboard.toUpdate')}</span>
                                  <span className="payment-value" style={{ color: 'var(--primary-bright)' }}>
                                    {t('dashboard.allUpToDate')}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Commitments Section */}
                          <div className="debt-commitments">
                            <div className="commitments-header">
                              <div>
                                <h4 className="commitments-title">
                                  <Icon component={FaCalendarAlt} size={16} />
                                  Payment Commitments
                                </h4>
                                {debt.commitments && debt.commitments.length > 0 && (() => {
                                  const completed = debt.commitments.filter(c => c.status === 'completed').length;
                                  const total = debt.commitments.length;
                                  const pending = total - completed;
                                  return (
                                    <div className="commitments-progress">
                                      <span className="progress-text">
                                        {t('dashboard.ofCompleted', { total })}
                                      </span>
                                      <div className="progress-bar-container-small">
                                        <motion.div
                                          className="progress-bar-fill"
                                          initial={{ width: 0 }}
                                          animate={{ width: `${(completed / total) * 100}%` }}
                                          transition={{ duration: 0.5, ease: "easeOut" }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            
                            {debt.commitments && debt.commitments.length > 0 ? (
                              <>
                                {/* Active Commitments */}
                                {debt.commitments.filter(c => c.status !== 'completed').length > 0 && (
                                  <div className="commitments-list">
                                    {debt.commitments
                                      .filter(c => c.status !== 'completed')
                                      .map((commitment) => {
                                  const status = getCommitmentStatus(commitment);
                                  const statusConfig = {
                                    'pending': { 
                                      color: 'var(--text-muted)', 
                                      bg: 'var(--dark-bg)', 
                                      label: t('dashboard.pending'),
                                      pulse: false,
                                    },
                                    'due-tomorrow': { 
                                      color: '#ff9800', 
                                      bg: 'rgba(255, 152, 0, 0.15)', 
                                      label: t('dashboard.dueTomorrow'),
                                      pulse: true,
                                    },
                                    'due-today': { 
                                      color: '#f44336', 
                                      bg: 'rgba(244, 67, 54, 0.15)', 
                                      label: t('dashboard.dueToday'),
                                      pulse: true,
                                    },
                                    'overdue': { 
                                      color: '#d32f2f', 
                                      bg: 'rgba(211, 47, 47, 0.2)', 
                                      label: t('dashboard.overdue'),
                                      pulse: true,
                                    },
                                    'completed': { 
                                      color: 'var(--primary-bright)', 
                                      bg: 'var(--overlay)', 
                                      label: t('common.completed'),
                                      pulse: false,
                                    },
                                  };
                                  const config = statusConfig[status];
                                  
                                  return (
                                    <motion.div
                                      key={commitment.id}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="commitment-item"
                                      style={{ 
                                        borderLeft: `4px solid ${config.color}`,
                                        background: config.bg 
                                      }}
                                    >
                                      <div className="commitment-info">
                                        <div className="commitment-header-row">
                                          <span className="commitment-date">
                                            <Icon component={FaCalendarAlt} size={12} />
                                            {formatDate(commitment.date)}
                                          </span>
                                          <motion.span 
                                            className={`commitment-status-badge ${config.pulse ? 'pulse-badge' : ''}`}
                                            style={{ 
                                              color: config.color,
                                              background: config.bg,
                                              border: `1px solid ${config.color}`,
                                            }}
                                            animate={config.pulse ? {
                                              scale: [1, 1.05, 1],
                                              opacity: [1, 0.9, 1],
                                            } : {}}
                                            transition={config.pulse ? {
                                              duration: 2,
                                              repeat: Infinity,
                                              ease: "easeInOut",
                                            } : {}}
                                          >
                                            {config.pulse && <Icon component={FaExclamationTriangle} size={10} style={{ marginRight: '4px' }} />}
                                            {config.label}
                                          </motion.span>
                                        </div>
                                        <div className="commitment-amounts">
                                          {commitment.amountLocal > 0 && (
                                            <span className="commitment-amount">
                                              {formatCurrency(commitment.amountLocal, storage.getLocalCurrency())}
                                            </span>
                                          )}
                                          {commitment.amountDollars > 0 && (
                                            <span className="commitment-amount">
                                              {formatCurrency(commitment.amountDollars, 'USD')}
                                            </span>
                                          )}
                                        </div>
                                        {commitment.notes && (
                                          <p className="commitment-notes">{commitment.notes}</p>
                                        )}
                                      </div>
                                      <div className="commitment-actions">
                                        {status !== 'completed' && (
                                          <>
                                            <motion.button
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              className="btn-commitment-action"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingCommitment({ debt, commitment });
                                              }}
                                              title={t('commitment.editCommitment')}
                                            >
                                              <Icon component={FaEdit} size={14} />
                                            </motion.button>
                                            <motion.button
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              className="btn-commitment-action"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                const updated = {
                                                  ...debt,
                                                  commitments: debt.commitments?.map(c => 
                                                    c.id === commitment.id 
                                                      ? { ...c, status: 'completed' as const, completedAt: new Date().toISOString() }
                                                      : c
                                                  ),
                                                  updatedAt: new Date().toISOString(),
                                                };
                                                storage.saveDebt(updated);
                                                // Show suggestion to update balances
                                                setUpdatingBalances({ debt: updated, commitment });
                                                loadDebts();
                                              }}
                                              title={t('commitment.markCompleted')}
                                            >
                                              <Icon component={FaCheck} size={14} />
                                            </motion.button>
                                            <motion.button
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              className="btn-commitment-action btn-delete"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(t('commitment.deleteConfirm'))) {
                                                  const updated = {
                                                    ...debt,
                                                    commitments: debt.commitments?.filter(c => c.id !== commitment.id),
                                                    updatedAt: new Date().toISOString(),
                                                  };
                                                  storage.saveDebt(updated);
                                                  loadDebts();
                                                }
                                              }}
                                              title={t('commitment.deleteCommitment')}
                                            >
                                              <Icon component={FaTrash} size={14} />
                                            </motion.button>
                                          </>
                                        )}
                                      </div>
                                    </motion.div>
                                  );
                                })}
                              </div>
                                )}
                                
                                {/* Completed Commitments History */}
                                {debt.commitments.filter(c => c.status === 'completed').length > 0 && (
                                  <div className="commitments-completed-section">
                                    <h5 className="completed-title">{t('dashboard.completedCommitments')}</h5>
                                    <div className="commitments-list">
                                      {debt.commitments
                                        .filter(c => c.status === 'completed')
                                        .sort((a, b) => {
                                          const dateA = a.completedAt || a.date;
                                          const dateB = b.completedAt || b.date;
                                          return new Date(dateB).getTime() - new Date(dateA).getTime();
                                        })
                                        .map((commitment) => {
                                          const status = getCommitmentStatus(commitment);
                                          const config = {
                                            color: 'var(--primary-bright)',
                                            bg: 'var(--overlay)',
                                            label: t('common.completed'),
                                          };
                                          
                                          return (
                                            <motion.div
                                              key={commitment.id}
                                              initial={{ opacity: 0, y: 10 }}
                                              animate={{ opacity: 1, y: 0 }}
                                              className="commitment-item commitment-completed"
                                              style={{ 
                                                borderLeft: `4px solid ${config.color}`,
                                                background: config.bg,
                                                opacity: 0.8,
                                              }}
                                            >
                                              <div className="commitment-info">
                                                <div className="commitment-header-row">
                                                  <span className="commitment-date">
                                                    <Icon component={FaCalendarAlt} size={12} />
                                                    {formatDate(commitment.date)}
                                                  </span>
                                                  <span className="commitment-status-badge" style={{ color: config.color }}>
                                                    {config.label}
                                                  </span>
                                                </div>
                                                <div className="commitment-amounts">
                                                  {commitment.amountLocal > 0 && (
                                                    <span className="commitment-amount">
                                                      {formatCurrency(commitment.amountLocal, storage.getLocalCurrency())}
                                                    </span>
                                                  )}
                                                  {commitment.amountDollars > 0 && (
                                                    <span className="commitment-amount">
                                                      {formatCurrency(commitment.amountDollars, 'USD')}
                                                    </span>
                                                  )}
                                                </div>
                                                {commitment.notes && (
                                                  <p className="commitment-notes">{commitment.notes}</p>
                                                )}
                                                {commitment.completedAt && (
                                                  <p className="commitment-completed-date" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    {t('commitment.completedOn')} {formatDate(commitment.completedAt)}
                                                  </p>
                                                )}
                                              </div>
                                            </motion.div>
                                          );
                                        })}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="commitments-empty">
                                <p>{t('dashboard.noCommitments')}</p>
                              </div>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="btn-add-commitment"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/add-commitment/${debt.id}`);
                              }}
                              style={{ marginTop: '16px', width: '100%' }}
                            >
                              <Icon component={FaPlus} size={12} />
                              {t('dashboard.addCommitment')}
                            </motion.button>
                          </div>

                          {/* Call History Section */}
                          <div className="debt-call-history">
                            <div className="call-history-header">
                              <h4 className="call-history-title">
                                <Icon component={FaPhone} size={16} />
                                {t('dashboard.callHistory')}
                              </h4>
                            </div>
                            
                            {debt.callHistory && debt.callHistory.length > 0 ? (
                              <div className="call-history-list">
                                {debt.callHistory
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) // Most recent first
                                  .map((call) => (
                                    <motion.div
                                      key={call.id}
                                      initial={{ opacity: 0, y: 10 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      className="call-item"
                                    >
                                      <div className="call-date">
                                        <Icon component={FaCalendarAlt} size={12} />
                                        {formatDate(call.date)}
                                      </div>
                                      <div className="call-notes">{call.notes}</div>
                                    </motion.div>
                                  ))}
                              </div>
                            ) : (
                              <div className="call-history-empty">
                                <p>{t('dashboard.noCalls')}</p>
                              </div>
                            )}
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className="btn-add-call"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddingCall(debt);
                              }}
                              style={{ marginTop: '16px', width: '100%' }}
                            >
                              <Icon component={FaPlus} size={12} />
                              {t('dashboard.recordCall')}
                            </motion.button>
                          </div>

                          {debt.currentPlan && (
                            <div className="debt-plan">
                              <span className="plan-label">{t('dashboard.plan')}:</span>
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
                                <span className="plan-value editable-field" onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(debt.id, 'currentPlan', debt.currentPlan, e);
                                }}>
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
                                placeholder={t('editDebt.phoneOptional')}
                              />
                            ) : (
                              debt.bankPhone ? (
                                <a href={`tel:${debt.bankPhone}`} className="phone-link editable-field" onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(debt.id, 'bankPhone', debt.bankPhone || '', e);
                                }}>
                                  {debt.bankPhone}
                                </a>
                              ) : (
                                <span className="phone-link editable-field" onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(debt.id, 'bankPhone', '', e);
                                }} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  {t('dashboard.addPhone')}
                                </span>
                              )
                            )}
                          </div>

                          <div className="debt-task">
                            <label className="task-checkbox" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={debt.hasCallTask}
                                onChange={() => handleToggleCallTask(debt)}
                              />
                              <span>{t('dashboard.callBank')}</span>
                            </label>
                            {debt.hasCallTask && (
                              <label className="task-checkbox" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={debt.callCompleted}
                                  onChange={() => handleToggleCallCompleted(debt)}
                                />
                                <span className={debt.callCompleted ? 'completed' : ''}>{t('common.completed')}</span>
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className="fab-add-debt"
        onClick={() => navigate('/add-debt')}
      >
        <Icon component={FaPlus} />
      </motion.button>

      {editingCommitment && (
        <EditCommitmentModal
          commitment={editingCommitment.commitment}
          debt={editingCommitment.debt}
          isOpen={true}
          onClose={() => setEditingCommitment(null)}
          onSave={() => {
            loadDebts();
            setEditingCommitment(null);
          }}
        />
      )}

      {addingCall && (
        <AddCallModal
          debt={addingCall}
          isOpen={true}
          onClose={() => setAddingCall(null)}
          onSave={() => {
            loadDebts();
            setAddingCall(null);
          }}
        />
      )}

      {updatingBalances && (
        <UpdateBalancesModal
          debt={updatingBalances.debt}
          commitment={updatingBalances.commitment}
          isOpen={true}
          onClose={() => setUpdatingBalances(null)}
          onSave={() => {
            loadDebts();
            setUpdatingBalances(null);
          }}
        />
      )}
    </motion.div>
  );
};

export default Dashboard;
