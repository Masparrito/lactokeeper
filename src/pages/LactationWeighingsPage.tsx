// src/pages/LactationWeighingsPage.tsx
// Página robusta de PESAJES de una lactancia concreta de un animal.
// Permite listar, editar y eliminar pesajes ya cargados, y agregar varios
// pesajes seguidos con distintas fechas (carga rápida, guardado al instante).
//
// Reglas de integridad (ver evaluación):
//  - La fecha de un pesaje debe caer dentro de la ventana de ESTA lactancia
//    [fecha_parto, próximo_parto) y no ser futura → así no migra ni se
//    "orfaniza" el pesaje.
//  - No se permite duplicar fecha para el mismo animal.
//  - Editar = borrar el viejo y luego agregar el nuevo (no existe
//    updateWeighing; y el evento espejo se localiza por su kg/fecha original,
//    así que hay que borrar primero).
import { useState, useMemo } from 'react';
import { ArrowLeft, Droplets, Trash2, Pencil, Plus, X, Check, CalendarDays } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToastUndo } from '../context/ToastUndoContext';
import { Modal } from '../components/ui/Modal';
import { calculateDEL } from '../utils/calculations';
import { Weighing } from '../db/local';
import type { PageState } from '../types/navigation';

interface LactationWeighingsPageProps {
    animalId: string;
    parturitionDate: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
}

const fmtDate = (d: string) => {
    try { return new Date(d + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    catch { return d; }
};

export default function LactationWeighingsPage({ animalId, parturitionDate, onBack }: LactationWeighingsPageProps) {
    const { weighings, parturitions, addWeighing, deleteWeighing } = useData();
    const { showUndo, showToast } = useToastUndo();

    const today = new Date().toISOString().split('T')[0];

    // Número de lactancia y ventana de fechas [parto, próximo_parto).
    const sortedParts = useMemo(
        () => parturitions.filter(p => p.goatId === animalId).map(p => p.parturitionDate).sort(),
        [parturitions, animalId]
    );
    const partIndex = sortedParts.indexOf(parturitionDate);
    const lactNumber = partIndex + 1;
    const nextParturitionDate = partIndex >= 0 && partIndex < sortedParts.length - 1 ? sortedParts[partIndex + 1] : null;

    const minDate = parturitionDate;
    const maxDate = useMemo(() => {
        let m = today;
        if (nextParturitionDate) {
            const dayBefore = new Date(new Date(nextParturitionDate + 'T00:00:00Z').getTime() - 86400000).toISOString().split('T')[0];
            if (dayBefore < m) m = dayBefore;
        }
        return m;
    }, [nextParturitionDate, today]);

    // Pesajes de esta lactancia (en vivo), ordenados del más reciente al más antiguo.
    const rows = useMemo(() =>
        weighings
            .filter(w => w.goatId === animalId && w.date >= parturitionDate && (!nextParturitionDate || w.date < nextParturitionDate))
            .sort((a, b) => b.date.localeCompare(a.date)),
        [weighings, animalId, parturitionDate, nextParturitionDate]
    );

    const avg = rows.length ? rows.reduce((s, w) => s + w.kg, 0) / rows.length : 0;

    // --- Carga rápida (agregar varios) ---
    const [addDate, setAddDate] = useState(maxDate);
    const [addKg, setAddKg] = useState('');
    const [error, setError] = useState('');

    const validate = (date: string, kgStr: string, excludeId?: string): { ok: true; kg: number } | { ok: false; msg: string } => {
        const kg = parseFloat(kgStr.replace(',', '.'));
        if (!date) return { ok: false, msg: 'Elige una fecha.' };
        if (date < minDate) return { ok: false, msg: `La fecha no puede ser anterior al parto (${fmtDate(minDate)}).` };
        if (date > maxDate) return { ok: false, msg: nextParturitionDate ? 'La fecha cae en la siguiente lactancia.' : 'La fecha no puede ser futura.' };
        if (isNaN(kg) || kg <= 0) return { ok: false, msg: 'Ingresa un peso válido.' };
        if (kg > 8.5) return { ok: false, msg: 'El peso de leche parece muy alto (máx 8.5 Kg).' };
        if (weighings.some(w => w.goatId === animalId && w.date === date && w.id !== excludeId)) return { ok: false, msg: `Ya existe un pesaje el ${fmtDate(date)}.` };
        return { ok: true, kg };
    };

    const handleAdd = async () => {
        const v = validate(addDate, addKg);
        if (!v.ok) { setError(v.msg); return; }
        setError('');
        const newId = await addWeighing({ goatId: animalId, date: addDate, kg: v.kg });
        showUndo(`Pesaje ${v.kg} Kg · ${fmtDate(addDate)}`, () => deleteWeighing(newId));
        setAddKg('');
        // Se conserva la fecha para que el usuario la ajuste al agregar el siguiente.
    };

    const handleDelete = async (w: Weighing) => {
        await deleteWeighing(w.id);
        showUndo(`Pesaje eliminado (${w.kg} Kg)`, () => addWeighing({ goatId: animalId, date: w.date, kg: w.kg }).then(() => {}));
    };

    // --- Edición ---
    const [editing, setEditing] = useState<Weighing | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editKg, setEditKg] = useState('');
    const [editError, setEditError] = useState('');

    const startEdit = (w: Weighing) => { setEditing(w); setEditDate(w.date); setEditKg(String(w.kg)); setEditError(''); };

    const handleEditSave = async () => {
        if (!editing) return;
        const v = validate(editDate, editKg, editing.id);
        if (!v.ok) { setEditError(v.msg); return; }
        // Orden obligatorio: borrar el viejo (con su kg/fecha original) y luego agregar.
        await deleteWeighing(editing.id);
        await addWeighing({ goatId: animalId, date: editDate, kg: v.kg });
        setEditing(null);
        showToast('Pesaje actualizado.');
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto animate-fade-in px-4 pb-28">
                <header className="flex items-center pt-8 pb-4 sticky top-0 z-10 bg-c-surface/80 backdrop-blur-md -mx-4 px-4 border-b border-c-border/50 mb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-c-text-muted hover:text-c-text transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        <h1 className="text-2xl font-bold tracking-tight text-c-text-strong">Lactancia {lactNumber}</h1>
                        <p className="text-sm text-c-text-muted">{animalId} · {rows.length} pesaje(s) · Prom {avg.toFixed(2)} Kg</p>
                    </div>
                    <div className="w-8" />
                </header>

                {/* Carga rápida: agregar varios pesajes con distintas fechas */}
                <div className="bg-c-surface rounded-2xl border border-c-border p-4 mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-c-text-faint mb-3 flex items-center gap-2"><Plus size={14} /> Agregar pesaje</h2>
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="block text-[11px] font-semibold text-c-text-muted mb-1">Fecha</label>
                            <input type="date" value={addDate} min={minDate} max={maxDate} onChange={e => setAddDate(e.target.value)}
                                className="w-full bg-c-surface-2 text-c-text rounded-lg px-3 py-2.5 text-sm border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent-sky" />
                        </div>
                        <div className="w-24">
                            <label className="block text-[11px] font-semibold text-c-text-muted mb-1">Kg</label>
                            <input type="number" inputMode="decimal" step="0.01" value={addKg} placeholder="0.00" onChange={e => setAddKg(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                                className="w-full bg-c-surface-2 text-c-text rounded-lg px-3 py-2.5 text-sm border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent-sky" />
                        </div>
                        <button onClick={handleAdd} className="bg-c-accent-sky hover:bg-blue-600 text-white font-bold px-4 py-2.5 rounded-lg flex-shrink-0">Agregar</button>
                    </div>
                    {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                    <p className="text-[11px] text-c-text-faint mt-2">
                        Fechas permitidas: {fmtDate(minDate)} — {fmtDate(maxDate)}. Puedes agregar varios seguidos cambiando la fecha.
                    </p>
                </div>

                {/* Lista de pesajes */}
                <div className="bg-c-surface rounded-2xl border border-c-border overflow-hidden">
                    <div className="px-4 py-3 bg-c-surface-2 border-b border-c-border">
                        <span className="text-xs font-bold uppercase tracking-widest text-c-text-muted">Pesajes cargados</span>
                    </div>
                    {rows.length === 0 ? (
                        <p className="text-center text-c-text-faint py-8 text-sm">Aún no hay pesajes en esta lactancia.</p>
                    ) : (
                        <div className="divide-y divide-c-border">
                            {rows.map(w => {
                                const del = calculateDEL(parturitionDate, w.date);
                                return (
                                    <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                                        <div className="w-10 h-10 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center flex-shrink-0"><Droplets size={18} /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-base font-bold text-c-text-strong">{w.kg.toFixed(2)} <span className="text-sm font-normal text-c-text-muted">Kg</span></p>
                                            <p className="text-xs text-c-text-muted flex items-center gap-1.5">
                                                <CalendarDays size={12} /> {fmtDate(w.date)}{typeof del === 'number' ? ` · DEL ${del}` : ''}
                                            </p>
                                        </div>
                                        <button onClick={() => startEdit(w)} aria-label="Editar" className="p-2 rounded-lg text-c-text-faint hover:text-c-accent-sky hover:bg-c-accent-sky/10 transition-all"><Pencil size={17} /></button>
                                        <button onClick={() => handleDelete(w)} aria-label="Eliminar" className="p-2 rounded-lg text-c-text-faint hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={17} /></button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de edición */}
            <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Editar pesaje">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-c-text-muted mb-1">Fecha</label>
                        <input type="date" value={editDate} min={minDate} max={maxDate} onChange={e => setEditDate(e.target.value)}
                            className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent-sky" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-c-text-muted mb-1">Producción (Kg)</label>
                        <input type="number" inputMode="decimal" step="0.01" value={editKg} onChange={e => setEditKg(e.target.value)}
                            className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent-sky" />
                    </div>
                    {editError && <p className="text-sm text-red-500 text-center">{editError}</p>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setEditing(null)} className="px-5 py-2 bg-c-surface-2 hover:bg-c-surface-3 font-semibold rounded-lg text-c-text flex items-center gap-2"><X size={16} /> Cancelar</button>
                        <button onClick={handleEditSave} className="px-5 py-2 bg-c-accent-sky hover:bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2"><Check size={16} /> Guardar</button>
                    </div>
                </div>
            </Modal>
        </>
    );
}
