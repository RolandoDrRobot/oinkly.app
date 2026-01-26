import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  FaArrowLeft, 
  FaSnowflake, 
  FaSync, 
  FaClipboardList, 
  FaPhone, 
  FaMoneyBillWave, 
  FaChartLine,
  FaLightbulb,
  FaCheckCircle,
  FaInfoCircle
} from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import './About.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const Landing: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    // Auto-login with default user
    login('rolando@gmail.com', 'Rolo');
    navigate('/dashboard');
  };

  const steps = [
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
  ];

  const tips = [
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
  ];

  const benefits = [
    t('about.methodBenefit1'),
    t('about.methodBenefit2'),
    t('about.methodBenefit3'),
  ];

  const philosophies = [
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
  ];

  return (
    <div className="about-page">
      {isAuthenticated ? (
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="about-header"
        >
          <button className="btn-back" onClick={() => navigate('/dashboard')}>
            <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
          </button>
        </motion.header>
      ) : null}

      <div className="about-content">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="about-hero"
        >
          <h1 className="about-title">{t('about.title')}</h1>
          <p className="about-subtitle">{t('about.subtitle')}</p>
        </motion.section>

        {/* Method Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="about-section"
        >
          <div className="section-header">
            <Icon component={FaSnowflake} className="section-icon" size={32} />
            <h2 className="section-title">{t('about.methodTitle')}</h2>
          </div>
          <p className="section-description">{t('about.methodDescription')}</p>
          <ul className="benefits-list">
            {benefits.map((benefit, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <Icon component={FaCheckCircle} className="benefit-icon" />
                {benefit}
              </motion.li>
            ))}
          </ul>
        </motion.section>

        {/* Loop Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="about-section"
        >
          <div className="section-header">
            <Icon component={FaSync} className="section-icon" size={32} />
            <h2 className="section-title">{t('about.loopTitle')}</h2>
          </div>
          <p className="section-subtitle">{t('about.loopSubtitle')}</p>
          <div className="steps-container">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                className="step-card"
              >
                <Icon component={step.icon} className="step-icon" size={24} />
                <h3 className="step-title">{step.title}</h3>
                <p className="step-description">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Best Use Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="about-section"
        >
          <div className="section-header">
            <Icon component={FaLightbulb} className="section-icon" size={32} />
            <h2 className="section-title">{t('about.bestUseTitle')}</h2>
          </div>
          <p className="section-subtitle">{t('about.bestUseSubtitle')}</p>
          <div className="tips-container">
            {tips.map((tip, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                className="tip-card"
              >
                <h3 className="tip-title">{tip.title}</h3>
                <p className="tip-description">{tip.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Motivation Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="about-section"
        >
          <div className="section-header">
            <Icon component={FaInfoCircle} className="section-icon" size={32} />
            <h2 className="section-title">{t('about.motivationTitle')}</h2>
          </div>
          <p className="section-subtitle">{t('about.motivationSubtitle')}</p>
          <div className="philosophies-container">
            {philosophies.map((philosophy, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 + index * 0.1 }}
                className="philosophy-card"
              >
                <h3 className="philosophy-title">{philosophy.title}</h3>
                <p className="philosophy-description">{philosophy.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="about-cta"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary"
            onClick={() => isAuthenticated ? navigate('/dashboard') : handleGetStarted()}
          >
            {isAuthenticated ? t('about.backToDashboard') : t('landing.getStarted')}
          </motion.button>
        </motion.section>
      </div>
    </div>
  );
};

export default Landing;
