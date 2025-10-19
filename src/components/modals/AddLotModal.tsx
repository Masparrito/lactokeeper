// src/components/modals/AddLotModal.tsx

import React, { useState } from 'react';
// --- RUTA CORREGIDA ---
import { Modal } from '../ui/Modal';
import { useData } from '../../context/DataContext';

interface AddLotModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingLotId?: string; 
}

export const AddLotModal: React.FC<AddLotModalProps> = ({ isOpen, onClose, editingLotId }) => {
    const { lots, addLot } = useData();
    const [lotName, setLotName] = useState('');
    const [parentLotId, setParentLotId] = useState<string>('');
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (lotName.trim() === '') {
            setError('El nombre del lote no puede estar vacío.');
            return;
        }
        try {
            // --- LLAMADA CORREGIDA (enviando un objeto) ---
            await addLot({ name: lotName, parentLotId: parentLotId || undefined });
            handleClose();
        } catch (err: any) {
            setError(err.message || 'No se pudo guardar el lote.');
            console.error(err);
        }
    };

    const handleClose = () => {
        setLotName('');
        setParentLotId('');
        setError('');
        onClose();
    };

    const availableParentLots = lots.filter(lot => !lot.parentLotId && lot.id !== editingLotId);

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Crear Nuevo Lote">
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <p className="text-sm text-zinc-400">
                    Introduce el nombre de la nueva ubicación o lote en tu finca.
                </p>
                <div>
                    <label htmlFor="lotName" className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Lote</label>
                    <input 
                        id="lotName"
                        type="text"
                        value={lotName}
                        // --- TYPO 'S' ELIMINADO ---
                        onChange={(e) => setLotName(e.target.value)}
                        placeholder="Ej: Galpón 1"
                        className="w-full bg-zinc-800 text-white p-3 rounded-xl focus:border-brand-orange focus:ring-0"
                    />
                </div>

                <div>
                    <label htmlFor="parentLot" className="block text-sm font-medium text-zinc-400 mb-1">Sub-lote de (Opcional)</label>
                    <select
                        id="parentLot"
                        value={parentLotId}
                        onChange={(e) => setParentLotId(e.target.value)}
                        className="w-full bg-zinc-800 text-white p-3 rounded-xl focus:border-brand-orange focus:ring-0"
                    >
                        <option value="">Ninguno (Es un Lote Principal)</option>
                        {availableParentLots.map(lot => (
                            <option key={lot.id} value={lot.id}>{lot.name}</option>
                        ))}
                    </select>
                </div>
                
                {error && <p className="text-sm text-brand-red text-center">{error}</p>}

                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={handleClose} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">
                        Cancelar
                    </button>
                    <button type="submit" className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg">
                        Guardar Lote
                    </button>
                </div>
            </form>
        </Modal>
    );
};