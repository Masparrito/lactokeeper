// src/components/modals/DeleteSessionModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { AlertTriangle } from 'lucide-react';

interface DeleteSessionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    dateToDelete: string; // Espera la fecha en formato YYYY-MM-DD
}

export const DeleteSessionModal: React.FC<DeleteSessionModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    dateToDelete
}) => {
    const [confirmDate, setConfirmDate] = useState('');
    
    // Formatea la fecha para mostrarla al usuario
    const formattedDate = dateToDelete 
        ? new Date(dateToDelete + 'T00:00:00').toLocaleDateString('es-VE', { 
            year: 'numeric', month: 'long', day: 'numeric' 
          }) 
        : '';
    
    const isMatch = confirmDate === dateToDelete;

    // Resetea el input de confirmación cada vez que se abre el modal
    useEffect(() => {
        if (isOpen) {
            setConfirmDate('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Confirmar Eliminación">
            <div className="space-y-4 text-white">
                <div className="text-center space-y-2">
                    <AlertTriangle className="mx-auto h-12 w-12 text-brand-red" />
                    <p className="text-lg font-semibold">
                        ¿Eliminar todos los pesajes del <span className="font-bold">{formattedDate}</span>?
                    </p>
                    <p className="text-sm text-zinc-400">
                        Esta acción es irreversible y eliminará {dateToDelete ? 'permanentemente' : ''} todos los registros de esta fecha.
                    </p>
                </div>

                <div>
                    <label htmlFor="confirmDateInput" className="block text-sm font-medium text-zinc-400 mb-1">
                        Para confirmar, escribe la fecha: <strong className="text-zinc-200">{dateToDelete}</strong>
                    </label>
                    <input
                        id="confirmDateInput"
                        type="text"
                        value={confirmDate}
                        onChange={(e) => setConfirmDate(e.target.value)}
                        placeholder="YYYY-MM-DD"
                        className={`w-full bg-zinc-800 p-3 rounded-xl text-lg text-center font-mono border-2 ${
                            confirmDate && !isMatch ? 'border-red-500' : 'border-zinc-700'
                        } focus:border-brand-red focus:ring-0`}
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={!isMatch}
                        className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Eliminar Permanentemente
                    </button>
                </div>
            </div>
        </Modal>
    );
};