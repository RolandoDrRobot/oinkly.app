import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  FaArrowLeft, FaTrash, FaTimes, FaChevronDown, FaChevronUp,
  FaFileInvoiceDollar, FaHome, FaMoneyBillWave, FaBolt, FaStickyNote,
} from 'react-icons/fa';
import { Note } from '../types';
import { storage } from '../utils/storage';
import './AddDebt.css';
import './Notes.css';

const Icon = ({ component: C, ...p }: { component: any; [k: string]: any }) =>
  C ? <C {...p} /> : null;

const TYPE_LABELS: Record<string, string> = {
  debt: 'Deuda',
  asset: 'Activo',
  income: 'Ingreso',
  fixedExpense: 'Gasto fijo',
};

const TYPE_ICONS: Record<string, any> = {
  debt: FaFileInvoiceDollar,
  asset: FaHome,
  income: FaMoneyBillWave,
  fixedExpense: FaBolt,
};

type RelatedItem = { id: string; name: string };

const useRelatedItems = () => {
  const debts = storage.getDebts().filter(d => !d.closedAt).map(d => ({ id: d.id, name: d.name }));
  const assets = storage.getAssets().map(a => ({ id: a.id, name: a.name }));
  const incomes = storage.getIncomes().map(i => ({ id: i.id, name: i.name }));
  const fixedExpenses = storage.getFixedExpenses().map(e => ({ id: e.id, name: e.name }));
  return { debt: debts, asset: assets, income: incomes, fixedExpense: fixedExpenses };
};

// ── Note Card ──────────────────────────────────────────────────────────────
const NoteCard: React.FC<{ note: Note; onDelete: (id: string) => void; onUpdate: (note: Note) => void }> = ({ note, onDelete, onUpdate }) => {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState(note.content);
  const [title, setTitle] = useState(note.title);

  const saveChanges = () => {
    const updated = { ...note, title, content, updatedAt: new Date().toISOString() };
    storage.saveNote(updated);
    onUpdate(updated);
  };

  const dateStr = new Date(note.updatedAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: '2-digit' });

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="note-card">
      {/* Collapsed header */}
      <div className="note-card-header" onClick={() => setExpanded(e => !e)}>
        <div className="note-card-left">
          <Icon component={FaStickyNote} className="note-icon" />
          <div className="note-card-info">
            <span className="note-title">{note.title || 'Sin título'}</span>
            <div className="note-meta">
              {note.relatedType && (
                <span className="note-related-chip">
                  <Icon component={TYPE_ICONS[note.relatedType]} size={10} style={{ marginRight: 3 }} />
                  {note.relatedName}
                </span>
              )}
              <span className="note-date">{dateStr}</span>
            </div>
          </div>
        </div>
        <Icon component={expanded ? FaChevronUp : FaChevronDown} size={12} style={{ opacity: 0.4, flexShrink: 0 }} />
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="note-expanded">
              {/* Editable title */}
              <input
                className="note-edit-title"
                value={title}
                placeholder="Título de la nota"
                onChange={e => setTitle(e.target.value)}
                onBlur={saveChanges}
              />

              {/* Related item badge */}
              {note.relatedType && (
                <div className="note-related-badge">
                  <Icon component={TYPE_ICONS[note.relatedType]} size={12} style={{ marginRight: 5 }} />
                  {TYPE_LABELS[note.relatedType]}: <strong>{note.relatedName}</strong>
                </div>
              )}

              {/* Editable content */}
              <textarea
                className="note-edit-content"
                value={content}
                placeholder="Escribe tu nota aquí..."
                onChange={e => setContent(e.target.value)}
                onBlur={saveChanges}
                rows={5}
              />

              <div className="note-actions">
                <span className="note-date-full">
                  Actualizado: {new Date(note.updatedAt).toLocaleString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </span>
                <button className="note-delete-btn" onClick={() => onDelete(note.id)}>
                  <Icon component={FaTrash} size={12} style={{ marginRight: 5 }} /> Eliminar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Add Note Sheet ─────────────────────────────────────────────────────────
const AddNoteSheet: React.FC<{ onClose: () => void; onSave: (note: Note) => void }> = ({ onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [relatedType, setRelatedType] = useState<Note['relatedType']>(undefined);
  const [relatedId, setRelatedId] = useState('');
  const related = useRelatedItems();

  const relatedItems: RelatedItem[] = relatedType ? related[relatedType] : [];
  const selectedItem = relatedItems.find(i => i.id === relatedId);

  const handleSave = () => {
    if (!title.trim() && !content.trim()) return;
    const note: Note = {
      id: Date.now().toString(),
      title: title.trim() || 'Sin título',
      content: content.trim(),
      relatedType: relatedType || undefined,
      relatedId: selectedItem?.id,
      relatedName: selectedItem?.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    storage.saveNote(note);
    onSave(note);
    onClose();
  };

  return (
    <motion.div className="note-sheet-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        className="note-sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="note-sheet-header">
          <span className="note-sheet-title">Nueva nota</span>
          <button className="note-sheet-close" onClick={onClose}><Icon component={FaTimes} size={16} /></button>
        </div>

        <input
          className="note-edit-title"
          placeholder="Título"
          value={title}
          onChange={e => setTitle(e.target.value)}
          autoFocus
        />

        <textarea
          className="note-edit-content"
          placeholder="Escribe tu nota..."
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={6}
        />

        {/* Relation */}
        <div className="note-relation-section">
          <span className="note-relation-label">Relacionar con (opcional)</span>
          <div className="note-relation-types">
            {(['debt', 'asset', 'income', 'fixedExpense'] as const).map(type => (
              <button
                key={type}
                className={`note-relation-type-btn${relatedType === type ? ' active' : ''}`}
                onClick={() => { setRelatedType(relatedType === type ? undefined : type); setRelatedId(''); }}
              >
                <Icon component={TYPE_ICONS[type]} size={12} style={{ marginRight: 4 }} />
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          {relatedType && relatedItems.length > 0 && (
            <select
              className="note-relation-select"
              value={relatedId}
              onChange={e => setRelatedId(e.target.value)}
            >
              <option value="">Seleccionar...</option>
              {relatedItems.map(item => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          )}
          {relatedType && relatedItems.length === 0 && (
            <span className="note-relation-empty">No hay {TYPE_LABELS[relatedType].toLowerCase()}s registrados.</span>
          )}
        </div>

        <button className="note-save-btn" onClick={handleSave} disabled={!title.trim() && !content.trim()}>
          Guardar nota
        </button>
      </motion.div>
    </motion.div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────
const Notes: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    setNotes(storage.getNotes().sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }, []);

  const handleDelete = (id: string) => {
    storage.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const handleUpdate = (updated: Note) => {
    setNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
  };

  const handleAdd = (note: Note) => {
    setNotes(prev => [note, ...prev]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="notes-page">
      <motion.header initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="page-header">
        <div className="header-content">
          <h1>Notas</h1>
          <motion.button type="button" className="btn-back" onClick={() => navigate('/dashboard')} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Icon component={FaArrowLeft} style={{ marginRight: 8 }} /> {t('common.back')}
          </motion.button>
        </div>
      </motion.header>

      <div className="notes-content">
        {notes.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="notes-empty">
            <Icon component={FaStickyNote} size={48} style={{ opacity: 0.25, marginBottom: 12 }} />
            <p>No tenés notas aún.</p>
            <p style={{ fontSize: 13, opacity: 0.5 }}>Tocá + para crear una.</p>
          </motion.div>
        ) : (
          <div className="notes-list">
            {notes.map(n => (
              <NoteCard key={n.id} note={n} onDelete={handleDelete} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <div className="notes-fab-wrap">
        <motion.button type="button" className="notes-fab" onClick={() => setShowAdd(true)}
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.95 }}>
          +
        </motion.button>
      </div>

      <AnimatePresence>
        {showAdd && <AddNoteSheet onClose={() => setShowAdd(false)} onSave={handleAdd} />}
      </AnimatePresence>
    </motion.div>
  );
};

export default Notes;
