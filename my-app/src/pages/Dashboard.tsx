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
  FaTrash, 
  FaCheck, 
  FaTimes, 
  FaFileInvoiceDollar, 
  FaCreditCard, 
  FaMoneyBillWave, 
  FaUser, 
  FaChartLine, 
  FaMoneyBill, 
  FaCalendarAlt, 
  FaEye,
  FaEyeSlash,
  FaHome,
  FaCar,
  FaPiggyBank,
  FaBriefcase,
  FaBuilding,
  FaSearch,
  FaDollarSign,
  FaWallet,
  FaTag,
  FaBolt
} from 'react-icons/fa';
// import { useAuth } from '../context/AuthContext'; // Reserved for future use
import { Debt, FixedExpense, Asset, Income } from '../types';
import { storage } from '../utils/storage';
import SortableDebtCard from '../components/SortableDebtCard';
import SortableItemCard from '../components/SortableItemCard';
import './Dashboard.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

type ActiveTab = 'debt' | 'fixedExpenses' | 'assets' | 'incomes';

const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('debt');
  const [expandedDebts, setExpandedDebts] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ debtId: string; field: string } | null>(null);
  const [editingFixedExpense, setEditingFixedExpense] = useState<{ expenseId: string; field: string } | null>(null);
  const [editingAsset, setEditingAsset] = useState<{ assetId: string; field: string } | null>(null);
  const [editingIncome, setEditingIncome] = useState<{ incomeId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    const saved = localStorage.getItem('hideAmounts');
    return saved === 'true';
  });
  const [isOverallSummaryExpanded, setIsOverallSummaryExpanded] = useState(false);
  const [savingsLocal, setSavingsLocal] = useState<number>(() => {
    const raw = localStorage.getItem('cashflow_savings_local');
    return raw ? parseFloat(raw) : 0;
  });
  const [savingsUSD, setSavingsUSD] = useState<number>(() => {
    const raw = localStorage.getItem('cashflow_savings_usd');
    return raw ? parseFloat(raw) : 0;
  });
  const [editingSavings, setEditingSavings] = useState<'local' | 'usd' | null>(null);
  const [savingsInput, setSavingsInput] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number>(() => {
    const raw = localStorage.getItem('cashflow_exchange_rate');
    return raw ? parseFloat(raw) : 500;
  });
  const [editingRate, setEditingRate] = useState(false);
  const [rateInput, setRateInput] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadDebts();
    loadFixedExpenses();
    loadAssets();
    loadIncomes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const loadFixedExpenses = () => {
    const allExpenses = storage.getFixedExpenses();
    const savedOrder = storage.getFixedExpensesOrder();
    let orderedExpenses: FixedExpense[];
    
    if (savedOrder && savedOrder.length === allExpenses.length) {
      const expenseMap = new Map(allExpenses.map(expense => [expense.id, expense]));
      orderedExpenses = savedOrder
        .map(id => expenseMap.get(id))
        .filter((expense): expense is FixedExpense => expense !== undefined);
      
      const existingIds = new Set(savedOrder);
      const newExpenses = allExpenses.filter(expense => !existingIds.has(expense.id));
      orderedExpenses = [...orderedExpenses, ...newExpenses];
    } else {
      orderedExpenses = allExpenses;
      storage.setFixedExpensesOrder(orderedExpenses.map(e => e.id));
    }
    
    setFixedExpenses(orderedExpenses);
  };

  const loadAssets = () => {
    const allAssets = storage.getAssets();
    const savedOrder = storage.getAssetsOrder();
    let orderedAssets: Asset[];
    
    if (savedOrder && savedOrder.length === allAssets.length) {
      const assetMap = new Map(allAssets.map(asset => [asset.id, asset]));
      orderedAssets = savedOrder
        .map(id => assetMap.get(id))
        .filter((asset): asset is Asset => asset !== undefined);
      
      const existingIds = new Set(savedOrder);
      const newAssets = allAssets.filter(asset => !existingIds.has(asset.id));
      orderedAssets = [...orderedAssets, ...newAssets];
    } else {
      orderedAssets = allAssets;
      storage.setAssetsOrder(orderedAssets.map(a => a.id));
    }
    
    setAssets(orderedAssets);
  };

  const loadIncomes = () => {
    const allIncomes = storage.getIncomes();
    const savedOrder = storage.getIncomesOrder();
    let orderedIncomes: Income[];
    
    if (savedOrder && savedOrder.length === allIncomes.length) {
      const incomeMap = new Map(allIncomes.map(income => [income.id, income]));
      orderedIncomes = savedOrder
        .map(id => incomeMap.get(id))
        .filter((income): income is Income => income !== undefined);
      
      const existingIds = new Set(savedOrder);
      const newIncomes = allIncomes.filter(income => !existingIds.has(income.id));
      orderedIncomes = [...orderedIncomes, ...newIncomes];
    } else {
      orderedIncomes = allIncomes;
      storage.setIncomesOrder(orderedIncomes.map(i => i.id));
    }
    
    setIncomes(orderedIncomes);
  };

  // Icono de rayo para todos los gastos fijos
  const fixedExpenseIcon = FaBolt;

  const getAssetIcon = (type: Asset['type']) => {
    switch (type) {
      case 'property': return FaHome;
      case 'vehicle': return FaCar;
      case 'investment': return FaChartLine;
      case 'savings': return FaPiggyBank;
      default: return FaWallet;
    }
  };

  const getIncomeIcon = (type: Income['type']) => {
    switch (type) {
      case 'salary': return FaBriefcase;
      case 'freelance': return FaUser;
      case 'investment': return FaChartLine;
      case 'rental': return FaBuilding;
      default: return FaDollarSign;
    }
  };

  const loadDebts = () => {
    const allDebts = storage.getDebts();
    const updatedDebts = allDebts.map(debt => {
      // Migrate: if total is 0 but no closedAt, set closedAt so it sorts as closed
      const isPaidOff = (debt.totalLocal || 0) === 0 && (debt.totalDollars || 0) === 0;
      if (isPaidOff && !debt.closedAt) {
        const updated = {
          ...debt,
          closedAt: debt.updatedAt || debt.createdAt,
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

    // Active debts first, then closed (preserve relative order within each group)
    orderedDebts = [...orderedDebts].sort((a, b) => {
      const aClosed = !!a.closedAt;
      const bClosed = !!b.closedAt;
      if (aClosed !== bClosed) return aClosed ? 1 : -1;
      return 0;
    });


    setDebts(orderedDebts);
  };

  const handleDelete = (id: string) => {
    navigate(`/delete-debt/${id}`);
  };

  /** Current month YYYY-MM */
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

  const handleFixedExpensesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFixedExpenses((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        storage.setFixedExpensesOrder(newOrder.map(e => e.id));
        
        return newOrder;
      });
    }
  };

  const handleAssetsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setAssets((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        storage.setAssetsOrder(newOrder.map(a => a.id));
        
        return newOrder;
      });
    }
  };

  const handleIncomesDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setIncomes((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        storage.setIncomesOrder(newOrder.map(i => i.id));
        
        return newOrder;
      });
    }
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
    
    // Define numeric fields at the top level
    const numericFields = ['localFee', 'dollarFee', 'totalLocal', 'totalDollars', 'interestRate', 'paymentDay', 'cutDay'];
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
    }
    
    loadDebts();
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditingFixedExpense(null);
    setEditingAsset(null);
    setEditingIncome(null);
    setEditValue('');
  };

  // Fixed Expense editing functions
  const startEditingFixedExpense = (expenseId: string, field: string, currentValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFixedExpense({ expenseId, field });
    setEditValue(currentValue.toString());
  };

  const saveFixedExpenseEdit = (expenseId: string, field: string) => {
    const expense = fixedExpenses.find(e => e.id === expenseId);
    if (!expense) return;

    let newValue: string | number = editValue;
    
    const numericFields = ['amountLocal', 'amountDollars', 'paymentDay'];
    if (numericFields.includes(field)) {
      newValue = parseFloat(editValue) || 0;
    }

    const updated = {
      ...expense,
      [field]: newValue,
      updatedAt: new Date().toISOString(),
    };
    
    storage.updateFixedExpense(updated);
    loadFixedExpenses();
    setEditingFixedExpense(null);
    setEditValue('');
  };

  // Asset editing functions
  const startEditingAsset = (assetId: string, field: string, currentValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAsset({ assetId, field });
    setEditValue(currentValue.toString());
  };

  const saveAssetEdit = (assetId: string, field: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    let newValue: string | number = editValue;
    
    const numericFields = ['valueLocal', 'valueDollars'];
    if (numericFields.includes(field)) {
      newValue = parseFloat(editValue) || 0;
    }

    const updated = {
      ...asset,
      [field]: newValue,
      updatedAt: new Date().toISOString(),
    };
    
    storage.updateAsset(updated);
    loadAssets();
    setEditingAsset(null);
    setEditValue('');
  };

  // Income editing functions
  const startEditingIncome = (incomeId: string, field: string, currentValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingIncome({ incomeId, field });
    setEditValue(currentValue.toString());
  };

  const saveIncomeEdit = (incomeId: string, field: string) => {
    const income = incomes.find(i => i.id === incomeId);
    if (!income) return;

    let newValue: string | number = editValue;
    
    const numericFields = ['amountLocal', 'amountDollars', 'paymentDay'];
    if (numericFields.includes(field)) {
      newValue = parseFloat(editValue) || 0;
    }

    const updated = {
      ...income,
      [field]: newValue,
      updatedAt: new Date().toISOString(),
    };
    
    storage.updateIncome(updated);
    loadIncomes();
    setEditingIncome(null);
    setEditValue('');
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

  // Calculate overall totals (all sections combined)
  const calculateOverallTotals = () => {
    const localCurrency = storage.getLocalCurrency();
    const fixedExpensesTotals = calculateFixedExpensesTotals();
    const assetsTotals = calculateAssetsTotals();
    const incomesTotals = calculateIncomesTotals();
    
    return {
      debts: {
        totalLocal: totals.totalLocal,
        totalDollars: totals.totalDollars,
        monthlyLocal: totals.monthlyLocal,
        monthlyDollars: totals.monthlyDollars,
      },
      fixedExpenses: {
        totalLocal: fixedExpensesTotals.totalLocal,
        totalDollars: fixedExpensesTotals.totalDollars,
      },
      assets: {
        totalLocal: assetsTotals.totalLocal,
        totalDollars: assetsTotals.totalDollars,
      },
      incomes: {
        totalLocal: incomesTotals.totalLocal,
        totalDollars: incomesTotals.totalDollars,
      },
      netWorth: {
        totalLocal: assetsTotals.totalLocal - totals.totalLocal,
        totalDollars: assetsTotals.totalDollars - totals.totalDollars,
      },
      mostCommonCurrency: localCurrency,
    };
  };

  // Calculate totals for each section
  const calculateFixedExpensesTotals = () => {
    const localCurrency = storage.getLocalCurrency();
    const totals = fixedExpenses.reduce((acc, expense) => {
      acc.totalLocal += expense.amountLocal || 0;
      acc.totalDollars += expense.amountDollars || 0;
      return acc;
    }, {
      totalLocal: 0,
      totalDollars: 0,
    });
    return {
      ...totals,
      mostCommonCurrency: localCurrency,
    };
  };

  const calculateAssetsTotals = () => {
    const localCurrency = storage.getLocalCurrency();
    const totals = assets.reduce((acc, asset) => {
      acc.totalLocal += asset.valueLocal || 0;
      acc.totalDollars += asset.valueDollars || 0;
      return acc;
    }, {
      totalLocal: 0,
      totalDollars: 0,
    });
    return {
      ...totals,
      mostCommonCurrency: localCurrency,
    };
  };

  const calculateIncomesTotals = () => {
    const localCurrency = storage.getLocalCurrency();
    const totals = incomes.reduce((acc, income) => {
      acc.totalLocal += income.amountLocal || 0;
      acc.totalDollars += income.amountDollars || 0;
      return acc;
    }, {
      totalLocal: 0,
      totalDollars: 0,
    });
    return {
      ...totals,
      mostCommonCurrency: localCurrency,
    };
  };

  const calculateCashflow = () => {
    const localCurrency = storage.getLocalCurrency();
    const rate = exchangeRate || 1;

    const toUSD = (local: number) => local / rate;

    const activeIncomeUSD = incomes.reduce((acc, i) => acc + (i.amountDollars || 0) + toUSD(i.amountLocal || 0), 0);
    const passiveIncomeUSD = assets.reduce((acc, a) => acc + (a.monthlyIncomeUSD || 0) + toUSD(a.monthlyIncomeLocal || 0), 0);
    const incomeUSD = activeIncomeUSD + passiveIncomeUSD;
    const fixedExpensesUSD = fixedExpenses.reduce((acc, e) => acc + (e.amountDollars || 0) + toUSD(e.amountLocal || 0), 0);
    const debtPaymentsUSD = debts.reduce((acc, d) => acc + (d.dollarFee || 0) + toUSD(d.localFee || 0), 0);
    const totalExpensesUSD = fixedExpensesUSD + debtPaymentsUSD;
    const cashflowUSD = incomeUSD - totalExpensesUSD;

    return { activeIncomeUSD, passiveIncomeUSD, incomeUSD, fixedExpensesUSD, debtPaymentsUSD, totalExpensesUSD, cashflowUSD, currency: localCurrency };
  };

  // Render functions for each screen

  const renderDebtsScreen = () => {
    return (
      <div className="screen-container">
        {debts.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3 }}
            className="empty-state"
          >
            <div className="empty-state-image-wrapper">
              <motion.img
                src="/shopping.png"
                alt={t('dashboard.emptyStateAlt')}
                className="empty-state-image"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {t('dashboard.noDebts')}
            </motion.p>
          </motion.div>
        ) : (
          <>
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
                      <Icon component={FaFileInvoiceDollar} className="summary-icon" />
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
                                    <p className="debt-type">
                                      <Icon component={debt.type === 'prestamo' ? FaMoneyBillWave : FaCreditCard} className="debt-info-icon" />
                                      {debt.type === 'prestamo' ? t('addDebt.loan') : t('addDebt.creditCard')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="debt-header-actions debt-header-actions-corner" onClick={(e) => e.stopPropagation()}>
                                <div className="debt-summary">
                                  <div className="debt-status">
                                    {debt.closedAt ? (
                                      <span className="debt-completed-badge debt-closed-badge">
                                        <Icon component={FaCheck} size={12} /> {t('dashboard.closed')}
                                      </span>
                                    ) : debt.totalLocal === 0 && debt.totalDollars === 0 ? (
                                      <span className="debt-completed-badge">
                                        <Icon component={FaCheck} size={12} /> {t('common.completed')}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="debt-actions">
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
                                            inputMode="decimal"
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
                                            {hideAmounts ? '••••' : formatCurrency(debt.localFee, debt.localCurrency)}
                                          </span>
                                        )}
                                      </div>
                                      <div className="payment-item">
                                        <span className="payment-label">{t('dashboard.monthly')} (USD)</span>
                                        {editingField?.debtId === debt.id && editingField?.field === 'dollarFee' ? (
                                          <input
                                            type="number"
                                            inputMode="decimal"
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
                                            {hideAmounts ? '••••' : formatCurrency(debt.dollarFee, 'USD')}
                                          </span>
                                        )}
                                      </div>
                                      <div className="payment-item">
                                        <span className="payment-label">{t('dashboard.total')} ({storage.getLocalCurrency()})</span>
                                        <span className="payment-value">
                                          {hideAmounts ? '••••' : formatCurrency(debt.totalLocal, debt.localCurrency)}
                                        </span>
                                      </div>
                                      <div className="payment-item">
                                        <span className="payment-label">{t('dashboard.total')} (USD)</span>
                                        <span className="payment-value">
                                          {hideAmounts ? '••••' : formatCurrency(debt.totalDollars, 'USD')}
                                        </span>
                                      </div>
                                      <div className="payment-item">
                                        <span className="payment-label">{t('dashboard.paymentDate')}</span>
                                        {editingField?.debtId === debt.id && editingField?.field === 'paymentDay' ? (
                                          <input
                                            type="number"
                                            inputMode="numeric"
                                            min={1} max={31}
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveEdit(debt.id, 'paymentDay')}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveEdit(debt.id, 'paymentDay');
                                              if (e.key === 'Escape') cancelEdit();
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-edit-input"
                                            autoFocus
                                          />
                                        ) : (
                                          <span className="payment-value editable-field" onClick={(e) => {
                                            e.stopPropagation();
                                            startEditing(debt.id, 'paymentDay', debt.paymentDay ?? '', e);
                                          }}>
                                            {debt.paymentDay ? `Día ${debt.paymentDay}` : t('dashboard.noPaymentDate')}
                                          </span>
                                        )}
                                      </div>
                                      {debt.type === 'tarjeta' && (
                                        <div className="payment-item">
                                          <span className="payment-label">{t('dashboard.cutDate')}</span>
                                          {editingField?.debtId === debt.id && editingField?.field === 'cutDay' ? (
                                            <input
                                              type="number"
                                              inputMode="numeric"
                                              min={1} max={31}
                                              value={editValue}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onBlur={() => saveEdit(debt.id, 'cutDay')}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEdit(debt.id, 'cutDay');
                                                if (e.key === 'Escape') cancelEdit();
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-edit-input"
                                              autoFocus
                                            />
                                          ) : (
                                            <span className="payment-value editable-field" onClick={(e) => {
                                              e.stopPropagation();
                                              startEditing(debt.id, 'cutDay', debt.cutDay ?? '', e);
                                            }}>
                                              {debt.cutDay ? `Día ${debt.cutDay}` : t('dashboard.noCutDate')}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      <div className="payment-item">
                                        <span className="payment-label">{t('dashboard.interestRate')}</span>
                                        {editingField?.debtId === debt.id && editingField?.field === 'interestRate' ? (
                                          <input
                                            type="number"
                                            inputMode="decimal"
                                            step="0.01"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveEdit(debt.id, 'interestRate')}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveEdit(debt.id, 'interestRate');
                                              if (e.key === 'Escape') cancelEdit();
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-edit-input"
                                            autoFocus
                                          />
                                        ) : (
                                          <span className="payment-value editable-field" onClick={(e) => {
                                            e.stopPropagation();
                                            startEditing(debt.id, 'interestRate', debt.interestRate || 0, e);
                                          }}>
                                            {debt.interestRate !== undefined && debt.interestRate !== null ? `${debt.interestRate}%` : t('dashboard.noInterestRate')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
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
          </>
        )}
      </div>
    );
  };

  const renderFixedExpensesScreen = () => {
    const fixedExpensesTotals = calculateFixedExpensesTotals();
    
    return (
      <div className="screen-container">
        {fixedExpenses.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3 }}
            className="empty-state"
          >
            <div className="empty-state-image-wrapper">
              <motion.img
                src="/shopping.png"
                alt={t('dashboard.emptyStateAlt')}
                className="empty-state-image"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {t('dashboard.noFixedExpenses')}
            </motion.p>
          </motion.div>
        ) : (
          <>
            {fixedExpenses.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="dashboard-summary"
              >
                <div className="summary-card">
                  <div className="summary-section">
                    <div className="summary-card-header">
                      <Icon component={FaBolt} className="summary-icon" />
                      <span className="summary-label">{t('dashboard.totalFixedExpenses')}</span>
                    </div>
                    <div className="summary-values">
                      <div className="summary-value">
                        <span className="summary-currency">{fixedExpensesTotals.mostCommonCurrency}</span>
                        <span className="summary-amount">{formatCurrency(fixedExpensesTotals.totalLocal, fixedExpensesTotals.mostCommonCurrency)}</span>
                      </div>
                      <div className="summary-value">
                        <span className="summary-currency">USD</span>
                        <span className="summary-amount">{formatCurrency(fixedExpensesTotals.totalDollars, 'USD')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleFixedExpensesDragEnd}
            >
            <SortableContext
              items={fixedExpenses.map(e => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="items-list">
                {fixedExpenses.map((expense, index) => (
                  <SortableItemCard key={expense.id} id={expense.id} index={index}>
                    {({ dragAttributes, dragListeners, isDragging }) => (
                      <div className="expense-card-compact" data-dragging={isDragging}>
                        {/* Left: name + date */}
                        <div className="expense-info">
                          <div className="expense-name-row">
                            <Icon component={fixedExpenseIcon} className="expense-type-icon" />
                            {editingFixedExpense?.expenseId === expense.id && editingFixedExpense?.field === 'name' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveFixedExpenseEdit(expense.id, 'name')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveFixedExpenseEdit(expense.id, 'name');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input expense-name-input"
                                autoFocus
                              />
                            ) : (
                              <span className="expense-name editable-field" onClick={(e) => {
                                e.stopPropagation();
                                startEditingFixedExpense(expense.id, 'name', expense.name, e);
                              }}>
                                {expense.name}
                              </span>
                            )}
                          </div>
                          {editingFixedExpense?.expenseId === expense.id && editingFixedExpense?.field === 'paymentDay' ? (
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1} max={31}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveFixedExpenseEdit(expense.id, 'paymentDay')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveFixedExpenseEdit(expense.id, 'paymentDay');
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-edit-input"
                              autoFocus
                            />
                          ) : (
                            <span className="expense-date editable-field" onClick={(e) => {
                              e.stopPropagation();
                              startEditingFixedExpense(expense.id, 'paymentDay', expense.paymentDay ?? '', e);
                            }}>
                              <Icon component={FaCalendarAlt} size={10} style={{ marginRight: 3 }} />
                              {expense.paymentDay ? `Día ${expense.paymentDay}` : '—'}
                            </span>
                          )}
                        </div>

                        {/* Right: amounts + delete */}
                        {!hideAmounts && (
                          <div className="expense-amounts">
                            {editingFixedExpense?.expenseId === expense.id && editingFixedExpense?.field === 'amountLocal' ? (
                              <input
                                type="number" inputMode="decimal" step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveFixedExpenseEdit(expense.id, 'amountLocal')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveFixedExpenseEdit(expense.id, 'amountLocal');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input"
                                autoFocus
                              />
                            ) : (
                              <span className="expense-amount editable-field" onClick={(e) => {
                                e.stopPropagation();
                                startEditingFixedExpense(expense.id, 'amountLocal', expense.amountLocal, e);
                              }}>
                                {formatCurrency(expense.amountLocal, expense.localCurrency)}
                              </span>
                            )}
                            {editingFixedExpense?.expenseId === expense.id && editingFixedExpense?.field === 'amountDollars' ? (
                              <input
                                type="number" inputMode="decimal" step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveFixedExpenseEdit(expense.id, 'amountDollars')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveFixedExpenseEdit(expense.id, 'amountDollars');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input"
                                autoFocus
                              />
                            ) : (
                              <span className="expense-amount editable-field" onClick={(e) => {
                                e.stopPropagation();
                                startEditingFixedExpense(expense.id, 'amountDollars', expense.amountDollars, e);
                              }}>
                                {formatCurrency(expense.amountDollars, 'USD')}
                              </span>
                            )}
                            <div className="expense-actions-col">
                              <div
                                {...dragAttributes}
                                {...dragListeners}
                                className="expense-drag"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                                  <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
                                  <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                                  <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
                                </svg>
                              </div>
                              <motion.button
                                className="btn-delete expense-delete"
                                onClick={(e) => { e.stopPropagation(); navigate(`/delete-fixed-expense/${expense.id}`); }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Icon component={FaTrash} size={12} />
                              </motion.button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </SortableItemCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          </>
        )}
      </div>
    );
  };

  const renderAssetsScreen = () => {
    const assetsTotals = calculateAssetsTotals();
    
    return (
      <div className="screen-container">
        {assets.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3 }}
            className="empty-state"
          >
            <div className="empty-state-image-wrapper">
              <motion.img
                src="/shopping.png"
                alt={t('dashboard.emptyStateAlt')}
                className="empty-state-image"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {t('dashboard.noAssets')}
            </motion.p>
          </motion.div>
        ) : (
          <>
            {assets.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="dashboard-summary"
              >
                <div className="summary-card">
                  <div className="summary-section">
                    <div className="summary-card-header">
                      <Icon component={FaWallet} className="summary-icon" />
                      <span className="summary-label">{t('dashboard.totalAssets')}</span>
                    </div>
                    <div className="summary-values">
                      <div className="summary-value">
                        <span className="summary-currency">{assetsTotals.mostCommonCurrency}</span>
                        <span className="summary-amount">{formatCurrency(assetsTotals.totalLocal, assetsTotals.mostCommonCurrency)}</span>
                      </div>
                      <div className="summary-value">
                        <span className="summary-currency">USD</span>
                        <span className="summary-amount">{formatCurrency(assetsTotals.totalDollars, 'USD')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleAssetsDragEnd}
            >
            <SortableContext
              items={assets.map(a => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="items-list">
                {assets.map((asset, index) => (
                  <SortableItemCard key={asset.id} id={asset.id} index={index}>
                    {({ dragAttributes, dragListeners, isDragging }) => (
                      <div className="expense-card-compact" data-dragging={isDragging}>
                        {/* Left: icon + name + type + passive income */}
                        <div className="expense-info">
                          <div className="expense-name-row">
                            <Icon component={getAssetIcon(asset.type)} className="expense-type-icon" />
                            {editingAsset?.assetId === asset.id && editingAsset?.field === 'name' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveAssetEdit(asset.id, 'name')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveAssetEdit(asset.id, 'name');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input expense-name-input"
                                autoFocus
                              />
                            ) : (
                              <span className="expense-name editable-field" onClick={(e) => {
                                e.stopPropagation();
                                startEditingAsset(asset.id, 'name', asset.name, e);
                              }}>
                                {asset.name}
                              </span>
                            )}
                          </div>
                          <span className="expense-date">
                            <Icon component={FaTag} size={10} style={{ marginRight: 3, color: 'var(--primary)', opacity: 1 }} />
                            {t(`dashboard.${asset.type}`)}
                          </span>
                          {((asset.monthlyIncomeLocal || 0) > 0 || (asset.monthlyIncomeUSD || 0) > 0) && (
                            <div className="asset-passive-income">
                              <Icon component={FaPiggyBank} size={11} style={{ marginRight: 5, color: 'var(--primary)' }} />
                              <span className="asset-passive-income-label">Ingreso mensual:</span>
                              {(asset.monthlyIncomeLocal || 0) > 0 && (
                                <span className="asset-passive-income-amount">{formatCurrency(asset.monthlyIncomeLocal!, asset.localCurrency)}</span>
                              )}
                              {(asset.monthlyIncomeUSD || 0) > 0 && (
                                <span className="asset-passive-income-amount">{formatCurrency(asset.monthlyIncomeUSD!, 'USD')}</span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: amounts + actions col */}
                        {!hideAmounts && (
                          <div className="expense-amounts">
                            {editingAsset?.assetId === asset.id && editingAsset?.field === 'valueLocal' ? (
                              <input
                                type="number" inputMode="decimal" step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveAssetEdit(asset.id, 'valueLocal')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveAssetEdit(asset.id, 'valueLocal');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input"
                                autoFocus
                              />
                            ) : (
                              <span className="expense-amount editable-field" onClick={(e) => {
                                e.stopPropagation();
                                startEditingAsset(asset.id, 'valueLocal', asset.valueLocal, e);
                              }}>
                                {formatCurrency(asset.valueLocal, asset.localCurrency)}
                              </span>
                            )}
                            {editingAsset?.assetId === asset.id && editingAsset?.field === 'valueDollars' ? (
                              <input
                                type="number" inputMode="decimal" step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveAssetEdit(asset.id, 'valueDollars')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveAssetEdit(asset.id, 'valueDollars');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input"
                                autoFocus
                              />
                            ) : (
                              <span className="expense-amount editable-field" onClick={(e) => {
                                e.stopPropagation();
                                startEditingAsset(asset.id, 'valueDollars', asset.valueDollars, e);
                              }}>
                                {formatCurrency(asset.valueDollars, 'USD')}
                              </span>
                            )}
                            <div className="expense-actions-col">
                              <div
                                {...dragAttributes}
                                {...dragListeners}
                                className="expense-drag"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                                  <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
                                  <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                                  <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
                                </svg>
                              </div>
                              <motion.button
                                className="btn-delete expense-delete"
                                onClick={(e) => { e.stopPropagation(); navigate(`/delete-asset/${asset.id}`); }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Icon component={FaTrash} size={12} />
                              </motion.button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </SortableItemCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          </>
        )}
      </div>
    );
  };

  const renderIncomesScreen = () => {
    const incomesTotals = calculateIncomesTotals();
    
    return (
      <div className="screen-container">
        {incomes.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.3 }}
            className="empty-state"
          >
            <div className="empty-state-image-wrapper">
              <motion.img
                src="/shopping.png"
                alt={t('dashboard.emptyStateAlt')}
                className="empty-state-image"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.3 }}
              />
            </div>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              {t('dashboard.noIncomes')}
            </motion.p>
          </motion.div>
        ) : (
          <>
            {incomes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="dashboard-summary"
              >
                <div className="summary-card">
                  <div className="summary-section">
                    <div className="summary-card-header">
                      <Icon component={FaMoneyBillWave} className="summary-icon" />
                      <span className="summary-label">{t('dashboard.totalIncomes')}</span>
                    </div>
                    <div className="summary-values">
                      <div className="summary-value">
                        <span className="summary-currency">{incomesTotals.mostCommonCurrency}</span>
                        <span className="summary-amount">{formatCurrency(incomesTotals.totalLocal, incomesTotals.mostCommonCurrency)}</span>
                      </div>
                      <div className="summary-value">
                        <span className="summary-currency">USD</span>
                        <span className="summary-amount">{formatCurrency(incomesTotals.totalDollars, 'USD')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleIncomesDragEnd}
            >
            <SortableContext
              items={incomes.map(i => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="items-list">
                {incomes.map((income, index) => (
                  <SortableItemCard key={income.id} id={income.id} index={index}>
                    {({ dragAttributes, dragListeners, isDragging }) => (
                      <div className="expense-card-compact" data-dragging={isDragging}>
                        {/* Left: icon + name + date + type */}
                        <div className="expense-info">
                          <div className="expense-name-row">
                            <Icon component={getIncomeIcon(income.type)} className="expense-type-icon" />
                            {editingIncome?.incomeId === income.id && editingIncome?.field === 'name' ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveIncomeEdit(income.id, 'name')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveIncomeEdit(income.id, 'name');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input expense-name-input"
                                autoFocus
                              />
                            ) : (
                              <span className="expense-name editable-field" onClick={(e) => {
                                e.stopPropagation();
                                startEditingIncome(income.id, 'name', income.name, e);
                              }}>
                                {income.name}
                              </span>
                            )}
                          </div>
                          {editingIncome?.incomeId === income.id && editingIncome?.field === 'paymentDay' ? (
                            <input
                              type="number"
                              inputMode="numeric"
                              min={1} max={31}
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => saveIncomeEdit(income.id, 'paymentDay')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveIncomeEdit(income.id, 'paymentDay');
                                if (e.key === 'Escape') cancelEdit();
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-edit-input"
                              autoFocus
                            />
                          ) : (
                            <span className="expense-date editable-field" onClick={(e) => {
                              e.stopPropagation();
                              startEditingIncome(income.id, 'paymentDay', income.paymentDay ?? '', e);
                            }}>
                              <Icon component={FaCalendarAlt} size={10} style={{ marginRight: 3 }} />
                              {income.paymentDay ? `Día ${income.paymentDay}` : '—'}
                            </span>
                          )}
                          <span className="expense-date" style={{ opacity: 0.6 }}>
                            <Icon component={FaTag} size={10} style={{ marginRight: 3, color: 'var(--primary)', opacity: 1 }} />
                            {t(`dashboard.${income.type}`)}
                          </span>
                        </div>

                        {/* Right: amounts + actions col */}
                        {!hideAmounts && (
                          <div className="expense-amounts">
                            {editingIncome?.incomeId === income.id && editingIncome?.field === 'amountLocal' ? (
                              <input
                                type="number" inputMode="decimal" step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveIncomeEdit(income.id, 'amountLocal')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveIncomeEdit(income.id, 'amountLocal');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input"
                                autoFocus
                              />
                            ) : (
                              <span className="expense-amount editable-field" onClick={(e) => {
                                e.stopPropagation();
                                startEditingIncome(income.id, 'amountLocal', income.amountLocal, e);
                              }}>
                                {formatCurrency(income.amountLocal, income.localCurrency)}
                              </span>
                            )}
                            {editingIncome?.incomeId === income.id && editingIncome?.field === 'amountDollars' ? (
                              <input
                                type="number" inputMode="decimal" step="0.01"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => saveIncomeEdit(income.id, 'amountDollars')}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveIncomeEdit(income.id, 'amountDollars');
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-edit-input"
                                autoFocus
                              />
                            ) : (
                              <span className="expense-amount editable-field" onClick={(e) => {
                                e.stopPropagation();
                                startEditingIncome(income.id, 'amountDollars', income.amountDollars, e);
                              }}>
                                {formatCurrency(income.amountDollars, 'USD')}
                              </span>
                            )}
                            <div className="expense-actions-col">
                              <div
                                {...dragAttributes}
                                {...dragListeners}
                                className="expense-drag"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>
                                  <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
                                  <circle cx="5" cy="8" r="1.5" /><circle cx="11" cy="8" r="1.5" />
                                  <circle cx="5" cy="12" r="1.5" /><circle cx="11" cy="12" r="1.5" />
                                </svg>
                              </div>
                              <motion.button
                                className="btn-delete expense-delete"
                                onClick={(e) => { e.stopPropagation(); navigate(`/delete-income/${income.id}`); }}
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                              >
                                <Icon component={FaTrash} size={12} />
                              </motion.button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </SortableItemCard>
                ))}
              </div>
            </SortableContext>
          </DndContext>
          </>
        )}
      </div>
    );
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
          <div className="header-title-wrapper" style={{ cursor: 'pointer' }} onClick={() => navigate('/plan')}>
            <img
              src={`${process.env.PUBLIC_URL}/logo.png`}
              alt={t('dashboard.logoAlt')}
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
              onClick={() => navigate('/prospects')}
              title="Prospectos"
            >
              <Icon component={FaSearch} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-profile btn-nav-profile"
              onClick={() => navigate('/profile')}
              title={t('profile.title')}
            >
              <Icon component={FaUser} />
            </motion.button>
          </div>
        </div>
      </motion.header>

      <div className="dashboard-content">
        {/* Overall Summary - Shows when there are any items */}
        {(debts.length > 0 || fixedExpenses.length > 0 || assets.length > 0 || incomes.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="dashboard-summary"
          >
            <motion.div
              layout
              className={`summary-card overall-summary ${isOverallSummaryExpanded ? 'expanded' : 'collapsed'}`}
              onClick={() => {
                if (!isOverallSummaryExpanded) setIsOverallSummaryExpanded(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if (!isOverallSummaryExpanded) setIsOverallSummaryExpanded(true);
                }
              }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {!isOverallSummaryExpanded ? (
                  <motion.div
                    key="collapsed"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18 }}
                  >
                    <div className="summary-section">
                      <div className="summary-card-header">
                        <Icon component={FaChartLine} className="summary-icon" />
                        <span className="summary-label">{t('dashboard.netWorth')}</span>
                      </div>
                      <div className="summary-values">
                        <div className="summary-value">
                          <span className="summary-currency">{calculateOverallTotals().mostCommonCurrency}</span>
                          <span className="summary-amount">{formatCurrency(calculateOverallTotals().netWorth.totalLocal, calculateOverallTotals().mostCommonCurrency)}</span>
                        </div>
                        <div className="summary-value">
                          <span className="summary-currency">USD</span>
                          <span className="summary-amount">{formatCurrency(calculateOverallTotals().netWorth.totalDollars, 'USD')}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="expanded"
                    initial={{ opacity: 0, y: 10, scale: 0.98, filter: 'blur(2px)' }}
                    animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, y: 6, scale: 0.99, filter: 'blur(2px)' }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    <motion.button
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-close-summary"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsOverallSummaryExpanded(false);
                      }}
                      title={t('common.close')}
                    >
                      <Icon component={FaTimes} size={16} />
                    </motion.button>

                    <div style={{ paddingTop: 4 }}>
                      {debts.length > 0 && (
                        <>
                          <div className="summary-section">
                            <div className="summary-card-header">
                              <Icon component={FaFileInvoiceDollar} className="summary-icon" />
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
                        </>
                      )}
                      {assets.length > 0 && (
                        <>
                          <div className="summary-section">
                            <div className="summary-card-header">
                              <Icon component={FaWallet} className="summary-icon" />
                              <span className="summary-label">{t('dashboard.totalAssets')}</span>
                            </div>
                            <div className="summary-values">
                              <div className="summary-value">
                                <span className="summary-currency">{calculateAssetsTotals().mostCommonCurrency}</span>
                                <span className="summary-amount">{formatCurrency(calculateAssetsTotals().totalLocal, calculateAssetsTotals().mostCommonCurrency)}</span>
                              </div>
                              <div className="summary-value">
                                <span className="summary-currency">USD</span>
                                <span className="summary-amount">{formatCurrency(calculateAssetsTotals().totalDollars, 'USD')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="summary-divider"></div>
                        </>
                      )}
                      <div className="summary-section">
                        <div className="summary-card-header">
                          <Icon component={FaChartLine} className="summary-icon" />
                          <span className="summary-label">{t('dashboard.netWorth')}</span>
                          <span className="networth-formula-badge">Activos − Deudas</span>
                        </div>
                        <div className="summary-values">
                          <div className="summary-value">
                            <span className="summary-currency">{calculateOverallTotals().mostCommonCurrency}</span>
                            <span className="summary-amount">{formatCurrency(calculateOverallTotals().netWorth.totalLocal, calculateOverallTotals().mostCommonCurrency)}</span>
                          </div>
                          <div className="summary-value">
                            <span className="summary-currency">USD</span>
                            <span className="summary-amount">{formatCurrency(calculateOverallTotals().netWorth.totalDollars, 'USD')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Cashflow Card */}
            {(() => {
              const cf = calculateCashflow();
              return (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="summary-card cashflow-card"
                >
                  <div className="cashflow-header">
                    <Icon component={FaWallet} className="summary-icon" />
                    <span className="summary-label">Cashflow mensual</span>
                  </div>

                  {/* Tipo de cambio */}
                  <div className="cashflow-rate-row">
                    <span className="cashflow-rate-label">Tipo de cambio</span>
                    <div className="cashflow-rate-value-wrap">
                      <span className="cashflow-rate-tag">{cf.currency} / USD</span>
                      {editingRate ? (
                        <input
                          className="cashflow-rate-input"
                          type="number"
                          value={rateInput}
                          autoFocus
                          onChange={(e) => setRateInput(e.target.value)}
                          onBlur={() => {
                            const val = parseFloat(rateInput) || 500;
                            setExchangeRate(val);
                            localStorage.setItem('cashflow_exchange_rate', String(val));
                            setEditingRate(false);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingRate(false);
                          }}
                        />
                      ) : (
                        <span
                          className="cashflow-rate-number"
                          onClick={() => { setRateInput(String(exchangeRate)); setEditingRate(true); }}
                          title="Toca para editar"
                        >
                          {exchangeRate.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="cashflow-divider" />

                  <div className="cashflow-row">
                    <span className="cashflow-row-label">
                      <Icon component={FaMoneyBillWave} size={13} style={{ marginRight: 6, color: 'var(--primary)' }} />
                      Ingresos activos
                    </span>
                    <span className="cashflow-row-amount cashflow-positive">
                      +{formatCurrency(cf.activeIncomeUSD, 'USD')}
                    </span>
                  </div>
                  {cf.passiveIncomeUSD > 0 && (
                    <div className="cashflow-row">
                      <span className="cashflow-row-label">
                        <Icon component={FaPiggyBank} size={13} style={{ marginRight: 6, color: 'var(--primary)' }} />
                        Ingresos pasivos
                      </span>
                      <span className="cashflow-row-amount cashflow-positive">
                        +{formatCurrency(cf.passiveIncomeUSD, 'USD')}
                      </span>
                    </div>
                  )}
                  <div className="cashflow-row">
                    <span className="cashflow-row-label">
                      <Icon component={FaFileInvoiceDollar} size={13} style={{ marginRight: 6, color: 'var(--error, #ef4444)' }} />
                      Gastos fijos
                    </span>
                    <span className="cashflow-row-amount cashflow-negative">
                      -{formatCurrency(cf.fixedExpensesUSD, 'USD')}
                    </span>
                  </div>
                  <div className="cashflow-row">
                    <span className="cashflow-row-label">
                      <Icon component={FaCreditCard} size={13} style={{ marginRight: 6, color: 'var(--error, #ef4444)' }} />
                      Pagos deudas
                    </span>
                    <span className="cashflow-row-amount cashflow-negative">
                      -{formatCurrency(cf.debtPaymentsUSD, 'USD')}
                    </span>
                  </div>

                  <div className="cashflow-divider" />

                  <div className="cashflow-row cashflow-row--total">
                    <span className="cashflow-row-label">
                      <Icon component={FaChartLine} size={13} style={{ marginRight: 6 }} />
                      Cashflow USD
                    </span>
                    <span className={`cashflow-row-amount cashflow-total ${cf.cashflowUSD >= 0 ? 'cashflow-positive' : 'cashflow-negative'}`}>
                      {cf.cashflowUSD >= 0 ? '+' : ''}{formatCurrency(cf.cashflowUSD, 'USD')}
                    </span>
                  </div>

                  <div className="cashflow-divider" />

                  <div className="cashflow-row">
                    <span className="cashflow-row-label">
                      <Icon component={FaPiggyBank} size={13} style={{ marginRight: 6, color: 'var(--primary)' }} />
                      Ahorros
                    </span>
                    <div className="cashflow-savings-cols">
                      {/* Local currency */}
                      <div className="cashflow-savings-col">
                        <span className="cashflow-savings-currency">{cf.currency}</span>
                        {editingSavings === 'local' ? (
                          <input
                            className="cashflow-savings-input"
                            type="number"
                            value={savingsInput}
                            autoFocus
                            onChange={(e) => setSavingsInput(e.target.value)}
                            onBlur={() => {
                              const val = parseFloat(savingsInput) || 0;
                              setSavingsLocal(val);
                              localStorage.setItem('cashflow_savings_local', String(val));
                              setEditingSavings(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') setEditingSavings(null);
                            }}
                          />
                        ) : (
                          <span
                            className="cashflow-row-amount cashflow-savings-value"
                            onClick={() => { setSavingsInput(String(savingsLocal)); setEditingSavings('local'); }}
                            title="Toca para editar"
                          >
                            {formatCurrency(savingsLocal, cf.currency)}
                          </span>
                        )}
                      </div>
                      {/* USD */}
                      <div className="cashflow-savings-col">
                        <span className="cashflow-savings-currency">USD</span>
                        {editingSavings === 'usd' ? (
                          <input
                            className="cashflow-savings-input"
                            type="number"
                            value={savingsInput}
                            autoFocus
                            onChange={(e) => setSavingsInput(e.target.value)}
                            onBlur={() => {
                              const val = parseFloat(savingsInput) || 0;
                              setSavingsUSD(val);
                              localStorage.setItem('cashflow_savings_usd', String(val));
                              setEditingSavings(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                              if (e.key === 'Escape') setEditingSavings(null);
                            }}
                          />
                        ) : (
                          <span
                            className="cashflow-row-amount cashflow-savings-value"
                            onClick={() => { setSavingsInput(String(savingsUSD)); setEditingSavings('usd'); }}
                            title="Toca para editar"
                          >
                            {formatCurrency(savingsUSD, 'USD')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </motion.div>
        )}

        {/* Menu de 4 botones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="dashboard-menu"
        >
          <button
            className={`menu-button menu-button--debt ${activeTab === 'debt' ? 'active' : ''}`}
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL || ''}/img/debt.png)` }}
            onClick={() => setActiveTab('debt')}
            title={t('dashboard.debt')}
            aria-label={t('dashboard.debt')}
          />
          <button
            className={`menu-button menu-button--gastos ${activeTab === 'fixedExpenses' ? 'active' : ''}`}
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL || ''}/img/gasts_fijos.png)` }}
            onClick={() => setActiveTab('fixedExpenses')}
            title={t('dashboard.fixedExpenses')}
            aria-label={t('dashboard.fixedExpenses')}
          />
          <button
            className={`menu-button menu-button--activos ${activeTab === 'assets' ? 'active' : ''}`}
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL || ''}/img/activos.png)` }}
            onClick={() => setActiveTab('assets')}
            title={t('dashboard.assets')}
            aria-label={t('dashboard.assets')}
          />
          <button
            className={`menu-button menu-button--ingresos ${activeTab === 'incomes' ? 'active' : ''}`}
            style={{ backgroundImage: `url(${process.env.PUBLIC_URL || ''}/img/ingresos.png)` }}
            onClick={() => setActiveTab('incomes')}
            title={t('dashboard.incomes')}
            aria-label={t('dashboard.incomes')}
          />
        </motion.div>

        {/* Contenedor de pantallas */}
        <div className="dashboard-screens-container">
          <AnimatePresence mode="wait">
            {activeTab === 'debt' && (
              <motion.div
                key="debt"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                style={{ width: '100%' }}
              >
                {renderDebtsScreen()}
              </motion.div>
            )}
            {activeTab === 'fixedExpenses' && (
              <motion.div
                key="fixedExpenses"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {renderFixedExpensesScreen()}
              </motion.div>
            )}
            {activeTab === 'assets' && (
              <motion.div
                key="assets"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {renderAssetsScreen()}
              </motion.div>
            )}
            {activeTab === 'incomes' && (
              <motion.div
                key="incomes"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                {renderIncomesScreen()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Nav fija al fondo: botón para agregar según el tab activo */}
      <nav className="dashboard-bottom-nav" aria-label={t('common.add')}>
        <div className="ai-agent-entry-wrap">
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="ai-agent-entry-button"
            onClick={() => {
              const routes: Record<ActiveTab, string> = {
                debt: '/add-debt',
                fixedExpenses: '/add-fixed-expense',
                assets: '/add-asset',
                incomes: '/add-income',
              };
              navigate(routes[activeTab]);
            }}
            aria-label={t('common.add')}
          >
            <span style={{ fontSize: 28, lineHeight: 1, color: '#fff', fontWeight: 300 }}>+</span>
          </motion.button>
        </div>
      </nav>
    </motion.div>
  );
};

export default Dashboard;
