// src/pages/modules/kilos/AddWeightPage.tsx
// (CORREGIDO: 'calculateDaysBetween' importación eliminada, helper local se mantiene)

import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { PlusCircle, Save, CheckCircle, AlertTriangle, X, Calendar, ArrowLeft, Zap, ScanLine, Loader2 } from 'lucide-react';
import { auth } from '../../../firebaseConfig';
import { Modal } from '../../../components/ui/Modal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import BatchImportPage, { OcrResult } from '../../BatchImportPage';
import { BatchWeighingForm } from '../../../components/forms/BatchWeighingForm';
// --- (CORREGIDO) 'calculateDaysBetween' ELIMINADO de la importación ---

// --- SUB-COMPONENTES DE LA PÁGINA ---

const QuickDatePicker = ({ selectedDate, onDateChange, onOpenCalendar }: { selectedDate: Date, onDateChange: (date: Date) => void, onOpenCalendar: () => void }) => {
    const dates = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            return date;
        });
    }, []);

    const formatDateLabel = (date: Date, today: Date) => {
        if (date.getTime() === today.getTime()) return "Hoy";
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        if (date.getTime() === yesterday.getTime()) return "Ayer";
        return date.toLocaleDateString('es-VE', { weekday: 'short' }).replace('.', '');
    };

    return (
        <div className="px-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-400 mb-2"><Calendar size={16}/>Fecha del Pesaje</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                <button type="button" onClick={onOpenCalendar} className="flex flex-col items-center justify-center bg-zinc-800/80 rounded-lg p-2 w-16 h-16 flex-shrink-0 text-zinc-300 hover:bg-zinc-700 transition-colors">
                    <Calendar size={20}/>
                    <span className="text-xs mt-1">Calendario</span>
                </button>
                {dates.map(date => {
                    const isSelected = date.getTime() === selectedDate.getTime();
                    return (
                        <button key={date.toISOString()} type="button" onClick={() => onDateChange(date)}
                            className={`flex flex-col items-center justify-center rounded-lg p-2 w-16 h-16 flex-shrink-0 transition-colors ${isSelected ? 'bg-brand-green text-white' : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'}`}>
                            <span className="text-xs capitalize">{formatDateLabel(date, dates[0])}</span>
                            <span className="font-bold text-2xl">{date.getDate()}</span>
                            <span className="text-xs">{date.toLocaleDateString('es-VE', { month: 'short' }).replace('.', '')}</span>
                        </button>
                    )
                })}
            </div>
        </div>
    );
};

const EntryRow = ({ entry, onDelete }: { entry: any, onDelete: (tempId: number) => void }) => {
    const isUnrecognized = !entry.isRecognized;
    const formattedName = entry.name ? String(entry.name).toUpperCase().trim() : '';

    return (
        <div className={`p-3 rounded-lg flex justify-between items-center animate-fade-in group ${isUnrecognized ? 'bg-amber-900/40 border border-amber-500/50' : 'bg-zinc-800/50'}`}>
            <div className="flex items-center space-x-2 min-w-0 pr-2">
                {isUnrecognized && <AlertTriangle className="text-amber-400 flex-shrink-0" size={18} />}
                <div className="min-w-0">
                    <p className="font-mono font-semibold text-base text-white truncate">{entry.animalId.toUpperCase()}</p>
                    {formattedName && (
                        <p className="text-sm font-normal text-zinc-400 truncate">{formattedName}</p>
                    )}
                </div>
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
                <span className="text-zinc-300 font-semibold">{entry.kg.toFixed(2)} Kg</span>
                <button onClick={() => onDelete(entry.tempId)} className="p-1 text-zinc-400 hover:text-brand-red opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
            </div>
        </div>
    );
};

// Componente para Carga Rápida (Manual)
const RapidWeightForm = ({ onBack, onSaveSuccess }: { onBack: () => void, onSaveSuccess: (date: string) => void }) => {
    const { animals, addBodyWeighing } = useData();
    const [currentId, setCurrentId] = useState('');
    const [currentKg, setCurrentKg] = useState('');
    const [sessionEntries, setSessionEntries] = useState<any[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [sessionDate, setSessionDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const idInputRef = useRef<HTMLInputElement>(null);
    const kgInputRef = useRef<HTMLInputElement>(null);

    // --- (NUEVO) Helper local de 'calculateDaysBetween' ---
    // (Se usa porque no existe en 'utils/calculations')
    const localCalculateDaysBetween = (dateStr1: string, dateStr2: string): number => {
        if (!dateStr1 || dateStr1 === 'N/A' || !dateStr2 || dateStr2 === 'N/A') return 0;
        const date1 = new Date(dateStr1 + 'T00:00:00Z');
        const date2 = new Date(dateStr2 + 'T00:00:00Z');
        const utc1 = Date.UTC(date1.getUTCFullYear(), date1.getUTCMonth(), date1.getUTCDate());
        const utc2 = Date.UTC(date2.getUTCFullYear(), date2.getUTCMonth(), date2.getUTCDate());
        const diffTime = utc1 - utc2;
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const handleAddToList = () => {
        setMessage(null);
        if (!currentId || !currentKg) return;
        const id = currentId.toUpperCase().trim();
        const kgValue = parseFloat(currentKg);
        const strSessionDate = sessionDate.toISOString().split('T')[0];

        if (isNaN(kgValue) || kgValue <= 0) {
            setMessage({ type: 'error', text: 'Peso inválido.' });
            kgInputRef.current?.focus();
            return;
        }

        if (kgValue > 150) {
            setMessage({ type: 'error', text: `El peso de ${kgValue} Kg parece irracional. Verifique.` });
            kgInputRef.current?.focus();
            return;
        }

        if (sessionEntries.some(entry => entry.animalId === id)) {
            setMessage({ type: 'error', text: `${id} ya tiene un pesaje en esta sesión.` });
            setCurrentId('');
            idInputRef.current?.focus();
            return;
        }

        const animal = animals.find(a => a.id === id);
        
        if (animal) {
            if (animal.isReference) {
                setMessage({ type: 'error', text: `${id} es Referencia. No se pueden añadir pesajes.` });
                setCurrentId('');
                idInputRef.current?.focus();
                return;
            }
            
            if (animal.birthDate && animal.birthDate !== 'N/A') {
                const daysSinceBirth = localCalculateDaysBetween(strSessionDate, animal.birthDate);
                
                if (daysSinceBirth < 0) {
                    setMessage({ type: 'error', text: `La fecha de pesaje (${strSessionDate}) no puede ser anterior al nacimiento (${animal.birthDate}).` });
                    setCurrentId('');
                    idInputRef.current?.focus();
                    return;
                }
            }
        }

        const newEntry = { 
            tempId: Date.now(), 
            animalId: id, 
            name: animal?.name,
            kg: kgValue, 
            date: strSessionDate, 
            isRecognized: !!animal 
        };
        setSessionEntries(prev => [newEntry, ...prev]);
        setCurrentId('');
        setCurrentKg('');
        idInputRef.current?.focus();
    };

    const handleFinalSave = async () => {
        setMessage(null);
        setIsLoading(true);
        const { currentUser } = auth;
        if (!currentUser) { setMessage({ type: 'error', text: 'Error de autenticación.' }); setIsLoading(false); return; }

        const unrecognizedCount = sessionEntries.filter(e => !e.isRecognized).length;
        if (unrecognizedCount > 0) {
            setMessage({ type: 'error', text: `No se puede guardar. Tienes ${unrecognizedCount} animal(es) sin registrar en el rebaño.` });
            setIsLoading(false);
            return;
        }

        if (sessionEntries.length === 0) { setMessage({ type: 'error', text: 'No hay pesajes para guardar.' }); setIsLoading(false); return; }

        try {
            const savePromises = sessionEntries.map(entry =>
                addBodyWeighing({ animalId: entry.animalId, kg: entry.kg, date: entry.date })
            );
            await Promise.all(savePromises);

            setMessage({ type: 'success', text: `${sessionEntries.length} pesajes guardados con éxito.` });
            setSessionEntries([]);
            setTimeout(() => onSaveSuccess(sessionDate.toISOString().split('T')[0]), 1500);
        } catch (error) {
            setMessage({ type: 'error', text: 'Ocurrió un error al guardar los datos.' });
            console.error("Error en escritura de pesajes corporales:", error);
            setIsLoading(false);
        }
    };

    const handleIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && currentId) { e.preventDefault(); kgInputRef.current?.focus(); } };
    const handleKgKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && currentKg) { e.preventDefault(); handleAddToList(); } };
    const handleDeleteFromList = (tempId: number) => { setSessionEntries(prev => prev.filter(e => e.tempId !== tempId)); };
    const handleDateSelect = (date: Date | undefined) => { 
        if (date) { 
            date.setHours(0,0,0,0); 
            if (date.getTime() > new Date().setHours(0,0,0,0)) {
                setMessage({ type: 'error', text: 'No se pueden seleccionar fechas futuras.' });
                return;
            }
            setSessionDate(date); 
        } 
        setCalendarOpen(false); 
    };

    return (
        <>
            <div className="flex flex-col h-full animate-fade-in">
                <div className="flex-shrink-0 space-y-4 pt-4">
                    <header className="text-center px-4 flex items-center">
                        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                        <div className="flex-grow">
                            <h1 className="text-2xl font-bold tracking-tight text-white">Carga Rápida de Peso</h1>
                            <p className="text-md text-zinc-400">Sesión de Pesaje Corporal</p>
                        </div>
                        <div className="w-8"></div>
                    </header>
                    <div className="space-y-4">
                        <QuickDatePicker selectedDate={sessionDate} onDateChange={setSessionDate} onOpenCalendar={() => setCalendarOpen(true)} />
                        <div className="flex items-center gap-2 px-4">
                            <input ref={idInputRef} type="text" value={currentId} onChange={(e) => setCurrentId(e.target.value)} onKeyDown={handleIdKeyDown} placeholder="ID Animal" className="w-full bg-brand-glass p-4 rounded-xl text-lg placeholder-zinc-500 border-2 border-transparent focus:border-brand-green focus:ring-0"/>
                            <input ref={kgInputRef} type="number" step="0.1" value={currentKg} onChange={(e) => setCurrentKg(e.target.value)} onKeyDown={handleKgKeyDown} placeholder="Kg" className="w-32 flex-shrink-0 bg-brand-glass p-4 rounded-xl text-lg placeholder-zinc-500 border-2 border-transparent focus:border-brand-green focus:ring-0"/>
                            <button onClick={handleAddToList} disabled={!currentId || !currentKg || isLoading} aria-label="Añadir a la lista" className="aspect-square h-full bg-brand-orange text-white rounded-xl flex items-center justify-center transition-all hover:bg-orange-600 disabled:opacity-40"><PlusCircle size={24} /></button>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto px-4 space-y-2 py-4">
                    {message && message.type === 'error' && (
                        <div className={`mb-3 flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-brand-red`}>
                            <AlertTriangle size={18} /> <span>{message.text}</span>
                        </div>
                    )}
                    {sessionEntries.length === 0 && <p className="text-center text-zinc-500 text-sm pt-8">Los pesajes añadidos aparecerán aquí.</p>}
                    {sessionEntries.map((entry) => (
                        <EntryRow key={entry.tempId} entry={entry} onDelete={handleDeleteFromList} />
                    ))}
                </div>

                <div className="flex-shrink-0 p-4 border-t border-brand-border bg-gray-900/80 backdrop-blur-sm">
                    {message && message.type === 'success' && ( <div className={`mb-3 flex items-center space-x-2 p-3 rounded-lg text-sm bg-green-500/20 text-brand-green`}> <CheckCircle size={18} /> <span>{message.text}</span> </div> )}
                    {isLoading && ( <div className={`mb-3 flex items-center justify-center space-x-2 p-3 rounded-lg text-sm bg-zinc-700/50 text-zinc-300`}><Loader2 size={18} className="animate-spin" /> <span>Guardando...</span> </div> )}
                    
                    <button
                        onClick={handleFinalSave}
                        disabled={isLoading || sessionEntries.length === 0 || sessionEntries.some(e => !e.isRecognized)}
                        className="w-full flex items-center justify-center gap-2 bg-brand-green/20 border border-brand-green text-brand-green hover:bg-brand-green/30 font-bold py-4 px-4 rounded-xl transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save size={20} />
                        {`Guardar ${sessionEntries.length > 0 ? `(${sessionEntries.length})` : ''} Pesajes`}
                    </button>
                </div>
            </div>
            
            <Modal isOpen={isCalendarOpen} onClose={() => setCalendarOpen(false)} title="Seleccionar Fecha">
                <div className="flex justify-center">
                    <DayPicker 
                        mode="single" 
                        selected={sessionDate} 
                        onSelect={handleDateSelect} 
                        disabled={{ after: new Date() }}
                        defaultMonth={sessionDate}
                        captionLayout="dropdown-buttons"
                        fromYear={2015}
                        toYear={new Date().getFullYear()}
                    />
                </div>
            </Modal>
        </>
    );
};

// --- Componente de Opciones (El Hub) ---
const EntryOptions = ({ onSelectMode }: { onSelectMode: (mode: 'rapid' | 'scan') => void }) => {
  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pt-4">
        <header className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">Añadir Pesaje Corporal</h1>
            <p className="text-lg text-zinc-400">Carga de Datos de Crecimiento</p>
        </header>
        <div className="space-y-4">
            <button onClick={() => onSelectMode('rapid')} className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-brand-green text-white p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
                <Zap className="w-12 h-12 mb-2 text-brand-green" />
                <span className="text-lg font-semibold">Carga Rápida</span>
                <span className="text-sm font-normal text-zinc-400">Para carga masiva con teclado</span>
            </button>
            <button onClick={() => onSelectMode('scan')} className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-brand-blue text-white p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
                <ScanLine className="w-12 h-12 mb-2 text-brand-blue" />
                <span className="text-lg font-semibold">Escanear Cuaderno</span>
                <span className="text-sm font-normal text-zinc-400">Digitalización asistida por IA</span>
            </button>
        </div>
    </div>
  );
};


// --- Componente Principal (Shell) ---
export default function AddWeightPage({ onSaveSuccess }: { onSaveSuccess: (date: string) => void; }) {
    const [mode, setMode] = useState<'options' | 'rapid' | 'scan' | 'validate'>('options');
    const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
    const [ocrDefaultDate, setOcrDefaultDate] = useState('');

    const handleOcrSuccess = (results: OcrResult[], defaultDate: string) => {
        setOcrResults(results);
        setOcrDefaultDate(defaultDate);
        setMode('validate');
    };

    const handleBackToOptions = () => {
        setMode('options');
        setOcrResults([]);
        setOcrDefaultDate('');
    };

    // Renderizado condicional del flujo
    switch (mode) {
        case 'rapid':
            return <RapidWeightForm onBack={handleBackToOptions} onSaveSuccess={onSaveSuccess} />;
        
        case 'scan':
            return (
                <BatchImportPage
                    importType="corporal"
                    onBack={handleBackToOptions}
                    onImportSuccess={handleOcrSuccess}
                />
            );
            
        case 'validate':
            return (
                <Modal isOpen={true} onClose={handleBackToOptions} title="Verificar Datos de IA (Corporal)" size="fullscreen">
                    <BatchWeighingForm
                        weightType="corporal"
                        importedData={ocrResults}
                        defaultDate={ocrDefaultDate}
                        onSaveSuccess={() => {
                            handleBackToOptions();
                            onSaveSuccess(ocrDefaultDate);
                        }}
                        onCancel={handleBackToOptions}
                    />
                </Modal>
            );

        case 'options':
        default:
            return <EntryOptions onSelectMode={(selectedMode) => setMode(selectedMode)} />;
    }
}