// src/components/forms/LogUnplannedHealthEventForm.tsx

import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AlertTriangle, Loader2 } from 'lucide-react'; // Import Loader2
import { Animal } from '../../db/local'; // Import Animal

// --- BasicAnimalSelector ACTUALIZADO ---
// Muestra el ID (font-mono) y el Nombre en las opciones
const BasicAnimalSelector = ({ animals, selectedAnimalIds, onChange }: { 
    animals: Animal[], // Espera el objeto Animal completo
    selectedAnimalIds: string[], 
    onChange: (ids: string[]) => void 
}) => {
    const handleSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
        onChange(selectedOptions);
    };

    return (
        <select
            multiple
            value={selectedAnimalIds}
            onChange={handleSelectionChange}
            className="w-full h-40 bg-zinc-800 p-3 rounded-xl font-mono text-white" // h-40, font-mono
        >
            {animals.map(animal => {
                // --- CAMBIO: Preparar nombre formateado ---
                const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';
                return (
                    <option key={animal.id} value={animal.id} className="py-1">
                        {animal.id.toUpperCase()} {formattedName && ` - ${formattedName}`}
                    </option>
                )
            })}
        </select>
    );
};
// --- FIN BasicAnimalSelector ---


interface LogUnplannedHealthEventFormProps {
    onSaveSuccess: () => void;
    onCancel: () => void;
}

export const LogUnplannedHealthEventForm: React.FC<LogUnplannedHealthEventFormProps> = ({ onSaveSuccess, onCancel }) => {
    const { addHealthEvent, products, animals, bodyWeighings } = useData();
    const [selectedAnimalIds, setSelectedAnimalIds] = useState<string[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [activityType, setActivityType] = useState('');
    const [productId, setProductId] = useState<string | undefined>(undefined);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);

    // Filtramos solo animales activos para el selector
    const activeAnimals = useMemo(() => 
        animals.filter(a => a.status === 'Activo' && !a.isReference)
               .sort((a,b) => a.id.localeCompare(b.id)), // Ordenar alfabéticamente
        [animals]
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedAnimalIds.length === 0 || !activityType.trim()) {
            setError('Debe seleccionar al menos un animal y especificar el tipo de actividad.');
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const eventsToSave = selectedAnimalIds.map(animalId => {
                const animal = animals.find(a => a.id === animalId);
                if (!animal) return null;

                const latestWeight = bodyWeighings
                    .filter(bw => bw.animalId === animalId)
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

                let doseApplied: number | undefined;
                let calculatedCost: number | undefined;

                if (product && latestWeight) {
                    let dose = 0;
                    if (product.dosageType === 'fixed' && product.dosageFixed) {
                        dose = product.dosageFixed;
                    } else if (product.dosageType === 'per_kg' && product.dosagePerKg_ml && product.dosagePerKg_kg) {
                        dose = (latestWeight.kg / product.dosagePerKg_kg) * product.dosagePerKg_ml;
                    }

                    if(dose > 0) {
                        doseApplied = parseFloat(dose.toFixed(2));
                        const totalVolumeInMl = product.presentationUnit === 'L'
                            ? (product.presentationValue || 0) * 1000
                            : (product.presentationValue || 0);

                        if (product.price && totalVolumeInMl > 0) {
                            const costPerMl = product.price / totalVolumeInMl;
                            calculatedCost = parseFloat((dose * costPerMl).toFixed(2));
                        }
                    }
                }

                return {
                    animalId,
                    lotName: animal.location,
                    date,
                    type: activityType,
                    productUsed: productId,
                    doseApplied,
                    unit: 'ml' as 'ml', 
                    calculatedCost,
                    notes,
                    executedBy: 'self', // Asumimos que lo registra el usuario
                };
            });

            // Usamos un bucle for...of para asegurar el orden y la espera
            for (const eventData of eventsToSave) {
                if (eventData) {
                    await addHealthEvent(eventData);
                }
            }
            onSaveSuccess();
        } catch (err) {
            console.error(err);
            setError('No se pudo registrar el evento. Inténtelo de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Animal(es) (mantén Ctrl/Cmd para seleccionar varios)</label>
                <BasicAnimalSelector
                    animals={activeAnimals} // Pasamos los animales activos
                    selectedAnimalIds={selectedAnimalIds}
                    onChange={setSelectedAnimalIds}
                />
                 <p className="text-xs text-zinc-500 mt-1">{selectedAnimalIds.length} animal(es) seleccionado(s).</p>
            </div>
            
            <input
                type="text"
                value={activityType}
                onChange={e => setActivityType(e.target.value)}
                placeholder="Tipo de Actividad (Ej: Tratamiento por Neumonía)"
                className="w-full bg-zinc-800 p-3 rounded-xl"
                required
            />

            <select value={productId || ''} onChange={e => setProductId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl">
                <option value="">Seleccionar Producto (Opcional)...</option>
                {products.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}
            </select>
            
            <div>
                <label htmlFor="unplanned-date" className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Aplicación</label>
                <input id="unplanned-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl"/>
            </div>

            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (Opcional)" rows={3} className="w-full bg-zinc-800 p-3 rounded-xl"/>

            {error && (<div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red"><AlertTriangle size={18} /><span>{error}</span></div>)}

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {isLoading && <Loader2 size={18} className="animate-spin" />}
                    {isLoading ? 'Guardando...' : 'Registrar Evento'}
                </button>
            </div>
        </form>
    );
};