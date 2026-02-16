import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaTimes,
  FaFire,
  FaTrophy,
  FaMoneyBillWave,
  FaCalendarCheck,
  FaCheckCircle,
  FaPhoneAlt,
  FaPiggyBank,
  FaBriefcase,
  FaTag,
  FaMobileAlt,
} from 'react-icons/fa';
import {
  getChallengesProgress,
  getTotalXP,
  getLevel,
  getProgressToNextLevel,
  grantOpenAppXPIfNeeded,
  XP_ACTIONS,
} from '../utils/challenges';
import './ChallengesPanel.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) =>
  Component ? <Component {...props} /> : null;

const XP_TABLE_ROWS: Array<{ key: keyof typeof XP_ACTIONS; icon: any }> = [
  { key: 'addDebt', icon: FaMoneyBillWave },
  { key: 'addCommitment', icon: FaCalendarCheck },
  { key: 'completeDebt', icon: FaCheckCircle },
  { key: 'logCall', icon: FaPhoneAlt },
  { key: 'addAsset', icon: FaPiggyBank },
  { key: 'addIncome', icon: FaBriefcase },
  { key: 'addFixedExpense', icon: FaTag },
  { key: 'openAppToday', icon: FaMobileAlt },
];

interface ChallengesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChallengesPanel: React.FC<ChallengesPanelProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(getChallengesProgress());
  const [totalXP, setTotalXP] = useState(getTotalXP());

  useEffect(() => {
    if (isOpen) {
      grantOpenAppXPIfNeeded();
      refresh();
    }
  }, [isOpen]);

  const refresh = () => {
    setProgress(getChallengesProgress());
    setTotalXP(getTotalXP());
  };

  const level = getLevel(totalXP);
  const { current: xpInLevel, needed: xpNeeded, percent: progressPct } = getProgressToNextLevel(totalXP);

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

              <div className="challenges-level-block">
                <div className="challenges-level-bar-wrap">
                  <motion.div
                    className="challenges-level-bar-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                  />
                </div>
                <div className="challenges-level-xp">
                  <span>{xpInLevel} / {xpNeeded} XP</span>
                  <small>{t('challenges.nextLevel')}</small>
                </div>
              </div>

              <div className="challenges-stats">
                <div className="challenges-stat challenges-stat-streak">
                  <Icon component={FaFire} />
                  <div>
                    <span>{progress.streak}</span>
                    <small>{t('challenges.streakDays')}</small>
                  </div>
                </div>
                <div className="challenges-stat challenges-stat-level">
                  <div className="challenges-level-badge">
                    <Icon component={FaTrophy} />
                    <span>{t('challenges.level')} {level}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="challenges-body">
              <div className="challenges-xp-table-wrap">
                <div className="challenges-xp-table-banner">
                  <img
                    src={`${process.env.PUBLIC_URL || ''}/img/bannerChallange.png`}
                    alt=""
                    className="challenges-xp-table-banner-img"
                  />
                </div>
                <div className="challenges-xp-table">
                  {XP_TABLE_ROWS.map(({ key, icon }) => (
                    <div key={key} className="challenges-xp-table-row">
                      <span className="challenges-xp-table-icon">
                        <Icon component={icon} />
                      </span>
                      <span className="challenges-xp-table-label">{t(`challenges.xpAction_${key}`)}</span>
                      <span className="challenges-xp-table-xp">+{XP_ACTIONS[key]} XP</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChallengesPanel;
