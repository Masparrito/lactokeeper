import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AgendaTask } from '../../hooks/useHealthAgenda';
import { AlertTriangle } from 'lucide-react';

interface LogHealthEventFormProps {
    task: AgendaTask;
    onSave: () => void;
    onCancel: () => void;
}

export const LogHealthEventForm: React.FC<LogHealthEventFormProps> = ({ task, onSave, onCancel }) => {
    const { addHealthEvent, products, bodyWeighings } = useData();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { animal, activity } = task;

    const product = useMemo(() => products.find(p => p.id === activity.productId), [products, activity.productId]);
    const latestWeight = useMemo(() => {
        return bodyWeighings
            .filter(bw => bw.animalId === animal.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }, [bodyWeighings, animal.id]);

    // --- CORRECCIÓN: Lógica de cálculo actualizada para dosis y costo ---
    const { doseApplied, calculatedCost } = useMemo(() => {
        if (!product || !latestWeight) {
            return { doseApplied: undefined, calculatedCost: undefined };
        }
        
        let dose = 0;
        if (product.dosageType === 'fixed' && product.dosageFixed) {
            dose = product.dosageFixed;
        } else if (product.dosageType === 'per_kg' && product.dosagePerKg_ml && product.dosagePerKg_kg) {
            dose = (latestWeight.kg / product.dosagePerKg_kg) * product.dosagePerKg_ml;
        }

        if (dose === 0) {
            return { doseApplied: undefined, calculatedCost: undefined };
        }

        let cost = 0;
        const totalVolumeInMl = product.presentationUnit === 'L' 
            ? (product.presentationValue || 0) * 1000 
            : (product.presentationValue || 0);

        if (product.price && totalVolumeInMl > 0) {
            const costPerMl = product.price / totalVolumeInMl;
            cost = dose * costPerMl;
        }

        return {
            doseApplied: parseFloat(dose.toFixed(2)),
            calculatedCost: parseFloat(cost.toFixed(2))
        };
    }, [product, latestWeight]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            await addHealthEvent({
                animalId: animal.id,
                lotName: animal.location,
                date,
                activityId: activity.id,
                type: activity.name,
                productUsed: product?.id,
                doseApplied,
                unit: 'ml', // La dosis calculada siempre estará en ml
                calculatedCost,
                notes,
                executedBy: 'self',
            });
            onSave();
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
                <p><span className="font-semibold text-zinc-400">Animal:</span> <span className="font-bold text-white">{animal.id}</span></p>
                <p><span className="font-semibold text-zinc-400">Actividad:</span> <span className="font-bold text-white">{activity.name}</span></p>
                {product && <p><span className="font-semibold text-zinc-400">Producto:</span> <span className="font-bold text-white">{product.name}</span></p>}
            </div>

            <div className="p-4 bg-black/20 rounded-xl space-y-2">
                <h3 className="font-semibold text-white">Detalles del Registro</h3>
                {latestWeight ? (
                    <div>
                        <p className="text-sm text-zinc-300">Basado en el último peso registrado de <span className="font-bold text-white">{latestWeight.kg} kg</span>.</p>
                        {doseApplied !== undefined && <p className="text-sm text-zinc-300">Dosis Calculada: <span className="font-bold text-teal-400">{doseApplied} ml</span></p>}
                        {calculatedCost !== undefined && <p className="text-sm text-zinc-300">Costo Estimado: <span className="font-bold text-amber-400">${calculatedCost.toFixed(2)}</span></p>}
                    </div>
                ) : (
                    <p className="text-sm text-amber-400">Advertencia: No se encontró un peso reciente para este animal. La dosis y el costo no se pueden calcular automáticamente.</p>
                )}
            </div>

            <div>
                <label htmlFor="date" className="block text-sm font-medium text-zinc-400 mb-1">Fecha de Aplicación</label>
                <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl"/>
            </div>

            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-zinc-400 mb-1">Notas (Opcional)</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotaciones sobre la aplicación, etc." rows={3} className="w-full bg-zinc-800 p-3 rounded-xl"/>
            </div>

            {error && (<div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red"><AlertTriangle size={18} /><span>{error}</span></div>)}

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50">{isLoading ? 'Guardando...' : 'Confirmar Registro'}</button>
            </div>
        </form>
    );
};