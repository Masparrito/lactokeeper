// src/components/modals/ParturitionModal.tsx (Corregido)

import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Animal, Father, Parturition } from '../../db/local'; // Import types
import { ArrowLeft, CheckCircle, Plus, X, Calendar, AlertTriangle, Search } from 'lucide-react';
import { AddFatherModal } from '../ui/AddFatherModal'; // Modal for adding sire
import { Modal } from '../ui/Modal'; // Base Modal component
import { AnimalSelectorModal } from '../ui/AnimalSelectorModal'; // Importar el selector
import { DayPicker } from 'react-day-picker'; // Calendar component
import 'react-day-picker/dist/style.css'; // Calendar styles
import { es } from 'date-fns/locale'; // Spanish locale for calendar
import { formatAnimalDisplay } from '../../utils/formatting'; // Formatting function

// --- Tipos y Constantes ---
type Step = 1 | 2 | 3 | 4; // Steps in the modal flow

interface OffspringData {
    id: string; // Temporary unique ID for mapping
    sex: 'Hembra' | 'Macho';
    status: 'Viva' | 'Mortinato'; // Alive or Stillborn
    correlative: string; // User-provided ID part
    birthWeight: string; // Weight input as string
}

const parturitionTypes = [
    { count: 1, name: 'Simple' }, { count: 2, name: 'Doble' }, { count: 3, name: 'Triple' },
    { count: 4, name: 'Cuádruple' }, { count: 5, name: 'Quíntuple' }
];
const MIN_DAYS_BETWEEN_PARTURITIONS = 140;
const MAX_BIRTH_WEIGHT_KG = 7.0;

// (CORREGIDO TS6133) CSS del calendario ahora se usa
const calendarCss = `
  .rdp {
    --rdp-cell-size: 40px; --rdp-accent-color: #FF9500; --rdp-background-color: transparent;
    --rdp-accent-color-dark: #FF9500; --rdp-background-color-dark: transparent;
    --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-border-radius: 12px; color: #FFF; margin: 1em auto;
  }
  .rdp-caption_label { color: #FFF; font-weight: bold;}
  .rdp-nav_button { color: #FF9500; }
  .rdp-head_cell { color: #8e8e93; font-size: 0.8em; }
  .rdp-day { color: #FFF;}
  .rdp-day_selected { background-color: var(--rdp-accent-color); color: #000; font-weight: bold; }
  .rdp-day_today { font-weight: bold; color: #FF9500; }
  .rdp-day_disabled { color: #505054; }
  .rdp-day_outside { color: #505054; }
  .rdp-caption_dropdowns { display: flex; gap: 10px; }
   .rdp-dropdown { background-color: #333; border: 1px solid #555; color: #FFF; padding: 4px 8px; border-radius: 6px; }
`;

interface ParturitionModalProps {
    isOpen: boolean; // Controls modal visibility
    onClose: () => void; // Function to close the modal
    motherId: string; // ID of the dam (mother)
}

// --- COMPONENTE PRINCIPAL DEL MODAL DE PARTO ---
export const ParturitionModal: React.FC<ParturitionModalProps> = ({ isOpen, onClose, motherId }) => {
    const { animals, fathers, addFather, addParturition, parturitions: allParturitions } = useData();
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
        const internalSires: Animal[] = animals.filter(a => a.sex === 'Macho' && a.status === 'Activo');
        const externalSires: any[] = fathers.map(f => ({
            id: f.id, name: f.name, sex: 'Macho', isReference: true,
        }));
        const combined = [...internalSires, ...externalSires];
        return combined.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
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
            setError(`Ya existe un parto registrado para ${motherId} en una fecha demasiado cercana (menos de ${MIN_DAYS_BETWEEN_PARTURITIONS} días).`);
            setIsLoading(false); return;
        }

        try {
            if (!selectedFather) throw new Error("Padre (reproductor) no encontrado en la base de datos.");

            const liveOffspring = offspring.filter(kid => kid.status === 'Viva');
            const hasStillbirths = offspring.some(kid => kid.status === 'Mortinato');
            
            const fatherInitial = selectedFather?.name?.charAt(0).toUpperCase() || '?';
            
            const finalLiveOffspringForDB = liveOffspring.map(kid => ({
                sex: kid.sex, birthWeight: kid.birthWeight,
                id: `${kid.sex === 'Macho' ? 'X' : fatherInitial}${kid.correlative}`
            }));

            await addParturition({
                motherId: motherId.toUpperCase(), parturitionDate, sireId,
                parturitionType: parturitionTypes.find(p => p.count === offspringCount)?.name || 'Simple',
                offspringCount: offspring.length, liveOffspring: finalLiveOffspringForDB,
                parturitionOutcome: hasStillbirths ? 'Con Mortinatos' : 'Normal',
                inducedLactation: true,
            });

            handleNextStep(); setTimeout(onClose, 2000);
        } catch (err: any) {
            setError(err.message || 'Error al registrar el parto. Revisa los datos e IDs de las crías.');
            console.error(err); setIsLoading(false);
        }
    };
    
    const handleSaveFather = async (newFather: Father) => {
        try {
            await addFather(newFather); setSireId(newFather.id); setIsFatherModalOpen(false);
        } catch(err: any) { setError(err.message || 'No se pudo guardar el nuevo padre.'); console.error("Error saving new father:", err); }
    };

    if (!isOpen) return null;

    // --- RENDERIZADO DEL MODAL ---
    return (
        <>
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex flex-col justify-end z-50 animate-fade-in" onClick={onClose}>
                <div className="bg-ios-modal-bg w-full h-[95vh] rounded-t-2xl flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()}>
                    <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-brand-border">
                        {step > 1 && step < 4 && <button onClick={handlePrevStep} className="p-2 text-zinc-400 hover:text-white"><ArrowLeft size={24} /></button>}
                        <h1 className="text-xl font-bold tracking-tight text-white mx-auto">
                            {step === 4 ? 'Éxito' : 'Registrar Parto'}
                        </h1>
                        {step < 4 ? <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white"><X size={24} /></button> : <div className="w-10"></div>}
                    </header>

                    <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                        {step === 1 && (
                            <div className="space-y-6 max-w-md mx-auto">
                                <div className="text-center">
                                    <p className="font-mono font-semibold text-xl text-white truncate">{motherAnimal?.id.toUpperCase()}</p>
                                    {formattedMotherName && (
                                        <p className="text-sm font-normal text-zinc-300 truncate">{formattedMotherName}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha del Parto</label>
                                    <button type="button" onClick={() => setDatePickerOpen(true)} className="w-full bg-zinc-800 p-4 rounded-xl text-lg text-left flex justify-between items-center text-white">
                                        <span>{parturitionDate ? new Date(parturitionDate + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'Seleccionar Fecha'}</span>
                                        <Calendar className="text-zinc-400" size={20} />
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-2">Padre (Reproductor)</label>
                                    
                                    <div className="flex items-center gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setIsSireSelectorOpen(true)} 
                                            className="w-full text-left bg-zinc-800 p-4 rounded-xl text-lg flex justify-between items-center text-white"
                                        >
                                            <span className={sireId ? 'text-white' : 'text-zinc-400'}>
                                                {selectedFather ? formatAnimalDisplay(selectedFather) : 'Seleccionar Reproductor...'}
                                            </span>
                                            <Search size={20} className="text-zinc-400" />
                                        </button>
                                        <button type="button" onClick={() => setIsFatherModalOpen(true)} className="flex-shrink-0 p-4 bg-brand-orange hover:bg-orange-600 text-white rounded-xl"><Plus size={24} /></button>
                                    </div>
                                </div>
                                <button onClick={handleNextStep} disabled={!parturitionDate || !sireId} className="w-full bg-brand-orange text-white font-bold py-4 rounded-xl text-lg disabled:opacity-50">Siguiente</button>
                            </div>
                        )}
                        {step === 2 && (
                            <div className="space-y-6 text-center max-w-md mx-auto">
                                <h2 className="text-2xl font-semibold text-white">¿Cuántas crías nacieron?</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {parturitionTypes.map(pt => ( <button key={pt.count} onClick={() => handleOffspringCountSelect(pt.count)} className="bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-8 rounded-2xl text-2xl transition-colors">{pt.name}</button> ))}
                                </div>
                            </div>
                        )}
                        {step === 3 && (
                            <div className="space-y-4 max-w-xl mx-auto">
                                <div className="text-center mb-4">
                                    <p className="font-mono font-semibold text-xl text-white truncate">{motherAnimal?.id.toUpperCase()}</p>
                                    {formattedMotherName && (
                                        <p className="text-sm font-normal text-zinc-300 truncate">{formattedMotherName}</p>
                                    )}
                                </div>
                                {offspring.map((kid, index) => {
                                    const isStillborn = kid.status === 'Mortinato';
                                    return (
                                        <div key={kid.id} className={`bg-black/20 rounded-2xl p-4 border transition-colors ${isStillborn ? 'border-red-500/30' : 'border-zinc-700'} space-y-3`}>
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold text-brand-orange">Cría {index + 1}</p>
                                                <div className="flex gap-2">
                                                    <div className="w-32"><div className="flex bg-zinc-800 rounded-lg p-1"><button type="button" onClick={() => handleOffspringChange(index, 'status', 'Viva')} className={`w-1/2 text-xs rounded-md py-1 transition-all ${!isStillborn ? 'bg-green-600 text-white':'text-zinc-400'}`}>Viva</button><button type="button" onClick={() => handleOffspringChange(index, 'status', 'Mortinato')} className={`w-1/2 text-xs rounded-md py-1 transition-all ${isStillborn ? 'bg-red-600 text-white':'text-zinc-400'}`}>Mortinato</button></div></div>
                                                    <div className="w-32"><div className="flex bg-zinc-800 rounded-lg p-1"><button type="button" onClick={() => handleOffspringChange(index, 'sex', 'Hembra')} className={`w-1/2 text-xs rounded-md py-1 transition-all ${kid.sex==='Hembra'?'bg-pink-500 text-white':'text-zinc-400'}`}>Hembra</button><button type="button" onClick={() => handleOffspringChange(index, 'sex', 'Macho')} className={`w-1/2 text-xs rounded-md py-1 transition-all ${kid.sex==='Macho'?'bg-blue-500 text-white':'text-zinc-400'}`}>Macho</button></div></div>
                                                </div>
                                            </div>
                                            <div className={`grid grid-cols-2 gap-3 items-center transition-opacity ${isStillborn ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                                                <div className="flex items-center bg-zinc-800 p-3 rounded-xl gap-2">
                                                    <span className="font-mono text-zinc-400 text-lg">{kid.sex === 'Macho' ? 'X' : (selectedFather?.name?.charAt(0).toUpperCase() || '?')}</span>
                                                    <input autoFocus={index === 0} value={kid.correlative} onChange={e => handleOffspringChange(index, 'correlative', e.target.value.toUpperCase())} placeholder="ID" className="w-full bg-transparent text-lg text-white focus:outline-none" disabled={isStillborn} required={!isStillborn}/>
                                                </div>
                                                <input value={kid.birthWeight} onChange={e => handleOffspringChange(index, 'birthWeight', e.target.value)} placeholder="Peso (Kg)" type="number" step="0.1" className="w-full bg-zinc-800 p-3 rounded-xl text-lg text-white" disabled={isStillborn} required={!isStillborn}/>
                                            </div>
                                        </div>
                                    )
                                })}
                                <button onClick={handleSubmit} disabled={isLoading || offspring.some(k => k.status === 'Viva' && (!k.correlative || !k.birthWeight))} className="w-full bg-brand-green text-white font-bold py-4 rounded-xl text-lg disabled:opacity-50">{isLoading ? 'Guardando...' : `Guardar Parto y ${offspringCount} Cría(s)`}</button>
                                {error && <div className="flex items-center gap-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red"><AlertTriangle size={18}/><span>{error}</span></div>}
                            </div>
                        )}
                        {step === 4 && (
                            <div className="text-center flex flex-col justify-center items-center h-full">
                                <CheckCircle size={80} className="text-brand-green mb-4 animate-pulse"/>
                                <h2 className="text-3xl font-bold text-white">¡Éxito!</h2>
                                <p className="text-lg text-zinc-400">El parto de <span className='font-mono font-bold text-white'>{motherAnimal?.id.toUpperCase()}</span> se ha registrado.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {/* --- (INICIO CORRECCIÓN TS2741) --- */}
            {/* El DayPicker ahora está DENTRO del Modal como 'children' */}
            <Modal isOpen={isDatePickerOpen} onClose={() => setDatePickerOpen(false)} title="Seleccionar Fecha del Parto">
                <style>{calendarCss}</style>
                <div className="flex justify-center">
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
            {/* --- (FIN CORRECCIÓN TS2741) --- */}

            <AnimalSelectorModal
                isOpen={isSireSelectorOpen}
                onClose={() => setIsSireSelectorOpen(false)}
                onSelect={(id) => { setSireId(id); setIsSireSelectorOpen(false); }}
                animals={allReproducers}
                title="Seleccionar Padre (Reproductor)"
                filterSex="Macho"
            />

            <AddFatherModal isOpen={isFatherModalOpen} onClose={() => setIsFatherModalOpen(false)} onSave={handleSaveFather} />
        </>
    );
};