import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FaBell, FaTimes, FaCheck, FaTrash } from 'react-icons/fa';
import { Notification } from '../types';
import { storage } from '../utils/storage';
import './NotificationsSidebar.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

interface NotificationsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const NotificationsSidebar: React.FC<NotificationsSidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = () => {
    const allNotifications = storage.getNotifications();
    setNotifications(allNotifications);
    setUnreadCount(storage.getUnreadNotificationsCount());
  };

  const handleMarkAsRead = (notificationId: string) => {
    storage.markNotificationAsRead(notificationId);
    loadNotifications();
  };

  const handleMarkAllAsRead = () => {
    storage.markAllNotificationsAsRead();
    loadNotifications();
  };

  const handleDelete = (notificationId: string) => {
    storage.deleteNotification(notificationId);
    loadNotifications();
  };

  const handleClearAll = () => {
    storage.clearAllNotifications();
    loadNotifications();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('notifications.justNow');
    if (diffMins < 60) {
      return diffMins === 1 
        ? t('notifications.minutesAgo', { count: diffMins })
        : t('notifications.minutesAgo_plural', { count: diffMins });
    }
    if (diffHours < 24) {
      return diffHours === 1
        ? t('notifications.hoursAgo', { count: diffHours })
        : t('notifications.hoursAgo_plural', { count: diffHours });
    }
    if (diffDays < 7) {
      return diffDays === 1
        ? t('notifications.daysAgo', { count: diffDays })
        : t('notifications.daysAgo_plural', { count: diffDays });
    }
    return date.toLocaleDateString();
  };

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="notifications-overlay"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="notifications-sidebar"
          >
            <div className="notifications-header">
              <div className="notifications-header-title">
                <Icon component={FaBell} />
                <h2>{t('notifications.title')}</h2>
                {unreadCount > 0 && (
                  <span className="notifications-badge">{unreadCount}</span>
                )}
              </div>
              <button className="btn-close-sidebar" onClick={onClose}>
                <Icon component={FaTimes} />
              </button>
            </div>

            <div className="notifications-actions">
              {notifications.length > 0 && (
                <>
                  {unreadCount > 0 && (
                    <button
                      className="btn-mark-all-read"
                      onClick={handleMarkAllAsRead}
                    >
                      <Icon component={FaCheck} />
                      {t('notifications.markAllRead')}
                    </button>
                  )}
                  <button
                    className="btn-clear-all"
                    onClick={handleClearAll}
                  >
                    <Icon component={FaTrash} />
                    {t('notifications.clearAll')}
                  </button>
                </>
              )}
            </div>

            <div className="notifications-list">
              {notifications.length === 0 ? (
                <div className="notifications-empty">
                  <Icon component={FaBell} size={48} />
                  <p>{t('notifications.noNotifications')}</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`notification-item ${notification.read ? 'read' : 'unread'}`}
                  >
                    <div className="notification-content">
                      <div className="notification-message">
                        {notification.message}
                      </div>
                      <div className="notification-meta">
                        <span className="notification-time">
                          {formatDate(notification.createdAt)}
                        </span>
                        <span className={`notification-type ${notification.type}`}>
                          {t(`notifications.type.${notification.type}`)}
                        </span>
                      </div>
                    </div>
                    <div className="notification-actions">
                      {!notification.read && (
                        <button
                          className="btn-mark-read"
                          onClick={() => handleMarkAsRead(notification.id)}
                          title={t('notifications.markAsRead')}
                        >
                          <Icon component={FaCheck} />
                        </button>
                      )}
                      <button
                        className="btn-delete-notification"
                        onClick={() => handleDelete(notification.id)}
                        title={t('notifications.delete')}
                      >
                        <Icon component={FaTrash} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default NotificationsSidebar;
