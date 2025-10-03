import React, { useState } from 'react';
import { Modal } from './Modal';
import { useData } from '../../context/DataContext';

interface AddOriginModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddOriginModal: React.FC<AddOriginModalProps> = ({ isOpen, onClose }) => {
    const { addOrigin } = useData();
    const [originName, setOriginName] = useState('');
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (originName.trim() === '') {
            setError('El nombre del origen no puede estar vacío.');
            return;
        }
        try {
            await addOrigin(originName);
            setOriginName('');
            setError('');
            onClose();
        } catch (err) {
            setError('No se pudo guardar el origen.');
            console.error(err);
        }
    };

    const handleClose = () => {
        setOriginName('');
        setError('');
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nuevo Origen">
            <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                    Introduce el nombre de la ganadería o finca de origen.
                </p>
                <div>
                    <input 
                        type="text"
                        value={originName}
                        onChange={(e) => setOriginName(e.target.value)}
                        placeholder="Ej: Agropecuaria La Bendición"
                        className="w-full bg-zinc-800 text-white p-3 rounded-xl focus:border-brand-amber focus:ring-0"
                    />
                </div>
                {error && <p className="text-sm text-red-400">{error}</p>}
                <div className="flex justify-end space-x-2 pt-2">
                    <button onClick={handleClose} className="px-4 py-2 bg-zinc-600 rounded-lg hover:bg-zinc-500">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-4 py-2 bg-brand-amber text-black font-bold rounded-lg hover:bg-yellow-500">
                        Guardar Origen
                    </button>
                </div>
            </div>
        </Modal>
    );
};