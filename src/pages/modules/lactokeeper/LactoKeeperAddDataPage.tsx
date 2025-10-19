// src/pages/modules/lactokeeper/LactoKeeperAddDataPage.tsx

import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
// --- LÍNEA CORREGIDA: Se importa Loader2 para el feedback de carga ---
import { PlusCircle, Save, CheckCircle, AlertTriangle, X, Calendar, Zap, ScanLine, Loader2 } from 'lucide-react';
import { auth, db as firestoreDb } from '../../../firebaseConfig';
import { writeBatch, doc, collection } from "firebase/firestore";
import { Modal } from '../../../components/ui/Modal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ParturitionModal } from '../../../components/modals/ParturitionModal';
import type { PageState as RebanoPageState } from '../../../types/navigation';

// --- Sub-componentes (sin cambios) ---
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
                            className={`flex flex-col items-center justify-center rounded-lg p-2 w-16 h-16 flex-shrink-0 transition-colors ${isSelected ? 'bg-brand-orange text-white' : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'}`}>
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

const EntryRow = ({ entry, onDelete, onRegister }: { entry: any, onDelete: (tempId: number) => void, onRegister: (animalId: string) => void }) => {
    const isUnrecognized = !entry.isRecognized;
    return (
        <div className={`p-3 rounded-lg flex justify-between items-center animate-fade-in group ${isUnrecognized ? 'bg-amber-900/40 border border-amber-500/50' : 'bg-zinc-800/50'}`}>
            <div className="flex items-center space-x-2">
                {isUnrecognized && <AlertTriangle className="text-amber-400 flex-shrink-0" size={18} />}
                <span className="font-semibold text-white">{entry.animalId}</span>
            </div>
            <div className="flex items-center space-x-3">
                {isUnrecognized ? (
                    <button onClick={() => onRegister(entry.animalId)} className="text-xs font-semibold bg-brand-orange text-white px-2 py-1 rounded-md hover:bg-orange-600">Registrar Parto</button>
                ) : (
                    <span className="text-zinc-300 font-semibold">{entry.kg.toFixed(2)} Kg</span>
                )}
                <button onClick={() => onDelete(entry.tempId)} className="p-1 text-zinc-400 hover:text-brand-red opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
            </div>
        </div>
    );
};

const RapidEntryForm = ({ onSaveSuccess }: { onSaveSuccess: (date: string) => void }) => {
    const { animals, weighings, fetchData } = useData();
    const [currentId, setCurrentId] = useState('');
    const [currentKg, setCurrentKg] = useState('');
    const [sessionEntries, setSessionEntries] = useState<any[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [sessionDate, setSessionDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    const [parturitionModal, setParturitionModal] = useState({ isOpen: false, motherId: '' });
    const [isLoading, setIsLoading] = useState(false); // <-- ESTADO DE CARGA AÑADIDO

    const idInputRef = useRef<HTMLInputElement>(null);
    const kgInputRef = useRef<HTMLInputElement>(null);

    const handleAddToList = () => {
        setMessage(null);
        if (!currentId || !currentKg) return;

        const id = currentId.toUpperCase().trim();
        const kgValue = parseFloat(currentKg);
        const dateString = sessionDate.toISOString().split('T')[0];

        if (kgValue > 100) {
            setMessage({ type: 'error', text: `El valor de ${kgValue} Kg es irracional. Verifique el dato.` });
            return;
        }

        if (kgValue > 8.5) {
            setMessage({ type: 'error', text: `Producción de ${kgValue} Kg es muy alta. Límite: 8.5 Kg.` });
            return;
        }

        if (sessionEntries.some(entry => entry.animalId === id)) {
            setMessage({ type: 'error', text: `${id} ya tiene un pesaje en esta sesión.` });
            return;
        }
        
        if (weighings.some(w => w.goatId === id && w.date === dateString)) {
            setMessage({ type: 'error', text: `${id} ya tiene un pesaje guardado para esta fecha.` });
            return;
        }

        const animal = animals.find(a => a.id === id);
        if (animal && animal.isReference) {
            setMessage({ type: 'error', text: `${id} es un animal de Referencia. No se pueden añadir pesajes.` });
            return;
        }

        const newEntry = { tempId: Date.now(), animalId: id, kg: kgValue, date: dateString, isRecognized: !!animal };
        setSessionEntries(prev => [newEntry, ...prev]);
        setCurrentId('');
        setCurrentKg('');
        idInputRef.current?.focus();
    };

    const handleFinalSave = async () => {
        setMessage(null);
        setIsLoading(true); // <-- ACTIVAR ESTADO DE CARGA
        const { currentUser } = auth;
        if (!currentUser) { 
            setMessage({ type: 'error', text: 'Error de autenticación.' }); 
            setIsLoading(false);
            return;
        }
        
        const unrecognizedCount = sessionEntries.filter(e => !e.isRecognized).length;
        if (unrecognizedCount > 0) {
            setMessage({ type: 'error', text: `No se puede guardar. Tienes ${unrecognizedCount} animal(es) sin registrar.` });
            setIsLoading(false);
            return;
        }
        if (sessionEntries.length === 0) {
            setMessage({ type: 'error', text: 'No hay pesajes para guardar.' });
            setIsLoading(false);
            return;
        }

        try {
            const batch = writeBatch(firestoreDb);
            const weighingsCollection = collection(firestoreDb, 'weighings');
            sessionEntries.forEach(entry => {
                const newWeighingRef = doc(weighingsCollection);
                const dataToSave = { goatId: entry.animalId, kg: entry.kg, date: entry.date, userId: currentUser.uid };
                batch.set(newWeighingRef, dataToSave);
            });
            await batch.commit();
            setMessage({ type: 'success', text: `${sessionEntries.length} pesajes guardados con éxito.` });
            setSessionEntries([]);
            setTimeout(() => {
                // No es necesario setear isLoading(false) aquí si onSaveSuccess navega
                onSaveSuccess(sessionDate.toISOString().split('T')[0]);
            }, 1500);
        } catch (error) {
            setMessage({ type: 'error', text: 'Ocurrió un error al guardar en la nube.' });
            console.error("Error en escritura por lote:", error);
            setIsLoading(false); // <-- DESACTIVAR CARGA EN CASO DE ERROR
        }
    };
    
    const handleIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && currentId) { e.preventDefault(); kgInputRef.current?.focus(); } };
    const handleKgKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && currentKg) { e.preventDefault(); handleAddToList(); } };
    const handleDeleteFromList = (tempId: number) => { setSessionEntries(prev => prev.filter(e => e.tempId !== tempId)); };
    const handleDateSelect = (date: Date | undefined) => { if (date) { date.setHours(0,0,0,0); setSessionDate(date); } setCalendarOpen(false); };
    
    const handleCloseParturitionModal = () => {
        fetchData();
        setSessionEntries(prev => prev.map(entry => entry.animalId === parturitionModal.motherId ? { ...entry, isRecognized: true } : entry ));
        setParturitionModal({ isOpen: false, motherId: '' });
    };

    return (
        <>
            <div className="flex flex-col h-full">
                <div className="flex-shrink-0 space-y-4 pt-4">
                    <div className="text-center px-4">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Carga Rápida de Leche</h1>
                        <p className="text-md text-zinc-400">Sesión de Ordeño</p>
                    </div>
                    <div className="space-y-4">
                        <QuickDatePicker selectedDate={sessionDate} onDateChange={setSessionDate} onOpenCalendar={() => setCalendarOpen(true)} />
                        <div className="flex items-center gap-2 px-4">
                            <input ref={idInputRef} type="text" value={currentId} onChange={(e) => setCurrentId(e.target.value)} onKeyDown={handleIdKeyDown} placeholder="ID Animal" className="w-full bg-brand-glass p-4 rounded-xl text-lg placeholder-zinc-500 border-2 border-transparent focus:border-brand-orange focus:ring-0"/>
                            <input ref={kgInputRef} type="number" step="0.01" value={currentKg} onChange={(e) => setCurrentKg(e.target.value)} onKeyDown={handleKgKeyDown} placeholder="Kg" className="w-32 flex-shrink-0 bg-brand-glass p-4 rounded-xl text-lg placeholder-zinc-500 border-2 border-transparent focus:border-brand-orange focus:ring-0"/>
                            <button onClick={handleAddToList} disabled={!currentId || !currentKg || isLoading} aria-label="Añadir a la lista" className="aspect-square h-full bg-brand-orange text-white rounded-xl flex items-center justify-center transition-all hover:bg-orange-600 disabled:opacity-40"><PlusCircle size={24} /></button>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto px-4 space-y-2 py-4">
                    {sessionEntries.length === 0 && <p className="text-center text-zinc-500 text-sm pt-8">Los pesajes añadidos aparecerán aquí.</p>}
                    {sessionEntries.map((entry) => ( <EntryRow key={entry.tempId} entry={entry} onDelete={handleDeleteFromList} onRegister={(id) => setParturitionModal({ isOpen: true, motherId: id })} /> ))}
                </div>

                <div className="flex-shrink-0 p-4 border-t border-brand-border bg-gray-900/80 backdrop-blur-sm">
                    {message && ( <div className={`mb-3 flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}> {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />} <span>{message.text}</span> </div> )}
                    {/* --- BOTÓN MODIFICADO --- */}
                    <button 
                        onClick={handleFinalSave} 
                        disabled={isLoading || sessionEntries.length === 0}
                        className="w-full flex items-center justify-center gap-2 bg-brand-orange/20 border border-brand-orange text-brand-orange hover:bg-brand-orange/30 font-bold py-4 px-4 rounded-xl transition-colors text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <Loader2 size={24} className="animate-spin" />
                        ) : (
                            <Save size={20} />
                        )}
                        {isLoading ? 'Guardando...' : `Guardar ${sessionEntries.length > 0 ? `(${sessionEntries.length})` : ''} Pesajes`}
                    </button>
                </div>
            </div>
            
            <Modal isOpen={isCalendarOpen} onClose={() => setCalendarOpen(false)} title="Seleccionar Fecha"><div className="flex justify-center"><DayPicker mode="single" selected={sessionDate} onSelect={handleDateSelect} /></div></Modal>
            
            <ParturitionModal
                isOpen={parturitionModal.isOpen}
                onClose={handleCloseParturitionModal}
                motherId={parturitionModal.motherId}
            />
        </>
    );
};

// --- Componente Principal (Shell) ---
interface LactoKeeperAddDataPageProps {
    onNavigate: (page: RebanoPageState['name'], state?: any) => void;
    onSaveSuccess: () => void;
}

export default function LactoKeeperAddDataPage({ onNavigate, onSaveSuccess }: LactoKeeperAddDataPageProps) {
    const [entryMode, setEntryMode] = useState<'options' | 'rapid'>('options');

    if (entryMode === 'rapid') {
        return <RapidEntryForm onSaveSuccess={onSaveSuccess} />;
    }

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pt-4">
            <h1 className="text-2xl font-bold tracking-tight text-white text-center">Añadir Datos de Leche</h1>
            <div className="space-y-4">
                <button onClick={() => setEntryMode('rapid')} className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-brand-orange text-white p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
                    <Zap className="w-12 h-12 mb-2 text-brand-orange" />
                    <span className="text-lg font-semibold">Carga Rápida</span>
                    <span className="text-sm font-normal text-zinc-400">Para carga masiva con teclado</span>
                </button>
    	         <button onClick={() => onNavigate('ocr', {})} className="w-full bg-brand-glass backdrop-blur-xl border border-brand-border hover:border-brand-blue text-white p-6 rounded-2xl flex flex-col items-center justify-center text-center transition-all transform hover:scale-105">
                    <ScanLine className="w-12 h-12 mb-2 text-brand-blue" />
                    <span className="text-lg font-semibold">Escanear Cuaderno</span>
                    <span className="text-sm font-normal text-zinc-400">Digitalización asistida por IA</span>
                </button>
            </div>
        </div>
    );
}