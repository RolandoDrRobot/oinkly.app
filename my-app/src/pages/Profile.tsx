import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaUser,
  FaCog,
  FaFileContract,
  FaDownload,
  FaMicrophone,
  FaChevronRight,
  FaSignOutAlt,
  FaCrown,
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { useSubscription } from '../context/SubscriptionContext';
import { exportAllDataToCSV } from '../utils/export';
import './Profile.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) =>
  Component ? <Component {...props} /> : null;

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();
  const displayUser =
    user ||
    (typeof window !== 'undefined'
      ? (() => {
          try {
            const { storage } = require('../utils/storage');
            return storage.getUser();
          } catch {
            return null;
          }
        })()
      : null);

  const actions = [
    { id: 'preferences', icon: FaCog, label: t('profile.preferences'), onClick: () => navigate('/preferences') },
    { id: 'subscription', icon: FaMicrophone, label: t('profile.subscription'), onClick: () => navigate('/subscription', { state: { from: 'profile' } }) },
    { id: 'terms', icon: FaFileContract, label: t('profile.termsAndConditions'), onClick: () => navigate('/terms') },
    { id: 'export', icon: FaDownload, label: t('profile.exportData'), onClick: exportAllDataToCSV },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="profile"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="page-header"
      >
        <div className="header-content">
          <h1>{t('profile.title')}</h1>
          <motion.button
            type="button"
            className="btn-back"
            onClick={() => navigate('/dashboard')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
          </motion.button>
        </div>
      </motion.header>

      <div className="profile-content">
        <motion.section
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className={`profile-card ${isPremium ? 'profile-card-premium' : ''}`}
        >
          <div className="profile-avatar-wrap">
            {displayUser?.avatarUrl ? (
              <img
                src={displayUser.avatarUrl}
                alt=""
                className="profile-avatar-img"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <span
              className="profile-avatar-fallback"
              style={{ display: displayUser?.avatarUrl ? 'none' : 'flex' }}
            >
              <Icon component={FaUser} size={40} />
            </span>
          </div>
          <div className="profile-user-info">
            <h2 className="profile-name">{displayUser?.name ?? '—'}</h2>
            <p className="profile-email">{displayUser?.email ?? '—'}</p>
            {isPremium && (
              <span className="profile-premium-badge">
                <Icon component={FaCrown} className="profile-premium-badge-icon" size={14} />
                {t('profile.premiumBadge')}
              </span>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="profile-actions-section"
        >
          <ul className="profile-actions-list" role="list">
            {actions.map((item) => (
              <li key={item.id}>
                <motion.button
                  type="button"
                  className={`profile-action-btn ${item.id === 'subscription' && !isPremium ? 'profile-action-subscription' : ''}`}
                  onClick={item.onClick}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="profile-action-icon">
                    <Icon component={item.icon} size={20} />
                  </span>
                  <span className="profile-action-label">{item.label}</span>
                  <Icon component={FaChevronRight} className="profile-action-chevron" size={14} />
                </motion.button>
              </li>
            ))}
          </ul>

          <motion.button
            type="button"
            className="profile-logout-btn"
            onClick={async () => {
              try {
                await logout();
                navigate('/');
              } catch (e) {
                console.error(e);
              }
            }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="profile-action-icon profile-logout-icon">
              <Icon component={FaSignOutAlt} size={20} />
            </span>
            <span className="profile-action-label">{t('profile.logout')}</span>
          </motion.button>
        </motion.section>
      </div>
    </motion.div>
  );
};

export default Profile;
