import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { AgendaTask } from '../../hooks/useHealthAgenda';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface LogHealthEventFormProps {
    task: AgendaTask;
    onSave: () => void;
    onCancel: () => void;
}

export const LogHealthEventForm: React.FC<LogHealthEventFormProps> = ({ task, onSave, onCancel }) => {
    // --- CAMBIO: Se obtiene appConfig de useData ---
    const { addHealthEvent, products, bodyWeighings } = useData();
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const { animal, activity } = task;

    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    const product = useMemo(() => products.find(p => p.id === activity.productId), [products, activity.productId]);
    const latestWeight = useMemo(() => {
        return bodyWeighings
            .filter(bw => bw.animalId === animal.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    }, [bodyWeighings, animal.id]);

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

        // --- (INICIO) CORRECCIÓN DE ERRORES ---
        // 'diasRetiroLecheDefault' y 'diasRetiroCarneDefault' ya no existen en appConfig.
        // Usamos un valor por defecto local (7 y 30) hasta que el módulo StockCare se configure.
        const diasRetiroLeche = product?.withdrawalDaysMilk ?? 7;
        const diasRetiroCarne = product?.withdrawalDaysMeat ?? 30;
        // --- (FIN) CORRECCIÓN DE ERRORES ---

        try {
            await addHealthEvent({
                animalId: animal.id,
                lotName: animal.location,
                date,
                activityId: activity.id,
                type: activity.name,
                productUsed: product?.id,
                doseApplied,
                unit: 'ml', // Asumimos ml, se podría mejorar si el producto tiene otra unidad
                calculatedCost,
                notes,
                executedBy: 'self',
                // --- CAMBIO: Se añaden los días de retiro al evento ---
                diasRetiroLeche: diasRetiroLeche > 0 ? diasRetiroLeche : undefined,
                diasRetiroCarne: diasRetiroCarne > 0 ? diasRetiroCarne : undefined,
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
                <p className="font-semibold text-c-text-muted text-sm">Animal:</p>
                <p className="font-mono font-semibold text-lg text-c-text truncate">{animal.id.toUpperCase()}</p>
                {formattedName && (
                    <p className="text-sm font-normal text-c-text-strong truncate">{formattedName}</p>
                )}
            </div>

            <div>
                <p><span className="font-semibold text-c-text-muted text-sm">Actividad:</span> <span className="font-bold text-base text-c-text">{activity.name}</span></p>
                {product && <p><span className="font-semibold text-c-text-muted text-sm">Producto:</span> <span className="font-bold text-base text-c-text">{product.name}</span></p>}
            </div>

            <div className="p-4 bg-c-surface-2/40 rounded-xl space-y-2">
                <h3 className="font-semibold text-c-text">Detalles del Registro</h3>
                {latestWeight ? (
                    <div>
                        <p className="text-sm text-c-text-strong">Basado en el último peso registrado de <span className="font-bold text-c-text">{latestWeight.kg} kg</span>.</p>
                        {doseApplied !== undefined && <p className="text-sm text-c-text-strong">Dosis Calculada: <span className="font-bold text-teal-400">{doseApplied} ml</span></p>}
                        {calculatedCost !== undefined && <p className="text-sm text-c-text-strong">Costo Estimado: <span className="font-bold text-amber-400">${calculatedCost.toFixed(2)}</span></p>}
                    </div>
                ) : (
                    <p className="text-sm text-amber-400">Advertencia: No se encontró un peso reciente para este animal. La dosis y el costo no se pueden calcular automáticamente.</p>
                )}
            </div>

            <div>
                <label htmlFor="date" className="block text-sm font-medium text-c-text-muted mb-1">Fecha de Aplicación</label>
                <input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl"/>
            </div>

            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-c-text-muted mb-1">Notas (Opcional)</label>
                <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anotaciones sobre la aplicación, etc." rows={3} className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl"/>
            </div>

            {error && (<div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red"><AlertTriangle size={18} /><span>{error}</span></div>)}

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-5 py-2 bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-semibold rounded-lg">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-c-accent hover:bg-c-accent/90 text-white font-bold rounded-lg disabled:opacity-50 flex items-center gap-2">
                    {isLoading && <Loader2 size={18} className="animate-spin" />}
                    {isLoading ? 'Guardando...' : 'Confirmar Registro'}
                </button>
            </div>
        </form>
    );
};