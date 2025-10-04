import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { CheckCircle, AlertTriangle, ChevronsRight, ChevronLeft, Calendar, Search, PlusCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { AnimalSelectorModal } from '../ui/AnimalSelectorModal';
import { AddLotModal } from '../ui/AddLotModal';
import { AddOriginModal } from '../ui/AddOriginModal';

// --- Definiciones y Constantes ---
const RACES = [
    { name: 'Alpina', acronym: 'A' }, { name: 'Saanen', acronym: 'S' },
    { name: 'Canaria', acronym: 'AGC' }, { name: 'Anglo Nubian', acronym: 'AN' },
    { name: 'Toggenburger', acronym: 'T' }, { name: 'Criolla', acronym: 'C' }
];
const GENDER_SPECIFIC_STAGES = {
    Hembra: ['Cabrita', 'Cabritona', 'Cabra Primípara', 'Cabra Multípara'],
    Macho: ['Cabrito', 'Cabriton', 'Macho Cabrío'],
};

// --- Componente de la Barra de Progreso ---
const ProgressBar = ({ step }: { step: number }) => (
    <div className="flex items-center gap-2 px-4">
        {[1, 2, 3].map(s => (
            <div key={s} className={`h-2 rounded-full transition-all duration-300 ${s <= step ? 'bg-brand-orange' : 'bg-zinc-700'}`} style={{ width: `${100/3}%` }} />
        ))}
    </div>
);

// --- Estilos CSS para el calendario ---
const calendarCss = `
  .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #FF9500; --rdp-background-color: #3a3a3c; --rdp-accent-color-dark: #FF9500; --rdp-background-color-dark: #3a3a3c; --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-outline-selected: 3px solid var(--rdp-accent-color); --rdp-border-radius: 6px; color: #FFF; margin: 1em; }
  .rdp-caption_label, .rdp-nav_button { color: #FF9500; }
  .rdp-caption_dropdowns { color: #000; }
  .rdp-head_cell { color: #8e8e93; }
  .rdp-day_selected { background-color: var(--rdp-accent-color); color: #000; font-weight: bold; }
`;

// --- Props que el formulario aceptará ---
interface AddAnimalFormProps {
    onSaveSuccess: () => void;
    onCancel?: () => void; // Hacemos onCancel opcional
}

export const AddAnimalForm: React.FC<AddAnimalFormProps> = ({ onSaveSuccess, onCancel }) => {
    const { animals, lots, origins, addAnimal } = useData();
    const [step, setStep] = useState(1);
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [isMotherSelectorOpen, setMotherSelectorOpen] = useState(false);
    const [isFatherSelectorOpen, setFatherSelectorOpen] = useState(false);
    const [isLotModalOpen, setLotModalOpen] = useState(false);
    const [isOriginModalOpen, setOriginModalOpen] = useState(false);

    // Estados para cada campo del formulario
    const [animalId, setAnimalId] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [sex, setSex] = useState<'Hembra' | 'Macho' | ''>('');
    const [fatherId, setFatherId] = useState('');
    const [motherId, setMotherId] = useState('');
    const [race, setRace] = useState('');
    const [racialComposition, setRacialComposition] = useState('');
    const [origin, setOrigin] = useState('Finca Masparrito');
    const [birthWeight, setBirthWeight] = useState('');
    const [parturitionType, setParturitionType] = useState('');
    const [location, setLocation] = useState('');
    const [lifecycleStage, setLifecycleStage] = useState('');
    const [isReference, setIsReference] = useState(false);
    const [observations, setObservations] = useState('');
    
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            const year = date.getFullYear();
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            setBirthDate(`${year}-${month}-${day}`);
        }
        setDatePickerOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!animalId || !birthDate || !sex) {
            setMessage({ type: 'error', text: 'Los campos del Paso 1 (ID, Fecha de Nacimiento y Sexo) son obligatorios.' });
            setStep(1);
            return;
        }
        const newAnimal = { 
            id: animalId.toUpperCase(), 
            sex, 
            birthDate, 
            status: 'Activo', 
            lifecycleStage: lifecycleStage || (sex === 'Hembra' ? 'Cabrita' : 'Cabrito'), 
            location: location || 'N/A', 
            origin, 
            birthWeight: birthWeight ? parseFloat(birthWeight) : undefined, 
            parturitionType, 
            fatherId, 
            motherId, 
            race, 
            racialComposition, 
            isReference, 
            observations,
            reproductiveStatus: 'No Aplica'
        };
        try {
            await addAnimal(newAnimal as any);
            setMessage({ type: 'success', text: `Animal ${animalId} agregado con éxito.` });
            setTimeout(() => { onSaveSuccess(); }, 1500); // Llama a la función de éxito
        } catch (error) {
            setMessage({ type: 'error', text: 'No se pudo guardar el animal.' });
            console.error("Error al guardar animal:", error);
        }
    };
    
    return (
        <>
            <div className="space-y-6">
                <ProgressBar step={step} />

                <form onSubmit={handleSubmit} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 sm:p-6 border border-brand-border space-y-6">
                    
                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-lg font-semibold text-white">Identidad del Animal</h2>
                            <div>
                                <label htmlFor="animalId" className="block text-sm font-medium text-zinc-400 mb-1">ID (*)</label>
                                <input autoFocus id="animalId" type="text" value={animalId} onChange={e => setAnimalId(e.target.value.toUpperCase())} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Fecha Nacimiento (*)</label>
                                <button type="button" onClick={() => setDatePickerOpen(true)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-left flex justify-between items-center">
                                    <span className={birthDate ? 'text-white' : 'text-zinc-500'}>{birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Seleccionar fecha...'}</span>
                                    <Calendar className="text-zinc-400" size={20} />
                                </button>
                            </div>
                            <div>
                                <label htmlFor="sex" className="block text-sm font-medium text-zinc-400 mb-1">Sexo (*)</label>
                                <select id="sex" value={sex} onChange={e => { setSex(e.target.value as any); setLifecycleStage(''); }} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" required>
                                    <option value="">Seleccione...</option>
                                    <option value="Hembra">Hembra</option>
                                    <option value="Macho">Macho</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-lg font-semibold text-white">Genealogía y Raza</h2>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Madre</label>
                                <button type="button" onClick={() => setMotherSelectorOpen(true)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-left flex justify-between items-center">
                                    <span className={motherId ? 'text-white' : 'text-zinc-500'}>{motherId || 'Seleccionar...'}</span>
                                    <Search className="text-zinc-400" size={20} />
                                </button>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-1">Padre (Reproductor)</label>
                                 <button type="button" onClick={() => setFatherSelectorOpen(true)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-left flex justify-between items-center">
                                    <span className={fatherId ? 'text-white' : 'text-zinc-500'}>{fatherId || 'Seleccionar...'}</span>
                                    <Search className="text-zinc-400" size={20} />
                                </button>
                            </div>
                            <div><label htmlFor="race" className="block text-sm font-medium text-zinc-400 mb-1">Raza (si es puro)</label><select id="race" value={race} onChange={e => setRace(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg"><option value="">Mestizo / No aplica</option>{RACES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}</select></div>
                            <div><label htmlFor="racialComposition" className="block text-sm font-medium text-zinc-400 mb-1">Composición Racial (mestizo)</label><input id="racialComposition" type="text" placeholder="Ej: 50%A / 50%S" value={racialComposition} onChange={e => setRacialComposition(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" /></div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-fade-in">
                            <h2 className="text-lg font-semibold text-white">Manejo y Detalles</h2>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-zinc-400 mb-1">Ubicación / Lote</label>
                                <div className="flex items-center gap-2">
                                    <select id="location" value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg">
                                        <option value="">Seleccione...</option>
                                        {lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setLotModalOpen(true)} className="p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl">
                                        <PlusCircle size={24} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="origin" className="block text-sm font-medium text-zinc-400 mb-1">Origen</label>
                                <div className="flex items-center gap-2">
                                    <select id="origin" value={origin} onChange={e => setOrigin(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg">
                                        <option value="Finca Masparrito">Finca Masparrito</option>
                                        {origins.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                                    </select>
                                    <button type="button" onClick={() => setOriginModalOpen(true)} className="p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl">
                                        <PlusCircle size={24} />
                                    </button>
                                </div>
                            </div>
                            <div><label htmlFor="lifecycleStage" className="block text-sm font-medium text-zinc-400 mb-1">Estado de Crecimiento</label><select id="lifecycleStage" value={lifecycleStage} onChange={e => setLifecycleStage(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" disabled={!sex}><option value="">Seleccione...</option>{sex && GENDER_SPECIFIC_STAGES[sex].map(stage => <option key={stage} value={stage}>{stage}</option>)}</select></div>
                            <div><label htmlFor="birthWeight" className="block text-sm font-medium text-zinc-400 mb-1">Peso al nacer (Kg)</label><input id="birthWeight" type="number" step="0.1" placeholder="Ej: 4.3" value={birthWeight} onChange={e => setBirthWeight(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" /></div>
                            <div><label htmlFor="parturitionType" className="block text-sm font-medium text-zinc-400 mb-1">Tipo de Parto (origen)</label><select id="parturitionType" value={parturitionType} onChange={e => setParturitionType(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg"><option value="">Seleccione...</option><option>Simple</option><option>Doble</option><option>Triple</option></select></div>
                            <div className="flex items-center gap-3 bg-zinc-800/80 p-3 rounded-xl"><input id="isReference" type="checkbox" checked={isReference} onChange={e => setIsReference(e.target.checked)} className="h-5 w-5 rounded text-brand-orange focus:ring-brand-orange" /><label htmlFor="isReference" className="text-lg text-zinc-300">¿Es un animal de Referencia?</label></div>
                            <div><label htmlFor="observations" className="block text-sm font-medium text-zinc-400 mb-1">Observaciones</label><textarea id="observations" value={observations} onChange={e => setObservations(e.target.value)} rows={3} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg"></textarea></div>
                        </div>
                    )}

                    <div className="flex justify-between items-center pt-4 border-t border-zinc-700">
                        <button type="button" onClick={() => onCancel ? onCancel() : setStep(step - 1)} disabled={step === 1 && !onCancel} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-40 flex items-center gap-2"><ChevronLeft size={18} /> {step > 1 ? 'Anterior' : 'Cancelar'}</button>
                        {step < 3 && ( <button type="button" onClick={() => setStep(step + 1)} className="bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2"> Siguiente <ChevronsRight size={18} /> </button> )}
                        {step === 3 && ( <button type="submit" className="bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg"> Agregar Animal </button> )}
                    </div>
                    {message && ( <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}> {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />} <span>{message.text}</span> </div> )}
                </form>
            </div>
            
            <Modal isOpen={isDatePickerOpen} onClose={() => setDatePickerOpen(false)} title="Seleccionar Fecha de Nacimiento">
                <style>{calendarCss}</style>
                <div className="flex justify-center">
                    <DayPicker mode="single" selected={birthDate ? new Date(birthDate + 'T00:00:00') : undefined} onSelect={handleDateSelect} captionLayout="dropdown" fromYear={new Date().getFullYear() - 20} toYear={new Date().getFullYear()} showOutsideDays />
                </div>
            </Modal>
            
            <AnimalSelectorModal isOpen={isMotherSelectorOpen} onClose={() => setMotherSelectorOpen(false)} onSelect={(selectedId) => { setMotherId(selectedId); setMotherSelectorOpen(false); }} animals={animals} title="Seleccionar Madre" filterSex="Hembra" />
            <AnimalSelectorModal isOpen={isFatherSelectorOpen} onClose={() => setFatherSelectorOpen(false)} onSelect={(selectedId) => { setFatherId(selectedId); setFatherSelectorOpen(false); }} animals={animals} title="Seleccionar Reproductor" filterSex="Macho" />
            <AddLotModal isOpen={isLotModalOpen} onClose={() => setLotModalOpen(false)} />
            <AddOriginModal isOpen={isOriginModalOpen} onClose={() => setOriginModalOpen(false)} />
        </>
    );
};