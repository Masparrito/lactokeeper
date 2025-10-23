// src/components/modals/ExitingAnimalsModal.tsx

import React, { useMemo } from 'react'; // <--- Keep this import despite the warning, useMemo is used!
import { Modal } from '../ui/Modal';
import { ChevronRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { formatAnimalDisplay } from '../../utils/formatting';

// Props definition
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
    const { animals, fathers } = useData();

    // Memoize the data lookup and formatting
    const exitingAnimalsData = useMemo(() => {
        const animalMap = new Map(animals.map(a => [a.id, a]));
        const fatherMap = new Map(fathers.map(f => [f.id, f]));

        return animalIds.map(id => {
            const animal = animalMap.get(id);
            if (animal) return animal;
            const father = fatherMap.get(id);
            if (father) return father;
            return { id: id, name: undefined }; // Fallback
        }).sort((a, b) => a.id.localeCompare(b.id));
    }, [animalIds, animals, fathers]);

    // --- RENDERIZADO DEL MODAL ---
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Animales que Salieron del Ordeño">
            {/* Contenedor de la lista con scroll */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                {exitingAnimalsData.length > 0 ? (
                    exitingAnimalsData.map(animalData => (
                        <button
                            key={animalData.id}
                            onClick={() => {
                                onSelectAnimal(animalData.id);
                                onClose();
                            }}
                            className="w-full text-left p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors flex justify-between items-center group"
                        >
                            <span className="font-semibold text-white">{formatAnimalDisplay(animalData)}</span>
                            <ChevronRight className="text-zinc-500 group-hover:text-white transition-colors" />
                        </button>
                    ))
                ) : (
                    <p className="text-center text-zinc-500 py-4">No hay animales que hayan salido en este período.</p>
                )}
            </div>
            {/* Botón de Cerrar */}
            <div className="flex justify-end mt-4 pt-4 border-t border-brand-border">
                 <button onClick={onClose} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cerrar</button>
            </div>
        </Modal>
    );
};