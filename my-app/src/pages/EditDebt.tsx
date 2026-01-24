import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Debt } from '../types';
import { storage } from '../utils/storage';
import './EditDebt.css';

const EditDebt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Debt | null>(null);

  useEffect(() => {
    if (id) {
      const debt = storage.getDebt(id);
      if (debt) {
        setFormData(debt);
      } else {
        navigate('/dashboard');
      }
    }
  }, [id, navigate]);

  if (!formData) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="edit-debt"
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          Cargando...
        </motion.div>
      </motion.div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev!,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev!,
      [name]: parseFloat(value) || 0,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      storage.saveDebt({
        ...formData,
        updatedAt: new Date().toISOString(),
      });
      navigate('/dashboard');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="edit-debt"
    >
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="page-header"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="btn-back"
          onClick={() => navigate('/dashboard')}
        >
          ← Volver
        </motion.button>
        <h1>Editar Deuda</h1>
      </motion.header>

      <div className="form-container">
        <motion.form
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="debt-form"
        >
          {[
            { id: 'name', label: 'Nombre de la Deuda *', type: 'text', required: true },
            { id: 'type', label: 'Tipo *', type: 'select', required: true },
            { id: 'bankName', label: 'Banco *', type: 'text', required: true },
            { id: 'bankPhone', label: 'Teléfono del Banco', type: 'tel', required: false },
            { id: 'localCurrency', label: 'Moneda Local *', type: 'select', required: true },
            { id: 'localFee', label: 'Cuota en Moneda Local *', type: 'number', required: true },
            { id: 'dollarFee', label: 'Cuota en Dólares *', type: 'number', required: true },
            { id: 'feeToUpdate', label: 'Cuota para Ponerla al Día *', type: 'number', required: true },
            { id: 'currentPlan', label: 'Plan Actual *', type: 'text', required: true },
          ].map((field, index) => (
            <motion.div
              key={field.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.05 * index }}
              className="form-group"
            >
              <label htmlFor={field.id}>{field.label}</label>
              {field.type === 'select' ? (
                field.id === 'type' ? (
                  <select
                    id={field.id}
                    name={field.id}
                    value={formData[field.id as keyof Debt] as string}
                    onChange={handleChange}
                    required={field.required}
                  >
                    <option value="prestamo">Préstamo</option>
                    <option value="tarjeta">Tarjeta de Crédito</option>
                  </select>
                ) : (
                  <select
                    id={field.id}
                    name={field.id}
                    value={formData[field.id as keyof Debt] as string}
                    onChange={handleChange}
                    required={field.required}
                  >
                    <option value="ARS">ARS (Pesos Argentinos)</option>
                    <option value="USD">USD (Dólares)</option>
                  </select>
                )
              ) : (
                <input
                  id={field.id}
                  name={field.id}
                  type={field.type}
                  step={field.type === 'number' ? '0.01' : undefined}
                  value={(formData[field.id as keyof Debt] as string | number) || ''}
                  onChange={field.type === 'number' ? handleNumberChange : handleChange}
                  placeholder={field.id === 'bankPhone' ? 'Ej: +54 11 1234-5678' : undefined}
                  required={field.required}
                />
              )}
            </motion.div>
          ))}

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="inOrder"
                checked={formData.inOrder}
                onChange={handleChange}
              />
              <span>En Orden</span>
            </label>
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="hasCallTask"
                checked={formData.hasCallTask}
                onChange={handleChange}
              />
              <span>Tarea: Llamar al banco</span>
            </label>
          </div>

          {formData.hasCallTask && (
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="callCompleted"
                  checked={formData.callCompleted}
                  onChange={handleChange}
                />
                <span className={formData.callCompleted ? 'completed' : ''}>
                  Llamada completada
                </span>
              </label>
            </div>
          )}

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="form-actions"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              className="btn-cancel"
              onClick={() => navigate('/dashboard')}
            >
              Cancelar
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              className="btn-submit"
            >
              Guardar Cambios
            </motion.button>
          </motion.div>
        </motion.form>
      </div>
    </motion.div>
  );
};

export default EditDebt;
