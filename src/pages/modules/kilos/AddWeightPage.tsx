import React, { useState, useRef, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { PlusCircle, Save, CheckCircle, AlertTriangle, X, Calendar } from 'lucide-react';
import { auth, db as firestoreDb } from '../../../firebaseConfig';
import { writeBatch, doc, collection } from "firebase/firestore";
import { Modal } from '../../../components/ui/Modal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

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
                        <button 
                            key={date.toISOString()} 
                            type="button"
                            onClick={() => onDateChange(date)}
                            className={`flex flex-col items-center justify-center rounded-lg p-2 w-16 h-16 flex-shrink-0 transition-colors ${isSelected ? 'bg-brand-green text-white' : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700'}`}
                        >
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
    return (
        <div className={`p-3 rounded-lg flex justify-between items-center animate-fade-in group ${isUnrecognized ? 'bg-amber-900/40 border border-amber-500/50' : 'bg-zinc-800/50'}`}>
            <div className="flex items-center space-x-2">
                {isUnrecognized && <AlertTriangle className="text-amber-400 flex-shrink-0" size={18} />}
                <span className="font-semibold text-white">{entry.animalId}</span>
            </div>
            <div className="flex items-center space-x-3">
                <span className="text-zinc-300 font-semibold">{entry.kg.toFixed(2)} Kg</span>
                <button onClick={() => onDelete(entry.tempId)} className="p-1 text-zinc-400 hover:text-brand-red opacity-0 group-hover:opacity-100 transition-opacity"><X size={16}/></button>
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
export default function AddWeightPage({ onSaveSuccess }: { onSaveSuccess: (date: string) => void }) {
    const { animals } = useData();
    const [currentId, setCurrentId] = useState('');
    const [currentKg, setCurrentKg] = useState('');
    const [sessionEntries, setSessionEntries] = useState<any[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [sessionDate, setSessionDate] = useState(() => { const d = new Date(); d.setHours(0,0,0,0); return d; });
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    
    const idInputRef = useRef<HTMLInputElement>(null);
    const kgInputRef = useRef<HTMLInputElement>(null);
    const animalIdSet = useMemo(() => new Set(animals.map(a => a.id)), [animals]);

    const handleAddToList = () => {
        if (!currentId || !currentKg) return;
        const id = currentId.toUpperCase().trim();
        const newEntry = { tempId: Date.now(), animalId: id, kg: parseFloat(currentKg), date: sessionDate.toISOString().split('T')[0], isRecognized: animalIdSet.has(id) };
        setSessionEntries(prev => [newEntry, ...prev]);
        setCurrentId('');
        setCurrentKg('');
        idInputRef.current?.focus();
    };

    const handleFinalSave = async () => {
        setMessage(null);
        const { currentUser } = auth;
        if (!currentUser) {
            setMessage({ type: 'error', text: 'Error de autenticación.' });
            return;
        }
        if (sessionEntries.length === 0) {
            setMessage({ type: 'error', text: 'No hay pesajes para guardar.' });
            return;
        }

        try {
            const batch = writeBatch(firestoreDb);
            const weighingsCollection = collection(firestoreDb, 'bodyWeighings');
            sessionEntries.forEach(entry => {
                const newWeighingRef = doc(weighingsCollection);
                const dataToSave = {
                    animalId: entry.animalId,
                    kg: entry.kg,
                    date: entry.date,
                    userId: currentUser.uid
                };
                batch.set(newWeighingRef, dataToSave);
            });

            await batch.commit();
            setMessage({ type: 'success', text: `${sessionEntries.length} pesajes guardados con éxito.` });
            setSessionEntries([]);
            setTimeout(() => {
                onSaveSuccess(sessionDate.toISOString().split('T')[0]);
            }, 1500);
        } catch (error) {
            setMessage({ type: 'error', text: 'Ocurrió un error al guardar en la nube.' });
            console.error("Error en escritura por lote:", error);
        }
    };

    const handleIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && currentId) { e.preventDefault(); kgInputRef.current?.focus(); } };
    const handleKgKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && currentKg) { e.preventDefault(); handleAddToList(); } };
    const handleDeleteFromList = (tempId: number) => { setSessionEntries(prev => prev.filter(e => e.tempId !== tempId)); };
    
    const handleDateSelect = (date: Date | undefined) => {
        if (date) {
            date.setHours(0,0,0,0);
            setSessionDate(date);
        }
        setCalendarOpen(false);
    };

    return (
        <>
            <div className="flex flex-col h-full animate-fade-in">
                <div className="flex-shrink-0 space-y-4">
                    <header className="text-center px-4">
                        <h1 className="text-2xl font-bold tracking-tight text-white">Añadir Pesaje Corporal</h1>
                        <p className="text-md text-zinc-400">Entrada Rápida</p>
                    </header>
                    <div className="space-y-4">
                        <QuickDatePicker 
                            selectedDate={sessionDate} 
                            onDateChange={setSessionDate} 
                            onOpenCalendar={() => setCalendarOpen(true)} 
                        />
                        <div className="flex items-center gap-2 px-4">
                            <input ref={idInputRef} type="text" value={currentId} onChange={(e) => setCurrentId(e.target.value)} onKeyDown={handleIdKeyDown} placeholder="ID Animal" className="w-full bg-brand-glass p-4 rounded-xl text-lg placeholder-zinc-500 border-2 border-transparent focus:border-brand-green focus:ring-0"/>
                            <input ref={kgInputRef} type="number" step="0.01" value={currentKg} onChange={(e) => setCurrentKg(e.target.value)} onKeyDown={handleKgKeyDown} placeholder="Kg" className="w-32 flex-shrink-0 bg-brand-glass p-4 rounded-xl text-lg placeholder-zinc-500 border-2 border-transparent focus:border-brand-green focus:ring-0"/>
                            <button onClick={handleAddToList} disabled={!currentId || !currentKg} aria-label="Añadir a la lista" className="aspect-square h-full bg-brand-orange text-white rounded-xl flex items-center justify-center transition-all hover:bg-orange-600 disabled:opacity-40"><PlusCircle size={24} /></button>
                        </div>
                    </div>
                </div>

                <div className="flex-grow overflow-y-auto px-4 space-y-2 py-4">
                    {sessionEntries.length === 0 && <p className="text-center text-zinc-500 text-sm pt-8">Los pesajes añadidos aparecerán aquí.</p>}
                    {sessionEntries.map((entry) => (
                        <EntryRow key={entry.tempId} entry={entry} onDelete={handleDeleteFromList} />
                    ))}
                </div>

                <div className="flex-shrink-0 p-4 border-t border-brand-border bg-gray-900/80 backdrop-blur-sm">
                    {message && ( <div className={`mb-3 flex items-center space-x-2 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/20 text-brand-green' : 'bg-red-500/20 text-brand-red'}`}> {message.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />} <span>{message.text}</span> </div> )}
                    <button 
                        onClick={handleFinalSave} 
                        className="w-full flex items-center justify-center gap-2 bg-brand-green/20 border border-brand-green text-brand-green hover:bg-brand-green/30 font-bold py-4 px-4 rounded-xl transition-colors text-lg"
                    >
                        <Save size={20} /> Guardar {sessionEntries.length > 0 ? `(${sessionEntries.length})` : ''} Pesajes
                    </button>
                </div>
            </div>
            
            <Modal isOpen={isCalendarOpen} onClose={() => setCalendarOpen(false)} title="Seleccionar Fecha">
                <div className="flex justify-center">
                    <DayPicker mode="single" selected={sessionDate} onSelect={handleDateSelect} />
                </div>
            </Modal>
        </>
    );
};