import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './MobileOnlyGate.css';

const MOBILE_MAX_WIDTH = 768;

const MobileIcon: React.FC = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
  </svg>
);

const MobileOnlyGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_MAX_WIDTH);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  if (isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="mobile-only-gate">
      <div className="mobile-only-gate-content">
        <div className="mobile-only-gate-icon">
          <MobileIcon />
        </div>
        <h1 className="mobile-only-gate-title">{t('mobileOnly.title')}</h1>
        <p className="mobile-only-gate-message">{t('mobileOnly.message')}</p>
        <p className="mobile-only-gate-hint">{t('mobileOnly.hint')}</p>
      </div>
    </div>
  );
};

export default MobileOnlyGate;
