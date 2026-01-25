import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaMoon, FaSun, FaPalette, FaCheck, FaDollarSign } from 'react-icons/fa';
import { useTheme, ColorScheme } from '../context/ThemeContext';
import { storage } from '../utils/storage';
import './Preferences.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const colorSchemes: { value: ColorScheme; label: string; color: string }[] = [
  { value: 'teal', label: 'Teal', color: '#14B8A6' },
  { value: 'blue', label: 'Blue', color: '#3B82F6' },
  { value: 'purple', label: 'Purple', color: '#8B5CF6' },
  { value: 'green', label: 'Green', color: '#10B981' },
];

const currencies = [
  { code: 'USD', name: 'US Dollar', country: 'United States' },
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
  const { mode, colorScheme, setMode, setColorScheme } = useTheme();
  const [localCurrency, setLocalCurrencyState] = useState<string>(storage.getLocalCurrency());

  useEffect(() => {
    setLocalCurrencyState(storage.getLocalCurrency());
  }, []);

  const handleCurrencyChange = (currency: string) => {
    storage.setLocalCurrency(currency);
    setLocalCurrencyState(currency);
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
          <h1>Preferences</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-back"
            onClick={() => navigate('/profile')}
          >
            <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> Back
          </motion.button>
        </div>
      </motion.header>

      <div className="preferences-content">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="preferences-section"
        >
          <h2 className="section-title">
            <Icon component={FaSun} className="section-icon" />
            Appearance
          </h2>
          
          <div className="preference-item">
            <label className="preference-label">Theme Mode</label>
            <div className="mode-toggle">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`mode-button ${mode === 'light' ? 'active' : ''}`}
                onClick={() => setMode('light')}
              >
                <Icon component={FaSun} />
                <span>Light</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`mode-button ${mode === 'dark' ? 'active' : ''}`}
                onClick={() => setMode('dark')}
              >
                <Icon component={FaMoon} />
                <span>Dark</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="preferences-section"
        >
          <h2 className="section-title">
            <Icon component={FaPalette} className="section-icon" />
            Color Scheme
          </h2>
          
          <div className="color-schemes-grid">
            {colorSchemes.map((scheme) => (
              <motion.button
                key={scheme.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`color-scheme-button ${colorScheme === scheme.value ? 'active' : ''}`}
                onClick={() => setColorScheme(scheme.value)}
              >
                <div className="color-preview" style={{ backgroundColor: scheme.color }} />
                <span>{scheme.label}</span>
                {colorScheme === scheme.value && (
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

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="preferences-section"
        >
          <h2 className="section-title">
            <Icon component={FaDollarSign} className="section-icon" />
            Local Currency
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
      </div>
    </motion.div>
  );
};

export default Preferences;
