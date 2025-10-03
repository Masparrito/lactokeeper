import React, { useState } from 'react';
import { Modal } from './Modal';
import { useData } from '../../context/DataContext';

interface AddLotModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddLotModal: React.FC<AddLotModalProps> = ({ isOpen, onClose }) => {
    const { addLot } = useData();
    const [lotName, setLotName] = useState('');
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (lotName.trim() === '') {
            setError('El nombre del lote no puede estar vacío.');
            return;
        }
        try {
            await addLot(lotName);
            setLotName('');
            setError('');
            onClose();
        } catch (err) {
            setError('No se pudo guardar el lote.');
            console.error(err);
        }
    };

    // Resetea el estado al cerrar
    const handleClose = () => {
        setLotName('');
        setError('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nuevo Lote">
            <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                    Introduce el nombre de la nueva ubicación o lote en tu finca.
                </p>
                <div>
                    <input 
                        type="text"
                        value={lotName}
                        onChange={(e) => setLotName(e.target.value)}
                        placeholder="Ej: Cabritonas Servicio"
                        className="w-full bg-zinc-800 text-white p-3 rounded-xl focus:border-brand-amber focus:ring-0"
                    />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end space-x-2 pt-2">
                    <button onClick={handleClose} className="px-4 py-2 bg-zinc-600 rounded-lg hover:bg-zinc-500">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-brand-amber text-black font-bold rounded-lg hover:bg-yellow-500">
                        Guardar Lote
                    </button>
                </div>
            </div>
        </Modal>
    );
};