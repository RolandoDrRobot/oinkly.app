import React, { useCallback } from 'react';
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useTranslation } from 'react-i18next';
import './Tour.css';

interface TourProps {
  run: boolean;
  onComplete: () => void;
}

const Tour: React.FC<TourProps> = ({ run, onComplete }) => {
  const { t } = useTranslation();

  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status } = data;
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete();
    }
  }, [onComplete]);

  const steps: Step[] = [
    {
      target: '.dashboard-summary',
      content: t('tour.step1.content'),
      title: t('tour.step1.title'),
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '.dashboard-menu',
      content: t('tour.step2.content'),
      title: t('tour.step2.title'),
      placement: 'top',
    },
    {
      target: '.fab-add-debt',
      content: t('tour.step3.content'),
      title: t('tour.step3.title'),
      placement: 'left',
    },
    {
      target: '.debt-card',
      content: t('tour.step4.content'),
      title: t('tour.step4.title'),
      placement: 'top',
    },
    {
      target: '.debt-card',
      content: t('tour.step5.content'),
      title: t('tour.step5.title'),
      placement: 'top',
    },
    {
      target: '.btn-add-commitment',
      content: t('tour.step6.content'),
      title: t('tour.step6.title'),
      placement: 'top',
    },
    {
      target: '.btn-add-call',
      content: t('tour.step7.content'),
      title: t('tour.step7.title'),
      placement: 'top',
    },
    {
      target: '.item-card',
      content: t('tour.step8.content'),
      title: t('tour.step8.title'),
      placement: 'top',
    },
    {
      target: '.btn-notifications',
      content: t('tour.step9.content'),
      title: t('tour.step9.title'),
      placement: 'bottom',
    },
    {
      target: '.ai-agent-section',
      content: t('tour.step10.content'),
      title: t('tour.step10.title'),
      placement: 'bottom',
    },
    {
      target: '.btn-nav-profile',
      content: t('tour.step11.content'),
      title: t('tour.step11.title'),
      placement: 'bottom',
    },
    {
      target: '.header-actions',
      content: t('tour.step12.content'),
      title: t('tour.step12.title'),
      placement: 'bottom',
    },
  ];

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: 'var(--primary, #569a3c)',
          textColor: 'var(--text-primary, #f4e3c5)',
          backgroundColor: 'var(--dark-card, #252515)',
          overlayColor: 'rgba(0, 0, 0, 0.5)',
          arrowColor: 'var(--dark-card, #252515)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: '12px',
          padding: '20px',
          fontFamily: 'var(--font-family, "DynaPuff", system-ui)',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipTitle: {
          color: 'var(--text-primary, #f4e3c5)',
          fontSize: '18px',
          fontWeight: 600,
          marginBottom: '12px',
        },
        tooltipContent: {
          color: 'var(--text-secondary, #f4e3c5)',
          fontSize: '14px',
          lineHeight: '1.6',
          padding: '0',
        },
        buttonNext: {
          backgroundColor: 'var(--primary, #569a3c)',
          color: 'var(--text-primary, #f4e3c5)',
          borderRadius: '8px',
          padding: '10px 20px',
          fontSize: '14px',
          fontWeight: 600,
          border: 'none',
          fontFamily: 'var(--font-family, "DynaPuff", system-ui)',
        },
        buttonBack: {
          color: 'var(--text-secondary, #f4e3c5)',
          marginRight: '10px',
          fontSize: '14px',
          fontFamily: 'var(--font-family, "DynaPuff", system-ui)',
        },
        buttonSkip: {
          color: 'var(--text-muted, #d4c4a5)',
          fontSize: '14px',
          fontFamily: 'var(--font-family, "DynaPuff", system-ui)',
        },
        spotlight: {
          borderRadius: '12px',
        },
      }}
      locale={{
        back: t('tour.back'),
        close: t('tour.close'),
        last: t('tour.last'),
        next: t('tour.next'),
        skip: t('tour.skip'),
      }}
    />
  );
};

export default Tour;
