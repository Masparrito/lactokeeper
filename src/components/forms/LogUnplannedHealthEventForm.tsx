// src/components/forms/LogUnplannedHealthEventForm.tsx

import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
// --- LÍNEA CORREGIDA: Se eliminan 'Animal' y 'Product' ya que no se usan directamente. ---
import { HealthPlanTask } from '../../db/local';
import { AlertTriangle, CheckCircle, PlusCircle, Users } from 'lucide-react';
import { AdvancedAnimalSelector } from '../ui/AdvancedAnimalSelector';

interface LogUnplannedHealthEventFormProps {
    onSaveSuccess: () => void;
    onCancel: () => void;
}

const treatmentTypes: (HealthPlanTask['type'] | 'Tratamiento Específico')[] = [
    'Tratamiento Específico', 'Desparasitación', 'Vacunación', 'Vitaminas', 'Minerales', 'Control'
];

export const LogUnplannedHealthEventForm: React.FC<LogUnplannedHealthEventFormProps> = ({ onSaveSuccess, onCancel }) => {
    const { animals, products, addHealthEvent, parturitions, serviceRecords, breedingSeasons, sireLots } = useData();

    // Estados del formulario
    const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [type, setType] = useState<(HealthPlanTask['type'] | 'Tratamiento Específico')>('Tratamiento Específico');
    const [productId, setProductId] = useState('');
    const [dose, setDose] = useState('');
    const [notes, setNotes] = useState('');

    // Estados de la UI
    const [isAnimalSelectorOpen, setAnimalSelectorOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const selectedProduct = useMemo(() => products.find(p => p.id === productId), [products, productId]);

    const handleAnimalSelect = (ids: string[]) => {
        setSelectedAnimalIds(ids);
        setAnimalSelectorOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccessMessage(null);

        if (selectedAnimalIds.length === 0) {
            setError('Debes seleccionar al menos un animal.');
            return;
        }
        if (!productId || !selectedProduct) {
            setError('Debes seleccionar un producto.');
            return;
        }
        const doseValue = parseFloat(dose);
        if (isNaN(doseValue) || doseValue <= 0) {
            setError('La dosis debe ser un número válido y mayor que cero.');
            return;
        }

        setIsLoading(true);

        const costPerUnit = selectedProduct.totalCost / selectedProduct.totalVolume;
        const calculatedCost = doseValue * costPerUnit;

        try {
            const eventPromises = selectedAnimalIds.map(animalId =>
                addHealthEvent({
                    animalId,
                    date,
                    type,
                    productUsed: selectedProduct.name,
                    doseApplied: doseValue,
                    unit: selectedProduct.unit,
                    calculatedCost,
                    notes: notes || undefined,
                })
            );

            await Promise.all(eventPromises);

            setSuccessMessage(`${selectedAnimalIds.length} evento(s) de salud registrados con éxito.`);
            setTimeout(() => {
                onSaveSuccess();
            }, 1500);

        } catch (err) {
            setError('No se pudo guardar el evento de salud.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <button
                    type="button"
                    onClick={() => setAnimalSelectorOpen(true)}
                    className="w-full bg-zinc-800 p-4 rounded-xl text-lg flex justify-between items-center text-left"
                >
                    <div className="flex items-center gap-2">
                        <Users size={20} className="text-zinc-400"/>
                        <span className={selectedAnimalIds.length > 0 ? 'text-white' : 'text-zinc-500'}>
                            {selectedAnimalIds.length > 0 ? `${selectedAnimalIds.length} animales seleccionados` : 'Seleccionar Animal(es)...'}
                        </span>
                    </div>
                    <PlusCircle className="text-brand-orange"/>
                </button>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-zinc-400 mb-1">Fecha</label>
                        <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required />
                    </div>
                    <div>
                        <label htmlFor="taskType" className="block text-sm font-medium text-zinc-400 mb-1">Tipo</label>
                        <select id="taskType" value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-zinc-800 p-3 rounded-xl" required>
                            {treatmentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="product" className="block text-sm font-medium text-zinc-400 mb-1">Producto Utilizado</label>
                    <select id="product" value={productId} onChange={e => setProductId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required>
                        <option value="">Seleccionar producto...</option>
                        {products.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="dose" className="block text-sm font-medium text-zinc-400 mb-1">Dosis Aplicada ({selectedProduct?.unit || 'unidad'})</label>
                    <input id="dose" type="number" step="0.1" value={dose} onChange={e => setDose(e.target.value)} placeholder="Ej: 2.5" className="w-full bg-zinc-800 p-3 rounded-xl" required />
                    <p className="text-xs text-zinc-500 mt-1">La misma dosis se aplicará a todos los animales seleccionados.</p>
                </div>

                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-zinc-400 mb-1">Notas (Opcional)</label>
                    <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Ej: Tratamiento por herida en la pata delantera." className="w-full bg-zinc-800 p-3 rounded-xl"></textarea>
                </div>

                {error && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red">
                        <AlertTriangle size={18} /> <span>{error}</span>
                    </div>
                )}
                {successMessage && (
                    <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-green-500/20 text-brand-green">
                        <CheckCircle size={18} /> <span>{successMessage}</span>
                    </div>
                )}

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
                    <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50">
                        {isLoading ? 'Guardando...' : 'Guardar Registro'}
                    </button>
                </div>
            </form>

            <AdvancedAnimalSelector
                isOpen={isAnimalSelectorOpen}
                onClose={() => setAnimalSelectorOpen(false)}
                onSelect={handleAnimalSelect}
                animals={animals}
                parturitions={parturitions}
                serviceRecords={serviceRecords}
                breedingSeasons={breedingSeasons}
                sireLots={sireLots}
                title="Seleccionar Animales"
            />
        </>
    );
};