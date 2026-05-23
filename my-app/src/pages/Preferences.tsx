import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaCheck, FaDollarSign, FaGlobe } from 'react-icons/fa';
import { storage } from '../utils/storage';
import { analytics } from '../utils/analytics';
import { setUserPreferences } from '../lib/supabaseData';
import './Preferences.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const currencies = [
  { code: 'MXN', name: 'Peso Mexicano', country: 'México' },
  { code: 'ARS', name: 'Peso Argentino', country: 'Argentina' },
  { code: 'CLP', name: 'Peso Chileno', country: 'Chile' },
  { code: 'COP', name: 'Peso Colombiano', country: 'Colombia' },
  { code: 'PEN', name: 'Sol Peruano', country: 'Perú' },
  { code: 'BRL', name: 'Real Brasileño', country: 'Brasil' },
  { code: 'CRC', name: 'Colón Costarricense', country: 'Costa Rica' },
  { code: 'GTQ', name: 'Quetzal', country: 'Guatemala' },
  { code: 'PAB', name: 'Balboa', country: 'Panamá' },
  { code: 'DOP', name: 'Peso Dominicano', country: 'República Dominicana' },
  { code: 'VES', name: 'Bolívar', country: 'Venezuela' },
  { code: 'UYU', name: 'Peso Uruguayo', country: 'Uruguay' },
  { code: 'PYG', name: 'Guaraní', country: 'Paraguay' },
  { code: 'BOB', name: 'Boliviano', country: 'Bolivia' },
  { code: 'HNL', name: 'Lempira', country: 'Honduras' },
  { code: 'NIO', name: 'Córdoba', country: 'Nicaragua' },
];

const Preferences: React.FC = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [localCurrency, setLocalCurrencyState] = useState<string>(storage.getLocalCurrency());
  const [language, setLanguageState] = useState<string>(storage.getLanguage());
  const isFirstTime = !localStorage.getItem('hasSeenInitialSetup');

  useEffect(() => {
    setLocalCurrencyState(storage.getLocalCurrency());
    setLanguageState(storage.getLanguage());
  }, []);

  const handleCurrencyChange = (currency: string) => {
    storage.setLocalCurrency(currency);
    setLocalCurrencyState(currency);
  };

  const handleLanguageChange = (lang: string) => {
    storage.setLanguage(lang);
    i18n.changeLanguage(lang);
    setLanguageState(lang);
  };

  const handleHeaderAction = () => {
    if (isFirstTime) {
      analytics.onboardingComplete();
      localStorage.setItem('hasSeenInitialSetup', '1');
      const userId = storage.getUser()?.id;
      if (userId) {
        setUserPreferences(userId, {
          hasSeenInitialSetup: true,
          localCurrency: storage.getLocalCurrency(),
          language: storage.getLanguage(),
        }).catch((e) => console.warn('[Preferences] persist initial setup', e));
      }
      navigate('/dashboard', { replace: true });
    } else {
      navigate('/profile');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="preferences"
    >
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="page-header"
        >
          <div className="header-content">
            <h1>{t('preferences.title')}</h1>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={isFirstTime ? 'btn-go-dashboard' : 'btn-back'}
              onClick={handleHeaderAction}
            >
              {isFirstTime ? (
                <>
                  <Icon component={FaCheck} style={{ marginRight: '8px' }} /> {t('preferences.goToDashboard')}
                </>
              ) : (
                <>
                  <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
                </>
              )}
            </motion.button>
          </div>
          {isFirstTime && (
            <p className="preferences-onboarding-subtitle">{t('preferences.onboardingSubtitle')}</p>
          )}
        </motion.header>

      <div className="preferences-content">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="preferences-section"
        >
          <h2 className="section-title">
            <Icon component={FaGlobe} className="section-icon" />
            {t('preferences.language')}
          </h2>
          
          <div className="mode-toggle">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`mode-button ${language === 'en' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('en')}
            >
              <span>{t('preferences.english')}</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`mode-button ${language === 'es' ? 'active' : ''}`}
              onClick={() => handleLanguageChange('es')}
            >
              <span>{t('preferences.spanish')}</span>
            </motion.button>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="preferences-section"
        >
          <h2 className="section-title">
            <Icon component={FaDollarSign} className="section-icon" />
            {t('preferences.localCurrency')}
          </h2>
          
          <div className="currency-grid">
            {currencies.map((currency) => (
              <motion.button
                key={currency.code}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`currency-button ${localCurrency === currency.code ? 'active' : ''}`}
                onClick={() => handleCurrencyChange(currency.code)}
              >
                <div className="currency-info">
                  <span className="currency-code">{currency.code}</span>
                  <span className="currency-name">{currency.name}</span>
                  <span className="currency-country">{currency.country}</span>
                </div>
                {localCurrency === currency.code && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="check-mark"
                  >
                    <Icon component={FaCheck} />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>

        <p className="preferences-security-note" role="note">
          {t('preferences.dataStoredOnDevice')}
        </p>
      </div>
    </motion.div>
  );
};

export default Preferences;
