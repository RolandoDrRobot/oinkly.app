import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { 
  FaPlus, 
  FaEdit, 
  FaTrash, 
  FaPhone, 
  FaCheck, 
  FaTimes, 
  FaFileInvoiceDollar, 
  FaLandmark, 
  FaCreditCard, 
  FaMoneyBillWave, 
  FaUser, 
  FaChartLine, 
  FaMoneyBill, 
  FaCalendarAlt, 
  FaExclamationTriangle, 
  FaStar,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
// import { useAuth } from '../context/AuthContext'; // Reserved for future use
import { Debt, PaymentCommitment } from '../types';
import { storage } from '../utils/storage';
import { notify } from '../utils/notifications';
import SortableDebtCard from '../components/SortableDebtCard';
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
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    const saved = localStorage.getItem('hideAmounts');
    return saved === 'true';
  });
  // const { user, logout } = useAuth(); // Reserved for future use
  const navigate = useNavigate();

  useEffect(() => {
    loadDebts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate inOrder based on payment commitments
  // Returns true if no pending/overdue commitments (shows "No compromisos")
  // Returns false if there are pending/overdue commitments (shows "Compromiso pendiente")
  const calculateInOrder = (debt: Debt): boolean => {
    if (!debt.commitments || debt.commitments.length === 0) {
      // No commitments means "No compromisos"
      return true;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if there are any pending or overdue commitments
    const hasPendingOrOverdue = debt.commitments.some(commitment => {
      if (commitment.status === 'completed') {
        return false; // Completed commitments don't affect status
      }

      const commitmentDate = new Date(commitment.date);
      commitmentDate.setHours(0, 0, 0, 0);
      const diffTime = commitmentDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // If commitment is overdue (past due) or pending (not completed), shows "Compromiso pendiente"
      return diffDays < 0 || commitment.status === 'pending';
    });

    // Returns true if no pending/overdue (shows "No compromisos"), false otherwise (shows "Compromiso pendiente")
    return !hasPendingOrOverdue;
  };

  const loadDebts = () => {
    const allDebts = storage.getDebts();
    // Ensure commitments and callHistory arrays exist, and calculate inOrder
    const updatedDebts = allDebts.map(debt => {
      // Ensure commitments and callHistory arrays exist
      if (!debt.commitments) debt.commitments = [];
      if (!debt.callHistory) debt.callHistory = [];
      
      // Calculate inOrder based on commitments
      const calculatedInOrder = calculateInOrder(debt);
      
      // Update debt if inOrder changed
      if (debt.inOrder !== calculatedInOrder) {
        const updated = {
          ...debt,
          inOrder: calculatedInOrder,
          updatedAt: new Date().toISOString(),
        };
        storage.saveDebt(updated);
        return updated;
      }
      
      return debt;
    });
    
    // Load saved order or use current order
    const savedOrder = storage.getDebtsOrder();
    let orderedDebts: Debt[];
    
    if (savedOrder && savedOrder.length === updatedDebts.length) {
      // Use saved order
      const debtMap = new Map(updatedDebts.map(debt => [debt.id, debt]));
      orderedDebts = savedOrder
        .map(id => debtMap.get(id))
        .filter((debt): debt is Debt => debt !== undefined);
      
      // Add any new debts that aren't in the saved order
      const existingIds = new Set(savedOrder);
      const newDebts = updatedDebts.filter(debt => !existingIds.has(debt.id));
      orderedDebts = [...orderedDebts, ...newDebts];
    } else {
      // No saved order, use current order
      orderedDebts = updatedDebts;
      // Save current order
      storage.setDebtsOrder(orderedDebts.map(d => d.id));
    }
    
    setDebts(orderedDebts);
  };

  const handleDelete = (id: string) => {
    navigate(`/delete-debt/${id}`);
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setDebts((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save new order
        storage.setDebtsOrder(newOrder.map(d => d.id));
        
        return newOrder;
      });
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
    const numericFields = ['localFee', 'dollarFee', 'totalLocal', 'totalDollars'];
    if (numericFields.includes(field)) {
      newValue = parseFloat(editValue) || 0;
    }

    const oldValue = debt[field as keyof Debt] as number;
    const updated = {
      ...debt,
      [field]: newValue,
      updatedAt: new Date().toISOString(),
    };
    
    // inOrder is now calculated based on commitments only, not feeToUpdate
    
    storage.saveDebt(updated);
    
    // Notify if overview-affecting fields changed (these affect totals automatically)
    if (numericFields.includes(field) && oldValue !== newValue) {
      notify.overviewUpdated();
    }
    
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
    if (hideAmounts) {
      // Return asterisks to hide the amount
      const length = Math.max(8, amount.toString().length);
      return '*'.repeat(length);
    }
    
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

  const toggleHideAmounts = () => {
    const newValue = !hideAmounts;
    setHideAmounts(newValue);
    localStorage.setItem('hideAmounts', String(newValue));
  };

  // Calculate totals
  const calculateTotals = () => {
    const localCurrency = storage.getLocalCurrency();
    
    const totals = debts.reduce((acc, debt) => {
      acc.totalLocal += debt.totalLocal || 0;
      acc.totalDollars += debt.totalDollars || 0;
      acc.monthlyLocal += debt.localFee || 0;
      acc.monthlyDollars += debt.dollarFee || 0;
      
      return acc;
    }, {
      totalLocal: 0,
      totalDollars: 0,
      monthlyLocal: 0,
      monthlyDollars: 0,
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
          <div className="header-title-wrapper">
            <img 
              src={`${process.env.PUBLIC_URL}/logo.png`} 
              alt="Oinkly Logo" 
              className="header-logo"
            />
            <h1>{t('dashboard.title')}</h1>
          </div>
          <div className="header-actions">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-profile"
              onClick={toggleHideAmounts}
              title={hideAmounts ? t('dashboard.showAmounts') : t('dashboard.hideAmounts')}
            >
              <Icon component={hideAmounts ? FaEyeSlash : FaEye} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-profile"
              onClick={() => navigate('/about')}
              title={t('about.title')}
            >
              <Icon component={FaStar} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-profile"
              onClick={() => navigate('/profile')}
              title={t('profile.title')}
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={debts.map(d => d.id)}
                strategy={verticalListSortingStrategy}
              >
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
                      <SortableDebtCard key={debt.id} debt={debt} index={index}>
                        {({ dragAttributes, dragListeners, isDragging }) => (
                          <div
                            className="debt-card"
                            onClick={() => {
                              if (!isExpanded) {
                                toggleExpand(debt.id);
                              }
                            }}
                          >
                            <div className="debt-header">
                              <div className="debt-header-actions-top">
                                {isExpanded && (
                                  <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="btn-close-debt"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleExpand(debt.id);
                                    }}
                                    title={t('common.close')}
                                  >
                                    <Icon component={FaTimes} size={16} />
                                  </motion.button>
                                )}
                                <div
                                  {...dragAttributes}
                                  {...dragListeners}
                                  className="drag-handle"
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    cursor: isDragging ? 'grabbing' : 'grab',
                                    touchAction: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '6px',
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--bg-tertiary)',
                                    opacity: 0.7,
                                    transition: 'all 0.2s',
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.opacity = '1';
                                    e.currentTarget.style.background = 'var(--overlay)';
                                    e.currentTarget.style.borderColor = 'var(--accent-color)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.opacity = '0.7';
                                    e.currentTarget.style.background = 'var(--bg-tertiary)';
                                    e.currentTarget.style.borderColor = 'var(--bg-tertiary)';
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-secondary)' }}>
                                    <circle cx="3" cy="3" r="1.5" />
                                    <circle cx="8" cy="3" r="1.5" />
                                    <circle cx="13" cy="3" r="1.5" />
                                    <circle cx="3" cy="8" r="1.5" />
                                    <circle cx="8" cy="8" r="1.5" />
                                    <circle cx="13" cy="8" r="1.5" />
                                    <circle cx="3" cy="13" r="1.5" />
                                    <circle cx="8" cy="13" r="1.5" />
                                    <circle cx="13" cy="13" r="1.5" />
                                  </svg>
                                </div>
                              </div>
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
                          <div className="debt-bank-type-row">
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
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`call-task-icon ${!debt.hasCallTask ? 'inactive' : ''}`}
                            title={t('debt.callTask')}
                          >
                            <Icon component={FaPhone} />
                          </motion.div>
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={`call-completed-icon ${!debt.callCompleted ? 'inactive' : ''}`}
                            title={t('debt.callCompleted')}
                          >
                            <Icon component={FaCheck} />
                          </motion.div>
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
                                            {commitment.status !== 'completed' && (
                                              <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="btn-commitment-action"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(`/edit-commitment/${debt.id}/${commitment.id}`);
                                                }}
                                                title={t('commitment.editCommitment')}
                                              >
                                                <Icon component={FaEdit} size={14} />
                                              </motion.button>
                                            )}
                                            <motion.button
                                              whileHover={{ scale: 1.1 }}
                                              whileTap={{ scale: 0.9 }}
                                              className="btn-commitment-action"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/complete-commitment/${debt.id}/${commitment.id}`);
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
                                                navigate(`/delete-commitment/${debt.id}/${commitment.id}`);
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
                                navigate(`/add-call/${debt.id}`);
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

                          <div className="payment-item">
                            <span className="payment-label">
                              <Icon component={FaPhone} size={14} style={{ marginRight: '6px' }} />
                              {t('addDebt.bankPhone')}
                            </span>
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
                                <span 
                                  className="payment-value editable-field" 
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    startEditing(debt.id, 'bankPhone', debt.bankPhone || '', e);
                                  }}
                                  style={{ cursor: 'pointer' }}
                                  title={t('dashboard.addPhone')}
                                >
                                  {debt.bankPhone}
                                </span>
                              ) : (
                                <span className="payment-value editable-field" onClick={(e) => {
                                  e.stopPropagation();
                                  startEditing(debt.id, 'bankPhone', '', e);
                                }} style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                  {t('dashboard.addPhone')}
                                </span>
                              )
                            )}
                          </div>

                          <div className="debt-task">
                            <motion.button
                              className={`task-button ${debt.hasCallTask ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCallTask(debt);
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Icon component={FaPhone} size={16} />
                              <span>{t('dashboard.callBank')}</span>
                            </motion.button>
                            <motion.button
                              className={`task-button ${debt.callCompleted ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleCallCompleted(debt);
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Icon component={FaCheck} size={16} />
                              <span>{t('common.debtReviewed')}</span>
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                          </div>
                        )}
                      </SortableDebtCard>
                    );
                  })}
                </motion.div>
              </SortableContext>
            </DndContext>
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

    </motion.div>
  );
};

export default Dashboard;
