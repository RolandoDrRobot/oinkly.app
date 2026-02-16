import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaMicrophone, FaMicrophoneSlash, FaRobot, FaTimes, FaPaperPlane } from 'react-icons/fa';
import { storage } from '../utils/storage';
import { Debt } from '../types';
import './AIAgent.css';

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
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

interface AIAgentProps {
  debts: Debt[];
  onAction: (action: AgentAction) => void;
  isOpen: boolean;
  onClose: () => void;
}

export interface AgentAction {
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

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const AIAgent: React.FC<AIAgentProps> = ({ debts, onAction, isOpen, onClose }) => {
  const { t, i18n } = useTranslation();
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = t('aiAgent.welcome');
      setMessages([{ role: 'assistant', content: welcomeMessage }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const calculateTotals = () => {
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

  const parseCommand = (text: string): AgentAction | null => {
    const lowerText = text.toLowerCase().trim();

    // Add debt / create items: only via AI chat (no navigate to add screens)
    if (lowerText.includes('agregar deuda') || lowerText.includes('add debt') || lowerText.includes('nueva deuda') || lowerText.includes('new debt')) {
      return { type: 'show_info', params: { value: t('aiAgent.addViaChat') } };
    }

    // Show overview/info
    if (lowerText.includes('resumen') || lowerText.includes('overview') || lowerText.includes('total') || lowerText.includes('cuánto debo') || lowerText.includes('how much')) {
      const totals = calculateTotals();
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

  const handleUserInput = async (text: string) => {
    if (!text.trim()) return;

    const userMessage = { role: 'user' as const, content: text };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsProcessing(true);

    // Parse and execute command
    const action = parseCommand(text);

    if (action) {
      onAction(action);
      
      // Generate response
      let response = '';
      switch (action.type) {
        case 'navigate':
          response = t('aiAgent.navigating', { route: action.params?.route });
          break;
        case 'add_commitment':
          response = t('aiAgent.commitmentAdded');
          break;
        case 'complete_commitment':
          response = t('aiAgent.commitmentCompleted');
          break;
        case 'delete_debt':
          response = t('aiAgent.debtDeleted');
          break;
        case 'record_call':
          response = t('aiAgent.callRecorded');
          break;
        case 'toggle_hide_amounts':
          response = t('aiAgent.amountsToggled');
          break;
        case 'show_info':
          response = action.params?.value || '';
          break;
        default:
          response = t('aiAgent.actionExecuted');
      }
      
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        setIsProcessing(false);
      }, 500);
    } else {
      // No command recognized
      const response = t('aiAgent.notUnderstood');
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        setIsProcessing(false);
      }, 500);
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
        setInputText(transcript);
        handleUserInput(transcript);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim()) {
      handleUserInput(inputText);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="ai-agent-overlay"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="ai-agent-container"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="ai-agent-header">
            <div className="ai-agent-title">
              <Icon component={FaRobot} size={20} />
              <span>{t('aiAgent.title')}</span>
            </div>
            <button className="ai-agent-close" onClick={onClose}>
              <Icon component={FaTimes} />
            </button>
          </div>

          <div className="ai-agent-messages">
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`ai-message ${message.role}`}
              >
                <div className="ai-message-content">{message.content}</div>
              </motion.div>
            ))}
            {isProcessing && (
              <div className="ai-message assistant">
                <div className="ai-message-content">
                  <span className="ai-typing">...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="ai-agent-input-container">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('aiAgent.placeholder')}
              className="ai-agent-input"
              disabled={isProcessing}
            />
            <motion.button
              type="button"
              className={`ai-agent-mic ${isListening ? 'listening' : ''}`}
              onClick={isListening ? stopListening : startListening}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              title={isListening ? t('aiAgent.stopListening') : t('aiAgent.startListening')}
            >
              <Icon component={isListening ? FaMicrophoneSlash : FaMicrophone} />
            </motion.button>
            <motion.button
              type="submit"
              className="ai-agent-send"
              disabled={!inputText.trim() || isProcessing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Icon component={FaPaperPlane} />
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AIAgent;
