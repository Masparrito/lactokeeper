// src/components/modals/DeleteBodyWeighingSessionModal.tsx
// (NUEVO) Modal de confirmación para borrar sesión de peso corporal

import React, { useState, useMemo } from 'react';
import { Modal } from '../ui/Modal';
import { AlertTriangle, Trash2 } from 'lucide-react';

interface DeleteBodyWeighingSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  dateToDelete: string;
}

export const DeleteBodyWeighingSessionModal: React.FC<DeleteBodyWeighingSessionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  dateToDelete,
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Formatea la fecha al formato 'dd/mm/yyyy' para la confirmación
  const formattedDate = useMemo(() => {
    try {
        const [year, month, day] = dateToDelete.split('-');
        return `${day}/${month}/${year}`;
    } catch (e) {
        return dateToDelete;
    }
  }, [dateToDelete]);

  const isConfirmed = confirmationText === formattedDate;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setIsDeleting(true);
    try {
      await onConfirm();
      // El éxito cierra el modal desde la página principal
    } catch (error) {
      console.error("Error al eliminar la sesión de pesaje corporal:", error);
      // Opcional: mostrar un mensaje de error aquí
    } finally {
      setIsDeleting(false);
      onClose(); // Cierra el modal en cualquier caso
    }
  };
  
  // Limpiar el input al cerrar
  const handleClose = () => {
    setConfirmationText('');
    setIsDeleting(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Eliminar Sesión de Pesaje">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="text-center p-4 bg-red-900/40 border border-brand-red rounded-lg">
          <AlertTriangle className="w-12 h-12 text-brand-red mx-auto" />
          <h3 className="mt-2 text-xl font-bold text-white">¿Estás seguro?</h3>
          <p className="mt-2 text-sm text-zinc-300">
            Esta acción es irreversible. Se eliminarán **todos** los registros de pesaje corporal
            para la fecha <strong className="text-white">{formattedDate}</strong>.
          </p>
        </div>

        <div>
          <label htmlFor="confirmationDate" className="block text-sm font-medium text-zinc-400 mb-1">
            Para confirmar, escribe la fecha: <strong className="text-white">{formattedDate}</strong>
          </label>
          <input
            id="confirmationDate"
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white font-mono text-center"
            placeholder="dd/mm/yyyy"
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
          <button
            type="button"
            onClick={handleClose}
            className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isConfirmed || isDeleting}
            className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 size={18} />
            {isDeleting ? 'Eliminando...' : 'Eliminar Permanentemente'}
          </button>
        </div>
      </form>
    </Modal>
  );
};