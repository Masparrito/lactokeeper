// src/components/ui/AddLotModal.tsx

import React, { useState, useEffect } from 'react';
import { Modal } from './Modal'; // Asumiendo que está en /ui/Modal.tsx
import { useData } from '../../context/DataContext';
import { composeSubLotName } from '../../utils/lots';

interface AddLotModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingLotId?: string;
    forcedParentLotId?: string;
    forcedParentLotName?: string;
}

export const AddLotModal: React.FC<AddLotModalProps> = ({ isOpen, onClose, forcedParentLotId, forcedParentLotName }) => {
    const { addLot } = useData();
    const [lotName, setLotName] = useState('');
    const [parentLotId, setParentLotId] = useState<string>('');
    const [error, setError] = useState('');

    const isSubLotMode = !!forcedParentLotId;

    useEffect(() => {
        if (isOpen) setParentLotId(forcedParentLotId || '');
    }, [isOpen, forcedParentLotId]);

    const handleSave = async () => {
        if (lotName.trim() === '') {
            setError('El nombre del lote no puede estar vacío.');
            return;
        }
        try {
            // --- CORRECCIÓN DE ERROR TS2345 ---
            // Ahora pasamos un objeto, como espera DataContext
            const finalName = isSubLotMode ? composeSubLotName(forcedParentLotName || '', lotName) : lotName.trim();
            await addLot({ name: finalName, parentLotId: parentLotId || undefined });
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


    return (
        <Modal isOpen={isOpen} onClose={handleClose} title={isSubLotMode ? `Nuevo sub-lote en ${forcedParentLotName || ''}` : 'Crear Nuevo Lote'}>
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <p className="text-sm text-c-text-muted">
                    {isSubLotMode ? `Crea un corral o sub-lote dentro de "${forcedParentLotName || ''}".` : 'Introduce el nombre de la nueva ubicación o lote en tu finca.'}
                </p>
                <div>
                    <label htmlFor="lotName" className="block text-sm font-medium text-c-text-muted mb-1">{isSubLotMode ? 'Nombre del sub-lote' : 'Nombre del Lote'}</label>
                    <input 
                        id="lotName"
                        type="text"
                        value={lotName}
                        onChange={(e) => setLotName(e.target.value)}
                        placeholder={isSubLotMode ? 'Ej: Corral 1' : 'Ej: Galpón 1'}
                        className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl focus:border-c-accent focus:ring-0"
                    />
                </div>

                <div>
                    {isSubLotMode && (
                        <p className="text-xs text-c-text-faint">Se creará dentro de <span className="font-semibold text-c-accent">{forcedParentLotName}</span>.</p>
                    )}
                </div>
                
                {error && <p className="text-sm text-brand-red text-center">{error}</p>}

                <div className="flex justify-end space-x-3 pt-2">
                    <button type="button" onClick={handleClose} className="px-5 py-2 bg-c-surface-2 hover:bg-c-surface-3 font-semibold rounded-lg text-c-text">
                        Cancelar
                    </button>
                    <button type="submit" className="px-5 py-2 bg-c-accent hover:bg-c-accent text-white font-bold rounded-lg">
                        Guardar Lote
                    </button>
                </div>
            </form>
        </Modal>
    );
};