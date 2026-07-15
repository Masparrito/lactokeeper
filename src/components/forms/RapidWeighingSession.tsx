import React, { useMemo, useRef, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToastUndo } from '../../context/ToastUndoContext';
import { PlusCircle, Save, AlertTriangle, Calendar, ArrowLeft, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ParturitionModal } from '../modals/ParturitionModal';

// Sesión de carga rápida UNIFICADA para leche (LactoKeeper) y peso corporal (Kilos).
// Graba cada animal AL INSTANTE (con "Deshacer"), muestra sugerencias predecibles
// del arete, contexto del animal y un resumen en vivo de la sesión.

interface RapidWeighingSessionProps {
    weightType: 'leche' | 'corporal';
    onBack: () => void;
    onSaveSuccess: (date: string) => void;
}

interface SessionEntry { recordId: string; animalId: string; name?: string; kg: number; date: string; }

const QuickDatePicker = ({ selectedDate, onDateChange, onOpenCalendar, accent }: { selectedDate: Date; onDateChange: (d: Date) => void; onOpenCalendar: () => void; accent: string }) => {
    const dates = useMemo(() => {
        const today = new Date(); today.setHours(0, 0, 0, 0);
        return Array.from({ length: 7 }, (_, i) => { const d = new Date(today); d.setDate(today.getDate() - i); return d; });
    }, []);
    const label = (date: Date, today: Date) => {
        if (date.getTime() === today.getTime()) return 'Hoy';
        const y = new Date(today); y.setDate(today.getDate() - 1);
        if (date.getTime() === y.getTime()) return 'Ayer';
        return date.toLocaleDateString('es-VE', { weekday: 'short' }).replace('.', '');
    };
    return (
        <div className="px-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-c-text-muted mb-2"><Calendar size={16} />Fecha del Pesaje</label>
            <div className="flex items-center gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
                <button type="button" onClick={onOpenCalendar} className="flex flex-col items-center justify-center bg-c-surface-2 rounded-lg p-2 w-16 h-16 flex-shrink-0 text-c-text-strong hover:bg-c-surface-3 transition-colors">
                    <Calendar size={20} /><span className="text-xs mt-1">Calendario</span>
                </button>
                {dates.map(date => {
                    const isSel = date.getTime() === selectedDate.getTime();
                    return (
                        <button key={date.toISOString()} type="button" onClick={() => onDateChange(date)}
                            className={`flex flex-col items-center justify-center rounded-lg p-2 w-16 h-16 flex-shrink-0 transition-colors ${isSel ? `${accent} text-white` : 'bg-c-surface-2 text-c-text-strong hover:bg-c-surface-3'}`}>
                            <span className="text-xs capitalize">{label(date, dates[0])}</span>
                            <span className="font-bold text-2xl">{date.getDate()}</span>
                            <span className="text-xs">{date.toLocaleDateString('es-VE', { month: 'short' }).replace('.', '')}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export const RapidWeighingSession: React.FC<RapidWeighingSessionProps> = ({ weightType, onBack, onSaveSuccess }) => {
    const { animals, weighings, bodyWeighings, addWeighing, addBodyWeighing, deleteWeighing, deleteBodyWeighing, fetchData } = useData();
    const { showUndo } = useToastUndo();

    const isLeche = weightType === 'leche';
    const accent = isLeche ? 'bg-c-accent-sky' : 'bg-c-accent';
    const accentText = isLeche ? 'text-c-accent-sky' : 'text-c-accent';
    const accentBorder = isLeche ? 'focus:border-c-accent-sky' : 'focus:border-c-accent';
    const maxKg = isLeche ? 8.5 : 150;

    const [currentId, setCurrentId] = useState('');
    const [currentKg, setCurrentKg] = useState('');
    const [entries, setEntries] = useState<SessionEntry[]>([]);
    const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [sessionDate, setSessionDate] = useState(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; });
    const [isCalendarOpen, setCalendarOpen] = useState(false);
    const [parturitionModal, setParturitionModal] = useState({ isOpen: false, motherId: '' });

    const idRef = useRef<HTMLInputElement>(null);
    const kgRef = useRef<HTMLInputElement>(null);

    const dateStr = sessionDate.toISOString().split('T')[0];
    // Fecha elegida, legible y con inicial mayúscula (para el encabezado).
    const prettyDate = (() => {
        const s = sessionDate.toLocaleDateString('es-VE', { weekday: 'long', day: 'numeric', month: 'long' });
        return s.charAt(0).toUpperCase() + s.slice(1);
    })();
    const normId = currentId.toUpperCase().trim();
    const exactAnimal = useMemo(() => animals.find(a => a.id === normId), [animals, normId]);

    const suggestions = useMemo(() => {
        const q = normId.toLowerCase();
        if (!q || exactAnimal) return [];
        return animals
            .filter(a => !a.isReference && (a.id.toLowerCase().includes(q) || (a.name || '').toLowerCase().includes(q)))
            .slice(0, 6);
    }, [animals, normId, exactAnimal]);

    // Último pesaje del tipo correspondiente para el animal reconocido (contexto).
    const lastWeight = useMemo(() => {
        if (!exactAnimal) return null;
        const list = isLeche
            ? weighings.filter(w => w.goatId === exactAnimal.id)
            : bodyWeighings.filter(w => w.animalId === exactAnimal.id);
        if (!list.length) return null;
        return [...list].sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    }, [exactAnimal, isLeche, weighings, bodyWeighings]);

    const daysBetween = (a: string, b: string) => {
        const d1 = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10));
        const d2 = Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10));
        return Math.round((d1 - d2) / 86400000);
    };

    const summary = useMemo(() => {
        if (!entries.length) return null;
        const avg = entries.reduce((s, e) => s + e.kg, 0) / entries.length;
        return { count: entries.length, avg, last: entries[0] };
    }, [entries]);

    const pickSuggestion = (id: string) => { setCurrentId(id); setMessage(null); setTimeout(() => kgRef.current?.focus(), 0); };

    const handleSave = async () => {
        setMessage(null);
        const id = normId;
        const kg = parseFloat(currentKg);
        if (!id) { idRef.current?.focus(); return; }
        if (isNaN(kg) || kg <= 0) { setMessage({ type: 'error', text: 'Peso inválido.' }); kgRef.current?.focus(); return; }
        if (kg > maxKg) { setMessage({ type: 'error', text: `${kg} Kg supera el límite razonable (${maxKg} Kg). Verifica.` }); kgRef.current?.focus(); return; }

        const animal = animals.find(a => a.id === id);
        if (!animal) {
            setMessage({ type: 'error', text: `${id} no existe en el rebaño.` });
            return; // para leche se ofrece "Registrar Parto" en la UI
        }
        if (animal.isReference) { setMessage({ type: 'error', text: `${id} es de Referencia. No admite pesajes.` }); return; }
        if (!isLeche && animal.birthDate && animal.birthDate !== 'N/A' && daysBetween(dateStr, animal.birthDate) < 0) {
            setMessage({ type: 'error', text: `La fecha del pesaje es anterior al nacimiento de ${id}.` }); return;
        }
        const dupSaved = isLeche
            ? weighings.some(w => w.goatId === id && w.date === dateStr)
            : bodyWeighings.some(w => w.animalId === id && w.date === dateStr);
        if (dupSaved) { setMessage({ type: 'error', text: `${id} ya tiene un pesaje guardado para ${dateStr}.` }); return; }

        try {
            const recordId = isLeche
                ? await addWeighing({ goatId: id, date: dateStr, kg })
                : await addBodyWeighing({ animalId: id, date: dateStr, kg });
            setEntries(prev => [{ recordId, animalId: id, name: animal.name, kg, date: dateStr }, ...prev]);
            showUndo(`${isLeche ? 'Leche' : 'Peso'} de ${id} (${kg} Kg)`, () => (isLeche ? deleteWeighing(recordId) : deleteBodyWeighing(recordId)));
            setCurrentId(''); setCurrentKg(''); idRef.current?.focus();
        } catch (e: any) {
            setMessage({ type: 'error', text: e.message || 'No se pudo guardar.' });
        }
    };

    const removeEntry = async (e: SessionEntry) => {
        try { await (isLeche ? deleteWeighing(e.recordId) : deleteBodyWeighing(e.recordId)); } catch { /* ignore */ }
        setEntries(prev => prev.filter(x => x.recordId !== e.recordId));
    };

    const handleIdKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        if (exactAnimal) kgRef.current?.focus();
        else if (suggestions.length) pickSuggestion(suggestions[0].id);
    };
    const handleKgKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter' && currentKg) { e.preventDefault(); handleSave(); } };

    const handleDateSelect = (d: Date | undefined) => {
        if (d) { d.setHours(0, 0, 0, 0); if (d.getTime() > new Date().setHours(0, 0, 0, 0)) { setMessage({ type: 'error', text: 'No se permiten fechas futuras.' }); setCalendarOpen(false); return; } setSessionDate(d); }
        setCalendarOpen(false);
    };

    const handleCloseParturition = () => { fetchData?.(); setParturitionModal({ isOpen: false, motherId: '' }); setTimeout(() => kgRef.current?.focus(), 50); };

    return (
        <>
            <div className="flex flex-col h-full animate-fade-in">
                <div className="flex-shrink-0 space-y-4 pt-4">
                    <header className="text-center px-4 flex items-center">
                        <button onClick={onBack} className="p-2 -ml-2 text-c-text-muted hover:text-c-text transition-colors"><ArrowLeft size={24} /></button>
                        <div className="flex-grow">
                            <h1 className="text-2xl font-bold tracking-tight text-c-text-strong">{isLeche ? 'Carga Rápida de Leche' : 'Carga Rápida de Peso'}</h1>
                            <p className={`text-sm font-bold ${accentText} flex items-center justify-center gap-1.5`}>
                                <Calendar size={14} /> {prettyDate}
                            </p>
                        </div>
                        <div className="w-8" />
                    </header>

                    <QuickDatePicker selectedDate={sessionDate} onDateChange={setSessionDate} onOpenCalendar={() => setCalendarOpen(true)} accent={accent} />

                    <div className="px-4 relative">
                        <div className="flex items-center gap-2">
                            <input ref={idRef} type="text" value={currentId} onChange={(e) => { setCurrentId(e.target.value); setMessage(null); }} onKeyDown={handleIdKeyDown} placeholder="ID Animal" autoCapitalize="characters" className={`w-full bg-c-surface p-4 rounded-xl text-lg text-c-text placeholder-c-text-faint border-2 border-transparent ${accentBorder} focus:ring-0 outline-none`} />
                            <input ref={kgRef} type="text" inputMode="decimal" value={currentKg} onChange={(e) => setCurrentKg(e.target.value.replace(',', '.').replace(/[^0-9.]/g, ''))} onKeyDown={handleKgKeyDown} placeholder="Kg" className={`w-28 flex-shrink-0 bg-c-surface p-4 rounded-xl text-lg text-c-text placeholder-c-text-faint border-2 border-transparent ${accentBorder} focus:ring-0 outline-none`} />
                            <button onClick={handleSave} disabled={!currentId || !currentKg} aria-label="Guardar y siguiente" className={`aspect-square h-[58px] ${accent} text-white rounded-xl flex items-center justify-center transition-all hover:opacity-90 disabled:opacity-40`}><PlusCircle size={24} /></button>
                        </div>

                        {/* Sugerencias predecibles */}
                        {suggestions.length > 0 && (
                            <div className="absolute left-4 right-4 mt-1 z-30 bg-c-surface border border-c-border rounded-xl shadow-xl max-h-56 overflow-y-auto">
                                {suggestions.map(a => (
                                    <button key={a.id} type="button" onClick={() => pickSuggestion(a.id)} className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-c-surface-2 border-b border-c-border last:border-0">
                                        <span className="font-mono font-bold text-c-text">{a.id}</span>
                                        {a.name && <span className="text-sm text-c-text-muted truncate">{String(a.name).toUpperCase()}</span>}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Contexto del animal reconocido */}
                        {exactAnimal && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-c-text-muted px-1">
                                <span className="font-semibold text-c-text">{exactAnimal.name ? String(exactAnimal.name).toUpperCase() : exactAnimal.id}</span>
                                {lastWeight && <span>· último: {lastWeight.kg} Kg hace {daysBetween(dateStr, lastWeight.date)} d</span>}
                            </div>
                        )}

                        {/* No reconocido (leche → registrar parto) */}
                        {!exactAnimal && normId && suggestions.length === 0 && (
                            <div className="mt-2 flex items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs">
                                <span className="flex items-center gap-1.5 text-amber-500"><AlertTriangle size={14} /> {normId} no existe en el rebaño.</span>
                                {isLeche && <button onClick={() => setParturitionModal({ isOpen: true, motherId: normId })} className="font-bold text-c-accent-sky">Registrar Parto</button>}
                            </div>
                        )}

                        {message?.type === 'error' && (
                            <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg text-sm bg-red-500/15 text-brand-red"><AlertTriangle size={16} /><span>{message.text}</span></div>
                        )}
                    </div>

                    {/* Resumen en vivo */}
                    {summary && (
                        <div className="px-4">
                            <div className="flex items-center justify-between bg-c-surface-2 rounded-xl px-4 py-2.5 text-sm">
                                <span className="font-bold text-c-text">{summary.count} {summary.count === 1 ? 'registrado' : 'registrados'}</span>
                                <span className="text-c-text-muted">prom. <span className={`font-bold ${accentText}`}>{summary.avg.toFixed(2)} Kg</span></span>
                                <span className="text-c-text-faint truncate">último: {summary.last.animalId} = {summary.last.kg}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Log de la sesión (ya guardados) */}
                <div className="flex-grow overflow-y-auto px-4 space-y-2 py-4">
                    {entries.length === 0 && <p className="text-center text-c-text-faint text-sm pt-8">Cada pesaje se guarda al instante. Aparecerán aquí.</p>}
                    {entries.map(e => (
                        <div key={e.recordId} className="p-3 rounded-lg flex justify-between items-center animate-fade-in group bg-c-surface-2">
                            <div className="min-w-0 pr-2">
                                <p className="font-mono font-semibold text-base text-c-text-strong truncate">{e.animalId}</p>
                                {e.name && <p className="text-sm text-c-text-muted truncate">{String(e.name).toUpperCase()}</p>}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-c-accent-gold font-semibold">{e.kg.toFixed(2)} Kg</span>
                                <button onClick={() => removeEntry(e)} className="p-1 text-c-text-muted hover:text-brand-red transition-colors"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex-shrink-0 p-4 border-t border-c-border bg-c-surface/80 backdrop-blur-sm">
                    <button onClick={() => onSaveSuccess(dateStr)} className={`w-full flex items-center justify-center gap-2 ${accent} text-white font-bold py-4 px-4 rounded-xl text-lg active:scale-[0.99] transition-transform`}>
                        <Save size={20} /> Finalizar sesión{summary ? ` (${summary.count})` : ''}
                    </button>
                </div>
            </div>

            <Modal isOpen={isCalendarOpen} onClose={() => setCalendarOpen(false)} title="Seleccionar Fecha">
                <div className="flex justify-center">
                    <DayPicker mode="single" selected={sessionDate} onSelect={handleDateSelect} disabled={{ after: new Date() }} defaultMonth={sessionDate} captionLayout="dropdown-buttons" fromYear={2015} toYear={new Date().getFullYear()} />
                </div>
            </Modal>

            <ParturitionModal isOpen={parturitionModal.isOpen} onClose={handleCloseParturition} motherId={parturitionModal.motherId} />
        </>
    );
};
