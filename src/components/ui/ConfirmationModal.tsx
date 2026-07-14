// src/components/ui/ConfirmationModal.tsx

import React from 'react';
import { Modal } from './Modal';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;
    
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <p className="text-c-text-muted leading-relaxed">{message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-bold py-2.5 px-6 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="bg-brand-red hover:bg-brand-red/90 text-white font-bold py-2.5 px-6 rounded-lg transition-colors"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </Modal>
    );
};