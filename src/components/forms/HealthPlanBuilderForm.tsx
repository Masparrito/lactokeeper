import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { PlanActivity, Product, ProductCategory, AdultSubgroup } from '../../db/local';
import { PlusCircle, Trash2, AlertTriangle, CheckCircle, Edit, X, ArrowLeft, Eye } from 'lucide-react';
import { FaSyringe, FaStethoscope, FaBaby, FaTractor } from 'react-icons/fa';
import { Modal } from '../ui/Modal';
import { ProductForm } from './ProductForm';
import { AnimatePresence, motion } from 'framer-motion';
import { PlanPreviewModal } from './PlanPreviewModal';

// --- TIPOS Y PROPS ---
type ActivityType = 'Tratamiento' | 'Control';
interface HealthPlanBuilderFormProps {
    onSave: (plan: { name: string; description?: string; targetGroup: 'Maternidad' | 'Adultos', adultsSubgroup?: AdultSubgroup[] }, activities: Omit<PlanActivity, 'id' | 'healthPlanId'>[]) => Promise<void>;
    onCancel: () => void;
}

// --- SUB-COMPONENTE EDITOR DE ACTIVIDADES ---
const ActivityEditor = ({ targetGroup, activityType, onSaveActivity, existingActivity, clearEditing }: { targetGroup: 'Maternidad' | 'Adultos', activityType: ActivityType, onSaveActivity: (activity: Omit<PlanActivity, 'id' | 'healthPlanId'>, isEditing: boolean) => void, existingActivity: Omit<PlanActivity, 'id' | 'healthPlanId'> | null, clearEditing: () => void }) => {
    const { products, addProduct } = useData();
    const [name, setName] = useState('');
    const [productId, setProductId] = useState('');
    const [complementaryProductId, setComplementaryProductId] = useState('');
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedTimes, setSelectedTimes] = useState<Set<string>>(new Set());
    const [manualTime, setManualTime] = useState('');
    const [expandedMonth, setExpandedMonth] = useState<number | null>(null);

    const PRESET_DAYS = ['0', '8', '15', '21', '30', '45', '60', '75', '90', '105', '120'];
    const CONTROLES_MATERNIDAD = ['Cura de Ombligo', 'Descorne', 'Castración', 'Hematología', 'Coprología', 'FAMACHA'];
    const CONTROLES_ADULTOS = ['Hematología', 'Coprología', 'Arreglo Podal', 'FAMACHA'];
    const TRATAMIENTOS_MATERNIDAD = ['Coxidioestático', 'Desparasitación', 'Vacuna Clostridial'];
    const TRATAMIENTOS_ADULTOS = ['Desparasitación', 'Vacuna Leptospirosis', 'Vacuna Clostridial', 'Vacuna Rabia'];

    const nameSuggestions = activityType === 'Control'
        ? (targetGroup === 'Maternidad' ? CONTROLES_MATERNIDAD : CONTROLES_ADULTOS)
        : (targetGroup === 'Maternidad' ? TRATAMIENTOS_MATERNIDAD : TRATAMIENTOS_ADULTOS);

    const groupedProducts = useMemo(() => {
        return products.reduce((acc, product) => {
            const category = product.category || 'Otro';
            if (!acc[category]) { acc[category] = []; }
            acc[category].push(product);
            return acc;
        }, {} as Record<ProductCategory, Product[]>);
    }, [products]);

    useEffect(() => {
        if (existingActivity) {
            setName(existingActivity.name);
            if (activityType === 'Tratamiento') {
                setProductId(existingActivity.productId || '');
                setComplementaryProductId(existingActivity.complementaryProductId || '');
            }
            if (targetGroup === 'Maternidad' && existingActivity.trigger.days) {
                setSelectedTimes(new Set(existingActivity.trigger.days.map(String)));
            }
            if (targetGroup === 'Adultos' && existingActivity.trigger.month && existingActivity.trigger.week) {
                 setSelectedTimes(new Set([`${existingActivity.trigger.month}-${existingActivity.trigger.week}`]));
            }
        } else {
            resetForm();
        }
    }, [existingActivity, activityType, targetGroup]);

    const resetForm = () => { setName(''); setProductId(''); setComplementaryProductId(''); setSelectedTimes(new Set()); setManualTime(''); setError(null); clearEditing(); };
    const handleTimeToggle = (time: string) => { if (!time.trim()) return; setSelectedTimes(prev => { const newSet = new Set(prev); if (newSet.has(time)) newSet.delete(time); else newSet.add(time); return newSet; }); };
    const handleAddManualTime = () => { if (manualTime && !isNaN(Number(manualTime))) { handleTimeToggle(manualTime); setManualTime(''); } };
    const handleProductSave = async (data: Omit<Product, 'id'>) => { await addProduct(data); setIsProductModalOpen(false); };

    const handleSaveClick = () => {
        setError(null);
        if (!name.trim()) { setError('El nombre es obligatorio.'); return; }
        if (activityType === 'Tratamiento' && !productId) { setError('Debe seleccionar un producto principal.'); return; }
        if (selectedTimes.size === 0) { setError('Debe seleccionar al menos un tiempo de aplicación.'); return; }

        const activitiesToSave: Omit<PlanActivity, 'id'|'healthPlanId'>[] = [];
        const baseActivityPayload: Partial<Omit<PlanActivity, 'id' | 'healthPlanId'>> = { category: activityType, name, };

        if (activityType === 'Tratamiento') {
            if (productId) baseActivityPayload.productId = productId;
            if (complementaryProductId) baseActivityPayload.complementaryProductId = complementaryProductId;
        }

        if (targetGroup === 'Maternidad') {
            const trigger: PlanActivity['trigger'] = { type: 'age', days: Array.from(selectedTimes).map(Number).sort((a, b) => a - b) };
            activitiesToSave.push({ ...baseActivityPayload, trigger } as any);
        } else { // Adultos
            Array.from(selectedTimes).forEach(time => {
                const [month, week] = time.split('-').map(Number);
                const trigger: PlanActivity['trigger'] = { type: 'fixed_date_period', month, week };
                activitiesToSave.push({ ...baseActivityPayload, trigger } as any);
            });
        }

        activitiesToSave.forEach(act => onSaveActivity(act, !!existingActivity));
        resetForm();
    };

    const manualDaysSelected = Array.from(selectedTimes).filter(time => !PRESET_DAYS.includes(time));

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-white">Añadir {activityType}</h3>

            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <input list="activity-names-list" value={name} onChange={e => setName(e.target.value)} placeholder={`Nombre del ${activityType}...`} className="w-full bg-zinc-800 p-3 rounded-lg text-base" />
                    <datalist id="activity-names-list">{nameSuggestions.map(s => <option key={s} value={s} />)}</datalist>
                    {activityType === 'Control' && <button type="button" onClick={() => alert('Funcionalidad para crear nuevos tipos de control en desarrollo.')} className="flex-shrink-0 p-3 bg-brand-orange/80 text-white rounded-lg"><PlusCircle size={20} /></button>}
                </div>

                {activityType === 'Tratamiento' && (
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <select value={productId} onChange={e => setProductId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-lg text-base appearance-none"><option value="" disabled>Producto Principal...</option>{Object.entries(groupedProducts).map(([category, productList]) => ( <optgroup key={category} label={category}>{productList.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}</optgroup>))}</select>
                            <button type="button" onClick={() => setIsProductModalOpen(true)} className="flex-shrink-0 p-3 bg-brand-orange text-white rounded-lg"><PlusCircle size={20} /></button>
                        </div>
                         <div className="flex items-center gap-2">
                            <select value={complementaryProductId} onChange={e => setComplementaryProductId(e.target.value)} className="w-full bg-zinc-800 p-3 rounded-lg text-base appearance-none"><option value="">Producto Complementario (Opcional)...</option>{Object.entries(groupedProducts).map(([category, productList]) => ( <optgroup key={category} label={category}>{productList.map(p => <option key={p.id} value={p.id!}>{p.name}</option>)}</optgroup>))}</select>
                            <button type="button" onClick={() => setIsProductModalOpen(true)} className="flex-shrink-0 p-3 bg-brand-orange/50 text-white rounded-lg"><PlusCircle size={20} /></button>
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <label className="text-base font-medium text-zinc-400">Tiempos de Aplicación (Selecciona uno o varios)</label>
                {targetGroup === 'Maternidad' ? (
                    <>
                        <div className="flex flex-wrap gap-2">
                            {PRESET_DAYS.map(day => <button type="button" key={day} onClick={() => handleTimeToggle(day)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${selectedTimes.has(day) ? 'bg-zinc-200 text-black' : 'bg-zinc-700 text-zinc-300'}`}>{day === '0' ? 'Nacimiento' : `${day} días`}</button>)}
                            {manualDaysSelected.map(day => <button type="button" key={`manual-${day}`} onClick={() => handleTimeToggle(day)} className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-200 text-black`}>{day} días <X size={16}/></button>)}
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <input type="number" value={manualTime} onChange={e => setManualTime(e.target.value)} placeholder="Día manual..." className="w-full bg-zinc-800 p-3 rounded-lg text-base" />
                            <button type="button" onClick={handleAddManualTime} className="px-5 py-3 bg-zinc-700 text-white font-semibold rounded-lg text-sm hover:bg-zinc-600">Agregar</button>
                        </div>
                    </>
                ) : (
                    <div className="p-2 bg-zinc-800 rounded-lg">
                        <AnimatePresence mode="wait">
                           {!expandedMonth ? (
                                <motion.div key="months-view" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="grid grid-cols-4 gap-2">
                                    {[...Array(12)].map((_, monthIndex) => {
                                        const monthNumber = monthIndex + 1;
                                        const monthShort = new Date(0, monthIndex).toLocaleString('es-VE', {month: 'short'});
                                        const hasSelection = Array.from(selectedTimes).some(t => t.startsWith(`${monthNumber}-`));
                                        return (
                                            <button type="button" key={monthNumber} onClick={() => setExpandedMonth(monthNumber)} className="relative text-center py-3 px-2 text-sm font-semibold rounded-md bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors">
                                                {hasSelection && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-green rounded-full" />}
                                                {monthShort.charAt(0).toUpperCase() + monthShort.slice(1)}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            ) : (
                                <motion.div key="weeks-view" initial={{opacity: 0}} animate={{opacity: 1}} exit={{opacity: 0}} className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <button type="button" onClick={() => setExpandedMonth(null)} className="p-2 text-zinc-400 hover:bg-zinc-700 rounded-md"><ArrowLeft size={16}/></button>
                                        <h4 className="font-bold text-white">{new Date(0, expandedMonth - 1).toLocaleString('es-VE', {month: 'long'})}</h4>
                                    </div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[1, 2, 3, 4].map(week => {
                                            const timeValue = `${expandedMonth}-${week}`;
                                            const isSelected = selectedTimes.has(timeValue);
                                            return (
                                                <button type="button" key={week} onClick={() => handleTimeToggle(timeValue)} className={`py-3 px-2 text-sm font-semibold rounded-md transition-colors ${isSelected ? 'bg-teal-500 text-white' : 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'}`}>
                                                    Semana {week}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertTriangle size={16}/> {error}</p>}
            <button type="button" onClick={handleSaveClick} className="w-full py-3 bg-brand-orange text-black font-bold rounded-lg text-base mt-4">{existingActivity ? 'Actualizar Actividad' : 'Añadir a la Lista'}</button>
            <Modal isOpen={isProductModalOpen} onClose={() => setIsProductModalOpen(false)} title="Crear Producto"><ProductForm onSave={handleProductSave} onCancel={() => setIsProductModalOpen(false)} /></Modal>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DEL CONSTRUCTOR ---
export const HealthPlanBuilderForm: React.FC<HealthPlanBuilderFormProps> = ({ onSave, onCancel }) => {
    const [step, setStep] = useState(1);
    const [planName, setPlanName] = useState('');
    const [planDescription, setPlanDescription] = useState('');
    const [targetGroup, setTargetGroup] = useState<'Maternidad' | 'Adultos'>('Maternidad');
    const [selectedSubgroups, setSelectedSubgroups] = useState<Set<AdultSubgroup>>(new Set());
    const [activities, setActivities] = useState<(Omit<PlanActivity, 'id' | 'healthPlanId'> & { tempId: number })[]>([]);
    const [editingActivity, setEditingActivity] = useState<{ activity: Omit<PlanActivity, 'id' | 'healthPlanId'>; tempId: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [activityTypeToAdd, setActivityTypeToAdd] = useState<ActivityType>('Tratamiento');
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const ADULT_SUBGROUPS: AdultSubgroup[] = ['Cabritonas', 'Cabras', 'Reproductores', 'Machos de Levante'];

    const handleSubgroupToggle = (subgroup: AdultSubgroup) => {
        setSelectedSubgroups(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subgroup)) {
                newSet.delete(subgroup);
            } else {
                newSet.add(subgroup);
            }
            return newSet;
        });
    };
    
    const handleSaveActivity = (activity: Omit<PlanActivity, 'id' | 'healthPlanId'>, isEditing: boolean) => {
        if (isEditing && editingActivity) {
            setActivities(prev => prev.map(a => a.tempId === editingActivity.tempId ? { ...activity, tempId: a.tempId } : a));
        } else {
            setActivities(prev => [...prev, { ...activity, tempId: Date.now() }]);
        }
    };
    
    const handleRemoveActivity = (tempIdToRemove: number) => {
        setActivities(prev => prev.filter(a => a.tempId !== tempIdToRemove));
    };

    const handleSavePlan = async () => {
        if (!planName.trim()) { setError("El nombre del plan es obligatorio."); return; }
        if (targetGroup === 'Adultos' && selectedSubgroups.size === 0) { setError("Debe seleccionar al menos una categoría de adulto."); return; }
        if (activities.length === 0) { setError("Debe añadir al menos una actividad al plan."); return; }
        setError(null);
        setIsLoading(true);
        try {
            const finalActivities = activities.map(({ tempId, ...rest }) => rest);
            const planData = { name: planName, description: planDescription, targetGroup, adultsSubgroup: targetGroup === 'Adultos' ? Array.from(selectedSubgroups) : undefined };
            await onSave(planData, finalActivities);
        } catch (err) {
            setError("No se pudo guardar el plan.");
            setIsLoading(false);
        }
    };
    
    const renderStepContent = () => {
        if (step === 1) {
            return (
                <motion.div key="step1" initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 50 }} transition={{ duration: 0.3 }} className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">Crear Plan Sanitario</h2>
                        <p className="text-zinc-400">Paso 1: Define tu plan</p>
                    </div>
                    <div className="space-y-4">
                        <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} placeholder="Nombre del Plan" className="w-full bg-zinc-800 p-3 rounded-xl text-base" />
                        <input type="text" value={planDescription} onChange={e => setPlanDescription(e.target.value)} placeholder="Descripción (Opcional)" className="w-full bg-zinc-800 p-3 rounded-xl text-base" />
                        
                        <div>
                            <label className="text-base font-medium text-zinc-400 mb-2 block">Grupo Objetivo</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button type="button" onClick={() => setTargetGroup('Maternidad')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${targetGroup === 'Maternidad' ? 'bg-teal-500/20 border-teal-500 scale-105' : 'bg-zinc-800/50 border-zinc-700'}`}>
                                    <FaBaby className="w-8 h-8 text-teal-400" />
                                    <span className="font-semibold text-white">Maternidad</span>
                                </button>
                                <button type="button" onClick={() => setTargetGroup('Adultos')} className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${targetGroup === 'Adultos' ? 'bg-pink-500/20 border-pink-500 scale-105' : 'bg-zinc-800/50 border-zinc-700'}`}>
                                    <FaTractor className="w-8 h-8 text-pink-400" />
                                    <span className="font-semibold text-white">Rebaño Adulto</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    {error && <p className="text-sm text-red-400 flex items-center gap-2 mt-4"><AlertTriangle size={16}/> {error}</p>}
                    <div className="flex flex-col sm:flex-row-reverse sm:justify-start gap-3 pt-4">
                        <button onClick={() => { if(planName.trim()) { setStep(2); setError(null); } else { setError("El nombre del plan es obligatorio.")}}} className="w-full sm:w-auto px-5 py-3 bg-brand-orange text-black font-bold rounded-xl flex items-center justify-center gap-2">Siguiente</button>
                        <button onClick={onCancel} className="w-full sm:w-auto px-5 py-3 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-xl">Cancelar</button>
                    </div>
                </motion.div>
            );
        }

        if (step === 2) {
            return (
                <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                    <div className="text-center">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white">{planName || 'Nuevo Plan'}</h2>
                        <p className="text-zinc-400">Paso 2: Añade las actividades para el grupo: <span className="font-semibold text-white">{targetGroup}</span></p>
                    </div>
                    
                    <AnimatePresence>
                        {targetGroup === 'Adultos' && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                                <label className="text-base font-medium text-zinc-400 mb-2 block">Categorías (Selecciona una o varias)</label>
                                <div className="flex flex-wrap gap-2">
                                    {ADULT_SUBGROUPS.map(subgroup => (
                                        <button key={subgroup} type="button" onClick={() => handleSubgroupToggle(subgroup)} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${selectedSubgroups.has(subgroup) ? 'bg-pink-500 text-white' : 'bg-zinc-700 text-zinc-300'}`}>
                                            {subgroup}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                    
                    <div className="space-y-3">
                        <h3 className="text-xl font-semibold text-zinc-300">Actividades del Plan ({activities.length})</h3>
                        <div className="min-h-[100px] max-h-60 overflow-y-auto pr-2 border border-brand-border rounded-xl p-2 space-y-2">
                            <AnimatePresence>
                                {activities.length > 0 ? (
                                    activities.map((act) => (
                                        <motion.div key={act.tempId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={`flex justify-between items-center bg-zinc-800 p-3 rounded-lg border-l-4 ${act.category === 'Tratamiento' ? 'border-blue-500' : 'border-purple-500'}`}>
                                            <div>
                                                <p className="font-semibold text-white">{act.name}</p>
                                                <p className="text-xs text-zinc-400">{act.trigger.days?.map(d => d === 0 ? 'Nacer' : d).join(', ') || 'Tiempos no definidos'} días</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setEditingActivity({ activity: act, tempId: act.tempId })} className="p-1 text-zinc-400 hover:text-brand-orange"><Edit size={16}/></button>
                                                <button onClick={() => handleRemoveActivity(act.tempId)} className="p-1 text-zinc-400 hover:text-brand-red"><Trash2 size={16}/></button>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-zinc-500"><p>Añade actividades para empezar a construir tu plan.</p></div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div>
                        <div className="relative flex w-full max-w-sm mx-auto justify-between rounded-lg bg-zinc-800 p-1 mb-6">
                            <button type="button" onClick={() => setActivityTypeToAdd('Tratamiento')} className="relative z-10 w-1/2 py-2 text-sm font-semibold text-white flex items-center justify-center gap-2"><FaSyringe/> Tratamiento</button>
                            <button type="button" onClick={() => setActivityTypeToAdd('Control')} className="relative z-10 w-1/2 py-2 text-sm font-semibold text-white flex items-center justify-center gap-2"><FaStethoscope/> Control</button>
                            <motion.div layoutId="add-type-bg" transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`absolute top-1 h-[calc(100%-0.5rem)] w-1/2 rounded-md bg-zinc-600 ${activityTypeToAdd === 'Control' ? 'left-1/2' : 'left-1'}`} />
                        </div>
                        <ActivityEditor targetGroup={targetGroup} activityType={activityTypeToAdd} onSaveActivity={handleSaveActivity} existingActivity={editingActivity ? editingActivity.activity : null} clearEditing={() => setEditingActivity(null)} />
                    </div>
                    
                    {error && <p className="text-sm text-red-400 flex items-center gap-2 mt-4"><AlertTriangle size={16}/> {error}</p>}

                    <div className="flex flex-col-reverse sm:flex-row sm:justify-between items-center pt-6 gap-4">
                        <button onClick={() => setStep(1)} className="w-full sm:w-auto px-5 py-3 text-zinc-300 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-700"><ArrowLeft size={16}/> Atrás</button>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button onClick={() => setIsPreviewOpen(true)} className="flex-1 px-5 py-3 bg-brand-blue text-white font-bold rounded-xl flex items-center justify-center gap-2"><Eye size={16}/> Previsualizar</button>
                            <button onClick={handleSavePlan} disabled={isLoading} className="flex-1 px-5 py-3 bg-brand-green text-white font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">{isLoading ? 'Guardando...' : <><CheckCircle size={16}/> Guardar</>}</button>
                        </div>
                    </div>
                </motion.div>
            );
        }
        return null;
    };
    
    return (
        <div className="w-full p-4">
            <AnimatePresence mode="wait">
                {renderStepContent()}
            </AnimatePresence>
            <PlanPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} activities={activities} targetGroup={targetGroup} />
        </div>
    );
};