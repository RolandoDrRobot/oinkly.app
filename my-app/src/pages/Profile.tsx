import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaUser, FaCog, FaFileContract, FaDownload, FaCrown } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { exportAllDataToCSV } from '../utils/export';
import './Profile.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  // Fallback to stored user if context user is null (e.g. after refresh before auth hydrates)
  const displayUser = user || (typeof window !== 'undefined' ? (() => {
    try {
      const { storage } = require('../utils/storage');
      return storage.getUser();
    } catch {
      return null;
    }
  })() : null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-back"
            onClick={() => navigate('/dashboard')}
          >
            <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
          </motion.button>
        </div>
      </motion.header>

      <div className="profile-content">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="profile-card"
        >
          <div className="profile-icon">
            {displayUser?.avatarUrl && (
              <img
                src={displayUser.avatarUrl}
                alt={displayUser.name || ''}
                className="profile-avatar-img"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            )}
            <span
              className="profile-icon-fallback"
              style={{
                display: displayUser?.avatarUrl ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon component={FaUser} size={64} />
            </span>
          </div>
          <h2>{displayUser?.name}</h2>
          <p className="profile-email">{displayUser?.email}</p>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="profile-actions"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-action"
            onClick={() => navigate('/preferences')}
          >
            <Icon component={FaCog} style={{ marginRight: '12px' }} />
            {t('profile.preferences')}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-action"
            onClick={() => navigate('/subscription')}
          >
            <Icon component={FaCrown} style={{ marginRight: '12px' }} />
            {t('profile.subscription')}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-action"
            onClick={() => navigate('/terms')}
          >
            <Icon component={FaFileContract} style={{ marginRight: '12px' }} />
            {t('profile.termsAndConditions')}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-action"
            onClick={exportAllDataToCSV}
          >
            <Icon component={FaDownload} style={{ marginRight: '12px' }} />
            {t('profile.exportData')}
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="btn-action btn-logout"
            onClick={async () => {
              try {
                await logout();
                navigate('/');
              } catch (error) {
                console.error('Error during logout:', error);
              }
            }}
          >
            {t('profile.logout')}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Profile;
