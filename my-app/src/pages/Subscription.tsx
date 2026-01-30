import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaMicrophone, FaCheck, FaCrown, FaTimes } from 'react-icons/fa';
import { useSubscription } from '../context/SubscriptionContext';
import { notify } from '../utils/notifications';
import './Subscription.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) =>
  Component ? <Component {...props} /> : null;

const Subscription: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { subscription, isPremium, cancelSubscription } = useSubscription();

  const handleBack = () => {
    const from = (location.state as { from?: string } | null)?.from;
    if (from === 'profile') navigate('/profile');
    else navigate('/dashboard');
  };

  const handleCancelSubscription = () => {
    cancelSubscription();
    notify.subscriptionCanceled();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="subscription-page"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="page-header"
      >
        <div className="header-content">
          <h1>{t('subscription.title')}</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-back"
            onClick={handleBack}
          >
            <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
          </motion.button>
        </div>
      </motion.header>

      <div className="subscription-content">
        {!isPremium && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="plan-card plan-free"
          >
            <h3 className="plan-name">{t('subscription.planFree')}</h3>
            <p className="plan-price">{t('subscription.freePrice')}</p>
            <ul className="plan-features">
              <li><Icon component={FaCheck} /> {t('subscription.freeFeature1')}</li>
              <li><Icon component={FaCheck} /> {t('subscription.freeFeature2')}</li>
              <li><Icon component={FaCheck} /> {t('subscription.freeFeature3')}</li>
            </ul>
            <button
              type="button"
              className="btn-plan btn-plan-free"
              onClick={() => navigate('/dashboard')}
            >
              {t('subscription.freeCurrent')}
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="plan-card plan-premium"
        >
          <div className="plan-badge">{t('subscription.recommended')}</div>
          <h3 className="plan-name">
            <Icon component={FaMicrophone} className="plan-icon-mic" style={{ marginRight: '8px' }} />
            {t('subscription.planPremium')}
          </h3>
          <p className="plan-price">{t('subscription.premiumPrice')}</p>
          <ul className="plan-features">
            <li><Icon component={FaCheck} /> {t('subscription.premiumFeature1')}</li>
            <li><Icon component={FaCheck} /> {t('subscription.premiumFeature2')}</li>
            <li><Icon component={FaCheck} /> {t('subscription.premiumFeature3')}</li>
          </ul>
          <motion.button
            type="button"
            className={`btn-plan btn-plan-premium ${isPremium ? 'btn-plan-current' : ''}`}
            whileHover={!isPremium ? { scale: 1.02 } : undefined}
            whileTap={!isPremium ? { scale: 0.98 } : undefined}
            onClick={() => (isPremium ? undefined : navigate('/subscribe?plan=premium'))}
            disabled={isPremium}
          >
            {isPremium ? t('subscription.currentPlan') : t('subscription.subscribe')}
          </motion.button>
        </motion.div>

        {isPremium && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="subscription-premium-block"
          >
            <div className="subscription-badge premium-active">
              <Icon component={FaCrown} />
              <span>{t('subscription.youHavePremium')}</span>
              {subscription?.endsAt && (
                <span className="subscription-ends">
                  {t('subscription.renewsOn', {
                    date: new Date(subscription.endsAt).toLocaleDateString(),
                  })}
                </span>
              )}
            </div>
            <motion.button
              type="button"
              className="btn-cancel-subscription"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCancelSubscription}
            >
              <Icon component={FaTimes} style={{ marginRight: '8px' }} />
              {t('subscription.cancelSubscription')}
            </motion.button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default Subscription;
