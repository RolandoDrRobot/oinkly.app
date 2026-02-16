import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  FaTimes,
  FaFire,
  FaMoneyBillWave,
  FaPiggyBank,
  FaCheckCircle,
  FaMedal,
  FaLockOpen,
} from 'react-icons/fa';
import {
  getChallenges,
  getChallengesProgress,
  updateChallengesStreak,
  type ChallengeCategory,
} from '../utils/challenges';
import './ChallengesPanel.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) =>
  Component ? <Component {...props} /> : null;

const CATEGORY_ICON: Record<ChallengeCategory, any> = {
  debt: FaMoneyBillWave,
  assets: FaPiggyBank,
  habit: FaFire,
};

interface ChallengesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChallengesPanel: React.FC<ChallengesPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<ReturnType<typeof getChallenges>>([]);
  const [progress, setProgress] = useState(getChallengesProgress());

  useEffect(() => {
    if (isOpen) {
      updateChallengesStreak();
      refresh();
    }
  }, [isOpen]);

  const refresh = () => {
    setChallenges(getChallenges());
    setProgress(getChallengesProgress());
  };

  const completedCount = challenges.filter((c) => c.completed).length;
  const totalCount = challenges.length;

  const categoryLabel = (cat: ChallengeCategory): string =>
    t(`challenges.categories.${cat}`);

  const goToAction = (challengeId: string) => {
    onClose();
    if (challengeId === 'add_first_debt' || challengeId === 'add_commitment' || challengeId === 'log_call') {
      navigate('/add-debt');
    } else if (challengeId === 'add_first_asset' || challengeId === 'add_3_assets') {
      navigate('/add-asset');
    } else if (challengeId === 'add_income') {
      navigate('/add-income');
    } else if (challengeId === 'add_fixed_expense') {
      navigate('/add-fixed-expense');
    }
  };

  const grouped = challenges.reduce<Record<ChallengeCategory, typeof challenges>>(
    (acc, c) => {
      if (!acc[c.category]) acc[c.category] = [];
      acc[c.category].push(c);
      return acc;
    },
    { debt: [], assets: [], habit: [] } as Record<ChallengeCategory, typeof challenges>
  );

  const categories: ChallengeCategory[] = ['debt', 'assets', 'habit'];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="challenges-overlay"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="challenges-panel challenges-panel-game"
          >
            <div className="challenges-header">
              <div className="challenges-header-top">
                <h2>{t('challenges.title')}</h2>
                <button type="button" className="challenges-btn-close" onClick={onClose}>
                  <Icon component={FaTimes} />
                </button>
              </div>

              <div className="challenges-stats">
                <div className="challenges-stat challenges-stat-streak">
                  <Icon component={FaFire} />
                  <div>
                    <span>{progress.streak}</span>
                    <small>{t('challenges.streakDays')}</small>
                  </div>
                </div>
                <div className="challenges-stat challenges-stat-total">
                  <Icon component={FaMedal} />
                  <div>
                    <span>{completedCount}/{totalCount}</span>
                    <small>{t('challenges.achievements')}</small>
                  </div>
                </div>
              </div>
            </div>

            <div className="challenges-body">
              {categories.map((cat, catIndex) => (
                <motion.div
                  key={cat}
                  className="challenges-section"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * catIndex }}
                >
                  <h3 className="challenges-section-title">
                    <span className="challenges-section-icon">
                      <Icon component={CATEGORY_ICON[cat]} />
                    </span>
                    {categoryLabel(cat)}
                  </h3>
                  <ul className="challenges-list">
                    {grouped[cat].map((ch, idx) => (
                      <motion.li
                        key={ch.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.03 * idx }}
                        className={`challenges-item challenges-achievement ${ch.completed ? 'completed' : 'locked'}`}
                      >
                        <div className="challenges-item-badge">
                          {ch.completed ? (
                            <Icon component={FaMedal} className="challenges-item-medal" />
                          ) : (
                            <Icon component={FaLockOpen} className="challenges-item-lock" />
                          )}
                          <span className="challenges-item-xp">+{ch.xp}</span>
                        </div>
                        <div className="challenges-item-content">
                          {ch.completed && (
                            <span className="challenges-item-completed-label">
                              {t('challenges.completed')}
                            </span>
                          )}
                          <strong>{t(ch.titleKey)}</strong>
                          <p>{t(ch.descriptionKey)}</p>
                          {!ch.completed && (
                            <button
                              type="button"
                              className="challenges-item-action"
                              onClick={() => goToAction(ch.id)}
                            >
                              <Icon component={FaCheckCircle} />
                              {t('challenges.go')}
                            </button>
                          )}
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChallengesPanel;
