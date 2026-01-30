import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaMicrophone, FaLock, FaCreditCard } from 'react-icons/fa';
import { useSubscription } from '../context/SubscriptionContext';
import { notify } from '../utils/notifications';
import './Subscribe.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) =>
  Component ? <Component {...props} /> : null;

const Subscribe: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan') || 'premium';
  const { activatePremium } = useSubscription();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePay = async () => {
    setIsSubmitting(true);
    try {
      await activatePremium(interval);
      notify.subscriptionActivated();
      navigate('/dashboard');
    } catch (e) {
      notify.subscriptionError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const priceMonthly = t('subscription.priceMonthly');
  const priceYearly = t('subscription.priceYearly');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="subscribe-page"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="page-header"
      >
        <div className="header-content">
          <h1>{t('subscription.checkoutTitle')}</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-back"
            onClick={() => navigate('/subscription')}
          >
            <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
          </motion.button>
        </div>
      </motion.header>

      <div className="subscribe-content">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="checkout-card"
        >
          <div className="checkout-plan">
            <Icon component={FaMicrophone} className="checkout-plan-icon" />
            <h2>{t('subscription.planPremium')}</h2>
            <p className="checkout-desc">{t('subscription.checkoutDesc')}</p>
          </div>

          <div className="checkout-interval">
            <button
              type="button"
              className={`interval-btn ${interval === 'monthly' ? 'active' : ''}`}
              onClick={() => setInterval('monthly')}
            >
              <span>{t('subscription.monthly')}</span>
              <span className="interval-price">{priceMonthly}</span>
            </button>
            <button
              type="button"
              className={`interval-btn ${interval === 'yearly' ? 'active' : ''}`}
              onClick={() => setInterval('yearly')}
            >
              <span>{t('subscription.yearly')}</span>
              <span className="interval-price">{priceYearly}</span>
              <span className="interval-badge">{t('subscription.save')}</span>
            </button>
          </div>

          <div className="checkout-summary">
            <div className="summary-row">
              <span>{t('subscription.subtotal')}</span>
              <span>{interval === 'monthly' ? priceMonthly : priceYearly}</span>
            </div>
            <p className="checkout-note">{t('subscription.checkoutNote')}</p>
          </div>

          <motion.button
            type="button"
            className="btn-confirm-pay"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePay}
            disabled={isSubmitting}
          >
            <Icon component={FaLock} className="checkout-icon-gold" style={{ marginRight: '8px' }} />
            {isSubmitting ? t('subscription.processing') : t('subscription.confirmAndActivate')}
          </motion.button>

          <p className="checkout-secure">
            <Icon component={FaCreditCard} />
            {t('subscription.securePayment')}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Subscribe;
