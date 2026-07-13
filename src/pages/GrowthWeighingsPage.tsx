// src/pages/GrowthWeighingsPage.tsx
// Página robusta de PESAJES CORPORALES (módulo Kilos) de un animal.
// Listar, editar y eliminar pesajes, y agregar varios seguidos con distintas
// fechas (carga rápida, guardado al instante).
//
// Reglas estrictas de Kilos (respetadas):
//  - La fecha debe estar entre el NACIMIENTO y HOY (una cabra no se pesa antes
//    de nacer ni en el futuro). Los corporales son una serie continua desde el
//    nacimiento, NO se agrupan por lactancia.
//  - Rango físico 1–150 Kg (el más estricto del sistema).
//  - No se permite duplicar fecha para el mismo animal.
//  - Aviso (no bloqueante) si el peso es atípico vs. el histórico (>60%).
//  - Editar = borrar el viejo y luego agregar (no existe updateBodyWeighing; el
//    evento espejo se localiza por su kg/fecha original → borrar primero).
//  - El peso AL NACER y AL DESTETE son campos del animal (ficha), no pesajes:
//    se muestran como contexto de solo lectura, no se editan/borran aquí.
import { useState, useMemo, useRef } from 'react';
import { ArrowLeft, Scale, Trash2, Pencil, Plus, X, Check, CalendarDays, TrendingUp, Baby, Award, Heart, Target } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useToastUndo } from '../context/ToastUndoContext';
import { Modal } from '../components/ui/Modal';
import { WeanAnimalForm } from '../components/forms/WeanAnimalForm';
import { DeclareServiceWeightModal } from '../components/modals/DeclareServiceWeightModal';
import { calculateAgeInDays } from '../utils/calculations';
import { BodyWeighing } from '../db/local';
import type { PageState } from '../types/navigation';

interface GrowthWeighingsPageProps {
    animalId: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
}

const fmtDate = (d: string) => {
    try { return new Date(d + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    catch { return d; }
};
const daysBetween = (a: string, b: string) => Math.round(Math.abs(new Date(a + 'T00:00:00Z').getTime() - new Date(b + 'T00:00:00Z').getTime()) / 86400000);

export default function GrowthWeighingsPage({ animalId, onBack }: GrowthWeighingsPageProps) {
    const { animals, bodyWeighings, addBodyWeighing, deleteBodyWeighing, appConfig, events, updateAnimal, addEvent } = useData();
    const { showUndo, showToast } = useToastUndo();

    const today = new Date().toISOString().split('T')[0];
    const animal = useMemo(() => animals.find(a => a.id === animalId), [animals, animalId]);
    const birthDate = animal?.birthDate && animal.birthDate !== 'N/A' && animal.birthDate !== '' ? animal.birthDate : null;
    const birthWeight = typeof animal?.birthWeight === 'number' ? animal.birthWeight : null;
    const isMale = animal?.sex === 'Macho';

    // Metas configurables (sexo-específicas) de config.
    const targets = useMemo(() => ({
        wean: { kg: Number(isMale ? appConfig.growthGoalWeaningWeightMale : appConfig.pesoMinimoDesteteFinal) || 0, day: Number(appConfig.diasMetaDesteteFinal) || 52 },
        d90: { kg: Number(isMale ? appConfig.growthGoal90dWeightMale : appConfig.growthGoal90dWeight) || 0, day: 90 },
        d180: { kg: Number(isMale ? appConfig.growthGoal180dWeightMale : appConfig.growthGoal180dWeight) || 0, day: 180 },
        d270: { kg: Number(appConfig.growthGoal270dWeight) || 0, day: 270 },
        serv: { kg: Number(appConfig.pesoPrimerServicioKg) || 0, day: Math.round((Number(appConfig.edadPrimerServicioMeses) || 11) * 30.44) },
    }), [appConfig, isMale]);

    const minDate = birthDate || undefined;
    const maxDate = today;

    // Pesajes corporales del animal (en vivo). Desc para mostrar; asc para GDP.
    const rowsDesc = useMemo(() =>
        bodyWeighings.filter(w => w.animalId === animalId).sort((a, b) => b.date.localeCompare(a.date)),
        [bodyWeighings, animalId]
    );
    const rowsAsc = useMemo(() => [...rowsDesc].reverse(), [rowsDesc]);

    // GDP (g/día) de cada pesaje vs. el anterior (o vs. peso al nacer para el 1º).
    const gdpById = useMemo(() => {
        const m = new Map<string, number | null>();
        rowsAsc.forEach((w, i) => {
            const prev = i > 0 ? rowsAsc[i - 1] : (birthDate && birthWeight !== null ? { date: birthDate, kg: birthWeight } : null);
            if (!prev) { m.set(w.id, null); return; }
            const d = daysBetween(prev.date, w.date);
            m.set(w.id, d > 0 ? ((w.kg - prev.kg) / d) * 1000 : null);
        });
        return m;
    }, [rowsAsc, birthDate, birthWeight]);

    const avg = rowsDesc.length ? rowsDesc.reduce((s, w) => s + w.kg, 0) / rowsDesc.length : 0;

    // --- HITOS CLAVE (nacer / destete / 1er servicio) ---
    const serviceEvent = useMemo(() => events.find(e => e.animalId === animalId && e.type === 'Peso de Monta'), [events, animalId]);
    const weaningKg = typeof animal?.weaningWeight === 'number' && animal.weaningWeight > 0 ? animal.weaningWeight : null;
    const serviceKg = serviceEvent && typeof serviceEvent.metaWeight === 'number' && serviceEvent.metaWeight !== -1 ? serviceEvent.metaWeight : null;
    const ageAt = (d?: string | null) => (birthDate && d ? calculateAgeInDays(birthDate, d) : null);

    // --- SIMULACIÓN GDP: g/día necesarios desde el último peso para llegar a cada meta ---
    const simulation = useMemo(() => {
        const lastW = rowsDesc[0] || null;
        const refKg = lastW ? lastW.kg : birthWeight;
        const refDate = lastW ? lastW.date : birthDate;
        const refAge = birthDate && refDate ? calculateAgeInDays(birthDate, refDate) : null;
        if (refKg == null || refAge == null) return null;
        const gdpOverall = birthWeight != null && refAge > 0 ? ((refKg - birthWeight) / refAge) * 1000 : null;
        const metas = [
            { label: 'Destete', ...targets.wean },
            { label: '90 días', ...targets.d90 },
            { label: '180 días', ...targets.d180 },
            { label: '270 días', ...targets.d270 },
            { label: '1er servicio', ...targets.serv },
        ].filter(t => t.kg > 0 && t.day > refAge)
            .map(t => {
                const daysLeft = t.day - refAge;
                const reqGdp = ((t.kg - refKg) / daysLeft) * 1000;
                return { ...t, daysLeft, reqGdp };
            })
            .sort((a, b) => a.day - b.day);
        return { refKg, refAge, refDate, gdpOverall, metas };
    }, [rowsDesc, birthDate, birthWeight, targets]);

    // Modales de hitos
    const [birthOpen, setBirthOpen] = useState(false);
    const [birthKg, setBirthKg] = useState('');
    const [birthError, setBirthError] = useState('');
    const [weanOpen, setWeanOpen] = useState(false);
    const [serviceOpen, setServiceOpen] = useState(false);

    const handleBirthSave = async () => {
        const kg = parseFloat(birthKg.replace(',', '.'));
        if (isNaN(kg) || kg <= 0 || kg > 7) { setBirthError('Peso al nacer inválido (0–7 Kg).'); return; }
        setBirthError('');
        await updateAnimal(animalId, { birthWeight: kg });
        setBirthOpen(false);
    };

    const handleWeanSave = async (data: { weaningDate: string; weaningWeight: number }) => {
        await updateAnimal(animalId, { weaningDate: data.weaningDate, weaningWeight: data.weaningWeight });
        if (addEvent) await addEvent({ animalId, date: data.weaningDate, type: 'Destete', details: `Destete registrado: ${data.weaningWeight} Kg.`, metaWeight: data.weaningWeight });
        setWeanOpen(false);
    };

    // --- Carga rápida ---
    const [addDate, setAddDate] = useState(maxDate);
    const [addKg, setAddKg] = useState('');
    const [error, setError] = useState('');
    const [lastSaved, setLastSaved] = useState<{ kg: number; date: string } | null>(null);
    const kgInputRef = useRef<HTMLInputElement>(null);
    // Último peso a mostrar: el recién guardado en esta sesión, o el más reciente cargado.
    const shownLast = lastSaved ?? (rowsDesc[0] ? { kg: rowsDesc[0].kg, date: rowsDesc[0].date } : null);

    // Aviso de atípico (no bloqueante) mientras se escribe.
    const atypicalMsg = useMemo(() => {
        const kg = parseFloat(addKg.replace(',', '.'));
        if (isNaN(kg) || kg <= 0 || rowsDesc.length < 2) return '';
        const a = avg;
        const threshold = Math.max(a * 0.6, 1.0);
        return Math.abs(kg - a) > threshold ? `Peso atípico (promedio histórico ${a.toFixed(1)} Kg). Verifica antes de guardar.` : '';
    }, [addKg, avg, rowsDesc.length]);

    const validate = (date: string, kgStr: string, excludeId?: string): { ok: true; kg: number } | { ok: false; msg: string } => {
        const kg = parseFloat(kgStr.replace(',', '.'));
        if (!date) return { ok: false, msg: 'Elige una fecha.' };
        if (birthDate && date < birthDate) return { ok: false, msg: `La fecha no puede ser anterior al nacimiento (${fmtDate(birthDate)}).` };
        if (date > maxDate) return { ok: false, msg: 'La fecha no puede ser futura.' };
        if (isNaN(kg) || kg <= 0) return { ok: false, msg: 'Ingresa un peso válido.' };
        if (kg < 1 || kg > 150) return { ok: false, msg: 'Peso fuera de rango (1–150 Kg).' };
        if (bodyWeighings.some(w => w.animalId === animalId && w.date === date && w.id !== excludeId)) return { ok: false, msg: `Ya existe un pesaje el ${fmtDate(date)}.` };
        return { ok: true, kg };
    };

    const handleAdd = async () => {
        const v = validate(addDate, addKg);
        if (!v.ok) { setError(v.msg); return; }
        setError('');
        const newId = await addBodyWeighing({ animalId, date: addDate, kg: v.kg });
        showUndo(`Peso ${v.kg} Kg · ${fmtDate(addDate)}`, () => deleteBodyWeighing(newId));
        setLastSaved({ kg: v.kg, date: addDate });
        setAddKg('');
        kgInputRef.current?.focus(); // permite cargar en cadena con Enter (escritorio)
    };

    const handleDelete = async (w: BodyWeighing) => {
        await deleteBodyWeighing(w.id);
        showUndo(`Pesaje eliminado (${w.kg} Kg)`, () => addBodyWeighing({ animalId, date: w.date, kg: w.kg }).then(() => {}));
    };

    // --- Edición ---
    const [editing, setEditing] = useState<BodyWeighing | null>(null);
    const [editDate, setEditDate] = useState('');
    const [editKg, setEditKg] = useState('');
    const [editError, setEditError] = useState('');

    const startEdit = (w: BodyWeighing) => { setEditing(w); setEditDate(w.date); setEditKg(String(w.kg)); setEditError(''); };

    const handleEditSave = async () => {
        if (!editing) return;
        const v = validate(editDate, editKg, editing.id);
        if (!v.ok) { setEditError(v.msg); return; }
        await deleteBodyWeighing(editing.id);
        await addBodyWeighing({ animalId, date: editDate, kg: v.kg });
        setLastSaved({ kg: v.kg, date: editDate });
        setEditing(null);
        showToast('Pesaje actualizado.');
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto animate-fade-in px-4 pb-28">
                <header className="flex items-center pt-8 pb-4 sticky top-0 z-10 bg-c-surface/80 backdrop-blur-md -mx-4 px-4 border-b border-c-border/50 mb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-c-text-muted hover:text-c-text transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        <h1 className="text-2xl font-bold tracking-tight text-c-text-strong">Pesajes corporales</h1>
                        <p className="text-sm text-c-text-muted">{animalId} · {rowsDesc.length} pesaje(s){rowsDesc.length ? ` · Prom ${avg.toFixed(2)} Kg` : ''}</p>
                    </div>
                    <div className="w-8" />
                </header>

                {/* HITOS CLAVE: peso al nacer / destete / 1er servicio */}
                <div className="bg-c-surface rounded-2xl border border-c-border overflow-hidden mb-4">
                    <div className="px-4 py-3 bg-c-surface-2 border-b border-c-border flex items-center gap-2">
                        <Target size={14} className="text-c-accent" />
                        <span className="text-xs font-bold uppercase tracking-widest text-c-text-muted">Hitos clave</span>
                    </div>
                    <div className="divide-y divide-c-border">
                        {[
                            { key: 'nacer', label: 'Peso al nacer', Icon: Baby, actual: birthWeight, date: birthDate, target: Number(appConfig.growthGoalBirthWeight) || 0, onEdit: () => { setBirthKg(birthWeight != null ? String(birthWeight) : ''); setBirthError(''); setBirthOpen(true); } },
                            { key: 'destete', label: 'Peso al destete', Icon: Award, actual: weaningKg, date: animal?.weaningDate, target: targets.wean.kg, targetDay: targets.wean.day, onEdit: () => setWeanOpen(true) },
                            { key: 'servicio', label: 'Peso al 1er servicio', Icon: Heart, actual: serviceKg, date: serviceEvent?.date, target: targets.serv.kg, targetDay: targets.serv.day, onEdit: () => setServiceOpen(true) },
                        ].map(m => {
                            const age = ageAt(m.date);
                            const met = m.actual != null && m.target > 0 && m.actual >= m.target;
                            return (
                                <div key={m.key} className="flex items-center gap-3 px-4 py-3">
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${m.actual != null ? (met ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500') : 'bg-c-surface-2 text-c-text-faint'}`}><m.Icon size={16} /></div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-semibold text-c-text-strong">{m.label}</p>
                                        <p className="text-xs text-c-text-muted">
                                            {m.actual != null
                                                ? `${m.actual.toFixed(2)} Kg${age != null ? ` · ${age} días` : ''}${m.date ? ` · ${fmtDate(m.date)}` : ''}`
                                                : 'Sin registrar'}
                                            {m.target > 0 ? ` · meta ${m.target} Kg` : ''}
                                        </p>
                                    </div>
                                    <button onClick={m.onEdit} className="flex items-center gap-1 text-xs font-bold text-c-accent-sky px-2 py-1.5 rounded-lg hover:bg-c-accent-sky/10">
                                        {m.actual != null ? <Pencil size={13} /> : <Plus size={14} />}
                                        {m.actual != null ? 'Editar' : 'Registrar'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* SIMULACIÓN GDP para llegar a las metas */}
                {simulation && simulation.metas.length > 0 && (
                    <div className="bg-c-surface rounded-2xl border border-c-border overflow-hidden mb-4">
                        <div className="px-4 py-3 bg-c-surface-2 border-b border-c-border flex items-center gap-2">
                            <TrendingUp size={14} className="text-c-accent-sky" />
                            <span className="text-xs font-bold uppercase tracking-widest text-c-text-muted">Simulación GDP para metas</span>
                        </div>
                        <div className="px-4 py-3">
                            <p className="text-xs text-c-text-muted mb-3">
                                Desde el último peso conocido (<b>{simulation.refKg.toFixed(2)} Kg</b> a los <b>{simulation.refAge} días</b>)
                                {simulation.gdpOverall != null ? <> · GDP histórico: <b>{Math.round(simulation.gdpOverall)} g/día</b></> : null}.
                            </p>
                            <div className="space-y-2">
                                {simulation.metas.map(t => {
                                    const cubierta = t.reqGdp <= 0;
                                    const exigente = simulation.gdpOverall != null && !cubierta && t.reqGdp > simulation.gdpOverall * 1.15;
                                    return (
                                        <div key={t.label} className="flex items-center gap-3 bg-c-surface-2 rounded-xl px-3 py-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-semibold text-c-text-strong">{t.label} <span className="text-xs font-normal text-c-text-faint">· meta {t.kg} Kg a los {t.day}d</span></p>
                                                <p className="text-xs text-c-text-muted">Faltan {t.daysLeft} día(s)</p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                {cubierta ? (
                                                    <span className="text-xs font-bold text-emerald-500">Meta cubierta ✓</span>
                                                ) : (
                                                    <>
                                                        <p className={`text-base font-bold ${exigente ? 'text-amber-500' : 'text-c-text-strong'}`}>+{Math.round(t.reqGdp)} <span className="text-xs font-normal text-c-text-muted">g/d</span></p>
                                                        {exigente && <p className="text-[10px] text-amber-500 font-semibold">exigente</p>}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <p className="text-[11px] text-c-text-faint mt-3">Ganancia diaria necesaria para alcanzar cada meta en su edad objetivo. Las metas se configuran en Ajustes.</p>
                        </div>
                    </div>
                )}

                {/* Carga rápida */}
                <div className="bg-c-surface rounded-2xl border border-c-border p-4 mb-4">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-c-text-faint mb-3 flex items-center gap-2"><Plus size={14} /> Agregar pesaje</h2>
                    <div className="flex items-end gap-2">
                        <div className="flex-1">
                            <label className="block text-[11px] font-semibold text-c-text-muted mb-1">Fecha</label>
                            <input type="date" value={addDate} min={minDate} max={maxDate} onChange={e => setAddDate(e.target.value)}
                                className="w-full bg-c-surface-2 text-c-text rounded-lg px-3 py-2.5 text-sm border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent" />
                        </div>
                        <div className="w-24">
                            <label className="block text-[11px] font-semibold text-c-text-muted mb-1">Kg</label>
                            <input ref={kgInputRef} type="text" inputMode="decimal" value={addKg} placeholder="0.0" onChange={e => setAddKg(e.target.value.replace(/[^0-9.,]/g, ''))}
                                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                                className="w-full bg-c-surface-2 text-c-text rounded-lg px-3 py-2.5 text-sm border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent" />
                        </div>
                        <button onClick={handleAdd} className="bg-c-accent hover:bg-green-600 text-white font-bold px-4 py-2.5 rounded-lg flex-shrink-0">Agregar</button>
                    </div>
                    {shownLast && (
                        <div className="mt-3 flex items-center gap-2 bg-c-accent/10 border border-c-accent/25 rounded-lg px-3 py-2">
                            <Check size={15} className="text-c-accent flex-shrink-0" />
                            <span className="text-xs text-c-text-muted">{lastSaved ? 'Último agregado:' : 'Último pesaje:'}</span>
                            <span className="text-sm font-bold text-c-accent">{shownLast.kg.toFixed(2)} Kg</span>
                            <span className="text-xs text-c-text-faint ml-auto">{fmtDate(shownLast.date)}</span>
                        </div>
                    )}
                    {atypicalMsg && !error && <p className="text-xs text-amber-500 mt-2">⚠️ {atypicalMsg}</p>}
                    {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
                    <p className="text-[11px] text-c-text-faint mt-2">
                        Fechas permitidas: {birthDate ? fmtDate(birthDate) : 'nacimiento'} — {fmtDate(maxDate)}. Rango 1–150 Kg. Puedes agregar varios seguidos cambiando la fecha.
                    </p>
                </div>

                {/* Lista de pesajes */}
                <div className="bg-c-surface rounded-2xl border border-c-border overflow-hidden">
                    <div className="px-4 py-3 bg-c-surface-2 border-b border-c-border">
                        <span className="text-xs font-bold uppercase tracking-widest text-c-text-muted">Pesajes cargados</span>
                    </div>
                    {rowsDesc.length === 0 ? (
                        <p className="text-center text-c-text-faint py-8 text-sm">Aún no hay pesajes corporales.</p>
                    ) : (
                        <div className="divide-y divide-c-border">
                            {rowsDesc.map(w => {
                                const age = birthDate ? calculateAgeInDays(birthDate, w.date) : -1;
                                const gdp = gdpById.get(w.id);
                                return (
                                    <div key={w.id} className="flex items-center gap-3 px-4 py-3">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center flex-shrink-0"><Scale size={18} /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-base font-bold text-c-text-strong">{w.kg.toFixed(2)} <span className="text-sm font-normal text-c-text-muted">Kg</span></p>
                                            <p className="text-xs text-c-text-muted flex items-center gap-1.5 flex-wrap">
                                                <CalendarDays size={12} /> {fmtDate(w.date)}{age >= 0 ? ` · ${age} días` : ''}
                                                {typeof gdp === 'number' && <span className="flex items-center gap-0.5 text-c-text-faint"><TrendingUp size={11} /> {gdp >= 0 ? '+' : ''}{Math.round(gdp)} g/d</span>}
                                            </p>
                                        </div>
                                        <button onClick={() => startEdit(w)} aria-label="Editar" className="p-2 rounded-lg text-c-text-faint hover:text-c-accent hover:bg-c-accent/10 transition-all"><Pencil size={17} /></button>
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
                            className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-c-text-muted mb-1">Peso (Kg)</label>
                        <input type="text" inputMode="decimal" value={editKg} onChange={e => setEditKg(e.target.value.replace(/[^0-9.,]/g, ''))}
                            className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent" />
                    </div>
                    {editError && <p className="text-sm text-red-500 text-center">{editError}</p>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setEditing(null)} className="px-5 py-2 bg-c-surface-2 hover:bg-c-surface-3 font-semibold rounded-lg text-c-text flex items-center gap-2"><X size={16} /> Cancelar</button>
                        <button onClick={handleEditSave} className="px-5 py-2 bg-c-accent hover:bg-green-600 text-white font-bold rounded-lg flex items-center gap-2"><Check size={16} /> Guardar</button>
                    </div>
                </div>
            </Modal>

            {/* Editar peso al nacer (dato de la ficha) */}
            <Modal isOpen={birthOpen} onClose={() => setBirthOpen(false)} title="Peso al nacer">
                <div className="space-y-4">
                    <p className="text-sm text-c-text-muted">Dato de la ficha del animal{birthDate ? ` · nacimiento ${fmtDate(birthDate)}` : ''}.</p>
                    <div>
                        <label className="block text-sm font-medium text-c-text-muted mb-1">Peso al nacer (Kg)</label>
                        <input type="text" inputMode="decimal" value={birthKg} onChange={e => setBirthKg(e.target.value.replace(/[^0-9.,]/g, ''))} placeholder="0.0"
                            className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent" />
                    </div>
                    {birthError && <p className="text-sm text-red-500 text-center">{birthError}</p>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setBirthOpen(false)} className="px-5 py-2 bg-c-surface-2 hover:bg-c-surface-3 font-semibold rounded-lg text-c-text">Cancelar</button>
                        <button onClick={handleBirthSave} className="px-5 py-2 bg-c-accent hover:bg-green-600 text-white font-bold rounded-lg">Guardar</button>
                    </div>
                </div>
            </Modal>

            {/* Destete (peso + fecha) */}
            <WeanAnimalForm
                isOpen={weanOpen}
                animalId={animalId}
                birthDate={animal?.birthDate || ''}
                defaultWeight={weaningKg ?? undefined}
                defaultDate={animal?.weaningDate}
                onSave={handleWeanSave}
                onCancel={() => setWeanOpen(false)}
            />

            {/* Peso al 1er servicio (evento "Peso de Monta") */}
            {animal && (
                <DeclareServiceWeightModal
                    isOpen={serviceOpen}
                    onClose={() => setServiceOpen(false)}
                    animal={animal}
                    currentWeight={rowsDesc[0]?.kg}
                    suggestedDate={serviceEvent?.date}
                />
            )}
        </>
    );
}
