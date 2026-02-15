import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  FaEye,
  FaEyeSlash,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPaperPlane,
  FaHome,
  FaCar,
  FaPiggyBank,
  FaBriefcase,
  FaBuilding,
  FaShoppingCart,
  FaUtensils,
  FaGasPump,
  FaWifi,
  FaGamepad,
  FaGraduationCap,
  FaHeartbeat,
  FaDollarSign,
  FaWallet,
  FaTag,
  FaBell,
  FaQuestionCircle
} from 'react-icons/fa';
// import { useAuth } from '../context/AuthContext'; // Reserved for future use
import { Debt, FixedExpense, Asset, Income } from '../types';
import { storage } from '../utils/storage';
import { formatDateLocal } from '../utils/dateUtils';
import { notify, ensureReminders, ensureFixedExpenseReminders } from '../utils/notifications';
import SortableDebtCard from '../components/SortableDebtCard';
import SortableItemCard from '../components/SortableItemCard';
import Tour from '../components/Tour';
import NotificationsSidebar from '../components/NotificationsSidebar';
import { useSubscription } from '../context/SubscriptionContext';
import { executeAIAction, parseTextToAIAction, getMessageForActionResult, interpretWithAI, isAIVoiceEnabled, getLastAIVoiceError, getSummaryText } from '../api';
import { analytics } from '../utils/analytics';
import './Dashboard.css';

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: SpeechRecognition, ev: any) => any) | null;
  onerror: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
}

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

type ActiveTab = 'debt' | 'fixedExpenses' | 'assets' | 'incomes';

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('debt');
  const [expandedDebts, setExpandedDebts] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<{ debtId: string; field: string } | null>(null);
  const [editingCall, setEditingCall] = useState<{ debtId: string; callId: string; field: string } | null>(null);
  const [editingCommitment, setEditingCommitment] = useState<{ debtId: string; commitmentId: string; field: string } | null>(null);
  const [editingFixedExpense, setEditingFixedExpense] = useState<{ expenseId: string; field: string } | null>(null);
  const [editingAsset, setEditingAsset] = useState<{ assetId: string; field: string } | null>(null);
  const [editingIncome, setEditingIncome] = useState<{ incomeId: string; field: string } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    const saved = localStorage.getItem('hideAmounts');
    return saved === 'true';
  });
  const [tourRun, setTourRun] = useState(false);
  const [isOverallSummaryExpanded, setIsOverallSummaryExpanded] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);
  // AI Agent states
  const [isListening, setIsListening] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const speechTranscriptRef = useRef('');
  // const { user, logout } = useAuth(); // Reserved for future use
  const navigate = useNavigate();
  const { isPremium } = useSubscription();

  useEffect(() => {
    if (!localStorage.getItem('hasSeenInitialSetup')) {
      navigate('/preferences', { replace: true });
      return;
    }
    loadDebts();
    loadFixedExpenses();
    loadAssets();
    loadIncomes();
    updateUnreadNotificationsCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Update unread count every 5 seconds
    const interval = setInterval(() => {
      updateUnreadNotificationsCount();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateUnreadNotificationsCount = () => {
    const count = storage.getUnreadNotificationsCount();
    setUnreadNotificationsCount(count);
  };

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
    ensureFixedExpenseReminders(orderedExpenses);
    updateUnreadNotificationsCount();
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

  // Helper functions to get icons for items
  const getFixedExpenseIcon = (category?: string) => {
    if (!category) return FaShoppingCart;
    const cat = category.toLowerCase();
    if (cat.includes('casa') || cat.includes('home') || cat.includes('vivienda')) return FaHome;
    if (cat.includes('comida') || cat.includes('food') || cat.includes('restaurant')) return FaUtensils;
    if (cat.includes('gasolina') || cat.includes('gas') || cat.includes('combustible')) return FaGasPump;
    if (cat.includes('internet') || cat.includes('wifi') || cat.includes('telefono')) return FaWifi;
    if (cat.includes('entretenimiento') || cat.includes('entretenimiento') || cat.includes('juego')) return FaGamepad;
    if (cat.includes('educacion') || cat.includes('education') || cat.includes('escuela')) return FaGraduationCap;
    if (cat.includes('salud') || cat.includes('health') || cat.includes('medico')) return FaHeartbeat;
    return FaShoppingCart;
  };

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
      
      // Calculate inOrder based on commitments
      const calculatedInOrder = calculateInOrder(debt);
      
      // Update debt if inOrder changed (e.g. commitment became overdue)
      if (debt.inOrder !== calculatedInOrder) {
        const updated = {
          ...debt,
          inOrder: calculatedInOrder,
          updatedAt: new Date().toISOString(),
        };
        storage.saveDebt(updated);
        notify.debtStatusChanged(debt.name, calculatedInOrder);
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

    // Create reminder notifications (payment due, overdue commitments, call bank) – deduped
    ensureReminders(orderedDebts);
    updateUnreadNotificationsCount();

    setDebts(orderedDebts);
  };

  const handleDelete = (id: string) => {
    navigate(`/delete-debt/${id}`);
  };

  const hasPendingCommitments = (debt: Debt): boolean => {
    if (!debt.commitments || debt.commitments.length === 0) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return debt.commitments.some(commitment => {
      if (commitment.status === 'completed') {
        return false;
      }

      const commitmentDate = new Date(commitment.date);
      commitmentDate.setHours(0, 0, 0, 0);
      const diffTime = commitmentDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays < 0 || commitment.status === 'pending';
    });
  };

  const getOverdueCount = (debt: Debt): number => {
    if (!debt.commitments || debt.commitments.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return debt.commitments.filter(c => {
      if (c.status === 'completed') return false;
      const d = new Date(c.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime();
    }).length;
  };

  /** Current month YYYY-MM */
  const getCurrentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  /** Fixed expense status: upToDate | overdue | dueDay (and day number for dueDay) */
  const getFixedExpenseStatus = (expense: FixedExpense): { status: 'upToDate' | 'overdue' | 'dueDay'; day?: number } => {
    const month = getCurrentMonth();
    if (expense.paidForMonth === month) return { status: 'upToDate' };
    const dueDay = expense.dueDate ? parseInt(String(expense.dueDate).replace(/\D/g, ''), 10) : 0;
    if (dueDay < 1 || dueDay > 31) return { status: 'dueDay', day: 0 };
    const today = new Date();
    const dayOfMonth = today.getDate();
    if (dayOfMonth >= dueDay) return { status: 'overdue', day: dueDay };
    return { status: 'dueDay', day: dueDay };
  };

  const handleMarkFixedExpenseUpToDate = (expenseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const expense = fixedExpenses.find(e => e.id === expenseId);
    if (!expense) return;
    const updated = {
      ...expense,
      paidForMonth: getCurrentMonth(),
      updatedAt: new Date().toISOString(),
    };
    storage.updateFixedExpense(updated);
    loadFixedExpenses();
    notify.saveAndToast(t('dashboard.expenseMarkedUpToDate', { name: expense.name }), 'success');
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
    const numericFields = ['localFee', 'dollarFee', 'totalLocal', 'totalDollars', 'interestRate'];
    
    // Handle date fields - convert to ISO string if not empty
    if (field === 'paymentDate' || field === 'cutDate') {
      newValue = editValue ? new Date(editValue).toISOString() : '';
    } else {
      // Convert to number if it's a numeric field
      if (numericFields.includes(field)) {
        newValue = parseFloat(editValue) || 0;
      }
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
    setEditingCall(null);
    setEditingCommitment(null);
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
    
    const numericFields = ['amountLocal', 'amountDollars'];
    if (numericFields.includes(field)) {
      newValue = parseFloat(editValue) || 0;
    }
    
    // Handle date fields - convert to ISO string if not empty
    if (field === 'paymentDate') {
      newValue = editValue ? new Date(editValue).toISOString() : '';
    }

    const updated = {
      ...expense,
      [field]: newValue,
      updatedAt: new Date().toISOString(),
    };
    
    storage.updateFixedExpense(updated);
    notify.overviewUpdated();
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
    notify.overviewUpdated();
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
    
    const numericFields = ['amountLocal', 'amountDollars'];
    if (numericFields.includes(field)) {
      newValue = parseFloat(editValue) || 0;
    }
    
    // Handle date fields - store YYYY-MM-DD only (no ISO to avoid timezone shift)
    if (field === 'nextPaymentDate') {
      newValue = editValue ? editValue.trim().split('T')[0] : '';
    }

    const updated = {
      ...income,
      [field]: newValue,
      updatedAt: new Date().toISOString(),
    };
    
    storage.updateIncome(updated);
    notify.overviewUpdated();
    loadIncomes();
    setEditingIncome(null);
    setEditValue('');
  };

  const startEditingCall = (debtId: string, callId: string, field: string, currentValue: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCall({ debtId, callId, field });
    setEditValue(currentValue);
  };

  const saveCallEdit = (debtId: string, callId: string, field: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt || !debt.callHistory) return;

    const call = debt.callHistory.find(c => c.id === callId);
    if (!call) return;

    const updatedCall = {
      ...call,
      [field]: field === 'date' ? new Date(editValue).toISOString() : editValue,
    };

    const updatedDebt = {
      ...debt,
      callHistory: debt.callHistory.map(c => c.id === callId ? updatedCall : c),
      updatedAt: new Date().toISOString(),
    };

    storage.saveDebt(updatedDebt);
    loadDebts();
    setEditingCall(null);
    setEditValue('');
  };

  const startEditingCommitment = (debtId: string, commitmentId: string, field: string, currentValue: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCommitment({ debtId, commitmentId, field });
    setEditValue(currentValue.toString());
  };

  const saveCommitmentEdit = (debtId: string, commitmentId: string, field: string) => {
    const debt = debts.find(d => d.id === debtId);
    if (!debt || !debt.commitments) return;

    const commitment = debt.commitments.find(c => c.id === commitmentId);
    if (!commitment) return;

    let newValue: string | number = editValue;
    
    // Convert to number if it's a numeric field
    const numericFields = ['amountLocal', 'amountDollars'];
    if (numericFields.includes(field)) {
      newValue = parseFloat(editValue) || 0;
    } else if (field === 'date') {
      newValue = new Date(editValue).toISOString();
    }

    const updatedCommitment = {
      ...commitment,
      [field]: newValue,
      updatedAt: new Date().toISOString(),
    };

    const updatedDebt = {
      ...debt,
      commitments: debt.commitments.map(c => c.id === commitmentId ? updatedCommitment : c),
      updatedAt: new Date().toISOString(),
    };

    // Recalculate inOrder
    const oldInOrder = debt.inOrder;
    const newInOrder = calculateInOrder(updatedDebt);
    updatedDebt.inOrder = newInOrder;

    storage.saveDebt(updatedDebt);
    loadDebts();
    
    // Notify if status changed
    if (oldInOrder !== newInOrder) {
      notify.debtStatusChanged(debt.name, newInOrder);
    }
    
    setEditingCommitment(null);
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

  // AI Agent functions
  const handleAIUserInput = async (text: string) => {
    if (!text.trim()) return;

    console.log('[AI Voice] handleAIUserInput – text:', JSON.stringify(text), 'debts.length:', debts.length);
    setAiInputText('');
    setIsProcessing(true);

    const lang = i18n.language.startsWith('es') ? 'es' : 'en';
    let action = null;

    const voiceCommitments = debts.flatMap((d) =>
      (d.commitments || []).map((c) => ({ debtId: d.id, debtName: d.name, commitmentId: c.id, date: c.date }))
    );
    const voiceCalls = debts.flatMap((d) =>
      (d.callHistory || []).map((c) => ({ debtId: d.id, debtName: d.name, callId: c.id, date: c.date }))
    );

    // Intentar primero interpretación con IA externa si está configurada
    if (isAIVoiceEnabled()) {
      action = await interpretWithAI(text, {
        lang,
        debts: debts.map((d) => ({ id: d.id, name: d.name })),
        commitments: voiceCommitments,
        calls: voiceCalls,
        fixedExpenses: fixedExpenses.map((e) => ({ id: e.id, name: e.name })),
        assets: assets.map((a) => ({ id: a.id, name: a.name })),
        incomes: incomes.map((i) => ({ id: i.id, name: i.name })),
        overview: getSummaryText(lang),
      });
      console.log('[AI Voice] handleAIUserInput – action from AI:', action);

      // Safeguard: si el usuario claramente pidió editar/eliminar/completar y la IA devolvió add_*, ignorar IA y usar parser local
      const isEditDeleteCompleteIntent = /editar|modificar|cambiar|actualizar|eliminar|borrar|quitar|completar|liquidar|cerrar|dar de baja|edit|delete|modify|update|remove|complete/i.test(text.trim());
      const isAddAction = action && ['add_debt', 'add_fixed_expense', 'add_asset', 'add_income'].includes(action.type);
      if (isEditDeleteCompleteIntent && isAddAction) {
        console.log('[AI Voice] handleAIUserInput – descartando add_* de IA (usuario pidió editar/eliminar/completar), usando parser local');
        action = null;
      }
    }

    // Fallback al parser local si la IA no devolvió acción
    if (!action) {
      action = parseTextToAIAction(text, debts, {
        commitments: voiceCommitments,
        calls: voiceCalls,
        fixedExpenses: fixedExpenses.map((e) => ({ id: e.id, name: e.name })),
        assets: assets.map((a) => ({ id: a.id, name: a.name })),
        incomes: incomes.map((i) => ({ id: i.id, name: i.name })),
      });
      console.log('[AI Voice] handleAIUserInput – action from parser:', action);
    }

      if (action) {
      console.log('[AI Voice] handleAIUserInput – executing action:', action.type, action.params);
      const result = await executeAIAction(action, { navigate });
      console.log('[AI Voice] handleAIUserInput – result:', result);
      if (result.success) {
        analytics.aiAssistantUsed(action.type);
      }
      if (action.type === 'toggle_hide_amounts') {
        toggleHideAmounts();
      }
      // Refresh lists so new/updated/deleted entries appear without reload
      if (result.success) {
        const debtRelated = ['add_debt', 'edit_debt', 'delete_debt', 'delete_all_debts', 'add_commitment', 'edit_commitment', 'delete_commitment', 'complete_commitment', 'add_call', 'edit_call', 'delete_call'].includes(action.type);
        const fixedExpenseRelated = ['add_fixed_expense', 'edit_fixed_expense', 'delete_fixed_expense', 'delete_all_fixed_expenses'].includes(action.type);
        const assetRelated = ['add_asset', 'edit_asset', 'delete_asset', 'delete_all_assets'].includes(action.type);
        const incomeRelated = ['add_income', 'edit_income', 'delete_income', 'delete_all_incomes'].includes(action.type);
        if (debtRelated) loadDebts();
        if (fixedExpenseRelated) loadFixedExpenses();
        if (assetRelated) loadAssets();
        if (incomeRelated) loadIncomes();
        updateUnreadNotificationsCount();
      }
      const message = getMessageForActionResult(action, result, lang);
      if (result.success && (action.type === 'get_overview' || action.type === 'get_debts')) {
        notify.saveAndToast(message, 'success', { duration: 6000 });
      } else if (result.success && (['add_debt', 'add_income', 'add_fixed_expense', 'add_asset'].includes(action.type) || ['delete_all_debts', 'delete_all_fixed_expenses', 'delete_all_assets', 'delete_all_incomes'].includes(action.type))) {
        notify.saveAndToast(message, 'success', { duration: 4000 });
      } else if (!result.success && result.error) {
        notify.saveAndToast(result.error, 'error');
      }
      updateUnreadNotificationsCount();
      setIsProcessing(false);
    } else {
      console.log('[AI Voice] handleAIUserInput – no action (parser returned null)');
      const apiError = getLastAIVoiceError();
      if (apiError === 'quota') {
        analytics.aiVoiceError('quota');
        notify.saveAndToast(
          lang === 'es'
            ? 'Cuota de OpenAI agotada. Revisa tu plan y facturación en platform.openai.com'
            : 'OpenAI quota exceeded. Check your plan and billing at platform.openai.com',
          'error',
          { duration: 8000 }
        );
      } else if (apiError === 'model_not_found') {
        analytics.aiVoiceError('model_not_found');
        notify.saveAndToast(
          lang === 'es'
            ? 'Modelo no disponible en tu cuenta. Prueba REACT_APP_OPENAI_MODEL=gpt-4o-mini en .env'
            : 'Model not available on your account. Try REACT_APP_OPENAI_MODEL=gpt-4o-mini in .env',
          'error',
          { duration: 6000 }
        );
      } else {
        analytics.aiVoiceError('not_understood');
        notify.saveAndToast(t('aiAgent.notUnderstood'), 'error');
      }
      updateUnreadNotificationsCount();
      setIsProcessing(false);
    }
  };

  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      // Permite pausas al hablar: no se corta hasta que el usuario pulse parar
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = i18n.language === 'es' ? 'es-ES' : 'en-US';

      recognition.onstart = () => {
        speechTranscriptRef.current = '';
        setAiInputText('');
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
          if (i < event.results.length - 1) fullTranscript += ' ';
        }
        speechTranscriptRef.current = fullTranscript;
        setAiInputText(fullTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [initializeSpeechRecognition]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      const transcript = speechTranscriptRef.current.trim();
      console.log('[AI Voice] stopListening – transcript:', transcript, 'length:', transcript.length);
      if (transcript) {
        handleAIUserInput(transcript);
      } else {
        console.log('[AI Voice] stopListening – transcript vacío, no se llama handleAIUserInput');
      }
      speechTranscriptRef.current = '';
    }
  };

  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiInputText.trim()) {
      handleAIUserInput(aiInputText);
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
            <motion.img
              src="/shopping.png"
              alt={t('dashboard.emptyStateAlt')}
              className="empty-state-image"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            />
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
                                    {debt.closedAt ? (
                                      <span className="debt-completed-badge debt-closed-badge">
                                        <Icon component={FaCheck} size={12} /> {t('dashboard.closed')}
                                      </span>
                                    ) : debt.totalLocal === 0 && debt.totalDollars === 0 ? (
                                      <span className="debt-completed-badge">
                                        <Icon component={FaCheck} size={12} /> {t('common.completed')}
                                      </span>
                                    ) : debt.inOrder ? (
                                      <span className="status-badge in-order">
                                        <Icon component={FaCheck} size={12} /> {t('dashboard.inOrder')}
                                      </span>
                                    ) : (
                                      <>
                                        <span className="status-badge not-in-order">
                                          <Icon component={FaTimes} size={12} /> {t('dashboard.notInOrder')}
                                        </span>
                                        {getOverdueCount(debt) > 0 && (
                                          <span className="debt-overdue-count">
                                            {t('dashboard.overdueCount', { count: getOverdueCount(debt) })}
                                          </span>
                                        )}
                                      </>
                                    )}
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
                                  {!hasPendingCommitments(debt) && (
                                    <motion.button
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      className="btn-complete-item"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/complete-debt/${debt.id}`);
                                      }}
                                      title={t('debt.markAsCompleted')}
                                    >
                                      <Icon component={FaCheck} />
                                    </motion.button>
                                  )}
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
                                        {editingField?.debtId === debt.id && editingField?.field === 'paymentDate' ? (
                                          <input
                                            type="date"
                                            value={editValue ? (editValue.includes('T') ? editValue.split('T')[0] : editValue) : ''}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => saveEdit(debt.id, 'paymentDate')}
                                            onKeyDown={(e) => {
                                              if (e.key === 'Enter') saveEdit(debt.id, 'paymentDate');
                                              if (e.key === 'Escape') cancelEdit();
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-edit-input"
                                            autoFocus
                                          />
                                        ) : (
                                          <span className="payment-value editable-field" onClick={(e) => {
                                            e.stopPropagation();
                                            const dateValue = debt.paymentDate ? (debt.paymentDate.includes('T') ? debt.paymentDate.split('T')[0] : debt.paymentDate) : '';
                                            startEditing(debt.id, 'paymentDate', dateValue || '', e);
                                          }}>
                                            {debt.paymentDate && debt.paymentDate.trim() !== '' ? formatDateLocal(debt.paymentDate) : t('dashboard.noPaymentDate')}
                                          </span>
                                        )}
                                      </div>
                                      {debt.type === 'tarjeta' && (
                                        <div className="payment-item">
                                          <span className="payment-label">{t('dashboard.cutDate')}</span>
                                          {editingField?.debtId === debt.id && editingField?.field === 'cutDate' ? (
                                            <input
                                              type="date"
                                              value={editValue ? (editValue.includes('T') ? editValue.split('T')[0] : editValue) : ''}
                                              onChange={(e) => setEditValue(e.target.value)}
                                              onBlur={() => saveEdit(debt.id, 'cutDate')}
                                              onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveEdit(debt.id, 'cutDate');
                                                if (e.key === 'Escape') cancelEdit();
                                              }}
                                              onClick={(e) => e.stopPropagation()}
                                              className="inline-edit-input"
                                              autoFocus
                                            />
                                          ) : (
                                            <span className="payment-value editable-field" onClick={(e) => {
                                              e.stopPropagation();
                                              const dateValue = debt.cutDate ? (debt.cutDate.includes('T') ? debt.cutDate.split('T')[0] : debt.cutDate) : '';
                                              startEditing(debt.id, 'cutDate', dateValue || '', e);
                                            }}>
                                              {debt.cutDate && debt.cutDate.trim() !== '' ? formatDateLocal(debt.cutDate) : t('dashboard.noCutDate')}
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

                                  {debt.commitments && debt.commitments.length > 0 && (
                                    <div className="debt-commitments">
                                      <h4>{t('dashboard.paymentCommitments')}</h4>
                                      <div className="commitments-list">
                                        {debt.commitments.map(commitment => (
                                          <div key={commitment.id} className="commitment-item">
                                            <div className="commitment-main">
                                              <div className="commitment-info">
                                                {editingCommitment?.debtId === debt.id && editingCommitment?.commitmentId === commitment.id && editingCommitment?.field === 'date' ? (
                                                  <input
                                                    type="date"
                                                    value={editValue.split('T')[0]}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => saveCommitmentEdit(debt.id, commitment.id, 'date')}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveCommitmentEdit(debt.id, commitment.id, 'date');
                                                      if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-edit-input"
                                                    autoFocus
                                                  />
                                                ) : (
                                                  <span 
                                                    className="commitment-date editable-field"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      startEditingCommitment(debt.id, commitment.id, 'date', commitment.date.split('T')[0], e);
                                                    }}
                                                  >
                                                    {formatDateLocal(commitment.date)}
                                                  </span>
                                                )}
                                                <span className={`commitment-status ${commitment.status}`}>
                                                  {commitment.status === 'completed' ? t('common.completed') : 
                                                   commitment.status === 'overdue' ? t('dashboard.overdue') : 
                                                   t('dashboard.pending')}
                                                </span>
                                              </div>
                                              <div className="commitment-amounts">
                                                {!hideAmounts && (
                                                  <>
                                                    {editingCommitment?.debtId === debt.id && editingCommitment?.commitmentId === commitment.id && editingCommitment?.field === 'amountLocal' ? (
                                                      <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => saveCommitmentEdit(debt.id, commitment.id, 'amountLocal')}
                                                        onKeyDown={(e) => {
                                                          if (e.key === 'Enter') saveCommitmentEdit(debt.id, commitment.id, 'amountLocal');
                                                          if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-edit-input"
                                                        autoFocus
                                                      />
                                                    ) : (
                                                      <span 
                                                        className="editable-field"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          startEditingCommitment(debt.id, commitment.id, 'amountLocal', commitment.amountLocal, e);
                                                        }}
                                                      >
                                                        {formatCurrency(commitment.amountLocal, debt.localCurrency)}
                                                      </span>
                                                    )}
                                                    {editingCommitment?.debtId === debt.id && editingCommitment?.commitmentId === commitment.id && editingCommitment?.field === 'amountDollars' ? (
                                                      <input
                                                        type="number"
                                                        inputMode="decimal"
                                                        step="0.01"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onBlur={() => saveCommitmentEdit(debt.id, commitment.id, 'amountDollars')}
                                                        onKeyDown={(e) => {
                                                          if (e.key === 'Enter') saveCommitmentEdit(debt.id, commitment.id, 'amountDollars');
                                                          if (e.key === 'Escape') cancelEdit();
                                                        }}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="inline-edit-input"
                                                        autoFocus
                                                      />
                                                    ) : (
                                                      <span 
                                                        className="editable-field"
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          startEditingCommitment(debt.id, commitment.id, 'amountDollars', commitment.amountDollars, e);
                                                        }}
                                                      >
                                                        {formatCurrency(commitment.amountDollars, 'USD')}
                                                      </span>
                                                    )}
                                                  </>
                                                )}
                                              </div>
                                            </div>
                                            <div className="commitment-notes-row">
                                              <div className="commitment-notes-container">
                                                {editingCommitment?.debtId === debt.id && editingCommitment?.commitmentId === commitment.id && editingCommitment?.field === 'notes' ? (
                                                  <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={() => saveCommitmentEdit(debt.id, commitment.id, 'notes')}
                                                    onKeyDown={(e) => {
                                                      if (e.key === 'Enter') saveCommitmentEdit(debt.id, commitment.id, 'notes');
                                                      if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="inline-edit-input"
                                                    autoFocus
                                                  />
                                                ) : (
                                                  <p 
                                                    className="commitment-notes editable-field"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      startEditingCommitment(debt.id, commitment.id, 'notes', commitment.notes || '', e);
                                                    }}
                                                  >
                                                    {commitment.notes || ''}
                                                  </p>
                                                )}
                                              </div>
                                              <div className="commitment-actions">
                                                <motion.button
                                                  className="btn-delete-item"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(t('deleteCommitment.confirm'))) {
                                                      navigate(`/delete-commitment/${debt.id}/${commitment.id}`);
                                                    }
                                                  }}
                                                  whileHover={{ scale: 1.1 }}
                                                  whileTap={{ scale: 0.9 }}
                                                >
                                                  <Icon component={FaTrash} />
                                                </motion.button>
                                                {commitment.status === 'pending' && (
                                                  <motion.button
                                                    className="btn-complete-item"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      navigate(`/complete-commitment/${debt.id}/${commitment.id}`);
                                                    }}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    title={t('commitment.markCompleted')}
                                                  >
                                                    <Icon component={FaCheck} />
                                                  </motion.button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {debt.callHistory && debt.callHistory.length > 0 && (
                                    <div className="debt-calls">
                                      <h4>{t('dashboard.callHistory')}</h4>
                                      <div className="calls-list">
                                        {debt.callHistory.map(call => (
                                          <div key={call.id} className="call-item">
                                            <div className="call-content">
                                              {editingCall?.debtId === debt.id && editingCall?.callId === call.id && editingCall?.field === 'date' ? (
                                                <input
                                                  type="date"
                                                  value={editValue.split('T')[0]}
                                                  onChange={(e) => setEditValue(e.target.value)}
                                                  onBlur={() => saveCallEdit(debt.id, call.id, 'date')}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveCallEdit(debt.id, call.id, 'date');
                                                    if (e.key === 'Escape') cancelEdit();
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="inline-edit-input"
                                                  autoFocus
                                                />
                                              ) : (
                                                <span 
                                                  className="call-date editable-field"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditingCall(debt.id, call.id, 'date', call.date.split('T')[0], e);
                                                  }}
                                                >
                                                  <Icon component={FaPhone} style={{ marginRight: '6px', fontSize: '12px' }} />
                                                  {formatDateLocal(call.date)}
                                                </span>
                                              )}
                                            </div>
                                            <div className="call-notes-row">
                                              {editingCall?.debtId === debt.id && editingCall?.callId === call.id && editingCall?.field === 'notes' ? (
                                                <input
                                                  type="text"
                                                  value={editValue}
                                                  onChange={(e) => setEditValue(e.target.value)}
                                                  onBlur={() => saveCallEdit(debt.id, call.id, 'notes')}
                                                  onKeyDown={(e) => {
                                                    if (e.key === 'Enter') saveCallEdit(debt.id, call.id, 'notes');
                                                    if (e.key === 'Escape') cancelEdit();
                                                  }}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className="inline-edit-input"
                                                  autoFocus
                                                />
                                              ) : (
                                                <p 
                                                  className="call-notes editable-field"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    startEditingCall(debt.id, call.id, 'notes', call.notes || '', e);
                                                  }}
                                                >
                                                  {call.notes}
                                                </p>
                                              )}
                                              <div className="call-actions">
                                                <motion.button
                                                  className="btn-delete-item"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (window.confirm(t('deleteCall.confirm'))) {
                                                      navigate(`/delete-call/${debt.id}/${call.id}`);
                                                    }
                                                  }}
                                                  whileHover={{ scale: 1.1 }}
                                                  whileTap={{ scale: 0.9 }}
                                                >
                                                  <Icon component={FaTrash} />
                                                </motion.button>
                                                {!debt.callCompleted && (
                                                  <motion.button
                                                    className="btn-complete-item"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const updatedDebt = {
                                                        ...debt,
                                                        callCompleted: true,
                                                        updatedAt: new Date().toISOString(),
                                                      };
                                                      storage.saveDebt(updatedDebt);
                                                      loadDebts();
                                                    }}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    title={t('debt.callCompleted')}
                                                  >
                                                    <Icon component={FaCheck} />
                                                  </motion.button>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  <div className="debt-actions-section">
                                    <motion.button
                                      className="btn-add-commitment"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/add-commitment/${debt.id}`);
                                      }}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      <Icon component={FaPlus} style={{ marginRight: '8px' }} />
                                      {t('dashboard.addCommitment')}
                                    </motion.button>
                                    <motion.button
                                      className="btn-add-call"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/add-call/${debt.id}`);
                                      }}
                                      whileHover={{ scale: 1.02 }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                      <Icon component={FaPhone} style={{ marginRight: '8px' }} />
                                      {t('dashboard.recordCall')}
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
            <motion.img
              src="/shopping.png"
              alt={t('dashboard.emptyStateAlt')}
              className="empty-state-image"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            />
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
                      <Icon component={FaShoppingCart} className="summary-icon" />
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
                      <div className="item-card" data-dragging={isDragging}>
                        <div className="item-header">
                          <div className="item-header-main">
                            <div className="item-content-row">
                              <div className="item-content">
                                <div className="item-header-info">
                                  <div className="item-icon-wrapper">
                                    <Icon component={getFixedExpenseIcon(expense.category)} className="item-main-icon" />
                                  </div>
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
                                      className="inline-edit-input"
                                      autoFocus
                                    />
                                  ) : (
                                    <h3 className="item-name editable-field" onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingFixedExpense(expense.id, 'name', expense.name, e);
                                    }}>
                                      {expense.name}
                                    </h3>
                                  )}
                                  {editingFixedExpense?.expenseId === expense.id && editingFixedExpense?.field === 'paymentDate' ? (
                                    <input
                                      type="date"
                                      value={editValue ? (editValue.includes('T') ? editValue.split('T')[0] : editValue) : ''}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => saveFixedExpenseEdit(expense.id, 'paymentDate')}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveFixedExpenseEdit(expense.id, 'paymentDate');
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-edit-input"
                                      autoFocus
                                    />
                                  ) : (
                                    <p className="item-payment-date editable-field" onClick={(e) => {
                                      e.stopPropagation();
                                      const dateValue = expense.paymentDate ? (expense.paymentDate.includes('T') ? expense.paymentDate.split('T')[0] : expense.paymentDate) : '';
                                      startEditingFixedExpense(expense.id, 'paymentDate', dateValue || '', e);
                                    }}>
                                      <Icon component={FaCalendarAlt} className="item-type-icon" />
                                      {expense.paymentDate && expense.paymentDate.trim() !== '' ? formatDateLocal(expense.paymentDate) : t('dashboard.noPaymentDate')}
                                    </p>
                                  )}
                                  <div className="item-type-row">
                                    {editingFixedExpense?.expenseId === expense.id && editingFixedExpense?.field === 'category' ? (
                                      <input
                                        type="text"
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={() => saveFixedExpenseEdit(expense.id, 'category')}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') saveFixedExpenseEdit(expense.id, 'category');
                                          if (e.key === 'Escape') cancelEdit();
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-edit-input"
                                        autoFocus
                                      />
                                    ) : (
                                      <p className="item-type editable-field" onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingFixedExpense(expense.id, 'category', expense.category || '', e);
                                      }}>
                                        <Icon component={FaTag} className="item-type-icon" />
                                        {expense.category ? (expense.category === 'other' ? t('dashboard.other') : t(`addFixedExpense.cat${expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}`)) : ''}
                                      </p>
                                    )}
                                  </div>
                                  {(() => {
                                    const { status, day } = getFixedExpenseStatus(expense);
                                    return (
                                      <div className="item-status-row">
                                        {status === 'upToDate' && (
                                          <span className="fixed-expense-badge fixed-expense-up-to-date">
                                            <Icon component={FaCheck} size={12} /> {t('dashboard.expenseUpToDate')}
                                          </span>
                                        )}
                                        {status === 'overdue' && (
                                          <span className="fixed-expense-badge fixed-expense-overdue">
                                            <Icon component={FaTimes} size={12} /> {t('dashboard.expenseOverdue')}
                                          </span>
                                        )}
                                        {status === 'dueDay' && day != null && day > 0 && (
                                          <span className="fixed-expense-badge fixed-expense-due-day">
                                            <Icon component={FaCalendarAlt} size={12} /> {t('dashboard.dueDay', { day })}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </div>
                              {!hideAmounts && (
                                <div className="item-amounts">
                                  <div className="item-header-actions-top item-header-actions-top-v2">
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
                                  <div className="summary-item">
                                    {editingFixedExpense?.expenseId === expense.id && editingFixedExpense?.field === 'amountLocal' ? (
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
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
                                      <span className="summary-value editable-field" onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingFixedExpense(expense.id, 'amountLocal', expense.amountLocal, e);
                                      }}>
                                        {formatCurrency(expense.amountLocal, expense.localCurrency)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="item-amounts-row">
                                    <div className="summary-item">
                                      {editingFixedExpense?.expenseId === expense.id && editingFixedExpense?.field === 'amountDollars' ? (
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          step="0.01"
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
                                        <span className="summary-value editable-field" onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingFixedExpense(expense.id, 'amountDollars', expense.amountDollars, e);
                                        }}>
                                          {formatCurrency(expense.amountDollars, 'USD')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="item-header-actions">
                                    {getFixedExpenseStatus(expense).status !== 'upToDate' && (
                                      <motion.button
                                        type="button"
                                        className="btn-mark-up-to-date"
                                        onClick={(e) => handleMarkFixedExpenseUpToDate(expense.id, e)}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        title={t('dashboard.markUpToDate')}
                                      >
                                        <Icon component={FaCheck} size={14} />
                                        <span>{t('dashboard.markUpToDate')}</span>
                                      </motion.button>
                                    )}
                                    <motion.button
                                      className="btn-delete"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(t('deleteFixedExpense.confirm'))) {
                                          storage.deleteFixedExpense(expense.id);
                                          loadFixedExpenses();
                                          notify.overviewUpdated();
                                        }
                                      }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Icon component={FaTrash} />
                                    </motion.button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
            <motion.img
              src="/shopping.png"
              alt={t('dashboard.emptyStateAlt')}
              className="empty-state-image"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            />
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
                      <div className="item-card" data-dragging={isDragging}>
                        <div className="item-header">
                          <div className="item-header-main">
                            <div className="item-content-row">
                              <div className="item-content">
                                <div className="item-header-info">
                                  <div className="item-icon-wrapper">
                                    <Icon component={getAssetIcon(asset.type)} className="item-main-icon" />
                                  </div>
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
                                      className="inline-edit-input"
                                      autoFocus
                                    />
                                  ) : (
                                    <h3 className="item-name editable-field" onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingAsset(asset.id, 'name', asset.name, e);
                                    }}>
                                      {asset.name}
                                    </h3>
                                  )}
                                  <div className="item-type-row">
                                    <p className="item-type">
                                      <Icon component={FaTag} className="item-type-icon" />
                                      {t(`dashboard.${asset.type}`)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {!hideAmounts && (
                                <div className="item-amounts">
                                  <div className="item-header-actions-top item-header-actions-top-v2">
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
                                  <div className="summary-item">
                                    {editingAsset?.assetId === asset.id && editingAsset?.field === 'valueLocal' ? (
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
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
                                      <span className="summary-value editable-field" onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingAsset(asset.id, 'valueLocal', asset.valueLocal, e);
                                      }}>
                                        {formatCurrency(asset.valueLocal, asset.localCurrency)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="item-amounts-row">
                                    <div className="summary-item">
                                      {editingAsset?.assetId === asset.id && editingAsset?.field === 'valueDollars' ? (
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          step="0.01"
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
                                        <span className="summary-value editable-field" onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingAsset(asset.id, 'valueDollars', asset.valueDollars, e);
                                        }}>
                                          {formatCurrency(asset.valueDollars, 'USD')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="item-header-actions">
                                    <motion.button
                                      className="btn-delete"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(t('deleteAsset.confirm'))) {
                                          storage.deleteAsset(asset.id);
                                          loadAssets();
                                          notify.overviewUpdated();
                                        }
                                      }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Icon component={FaTrash} />
                                    </motion.button>
                                    <motion.button
                                      className="btn-complete-item"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/complete-asset/${asset.id}`);
                                      }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                      title={t('asset.liquidate')}
                                    >
                                      <Icon component={FaCheck} />
                                    </motion.button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
            <motion.img
              src="/shopping.png"
              alt={t('dashboard.emptyStateAlt')}
              className="empty-state-image"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            />
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
                      <div className="item-card" data-dragging={isDragging}>
                        <div className="item-header">
                          <div className="item-header-main">
                            <div className="item-content-row">
                              <div className="item-content">
                                <div className="item-header-info">
                                  <div className="item-icon-wrapper">
                                    <Icon component={getIncomeIcon(income.type)} className="item-main-icon" />
                                  </div>
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
                                      className="inline-edit-input"
                                      autoFocus
                                    />
                                  ) : (
                                    <h3 className="item-name editable-field" onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingIncome(income.id, 'name', income.name, e);
                                    }}>
                                      {income.name}
                                    </h3>
                                  )}
                                  {editingIncome?.incomeId === income.id && editingIncome?.field === 'nextPaymentDate' ? (
                                    <input
                                      type="date"
                                      value={editValue ? (editValue.includes('T') ? editValue.split('T')[0] : editValue) : ''}
                                      onChange={(e) => setEditValue(e.target.value)}
                                      onBlur={() => saveIncomeEdit(income.id, 'nextPaymentDate')}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') saveIncomeEdit(income.id, 'nextPaymentDate');
                                        if (e.key === 'Escape') cancelEdit();
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-edit-input"
                                      autoFocus
                                    />
                                  ) : (
                                    <p className="item-payment-date editable-field" onClick={(e) => {
                                      e.stopPropagation();
                                      const dateValue = income.nextPaymentDate ? (income.nextPaymentDate.includes('T') ? income.nextPaymentDate.split('T')[0] : income.nextPaymentDate) : '';
                                      startEditingIncome(income.id, 'nextPaymentDate', dateValue || '', e);
                                    }}>
                                      <Icon component={FaCalendarAlt} className="item-type-icon" />
                                      {income.nextPaymentDate && income.nextPaymentDate.trim() !== '' ? formatDateLocal(income.nextPaymentDate) : t('dashboard.noPaymentDate')}
                                    </p>
                                  )}
                                  <div className="item-type-row">
                                    <p className="item-type">
                                      <Icon component={FaTag} className="item-type-icon" />
                                      {t(`dashboard.${income.type}`)}
                                    </p>
                                    <p className="item-frequency">
                                      <Icon component={FaCalendarAlt} className="item-type-icon" />
                                      {t(`dashboard.${income.frequency}`)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              {!hideAmounts && (
                                <div className="item-amounts">
                                  <div className="item-header-actions-top item-header-actions-top-v2">
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
                                  <div className="summary-item">
                                    {editingIncome?.incomeId === income.id && editingIncome?.field === 'amountLocal' ? (
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        step="0.01"
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
                                      <span className="summary-value editable-field" onClick={(e) => {
                                        e.stopPropagation();
                                        startEditingIncome(income.id, 'amountLocal', income.amountLocal, e);
                                      }}>
                                        {formatCurrency(income.amountLocal, income.localCurrency)}
                                      </span>
                                    )}
                                  </div>
                                  <div className="item-amounts-row">
                                    <div className="summary-item">
                                      {editingIncome?.incomeId === income.id && editingIncome?.field === 'amountDollars' ? (
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          step="0.01"
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
                                        <span className="summary-value editable-field" onClick={(e) => {
                                          e.stopPropagation();
                                          startEditingIncome(income.id, 'amountDollars', income.amountDollars, e);
                                        }}>
                                          {formatCurrency(income.amountDollars, 'USD')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="item-header-actions">
                                    <motion.button
                                      className="btn-delete"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm(t('deleteIncome.confirm'))) {
                                          storage.deleteIncome(income.id);
                                          loadIncomes();
                                          notify.overviewUpdated();
                                        }
                                      }}
                                      whileHover={{ scale: 1.1 }}
                                      whileTap={{ scale: 0.9 }}
                                    >
                                      <Icon component={FaTrash} />
                                    </motion.button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
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
      <Tour run={tourRun} onComplete={() => setTourRun(false)} />
      <NotificationsSidebar
        isOpen={isNotificationsOpen}
        onClose={() => {
          setIsNotificationsOpen(false);
          updateUnreadNotificationsCount();
        }}
      />
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
              onClick={() => setTourRun(true)}
              title={t('tour.startTour')}
            >
              <Icon component={FaQuestionCircle} />
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
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-profile btn-notifications"
              onClick={() => {
                setIsNotificationsOpen(true);
                updateUnreadNotificationsCount();
              }}
              title={t('notifications.title')}
            >
              <Icon component={FaBell} />
              {unreadNotificationsCount > 0 && (
                <span className="header-notification-badge">{unreadNotificationsCount}</span>
              )}
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
                      {fixedExpenses.length > 0 && (
                        <>
                          <div className="summary-section">
                            <div className="summary-card-header">
                              <Icon component={FaShoppingCart} className="summary-icon" />
                              <span className="summary-label">{t('dashboard.totalFixedExpenses')}</span>
                            </div>
                            <div className="summary-values">
                              <div className="summary-value">
                                <span className="summary-currency">{calculateFixedExpensesTotals().mostCommonCurrency}</span>
                                <span className="summary-amount">{formatCurrency(calculateFixedExpensesTotals().totalLocal, calculateFixedExpensesTotals().mostCommonCurrency)}</span>
                              </div>
                              <div className="summary-value">
                                <span className="summary-currency">USD</span>
                                <span className="summary-amount">{formatCurrency(calculateFixedExpensesTotals().totalDollars, 'USD')}</span>
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
                      {incomes.length > 0 && (
                        <>
                          <div className="summary-section">
                            <div className="summary-card-header">
                              <Icon component={FaMoneyBillWave} className="summary-icon" />
                              <span className="summary-label">{t('dashboard.totalIncomes')}</span>
                            </div>
                            <div className="summary-values">
                              <div className="summary-value">
                                <span className="summary-currency">{calculateIncomesTotals().mostCommonCurrency}</span>
                                <span className="summary-amount">{formatCurrency(calculateIncomesTotals().totalLocal, calculateIncomesTotals().mostCommonCurrency)}</span>
                              </div>
                              <div className="summary-value">
                                <span className="summary-currency">USD</span>
                                <span className="summary-amount">{formatCurrency(calculateIncomesTotals().totalDollars, 'USD')}</span>
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
          </motion.div>
        )}

        {/* AI Agent Section – Premium: habilitado; Free: bloqueado con CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className={`ai-agent-section ${!isPremium ? 'ai-agent-section-locked' : ''}`}
        >
          {isPremium ? (
            <form onSubmit={handleAISubmit} className="ai-agent-input-container">
              <input
                type="text"
                value={aiInputText}
                onChange={(e) => setAiInputText(e.target.value)}
                placeholder={t('aiAgent.placeholder')}
                className="ai-agent-input"
                disabled={isProcessing}
              />
              <motion.button
                type="submit"
                className="ai-agent-send"
                disabled={!aiInputText.trim() || isProcessing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon component={FaPaperPlane} />
              </motion.button>
              <motion.button
                type="button"
                className={`ai-agent-mic ${isListening ? 'listening' : ''}`}
                onClick={isListening ? stopListening : startListening}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                title={isListening ? t('aiAgent.stopListening') : t('aiAgent.startListening')}
                disabled={isProcessing}
              >
                <Icon component={isListening ? FaMicrophoneSlash : FaMicrophone} />
              </motion.button>
            </form>
          ) : (
            <div className="ai-agent-locked">
              <div className="ai-agent-locked-row">
                <Icon component={FaMicrophone} className="ai-agent-locked-icon" />
                <div className="card-lock">
                  <motion.button
                    type="button"
                    className="ai-agent-locked-cta"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      analytics.aiAssistantLockedClick('dashboard');
                      navigate('/subscription', { state: { from: 'dashboard' } });
                    }}
                  >
                    {t('subscription.aiLockedMessage')}
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Menu de 4 botones */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="dashboard-menu"
        >
          <button
            className={`menu-button ${activeTab === 'debt' ? 'active' : ''}`}
            onClick={() => setActiveTab('debt')}
          >
            <div className="menu-button-icon">
              <Icon component={FaFileInvoiceDollar} />
            </div>
            <span className="menu-button-text">{t('dashboard.debt')}</span>
          </button>
          <button
            className={`menu-button ${activeTab === 'fixedExpenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('fixedExpenses')}
          >
            <div className="menu-button-icon">
              <Icon component={FaMoneyBillWave} />
            </div>
            <span className="menu-button-text">{t('dashboard.fixedExpenses')}</span>
          </button>
          <button
            className={`menu-button ${activeTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            <div className="menu-button-icon">
              <Icon component={FaLandmark} />
            </div>
            <span className="menu-button-text">{t('dashboard.assets')}</span>
          </button>
          <button
            className={`menu-button ${activeTab === 'incomes' ? 'active' : ''}`}
            onClick={() => setActiveTab('incomes')}
          >
            <div className="menu-button-icon">
              <Icon component={FaChartLine} />
            </div>
            <span className="menu-button-text">{t('dashboard.incomes')}</span>
          </button>
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

      {/* FAB buttons for adding items */}
      <AnimatePresence>
        {activeTab === 'debt' && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fab-add fab-add-debt"
            onClick={() => navigate('/add-debt')}
          >
            <Icon component={FaPlus} />
          </motion.button>
        )}
        {activeTab === 'fixedExpenses' && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fab-add"
            onClick={() => navigate('/add-fixed-expense')}
          >
            <Icon component={FaPlus} />
          </motion.button>
        )}
        {activeTab === 'assets' && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fab-add"
            onClick={() => navigate('/add-asset')}
          >
            <Icon component={FaPlus} />
          </motion.button>
        )}
        {activeTab === 'incomes' && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="fab-add"
            onClick={() => navigate('/add-income')}
          >
            <Icon component={FaPlus} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
