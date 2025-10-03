import React, { useState, useMemo } from 'react';
import { Modal } from './Modal';
import { useData } from '../../context/DataContext';
import { AnimalSelectorModal } from './AnimalSelectorModal';
import { AddAnimalForm } from '../forms/AddAnimalForm'; // 1. Importamos el formulario completo de animal
import { Search, Plus } from 'lucide-react';

interface AddBreedingGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddBreedingGroupModal: React.FC<AddBreedingGroupModalProps> = ({ isOpen, onClose }) => {
    const { addBreedingGroup, animals } = useData();
    
    const [name, setName] = useState('');
    const [sireId, setSireId] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [durationDays, setDurationDays] = useState('45'); 
    const [isSireSelectorOpen, setSireSelectorOpen] = useState(false);
    // 2. Nuevo estado para controlar el modal del formulario de añadir animal
    const [isAddSireModalOpen, setAddSireModalOpen] = useState(false); 
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!name || !sireId || !startDate || !durationDays) {
            setError('Todos los campos son obligatorios.');
            return;
        }
        try {
            const start = new Date(startDate + 'T00:00:00');
            start.setDate(start.getDate() + parseInt(durationDays, 10));
            const endDate = start.toISOString().split('T')[0];

            await addBreedingGroup({
                name,
                sireId,
                startDate,
                endDate,
                status: 'Activo'
            });
            // Reseteamos el formulario y cerramos el modal principal
            resetAndClose();
        } catch (err) {
            setError('No se pudo guardar el lote de monta.');
            console.error(err);
        }
    };

    const resetAndClose = () => {
        setName('');
        setSireId('');
        setStartDate(new Date().toISOString().split('T')[0]);
        setDurationDays('45');
        setError('');
        onClose();
    };
    
    const selectedSireName = useMemo(() => {
        const animal = animals.find(a => a.id === sireId);
        // Mostramos más detalles del semental si lo encontramos
        return animal ? `${sireId} (${animal.race || 'Mestizo'})` : sireId;
    }, [sireId, animals]);

    return (
        <>
            <Modal isOpen={isOpen} onClose={resetAndClose} title="Activar Nuevo Lote de Monta">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Lote de Monta</label>
                        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Monta Otoño 2025" className="w-full bg-zinc-800 p-3 rounded-xl text-lg" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Reproductor</label>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setSireSelectorOpen(true)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-left flex justify-between items-center">
                                <span className={sireId ? 'text-white' : 'text-zinc-500'}>{selectedSireName || 'Seleccionar...'}</span>
                                <Search className="text-zinc-400" size={20} />
                            </button>
                            {/* 3. El botón (+) ahora abre el modal del formulario de animal */}
                            <button type="button" onClick={() => setAddSireModalOpen(true)} className="flex-shrink-0 p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl">
                                <Plus size={24} />
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Inicio</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-400 mb-1">Duración (días)</label>
                            <input type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl text-lg" />
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-400">{error}</p>}
                    <div className="flex justify-end space-x-2 pt-2">
                        <button onClick={resetAndClose} className="px-4 py-2 bg-zinc-600 rounded-lg">Cancelar</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-brand-amber text-black font-bold rounded-lg">Guardar</button>
                    </div>
                </div>
            </Modal>

            {/* Modal para seleccionar un semental existente */}
            <AnimalSelectorModal
                isOpen={isSireSelectorOpen}
                onClose={() => setSireSelectorOpen(false)}
                onSelect={(selectedId) => {
                    setSireId(selectedId);
                    setSireSelectorOpen(false);
                }}
                animals={animals}
                title="Seleccionar Reproductor"
                filterSex="Macho"
            />

            {/* 4. Nuevo Modal que envuelve el AddAnimalForm para registrar un semental */}
            <Modal isOpen={isAddSireModalOpen} onClose={() => setAddSireModalOpen(false)} title="Registrar Nuevo Reproductor">
                <AddAnimalForm 
                    onSaveSuccess={() => {
                        // Cuando el semental se guarda con éxito, cerramos este modal.
                        // El usuario deberá seleccionarlo de la lista después.
                        setAddSireModalOpen(false);
                    }}
                    onCancel={() => setAddSireModalOpen(false)}
                />
            </Modal>
        </>
    );
};