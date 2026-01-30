import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaMapPin,
  FaTwitter,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import './Contact.css';

const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) =>
  Component ? <Component {...props} /> : null;

const Contact: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const CONTACT_EMAIL = 'neodeveloper.eth@gmail.com';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error(t('contact.fillAllFields'));
      return;
    }
    setSending(true);
    const subject = `Contacto Oinkly - ${name.trim()}`;
    const body = `Nombre: ${name.trim()}\nEmail: ${email.trim()}\n\nMensaje:\n${message.trim()}`;
    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setName('');
    setEmail('');
    setMessage('');
    setSending(false);
    toast.success(t('contact.successMessage'));
  };

  const socialLinks = [
    { id: 'x', icon: FaTwitter, url: 'https://x.com/oinklyapp', label: 'X (Oinkly)' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="contact"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="page-header"
      >
        <div className="header-content">
          <h1>{t('contact.title')}</h1>
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
      </motion.header>

      <div className="contact-content">
        {/* Map */}
        <motion.section
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="contact-section contact-map-section"
        >
          <h2 className="contact-section-title">
            <Icon component={FaMapMarkerAlt} className="contact-section-icon" />
            {t('contact.mapHeading')}
          </h2>
          <div className="contact-map-wrap">
            <iframe
              title="Map"
              className="contact-map-iframe"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3929.4640726373677!2d-84.1474965!3d9.978470600000001!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8fa0fba960ca1987%3A0x938c6116c6c52900!2sTorres%20de%20Heredia%2C%20Heredia%2C%20Barreal!5e0!3m2!1sen!2scr!4v1769814410597!5m2!1sen!2scr"
              loading="lazy"
              allowFullScreen
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </motion.section>

        {/* Contact info */}
        <motion.section
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="contact-section contact-info-section"
        >
          <h2 className="contact-section-title">
            <Icon component={FaEnvelope} className="contact-section-icon" />
            {t('contact.infoHeading')}
          </h2>
          <ul className="contact-info-list">
            <li className="contact-info-item">
              <Icon component={FaPhone} className="contact-info-icon" />
              <div>
                <span className="contact-info-label">{t('contact.phone')}</span>
                <a href="tel:+50671612344" className="contact-info-value">
                  {t('contact.placeholderPhone')}
                </a>
              </div>
            </li>
            <li className="contact-info-item">
              <Icon component={FaEnvelope} className="contact-info-icon" />
              <div>
                <span className="contact-info-label">{t('contact.email')}</span>
                <a href={`mailto:${CONTACT_EMAIL}`} className="contact-info-value">
                  {t('contact.placeholderEmail')}
                </a>
              </div>
            </li>
            <li className="contact-info-item">
              <Icon component={FaMapPin} className="contact-info-icon" />
              <div>
                <span className="contact-info-label">{t('contact.address')}</span>
                <span className="contact-info-value">{t('contact.placeholderAddress')}</span>
              </div>
            </li>
          </ul>
        </motion.section>

        {/* Social */}
        <motion.section
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="contact-section contact-social-section"
        >
          <h2 className="contact-section-title">{t('contact.socialHeading')}</h2>
          <div className="contact-social-links">
            {socialLinks.map((item) => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="contact-social-link"
                aria-label={item.label}
              >
                <Icon component={item.icon} size={20} />
              </a>
            ))}
          </div>
        </motion.section>

        {/* Form */}
        <motion.section
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="contact-section contact-form-section"
        >
          <h2 className="contact-section-title">{t('contact.formHeading')}</h2>
          <form onSubmit={handleSubmit} className="contact-form">
            <label className="contact-form-label">
              {t('contact.formName')}
              <input
                type="text"
                className="contact-form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('contact.formName')}
                autoComplete="name"
              />
            </label>
            <label className="contact-form-label">
              {t('contact.formEmail')}
              <input
                type="email"
                className="contact-form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('contact.formEmail')}
                autoComplete="email"
              />
            </label>
            <label className="contact-form-label">
              {t('contact.formMessage')}
              <textarea
                className="contact-form-textarea"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('contact.formMessage')}
                rows={4}
              />
            </label>
            <motion.button
              type="submit"
              className="contact-form-submit"
              disabled={sending}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {sending ? '...' : t('contact.send')}
            </motion.button>
          </form>
        </motion.section>
      </div>
    </motion.div>
  );
};

export default Contact;
