// src/components/forms/HealthPlanTaskForm.tsx

import React, { useState, useEffect } from 'react';
import { HealthPlanTask } from '../../db/local';
import { useData } from '../../context/DataContext';
import { AlertTriangle } from 'lucide-react';

interface HealthPlanTaskFormProps {
    planId: string;
    onSave: (taskData: Omit<HealthPlanTask, 'id'>) => Promise<void>;
    onCancel: () => void;
    existingTask?: HealthPlanTask;
}

const taskTypes: HealthPlanTask['type'][] = ['Desparasitación', 'Vacunación', 'Vitaminas', 'Minerales', 'Control'];

const months = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
];
const weeks = [
    { value: 1, label: '1ra Semana' }, { value: 2, label: '2da Semana' },
    { value: 3, label: '3ra Semana' }, { value: 4, label: '4ta Semana' }
];

export const HealthPlanTaskForm: React.FC<HealthPlanTaskFormProps> = ({ planId, onSave, onCancel, existingTask }) => {
    const { products } = useData();

    const [name, setName] = useState('');
    const [type, setType] = useState<HealthPlanTask['type']>('Control');
    const [productId, setProductId] = useState('');
    
    // --- MEJORA: Se añade el nuevo tipo de disparador al estado ---
    const [triggerType, setTriggerType] = useState<'age' | 'fixed_date_period' | 'birthing_season_event'>('age');
    const [triggerDays, setTriggerDays] = useState('');
    const [triggerMonth, setTriggerMonth] = useState('1');
    const [triggerWeek, setTriggerWeek] = useState('1');
    const [triggerOffsetDays, setTriggerOffsetDays] = useState(''); // Estado para el nuevo campo
    
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (existingTask) {
            setName(existingTask.name);
            setType(existingTask.type);
            setProductId(existingTask.productId);
            setTriggerType(existingTask.trigger.type);

            if (existingTask.trigger.type === 'age') {
                setTriggerDays(String(existingTask.trigger.days || ''));
            }
            if (existingTask.trigger.type === 'fixed_date_period') {
                setTriggerMonth(String(existingTask.trigger.month || '1'));
                setTriggerWeek(String(existingTask.trigger.week || '1'));
            }
            // --- MEJORA: Se carga el valor del offset si la tarea es de tipo evento de parto ---
            if (existingTask.trigger.type === 'birthing_season_event') {
                setTriggerOffsetDays(String(existingTask.trigger.offsetDays || ''));
            }
        }
    }, [existingTask]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        if (!name.trim() || !productId) {
            setError('El nombre y el producto son obligatorios.');
            setIsLoading(false);
            return;
        }

        let triggerData: HealthPlanTask['trigger'];

        if (triggerType === 'age') {
            if (!triggerDays || parseInt(triggerDays, 10) <= 0) {
                setError('Para el disparador por edad, los días deben ser un número válido.');
                setIsLoading(false); return;
            }
            triggerData = { type: 'age', days: parseInt(triggerDays, 10) };
        } else if (triggerType === 'fixed_date_period') {
            triggerData = {
                type: 'fixed_date_period',
                month: parseInt(triggerMonth, 10),
                week: parseInt(triggerWeek, 10),
            };
        } else { // birthing_season_event
            const offset = parseInt(triggerOffsetDays, 10);
            if (isNaN(offset)) {
                setError('Debe introducir un número válido de días (positivo o negativo).');
                setIsLoading(false); return;
            }
            triggerData = { type: 'birthing_season_event', offsetDays: offset };
        }
        
        const taskData: Omit<HealthPlanTask, 'id'> = { healthPlanId: planId, name, type, productId, trigger: triggerData };

        try {
            await onSave(taskData);
        } catch (err) {
            setError('No se pudo guardar la tarea.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="taskName" className="block text-sm font-medium text-zinc-400 mb-1">Nombre de la Tarea</label>
                <input id="taskName" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Vacuna Pre-parto Clostridial" className="w-full bg-zinc-800 p-3 rounded-xl" required />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="taskType" className="block text-sm font-medium text-zinc-400 mb-1">Tipo de Tarea</label>
                    <select id="taskType" value={type} onChange={e => setType(e.target.value as any)} className="w-full bg-zinc-800 p-3 rounded-xl" required>
                        {taskTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="product" className="block text-sm font-medium text-zinc-400 mb-1">Producto a Utilizar</label>
                    <select id="product" value={productId} onChange={e => setProductId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required>
                        <option value="">Seleccionar producto...</option>
                        {products.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}
                    </select>
                </div>
            </div>
            
            <fieldset className="bg-black/20 rounded-xl p-4 border border-zinc-700">
                <legend className="px-2 text-sm font-semibold text-zinc-300">Disparador (Trigger)</legend>
                <div className="pt-2 space-y-4">
                    <select value={triggerType} onChange={e => setTriggerType(e.target.value as any)} className="w-full bg-zinc-800 p-2 rounded-lg">
                        <option value="age">Por Edad del Animal</option>
                        <option value="fixed_date_period">Por Fecha Fija Anual</option>
                        {/* --- MEJORA: Nueva opción en el selector --- */}
                        <option value="birthing_season_event">Relativo a Temporada de Partos</option>
                    </select>

                    {triggerType === 'age' && (
                        <div className="animate-fade-in">
                            <label htmlFor="triggerDays" className="block text-xs font-medium text-zinc-400 mb-1">Aplicar a los (días de edad)</label>
                            <input id="triggerDays" type="number" value={triggerDays} onChange={e => setTriggerDays(e.target.value)} placeholder="Ej: 60" className="w-full bg-zinc-800 p-2 rounded-lg" required />
                        </div>
                    )}
                    
                    {triggerType === 'fixed_date_period' && (
                        <div className="grid grid-cols-2 gap-4 animate-fade-in">
                            <div>
                                <label htmlFor="triggerMonth" className="block text-xs font-medium text-zinc-400 mb-1">Mes</label>
                                <select id="triggerMonth" value={triggerMonth} onChange={e => setTriggerMonth(e.target.value)} className="w-full bg-zinc-800 p-2 rounded-lg">
                                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="triggerWeek" className="block text-xs font-medium text-zinc-400 mb-1">Semana</label>
                                <select id="triggerWeek" value={triggerWeek} onChange={e => setTriggerWeek(e.target.value)} className="w-full bg-zinc-800 p-2 rounded-lg">
                                    {weeks.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* --- MEJORA: Nuevo campo para el offset de días --- */}
                    {triggerType === 'birthing_season_event' && (
                        <div className="animate-fade-in">
                            <label htmlFor="triggerOffsetDays" className="block text-xs font-medium text-zinc-400 mb-1">Días antes (-) / después (+) del inicio de la temporada</label>
                            <input id="triggerOffsetDays" type="number" value={triggerOffsetDays} onChange={e => setTriggerOffsetDays(e.target.value)} placeholder="Ej: -30 (para 30 días antes)" className="w-full bg-zinc-800 p-2 rounded-lg" required />
                        </div>
                    )}
                </div>
            </fieldset>
            
            {error && (
                <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red">
                    <AlertTriangle size={18} /> <span>{error}</span>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg disabled:opacity-50">
                    {isLoading ? 'Guardando...' : 'Guardar Tarea'}
                </button>
            </div>
        </form>
    );
};