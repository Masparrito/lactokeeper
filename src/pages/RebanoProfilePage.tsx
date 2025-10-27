import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
// --- Iconos Utilizados ---
import {
    ArrowLeft, Edit, Save, X, Droplets, Scale, Syringe, Replace, CheckCircle, PlusCircle,
    HeartPulse, Milk, FileText, Feather, AlertTriangle, ChevronRight, Archive,
    DollarSign, HeartCrack, Ban, RefreshCw, Trash2, Award, Baby, Eye,
    Calendar, Search, Plus, ChevronDown, Delete, // Añadidos faltantes
    Move, Tag // Re-añadidos para EVENT_ICONS
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
import type { PageState } from '../types/navigation';
// --- CAMBIO: Tipos no usados eliminados ---
import { Animal, Origin } from '../db/local'; // Father eliminado
import { AddLotModal } from '../components/modals/AddLotModal';
// --- CAMBIO: Corregida ruta de importación ---
import { AddOriginModal } from '../components/ui/AddOriginModal';
import { useEvents } from '../hooks/useEvents';
// --- CAMBIO: calculateLifecycleStage eliminado de la importación ---
// --- CAMBIO: calculateAgeInDays añadido ---
import { formatAge, getAnimalZootecnicCategory, calculateBreedFromComposition, calculateAgeInDays } from '../utils/calculations';
import { WeanAnimalForm } from '../components/forms/WeanAnimalForm';
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { formatAnimalDisplay } from '../utils/formatting';
import { PedigreeModal } from '../components/modals/PedigreeModal';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { DecommissionAnimalModal, DecommissionDetails } from '../components/modals/DecommissionAnimalModal';
// --- CAMBIO: AddFatherModal eliminado ---
// import { AddFatherModal } from '../components/ui/AddFatherModal';
import { AnimalSelectorModal } from '../components/ui/AnimalSelectorModal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';

// =================================================================================
// --- COMPONENTES DE UI Y SUB-COMPONENTES DEFINIDOS AQUÍ ---
// =================================================================================

// ... (El resto de sub-componentes UI no cambian: FormInput, FormSelect, FormGroup, Toggle, BottomSheetDatePicker, CustomAlphanumericKeyboard, RacialCompositionKeyboard, AddQuickParentModal, InfoRow, GeneticsTab, EVENT_ICONS, EventsTab, ProgenyTab, MainInfoTab) ...
// PEGAR AQUÍ TODOS LOS SUB-COMPONENTES DESDE LA LÍNEA 63 HASTA LA 515 DEL ARCHIVO ORIGINAL
// --- Componentes UI Estilo iOS ---
const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        {...props}
        className={`w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-50 disabled:bg-brand-dark/50 ${className}`}
    />
));

// --- CAMBIO: FormSelect Re-añadido ---
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
        if (isMidComponent && /\d/.test(key) ) { if (components.length < MAX_COMPONENTS) { newValue += ' '; } else { return; } }
        if (key === '%' && (!/\d$/.test(newValue.slice(-1)) && !/[A-Z]$/.test(newValue.slice(-1)))) return;
        if (key === '%' && /%$/.test(newValue)) return;
        if (/[A-Z]/.test(key) && !isStartingNewComponent && !/\d$/.test(newValue.slice(-1)) && !/%$/.test(newValue.slice(-1))) return;
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
    const { animals, fathers } = useData();
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

    const calculateLifecycleStageLocal = (birthDate: string, sex: 'Hembra' | 'Macho'): string => {
        if (!birthDate || !sex) return 'Indefinido';
        const today = new Date();
        const birth = new Date(birthDate + 'T00:00:00');
        if (isNaN(birth.getTime())) return 'Indefinido';
        const ageInDays = (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
        if (sex === 'Hembra') {
            if (ageInDays <= 60) return 'Cabrita';
            if (ageInDays <= 365) return 'Cabritona';
            return 'Cabra Adulta';
        } else {
            if (ageInDays <= 60) return 'Cabrito';
            if (ageInDays <= 365) return 'Macho de Levante';
            return 'Macho Cabrío';
        }
    };

    useEffect(() => { setBreed(calculateBreedFromComposition(racialComposition)); }, [racialComposition]);

    const handleSubmit = async () => {
        setMessage(null);
        if (status === 'Activo' && !animalId) { setMessage('El ID es obligatorio si el estado es Activo.'); return; }
        const finalId = animalId.toUpperCase() || `REF-${Date.now()}`;
        const allAnimalIds = new Set([...animals.map(a => a.id.toLowerCase()), ...fathers.map(f => f.id.toLowerCase())]);
        if (animalId && allAnimalIds.has(finalId.toLowerCase())) { setMessage('Este ID ya existe en la base de datos (rebaño o referencias).'); return; }
        const sex = type === 'mother' ? 'Hembra' : 'Macho';
        const newParent: Animal = {
            id: finalId, name: name.toUpperCase() || undefined, birthDate: birthDate || 'N/A', sex: sex,
            isReference: status === 'Referencia', status: 'Activo',
            lifecycleStage: birthDate ? calculateLifecycleStageLocal(birthDate, sex) as any : (sex === 'Hembra' ? 'Cabra Adulta' : 'Macho Cabrío'),
            racialComposition: racialComposition || undefined, breed: breed || undefined, location: 'Referencia',
            reproductiveStatus: sex === 'Hembra' ? 'Vacía' : 'No Aplica', createdAt: new Date().getTime(), lastWeighing: null,
        };
        try { onSave(newParent); }
        catch (error: any) { setMessage(error.message || 'Error al preparar datos del animal.'); console.error("Error creating quick parent object:", error); }
    };
    const calendarCss = ` .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #FF9500; --rdp-background-color: transparent; --rdp-accent-color-dark: #FF9500; --rdp-background-color-dark: transparent; --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-border-radius: 12px; color: #FFF; margin: 1em auto; } .rdp-caption_label { color: #FFF; font-weight: bold;} .rdp-nav_button { color: #FF9500; } .rdp-head_cell { color: #8e8e93; font-size: 0.8em; } .rdp-day { color: #FFF;} .rdp-day_selected { background-color: var(--rdp-accent-color); color: #000; font-weight: bold; } .rdp-day_today { font-weight: bold; color: #FF9500; } .rdp-day_disabled { color: #505054; } .rdp-day_outside { color: #505054; } .rdp-caption_dropdowns { display: flex; gap: 10px; } .rdp-dropdown { background-color: #333; border: 1px solid #555; color: #FFF; padding: 4px 8px; border-radius: 6px; } `;
     return (
        <>
            <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4" onClick={onClose}>
                <div className="w-full max-w-md bg-ios-modal-bg rounded-2xl shadow-lg animate-slide-up flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                    <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-brand-border"><div className="w-10"></div><h2 className="text-lg font-semibold text-white">Agregar {type === 'mother' ? 'Madre' : 'Padre'} Rápido</h2><button onClick={onClose} className="p-2 -mr-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700/50"><X size={20} /></button></header>
                    <div className="p-4 space-y-4 overflow-y-auto">
                         <FormGroup title="Categoría"><Toggle labelOn="Activo" labelOff="Referencia" value={status === 'Activo'} onChange={(isActive: boolean) => setStatus(isActive ? 'Activo' : 'Referencia')} /></FormGroup>
                         <FormGroup title="Identificación">
                             <input type="text" value={animalId} onClick={() => setIsKeyboardOpen(true)} readOnly placeholder={status === 'Activo' ? "ID (Obligatorio)" : "ID (Opcional)"} className={`w-full bg-brand-glass border rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 cursor-pointer font-mono ${message && message.includes('ID ya existe') ? 'border-brand-red ring-brand-red' : 'border-brand-border focus:ring-brand-orange'}`} />
                             <FormInput value={name} onChange={e => setName(e.target.value.toUpperCase())} placeholder="Nombre (Opcional)" />
                             <button type="button" onClick={() => setIsDatePickerOpen(true)} className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-left flex justify-between items-center">
                                <span className={birthDate ? 'text-white' : 'text-zinc-500'}>{birthDate ? new Date(birthDate + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'Fecha Nacimiento (Opcional)'}</span>
                                <Calendar className="text-zinc-400" size={20} />
                            </button>
                         </FormGroup>
                         <FormGroup title="Raza">
                             <input type="text" value={racialComposition} onClick={() => setIsRacialKeyboardOpenModal(true)} readOnly placeholder="Composición Racial (Opcional)" className="w-full bg-brand-glass border border-brand-border rounded-xl p-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-orange cursor-pointer" />
                            <FormInput value={breed} disabled readOnly placeholder="Raza (Auto-calculada)" />
                        </FormGroup>
                        {message && <p className="text-sm text-brand-red text-center">{message}</p>}
                    </div>
                    <footer className="p-4 border-t border-brand-border flex-shrink-0"><button onClick={handleSubmit} className="w-full bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-lg transition-colors">Guardar</button></footer>
                </div>
            </div>
            {isKeyboardOpen && <CustomAlphanumericKeyboard onClose={() => setIsKeyboardOpen(false)} onInput={(val) => setAnimalId(val.toUpperCase())} currentValue={animalId}/>}
            {isDatePickerOpen && <BottomSheetDatePicker onClose={() => setIsDatePickerOpen(false)} onSelectDate={(d) => { if(d) setBirthDate(d.toISOString().split('T')[0]); setIsDatePickerOpen(false); }} currentValue={birthDate ? new Date(birthDate + 'T00:00:00Z') : new Date()} />}
            {isRacialKeyboardOpenModal && <RacialCompositionKeyboard onClose={() => setIsRacialKeyboardOpenModal(false)} onInput={setRacialComposition} currentValue={racialComposition} />}
            <style>{calendarCss}</style>
        </>
    );
};

// --- SUB-COMPONENTES DE LA PÁGINA PRINCIPAL ---

const InfoRow = ({ label, value, isEditing, children }: { label: string, value?: React.ReactNode, isEditing?: boolean, children?: React.ReactNode }) => (
    <div>
        <dt className="text-sm font-medium text-zinc-400">{label}</dt>
        {isEditing && children ? children : <dd className={`mt-1 text-lg font-semibold text-white truncate ${label === 'ID' ? 'font-mono' : ''}`}>{value || 'N/A'}</dd>}
    </div>
);

const GeneticsTab = ({ onOpenModal }: { onOpenModal: () => void }) => {
    return (
        <div className="text-center p-4 min-h-[150px] flex flex-col justify-center items-center">
            <button
                onClick={onOpenModal}
                className="inline-flex items-center gap-2 bg-brand-blue hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-lg transition-colors"
            >
                <Eye size={20} /> Ver Genealogía Completa
            </button>
        </div>
    );
};

const EVENT_ICONS: Record<string, { icon: React.ElementType, color: string }> = {
    'Nacimiento': { icon: Feather, color: 'bg-green-500/20 text-brand-green' },
    'Registro': { icon: FileText, color: 'bg-blue-500/20 text-brand-blue' },
    'Parto': { icon: Baby, color: 'bg-pink-500/20 text-pink-400' },
    'Aborto': { icon: HeartCrack, color: 'bg-yellow-500/20 text-yellow-400' },
    'Movimiento': { icon: Move, color: 'bg-blue-500/20 text-brand-blue' },
    'Cambio de Estado': { icon: Tag, color: 'bg-purple-500/20 text-purple-400' },
    'Pesaje Lechero': { icon: Milk, color: 'bg-gray-500/20 text-gray-300' },
    'Pesaje Corporal': { icon: Scale, color: 'bg-green-500/20 text-brand-green' },
    'Servicio': { icon: HeartPulse, color: 'bg-pink-500/20 text-pink-400' },
    'Tratamiento': { icon: Syringe, color: 'bg-red-500/20 text-brand-red' },
    'Diagnóstico': { icon: CheckCircle, color: 'bg-teal-500/20 text-teal-300' },
};

const EventsTab = ({ animal }: { animal: Animal | null | undefined }) => {
    const events = useEvents(animal?.id);

    if (!animal) return <div className="text-center p-8 text-zinc-500">Cargando datos del animal...</div>;

    if (!events || events.length === 0) {
        return <div className="text-center p-8 text-zinc-500">Este animal no tiene eventos registrados.</div>;
    }
    return (
        <div className="space-y-3">
            {events.map((event: any) => {
                const eventMeta = EVENT_ICONS[event.type] || { icon: FileText, color: 'bg-gray-500/20 text-gray-300' };
                const IconComponent = eventMeta.icon;
                let displayDate = 'Fecha desconocida';
                let dateLabelPrefix = '';

                if (event.type === 'Registro' && animal.createdAt) {
                    displayDate = new Date(animal.createdAt).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
                    dateLabelPrefix = 'Registrado el: ';
                } else if (event.date && event.date !== 'N/A') {
                     try {
                         displayDate = new Date(event.date + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
                     } catch (e) {
                         console.error("Error formatting event date:", event.date, e);
                         displayDate = event.date;
                     }
                }

                return (
                    <div key={event.id} className="flex items-start gap-4 p-3 bg-black/20 rounded-lg">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${eventMeta.color}`}>
                            <IconComponent size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{event.type}</p>
                            <p className="text-sm text-zinc-300">{event.details}</p>
                            <p className="text-xs text-zinc-500 mt-1">
                                {dateLabelPrefix}{displayDate}
                                {event.lotName && ` | Lote: ${event.lotName}`}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const ProgenyTab = ({ offspring, navigateTo }: { offspring: Animal[], navigateTo: (page: PageState) => void }) => {
    if (offspring.length === 0) {
        return <div className="text-center p-8 text-zinc-500">Este animal no tiene descendencia registrada.</div>;
    }
    return (
        <div className="space-y-2">
            {offspring.map(child => {
                 const formattedName = child.name ? String(child.name).toUpperCase().trim() : '';
                 return (
                    <button
                        key={child.id}
                        onClick={() => navigateTo({ name: 'rebano-profile', animalId: child.id })}
                        className="w-full text-left p-3 bg-black/20 hover:bg-zinc-800/60 rounded-lg transition-colors flex justify-between items-center group"
                    >
                       <div className="min-w-0 pr-3">
                           <p className="font-mono font-semibold text-base text-white truncate">{child.id.toUpperCase()}</p>
                           {formattedName && ( <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p> )}
                           <div className="text-xs text-zinc-500 mt-1 min-h-[1rem] truncate">
                               <span>{child.sex} | {formatAge(child.birthDate)} | Lote: {child.location || 'N/A'}</span>
                           </div>
                       </div>
                       <ChevronRight className="text-zinc-600 group-hover:text-white transition-colors flex-shrink-0" />
                    </button>
                 )
            })}
        </div>
    );
};

const MainInfoTab = ({ animal, isEditing, editedData, setEditedData, origins, onAddOriginClick, onLocationClick }: {
    animal: Animal,
    isEditing: boolean,
    editedData: Partial<Animal>,
    setEditedData: React.Dispatch<React.SetStateAction<Partial<Animal>>>,
    origins: Origin[],
    onAddOriginClick: () => void,
    onLocationClick: () => void,
}) => {
    const handleChange = (field: keyof Animal, value: any) => { setEditedData(prev => ({ ...prev, [field]: value })); };
    const formattedAge = formatAge(animal.birthDate);
    return (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-6">
            <InfoRow label="ID" value={animal.id} />
            <InfoRow label="Sexo" value={animal.sex} />
            <InfoRow label="Fecha Nacimiento" value={animal.birthDate !== 'N/A' ? new Date(animal.birthDate + 'T00:00:00Z').toLocaleDateString('es-VE', {timeZone: 'UTC'}) : 'N/A'} isEditing={isEditing}>
                <input type="date" value={editedData.birthDate === 'N/A' ? '' : editedData.birthDate || ''} onChange={e => handleChange('birthDate', e.target.value || 'N/A')} className="w-full bg-zinc-700 p-2 rounded-md mt-1 text-white" />
            </InfoRow>
            <InfoRow label="Edad" value={formattedAge} />
            <InfoRow label="Ubicación / Lote">{!isEditing && ( <dd className="mt-1 text-lg"><button onClick={onLocationClick} className="font-semibold text-brand-orange hover:underline text-left">{animal.location || 'Sin Asignar'}</button></dd> )}</InfoRow>
            <InfoRow label="Categoría" value={animal.lifecycleStage} />
            <InfoRow label="Origen" value={animal.origin} isEditing={isEditing}>
                <div className="flex items-center gap-2 mt-1">
                    <FormSelect value={editedData.origin || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('origin', e.target.value)}>
                        <option value="">Seleccionar Origen...</option>
                        <option value="Finca Masparrito">Finca Masparrito</option>
                        {origins.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                    </FormSelect>
                    <button type="button" onClick={onAddOriginClick} className="p-2 bg-brand-orange hover:bg-orange-600 text-white rounded-md"><PlusCircle size={20} /></button>
                </div>
            </InfoRow>
            {animal.weaningDate && <InfoRow label="Fecha de Destete" value={new Date(animal.weaningDate + 'T00:00:00Z').toLocaleDateString('es-VE', {timeZone: 'UTC'})} />}
            {animal.weaningWeight && <InfoRow label="Peso al Destete" value={`${animal.weaningWeight} Kg`} />}
        </dl>
    );
};

// --- COMPONENTE PRINCIPAL RebanoProfilePage ---
interface RebanoProfilePageProps { animalId: string; onBack: () => void; navigateTo: (page: PageState) => void; }

export default function RebanoProfilePage({ animalId, onBack, navigateTo }: RebanoProfilePageProps) {
    // --- CAMBIO: appConfig añadido ---
    const { animals, lots, origins, parturitions, updateAnimal, deleteAnimalPermanently, fathers, addAnimal, appConfig } = useData();
    const [activeTab, setActiveTab] = useState<'main' | 'genetics' | 'events' | 'progeny'>('main');
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<Partial<Animal>>({});
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);
    const [isAddOriginModalOpen, setAddOriginModalOpen] = useState(false);
    const [isParturitionModalOpen, setParturitionModalOpen] = useState(false);
    const [isLotChangeModalOpen, setLotChangeModalOpen] = useState(false);
    const [selectedNewLot, setSelectedNewLot] = useState('');
    const [isDecommissionSheetOpen, setDecommissionSheetOpen] = useState(false);
    const [decommissionReason, setDecommissionReason] = useState<'Venta' | 'Muerte' | 'Descarte' | null>(null);
    const [isReferenceActionsOpen, setIsReferenceActionsOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [isWeanModalOpen, setWeanModalOpen] = useState(false);
    const [isPedigreeModalOpen, setIsPedigreeModalOpen] = useState(false);
    const [isMotherSelectorOpen, setMotherSelectorOpen] = useState(false);
    const [isFatherSelectorOpen, setFatherSelectorOpen] = useState(false);
    const [isParentModalOpen, setIsParentModalOpen] = useState<'mother' | 'father' | null>(null);

    const animal = useMemo(() => animals.find(a => a.id === animalId), [animals, animalId]);

    const progeny = useMemo(() => {
        if (!animal) return [];
        if (animal.sex === 'Hembra') { return animals.filter(a => a.motherId === animal.id).sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()); }
        if (animal.sex === 'Macho') { return animals.filter(a => a.fatherId === animal.id).sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime()); }
        return [];
    }, [animals, animal]);

    const mothers = useMemo(() => animals.filter(a => a.sex === 'Hembra'), [animals]);
    const allFathers = useMemo(() => {
        const internalSires: Animal[] = animals.filter(a => a.sex === 'Macho');
        const externalSires: any[] = fathers.map(f => ({
            id: f.id, name: f.name, sex: 'Macho', status: 'Activo', isReference: true,
            birthDate: 'N/A', lifecycleStage: 'Macho Cabrío', location: 'Referencia', reproductiveStatus: 'No Aplica',
            createdAt: 0, lastWeighing: null,
        }));
        return [...internalSires, ...externalSires];
    }, [animals, fathers]);

    const zootecnicCategoryForLogic = useMemo(() => {
        if (!animal) return '';
        return getAnimalZootecnicCategory(animal, parturitions);
    }, [animal, parturitions]);

    // --- CAMBIO: Lógica de Alerta de Destete ---
    const isWeaningOverdue = useMemo(() => {
        if (!animal || animal.weaningDate || animal.isReference || animal.status !== 'Activo') {
            return false;
        }
        const category = zootecnicCategoryForLogic;
        if (category !== 'Cabrita' && category !== 'Cabrito') {
            return false;
        }
        const ageInDays = calculateAgeInDays(animal.birthDate);
        return ageInDays > appConfig.edadDesteteDias;

    }, [animal, zootecnicCategoryForLogic, appConfig.edadDesteteDias]);

    const breedingFailures = animal?.breedingFailures || 0;
    // --- CAMBIO: Lógica de Alerta de Destete añadida al header ---
    const headerAlertClass = (breedingFailures >= 2 || isWeaningOverdue) ? 'border-brand-red ring-2 ring-brand-red/80' : 'border-brand-border';


    useEffect(() => {
        if (animal) {
            if (isEditing) {
                setEditedData({
                    birthDate: animal.birthDate,
                    origin: animal.origin,
                    fatherId: animal.fatherId,
                    motherId: animal.motherId
                });
            }
            setSelectedNewLot(animal.location || '');
        }
    }, [animal, isEditing]);

    const handleSave = async () => { if (!animal) return; setSaveStatus('saving'); try { await updateAnimal(animal.id, editedData); setSaveStatus('success'); setTimeout(() => { setIsEditing(false); setSaveStatus('idle'); }, 1500); } catch (error) { console.error("Error al actualizar:", error); setSaveStatus('idle'); } };
    const handleCancel = () => { setIsEditing(false); setEditedData({}); };
    const handleUpdateLocation = async () => { if (!animal) return; try { await updateAnimal(animal.id, { location: selectedNewLot }); setLotChangeModalOpen(false); } catch (error) { console.error("Error al actualizar ubicación:", error); } };
    const handleDecommission = async (details: DecommissionDetails) => {
        if (!animal || !decommissionReason) return;
        const dataToUpdate: Partial<Animal> = { status: decommissionReason, isReference: true, endDate: details.date };
        if (decommissionReason === 'Venta') { Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); }
        if (decommissionReason === 'Muerte') { dataToUpdate.deathReason = details.deathReason; }
        if (decommissionReason === 'Descarte') { Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); }
        await updateAnimal(animal.id, dataToUpdate);
        setDecommissionReason(null);
    };
    const handleReintegrate = async () => { if (!animal) return; await updateAnimal(animal.id, { isReference: false, status: 'Activo', endDate: undefined }); };
    const handlePermanentDelete = async () => { if (!animal) return; await deleteAnimalPermanently(animal.id); onBack(); };
    const handleSaveWean = async (data: { weaningDate: string, weaningWeight: number }) => { if (!animal) return; await updateAnimal(animal.id, { weaningDate: data.weaningDate, weaningWeight: data.weaningWeight }); setWeanModalOpen(false); };
    const handleSaveQuickParent = async (newParent: Animal) => {
        try {
            await addAnimal(newParent);
             if (isParentModalOpen === 'father') { setEditedData(prev => ({ ...prev, fatherId: newParent.id })); }
             else if (isParentModalOpen === 'mother') { setEditedData(prev => ({ ...prev, motherId: newParent.id })); }
        } catch (error) { console.error("Error saving quick parent:", error); }
        finally { setIsParentModalOpen(null); }
    };

    const decommissionActions: ActionSheetAction[] = [ { label: "Por Venta", icon: DollarSign, onClick: () => setDecommissionReason('Venta') }, { label: "Por Muerte", icon: HeartCrack, onClick: () => setDecommissionReason('Muerte'), color: 'text-brand-red' }, { label: "Por Descarte", icon: Ban, onClick: () => setDecommissionReason('Descarte'), color: 'text-brand-red' }, ];
    const referenceActions: ActionSheetAction[] = [ { label: "Reintegrar a Activos", icon: RefreshCw, onClick: handleReintegrate }, { label: "Eliminar Permanentemente", icon: Trash2, onClick: () => setIsDeleteConfirmationOpen(true), color: 'text-brand-red' }, ];

    if (!animal) { return ( <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Animal no encontrado.</h1><button onClick={onBack} className="mt-4 text-brand-orange">Volver</button></div> ); }

    const formattedName = animal.name ? animal.name.toUpperCase().trim() : '';

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in pb-12">
                <header className={`bg-brand-glass backdrop-blur-xl rounded-b-2xl p-4 border-b border-x sticky top-0 z-10 transition-all ${headerAlertClass}`}>
                   <div className="flex justify-between items-center mb-1">
                       <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                       <div className="text-center min-w-0">
                           <h1 className="text-2xl font-mono font-bold tracking-tight text-white truncate">{animal.id.toUpperCase()}</h1>
                           {formattedName && <p className="text-sm text-zinc-300 truncate">{formattedName}</p>}
                       </div>
                       <div className="w-8 flex items-center justify-end gap-1">
                           {/* --- CAMBIO: Lógica de Alerta de Destete añadida --- */}
                           {isWeaningOverdue && ( <span title={`Destete atrasado (Meta: ${appConfig.edadDesteteDias} días)`}><AlertTriangle className="text-brand-red" size={20} /></span> )}
                           {breedingFailures === 1 && !isWeaningOverdue && ( <span title="1 fallo reproductivo reportado"><AlertTriangle className="text-yellow-400" size={20} /></span> )}
                           {breedingFailures >= 2 && !isWeaningOverdue && ( <span title={`${breedingFailures} fallos reproductivos reportados`}><AlertTriangle className="text-brand-red" size={20} /></span> )}
                       </div>
                   </div>
                   <p className="text-center text-brand-orange font-semibold text-sm -mt-1 mb-3 uppercase tracking-wider">
                       {animal.isReference ? 'REFERENCIA' : (animal.status !== 'Activo' ? animal.status : (animal.location || 'Sin Asignar'))}
                   </p>
                   {/* --- CAMBIO: Alerta de Destete --- */}
                   {isWeaningOverdue && (
                       <div className="mb-3 p-3 bg-brand-red/20 border border-brand-red rounded-lg text-center">
                           <p className="text-red-300 text-sm font-semibold">Destete Atrasado</p>
                           <p className="text-red-400 text-xs">Este animal tiene {calculateAgeInDays(animal.birthDate)} días (Meta: {appConfig.edadDesteteDias} días) y no ha sido destetado.</p>
                       </div>
                   )}
                   <div className="flex justify-around bg-black/20 rounded-xl p-1">
                        {animal.sex === 'Hembra' && ( <> <button onClick={() => navigateTo({ name: 'lactation-profile', animalId: animal.id })} className="flex flex-col items-center p-2 text-blue-300 hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Droplets size={22}/><span className="text-xs mt-1">Leche</span></button> <button onClick={() => setParturitionModalOpen(true)} disabled={animal.isReference || animal.status !== 'Activo'} className="flex flex-col items-center p-2 text-pink-400 hover:bg-zinc-700/50 w-full rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Baby size={22}/><span className="text-xs mt-1">Parto</span></button> </> )}
                        {(zootecnicCategoryForLogic === 'Cabrita' || zootecnicCategoryForLogic === 'Cabrito') && !animal.weaningDate && !animal.isReference && animal.status === 'Activo' && ( <button onClick={() => setWeanModalOpen(true)} className="flex flex-col items-center p-2 text-yellow-300 hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Award size={22}/><span className="text-xs mt-1">Destetar</span></button> )}
                        <button onClick={() => navigateTo({ name: 'growth-profile', animalId: animal.id })} className="flex flex-col items-center p-2 text-brand-green hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Scale size={22}/><span className="text-xs mt-1">Peso</span></button>
                        <button onClick={() => alert('Función en desarrollo')} disabled={animal.isReference || animal.status !== 'Activo'} className="flex flex-col items-center p-2 text-teal-300 hover:bg-zinc-700/50 w-full rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"><Syringe size={22}/><span className="text-xs mt-1">Sanidad</span></button>
                        <button onClick={() => animal.isReference ? setIsReferenceActionsOpen(true) : setLotChangeModalOpen(true)} className="flex flex-col items-center p-2 text-brand-blue hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Replace size={22}/><span className="text-xs mt-1">Mover</span></button>
                        {animal.status === 'Activo' && !animal.isReference && ( <button onClick={() => setDecommissionSheetOpen(true)} className="flex flex-col items-center p-2 text-amber-400 hover:bg-zinc-700/50 w-full rounded-lg transition-colors"><Archive size={22}/><span className="text-xs mt-1">Dar de baja</span></button> )}
                        <button onClick={() => setIsEditing(!isEditing)} className={`flex flex-col items-center p-2 w-full rounded-lg transition-colors ${isEditing ? 'text-green-400' : 'text-brand-orange'} hover:bg-zinc-700/50`}>
                            <Edit size={22}/>
                            <span className="text-xs mt-1">Editar</span>
                        </button>
                   </div>
                </header>

                <main className="p-4 space-y-4">
                    <div className="flex bg-brand-glass rounded-xl p-1 border border-brand-border">
                         <button onClick={() => setActiveTab('main')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'main' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Ficha</button>
                        <button onClick={() => setActiveTab('genetics')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'genetics' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Genealogía</button>
                        <button onClick={() => setActiveTab('progeny')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'progeny' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Progenie</button>
                        <button onClick={() => setActiveTab('events')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'events' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Eventos</button>
                    </div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border min-h-[200px]">
                        {activeTab === 'main' && (
                            <div className="space-y-6">
                                {/* --- CAMBIO: Prop parturitions eliminada --- */}
                                <MainInfoTab
                                    animal={animal}
                                    isEditing={isEditing}
                                    editedData={editedData}
                                    setEditedData={setEditedData}
                                    origins={origins}
                                    onAddOriginClick={() => setAddOriginModalOpen(true)}
                                    onLocationClick={() => setLotChangeModalOpen(true)}
                                />
                                {isEditing && (
                                     <div className="space-y-4 pt-4 border-t border-zinc-700">
                                        <h3 className="text-sm font-medium text-zinc-400">Padres (Opcional)</h3>
                                        <div className="flex items-center gap-2">
                                            <button type="button" onClick={() => setFatherSelectorOpen(true)} className="w-full text-left bg-zinc-700 border border-zinc-600 rounded-xl p-3 text-white placeholder-zinc-500 flex justify-between items-center">
                                                <span className={editedData.fatherId ? 'text-white' : 'text-zinc-500'}>
                                                    Padre: {editedData.fatherId ? (formatAnimalDisplay(allFathers.find(f => f.id === editedData.fatherId)) || editedData.fatherId) : 'Seleccionar...'}
                                                </span>
                                                <Search size={18} className="text-zinc-400" />
                                            </button>
                                            <button type="button" onClick={() => setIsParentModalOpen('father')} className="p-3 bg-zinc-700 border border-zinc-600 rounded-xl text-brand-orange hover:bg-brand-orange/20 flex-shrink-0"><Plus size={20} /></button>
                                        </div>
                                        <div className="flex items-center gap-2">
                                             <button type="button" onClick={() => setMotherSelectorOpen(true)} className="w-full text-left bg-zinc-700 border border-zinc-600 rounded-xl p-3 text-white placeholder-zinc-500 flex justify-between items-center">
                                                <span className={editedData.motherId ? 'text-white' : 'text-zinc-500'}>
                                                    Madre: {editedData.motherId ? (formatAnimalDisplay(mothers.find(m => m.id === editedData.motherId)) || editedData.motherId) : 'Seleccionar...'}
                                                </span>
                                                <Search size={18} className="text-zinc-400" />
                                            </button>
                                            <button type="button" onClick={() => setIsParentModalOpen('mother')} className="p-3 bg-zinc-700 border border-zinc-600 rounded-xl text-brand-orange hover:bg-brand-orange/20 flex-shrink-0"><Plus size={20} /></button>
                                        </div>
                                     </div>
                                )}
                                {isEditing && (
                                    <div className="flex justify-end gap-4 pt-4 border-t border-zinc-700">
                                        <button onClick={handleCancel} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2"><X size={18}/> Cancelar</button>
                                        <button onClick={handleSave} disabled={saveStatus !== 'idle'} className="bg-brand-green hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg flex items-center gap-2 disabled:opacity-50 min-w-[130px] justify-center">
                                            {saveStatus === 'saving' && <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"/>}
                                            {saveStatus === 'success' && <CheckCircle size={18}/>}
                                            {saveStatus === 'idle' && <Save size={18}/>}
                                            <span className="ml-2">{saveStatus === 'success' ? 'Guardado' : 'Guardar'}</span>
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                        {activeTab === 'genetics' && <GeneticsTab onOpenModal={() => setIsPedigreeModalOpen(true)} />}
                        {activeTab === 'progeny' && <ProgenyTab offspring={progeny} navigateTo={navigateTo} />}
                        {activeTab === 'events' && <EventsTab animal={animal} />}
                    </div>
                </main>
            </div>
            {/* --- Modales --- */}
            <Modal isOpen={isLotChangeModalOpen} onClose={() => setLotChangeModalOpen(false)} title={`Cambiar Lote para ${formatAnimalDisplay(animal)}`}>
                 <div className="space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-zinc-400 mb-1">Seleccionar nuevo lote</label>
                         <div className="flex items-center gap-2">
                             {/* --- CAMBIO: Se usa FormSelect --- */}
                             <FormSelect value={selectedNewLot} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedNewLot(e.target.value)}>
                                 <option value="">Sin Asignar</option>
                                 {lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                             </FormSelect>
                             <button type="button" onClick={() => {setLotChangeModalOpen(false); setAddLotModalOpen(true);}} className="p-3 bg-brand-orange hover:bg-orange-600 text-white rounded-xl"><PlusCircle size={24} /></button>
                         </div>
                     </div>
                     <div className="flex justify-end gap-3 pt-2">
                         <button onClick={() => setLotChangeModalOpen(false)} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
                         <button onClick={handleUpdateLocation} className="px-5 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg">Guardar Cambio</button>
                     </div>
                 </div>
            </Modal>
            <ActionSheetModal isOpen={isDecommissionSheetOpen} onClose={() => setDecommissionSheetOpen(false)} title="Causa de la Baja" actions={decommissionActions} />
            {decommissionReason && animal && (
                <DecommissionAnimalModal
                    isOpen={!!decommissionReason}
                    animal={animal}
                    onCancel={() => setDecommissionReason(null)}
                    onConfirm={handleDecommission}
                    reason={decommissionReason} // <-- Prop 'reason' añadida
                />
            )}
            <ActionSheetModal isOpen={isReferenceActionsOpen} onClose={() => setIsReferenceActionsOpen(false)} title="Acciones de Referencia" actions={referenceActions} />
            <ConfirmationModal isOpen={isDeleteConfirmationOpen} onClose={() => setIsDeleteConfirmationOpen(false)} onConfirm={handlePermanentDelete} title={`¿Eliminar ${formatAnimalDisplay(animal)} Permanentemente?`} message="Esta acción borrará el registro del animal de la base de datos para siempre y no se puede deshacer." />
            <AddLotModal isOpen={isAddLotModalOpen} onClose={() => setAddLotModalOpen(false)} />
            <AddOriginModal isOpen={isAddOriginModalOpen} onClose={() => setAddOriginModalOpen(false)} />
            <ParturitionModal isOpen={isParturitionModalOpen} onClose={() => setParturitionModalOpen(false)} motherId={animal.id} />
            <Modal isOpen={isWeanModalOpen} onClose={() => setWeanModalOpen(false)} title={`Registrar Destete de ${formatAnimalDisplay(animal)}`}> <WeanAnimalForm animalId={animal.id} birthDate={animal.birthDate} onSave={handleSaveWean} onCancel={() => setWeanModalOpen(false)} /> </Modal>
            <PedigreeModal isOpen={isPedigreeModalOpen} onClose={() => setIsPedigreeModalOpen(false)} animalId={animal.id} navigateTo={navigateTo} />
            <AnimalSelectorModal isOpen={isMotherSelectorOpen} onClose={() => setMotherSelectorOpen(false)} onSelect={(id) => { setEditedData(prev => ({ ...prev, motherId: id })); setMotherSelectorOpen(false); }} animals={mothers} title="Seleccionar Madre" filterSex="Hembra" />
            <AnimalSelectorModal isOpen={isFatherSelectorOpen} onClose={() => setFatherSelectorOpen(false)} onSelect={(id) => { setEditedData(prev => ({ ...prev, fatherId: id })); setFatherSelectorOpen(false); }} animals={allFathers} title="Seleccionar Padre" filterSex="Macho" />
            {isParentModalOpen && <AddQuickParentModal type={isParentModalOpen} onClose={() => setIsParentModalOpen(null)} onSave={handleSaveQuickParent} />}
            {/* --- FIN Modales --- */}
        </>
    );
}