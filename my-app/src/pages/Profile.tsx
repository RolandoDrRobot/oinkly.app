import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaUser, FaCog } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Profile.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const Profile: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
            <Icon component={FaUser} size={64} />
          </div>
          <h2>{user?.name}</h2>
          <p className="profile-email">{user?.email}</p>
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
            className="btn-action btn-logout"
            onClick={logout}
          >
            {t('profile.logout')}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Profile;
