// src/components/modals/ExitingAnimalsModal.tsx

import React from 'react';
import { Modal } from '../ui/Modal';
import { ChevronRight } from 'lucide-react';

interface ExitingAnimalsModalProps {
    isOpen: boolean;
    onClose: () => void;
    animalIds: string[];
    onSelectAnimal: (animalId: string) => void;
}

export const ExitingAnimalsModal: React.FC<ExitingAnimalsModalProps> = ({
    isOpen,
    onClose,
    animalIds,
    onSelectAnimal
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Animales que Salieron del Ordeño">
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {animalIds.length > 0 ? (
                    animalIds.map(id => (
                        <button
                            key={id}
                            onClick={() => {
                                onSelectAnimal(id);
                                onClose(); // Cierra el modal al seleccionar
                            }}
                            className="w-full text-left p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex justify-between items-center"
                        >
                            <span className="font-semibold text-white">{id}</span>
                            <ChevronRight className="text-zinc-500" />
                        </button>
                    ))
                ) : (
                    <p className="text-center text-zinc-500 py-4">No hay animales que hayan salido en este período.</p>
                )}
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-brand-border">
                 <button onClick={onClose} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cerrar</button>
            </div>
        </Modal>
    );
};