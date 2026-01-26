import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  FaSnowflake, 
  FaSync, 
  FaClipboardList, 
  FaPhone, 
  FaMoneyBillWave, 
  FaChartLine,
  FaLightbulb,
  FaCheckCircle,
  FaInfoCircle,
  FaRocket,
  FaArrowRight,
  FaStar
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';
import './Landing.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const Landing: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [language, setLanguage] = useState<string>(storage.getLanguage());

  useEffect(() => {
    setLanguage(storage.getLanguage());
  }, []);

  const handleLanguageChange = (lang: string) => {
    storage.setLanguage(lang);
    i18n.changeLanguage(lang);
    setLanguage(lang);
  };

  const handleGetStarted = () => {
    if (!isAuthenticated) {
      login('rolando@gmail.com', 'Rolo');
    }
    navigate('/dashboard');
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const steps = [
    {
      id: 'welcome',
      title: t('about.title'),
      subtitle: t('about.subtitle'),
    },
    {
      id: 'snowball',
      title: t('about.methodTitle'),
      description: t('about.methodDescription'),
      benefits: [
        t('about.methodBenefit1'),
        t('about.methodBenefit2'),
        t('about.methodBenefit3'),
      ],
      icon: FaSnowflake,
    },
    {
      id: 'loop',
      title: t('about.loopTitle'),
      subtitle: t('about.loopSubtitle'),
      steps: [
        {
          icon: FaClipboardList,
          title: t('about.step1Title'),
          description: t('about.step1Description'),
        },
        {
          icon: FaChartLine,
          title: t('about.step2Title'),
          description: t('about.step2Description'),
        },
        {
          icon: FaPhone,
          title: t('about.step3Title'),
          description: t('about.step3Description'),
        },
        {
          icon: FaMoneyBillWave,
          title: t('about.step4Title'),
          description: t('about.step4Description'),
        },
        {
          icon: FaSync,
          title: t('about.step5Title'),
          description: t('about.step5Description'),
        },
      ],
      icon: FaSync,
    },
    {
      id: 'effective',
      title: t('about.bestUseTitle'),
      subtitle: t('about.bestUseSubtitle'),
      tips: [
        {
          title: t('about.tip1Title'),
          description: t('about.tip1Description'),
        },
        {
          title: t('about.tip2Title'),
          description: t('about.tip2Description'),
        },
        {
          title: t('about.tip3Title'),
          description: t('about.tip3Description'),
        },
        {
          title: t('about.tip4Title'),
          description: t('about.tip4Description'),
        },
      ],
      icon: FaLightbulb,
    },
    {
      id: 'why',
      title: t('about.motivationTitle'),
      subtitle: t('about.motivationSubtitle'),
      philosophies: [
        {
          title: t('about.philosophy1'),
          description: t('about.philosophy1Description'),
        },
        {
          title: t('about.philosophy2'),
          description: t('about.philosophy2Description'),
        },
        {
          title: t('about.philosophy3'),
          description: t('about.philosophy3Description'),
        },
      ],
      icon: FaInfoCircle,
    },
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="landing-workflow">
      {/* Language Selector */}
      <div className="language-selector">
        <button
          className={`lang-option ${language === 'es' ? 'active' : ''}`}
          onClick={() => handleLanguageChange('es')}
        >
          ESP
        </button>
        <span className="lang-separator">|</span>
        <button
          className={`lang-option ${language === 'en' ? 'active' : ''}`}
          onClick={() => handleLanguageChange('en')}
        >
          ENG
        </button>
      </div>

      {/* Progress Bar */}
      <div className="progress-bar-container">
        <div className="progress-bar" style={{ width: `${progress}%` }} />
      </div>

      {/* Step Content */}
      <div className="workflow-container">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="step-content"
          >
            {/* Step 1: Welcome */}
            {currentStepData.id === 'welcome' && (
              <div className="welcome-step">
                <div className="welcome-icon-wrapper">
                  <img 
                    src={`${process.env.PUBLIC_URL}/logo.png`} 
                    alt="Oinkly Logo" 
                    className="welcome-logo"
                  />
                </div>
                <h1 className="step-title-large">{currentStepData.title}</h1>
                <p className="step-subtitle-large">{currentStepData.subtitle}</p>
              </div>
            )}

            {/* Step 2: Snowball Method */}
            {currentStepData.id === 'snowball' && (
              <div className="snowball-step">
                <div className="step-icon-wrapper">
                  <Icon component={currentStepData.icon} className="step-icon-large" size={64} />
                </div>
                <h2 className="step-title">{currentStepData.title}</h2>
                <p className="step-description-compact">Pay smallest first. Build momentum. Win faster.</p>
                <ul className="benefits-list-compact">
                  {currentStepData.benefits?.map((benefit, index) => (
                    <li key={index} className="benefit-item-compact">
                      <Icon component={FaCheckCircle} className="benefit-icon" size={20} />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Step 3: Debt Management Loop */}
            {currentStepData.id === 'loop' && (
              <div className="loop-step">
                <div className="step-icon-wrapper">
                  <Icon component={currentStepData.icon} className="step-icon-large" size={64} />
                </div>
                <h2 className="step-title">{currentStepData.title}</h2>
                <p className="step-subtitle-compact">{currentStepData.subtitle}</p>
                <div className="loop-steps-container">
                  {currentStepData.steps?.slice(0, 3).map((step, index) => (
                    <div key={index} className="loop-step-card-compact">
                      <div className="loop-step-icon-wrapper">
                        <Icon component={step.icon} className="loop-step-icon" size={24} />
                      </div>
                      <div className="loop-step-content">
                        <h3 className="loop-step-title">{step.title}</h3>
                      </div>
                      <Icon component={FaArrowRight} className="loop-arrow" size={16} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: How to Use Effectively */}
            {currentStepData.id === 'effective' && (
              <div className="effective-step">
                <div className="step-icon-wrapper">
                  <Icon component={currentStepData.icon} className="step-icon-large" size={64} />
                </div>
                <h2 className="step-title">{currentStepData.title}</h2>
                <p className="step-subtitle-compact">{currentStepData.subtitle}</p>
                <div className="tips-container">
                  {currentStepData.tips?.slice(0, 3).map((tip, index) => (
                    <div key={index} className="tip-card-compact">
                      <div className="tip-icon-wrapper">
                        <Icon component={FaStar} className="tip-icon" size={20} />
                      </div>
                      <div className="tip-content">
                        <h3 className="tip-title">{tip.title}</h3>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Why Oinkly Works */}
            {currentStepData.id === 'why' && (
              <div className="why-step">
                <div className="step-icon-wrapper">
                  <Icon component={FaRocket} className="step-icon-large" size={64} />
                </div>
                <h2 className="step-title">{currentStepData.title}</h2>
                <p className="step-subtitle-compact">{currentStepData.subtitle}</p>
                <div className="philosophies-container">
                  {currentStepData.philosophies?.map((philosophy, index) => (
                    <div key={index} className="philosophy-card-compact">
                      <h3 className="philosophy-title">{philosophy.title}</h3>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="step-actions">
              {isLastStep ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary btn-dashboard"
                  onClick={handleGetStarted}
                >
                  {isAuthenticated ? t('about.backToDashboard') : t('landing.getStarted')}
                </motion.button>
              ) : (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary btn-next"
                  onClick={handleNext}
                >
                  {t('common.next')}
                </motion.button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Landing;
