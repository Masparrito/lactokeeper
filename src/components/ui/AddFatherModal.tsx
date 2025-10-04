import React, { useState } from 'react';
import { Modal } from './Modal';
import { useData } from '../../context/DataContext';
import { Father } from '../../db/local';

interface AddFatherModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (newFather: Father) => void;
}

export const AddFatherModal: React.FC<AddFatherModalProps> = ({ isOpen, onClose, onSave }) => {
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const { fathers } = useData();

    const handleSave = () => {
        setError('');
        const trimmedId = id.trim().toUpperCase();
        const trimmedName = name.trim();

        if (!trimmedId || !trimmedName) {
            setError('Ambos campos son obligatorios.');
            return;
        }

        if (fathers.some(f => f.id === trimmedId)) {
            setError('Este ID ya está en uso. Por favor, elige otro.');
            return;
        }

        onSave({ id: trimmedId, name: trimmedName });
        setId('');
        setName('');
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Añadir Nuevo Padre">
            <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                    Introduce un ID único y el nombre del nuevo semental.
                </p>
                <div className="space-y-3">
                    <input 
                        type="text"
                        value={id}
                        onChange={(e) => setId(e.target.value)}
                        placeholder="ID del Padre (ej. P002)"
                        className="w-full bg-zinc-800 text-white p-3 rounded-xl focus:border-brand-orange focus:ring-0"
                    />
                    <input 
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nombre del Padre (ej. Sansón)"
                        className="w-full bg-zinc-800 text-white p-3 rounded-xl focus:border-brand-orange focus:ring-0"
                    />
                </div>
                {error && <p className="text-sm text-brand-red">{error}</p>}
                <div className="flex justify-end space-x-3 pt-2">
                    <button onClick={onClose} className="px-5 py-2 bg-zinc-600 rounded-lg hover:bg-zinc-500 font-semibold">
                        Cancelar
                    </button>
                    <button onClick={handleSave} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg">
                        Guardar Padre
                    </button>
                </div>
            </div>
        </Modal>
    );
};