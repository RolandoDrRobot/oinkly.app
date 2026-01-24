import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaEdit, FaTrash, FaPhone, FaCheck, FaTimes } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { Debt } from '../types';
import { storage } from '../utils/storage';
import './Dashboard.css';

// Type assertion helper for icons
const Icon = ({ component: Component, ...props }: { component: any; [key: string]: any }) => {
  return Component ? <Component {...props} /> : null;
};

const Dashboard: React.FC = () => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadDebts();
  }, []);

  const loadDebts = () => {
    const allDebts = storage.getDebts();
    setDebts(allDebts);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar esta deuda?')) {
      storage.deleteDebt(id);
      loadDebts();
    }
  };

  const handleToggleCallTask = (debt: Debt) => {
    const updated = {
      ...debt,
      hasCallTask: !debt.hasCallTask,
      callCompleted: false,
    };
    storage.saveDebt(updated);
    loadDebts();
  };

  const handleToggleCallCompleted = (debt: Debt) => {
    const updated = {
      ...debt,
      callCompleted: !debt.callCompleted,
    };
    storage.saveDebt(updated);
    loadDebts();
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: currency === 'ARS' ? 'ARS' : 'USD',
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="dashboard"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="dashboard-header"
      >
        <div className="header-content">
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1>Dashboard</h1>
            <p className="user-name">Hola, {user?.name}</p>
          </motion.div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-logout"
            onClick={logout}
          >
            Salir
          </motion.button>
        </div>
      </motion.header>

      <div className="dashboard-content">
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="btn-add-debt"
          onClick={() => navigate('/add-debt')}
        >
          <Icon component={FaPlus} style={{ marginRight: '8px' }} /> Agregar Deuda
        </motion.button>

        <AnimatePresence mode="wait">
          {debts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ delay: 0.4 }}
              className="empty-state"
            >
              <motion.p
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
              >
                No tienes deudas registradas
              </motion.p>
              <p className="empty-subtitle">Agrega tu primera deuda para comenzar</p>
            </motion.div>
          ) : (
            <motion.div
              key="debts"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.4 }}
              className="debts-container"
            >
              {debts.map((debt, index) => (
                <motion.div
                  key={debt.id}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ y: -5, boxShadow: '0 8px 16px rgba(0, 0, 0, 0.15)' }}
                  className="debt-card"
                >
                  <div className="debt-header">
                    <h3>{debt.name}</h3>
                    <div className="debt-actions">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="btn-edit"
                        onClick={() => navigate(`/edit-debt/${debt.id}`)}
                      >
                        <Icon component={FaEdit} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="btn-delete"
                        onClick={() => handleDelete(debt.id)}
                      >
                        <Icon component={FaTrash} />
                      </motion.button>
                    </div>
                  </div>

                  <div className="debt-info">
                    <div className="info-row">
                      <span className="label">Tipo:</span>
                      <span className="value">{debt.type === 'prestamo' ? 'Préstamo' : 'Tarjeta'}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Moneda Local:</span>
                      <span className="value">{debt.localCurrency}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Cuota Local:</span>
                      <span className="value">{formatCurrency(debt.localFee, debt.localCurrency)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Cuota Dólares:</span>
                      <span className="value">{formatCurrency(debt.dollarFee, 'USD')}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Cuota para Actualizar:</span>
                      <span className="value">{formatCurrency(debt.feeToUpdate, debt.localCurrency)}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">En Orden:</span>
                      <span className={`value ${debt.inOrder ? 'in-order' : 'not-in-order'}`}>
                        {debt.inOrder ? <><Icon component={FaCheck} /> Sí</> : <><Icon component={FaTimes} /> No</>}
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="label">Plan Actual:</span>
                      <span className="value">{debt.currentPlan}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">Banco:</span>
                      <span className="value">{debt.bankName}</span>
                    </div>
                  </div>

                  <div className="call-task-section">
                    {debt.bankPhone && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="phone-info"
                      >
                        <span><Icon component={FaPhone} style={{ marginRight: '8px' }} /> {debt.bankPhone}</span>
                        <motion.a
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          href={`tel:${debt.bankPhone}`}
                          className="btn-call"
                        >
                          Llamar
                        </motion.a>
                      </motion.div>
                    )}
                    <div className="call-task-controls">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={debt.hasCallTask}
                          onChange={() => handleToggleCallTask(debt)}
                        />
                        <span>Tarea: Llamar al banco</span>
                      </label>
                      {debt.hasCallTask && (
                        <motion.label
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="checkbox-label"
                        >
                          <input
                            type="checkbox"
                            checked={debt.callCompleted}
                            onChange={() => handleToggleCallCompleted(debt)}
                          />
                          <span className={debt.callCompleted ? 'completed' : ''}>
                            Llamada completada
                          </span>
                        </motion.label>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Dashboard;
