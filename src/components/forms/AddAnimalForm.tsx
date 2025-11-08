// src/components/forms/AddAnimalForm.tsx (Actualizado)

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { CheckCircle, AlertTriangle, Calendar, Search, Plus, ChevronDown, X, Delete } from 'lucide-react';
import { AnimalSelectorModal } from '../ui/AnimalSelectorModal';
import { Animal } from '../../db/local';
// --- CORRECCIÓN: 'calculateLifecycleStage' (la local) ahora se usa en su lugar ---
import { calculateBreedFromComposition, calculateChildComposition } from '../../utils/calculations';
import { formatAnimalDisplay } from '../../utils/formatting';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';

// --- LÓGICA DE CÁLCULO (Completa) ---
// (CAMBIO) "Cabra Adulta" -> "Cabra"
const calculateLifecycleStage = (birthDate: string, sex: 'Hembra' | 'Macho'): string => {
    if (!birthDate || !sex) return 'Indefinido';
    const today = new Date();
    const birth = new Date(birthDate + 'T00:00:00'); // Asegurar UTC
    if (isNaN(birth.getTime())) return 'Indefinido';
    const ageInDays = (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
    if (sex === 'Hembra') {
        if (ageInDays <= 60) return 'Cabrita';
        if (ageInDays <= 365) return 'Cabritona';
        return 'Cabra'; // CORREGIDO
    } else { // Macho
        if (ageInDays <= 60) return 'Cabrito';
        if (ageInDays <= 365) return 'Macho de Levante';
        return 'Reproductor'; // CORREGIDO
    }
};


// --- SUB-COMPONENTES DE UI ESTILO iOS (Completos) ---
const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        {...props}
        className={`w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-50 disabled:bg-brand-dark/50 ${className}`}
    />
));

const FormSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ children, ...props }, ref) => (
    <div className="relative w-full">
        <select
            ref={ref}
            {...props}
            className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-orange"
        >
            {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
    </div>
));

const FormGroup: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-brand-glass rounded-2xl border border-brand-border p-4 space-y-4">
        <h2 className="text-zinc-400 font-semibold text-sm uppercase tracking-wide">{title}</h2>
        {children}
    </div>
);

const Toggle = ({ labelOn, labelOff, value, onChange }: { labelOn: string, labelOff: string, value: boolean, onChange: (newValue: boolean) => void }) => (
    <div onClick={() => onChange(!value)} className="w-full bg-brand-dark rounded-xl p-1 flex cursor-pointer">
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${value ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>{labelOn}</span>
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${!value ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>{labelOff}</span>
    </div>
);

// --- COMPONENTE PRINCIPAL DEL FORMULARIO ---
interface AddAnimalFormProps {
    onSaveSuccess: () => void;
    onCancel: () => void;
}

export const AddAnimalForm: React.FC<AddAnimalFormProps> = ({ onSaveSuccess, onCancel }) => {
    const { addAnimal, animals, lots, fathers } = useData();

    // Estados del formulario
    const [status, setStatus] = useState<'Activo' | 'Referencia'>('Activo');
    const [sex, setSex] = useState<'Hembra' | 'Macho'>('Hembra');
    const [animalId, setAnimalId] = useState('');
    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [geneticMethod, setGeneticMethod] = useState('MN');
    const [birthWeight, setBirthWeight] = useState('');
    // --- (NUEVO) Estado para Tipo de Parto ---
    const [parturitionType, setParturitionType] = useState('Simple');
    const [fatherId, setFatherId] = useState<string | null>(null);
    const [motherId, setMotherId] = useState<string | null>(null);
    const [racialComposition, setRacialComposition] = useState('');
    const [breed, setBreed] = useState('');
    const [isCompositionDisabled, setIsCompositionDisabled] = useState(false);
    const [location, setLocation] = useState('');
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [idExistsError, setIdExistsError] = useState<string | null>(null);
    const [lifecycleStageManual, setLifecycleStageManual] = useState<string>('Indefinido');

    // Estados de Modales y Teclados
    const [isDatePickerOpen, setDatePickerOpen] = useState(false);
    const [isMotherSelectorOpen, setMotherSelectorOpen] = useState(false);
    const [isFatherSelectorOpen, setFatherSelectorOpen] = useState(false);
    const [isIdKeyboardOpen, setIsIdKeyboardOpen] = useState(false);
    const [isRacialKeyboardOpen, setIsRacialKeyboardOpen] = useState(false);
    const [isParentModalOpen, setIsParentModalOpen] = useState<'mother' | 'father' | null>(null);

    // Lógica para el Estado de Ciclo de Vida (Auto si hay fecha, Manual si no)
    const lifecycleStageAuto = useMemo(() => {
        if (!birthDate) return 'Indefinido';
        return calculateLifecycleStage(birthDate, sex);
    }, [birthDate, sex]);

    const finalLifecycleStage = birthDate ? lifecycleStageAuto : lifecycleStageManual;

    // Calcular Raza
    useEffect(() => {
        setBreed(calculateBreedFromComposition(racialComposition));
    }, [racialComposition]);

    // Listas para selectores
    const mothers = useMemo(() => animals.filter(a => a.sex === 'Hembra'), [animals]);
    
    const sires = useMemo(() => {
        return animals.filter(a => a.sex === 'Macho'); // Incluir Activos Y Referencia
    }, [animals]);

    // (CAMBIO) "Macho Cabrío" -> "Reproductor"
    const allFathers = useMemo(() => {
        const internalSires: Animal[] = sires; // Usar la lista 'sires' directamente
        const externalSires: Animal[] = fathers.map(f => ({
            id: f.id,
            name: f.name,
            sex: 'Macho',
            status: 'Activo',
            isReference: true,
            birthDate: 'N/A',
            lifecycleStage: 'Reproductor', // CORREGIDO
            location: 'Referencia',
            reproductiveStatus: 'No Aplica',
            createdAt: 0,
            lastWeighing: null,
            // Asegurarse de que todos los campos de Animal estén presentes
            // (los opcionales `?:` no necesitan estar aquí)
        }));
        return [...internalSires, ...externalSires];
    }, [sires, fathers]);

    // Calcular Composición por padres
    useEffect(() => {
        const mother = animals.find(a => a.id === motherId);
        const father = allFathers.find(a => a.id === fatherId); // Usar allFathers

        if (mother?.racialComposition && father?.racialComposition) {
            const childComp = calculateChildComposition(mother.racialComposition, father.racialComposition);
            setRacialComposition(childComp); setIsCompositionDisabled(true);
        } else { if (!mother || !father) { setIsCompositionDisabled(false); } }
    }, [motherId, fatherId, animals, allFathers]); // Usar 'animals' (para 'mother') y 'allFathers'

    // Validar ID en tiempo real
    useEffect(() => {
        setMessage(null);
        if (animalId && status === 'Activo') {
            const exists = animals.some(a => a.id.toLowerCase() === animalId.toLowerCase());
            if (exists) { setIdExistsError(`El ID "${animalId.toUpperCase()}" ya existe en el rebaño principal.`); }
            else { setIdExistsError(null); }
        } else { setIdExistsError(null); }
    }, [animalId, animals, status]);

    const locationsList = useMemo(() => lots, [lots]);

    // --- Handler Principal para Guardar Animal ---
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null); setIdExistsError(null);

        // --- VALIDACIONES ---
        if (status === 'Activo' && !animalId) {
            setMessage({ type: 'error', text: 'El ID del animal es obligatorio para animales Activos.' });
            return;
        }

        if (animalId && status === 'Activo') {
            const exists = animals.some(a => a.id.toLowerCase() === animalId.toLowerCase());
            if (exists) {
                setIdExistsError(`El ID "${animalId.toUpperCase()}" ya existe en el rebaño principal.`);
                setMessage({ type: 'error', text: `El ID "${animalId.toUpperCase()}" ya existe.` });
                return;
            }
        }

        // --- ALERTA DE COMPOSICIÓN RACIAL ---
        if (!racialComposition) {
            const confirmed = window.confirm(
                "ALERTA\n\nNo has especificado una Composición Racial. El animal se guardará sin raza definida.\n\n¿Deseas guardar de todas formas?"
            );
            if (!confirmed) {
                setMessage({ type: 'error', text: 'Guardado cancelado. Por favor, añade la composición racial.' });
                return; // Detener el guardado
            }
        }
        // --- FIN DE ALERTA ---

        const newAnimal: Animal = {
            id: animalId.toUpperCase() || `REF-${Date.now()}`,
            name: name || undefined,
            birthDate: birthDate || 'N/A',
            sex: sex,
            isReference: status === 'Referencia',
            status: 'Activo',
            lifecycleStage: finalLifecycleStage as any,
            conceptionMethod: geneticMethod || undefined,
            birthWeight: birthWeight ? parseFloat(birthWeight) : undefined,
            parturitionType: parturitionType || undefined, // --- (NUEVO) Campo añadido ---
            fatherId: fatherId || undefined,
            motherId: motherId || undefined,
            racialComposition: racialComposition || undefined,
            breed: breed || undefined,
            location: location || '',
            reproductiveStatus: sex === 'Hembra' ? 'Vacía' : 'No Aplica',
            createdAt: new Date().getTime(),
            lastWeighing: null,
        };

        try {
            await addAnimal(newAnimal);
            setMessage({ type: 'success', text: `Animal ${formatAnimalDisplay(newAnimal)} agregado con éxito.` });
            setTimeout(onSaveSuccess, 1000);
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'No se pudo guardar el animal.' });
            console.error("Error al guardar animal:", error);
        }
    };

    // Handler para Guardar Padre Rápido
    const handleSaveQuickParent = (newParent: Animal) => {
        if (isParentModalOpen === 'father') {
            setFatherId(newParent.id);
        } else if (isParentModalOpen === 'mother') {
            setMotherId(newParent.id);
        }
        setIsParentModalOpen(null);
    };

    // --- RENDERIZADO DEL FORMULARIO PRINCIPAL ---
    return (
        <>
            <form onSubmit={handleSubmit} className="w-full space-y-6">

                {/* Categoría (Status y Sexo) */}
                <FormGroup title="Categoría del Animal (Obligatorio)">
                    <Toggle labelOn="Activo" labelOff="Referencia" value={status === 'Activo'} onChange={(isActive) => { setStatus(isActive ? 'Activo' : 'Referencia'); if (!isActive) setIdExistsError(null); }} />
                    <Toggle labelOn="Hembra" labelOff="Macho" value={sex === 'Hembra'} onChange={(isFemale) => setSex(isFemale ? 'Hembra' : 'Macho')} />
                </FormGroup>

                {/* ID Animal */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">ID Animal {status === 'Activo' ? '(Obligatorio)' : '(Opcional para Referencia)'}</label>
                    <input
                        type="text"
                        value={animalId}
                        onClick={() => setIsIdKeyboardOpen(true)}
                        readOnly
                        placeholder={status === 'Activo' ? "T047" : "Opcional..."}
                        className={`w-full bg-brand-glass border rounded-xl p-4 text-white text-center text-3xl font-mono tracking-widest placeholder-zinc-700 focus:outline-none focus:ring-2 cursor-pointer ${idExistsError ? 'border-brand-red ring-brand-red' : 'border-brand-border focus:ring-brand-orange'}`}
                        required={status === 'Activo'}
                    />
                    {idExistsError && ( <p className="mt-2 text-sm text-brand-red flex items-center justify-center gap-1"><AlertTriangle size={14} /> {idExistsError}</p> )}
                </div>

                {/* Nombre (Opcional) */}
                <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Nombre (Opcional)</label>
                    <FormInput type="text" value={name} onChange={(e) => setName(e.target.value.toUpperCase())} placeholder="Ej: PRINCESA" />
                </div>

                {/* Genética y Nacimiento */}
                <FormGroup title="Genética y Nacimiento">
                    {/* Fecha de Nacimiento */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Fecha de Nacimiento (Opcional)</label>
                        <button type="button" onClick={() => setDatePickerOpen(true)} className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-white flex justify-between items-center">
                            <span className={birthDate ? 'text-white' : 'text-zinc-500'}>{birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Seleccionar fecha...'}</span>
                            <Calendar className="text-zinc-400" size={20} />
                        </button>
                    </div>

                    {/* --- ESTADO (Auto-calculado/Manual) --- */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Estado (Categoría Zootécnica)</label>
                        {birthDate ? (
                            <FormInput type="text" value={lifecycleStageAuto} readOnly disabled />
                        ) : (
                            // (CAMBIO) "Cabra Adulta" -> "Cabra"
                            <FormSelect value={lifecycleStageManual} onChange={e => setLifecycleStageManual(e.target.value)}>
                                <option value="Indefinido">Seleccionar Categoría...</option>
                                <option value="Cabrita">Cabrita</option>
                                <option value="Cabritona">Cabritona</option>
                                <option value="Cabra">Cabra</option> 
                                <option value="Cabrito">Cabrito</option>
                                <option value="Macho de Levante">Macho de Levante</option>
                                <option value="Reproductor">Reproductor</option> 
                            </FormSelect>
                        )}
                    </div>
                    {/* --- (NUEVO) Layout para Método, Peso y Tipo de Parto --- */}
                    <FormSelect value={geneticMethod} onChange={e => setGeneticMethod(e.target.value)}>
                        <option value="MN">Monta Natural (MN)</option>
                        <option value="IA">Inseminación Artificial (IA)</option>
                        <option value="TE">Transferencia de Embriones (TE)</option>
                        <option value="">Otro/Desconocido</option>
                    </FormSelect>
                    <div className="grid grid-cols-2 gap-4">
                        <FormInput 
                            type="number" 
                            step="0.1" 
                            value={birthWeight} 
                            onChange={e => setBirthWeight(e.target.value)} 
                            placeholder="Peso al Nacer (Kg)" 
                        />
                        <FormSelect value={parturitionType} onChange={e => setParturitionType(e.target.value)}>
                            <option value="Simple">Parto Simple</option>
                            <option value="TW">Doble (TW)</option>
                            <option value="TR">Triple (TR)</option>
                            <option value="QD">Cuádruple (QD)</option>
                        </FormSelect>
                    </div>
                    {/* --- (FIN NUEVO LAYOUT) --- */}

                    {/* Padre */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Padre (Reproductor)</label>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setFatherSelectorOpen(true)} className="w-full text-left bg-brand-glass border border-brand-border rounded-xl p-3 text-white placeholder-zinc-500 flex justify-between items-center">
                                <span className={fatherId ? 'text-white' : 'text-zinc-500'}>
                                    {fatherId ? (formatAnimalDisplay(allFathers.find(f => f.id === fatherId)) || fatherId) : 'Seleccionar padre...'}
                                </span>
                                <Search size={18} className="text-zinc-400" />
                            </button>
                            <button type="button" onClick={() => setIsParentModalOpen('father')} className="p-3 bg-brand-glass border border-brand-border rounded-xl text-brand-orange hover:bg-brand-orange/20 flex-shrink-0"><Plus size={20} /></button>
                        </div>
                    </div>
                    {/* Madre */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Madre</label>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setMotherSelectorOpen(true)} className="w-full text-left bg-brand-glass border border-brand-border rounded-xl p-3 text-white placeholder-zinc-500 flex justify-between items-center">
                                <span className={motherId ? 'text-white' : 'text-zinc-500'}>
                                    {motherId ? (formatAnimalDisplay(mothers.find(m => m.id === motherId)) || motherId) : 'Seleccionar madre...'}
                                </span>
                                <Search size={18} className="text-zinc-400" />
                            </button>
                            <button type="button" onClick={() => setIsParentModalOpen('mother')} className="p-3 bg-brand-glass border border-brand-border rounded-xl text-brand-orange hover:bg-brand-orange/20 flex-shrink-0"><Plus size={20} /></button>
                        </div>
                    </div>
                    {/* Composición Racial */}
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-2">Composición Racial (Ej: 50%A 50%S)</label>
                        <input type="text" value={racialComposition} onClick={() => { if (!isCompositionDisabled) setIsRacialKeyboardOpen(true); }} readOnly placeholder="100%A ó 75%A 25%AGC" disabled={isCompositionDisabled} className={`w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-orange ${isCompositionDisabled ? 'opacity-50 bg-brand-dark/50' : 'cursor-pointer'}`}/>
                    </div>
                    <div><label className="block text-sm font-medium text-zinc-400 mb-2">Raza (Auto-calculada)</label><FormInput type="text" value={breed} readOnly disabled placeholder="Ej: Mestiza Alpina"/></div>
                </FormGroup>

                {/* Manejo */}
                <FormGroup title="Manejo">
                    <FormSelect value={location} onChange={e => setLocation(e.target.value)}><option value="">Ubicación / Lote (Opcional)...</option>{locationsList.map((loc: { id: string; name: string }) => <option key={loc.id} value={loc.name}>{loc.name}</option>)}</FormSelect>
                    <p className="text-xs text-zinc-500 text-center px-4">Si no se asigna un lote, se podrá encontrar en el filtro "Última Carga".</p>
                </FormGroup>

                {/* Botones Guardar/Cancelar */}
                <div className="space-y-3 pt-4">
                    {message && ( <div className={`flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}> {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />} <span>{message.text}</span> </div> )}
                    <button type="submit" disabled={!!idExistsError} className={`w-full text-white font-bold py-4 rounded-xl text-lg ${idExistsError ? 'bg-zinc-600 cursor-not-allowed' : 'bg-brand-green hover:bg-green-600'}`}>Guardar Animal</button>
                    <button type="button" onClick={onCancel} className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-3 rounded-xl text-lg">Cancelar</button>
                </div>
            </form>

            {/* --- Modales y Teclados del Formulario Principal --- */}
            {isDatePickerOpen && <BottomSheetDatePicker onClose={() => setDatePickerOpen(false)} onSelectDate={(d) => { if(d) setBirthDate(d.toISOString().split('T')[0]); setDatePickerOpen(false); }} currentValue={birthDate ? new Date(birthDate + 'T00:00:00') : new Date()} />}
            <AnimalSelectorModal isOpen={isMotherSelectorOpen} onClose={() => setMotherSelectorOpen(false)} onSelect={(id) => { setMotherId(id); setMotherSelectorOpen(false); }} animals={mothers} title="Seleccionar Madre" filterSex="Hembra" />
            <AnimalSelectorModal isOpen={isFatherSelectorOpen} onClose={() => setFatherSelectorOpen(false)} onSelect={(id) => { setFatherId(id); setFatherSelectorOpen(false); }} animals={allFathers} title="Seleccionar Padre" filterSex="Macho" />
            
            {isIdKeyboardOpen && <CustomAlphanumericKeyboard onClose={() => setIsIdKeyboardOpen(false)} onInput={(val) => setAnimalId(val.toUpperCase())} currentValue={animalId} />}
            {isRacialKeyboardOpen && <RacialCompositionKeyboard onClose={() => setIsRacialKeyboardOpen(false)} onInput={setRacialComposition} currentValue={racialComposition} />}
            {isParentModalOpen && <AddQuickParentModal type={isParentModalOpen} onClose={() => setIsParentModalOpen(null)} onSave={handleSaveQuickParent} />}
        </>
    );
};

// =================================================================================
// --- COMPONENTES DE UI (Calendario, Teclado ID, Teclado Racial, Modal Padre Rápido) ---
// =================================================================================

// --- Calendario Bottom Sheet ---
interface BottomSheetDatePickerProps { onClose: () => void; onSelectDate: (date: Date | undefined) => void; currentValue: Date; }
const BottomSheetDatePicker: React.FC<BottomSheetDatePickerProps> = ({ onClose, onSelectDate, currentValue }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="fixed bottom-0 left-0 right-0 w-full bg-ios-modal-bg rounded-t-2xl p-4 shadow-lg animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}>
                <div onClick={onClose} className="w-16 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer"></div>
                <div className="flex justify-center [&_.rdp]:bg-transparent [&_.rdp]:text-white [&_.rdp-caption_select]:bg-brand-glass [&_.rdp-caption_select]:border-brand-border [&_.rdp-caption_select]:text-white [&_.rdp-caption_select]:rounded-lg [&_.rdp-day_selected]:bg-brand-orange [&_.rdp-day_selected]:text-white [&_.rdp-day_today]:text-brand-orange [&_.rdp-nav_button]:text-zinc-400 [&_.rdp-head_cell]:text-zinc-500 [&_.rdp-day]:text-zinc-200 [&_.rdp-day_outside]:text-zinc-600">
                    <DayPicker mode="single" selected={currentValue} onSelect={onSelectDate} captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 20} toYear={new Date().getFullYear()} defaultMonth={currentValue} locale={es} />
                </div>
            </div>
        </div>
    );
};

// --- Teclado Alfanumérico (ID) ---
interface CustomKeyboardProps { onClose: () => void; onInput: (value: string) => void; currentValue: string; }
const CustomAlphanumericKeyboard: React.FC<CustomKeyboardProps> = ({ onClose, onInput, currentValue }) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '-', '0', 'DEL'];
    const handleKeyPress = (key: string) => {
        if (key === 'DEL') { handleDelete(); return; }
        if (key && currentValue.length < 15) { onInput(currentValue + key); }
    };
    const handleDelete = () => { onInput(currentValue.slice(0, -1)); };
    return (
        <div className="fixed inset-0 z-[100] bg-black/50" onClick={onClose}>
            <div className="fixed bottom-0 left-0 right-0 w-full bg-[#333333] p-2 space-y-2" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' }}>
                <div className="flex flex-nowrap space-x-1.5 overflow-x-auto py-2 alphabet-scroller" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`.alphabet-scroller::-webkit-scrollbar { display: none; }`}</style>
                    {alphabet.map(key => <button key={key} onClick={() => handleKeyPress(key)} className="flex-shrink-0 w-10 h-10 bg-[#555555] text-white rounded-md text-lg font-medium active:bg-zinc-500">{key}</button>)}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {numpadKeys.map(key => <button key={key} onClick={() => handleKeyPress(key)} className="h-12 bg-[#555555] text-white rounded-md text-xl font-medium active:bg-zinc-500 flex items-center justify-center">{key === 'DEL' ? <Delete size={20} /> : key}</button>)}
                </div>
                <button onClick={onClose} className="h-12 w-full bg-blue-600 text-white rounded-md text-lg font-semibold active:bg-blue-700">Done</button>
            </div>
        </div>
    );
};

// --- Teclado Específico para Composición Racial ---
interface RacialKeyboardProps { onClose: () => void; onInput: (value: string) => void; currentValue: string; }
const RacialCompositionKeyboard: React.FC<RacialKeyboardProps> = ({ onClose, onInput, currentValue }) => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    const numpadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '%', '0', 'DEL'];
    const MAX_COMPONENTS = 4;

    const handleKeyPress = (key: string) => {
        if (key === 'DEL') { handleDelete(); return; }
        if (currentValue.length >= 30) return;

        const components = currentValue.split(' ').filter(c => c !== '');
        let isMidComponent = /[%A-Z]$/.test(currentValue);
        let isStartingNewComponent = currentValue === '' || currentValue.endsWith(' ');

        if (components.length >= MAX_COMPONENTS && isStartingNewComponent && /\d/.test(key)) { return; }

        let newValue = currentValue;
        if (isMidComponent && /\d/.test(key) ) {
             if (components.length < MAX_COMPONENTS) { newValue += ' '; }
             else { return; }
        }

        if (key === '%' && (!/\d$/.test(newValue.slice(-1)) && !/[A-Z]$/.test(newValue.slice(-1)))) return;
        if (key === '%' && /%$/.test(newValue)) return;
        
        if (/[A-Z]/.test(key) && 
            !isStartingNewComponent && 
            !/\d$/.test(newValue.slice(-1)) && 
            !/%$/.test(newValue.slice(-1)) &&
            !/[A-Z]$/.test(newValue.slice(-1))
        ) return;

        if (/\d/.test(key) && /[A-Z]$/.test(newValue)) return;

        const currentNumPart = newValue.split(' ').pop()?.match(/\d+$/)?.[0] || '';
        if (key === '0' && (isStartingNewComponent || /[%A-Z ]$/.test(newValue.slice(-1))) && currentNumPart.length === 0) { /* Allow leading 0 */ }
        else if (key === '0' && currentNumPart === '0') { return; }
        else if (/\d/.test(key) && currentNumPart === '0') { newValue = newValue.slice(0, -1); }

        const potentialNumStr = (currentNumPart + key).match(/\d+/)?.[0];
        if (potentialNumStr && parseInt(potentialNumStr, 10) > 100) return;

        onInput(newValue + key);
    };

    const handleDelete = () => { onInput(currentValue.slice(0, -1)); };

    return (
        <div className="fixed inset-0 z-[100] bg-black/50" onClick={onClose}>
            <div className="fixed bottom-0 left-0 right-0 w-full bg-[#333333] p-2 space-y-2" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' }}>
                <div className="flex flex-nowrap space-x-1.5 overflow-x-auto py-2 alphabet-scroller" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    <style>{`.alphabet-scroller::-webkit-scrollbar { display: none; }`}</style>
                    {alphabet.map(key => <button key={key} onClick={() => handleKeyPress(key)} className="flex-shrink-0 w-10 h-10 bg-[#555555] text-white rounded-md text-lg font-medium active:bg-zinc-500">{key}</button>)}
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                    {numpadKeys.map(key => <button key={key} onClick={() => handleKeyPress(key)} className={`h-12 bg-[#555555] text-white rounded-md text-xl font-medium active:bg-zinc-500 flex items-center justify-center ${key === '%' ? 'text-brand-orange' : ''}`}>{key === 'DEL' ? <Delete size={20} /> : key}</button>)}
                </div>
                <button onClick={onClose} className="h-12 w-full bg-blue-600 text-white rounded-md text-lg font-semibold active:bg-blue-700">Done</button>
            </div>
        </div>
    );
};

// --- Modal Padre Rápido ---
interface AddQuickParentModalProps { type: 'mother' | 'father'; onClose: () => void; onSave: (animal: Animal) => void; }
const AddQuickParentModal: React.FC<AddQuickParentModalProps> = ({ type, onClose, onSave }) => {
    const { addAnimal, animals, fathers } = useData();
    const [status, setStatus] = useState<'Activo' | 'Referencia'>('Referencia');
    const [animalId, setAnimalId] = useState('');
    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [racialComposition, setRacialComposition] = useState('');
    const [breed, setBreed] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isRacialKeyboardOpenModal, setIsRacialKeyboardOpenModal] = useState(false);

    // (CAMBIO) "Cabra Adulta" -> "Cabra"
    const calculateLifecycleStageLocal = (birthDate: string, sex: 'Hembra' | 'Macho'): string => {
        if (!birthDate || !sex) return 'Indefinido';
        const today = new Date();
        const birth = new Date(birthDate + 'T00:00:00');
        if (isNaN(birth.getTime())) return 'Indefinido';
        const ageInDays = (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
        if (sex === 'Hembra') {
            if (ageInDays <= 60) return 'Cabrita';
            if (ageInDays <= 365) return 'Cabritona';
            return 'Cabra'; // CORREGIDO
        } else {
            if (ageInDays <= 60) return 'Cabrito';
            if (ageInDays <= 365) return 'Macho de Levante';
            return 'Reproductor'; // CORREGIDO
        }
    };

    useEffect(() => { setBreed(calculateBreedFromComposition(racialComposition)); }, [racialComposition]);

    const handleSubmit = async () => {
        setMessage(null);
        if (status === 'Activo' && !animalId) {
             setMessage('El ID es obligatorio si el estado es Activo.');
             return;
        }

        const finalId = animalId.toUpperCase() || `REF-${Date.now()}`;
        const allAnimalIds = new Set([...animals.map(a => a.id.toLowerCase()), ...fathers.map(f => f.id.toLowerCase())]);
        if (animalId && allAnimalIds.has(finalId.toLowerCase())) {
            setMessage('Este ID ya existe en la base de datos (rebaño o referencias).');
            return;
        }

        const sex = type === 'mother' ? 'Hembra' : 'Macho';
        // (CAMBIO) "Cabra Adulta" -> "Cabra"
        const newParent: Animal = {
            id: finalId,
            name: name.toUpperCase() || undefined,
            birthDate: birthDate || 'N/A',
            sex: sex,
            isReference: status === 'Referencia',
            status: 'Activo',
            lifecycleStage: birthDate ? calculateLifecycleStageLocal(birthDate, sex) as any : (sex === 'Hembra' ? 'Cabra' : 'Reproductor'), // CORREGIDO
            racialComposition: racialComposition || undefined,
            breed: breed || undefined,
            location: 'Referencia',
            reproductiveStatus: sex === 'Hembra' ? 'Vacía' : 'No Aplica',
            createdAt: new Date().getTime(),
            lastWeighing: null,
        };

        try {
            await addAnimal(newParent);
            onSave(newParent); // Llama al handler del formulario principal
        } catch (error: any) {
            setMessage(error.message || 'Error al guardar el animal.');
            console.error("Error saving quick parent:", error);
        }
    };

    return (
        <>
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4" onClick={onClose}>
                <div className="w-full max-w-md bg-ios-modal-bg rounded-2xl shadow-lg animate-slide-up flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
                    <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-brand-border"><div className="w-10"></div><h2 className="text-lg font-semibold text-white">Agregar {type === 'mother' ? 'Madre' : 'Padre'} Rápido</h2><button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700/50"><X size={20} /></button></header>
                    <div className="p-4 space-y-4 overflow-y-auto">
                        <FormGroup title="Categoría"><Toggle labelOn="Activo" labelOff="Referencia" value={status === 'Activo'} onChange={(isActive) => setStatus(isActive ? 'Activo' : 'Referencia')} /></FormGroup>
                        <FormGroup title="Identificación">
                            <input type="text" value={animalId} onClick={() => setIsKeyboardOpen(true)} readOnly placeholder={status === 'Activo' ? "ID (Obligatorio)" : "ID (Opcional)"} className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-orange cursor-pointer" />
                            <FormInput value={name} onChange={e => setName(e.target.value.toUpperCase())} placeholder="Nombre (Opcional)" />
                            <button type="button" onClick={() => setIsDatePickerOpen(true)} className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-left flex justify-between items-center">
                                <span className={birthDate ? 'text-white' : 'text-zinc-500'}>{birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Fecha de Nacimiento (Opcional)'}</span><Calendar className="text-zinc-400" size={20} />
                            </button>
                        </FormGroup>
                        <FormGroup title="Raza">
                             <input type="text" value={racialComposition} onClick={() => setIsRacialKeyboardOpenModal(true)} readOnly placeholder="Composición Racial (Opcional)" className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-orange cursor-pointer" />
                            <FormInput value={breed} disabled readOnly placeholder="Raza (Auto-calculada)" />
                        </FormGroup>
                        {message && <p className="text-sm text-brand-red text-center">{message}</p>}
                    </div>
                    <footer className="p-4 border-t border-brand-border flex-shrink-0"><button onClick={handleSubmit} className="w-full bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-lg transition-colors">Guardar {type === 'mother' ? 'Madre' : 'Padre'}</button></footer>
                </div>
            </div>
            {isKeyboardOpen && <CustomAlphanumericKeyboard onClose={() => setIsKeyboardOpen(false)} onInput={(val) => setAnimalId(val.toUpperCase())} currentValue={animalId}/>}
            {isDatePickerOpen && <BottomSheetDatePicker onClose={() => setIsDatePickerOpen(false)} onSelectDate={(d) => { if(d) setBirthDate(d.toISOString().split('T')[0]); setIsDatePickerOpen(false); }} currentValue={birthDate ? new Date(birthDate + 'T00:00:00') : new Date()} />}
            {isRacialKeyboardOpenModal && <RacialCompositionKeyboard onClose={() => setIsRacialKeyboardOpenModal(false)} onInput={setRacialComposition} currentValue={racialComposition} />}
        </>
    );
};