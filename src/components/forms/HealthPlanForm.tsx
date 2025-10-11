// src/components/forms/HealthPlanForm.tsx

import React, { useState, useEffect } from 'react';
import { HealthPlan, FemaleLifecycleStage, MaleLifecycleStage, ReproductiveStatus } from '../../db/local';
import { AlertTriangle } from 'lucide-react';

interface HealthPlanFormProps {
    onSave: (planData: Omit<HealthPlan, 'id'>) => Promise<void>;
    onCancel: () => void;
    existingPlan?: HealthPlan;
}

// --- LÍNEA CORREGIDA: Se utiliza el término zootécnico correcto "Macho de Levante" ---
const allCategories: (FemaleLifecycleStage | MaleLifecycleStage)[] = [
    'Cabrita', 'Cabritona', 'Cabra Primípara', 'Cabra Multípara',
    'Cabrito', 'Macho de Levante', 'Macho Cabrío'
];

const allReproductiveStatus: ReproductiveStatus[] = [
    'Vacía', 'En Servicio', 'Preñada', 'Post-Parto'
];

export const HealthPlanForm: React.FC<HealthPlanFormProps> = ({ onSave, onCancel, existingPlan }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [minAgeDays, setMinAgeDays] = useState('');
    const [maxAgeDays, setMaxAgeDays] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
    const [selectedStatuses, setSelectedStatuses] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (existingPlan) {
            setName(existingPlan.name);
            setDescription(existingPlan.description);
            setMinAgeDays(existingPlan.targetCriteria.minAgeDays?.toString() || '');
            setMaxAgeDays(existingPlan.targetCriteria.maxAgeDays?.toString() || '');
            setSelectedCategories(new Set(existingPlan.targetCriteria.categories || []));
            setSelectedStatuses(new Set(existingPlan.targetCriteria.targetStatus || []));
        }
    }, [existingPlan]);

    const handleCategoryToggle = (category: string) => {
        setSelectedCategories(prev => {
            const newSet = new Set(prev);
            newSet.has(category) ? newSet.delete(category) : newSet.add(category);
            return newSet;
        });
    };

    const handleStatusToggle = (status: string) => {
        setSelectedStatuses(prev => {
            const newSet = new Set(prev);
            newSet.has(status) ? newSet.delete(status) : newSet.add(status);
            return newSet;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!name.trim()) {
            setError('El nombre del plan es obligatorio.');
            return;
        }
        setIsLoading(true);

        const planData: Omit<HealthPlan, 'id'> = {
            name,
            description,
            targetCriteria: {
                minAgeDays: minAgeDays ? parseInt(minAgeDays, 10) : undefined,
                maxAgeDays: maxAgeDays ? parseInt(maxAgeDays, 10) : undefined,
                categories: Array.from(selectedCategories) as any[],
                targetStatus: Array.from(selectedStatuses) as any[],
            }
        };

        try {
            await onSave(planData);
        } catch (err) {
            setError('No se pudo guardar el plan.');
            console.error(err);
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-zinc-400 mb-1">Nombre del Plan</label>
                    <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Protocolo Pre-parto" className="w-full bg-zinc-800 p-3 rounded-xl" required />
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-zinc-400 mb-1">Descripción (Opcional)</label>
                    <input id="description" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Ej: Vacunación 30 días antes del parto" className="w-full bg-zinc-800 p-3 rounded-xl" />
                </div>
            </div>

            <fieldset className="bg-black/20 rounded-xl p-4 border border-zinc-700">
                <legend className="px-2 text-sm font-semibold text-zinc-300">Criterios de Aplicación (Opcional)</legend>
                <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="minAge" className="block text-xs font-medium text-zinc-400 mb-1">Edad Mínima (días)</label>
                            <input id="minAge" type="number" value={minAgeDays} onChange={e => setMinAgeDays(e.target.value)} placeholder="Ej: 90" className="w-full bg-zinc-800 p-2 rounded-lg" />
                        </div>
                        <div>
                            <label htmlFor="maxAge" className="block text-xs font-medium text-zinc-400 mb-1">Edad Máxima (días)</label>
                            <input id="maxAge" type="number" value={maxAgeDays} onChange={e => setMaxAgeDays(e.target.value)} placeholder="Ej: 210" className="w-full bg-zinc-800 p-2 rounded-lg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">Estado Reproductivo</label>
                        <div className="flex flex-wrap gap-2">
                            {allReproductiveStatus.map(status => (
                                <button    
                                    type="button"    
                                    key={status}    
                                    onClick={() => handleStatusToggle(status)}
                                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${selectedStatuses.has(status) ? 'bg-pink-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-2">Categorías Zootécnicas</label>
                        <div className="flex flex-wrap gap-2">
                            {allCategories.map(category => (
                                <button
                                    type="button"
                                    key={category}
                                    onClick={() => handleCategoryToggle(category)}
                                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${selectedCategories.has(category) ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}
                                >
                                    {category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </fieldset>
            
            {error && (
                <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red">
                    <AlertTriangle size={18} />
                    <span>{error}</span>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">
                    Cancelar
                </button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50">
                    {isLoading ? 'Guardando...' : 'Guardar Plan'}
                </button>
            </div>
        </form>
    );
};