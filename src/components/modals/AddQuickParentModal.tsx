// src/components/modals/AddQuickParentModal.tsx
// Modal con formulario para agregar un padre (Madre/Padre) rápidamente
// CORREGIDO

import React, { useState, useEffect } from 'react';
import { X, Calendar } from 'lucide-react'; // 'Delete' eliminado (no se usaba)
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';
import { calculateBreedFromComposition } from '../../utils/calculations';
import { FormInput, Toggle } from '../ui/FormControls'; // 'Toggle' movido aquí
import { FormGroup } from '../ui/FormGroup';
import { CustomAlphanumericKeyboard } from '../input/CustomAlphanumericKeyboard';
import { BottomSheetDatePicker } from '../input/BottomSheetDatePicker';
import { RacialCompositionKeyboard } from '../input/RacialCompositionKeyboard';

interface AddQuickParentModalProps {
    type: 'mother' | 'father';
    onClose: () => void;
    onSave: (animal: Animal) => void;
}

export const AddQuickParentModal: React.FC<AddQuickParentModalProps> = ({ type, onClose, onSave }) => {
    // 'appConfig' eliminado (no se usaba)
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

    // Esta función es local y no depende de appConfig, por lo que está bien.
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
        const lifecycleStage = birthDate ? calculateLifecycleStageLocal(birthDate, sex) : (sex === 'Hembra' ? 'Cabra' : 'Reproductor');

        const newParent: Animal = {
            id: finalId,
            name: name.toUpperCase() || undefined,
            birthDate: birthDate || 'N/A',
            sex: sex,
            isReference: status === 'Referencia',
            status: 'Activo',
            lifecycleStage: lifecycleStage as any, // Se usa 'as any' para cumplir con el tipo estricto
            racialComposition: racialComposition || undefined,
            breed: breed || undefined,
            location: 'Referencia',
            reproductiveStatus: sex === 'Hembra' ? 'Vacía' : 'No Aplica',
            createdAt: new Date().getTime(),
            lastWeighing: null,
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
                            {/* 'e' tipado para corregir TS7006 */}
                            <FormInput value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value.toUpperCase())} placeholder="Nombre (Opcional)" />
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
            {isKeyboardOpen && <CustomAlphanumericKeyboard onClose={() => setIsKeyboardOpen(false)} onInput={(val: string) => setAnimalId(val.toUpperCase())} currentValue={animalId} />}
            {isDatePickerOpen && <BottomSheetDatePicker onClose={() => setIsDatePickerOpen(false)} onSelectDate={(d: Date | undefined) => { if (d) setBirthDate(d.toISOString().split('T')[0]); setIsDatePickerOpen(false); }} currentValue={birthDate ? new Date(birthDate + 'T00:00:00Z') : new Date()} />}
            {isRacialKeyboardOpenModal && <RacialCompositionKeyboard onClose={() => setIsRacialKeyboardOpenModal(false)} onInput={setRacialComposition} currentValue={racialComposition} />}
            <style>{calendarCss}</style>
        </>
    );
};