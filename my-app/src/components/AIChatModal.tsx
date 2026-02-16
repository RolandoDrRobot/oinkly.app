import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import AIChat from '../pages/AIChat';
import './AIChatModal.css';

interface AIChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AIChatModal: React.FC<AIChatModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const navigateAndClose = useCallback(
    (path: string) => {
      onClose();
      navigate(path);
    },
    [onClose, navigate]
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ai-chat-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ai-chat-modal-panel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ type: 'tween', duration: 0.2 }}
          >
            <AIChat onClose={onClose} navigateOverride={navigateAndClose} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatModal;
