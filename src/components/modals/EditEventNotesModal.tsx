// src/components/modals/EditEventNotesModal.tsx

import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { Event } from '../../db/local';
import { Modal } from '../ui/Modal';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface EditEventNotesModalProps {
  event: Event;
  onClose: () => void;
  onSaveSuccess: () => void;
}

export const EditEventNotesModal: React.FC<EditEventNotesModalProps> = ({
  event,
  onClose,
  onSaveSuccess,
}) => {
  const [notes, setNotes] = useState(event.notes || '');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const { updateEventNotes } = useData();

  useEffect(() => {
    setNotes(event.notes || '');
  }, [event]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      await updateEventNotes(event.id, notes);
      setMessage({ type: 'success', text: 'Notas actualizadas con éxito.' });
      setTimeout(() => {
        onSaveSuccess();
        onClose();
      }, 1000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'No se pudo actualizar el evento.' });
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title={`Editar Notas: ${event.type}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1">
            Detalles del Evento (No editable)
          </label>
          <p className="w-full bg-zinc-800 p-3 rounded-xl text-sm text-zinc-300">
            {event.details}
          </p>
        </div>

        <div>
          <label htmlFor="eventNotes" className="block text-sm font-medium text-zinc-400 mb-1">
            Notas Adicionales
          </label>
          <textarea
            id="eventNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white"
            placeholder="Añade notas o correcciones aquí..."
          />
        </div>

        {message && (
          <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}>
            {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span>{message.text}</span>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isLoading}
            className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center justify-center min-w-[100px]"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Guardar'}
          </button>
        </div>
      </form>
    </Modal>
  );
};