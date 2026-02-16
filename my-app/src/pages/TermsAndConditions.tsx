import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaArrowLeft, FaShieldAlt, FaFileContract } from 'react-icons/fa';
import './TermsAndConditions.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const TermsAndConditions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="terms-and-conditions"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="page-header"
      >
        <div className="header-content">
          <h1>{t('terms.title')}</h1>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-back"
            onClick={() => navigate('/profile')}
          >
            <Icon component={FaArrowLeft} style={{ marginRight: '8px' }} /> {t('common.back')}
          </motion.button>
        </div>
      </motion.header>

      <div className="terms-content">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="terms-section"
        >
          <div className="section-header">
            <Icon component={FaFileContract} className="section-icon" />
            <h2>{t('terms.termsTitle')}</h2>
          </div>
          <div className="section-body">
            <p className="last-updated">{t('terms.lastUpdated')}</p>
            <h3>{t('terms.betaNoticeTitle')}</h3>
            <p>{t('terms.betaNoticeText')}</p>
            <h3>{t('terms.acceptanceTitle')}</h3>
            <p>{t('terms.acceptanceText')}</p>

            <h3>{t('terms.serviceDescriptionTitle')}</h3>
            <p>{t('terms.serviceDescriptionText')}</p>

            <h3>{t('terms.userResponsibilitiesTitle')}</h3>
            <ul>
              <li>{t('terms.userResponsibility1')}</li>
              <li>{t('terms.userResponsibility2')}</li>
              <li>{t('terms.userResponsibility3')}</li>
              <li>{t('terms.userResponsibility4')}</li>
            </ul>

            <h3>{t('terms.dataAccuracyTitle')}</h3>
            <p>{t('terms.dataAccuracyText')}</p>

            <h3>{t('terms.prohibitedUsesTitle')}</h3>
            <ul>
              <li>{t('terms.prohibitedUse1')}</li>
              <li>{t('terms.prohibitedUse2')}</li>
              <li>{t('terms.prohibitedUse3')}</li>
              <li>{t('terms.prohibitedUse4')}</li>
            </ul>

            <h3>{t('terms.disclaimerTitle')}</h3>
            <p>{t('terms.disclaimerText')}</p>

            <h3>{t('terms.limitationLiabilityTitle')}</h3>
            <p>{t('terms.limitationLiabilityText')}</p>

            <h3>{t('terms.changesTitle')}</h3>
            <p>{t('terms.changesText')}</p>

            <h3>{t('terms.terminationTitle')}</h3>
            <p>{t('terms.terminationText')}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="terms-section"
        >
          <div className="section-header">
            <Icon component={FaShieldAlt} className="section-icon" />
            <h2>{t('terms.privacyTitle')}</h2>
          </div>
          <div className="section-body">
            <p className="last-updated">{t('terms.lastUpdated')}</p>

            <h3>{t('terms.informationCollectionTitle')}</h3>
            <p>{t('terms.informationCollectionText')}</p>
            <ul>
              <li>{t('terms.collectedInfo1')}</li>
              <li>{t('terms.collectedInfo2')}</li>
              <li>{t('terms.collectedInfo3')}</li>
              <li>{t('terms.collectedInfo4')}</li>
            </ul>

            <h3>{t('terms.dataStorageTitle')}</h3>
            <p>{t('terms.dataStorageText')}</p>

            <h3>{t('terms.dataUsageTitle')}</h3>
            <p>{t('terms.dataUsageText')}</p>
            <ul>
              <li>{t('terms.usagePurpose1')}</li>
              <li>{t('terms.usagePurpose2')}</li>
              <li>{t('terms.usagePurpose3')}</li>
            </ul>

            <h3>{t('terms.dataSharingTitle')}</h3>
            <p>{t('terms.dataSharingText')}</p>

            <h3>{t('terms.dataSecurityTitle')}</h3>
            <p>{t('terms.dataSecurityText')}</p>

            <h3>{t('terms.userRightsTitle')}</h3>
            <p>{t('terms.userRightsText')}</p>
            <ul>
              <li>{t('terms.right1')}</li>
              <li>{t('terms.right2')}</li>
              <li>{t('terms.right3')}</li>
              <li>{t('terms.right4')}</li>
            </ul>

            <h3>{t('terms.cookiesTitle')}</h3>
            <p>{t('terms.cookiesText')}</p>

            <h3>{t('terms.childrenPrivacyTitle')}</h3>
            <p>{t('terms.childrenPrivacyText')}</p>

            <h3>{t('terms.contactTitle')}</h3>
            <p>{t('terms.contactText')}</p>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default TermsAndConditions;
