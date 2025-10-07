import React, { useState, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { CheckCircle, AlertTriangle, Calendar, Search } from 'lucide-react';
import { AnimalSelectorModal } from '../ui/AnimalSelectorModal';
import { Modal } from '../ui/Modal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Animal } from '../../db/local';

// --- LÓGICA DE CÁLCULO AUTOMÁTICO DE ESTADO ---
const calculateLifecycleStage = (birthDate: string, sex: 'Hembra' | 'Macho'): string => {
    if (!birthDate || !sex) return 'Indefinido';

    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return 'Indefinido';
    
    const ageInDays = (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);

    if (sex === 'Hembra') {
        if (ageInDays <= 60) return 'Cabrita';
        if (ageInDays <= 365) return 'Cabritona';
        // Para un animal nuevo, asumimos que es primípara si tiene más de un año.
        // La lógica para multípara depende de partos existentes, no aplica aquí.
        return 'Cabra Primípara';
    } else { // Macho
        if (ageInDays <= 60) return 'Cabrito';
        if (ageInDays <= 365) return 'Macho de Levante';
        return 'Macho Cabrío (Reproductor)';
    }
};

// --- SUB-COMPONENTES DE UI PARA EL FORMULARIO ---
const FieldSet = ({ legend, children }: { legend: string, children: React.ReactNode }) => (
    <fieldset className="bg-black/20 rounded-2xl p-4 border border-zinc-800/50 space-y-4">
        <legend className="px-2 text-sm font-semibold text-zinc-400">{legend}</legend>
        {children}
    </fieldset>
);

const Toggle = ({ labelOn, labelOff, value, onChange }: { labelOn: string, labelOff: string, value: boolean, onChange: (newValue: boolean) => void }) => (
    <div onClick={() => onChange(!value)} className="w-full bg-zinc-800/80 rounded-xl p-1 flex cursor-pointer">
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${value ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>{labelOn}</span>
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${!value ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}>{labelOff}</span>
    </div>
);

// --- COMPONENTE PRINCIPAL DEL FORMULARIO ---
interface AddAnimalFormProps {
    onSaveSuccess: () => void;
    onCancel: () => void;
}

export const AddAnimalForm: React.FC<AddAnimalFormProps> = ({ onSaveSuccess, onCancel }) => {
    const { addAnimal, animals, lots } = useData();
    
    // Estados del formulario
    const [sex, setSex] = useState<'Hembra' | 'Macho'>('Hembra');
    const [isReference, setIsReference] = useState(false);
    const [animalId, setAnimalId] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [conceptionMethod, setConceptionMethod] = useState('');
    const [birthWeight, setBirthWeight] = useState('');
    const [fatherId, setFatherId] = useState('');
    const [motherId, setMotherId] = useState('');
    const [racialComposition, setRacialComposition] = useState('');
    const [location, setLocation] = useState('');

    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [isMotherSelectorOpen, setMotherSelectorOpen] = useState(false);
    const [isFatherSelectorOpen, setFatherSelectorOpen] = useState(false);

    // Lógica de estado automático
    const lifecycleStage = useMemo(() => calculateLifecycleStage(birthDate, sex), [birthDate, sex]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        if (!animalId || !birthDate) {
            setMessage({ type: 'error', text: 'El ID y la Fecha de Nacimiento son obligatorios.' });
            return;
        }

        const newAnimal: Omit<Animal, 'id'> = {
            sex, isReference, birthDate,
            lifecycleStage: lifecycleStage as any,
            conceptionMethod,
            birthWeight: birthWeight ? parseFloat(birthWeight) : undefined,
            fatherId: fatherId || undefined,
            motherId: motherId || undefined,
            racialComposition: racialComposition || undefined,
            location: location || '',
            status: 'Activo',
            reproductiveStatus: 'No Aplica',
        };

        try {
            await addAnimal({ id: animalId.toUpperCase(), ...newAnimal });
            setMessage({ type: 'success', text: `Animal ${animalId.toUpperCase()} agregado con éxito.` });
            setTimeout(onSaveSuccess, 1500);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'No se pudo guardar el animal.' });
            console.error("Error al guardar animal:", error);
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="w-full space-y-6">
                <FieldSet legend="Categoría">
                    <Toggle labelOn="Hembra" labelOff="Macho" value={sex === 'Hembra'} onChange={(isFemale) => setSex(isFemale ? 'Hembra' : 'Macho')} />
                    <Toggle labelOn="Activo" labelOff="Referencia" value={!isReference} onChange={(isActive) => setIsReference(!isActive)} />
                </FieldSet>

                <FieldSet legend="Identificación">
                    <input autoFocus value={animalId} onChange={e => setAnimalId(e.target.value)} placeholder="Identificación del Animal (ID)" className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" required />
                    <button type="button" onClick={() => setDatePickerOpen(true)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-left flex justify-between items-center">
                        <span className={birthDate ? 'text-white' : 'text-zinc-500'}>{birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha de Nacimiento'}</span>
                        <Calendar className="text-zinc-400" size={20} />
                    </button>
                    <div className="bg-zinc-800/80 p-3 rounded-xl text-lg flex justify-between items-center">
                        <span className="text-zinc-400">Estado:</span>
                        <span className="font-semibold text-white">{lifecycleStage}</span>
                    </div>
                </FieldSet>
                
                <FieldSet legend="Genética y Nacimiento">
                    <select value={conceptionMethod} onChange={e => setConceptionMethod(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg">
                        <option value="">Origen / Concepción...</option>
                        <option value="MN">Monta Natural (MN)</option>
                        <option value="IA">Inseminación Artificial (IA)</option>
                        <option value="TE">Transferencia de Embriones (TE)</option>
                    </select>
                    <input type="number" step="0.1" value={birthWeight} onChange={e => setBirthWeight(e.target.value)} placeholder="Peso al Nacer (Kg)" className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" />
                    <button type="button" onClick={() => setFatherSelectorOpen(true)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-left flex justify-between items-center">
                        <span className={fatherId ? 'text-white' : 'text-zinc-500'}>{fatherId || 'Padre (Semental)'}</span>
                        <Search className="text-zinc-400" size={20} />
                    </button>
                    <button type="button" onClick={() => setMotherSelectorOpen(true)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg text-left flex justify-between items-center">
                        <span className={motherId ? 'text-white' : 'text-zinc-500'}>{motherId || 'Madre'}</span>
                        <Search className="text-zinc-400" size={20} />
                    </button>
                    <input value={racialComposition} onChange={e => setRacialComposition(e.target.value)} placeholder="Composición Racial (Ej: 50%A 50%S)" className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg" />
                </FieldSet>

                <FieldSet legend="Manejo">
                    <select value={location} onChange={e => setLocation(e.target.value)} className="w-full bg-zinc-800/80 p-3 rounded-xl text-lg">
                        <option value="">Ubicación / Lote (Opcional)...</option>
                        {lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                    </select>
                    <p className="text-xs text-zinc-500 text-center px-4">Si no se asigna un lote, se podrá encontrar en el filtro "Última Carga".</p>
                </FieldSet>

                <div className="space-y-3 pt-4">
                    {message && ( <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}> {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />} <span>{message.text}</span> </div> )}
                    <button type="submit" className="w-full bg-brand-green hover:bg-green-600 text-white font-bold py-4 rounded-xl text-lg">Guardar Animal</button>
                    <button type="button" onClick={onCancel} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded-xl text-lg">Cancelar</button>
                </div>
            </form>

            <Modal isOpen={isDatePickerOpen} onClose={() => setDatePickerOpen(false)} title="Seleccionar Fecha de Nacimiento">
                <div className="flex justify-center"><DayPicker mode="single" selected={birthDate ? new Date(birthDate + 'T00:00:00') : undefined} onSelect={(d) => { if(d) setBirthDate(d.toISOString().split('T')[0]); setDatePickerOpen(false); }} captionLayout="dropdown" fromYear={new Date().getFullYear() - 20} toYear={new Date().getFullYear()} /></div>
            </Modal>
            <AnimalSelectorModal isOpen={isMotherSelectorOpen} onClose={() => setMotherSelectorOpen(false)} onSelect={(id) => { setMotherId(id); setMotherSelectorOpen(false); }} animals={animals} title="Seleccionar Madre" filterSex="Hembra" />
            <AnimalSelectorModal isOpen={isFatherSelectorOpen} onClose={() => setFatherSelectorOpen(false)} onSelect={(id) => { setFatherId(id); setFatherSelectorOpen(false); }} animals={animals} title="Seleccionar Padre" filterSex="Macho" />
        </>
    );
};