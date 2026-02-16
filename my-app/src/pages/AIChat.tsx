import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaPaperPlane, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import { executeAIAction, parseTextToAIAction, getMessageForActionResult, interpretWithAI, isAIVoiceEnabled, getLastAIVoiceError, getSummaryText } from '../api';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import { analytics } from '../utils/analytics';
import { notify } from '../utils/notifications';
import './AIChat.css';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) =>
  Component ? <Component {...props} /> : null;

const CHAT_STORAGE_KEY = 'aiChatHistory';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const AI_AVATAR_URL = `${process.env.PUBLIC_URL || ''}/img/ai.png`;

export interface AIChatProps {
  /** When set, chat is shown in a modal: show close button and use this for executeAIAction navigation */
  onClose?: () => void;
  /** Override navigate (e.g. close modal then navigate). Used when onClose is set. */
  navigateOverride?: (path: string) => void;
}

const AIChat: React.FC<AIChatProps> = ({ onClose, navigateOverride }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const effectiveNavigate = useMemo(
    () => navigateOverride ?? ((path: string) => navigate(path)),
    [navigateOverride, navigate]
  );
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[];
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [aiInputText, setAiInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<{ start(): void; stop(): void } | null>(null);
  const speechTranscriptRef = useRef('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lang = i18n.language.startsWith('es') ? 'es' : 'en';

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const debts = storage.getDebts();
  const fixedExpenses = storage.getFixedExpenses();
  const assets = storage.getAssets();
  const incomes = storage.getIncomes();
  const voiceCommitments = debts.flatMap((d) =>
    (d.commitments || []).map((c) => ({ debtId: d.id, debtName: d.name, commitmentId: c.id, date: c.date }))
  );
  const voiceCalls = debts.flatMap((d) =>
    (d.callHistory || []).map((c) => ({ debtId: d.id, debtName: d.name, callId: c.id, date: c.date }))
  );

  const handleAIUserInput = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      setAiInputText('');
      setIsProcessing(true);
      setMessages((prev) => [...prev, { role: 'user', text: text.trim() }]);

      let action = null;
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
        const isEditDeleteCompleteIntent = /editar|modificar|cambiar|actualizar|eliminar|borrar|quitar|completar|liquidar|cerrar|dar de baja|edit|delete|modify|update|remove|complete/i.test(text.trim());
        const isAddAction = action && ['add_debt', 'add_fixed_expense', 'add_asset', 'add_income'].includes(action.type);
        if (isEditDeleteCompleteIntent && isAddAction) action = null;
      }

      if (!action) {
        action = parseTextToAIAction(text, debts, {
          commitments: voiceCommitments,
          calls: voiceCalls,
          fixedExpenses: fixedExpenses.map((e) => ({ id: e.id, name: e.name })),
          assets: assets.map((a) => ({ id: a.id, name: a.name })),
          incomes: incomes.map((i) => ({ id: i.id, name: i.name })),
        });
      }

      if (action) {
        const result = await executeAIAction(action, { navigate: effectiveNavigate });
        if (result.success) analytics.aiAssistantUsed(action.type);
        const replyText = getMessageForActionResult(action, result, lang);
        setMessages((prev) => [...prev, { role: 'assistant', text: replyText }]);
        if (result.success && (action.type === 'get_overview' || action.type === 'get_debts')) {
          notify.saveAndToast(replyText, 'success', { duration: 6000 });
        } else if (result.success && (['add_debt', 'add_income', 'add_fixed_expense', 'add_asset'].includes(action.type) || ['delete_all_debts', 'delete_all_fixed_expenses', 'delete_all_assets', 'delete_all_incomes'].includes(action.type))) {
          notify.saveAndToast(replyText, 'success', { duration: 4000 });
        } else if (!result.success && result.error) {
          notify.saveAndToast(result.error, 'error');
        }
      } else {
        const apiError = getLastAIVoiceError();
        let replyText = t('aiAgent.notUnderstood');
        if (apiError === 'quota') {
          replyText = lang === 'es' ? 'Cuota de OpenAI agotada.' : 'OpenAI quota exceeded.';
          notify.saveAndToast(replyText, 'error', { duration: 8000 });
        } else if (apiError === 'model_not_found') {
          replyText = lang === 'es' ? 'Modelo no disponible.' : 'Model not available.';
          notify.saveAndToast(replyText, 'error', { duration: 6000 });
        }
        setMessages((prev) => [...prev, { role: 'assistant', text: replyText }]);
      }
      setIsProcessing(false);
    },
    [lang, debts, fixedExpenses, assets, incomes, voiceCommitments, voiceCalls, effectiveNavigate, t]
  );

  const initializeSpeechRecognition = useCallback(() => {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => unknown; SpeechRecognition?: new () => unknown }).webkitSpeechRecognition
      || (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition;
    if (SR) {
      const recognition = new SR() as {
        start(): void;
        stop(): void;
        continuous: boolean;
        interimResults: boolean;
        lang: string;
        onstart: () => void;
        onresult: (e: { results: Array<{ 0: { transcript: string } }> }) => void;
        onerror: () => void;
        onend: () => void;
      };
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = i18n.language === 'es' ? 'es-ES' : 'en-US';
      recognition.onstart = () => {
        speechTranscriptRef.current = '';
        setAiInputText('');
        setIsListening(true);
      };
      recognition.onresult = (event: { results: Array<{ 0: { transcript: string } }> }) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
          if (i < event.results.length - 1) fullTranscript += ' ';
        }
        speechTranscriptRef.current = fullTranscript;
        setAiInputText(fullTranscript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, [i18n.language]);

  useEffect(() => {
    initializeSpeechRecognition();
    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, [initializeSpeechRecognition]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch {
        // ignore
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      const transcript = speechTranscriptRef.current.trim();
      if (transcript) handleAIUserInput(transcript);
      speechTranscriptRef.current = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiInputText.trim()) handleAIUserInput(aiInputText);
  };

  const pageTransition = { type: 'tween' as const, duration: 0.35, ease: 'easeOut' };
  const pageVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };
  const itemVariants = {
    initial: { opacity: 0, y: 12 },
    animate: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, ...pageTransition } }),
  };

  return (
    <motion.div
      className="ai-chat-page"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
      transition={pageTransition}
    >
      <button
        type="button"
        className="ai-chat-close-x"
        onClick={onClose ?? (() => navigate('/dashboard'))}
        aria-label={t('common.close')}
      >
        <Icon component={FaTimes} />
      </button>

      <motion.div
        className="ai-chat-messages"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, ...pageTransition }}
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && (
            <motion.div
              className="ai-chat-welcome-wrap"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={pageTransition}
            >
              <img src={AI_AVATAR_URL} alt="" className="ai-chat-welcome-avatar" />
              <p className="ai-chat-welcome">{t('aiAgent.welcome')}</p>
            </motion.div>
          )}
          {messages.map((msg, i) => (
            <motion.div
              key={`msg-${i}`}
              className={`ai-chat-message-row ai-chat-message-row--${msg.role}`}
              variants={itemVariants}
              initial="initial"
              animate="animate"
              custom={i}
              layout
            >
              {msg.role === 'assistant' ? (
                <>
                  <img src={AI_AVATAR_URL} alt="" className="ai-chat-message-avatar" />
                  <div className="ai-chat-message ai-chat-message--assistant">
                    <span className="ai-chat-message-text">{msg.text}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="ai-chat-message ai-chat-message--user">
                    <span className="ai-chat-message-text">{msg.text}</span>
                  </div>
                  <div
                    className="ai-chat-message-avatar ai-chat-message-avatar--user"
                    style={user?.avatarUrl ? { backgroundImage: `url(${user.avatarUrl})` } : undefined}
                  >
                    {!user?.avatarUrl ? ((user?.name || user?.email) ? (user.name || user.email).charAt(0).toUpperCase() : '?') : null}
                  </div>
                </>
              )}
            </motion.div>
          ))}
          {isProcessing && (
            <motion.div
              className="ai-chat-message-row ai-chat-message-row--assistant"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={pageTransition}
            >
              <img src={AI_AVATAR_URL} alt="" className="ai-chat-message-avatar" />
              <div className="ai-chat-message ai-chat-message--assistant">
                <span className="ai-chat-message-text ai-chat-typing">...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </motion.div>

      <motion.form
        onSubmit={handleSubmit}
        className="ai-chat-form"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, ...pageTransition }}
      >
        <div className="ai-chat-form-mic-row">
          <motion.button
            type="button"
            className={`ai-chat-mic ${isListening ? 'listening' : ''}`}
            onClick={isListening ? stopListening : startListening}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isListening ? t('aiAgent.stopListening') : t('aiAgent.startListening')}
            disabled={isProcessing}
          >
            <Icon component={isListening ? FaMicrophoneSlash : FaMicrophone} />
          </motion.button>
        </div>
        <div className="ai-chat-form-text-row">
          <input
            type="text"
            value={aiInputText}
            onChange={(e) => setAiInputText(e.target.value)}
            placeholder={t('aiAgent.placeholder')}
            className="ai-chat-input"
            disabled={isProcessing}
          />
          <motion.button type="submit" className="ai-chat-send" disabled={!aiInputText.trim() || isProcessing} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Icon component={FaPaperPlane} />
          </motion.button>
        </div>
      </motion.form>
    </motion.div>
  );
};

export default AIChat;
