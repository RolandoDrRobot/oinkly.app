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
  FaEye,
  FaEyeSlash,
  FaStar,
  FaMicrophone,
  FaMicrophoneSlash,
  FaPaperPlane
} from 'react-icons/fa';
// import { useAuth } from '../context/AuthContext'; // Reserved for future use
import { Debt, PaymentCommitment, FixedExpense, Asset, Income } from '../types';
import { storage } from '../utils/storage';
import { notify } from '../utils/notifications';
import SortableDebtCard from '../components/SortableDebtCard';
import Tour from '../components/Tour';
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

interface AgentAction {
  type: 'add_debt' | 'add_commitment' | 'complete_commitment' | 'delete_debt' | 'edit_debt' | 'record_call' | 'navigate' | 'toggle_hide_amounts' | 'show_info' | 'calculate';
  params?: {
    debtId?: string;
    debtName?: string;
    amount?: number;
    currency?: string;
    date?: string;
    notes?: string;
    route?: string;
    field?: string;
    value?: any;
  };
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
  const [editValue, setEditValue] = useState<string>('');
  const [hideAmounts, setHideAmounts] = useState<boolean>(() => {
    const saved = localStorage.getItem('hideAmounts');
    return saved === 'true';
  });
  const [tourRun, setTourRun] = useState(false);
  // AI Agent states
  const [isListening, setIsListening] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // Modal states for adding new items
  const [showAddModal, setShowAddModal] = useState<'fixedExpense' | 'asset' | 'income' | null>(null);
  // const { user, logout } = useAuth(); // Reserved for future use
  const navigate = useNavigate();

  useEffect(() => {
    loadDebts();
    loadFixedExpenses();
    loadAssets();
    loadIncomes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadFixedExpenses = () => {
    const expenses = storage.getFixedExpenses();
    setFixedExpenses(expenses);
  };

  const loadAssets = () => {
    const assetsData = storage.getAssets();
    setAssets(assetsData);
  };

  const loadIncomes = () => {
    const incomesData = storage.getIncomes();
    setIncomes(incomesData);
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

  // AI Agent functions
  const calculateAITotals = () => {
    const allDebts = storage.getDebts();
    let totalLocal = 0;
    let totalDollars = 0;
    let monthlyLocal = 0;
    let monthlyDollars = 0;
    const currencyCount: { [key: string]: number } = {};

    allDebts.forEach(debt => {
      totalLocal += debt.totalLocal || 0;
      totalDollars += debt.totalDollars || 0;
      monthlyLocal += debt.localFee || 0;
      monthlyDollars += debt.dollarFee || 0;
      
      const currency = debt.localCurrency || storage.getLocalCurrency();
      currencyCount[currency] = (currencyCount[currency] || 0) + 1;
    });

    const mostCommonCurrency = Object.keys(currencyCount).reduce((a, b) =>
      currencyCount[a] > currencyCount[b] ? a : b, storage.getLocalCurrency());

    return {
      totalLocal,
      totalDollars,
      monthlyLocal,
      monthlyDollars,
      mostCommonCurrency,
    };
  };

  const parseAICommand = (text: string): AgentAction | null => {
    const lowerText = text.toLowerCase().trim();

    // Add debt
    if (lowerText.includes('agregar deuda') || lowerText.includes('add debt') || lowerText.includes('nueva deuda') || lowerText.includes('new debt')) {
      return { type: 'navigate', params: { route: '/add-debt' } };
    }

    // Show overview/info
    if (lowerText.includes('resumen') || lowerText.includes('overview') || lowerText.includes('total') || lowerText.includes('cuánto debo') || lowerText.includes('how much')) {
      const totals = calculateAITotals();
      const response = t('aiAgent.overviewResponse', {
        totalLocal: totals.totalLocal.toLocaleString(),
        currency: totals.mostCommonCurrency,
        totalDollars: totals.totalDollars.toLocaleString(),
        monthlyLocal: totals.monthlyLocal.toLocaleString(),
        monthlyDollars: totals.monthlyDollars.toLocaleString(),
      });
      return { type: 'show_info', params: { value: response } };
    }

    // Toggle hide amounts
    if (lowerText.includes('ocultar montos') || lowerText.includes('hide amounts') || lowerText.includes('mostrar montos') || lowerText.includes('show amounts')) {
      return { type: 'toggle_hide_amounts' };
    }

    // Navigate to about
    if (lowerText.includes('sobre') || lowerText.includes('about') || lowerText.includes('método') || lowerText.includes('method')) {
      return { type: 'navigate', params: { route: '/about' } };
    }

    // Navigate to profile
    if (lowerText.includes('perfil') || lowerText.includes('profile')) {
      return { type: 'navigate', params: { route: '/profile' } };
    }

    // Add commitment to a debt
    const commitmentMatch = lowerText.match(/(?:agregar|add|crear|create).*?(?:compromiso|commitment).*?(?:para|to|de|for)?\s*(.+?)(?:\s+con|\s+with|\s+de|\s+of)?\s*(\d+)/i);
    if (commitmentMatch) {
      const debtName = commitmentMatch[1]?.trim();
      const amount = parseFloat(commitmentMatch[2]);
      const debt = debts.find(d => d.name.toLowerCase().includes(debtName.toLowerCase()));
      if (debt && amount) {
        return {
          type: 'add_commitment',
          params: { debtId: debt.id, amount: amount },
        };
      }
    }

    // Complete commitment
    if (lowerText.includes('completar compromiso') || lowerText.includes('complete commitment') || lowerText.includes('pago realizado') || lowerText.includes('payment made')) {
      const debtMatch = lowerText.match(/(?:para|to|de|for)?\s*(.+?)(?:\s+compromiso|\s+commitment)?/i);
      if (debtMatch) {
        const debtName = debtMatch[1]?.trim();
        const debt = debts.find(d => d.name.toLowerCase().includes(debtName.toLowerCase()));
        if (debt && debt.commitments && debt.commitments.length > 0) {
          const pendingCommitment = debt.commitments.find(c => c.status === 'pending');
          if (pendingCommitment) {
            return {
              type: 'complete_commitment',
              params: { debtId: debt.id },
            };
          }
        }
      }
    }

    // Delete debt
    if (lowerText.includes('eliminar deuda') || lowerText.includes('delete debt') || lowerText.includes('borrar deuda')) {
      const debtMatch = lowerText.match(/(?:deuda|debt)?\s*(.+?)$/i);
      if (debtMatch) {
        const debtName = debtMatch[1]?.trim();
        const debt = debts.find(d => d.name.toLowerCase().includes(debtName.toLowerCase()));
        if (debt) {
          return {
            type: 'delete_debt',
            params: { debtId: debt.id },
          };
        }
      }
    }

    // Record call
    if (lowerText.includes('registrar llamada') || lowerText.includes('record call') || lowerText.includes('llamada')) {
      const debtMatch = lowerText.match(/(?:para|to|de|for)?\s*(.+?)$/i);
      if (debtMatch) {
        const debtName = debtMatch[1]?.trim();
        const debt = debts.find(d => d.name.toLowerCase().includes(debtName.toLowerCase()));
        if (debt) {
          return {
            type: 'record_call',
            params: { debtId: debt.id },
          };
        }
      }
    }

    return null;
  };

  const handleAIAction = (action: AgentAction) => {
    switch (action.type) {
      case 'navigate':
        if (action.params?.route) {
          navigate(action.params.route);
        }
        break;
      case 'add_commitment':
        if (action.params?.debtId) {
          navigate(`/add-commitment/${action.params.debtId}`);
        }
        break;
      case 'complete_commitment':
        if (action.params?.debtId) {
          const debt = debts.find(d => d.id === action.params?.debtId);
          if (debt) {
            const pendingCommitment = debt.commitments?.find(c => c.status === 'pending');
            if (pendingCommitment) {
              navigate(`/complete-commitment/${debt.id}/${pendingCommitment.id}`);
            }
          }
        }
        break;
      case 'delete_debt':
        if (action.params?.debtId) {
          navigate(`/delete-debt/${action.params.debtId}`);
        }
        break;
      case 'record_call':
        if (action.params?.debtId) {
          navigate(`/add-call/${action.params.debtId}`);
        }
        break;
      case 'toggle_hide_amounts':
        toggleHideAmounts();
        break;
      case 'show_info':
        // Info is already shown in the chat
        break;
      default:
        break;
    }
  };

  const handleAIUserInput = async (text: string) => {
    if (!text.trim()) return;

    setAiInputText('');
    setIsProcessing(true);

    // Parse and execute command
    const action = parseAICommand(text);

    if (action) {
      handleAIAction(action);
      setIsProcessing(false);
    } else {
      // No command recognized
      setIsProcessing(false);
    }
  };

  const initializeSpeechRecognition = useCallback(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = i18n.language === 'es' ? 'es-ES' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setAiInputText(transcript);
        handleAIUserInput(transcript);
        setIsListening(false);
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

  // Render functions for each screen - Deuda screen uses the existing content below

  const renderFixedExpensesScreen = () => {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <h2>{t('dashboard.fixedExpenses') || 'Gastos Fijos'}</h2>
          <motion.button
            className="btn-add"
            onClick={() => setShowAddModal('fixedExpense')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon component={FaPlus} />
            {t('common.add')}
          </motion.button>
        </div>
        {fixedExpenses.length === 0 ? (
          <div className="empty-state">
            <p>{t('dashboard.noFixedExpenses') || 'No hay gastos fijos'}</p>
          </div>
        ) : (
          <div className="items-list">
            {fixedExpenses.map(expense => (
              <div key={expense.id} className="item-card">
                <h3>{expense.name}</h3>
                {!hideAmounts && (
                  <div className="item-amounts">
                    <span>{formatCurrency(expense.amountLocal, expense.localCurrency)}</span>
                    <span>{formatCurrency(expense.amountDollars, 'USD')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderAssetsScreen = () => {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <h2>{t('dashboard.assets') || 'Activos'}</h2>
          <motion.button
            className="btn-add"
            onClick={() => setShowAddModal('asset')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon component={FaPlus} />
            {t('common.add')}
          </motion.button>
        </div>
        {assets.length === 0 ? (
          <div className="empty-state">
            <p>{t('dashboard.noAssets') || 'No hay activos'}</p>
          </div>
        ) : (
          <div className="items-list">
            {assets.map(asset => (
              <div key={asset.id} className="item-card">
                <h3>{asset.name}</h3>
                <span className="item-type">{asset.type}</span>
                {!hideAmounts && (
                  <div className="item-amounts">
                    <span>{formatCurrency(asset.valueLocal, asset.localCurrency)}</span>
                    <span>{formatCurrency(asset.valueDollars, 'USD')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderIncomesScreen = () => {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <h2>{t('dashboard.incomes') || 'Ingresos'}</h2>
          <motion.button
            className="btn-add"
            onClick={() => setShowAddModal('income')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon component={FaPlus} />
            {t('common.add')}
          </motion.button>
        </div>
        {incomes.length === 0 ? (
          <div className="empty-state">
            <p>{t('dashboard.noIncomes') || 'No hay ingresos'}</p>
          </div>
        ) : (
          <div className="items-list">
            {incomes.map(income => (
              <div key={income.id} className="item-card">
                <h3>{income.name}</h3>
                <span className="item-type">{income.type} - {income.frequency}</span>
                {!hideAmounts && (
                  <div className="item-amounts">
                    <span>{formatCurrency(income.amountLocal, income.localCurrency)}</span>
                    <span>{formatCurrency(income.amountDollars, 'USD')}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
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
              onClick={() => setTourRun(true)}
              title={t('tour.startTour')}
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

        {/* AI Agent Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="ai-agent-section"
        >
          <h3 className="ai-agent-section-title">{t('aiAgent.title')}</h3>
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
            <span className="menu-button-text">Deuda</span>
          </button>
          <button
            className={`menu-button ${activeTab === 'fixedExpenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('fixedExpenses')}
          >
            <div className="menu-button-icon">
              <Icon component={FaMoneyBillWave} />
            </div>
            <span className="menu-button-text">Gastos</span>
          </button>
          <button
            className={`menu-button ${activeTab === 'assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('assets')}
          >
            <div className="menu-button-icon">
              <Icon component={FaLandmark} />
            </div>
            <span className="menu-button-text">Activos</span>
          </button>
          <button
            className={`menu-button ${activeTab === 'incomes' ? 'active' : ''}`}
            onClick={() => setActiveTab('incomes')}
          >
            <div className="menu-button-icon">
              <Icon component={FaChartLine} />
            </div>
            <span className="menu-button-text">Ingresos</span>
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
                        <motion.img
                          src="/shopping.png"
                          alt="Empty state"
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
                        <motion.p
                          className="empty-subtitle"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.6 }}
                        >
                          {t('dashboard.noDebtsSubtitle')}
                        </motion.p>
                        <motion.button
                          className="btn-add-first-debt"
                          onClick={() => navigate('/add-debt')}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.7 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Icon component={FaPlus} style={{ marginRight: '8px' }} />
                          {t('dashboard.addFirstDebt')}
                        </motion.button>
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
                                                      {hideAmounts ? '••••' : formatCurrency(debt.localFee, debt.localCurrency)}
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
                                              </div>
                                            </div>

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
                                              <motion.button
                                                className="btn-edit-debt"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  navigate(`/edit-debt/${debt.id}`);
                                                }}
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                              >
                                                <Icon component={FaEdit} style={{ marginRight: '8px' }} />
                                                {t('common.edit')}
                                              </motion.button>
                                            </div>

                                            {debt.commitments && debt.commitments.length > 0 && (
                                              <div className="debt-commitments">
                                                <h4>{t('dashboard.paymentCommitments')}</h4>
                                                <div className="commitments-list">
                                                  {debt.commitments.map(commitment => (
                                                    <div key={commitment.id} className="commitment-item">
                                                      <div className="commitment-info">
                                                        <span className="commitment-date">{new Date(commitment.date).toLocaleDateString()}</span>
                                                        <span className={`commitment-status ${commitment.status}`}>
                                                          {commitment.status === 'completed' ? t('common.completed') : 
                                                           commitment.status === 'overdue' ? t('dashboard.overdue') : 
                                                           t('dashboard.pending')}
                                                        </span>
                                                      </div>
                                                      <div className="commitment-amounts">
                                                        {!hideAmounts && (
                                                          <>
                                                            <span>{formatCurrency(commitment.amountLocal, debt.localCurrency)}</span>
                                                            <span>{formatCurrency(commitment.amountDollars, 'USD')}</span>
                                                          </>
                                                        )}
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
                                                      <span className="call-date">{new Date(call.date).toLocaleDateString()}</span>
                                                      <p className="call-notes">{call.notes}</p>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
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
            className="fab-add"
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
            onClick={() => setShowAddModal('fixedExpense')}
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
            onClick={() => setShowAddModal('asset')}
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
            onClick={() => setShowAddModal('income')}
          >
            <Icon component={FaPlus} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Modals for adding items */}
      <AnimatePresence>
        {showAddModal === 'fixedExpense' && (
          <AddFixedExpenseModal
            onClose={() => setShowAddModal(null)}
            onSave={(expense) => {
              storage.saveFixedExpense(expense);
              loadFixedExpenses();
              setShowAddModal(null);
            }}
          />
        )}
        {showAddModal === 'asset' && (
          <AddAssetModal
            onClose={() => setShowAddModal(null)}
            onSave={(asset) => {
              storage.saveAsset(asset);
              loadAssets();
              setShowAddModal(null);
            }}
          />
        )}
        {showAddModal === 'income' && (
          <AddIncomeModal
            onClose={() => setShowAddModal(null)}
            onSave={(income) => {
              storage.saveIncome(income);
              loadIncomes();
              setShowAddModal(null);
            }}
          />
        )}
      </AnimatePresence>

    </motion.div>
  );
};

// Modal Components
const AddFixedExpenseModal: React.FC<{
  onClose: () => void;
  onSave: (expense: FixedExpense) => void;
}> = ({ onClose, onSave }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [amountLocal, setAmountLocal] = useState('');
  const [amountDollars, setAmountDollars] = useState('');
  const [category, setCategory] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const expense: FixedExpense = {
      id: Date.now().toString(),
      name,
      amountLocal: parseFloat(amountLocal) || 0,
      amountDollars: parseFloat(amountDollars) || 0,
      localCurrency: storage.getLocalCurrency(),
      category: category || undefined,
      dueDate: dueDate || undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(expense);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{t('dashboard.addFixedExpense') || 'Agregar Gasto Fijo'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t('dashboard.expenseName') || 'Nombre del gasto'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder={`${storage.getLocalCurrency()} Amount`}
            value={amountLocal}
            onChange={(e) => setAmountLocal(e.target.value)}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="USD Amount"
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder={t('dashboard.category') || 'Categoría (opcional)'}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
          <input
            type="number"
            min="1"
            max="31"
            placeholder={t('dashboard.dueDate') || 'Día de vencimiento (1-31)'}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <textarea
            placeholder={t('dashboard.notes') || 'Notas (opcional)'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <div className="modal-actions">
            <button type="button" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit">{t('common.save')}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const AddAssetModal: React.FC<{
  onClose: () => void;
  onSave: (asset: Asset) => void;
}> = ({ onClose, onSave }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<Asset['type']>('other');
  const [valueLocal, setValueLocal] = useState('');
  const [valueDollars, setValueDollars] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const asset: Asset = {
      id: Date.now().toString(),
      name,
      type,
      valueLocal: parseFloat(valueLocal) || 0,
      valueDollars: parseFloat(valueDollars) || 0,
      localCurrency: storage.getLocalCurrency(),
      purchaseDate: purchaseDate || undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(asset);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{t('dashboard.addAsset') || 'Agregar Activo'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t('dashboard.assetName') || 'Nombre del activo'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select value={type} onChange={(e) => setType(e.target.value as Asset['type'])} required>
            <option value="property">{t('dashboard.property') || 'Propiedad'}</option>
            <option value="vehicle">{t('dashboard.vehicle') || 'Vehículo'}</option>
            <option value="investment">{t('dashboard.investment') || 'Inversión'}</option>
            <option value="savings">{t('dashboard.savings') || 'Ahorros'}</option>
            <option value="other">{t('dashboard.other') || 'Otro'}</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder={`${storage.getLocalCurrency()} Value`}
            value={valueLocal}
            onChange={(e) => setValueLocal(e.target.value)}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="USD Value"
            value={valueDollars}
            onChange={(e) => setValueDollars(e.target.value)}
            required
          />
          <input
            type="date"
            placeholder={t('dashboard.purchaseDate') || 'Fecha de compra'}
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
          <textarea
            placeholder={t('dashboard.notes') || 'Notas (opcional)'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <div className="modal-actions">
            <button type="button" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit">{t('common.save')}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

const AddIncomeModal: React.FC<{
  onClose: () => void;
  onSave: (income: Income) => void;
}> = ({ onClose, onSave }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [type, setType] = useState<Income['type']>('salary');
  const [frequency, setFrequency] = useState<Income['frequency']>('monthly');
  const [amountLocal, setAmountLocal] = useState('');
  const [amountDollars, setAmountDollars] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const income: Income = {
      id: Date.now().toString(),
      name,
      type,
      frequency,
      amountLocal: parseFloat(amountLocal) || 0,
      amountDollars: parseFloat(amountDollars) || 0,
      localCurrency: storage.getLocalCurrency(),
      nextPaymentDate: nextPaymentDate || undefined,
      notes: notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSave(income);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{t('dashboard.addIncome') || 'Agregar Ingreso'}</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder={t('dashboard.incomeName') || 'Nombre del ingreso'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <select value={type} onChange={(e) => setType(e.target.value as Income['type'])} required>
            <option value="salary">{t('dashboard.salary') || 'Salario'}</option>
            <option value="freelance">{t('dashboard.freelance') || 'Freelance'}</option>
            <option value="investment">{t('dashboard.investment') || 'Inversión'}</option>
            <option value="rental">{t('dashboard.rental') || 'Alquiler'}</option>
            <option value="other">{t('dashboard.other') || 'Otro'}</option>
          </select>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as Income['frequency'])} required>
            <option value="monthly">{t('dashboard.monthly') || 'Mensual'}</option>
            <option value="weekly">{t('dashboard.weekly') || 'Semanal'}</option>
            <option value="biweekly">{t('dashboard.biweekly') || 'Quincenal'}</option>
            <option value="yearly">{t('dashboard.yearly') || 'Anual'}</option>
            <option value="one-time">{t('dashboard.oneTime') || 'Una vez'}</option>
          </select>
          <input
            type="number"
            step="0.01"
            placeholder={`${storage.getLocalCurrency()} Amount`}
            value={amountLocal}
            onChange={(e) => setAmountLocal(e.target.value)}
            required
          />
          <input
            type="number"
            step="0.01"
            placeholder="USD Amount"
            value={amountDollars}
            onChange={(e) => setAmountDollars(e.target.value)}
            required
          />
          <input
            type="date"
            placeholder={t('dashboard.nextPaymentDate') || 'Próxima fecha de pago'}
            value={nextPaymentDate}
            onChange={(e) => setNextPaymentDate(e.target.value)}
          />
          <textarea
            placeholder={t('dashboard.notes') || 'Notas (opcional)'}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <div className="modal-actions">
            <button type="button" onClick={onClose}>{t('common.cancel')}</button>
            <button type="submit">{t('common.save')}</button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default Dashboard;
