import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal, Father, Parturition } from '../../db/local';
import { ArrowLeft, CheckCircle, Plus, X, Calendar, AlertTriangle, Search, Baby, Save, Loader2 } from 'lucide-react';
import { AddFatherModal } from '../ui/AddFatherModal';
import { Modal } from '../ui/Modal';
import { AnimalSelectorModal } from '../ui/AnimalSelectorModal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';
import { formatAnimalDisplay } from '../../utils/formatting';

type Step = 1 | 2 | 3 | 4;

interface OffspringData {
    id: string;
    sex: 'Hembra' | 'Macho';
    status: 'Viva' | 'Mortinato';
    correlative: string;
    birthWeight: string;
}

const parturitionTypes = [
    { count: 1, name: 'Simple' }, { count: 2, name: 'Doble' }, { count: 3, name: 'Triple' },
    { count: 4, name: 'Cuádruple' }, { count: 5, name: 'Quíntuple' }
];
const MIN_DAYS_BETWEEN_PARTURITIONS = 140;
const MAX_BIRTH_WEIGHT_KG = 7.0;

const calendarCss = `
  .rdp {
    --rdp-cell-size: 40px; --rdp-accent-color: #EC4899; --rdp-background-color: transparent;
    --rdp-accent-color-dark: #EC4899; --rdp-background-color-dark: transparent;
    --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-border-radius: 12px; color: #FFF; margin: 1em auto;
  }
  .rdp-caption_label { color: #FFF; font-weight: bold;}
  .rdp-nav_button { color: #EC4899; }
  .rdp-head_cell { color: #8e8e93; font-size: 0.8em; }
  .rdp-day { color: #FFF;}
  .rdp-day_selected { background-color: var(--rdp-accent-color); color: #fff; font-weight: bold; }
  .rdp-day_today { font-weight: bold; color: #EC4899; }
  .rdp-day_disabled { color: #505054; }
  .rdp-day_outside { color: #505054; }
   .rdp-dropdown { background-color: #333; border: 1px solid #555; color: #FFF; padding: 4px 8px; border-radius: 6px; }
`;

interface ParturitionModalProps {
    isOpen: boolean;
    onClose: () => void;
    motherId: string;
}

export const ParturitionModal: React.FC<ParturitionModalProps> = ({ isOpen, onClose, motherId }) => {
    const { animals, fathers, addFather, addParturition, parturitions: allParturitions, addEvent, updateAnimal } = useData();
    const [step, setStep] = useState<Step>(1);

    const [parturitionDate, setParturitionDate] = useState(new Date().toISOString().split('T')[0]);
    const [sireId, setSireId] = useState('');
    const [offspringCount, setOffspringCount] = useState(1);
    const [offspring, setOffspring] = useState<OffspringData[]>([]);

    const [isSireSelectorOpen, setIsSireSelectorOpen] = useState(false);
    const [isFatherModalOpen, setIsFatherModalOpen] = useState(false);
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const motherAnimal = useMemo(() => animals.find((a: Animal) => a.id === motherId), [animals, motherId]);
    const formattedMotherName = motherAnimal?.name ? String(motherAnimal.name).toUpperCase().trim() : '';

    const allReproducers = useMemo(() => {
        // 1. Machos internos que son explícitamente 'Reproductor' y Activos
        const internalSires = animals.filter(a => 
            a.sex === 'Macho' && 
            a.status === 'Activo' && 
            a.lifecycleStage === 'Reproductor'
        );

        // 2. Machos de referencia externa
        const externalSires: any[] = fathers.map(f => ({
            id: f.id, 
            name: f.name, 
            sex: 'Macho', 
            isReference: true,
            lifecycleStage: 'Reproductor'
        }));

        const combined = [...internalSires, ...externalSires];
        // Eliminamos duplicados por ID
        const uniqueSires = Array.from(new Map(combined.map(item => [item.id, item])).values());

        return uniqueSires.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    }, [animals, fathers]);

    useEffect(() => {
        if (isOpen) {
            setStep(1); setParturitionDate(new Date().toISOString().split('T')[0]); setSireId('');
            setOffspringCount(1); setOffspring([]); setIsLoading(false); setError('');
        }
    }, [isOpen]);

    const handleNextStep = () => setStep(prev => (prev < 4 ? prev + 1 : prev) as Step);
    const handlePrevStep = () => setStep(prev => (prev > 1 ? prev - 1 : prev) as Step);

    const handleOffspringCountSelect = (count: number) => {
        setOffspringCount(count);
        setOffspring(Array.from({ length: count }, (_, i) => ({
            id: `kid_${i}_${Date.now()}`, sex: 'Hembra', status: 'Viva', correlative: '', birthWeight: ''
        })));
        handleNextStep();
    };

    const handleOffspringChange = (index: number, field: keyof OffspringData, value: string) => {
        const updated = [...offspring];
        let finalValue = value;
        if (field === 'birthWeight' && parseFloat(value) > MAX_BIRTH_WEIGHT_KG) {
            finalValue = MAX_BIRTH_WEIGHT_KG.toString();
        }
        // @ts-ignore
        updated[index] = { ...updated[index], [field]: finalValue };
        setOffspring(updated);
    };

    const selectedFather = useMemo(() => allReproducers.find((f) => f.id === sireId), [sireId, allReproducers]);

    const handleSubmit = async () => {
        setIsLoading(true); setError('');

        const motherParturitions = allParturitions.filter((p: Parturition) => p.goatId.toUpperCase() === motherId.toUpperCase());
        const newParturitionTime = new Date(parturitionDate).getTime();
        const isTooClose = motherParturitions.some((p: Parturition) => {
            const existingParturitionTime = new Date(p.parturitionDate).getTime();
            const diffDays = Math.abs(newParturitionTime - existingParturitionTime) / (1000 * 60 * 60 * 24);
            return diffDays < MIN_DAYS_BETWEEN_PARTURITIONS;
        });

        if (isTooClose) {
            setError(`Ya existe un parto registrado para ${motherId} en fecha cercana.`);
            setIsLoading(false); return;
        }

        try {
            const liveOffspring = offspring.filter(kid => kid.status === 'Viva');
            const hasStillbirths = offspring.some(kid => kid.status === 'Mortinato');
            
            const fatherInitial = selectedFather?.name?.charAt(0).toUpperCase() || '?';
            
            const finalLiveOffspringForDB = liveOffspring.map(kid => ({
                sex: kid.sex, birthWeight: parseFloat(kid.birthWeight) || 0,
                id: `${kid.sex === 'Macho' ? 'X' : fatherInitial}${kid.correlative}`
            }));

            await addParturition({
                goatId: motherId.toUpperCase(), 
                parturitionDate, 
                sireId: sireId || undefined,
                parturitionType: parturitionTypes.find(p => p.count === offspringCount)?.name || 'Simple',
                offspringCount: offspring.length, 
                liveOffspring: finalLiveOffspringForDB,
                // @ts-ignore
                parturitionOutcome: hasStillbirths ? 'Con Mortinatos' : 'Normal',
                inducedLactation: false,
                status: 'activa',
                _synced: false
            });

            const mother = animals.find(a => a.id === motherId);
            if (mother) {
                await updateAnimal(motherId, { reproductiveStatus: 'Lactante' as any });
            }

             if(addEvent) {
                 await addEvent({
                    animalId: motherId,
                    date: parturitionDate,
                    type: 'Parto',
                    details: `Parto registrado (Acción Rápida). ${offspringCount} crías. Padre: ${sireId || 'N/A'}.`
                 });
             }

            handleNextStep(); 
            setTimeout(onClose, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al registrar el parto.');
            console.error(err); setIsLoading(false);
        }
    };
    
    const handleSaveFather = async (newFather: Father) => {
        try {
            await addFather(newFather); setSireId(newFather.id); setIsFatherModalOpen(false);
        } catch(err: any) { setError(err.message || 'No se pudo guardar el nuevo padre.'); }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
            
            <div className="bg-[#121214] border-t sm:border border-zinc-800 w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl flex flex-col shadow-2xl h-[95vh] sm:h-auto sm:max-h-[90vh]">
                
                {/* Header */}
                <header className="flex-shrink-0 flex items-center justify-between p-6 border-b border-zinc-800">
                    {step > 1 && step < 4 ? (
                        <button onClick={handlePrevStep} className="p-2 -ml-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors">
                            <ArrowLeft size={24} />
                        </button>
                    ) : <div className="w-10" />}
                    
                    <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                        <Baby className="text-pink-500" />
                        {step === 4 ? '¡Parto Registrado!' : 'Registrar Parto'}
                    </h1>
                    
                    {step < 4 ? (
                        <button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors">
                            <X size={24} />
                        </button>
                    ) : <div className="w-10" />}
                </header>

                <main className="flex-1 overflow-y-auto p-6">
                    
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Madre Info */}
                            <div className="flex items-center gap-4 bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                                <div className="p-3 bg-pink-500/10 rounded-full text-pink-500 border border-pink-500/20">
                                    <Baby size={24} />
                                </div>
                                <div>
                                    <p className="font-mono font-bold text-xl text-white leading-none tracking-tight">{motherId.toUpperCase()}</p>
                                    <p className="text-sm text-zinc-400 mt-1">{formattedMotherName || 'Madre'}</p>
                                </div>
                            </div>

                            {/* Input Fecha */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Fecha del Parto</label>
                                <button type="button" onClick={() => setDatePickerOpen(true)} className="w-full bg-black border border-zinc-800 p-4 rounded-xl text-left flex justify-between items-center text-white hover:border-zinc-600 transition-colors">
                                    <span className="text-lg">{parturitionDate ? new Date(parturitionDate + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'Seleccionar Fecha'}</span>
                                    <Calendar className="text-zinc-500" size={20} />
                                </button>
                            </div>

                            {/* Input Padre */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Padre (Opcional)</label>
                                <div className="flex gap-2">
                                    <button 
                                        type="button" 
                                        onClick={() => setIsSireSelectorOpen(true)} 
                                        className="flex-1 text-left bg-black border border-zinc-800 p-4 rounded-xl flex justify-between items-center text-white hover:border-zinc-600 transition-colors"
                                    >
                                        <span className={`text-lg truncate ${sireId ? 'text-white' : 'text-zinc-500'}`}>
                                            {selectedFather ? formatAnimalDisplay(selectedFather) : 'Seleccionar Reproductor...'}
                                        </span>
                                        <Search size={20} className="text-zinc-500 shrink-0" />
                                    </button>
                                    <button type="button" onClick={() => setIsFatherModalOpen(true)} className="p-4 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-xl transition-colors">
                                        <Plus size={24} />
                                    </button>
                                </div>
                            </div>

                            <button onClick={handleNextStep} disabled={!parturitionDate} className="w-full mt-4 bg-brand-orange hover:bg-orange-600 text-white font-bold py-4 rounded-xl text-lg disabled:opacity-50 shadow-[0_4px_20px_rgba(249,115,22,0.3)] transition-all">
                                Siguiente: Crías
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 text-center">
                            <h2 className="text-2xl font-bold text-white">¿Cuántas crías nacieron?</h2>
                            <p className="text-zinc-400 text-sm -mt-4">Selecciona el número de crías del parto.</p>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {parturitionTypes.map(pt => ( 
                                    <button 
                                        key={pt.count} 
                                        onClick={() => handleOffspringCountSelect(pt.count)} 
                                        className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-brand-orange text-white font-bold py-6 rounded-2xl text-xl transition-all"
                                    >
                                        {pt.name}
                                    </button> 
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-5">
                             <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800 text-center">
                                <p className="text-xs text-zinc-500 uppercase tracking-wider font-bold">Madre</p>
                                <p className="font-mono font-bold text-lg text-white">{motherAnimal?.id.toUpperCase()}</p>
                            </div>

                            {offspring.map((kid, index) => {
                                const isStillborn = kid.status === 'Mortinato';
                                return (
                                    <div key={kid.id} className={`bg-black border rounded-2xl p-5 transition-all ${isStillborn ? 'border-red-900/50 bg-red-900/5' : 'border-zinc-800'}`}>
                                        
                                        <div className="flex justify-between items-center mb-4">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-zinc-800 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">{index + 1}</span>
                                                <p className="font-bold text-white">Datos de la Cría</p>
                                            </div>
                                            
                                            {/* Toggle Status */}
                                            <div className="flex bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                                                <button type="button" onClick={() => handleOffspringChange(index, 'status', 'Viva')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${!isStillborn ? 'bg-green-600 text-white shadow-sm':'text-zinc-500 hover:text-zinc-300'}`}>Viva</button>
                                                <button type="button" onClick={() => handleOffspringChange(index, 'status', 'Mortinato')} className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${isStillborn ? 'bg-red-600 text-white shadow-sm':'text-zinc-500 hover:text-zinc-300'}`}>Muerta</button>
                                            </div>
                                        </div>

                                        {/* Toggle Sexo */}
                                        <div className="flex bg-zinc-900 rounded-xl p-1 border border-zinc-800 mb-4">
                                            <button type="button" onClick={() => handleOffspringChange(index, 'sex', 'Hembra')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${kid.sex==='Hembra'?'bg-pink-600 text-white shadow-md':'text-zinc-500 hover:text-zinc-300'}`}>Hembra</button>
                                            <button type="button" onClick={() => handleOffspringChange(index, 'sex', 'Macho')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${kid.sex==='Macho'?'bg-blue-600 text-white shadow-md':'text-zinc-500 hover:text-zinc-300'}`}>Macho</button>
                                        </div>

                                        <div className={`grid grid-cols-2 gap-4 ${isStillborn ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">ID Cría</label>
                                                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl px-3 h-12">
                                                    <span className="font-mono text-zinc-500 mr-1">{kid.sex === 'Macho' ? 'X' : (selectedFather?.name?.charAt(0).toUpperCase() || '?')}</span>
                                                    <input 
                                                        autoFocus={index === 0} 
                                                        value={kid.correlative} 
                                                        onChange={e => handleOffspringChange(index, 'correlative', e.target.value.toUpperCase())} 
                                                        placeholder="001" 
                                                        className="w-full bg-transparent text-white font-mono text-lg outline-none placeholder:text-zinc-700"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Peso (Kg)</label>
                                                <input 
                                                    value={kid.birthWeight} 
                                                    onChange={e => handleOffspringChange(index, 'birthWeight', e.target.value)} 
                                                    placeholder="0.0" 
                                                    type="number" 
                                                    step="0.1" 
                                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 h-12 text-white font-mono text-lg outline-none focus:border-brand-orange transition-colors placeholder:text-zinc-700"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}

                            {error && (
                                <div className="flex items-center gap-3 p-4 rounded-xl text-sm bg-red-500/10 border border-red-500/20 text-red-400 font-medium animate-pulse">
                                    <AlertTriangle size={18} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button 
                                onClick={handleSubmit} 
                                disabled={isLoading || offspring.some(k => k.status === 'Viva' && (!k.correlative || !k.birthWeight))} 
                                className="w-full mt-2 bg-brand-green hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg disabled:opacity-50 shadow-[0_4px_20px_rgba(34,197,94,0.3)] flex items-center justify-center gap-2 transition-all"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin"/> : <><Save size={20} /> Guardar Todo</>}
                            </button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="text-center flex flex-col justify-center items-center h-64">
                            <div className="w-24 h-24 bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                                <CheckCircle size={64} className="text-green-500 animate-bounce"/>
                            </div>
                            <h2 className="text-3xl font-bold text-white mb-2">¡Parto Registrado!</h2>
                            <p className="text-zinc-400">
                                Se ha registrado el parto y creado las crías exitosamente.
                            </p>
                        </div>
                    )}
                </main>
            </div>

            {/* --- MODALES AUXILIARES --- */}

            <Modal isOpen={isDatePickerOpen} onClose={() => setDatePickerOpen(false)} title="Seleccionar Fecha">
                <style>{calendarCss}</style>
                <div className="flex justify-center p-4">
                    <DayPicker
                        mode="single"
                        selected={new Date(parturitionDate + 'T00:00:00Z')}
                        onSelect={(d?: Date) => { if (d) { setParturitionDate(d.toISOString().split('T')[0]); } setDatePickerOpen(false); }}
                        locale={es}
                        disabled={{ after: new Date() }}
                        captionLayout="dropdown-buttons"
                        fromYear={new Date().getFullYear() - 2}
                        toYear={new Date().getFullYear()}
                    />
                </div>
            </Modal>

            <AnimalSelectorModal
                isOpen={isSireSelectorOpen}
                onClose={() => setIsSireSelectorOpen(false)}
                onSelect={(id) => { setSireId(id); setIsSireSelectorOpen(false); }}
                animals={allReproducers}
                title="Seleccionar Padre"
                filterSex="Macho"
            />

            <AddFatherModal isOpen={isFatherModalOpen} onClose={() => setIsFatherModalOpen(false)} onSave={handleSaveFather} />
        </div>
    );
};