import React, { useState, useEffect } from 'react';
import { PlanActivity, Product } from '../../db/local';
import { useData } from '../../context/DataContext';
import { AlertTriangle, Syringe, ClipboardCheck, PlusCircle } from 'lucide-react';
import { ProductForm } from './ProductForm';
import { Modal } from '../ui/Modal';

interface ActivityFormProps {
    healthPlanId: string;
    targetGroup: 'Maternidad' | 'Adultos';
    onSave: (activity: Omit<PlanActivity, 'id'>) => Promise<void>;
    onCancel: () => void;
    existingActivity?: PlanActivity;
}

const FieldSet = ({ legend, children }: { legend: string, children: React.ReactNode }) => (
    <fieldset className="bg-black/20 rounded-2xl p-4 border border-zinc-700 space-y-4">
        <legend className="px-2 text-sm font-semibold text-zinc-400">{legend}</legend>
        {children}
    </fieldset>
);

const MATERNITY_TREATMENTS = ['Coxidioestático', 'Desparasitación', 'Vacuna Clostridial'];
const ADULT_TREATMENTS = ['Desparasitación', 'Vacuna Leptospirosis', 'Vacuna Clostridial', 'Vacuna Rabia'];
const MATERNITY_CONTROLS = ['Cura de ombligo', 'Revisión de Mucosas (FAMACHA)', 'Descorne', 'Castración'];
const ADULT_CONTROLS = ['Revisión de Mucosas (FAMACHA)', 'Recorte de Pezuñas', 'Toma de muestra de Hematología y Coprología'];
const MATERNITY_DAYS = [1, 8, 15, 21, 30, 45, 60, 90, 120];

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

export const PlanActivityForm: React.FC<ActivityFormProps> = ({ healthPlanId, targetGroup, onSave, onCancel, existingActivity }) => {
    const { products, addProduct } = useData();
    const [category, setCategory] = useState<'Tratamiento' | 'Control'>('Tratamiento');
    const [name, setName] = useState('');
    const [productId, setProductId] = useState<string | undefined>(undefined);
    const [complementaryProductId, setComplementaryProductId] = useState<string | undefined>(undefined);
    const [triggerType, setTriggerType] = useState<'age' | 'fixed_date_period' | 'birthing_season_event'>(
        targetGroup === 'Maternidad' ? 'age' : 'fixed_date_period'
    );
    const [triggerDays, setTriggerDays] = useState('');
    const [triggerMonth, setTriggerMonth] = useState('1');
    const [triggerWeek, setTriggerWeek] = useState('1');
    const [triggerOffsetDays, setTriggerOffsetDays] = useState('');
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const nameSuggestions = targetGroup === 'Maternidad' 
        ? (category === 'Tratamiento' ? MATERNITY_TREATMENTS : MATERNITY_CONTROLS)
        : (category === 'Tratamiento' ? ADULT_TREATMENTS : ADULT_CONTROLS);

    useEffect(() => {
        if (existingActivity) {
            setCategory(existingActivity.category);
            setName(existingActivity.name);
            setProductId(existingActivity.productId);
            setComplementaryProductId(existingActivity.complementaryProductId);
            setTriggerType(existingActivity.trigger.type);
            if (existingActivity.trigger.type === 'age') setTriggerDays(String(existingActivity.trigger.days?.[0] || ''));
            if (existingActivity.trigger.type === 'fixed_date_period') {
                setTriggerMonth(String(existingActivity.trigger.month || '1'));
                setTriggerWeek(String(existingActivity.trigger.week || '1'));
            }
            if (existingActivity.trigger.type === 'birthing_season_event') {
                setTriggerOffsetDays(String(existingActivity.trigger.offsetDays || ''));
            }
        }
    }, [existingActivity]);

    const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
        await addProduct(productData);
        setIsProductModalOpen(false);
    };

    const handleSaveActivity = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
        if (category === 'Tratamiento' && !productId) { setError('Debe seleccionar un producto principal.'); return; }

        let trigger: PlanActivity['trigger'];
        if (targetGroup === 'Maternidad') {
            const daysNum = parseInt(triggerDays, 10);
            if (isNaN(daysNum) || daysNum < 0) { setError('Los días de nacido deben ser un número válido.'); return; }
            // --- CORRECCIÓN: Se guarda como un arreglo ---
            trigger = { type: 'age', days: [daysNum] };
        } else {
            if (triggerType === 'fixed_date_period') {
                trigger = { type: 'fixed_date_period', month: parseInt(triggerMonth, 10), week: parseInt(triggerWeek, 10) };
            } else {
                const offset = parseInt(triggerOffsetDays, 10);
                if (isNaN(offset)) { setError('Debe introducir un número válido de días.'); return; }
                trigger = { type: 'birthing_season_event', offsetDays: offset };
            }
        }
        
        const activityData: Omit<PlanActivity, 'id'> = {
            healthPlanId,
            category,
            name,
            productId,
            complementaryProductId,
            trigger,
        };
        
        await onSave(activityData);
    };

    return (
        <>
            <form onSubmit={handleSaveActivity} className="space-y-6">
                <FieldSet legend="Paso 1: Define la Actividad">
                    <div className="grid grid-cols-2 gap-4">
                        <button type="button" onClick={() => setCategory('Tratamiento')} className={`p-4 rounded-2xl border-2 transition-colors flex flex-col items-center gap-2 ${category === 'Tratamiento' ? 'bg-blue-500/20 border-blue-500' : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'}`}><Syringe className="w-8 h-8 text-blue-400" /><span className="font-semibold text-white">Tratamiento</span></button>
                        <button type="button" onClick={() => setCategory('Control')} className={`p-4 rounded-2xl border-2 transition-colors flex flex-col items-center gap-2 ${category === 'Control' ? 'bg-purple-500/20 border-purple-500' : 'bg-zinc-800/50 border-zinc-700 hover:border-zinc-500'}`}><ClipboardCheck className="w-8 h-8 text-purple-400" /><span className="font-semibold text-white">Control</span></button>
                    </div>
                     <input list="activity-names" value={name} onChange={e => setName(e.target.value)} placeholder={`Nombre del ${category}...`} className="w-full bg-zinc-800 p-3 rounded-xl" required />
                     <datalist id="activity-names">{nameSuggestions.map(s => <option key={s} value={s} />)}</datalist>
                </FieldSet>

                {category === 'Tratamiento' && (
                    <FieldSet legend="Paso 2: Selecciona los Productos">
                        <div className="flex items-center gap-2">
                             <select value={productId || ''} onChange={e => setProductId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl" required><option value="">Producto Principal...</option>{products.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}</select>
                            <button type="button" onClick={() => setIsProductModalOpen(true)} className="flex-shrink-0 p-3 bg-brand-orange text-white rounded-xl"><PlusCircle size={20} /></button>
                        </div>
                        <select value={complementaryProductId || ''} onChange={e => setComplementaryProductId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-xl"><option value="">Producto Complementario (Opcional)...</option>{products.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}</select>
                    </FieldSet>
                )}
            
                <FieldSet legend={`Paso ${category === 'Tratamiento' ? '3' : '2'}: ¿Cuándo se ejecuta?`}>
                    {targetGroup === 'Maternidad' ? (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-medium text-zinc-400 mb-2">A los Días de Nacido</label>
                            <div className="flex flex-wrap gap-2">{MATERNITY_DAYS.map(day => (<button type="button" key={day} onClick={() => setTriggerDays(String(day))} className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${triggerDays === String(day) ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}>{day} días</button>))}</div>
                            <div className="flex items-center gap-2 mt-4"><input type="number" value={triggerDays} onChange={e => setTriggerDays(e.target.value)} placeholder="O escribe los días..." className="w-full bg-zinc-800 p-2 rounded-lg" required /></div>
                        </div>
                    ) : (
                        <>
                            <select value={triggerType} onChange={e => setTriggerType(e.target.value as any)} className="w-full bg-zinc-800 p-2 rounded-lg"><option value="fixed_date_period">Por Fecha Fija Anual</option><option value="birthing_season_event">Relativo a Temporada de Partos</option></select>
                            {triggerType === 'fixed_date_period' && (<div className="grid grid-cols-2 gap-4 animate-fade-in"><div><label htmlFor="triggerMonth" className="block text-xs font-medium text-zinc-400 mb-1">Mes</label><select id="triggerMonth" value={triggerMonth} onChange={e => setTriggerMonth(e.target.value)} className="w-full bg-zinc-800 p-2 rounded-lg">{months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div><div><label htmlFor="triggerWeek" className="block text-xs font-medium text-zinc-400 mb-1">Semana</label><select id="triggerWeek" value={triggerWeek} onChange={e => setTriggerWeek(e.target.value)} className="w-full bg-zinc-800 p-2 rounded-lg">{weeks.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}</select></div></div>)}
                            {triggerType === 'birthing_season_event' && (<div className="animate-fade-in"><label htmlFor="triggerOffsetDays" className="block text-xs font-medium text-zinc-400 mb-1">Días antes (-) / después (+) del inicio de la temporada</label><input id="triggerOffsetDays" type="number" value={triggerOffsetDays} onChange={e => setTriggerOffsetDays(e.target.value)} placeholder="Ej: -30 (para 30 días antes)" className="w-full bg-zinc-800 p-2 rounded-lg" required /></div>)}
                        </>
                    )}
                </FieldSet>
            
                {error && <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red"><AlertTriangle size={18} /> <span>{error}</span></div>}

                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onCancel} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg">Cancelar</button>
                    <button type="submit" className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg">{existingActivity ? 'Actualizar Actividad' : 'Añadir al Plan'}</button>
                </div>
            </form>

            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Crear Nuevo Producto">
                <ProductForm onSave={handleSaveProduct} onCancel={() => setIsProductModalOpen(false)} />
            </Modal>
        </>
    );
};