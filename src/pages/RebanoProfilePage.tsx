// src/pages/RebanoProfilePage.tsx (Corregido)

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
// --- Iconos Utilizados ---
import {
    ArrowLeft, Edit, Save, X, Droplets, Scale, Syringe, Replace, CheckCircle, PlusCircle,
    HeartPulse, Milk, FileText, Feather, AlertTriangle, ChevronRight, Archive,
    DollarSign, HeartCrack, Ban, RefreshCw, Trash2, Award, Baby, 
    Calendar, Search, Plus, ChevronDown, Delete,
    Move, Tag,
    Printer
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
import type { PageState } from '../types/navigation';
import { Animal, Origin, Lot } from '../db/local';
import { AddLotModal } from '../components/modals/AddLotModal';
import { AddOriginModal } from '../components/ui/AddOriginModal';
import { useEvents } from '../hooks/useEvents';
import { usePedigree, PedigreeNode } from '../hooks/usePedigree';
import { PedigreeChart } from '../components/pedigree/PedigreeChart';
import { exportPedigreeToPDF } from '../utils/pdfExporter'; 
import { formatAge, getAnimalZootecnicCategory, calculateBreedFromComposition, calculateAgeInDays, calculateChildComposition } from '../utils/calculations';
import { WeanAnimalForm } from '../components/forms/WeanAnimalForm';
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { formatAnimalDisplay } from '../utils/formatting';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { DecommissionAnimalModal, DecommissionDetails } from '../components/modals/DecommissionAnimalModal';
import { AnimalSelectorModal } from '../components/ui/AnimalSelectorModal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';

// =================================================================================
// --- COMPONENTES DE UI Y SUB-COMPONENTES (Sin cambios) ---
// =================================================================================

const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        {...props}
        className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-orange disabled:opacity-50 disabled:bg-brand-dark/50 ${className}`}
    />
));

const FormSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ children, ...props }, ref) => (
    <div className="relative w-full">
        <select
            ref={ref}
            {...props}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-brand-orange"
        >
            {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
    </div>
));

const FormGroup: React.FC<{ title: string, children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-brand-glass rounded-2xl border border-brand-border overflow-hidden">
        <h2 className="text-zinc-400 font-semibold text-sm uppercase tracking-wide px-4 pt-4 pb-2">{title}</h2>
        <div className="space-y-4 p-4">
            {children}
        </div>
    </div>
);

const InfoRow: React.FC<{ label: string, value?: React.ReactNode, children?: React.ReactNode, className?: string, isEditing?: boolean }> = ({ label, value, children, className = '', isEditing }) => (
    <div className={className}>
        <dt className="text-sm font-medium text-zinc-400">{label}</dt>
        {isEditing ? (
            <div className="mt-1">{children}</div>
        ) : (
            <dd className="mt-1 text-base font-semibold text-white truncate">{value || 'N/A'}</dd>
        )}
    </div>
);


const Toggle = ({ labelOn, labelOff, value, onChange }: { labelOn: string, labelOff: string, value: boolean, onChange: (newValue: boolean) => void }) => (
    <div onClick={() => onChange(!value)} className="w-full bg-brand-dark rounded-xl p-1 flex cursor-pointer">
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${value ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>{labelOn}</span>
        <span className={`w-1/2 text-center font-semibold p-2 rounded-lg transition-all ${!value ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>{labelOff}</span>
    </div>
);

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
        if (/[A-Z]/.test(key) && !isStartingNewComponent && !/\d$/.test(newValue.slice(-1)) && !/%$/.test(newValue.slice(-1)) && !/[A-Z]$/.test(newValue.slice(-1))) return;
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

    const calculateLifecycleStageLocal = (birthDate: string, sex: 'Hembra' | 'Macho'): string => {
        if (!birthDate || !sex) return 'Indefinido';
        const today = new Date();
        const birth = new Date(birthDate + 'T00:00:00');
        if (isNaN(birth.getTime())) return 'Indefinido';
        const ageInDays = (today.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24);
        if (sex === 'Hembra') {
            if (ageInDays <= 60) return 'Cabrita';
            if (ageInDays <= 365) return 'Cabritona';
            return 'Cabra';
        } else {
            if (ageInDays <= 60) return 'Cabrito';
            if (ageInDays <= 365) return 'Macho de Levante';
            return 'Reproductor'; 
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
            lifecycleStage: birthDate ? calculateLifecycleStageLocal(birthDate, sex) as any : (sex === 'Hembra' ? 'Cabra' : 'Reproductor'),
            racialComposition: racialComposition || undefined, breed: breed || undefined, location: 'Referencia',
            reproductiveStatus: sex === 'Hembra' ? 'Vacía' : 'No Aplica', createdAt: new Date().getTime(), lastWeighing: null,
        };
        try { 
            await addAnimal(newParent); 
            onSave(newParent); 
        }
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
const GeneticsTab: React.FC<{ 
    animal: Animal;
    rootNode: PedigreeNode | null;
    navigateTo: (page: PageState) => void;
    onExportPDF: () => void;
    isExporting: boolean;
}> = ({ rootNode, navigateTo, onExportPDF, isExporting }) => {
    
    const handleAncestorClick = (ancestorId: string) => {
        setTimeout(() => navigateTo({ name: 'rebano-profile', animalId: ancestorId }), 100);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-zinc-400">Desliza el gráfico para ver más →</p>
                <button
                    onClick={onExportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                    <Printer size={16} />
                    {isExporting ? 'Generando...' : 'PDF'}
                </button>
            </div>

            <div className="overflow-x-auto bg-black/20 rounded-lg p-2">
                <PedigreeChart
                    rootNode={rootNode}
                    onAncestorClick={handleAncestorClick}
                />
            </div>
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

const EventsTab = ({ events, animal }: { events: any[], animal: Animal | null | undefined }) => {
    
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

                if (event.type === 'Registro' && animal && animal.createdAt) {
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

const MainInfoTab = ({ animal, isEditing, editedData, setEditedData, origins, lots, onAddOriginClick, onAddLotClick, allFathers, mothers, navigateTo }: {
    animal: Animal,
    isEditing: boolean,
    editedData: Partial<Animal>,
    setEditedData: React.Dispatch<React.SetStateAction<Partial<Animal>>>,
    origins: Origin[],
    lots: Lot[], 
    onAddOriginClick: () => void,
    onAddLotClick: () => void, 
    allFathers: any[], 
    mothers: Animal[], 
    navigateTo: (page: PageState) => void 
}) => {
    const handleChange = (field: keyof Animal, value: any) => { setEditedData(prev => ({ ...prev, [field]: value })); };
    const formattedAge = formatAge(animal.birthDate);
    
    const father = useMemo(() => allFathers.find(f => f.id === animal.fatherId), [allFathers, animal.fatherId]);
    const mother = useMemo(() => mothers.find(m => m.id === animal.motherId), [mothers, animal.motherId]);

    const handleCategoryChange = (isActivo: boolean) => {
        setEditedData(prev => ({ ...prev, isReference: !isActivo }));
    };
    
    const conceptionMethodMap: { [key: string]: string } = {
        'MN': 'Monta Natural (MN)',
        'IA': 'Inseminación Artificial (IA)',
        'TE': 'Transferencia de Embriones (TE)',
        '': 'Otro/Desconocido',
    };
    
    const parturitionTypeMap: { [key: string]: string } = {
        'Simple': 'Parto Simple',
        'TW': 'Doble (TW)',
        'TR': 'Triple (TR)',
        'QD': 'Cuádruple (QD)',
        '': 'N/A',
    };

    const compositionData = useMemo(() => {
        const compString = isEditing ? editedData.racialComposition : animal.racialComposition;
        if (!compString) return [];
        
        const breedColors = {
            'A': 'bg-blue-500',
            'S': 'bg-green-500',
            'AN': 'bg-red-500',
            'AGC': 'bg-yellow-500',
            'T': 'bg-purple-500',
            'C': 'bg-orange-500',
        };

        const regex = /(\d+(\.\d+)?)%?([A-Z]+)/g;
        let match;
        const data = [];
        while ((match = regex.exec(compString.toUpperCase())) !== null) {
            const percentage = parseFloat(match[1]);
            const code = match[3] as keyof typeof breedColors;
            data.push({
                label: `${code} (${percentage}%)`,
                percentage: percentage,
                color: breedColors[code] || 'bg-gray-500'
            });
        }
        return data;
    }, [animal.racialComposition, editedData.racialComposition, isEditing]);


    return (
        <div className="space-y-4">
            <FormGroup title="Estado">
                <div className="grid grid-cols-2 gap-4">
                    <InfoRow label="Categoría" value={animal.lifecycleStage} />
                    <InfoRow 
                        label="Ubicación / Lote" 
                        value={animal.location || 'Sin Asignar'} 
                        isEditing={isEditing}
                    >
                        <div className="flex items-center gap-2">
                            <FormSelect value={editedData.location || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('location', e.target.value)}>
                                <option value="">Sin Asignar</option>
                                {lots.map(lot => <option key={lot.id} value={lot.name}>{lot.name}</option>)}
                            </FormSelect>
                            <button type="button" onClick={onAddLotClick} className="p-2.5 bg-zinc-700 hover:bg-zinc-600 text-brand-orange rounded-lg"><Plus size={18} /></button>
                        </div>
                    </InfoRow>
                    <InfoRow label="Edad" value={formattedAge} />
                    <InfoRow 
                        label="Estado (Activo/Ref)" 
                        value={animal.isReference ? 'Referencia' : 'Activo'}
                        isEditing={isEditing}
                    >
                        <Toggle
                            labelOn="Activo"
                            labelOff="Referencia"
                            value={!editedData.isReference}
                            onChange={handleCategoryChange}
                        />
                    </InfoRow>
                </div>
            </FormGroup>

            <FormGroup title="Genética">
                <div className="grid grid-cols-2 gap-4">
                    <InfoRow 
                        label="Padre (Reproductor)" 
                        value={father ? (
                            <button onClick={() => father.id && navigateTo({ name: 'rebano-profile', animalId: father.id })} className="text-brand-orange hover:underline text-left">
                                {formatAnimalDisplay(father)}
                            </button>
                        ) : 'Desconocido'}
                        isEditing={isEditing}
                    >
                        <button type="button" id="edit-father-btn" onClick={() => (isEditing ? (document.getElementById('edit-father-btn')?.click()) : null)} className="w-full text-left bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white placeholder-zinc-500 flex justify-between items-center">
                            <span className={editedData.fatherId ? 'text-white' : 'text-zinc-400'}>
                                {editedData.fatherId ? (formatAnimalDisplay(allFathers.find(f => f.id === editedData.fatherId)) || editedData.fatherId) : 'Seleccionar...'}
                            </span>
                            <Search size={16} className="text-zinc-400" />
                        </button>
                    </InfoRow>
                    
                    <InfoRow 
                        label="Madre" 
                        value={mother ? (
                            <button onClick={() => mother.id && navigateTo({ name: 'rebano-profile', animalId: mother.id })} className="text-brand-orange hover:underline text-left">
                                {formatAnimalDisplay(mother)}
                            </button>
                        ) : 'Desconocida'}
                        isEditing={isEditing}
                    >
                         <button type="button" id="edit-mother-btn" onClick={() => (isEditing ? (document.getElementById('edit-mother-btn')?.click()) : null)} className="w-full text-left bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white placeholder-zinc-500 flex justify-between items-center">
                            <span className={editedData.motherId ? 'text-white' : 'text-zinc-400'}>
                                {editedData.motherId ? (formatAnimalDisplay(mothers.find(m => m.id === editedData.motherId)) || editedData.motherId) : 'Seleccionar...'}
                            </span>
                            <Search size={16} className="text-zinc-400" />
                        </button>
                    </InfoRow>
                </div>
                
                <InfoRow 
                    label="Composición Racial" 
                    value={animal.racialComposition || 'N/A'} 
                    isEditing={isEditing}
                >
                    {!isEditing && compositionData.length > 0 && (
                        <div className="w-full flex h-2 rounded-full overflow-hidden mt-2 bg-zinc-700">
                            {compositionData.map((breed) => (
                                <div
                                    key={breed.label}
                                    className={`${breed.color}`}
                                    style={{ width: `${breed.percentage}%` }}
                                    title={breed.label}
                                />
                            ))}
                        </div>
                    )}
                    {isEditing && (
                        <FormInput
                            type="text"
                            value={editedData.racialComposition || ''}
                            onChange={e => handleChange('racialComposition', e.target.value.toUpperCase())}
                            className="w-full font-mono"
                            placeholder="Ej: 100%A ó 50%A 50%AGC"
                        />
                    )}
                </InfoRow>
            </FormGroup>

            <FormGroup title="Nacimiento y Origen">
                <div className="grid grid-cols-2 gap-4">
                    <InfoRow 
                        label="Fecha Nacimiento" 
                        value={animal.birthDate !== 'N/A' ? new Date(animal.birthDate + 'T00:00:00Z').toLocaleDateString('es-VE', {timeZone: 'UTC'}) : 'N/A'} 
                        isEditing={isEditing}
                    >
                        <input type="date" value={editedData.birthDate === 'N/A' ? '' : editedData.birthDate || ''} onChange={e => handleChange('birthDate', e.target.value || 'N/A')} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white" />
                    </InfoRow>

                    <InfoRow 
                        label="Peso al Nacer" 
                        value={animal.birthWeight ? `${animal.birthWeight} Kg` : 'N/A'} 
                        isEditing={isEditing}
                    >
                        <FormInput
                            type="number"
                            step="0.1"
                            value={editedData.birthWeight || ''}
                            onChange={e => handleChange('birthWeight', e.target.value ? parseFloat(e.target.value) : undefined)}
                            className="w-full"
                            placeholder="Kg (ej: 3.5)"
                        />
                    </InfoRow>

                    <InfoRow 
                        label="Método de Concepción" 
                        value={conceptionMethodMap[animal.conceptionMethod || ''] || 'N/A'} 
                        isEditing={isEditing}
                    >
                        <FormSelect value={editedData.conceptionMethod || 'MN'} onChange={e => handleChange('conceptionMethod', e.target.value)}>
                            <option value="MN">Monta Natural (MN)</option>
                            <option value="IA">Inseminación Artificial (IA)</option>
                            <option value="TE">Transferencia de Embriones (TE)</option>
                            <option value="">Otro/Desconocido</option>
                        </FormSelect>
                    </InfoRow>

                    <InfoRow 
                        label="Tipo de Parto (Origen)" 
                        value={parturitionTypeMap[animal.parturitionType || ''] || 'N/A'} 
                        isEditing={isEditing}
                    >
                        <FormSelect value={editedData.parturitionType || 'Simple'} onChange={e => handleChange('parturitionType', e.target.value)}>
                            <option value="Simple">Parto Simple</option>
                            <option value="TW">Doble (TW)</option>
                            <option value="TR">Triple (TR)</option>
                            <option value="QD">Cuádruple (QD)</option>
                            <option value="">N/A</option>
                        </FormSelect>
                    </InfoRow>

                    <InfoRow 
                        label="Origen" 
                        value={animal.origin} 
                        isEditing={isEditing}
                        className="col-span-2"
                    >
                        <div className="flex items-center gap-2">
                            <FormSelect value={editedData.origin || ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('origin', e.target.value)}>
                                <option value="">Seleccionar Origen...</option>
                                <option value="Finca Masparrito">Finca Masparrito</option>
                                {origins.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                            </FormSelect>
                            <button type="button" onClick={onAddOriginClick} className="p-2.5 bg-zinc-700 hover:bg-zinc-600 text-brand-orange rounded-lg"><Plus size={18} /></button>
                        </div>
                    </InfoRow>
                </div>
            </FormGroup>
        </div>
    );
};
// --- (FIN CAMBIO) MainInfoTab ---


// --- (INICIO) CORRECCIÓN: Componente 'RecentEvents' restaurado ---
const RecentEvents = ({ events }: { events: any[] }) => {
    const recentEvents = events.slice(0, 3); // Obtener solo los primeros 3
    
    if (recentEvents.length === 0) {
        return (
            <div className="text-center p-4 text-zinc-500">
                No hay eventos recientes.
            </div>
        );
    }
    
    return (
        <FormGroup title="Últimos 3 Eventos">
            {recentEvents.map((event: any) => {
                const eventMeta = EVENT_ICONS[event.type] || { icon: FileText, color: 'bg-gray-500/20 text-gray-300' };
                const IconComponent = eventMeta.icon;
                let displayDate = 'Fecha desconocida';
                if (event.date && event.date !== 'N/A') {
                     try {
                         displayDate = new Date(event.date + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
                     } catch (e) { displayDate = event.date; }
                }
                
                return (
                    <div key={event.id} className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${eventMeta.color}`}>
                            <IconComponent size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{event.type}</p>
                            <p className="text-sm text-zinc-300">{event.details}</p>
                            <p className="text-xs text-zinc-500 mt-1">{displayDate}</p>
                        </div>
                    </div>
                );
            })}
        </FormGroup>
    );
};
// --- (FIN) CORRECCIÓN ---


const HiddenPdfChart = React.forwardRef<HTMLDivElement, { rootNode: PedigreeNode | null }>(({ rootNode }, ref) => (
    <div 
        ref={ref} 
        style={{ 
            position: 'absolute', 
            left: '-9999px', 
            width: '1200px', 
            padding: '20px', 
            backgroundColor: '#FFFFFF', 
            color: '#000000', 
        }}
    >
        <PedigreeChart 
            rootNode={rootNode} 
            onAncestorClick={() => {}} 
            theme="light" 
        />
    </div>
));
HiddenPdfChart.displayName = 'HiddenPdfChart';


// --- COMPONENTE PRINCIPAL RebanoProfilePage ---
interface RebanoProfilePageProps { animalId: string; onBack: () => void; navigateTo: (page: PageState) => void; }

export default function RebanoProfilePage({ animalId, onBack, navigateTo }: RebanoProfilePageProps) {
    // --- CORRECCIÓN SCROLL: 'parentRef' ahora se usa para el div raíz ---
    const parentRef = useRef<HTMLDivElement>(null);
    const pdfChartRef = useRef<HTMLDivElement>(null);

    const { animals, lots, origins, parturitions, updateAnimal, deleteAnimalPermanently, fathers, addAnimal, appConfig } = useData();
    
    const animal = useMemo(() => animals.find(a => a.id === animalId), [animals, animalId]);
    const events = useEvents(animal ? animal.id : undefined); 
    
    const pedigreeRoot = usePedigree(animalId);
    
    const [activeTab, setActiveTab] = useState<'main' | 'genetics' | 'progeny' | 'events'>('main');
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
    const [isMotherSelectorOpen, setMotherSelectorOpen] = useState(false);
    const [isFatherSelectorOpen, setFatherSelectorOpen] = useState(false);
    const [isParentModalOpen, setIsParentModalOpen] = useState<'mother' | 'father' | null>(null);
    const [isExporting, setIsExporting] = useState(false);

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
            birthDate: 'N/A', lifecycleStage: 'Reproductor', location: 'Referencia', reproductiveStatus: 'No Aplica',
            createdAt: 0, lastWeighing: null,
        }));
        return [...internalSires, ...externalSires];
    }, [animals, fathers]);

    const zootecnicCategoryForLogic = useMemo(() => {
        if (!animal) return '';
        return getAnimalZootecnicCategory(animal, parturitions);
    }, [animal, parturitions]);


    // --- LÓGICA DE DESTETE (Corregida) ---
    const isWeaningOverdue = useMemo(() => {
        if (!animal || animal.weaningDate || animal.isReference || animal.status !== 'Activo') {
            return false;
        }
        const category = zootecnicCategoryForLogic;
        if (category !== 'Cabrita' && category !== 'Cabrito') {
            return false;
        }
        const ageInDays = calculateAgeInDays(animal.birthDate);
        return ageInDays > appConfig.diasMetaDesteteFinal; // <-- USA LA VARIABLE NUEVA

    }, [animal, zootecnicCategoryForLogic, appConfig.diasMetaDesteteFinal]); // <-- CORREGIDO

    const breedingFailures = animal?.breedingFailures || 0;
    
    const alertInfo = useMemo(() => {
        if (!animal) return null; 
        if (isWeaningOverdue) {
            return {
                text: `Destete Atrasado (${calculateAgeInDays(animal.birthDate)} días)`,
                icon: <AlertTriangle className="text-brand-red" size={20} />,
                title: `Destete atrasado (Meta: ${appConfig.diasMetaDesteteFinal} días)` // <-- CORREGIDO
            };
        }
        if (breedingFailures >= 2) {
            return {
                text: `${breedingFailures} Fallos Reprod.`,
                icon: <AlertTriangle className="text-brand-red" size={20} />,
                title: `${breedingFailures} fallos reproductivos reportados`
            };
        }
        if (breedingFailures === 1) {
            return {
                text: `1 Fallo Reprod.`,
                icon: <AlertTriangle className="text-yellow-400" size={20} />,
                title: `1 fallo reproductivo reportado`
            };
        }
        return null;
    }, [animal, isWeaningOverdue, breedingFailures, appConfig.diasMetaDesteteFinal]); // <-- CORREGIDO
    // --- FIN LÓGICA DE DESTETE ---


    useEffect(() => {
        if (animal) {
            if (isEditing) {
                setEditedData({
                    name: animal.name,
                    birthDate: animal.birthDate,
                    birthWeight: animal.birthWeight,
                    origin: animal.origin,
                    fatherId: animal.fatherId,
                    motherId: animal.motherId,
                    racialComposition: animal.racialComposition,
                    location: animal.location, 
                    isReference: animal.isReference,
                    conceptionMethod: animal.conceptionMethod, 
                    parturitionType: animal.parturitionType,
                });
            } else {
                setEditedData({});
            }
            setSelectedNewLot(animal.location || '');
        }
    }, [animal, isEditing]);

    useEffect(() => {
        if (!isEditing) return; 

        const mother = mothers.find(a => a.id === editedData.motherId);
        const father = allFathers.find(a => a.id === editedData.fatherId);

        if (mother?.racialComposition && father?.racialComposition) {
            const childComp = calculateChildComposition(mother.racialComposition, father.racialComposition);
            setEditedData(prev => ({ ...prev, racialComposition: childComp }));
        }

    }, [editedData.motherId, editedData.fatherId, isEditing, mothers, allFathers]);

    const handleSave = async () => { 
        if (!animal) return; 
        setSaveStatus('saving'); 
        try { 
            const finalData = { ...editedData };
            if (editedData.racialComposition !== animal.racialComposition) {
                finalData.breed = calculateBreedFromComposition(editedData.racialComposition);
            }
            if (editedData.birthDate && editedData.birthDate !== animal.birthDate) {
                 finalData.lifecycleStage = getAnimalZootecnicCategory({ ...animal, ...finalData } as Animal, parturitions);
            }

            await updateAnimal(animal.id, finalData); 
            setSaveStatus('success'); 
            setTimeout(() => { setIsEditing(false); setSaveStatus('idle'); }, 1500); 
        } catch (error) { 
            console.error("Error al actualizar:", error); 
            setSaveStatus('idle'); 
        } 
    };

    const handleCancel = () => { setIsEditing(false); setEditedData({}); };
    
    const handleUpdateLocation = async () => { 
        if (!animal) return; 
        try { 
            await updateAnimal(animal.id, { location: selectedNewLot }); 
            setLotChangeModalOpen(false); 
        } catch (error) { 
            console.error("Error al actualizar ubicación:", error); 
        } 
    };

    // --- CORRECCIÓN: 'handleDecommission' renombrado a 'handleDecommissionConfirm' ---
    const handleDecommissionConfirm = async (details: DecommissionDetails) => {
        if (!animal || !decommissionReason) return;
        const dataToUpdate: Partial<Animal> = { status: decommissionReason, isReference: true, endDate: details.date };
        if (decommissionReason === 'Venta') { Object.assign(dataToUpdate, { salePrice: details.salePrice, saleBuyer: details.saleBuyer, salePurpose: details.salePurpose }); }
        if (decommissionReason === 'Muerte') { dataToUpdate.deathReason = details.deathReason; }
        if (decommissionReason === 'Descarte') { Object.assign(dataToUpdate, { cullReason: details.cullReason, cullReasonDetails: details.cullReasonDetails }); }
        
        // ¡BUG CRÍTICO!
        // Si la acción de 'updateAnimal' falla, el animal no se mueve.
        // Pero si tiene éxito, DEBEMOS navegar hacia atrás,
        // porque este animal ya no pertenece a la lista de "Activos".
        try {
            await updateAnimal(animal.id, dataToUpdate);
            setDecommissionReason(null);
            onBack(); // <-- NAVEGAR HACIA ATRÁS AL CONFIRMAR
        } catch (error) {
            console.error("Error al dar de baja:", error);
            // Opcional: mostrar un error al usuario
            setDecommissionReason(null);
        }
    };
    const handleReintegrate = async () => { 
        if (!animal) return; 
        await updateAnimal(animal.id, { isReference: false, status: 'Activo', endDate: undefined }); 
        setIsReferenceActionsOpen(false); // Cerrar el action sheet
    };
    const handlePermanentDelete = async () => { if (!animal) return; await deleteAnimalPermanently(animal.id); onBack(); };
    const handleSaveWean = async (data: { weaningDate: string, weaningWeight: number }) => { if (!animal) return; await updateAnimal(animal.id, { weaningDate: data.weaningDate, weaningWeight: data.weaningWeight }); setWeanModalOpen(false); };
    
    const handleSaveQuickParent = async (newParent: Animal) => {
        try {
            await addAnimal(newParent);
             if (isParentModalOpen === 'father') { 
                setEditedData(prev => ({ ...prev, fatherId: newParent.id })); 
                allFathers.push(newParent); 
            }
             else if (isParentModalOpen === 'mother') { 
                setEditedData(prev => ({ ...prev, motherId: newParent.id })); 
                mothers.push(newParent); 
            }
        } catch (error) { 
            console.error("Error saving quick parent:", error); 
        }
        finally { setIsParentModalOpen(null); }
    };

    const handleExportPedigree = async () => {
        if (!pdfChartRef.current || !animal) {
            alert("Error: No se pudo encontrar el gráfico para exportar.");
            return;
        }
        setIsExporting(true);
        try {
            await exportPedigreeToPDF(pdfChartRef.current, animal);
        } catch (error) {
            console.error("Error al exportar PDF:", error);
            alert("Ocurrió un error al generar el PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    const decommissionActions: ActionSheetAction[] = [ { label: "Por Venta", icon: DollarSign, onClick: () => setDecommissionReason('Venta') }, { label: "Por Muerte", icon: HeartCrack, onClick: () => setDecommissionReason('Muerte'), color: 'text-brand-red' }, { label: "Por Descarte", icon: Ban, onClick: () => setDecommissionReason('Descarte'), color: 'text-brand-red' }, ];
    const referenceActions: ActionSheetAction[] = [ { label: "Reintegrar a Activos", icon: RefreshCw, onClick: handleReintegrate }, { label: "Eliminar Permanentemente", icon: Trash2, onClick: () => setIsDeleteConfirmationOpen(true), color: 'text-brand-red' }, ];

    if (!animal) { return ( <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Animal no encontrado.</h1><button onClick={onBack} className="mt-4 text-brand-orange">Volver</button></div> ); }

    const formattedName = animal.name ? animal.name.toUpperCase().trim() : '';
    const displayFormattedName = isEditing ? (editedData.name || '') : formattedName;

    // --- (INICIO) CORRECCIÓN LÓGICA 'quickActions' ---
    // La lógica ahora se basa en 'animal.isReference'
    const quickActions = [
        // Acciones Específicas de Hembra
        ...(animal.sex === 'Hembra' ? [
            { label: "Leche", icon: Droplets, onClick: () => navigateTo({ name: 'lactation-profile', animalId: animal.id }), color: "text-blue-300", disabled: false },
            { label: "Parto", icon: Baby, onClick: () => setParturitionModalOpen(true), color: "text-pink-400", disabled: animal.isReference }
        ] : []),
        
        // Acción de Destete (solo para crías activas)
        ...((zootecnicCategoryForLogic === 'Cabrita' || zootecnicCategoryForLogic === 'Cabrito') && !animal.weaningDate && !animal.isReference ? [
            { label: "Destetar", icon: Award, onClick: () => setWeanModalOpen(true), color: "text-yellow-300", disabled: false }
        ] : []),

        // Acciones Universales
        { label: "Peso", icon: Scale, onClick: () => navigateTo({ name: 'growth-profile', animalId: animal.id }), color: "text-brand-green", disabled: false },
        { label: "Sanidad", icon: Syringe, onClick: () => alert('Función en desarrollo'), color: "text-teal-300", disabled: animal.isReference },
        
        // LÓGICA DE ACCIONES DE ESTADO (CORREGIDA)
        ...(!animal.isReference ? [
            // Si el animal NO es de referencia (está ACTIVO):
            { label: "Mover", icon: Replace, onClick: () => setLotChangeModalOpen(true), color: "text-brand-blue", disabled: isEditing },
            { label: "Dar de Baja", icon: Archive, onClick: () => setDecommissionSheetOpen(true), color: "text-amber-400", disabled: isEditing }
        ] : [
            // Si el animal SÍ es de referencia (está INACTIVO):
            { label: "Acciones", icon: Replace, onClick: () => setIsReferenceActionsOpen(true), color: "text-brand-blue", disabled: isEditing }
        ])
    ];
    // --- (FIN) CORRECCIÓN LÓGICA 'quickActions' ---

    // --- RENDERIZADO DEL COMPONENTE ---
    return (
        <>
            {/* CORRECCIÓN SCROLL: Eliminados 100vh y overflow-y-auto */}
            <div 
                ref={parentRef}
                className="w-full max-w-2xl mx-auto" 
            >
                {/* Header de la Página (Scrollable) */}
                <header className="p-4 space-y-4">
                    <div className="flex justify-between items-start">
                        <button onClick={onBack} className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft size={20} />
                            <span>Volver</span>
                        </button>
                        
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button onClick={handleCancel} className="bg-zinc-700 hover:bg-zinc-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                        <X size={18}/>
                                    </button>
                                    <button onClick={handleSave} disabled={saveStatus !== 'idle'} className="bg-brand-green hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 disabled:opacity-50 min-w-[100px] justify-center">
                                        {saveStatus === 'saving' && <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"/>}
                                        {saveStatus === 'success' && <CheckCircle size={18}/>}
                                        {saveStatus === 'idle' && <Save size={18}/>}
                                        {saveStatus === 'idle' && <span>Guardar</span>}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditing(true)} className={`bg-brand-orange/20 hover:bg-brand-orange/30 text-brand-orange font-bold py-2 px-4 rounded-lg flex items-center gap-2`}>
                                    <Edit size={16}/>
                                    <span>Editar</span>
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <div className="min-w-0">
                            <h1 className="text-3xl font-mono font-bold tracking-tight text-white truncate">{animal.id.toUpperCase()}</h1>
                            {displayFormattedName && <p className="text-lg text-zinc-400 truncate -mt-1">{displayFormattedName}</p>}
                        </div>
                        {alertInfo && !isEditing && (
                            <div title={alertInfo.title} className="flex-shrink-0 ml-4">
                                {alertInfo.icon}
                            </div>
                        )}
                    </div>
                    
                    {!isEditing && (
                        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            {quickActions.map((action) => (
                                <button 
                                    key={action.label} 
                                    onClick={action.onClick}
                                    disabled={action.disabled}
                                    className={`flex-shrink-0 flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 ${action.color} font-semibold px-3 py-1.5 rounded-full text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed`}
                                >
                                    <action.icon size={14} />
                                    <span>{action.label}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </header>


                <main className="px-4 space-y-4">
                    <div className="flex bg-brand-glass rounded-xl p-1 border border-brand-border">
                         <button onClick={() => setActiveTab('main')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'main' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Ficha</button>
                         <button onClick={() => setActiveTab('genetics')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'genetics' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Genealogía</button>
                         <button onClick={() => setActiveTab('progeny')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'progeny' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Progenie</button>
                         <button onClick={() => setActiveTab('events')} className={`w-1/4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === 'events' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}>Eventos</button>
                    </div>
                    
                    {activeTab === 'main' && (
                        <div className="space-y-4">
                            <MainInfoTab
                                animal={animal}
                                isEditing={isEditing}
                                editedData={editedData}
                                setEditedData={setEditedData}
                                origins={origins}
                                lots={lots} 
                                onAddOriginClick={() => setAddOriginModalOpen(true)}
                                onAddLotClick={() => setAddLotModalOpen(true)} 
                                allFathers={allFathers} 
                                mothers={mothers} 
                                navigateTo={navigateTo} 
                            />
                            
                            {isEditing && (
                                <div className="hidden">
                                    <button id="edit-father-btn" type="button" onClick={() => setFatherSelectorOpen(true)}></button>
                                    <button id="edit-mother-btn" type="button" onClick={() => setMotherSelectorOpen(true)}></button>
                                </div>
                            )}

                            {!isEditing && (
                                <div className="pt-4">
                                    <RecentEvents events={events} /> 
                                </div>
                            )}
                        </div>
                    )}
                    {activeTab === 'genetics' && (
                        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border min-h-[200px]">
                            <GeneticsTab 
                                animal={animal}
                                rootNode={pedigreeRoot}
                                navigateTo={navigateTo}
                                onExportPDF={handleExportPedigree}
                                isExporting={isExporting}
                            />
                        </div>
                    )}
                    {activeTab === 'progeny' && (
                         <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border min-h-[200px]">
                            <ProgenyTab offspring={progeny} navigateTo={navigateTo} />
                        </div>
                    )}
                    {activeTab === 'events' && (
                        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border min-h-[200px]">
                            <EventsTab animal={animal} events={events} />
                        </div>
                    )}
                </main>
            </div>
            
            <HiddenPdfChart ref={pdfChartRef} rootNode={pedigreeRoot} />
            
            {/* --- Modales --- */}
            <Modal isOpen={isLotChangeModalOpen} onClose={() => setLotChangeModalOpen(false)} title={`Mover a ${formatAnimalDisplay(animal)}`}>
                 <div className="space-y-4">
                     <div>
                         <label className="block text-sm font-medium text-zinc-400 mb-1">Seleccionar nuevo lote</label>
                         <div className="flex items-center gap-2">
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
            
            {/* --- (INICIO) CORRECCIÓN DEL BUG: 'handleDecommission' -> 'handleDecommissionConfirm' --- */}
            {decommissionReason && animal && (
                <DecommissionAnimalModal
                    isOpen={!!decommissionReason}
                    animal={animal}
                    onCancel={() => setDecommissionReason(null)}
                    onConfirm={handleDecommissionConfirm} 
                    reason={decommissionReason}
                />
            )}
            {/* --- (FIN) CORRECCIÓN DEL BUG --- */}

            <ActionSheetModal isOpen={isReferenceActionsOpen} onClose={() => setIsReferenceActionsOpen(false)} title="Acciones de Referencia" actions={referenceActions} />
            <ConfirmationModal isOpen={isDeleteConfirmationOpen} onClose={() => setIsDeleteConfirmationOpen(false)} onConfirm={handlePermanentDelete} title={`¿Eliminar ${formatAnimalDisplay(animal)} Permanentemente?`} message="Esta acción borrará el registro del animal de la base de datos para siempre y no se puede deshacer." />
            <AddLotModal isOpen={isAddLotModalOpen} onClose={() => setAddLotModalOpen(false)} />
            <AddOriginModal isOpen={isAddOriginModalOpen} onClose={() => setAddOriginModalOpen(false)} />
            <ParturitionModal isOpen={isParturitionModalOpen} onClose={() => setParturitionModalOpen(false)} motherId={animal.id} />
            <Modal isOpen={isWeanModalOpen} onClose={() => setWeanModalOpen(false)} title={`Registrar Destete de ${formatAnimalDisplay(animal)}`}> <WeanAnimalForm animalId={animal.id} birthDate={animal.birthDate} onSave={handleSaveWean} onCancel={() => setWeanModalOpen(false)} /> </Modal>
            
            <AnimalSelectorModal isOpen={isMotherSelectorOpen} onClose={() => setMotherSelectorOpen(false)} onSelect={(id) => { setEditedData(prev => ({ ...prev, motherId: id })); setMotherSelectorOpen(false); }} animals={mothers} title="Seleccionar Madre" filterSex="Hembra" />
            <AnimalSelectorModal isOpen={isFatherSelectorOpen} onClose={() => setFatherSelectorOpen(false)} onSelect={(id) => { setEditedData(prev => ({ ...prev, fatherId: id })); setFatherSelectorOpen(false); }} animals={allFathers} title="Seleccionar Padre" filterSex="Macho" />
            {isParentModalOpen && <AddQuickParentModal type={isParentModalOpen} onClose={() => setIsParentModalOpen(null)} onSave={handleSaveQuickParent} />}
        </>
    );
}