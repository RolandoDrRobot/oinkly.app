import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaArrowLeft, FaMoon, FaSun, FaPalette, FaCheck } from 'react-icons/fa';
import { useTheme, ColorScheme } from '../context/ThemeContext';
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

const Preferences: React.FC = () => {
  const navigate = useNavigate();
  const { mode, colorScheme, setMode, setColorScheme } = useTheme();

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
      </div>
    </motion.div>
  );
};

export default Preferences;
