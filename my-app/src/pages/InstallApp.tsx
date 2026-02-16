import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaMobileAlt,
  FaApple,
  FaAndroid,
  FaCheckCircle,
} from 'react-icons/fa';
import './InstallApp.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) =>
  Component ? <Component {...props} /> : null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const InstallApp: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // Detect if already running as installed PWA (standalone)
    const standalone =
      (window.navigator as { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches ||
      (document.referrer && document.referrer.includes('android-app://'));
    if (standalone) setIsInstalled(true);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstalled(true);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="install-app"
    >
      <header className="page-header">
        <div className="header-content">
          <h1>{t('installApp.title')}</h1>
          <motion.button
            type="button"
            className="btn-back"
            onClick={() => navigate('/profile')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
          </motion.button>
        </div>
      </header>

      <div className="install-app-content">
        {/* Hero */}
        <motion.section
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="install-app-hero"
        >
          <div className="install-app-icon-wrap">
            <img src="/logo.png" alt={t('dashboard.logoAlt')} className="install-app-icon" />
          </div>
        </motion.section>

        {/* Already installed */}
        {isInstalled && (
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="install-app-already"
          >
            <Icon component={FaCheckCircle} className="install-app-already-icon" size={28} />
            <p>{t('installApp.alreadyInstalled')}</p>
          </motion.section>
        )}

        {/* Install button (when browser supports it) */}
        {!isInstalled && deferredPrompt && (
          <motion.section
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="install-app-cta-section"
          >
            <motion.button
              type="button"
              className="install-app-cta"
              onClick={handleInstall}
              disabled={installing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon component={FaMobileAlt} className="install-app-cta-icon" size={22} />
              {installing ? '...' : t('installApp.installButton')}
            </motion.button>
          </motion.section>
        )}

        {/* Manual steps */}
        <motion.section
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="install-app-manual"
        >
          <div className="install-app-steps install-app-ios">
            <h3 className="install-app-steps-title">
              <Icon component={FaApple} size={20} /> {t('installApp.iosTitle')}
            </h3>
            <ol className="install-app-steps-list">
              <li>{t('installApp.iosStep1')}</li>
              <li>{t('installApp.iosStep2')}</li>
              <li>{t('installApp.iosStep3')}</li>
            </ol>
          </div>

          <div className="install-app-steps install-app-android">
            <h3 className="install-app-steps-title">
              <Icon component={FaAndroid} size={20} /> {t('installApp.androidTitle')}
            </h3>
            <ol className="install-app-steps-list">
              <li>{t('installApp.androidStep1')}</li>
              <li>{t('installApp.androidStep2')}</li>
              <li>{t('installApp.androidStep3')}</li>
            </ol>
          </div>
        </motion.section>

        {/* Benefits */}
        <motion.section
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="install-app-benefits"
        >
          <ul className="install-app-benefits-list">
            <li>
              <Icon component={FaCheckCircle} className="install-app-benefit-icon" size={18} />
              {t('installApp.benefit1')}
            </li>
            <li>
              <Icon component={FaCheckCircle} className="install-app-benefit-icon" size={18} />
              {t('installApp.benefit2')}
            </li>
            <li>
              <Icon component={FaCheckCircle} className="install-app-benefit-icon" size={18} />
              {t('installApp.benefit3')}
            </li>
          </ul>
        </motion.section>
      </div>
    </motion.div>
  );
};

export default InstallApp;
