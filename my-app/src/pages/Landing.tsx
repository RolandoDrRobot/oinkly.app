import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './Landing.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const Landing: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="landing"
    >
      <div className="landing-container">
        {isAuthenticated ? (
          <>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="btn-back"
              onClick={() => navigate('/dashboard')}
              style={{ marginBottom: '24px', alignSelf: 'flex-start' }}
            >
              <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} />
              {t('common.back')}
            </motion.button>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="landing-header"
            >
              <h1 className="landing-title">{t('landing.title')}</h1>
              <p className="landing-subtitle">{t('landing.subtitle')}</p>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="landing-header"
            >
              <h1 className="landing-title">{t('landing.title')}</h1>
              <p className="landing-subtitle">{t('landing.subtitle')}</p>
            </motion.div>

            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary"
              onClick={() => navigate('/login')}
            >
              {t('landing.getStarted')}
            </motion.button>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default Landing;
