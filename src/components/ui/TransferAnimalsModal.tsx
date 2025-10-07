import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Modal } from './Modal';

interface TransferAnimalsModalProps {
    isOpen: boolean;
    onClose: () => void;
    animalsToTransfer: string[];
    fromLot: string;
}

export const TransferAnimalsModal: React.FC<TransferAnimalsModalProps> = ({ isOpen, onClose, animalsToTransfer, fromLot }) => {
    const { lots, updateAnimal } = useData();
    const [destinationLot, setDestinationLot] = useState('');

    // Filtramos el lote actual de la lista de destinos posibles
    const availableLots = useMemo(() => {
        return lots.filter(lot => lot.name !== fromLot);
    }, [lots, fromLot]);

    const handleTransfer = async () => {
        if (!destinationLot || animalsToTransfer.length === 0) return;

        // Creamos una promesa para cada actualización de animal
        const updatePromises = animalsToTransfer.map(animalId => 
            updateAnimal(animalId, { location: destinationLot })
        );

        try {
            // Esperamos a que todas las actualizaciones se completen
            await Promise.all(updatePromises);
            onClose(); // Cerramos el modal al finalizar
        } catch (error) {
            console.error("Error al transferir animales:", error);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Transferir ${animalsToTransfer.length} animales`}>
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-1">Transferir desde: <span className="font-semibold text-white">{fromLot}</span></label>
                    <label className="block text-sm font-medium text-zinc-400 mb-1 mt-4">Hacia el lote:</label>
                    <select 
                        value={destinationLot} 
                        onChange={e => setDestinationLot(e.target.value)} 
                        className="w-full bg-zinc-800 p-3 rounded-xl text-lg"
                    >
                        <option value="">Seleccionar lote de destino...</option>
                        {availableLots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <button onClick={onClose} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
                    <button 
                        onClick={handleTransfer} 
                        disabled={!destinationLot}
                        className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50"
                    >
                        Confirmar Transferencia
                    </button>
                </div>
            </div>
        </Modal>
    );
};