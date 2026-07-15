import { useState, useMemo, useCallback } from 'react';
import type { PageState } from '../../types/navigation';
import { useData } from '../../context/DataContext';
import {
    HeartHandshake, Trash2, Edit, Dna, MoreVertical, ChevronRight, ChevronDown,
    Plus, Flag, Repeat, LogOut
} from 'lucide-react';
import { BreedingSeason, SireLot } from '../../db/local';
import { formatAnimalDisplay } from '../../utils/formatting';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Modal } from '../ui/Modal';
import { SireLotForm } from '../forms/SireLotForm';
import { motion, AnimatePresence } from 'framer-motion';

// Estadísticas de un macho (lote): hembras asignadas vs servidas por ÉL.
interface SireStats { total: number; served: number; rate: number; }

// Color de identidad estable por macho (para avatar y chip).
const SIRE_PALETTE = ['#3a9d4e', '#3898e0', '#e0a92a', '#8b7ff0', '#e0714a', '#d9518a', '#2fb4ab', '#b0863a'];
const sireColor = (id: string): string => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return SIRE_PALETTE[h % SIRE_PALETTE.length];
};
const sireInitials = (name: string): string => {
    const clean = (name || '').replace(/[^a-zA-Z0-9ñÑ]/g, '');
    return (clean.slice(0, 2) || '?').toUpperCase();
};

// --- SUB-COMPONENTE: Fila delgada de Semental (con barra de saltos + acciones) ---
interface SireRowProps {
    lot: SireLot;
    stats: SireStats;
    sireName: string;
    navigateTo: (page: PageState) => void;
    onDelete: (lot: SireLot) => void;
    onSwap: (lot: SireLot) => void;
    onRetire: (lot: SireLot) => void;
    isLast: boolean;
}

const SireRow = ({ lot, stats, sireName, navigateTo, onDelete, onSwap, onRetire, isLast }: SireRowProps) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const isRetired = !!lot.retiredDate;
    const color = sireColor(lot.sireId);
    const pct = stats.total > 0 ? Math.round((stats.served / stats.total) * 100) : 0;
    const done = stats.total > 0 && stats.served >= stats.total;

    const retiredLabel = isRetired && lot.retiredDate
        ? new Date(lot.retiredDate + 'T00:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
        : '';

    return (
        <div className={`relative flex items-center gap-3 py-3 ${isLast ? '' : 'border-b border-c-border'}`}>
            <button
                onClick={() => navigateTo({ name: 'sire-lot-detail', lotId: lot.id })}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
                <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-extrabold text-white shrink-0"
                    style={{ backgroundColor: isRetired ? 'var(--c-surface-2, #27272a)' : color, opacity: isRetired ? 0.5 : 1 }}
                >
                    {isRetired ? <Dna size={16} className="text-c-text-faint" /> : sireInitials(sireName)}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                        <p className={`text-sm font-bold truncate ${isRetired ? 'text-c-text-muted' : 'text-c-text'}`}>{sireName}</p>
                        {isRetired ? (
                            <span className="text-[10px] font-bold text-c-text-faint uppercase tracking-wide shrink-0">Retirado {retiredLabel}</span>
                        ) : (
                            <span className="text-xs font-bold text-c-text-muted shrink-0 tabular-nums">{stats.served}<span className="text-c-text-faint font-medium">/{stats.total}</span></span>
                        )}
                    </div>
                    {!isRetired && (
                        <div className="h-2 mt-1.5 rounded-full bg-c-surface-2 overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: done ? 'var(--c-accent, #3a9d4e)' : 'linear-gradient(90deg,#ec4899,#f472b6)' }} />
                        </div>
                    )}
                </div>
            </button>

            <div className="flex items-center gap-0.5 shrink-0">
                {!isRetired && (
                    <div className="relative">
                        <button
                            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                            className="p-1.5 text-c-text-faint hover:text-c-text hover:bg-c-surface-2 rounded-full transition-colors"
                        >
                            <MoreVertical size={16} />
                        </button>
                        <AnimatePresence>
                            {menuOpen && (
                                <>
                                    <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                        className="absolute right-0 mt-1 w-48 bg-c-surface-2 border border-c-border-strong rounded-xl shadow-2xl z-30 overflow-hidden"
                                    >
                                        <button onClick={(e) => { e.stopPropagation(); onSwap(lot); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-c-text hover:bg-c-surface-3 flex items-center gap-3">
                                            <Repeat size={16} /> Intercambiar macho
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); onRetire(lot); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-c-text hover:bg-c-surface-3 flex items-center gap-3">
                                            <LogOut size={16} /> Retirar macho
                                        </button>
                                        <div className="h-px bg-c-border" />
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(lot); setMenuOpen(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-brand-red hover:bg-brand-red/10 flex items-center gap-3">
                                            <Trash2 size={16} /> Eliminar
                                        </button>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                )}
                <ChevronRight size={16} className="text-c-text-faint" />
            </div>
        </div>
    );
};

// --- PROPS TYPE ---
interface SeasonMasterCardProps {
    season: BreedingSeason;
    seasonLots: SireLot[];
    navigateTo: (page: PageState) => void;
    onEdit: () => void;
    onDelete: () => void;
    onDeleteLot: (lot: SireLot) => void;
    onAddSire: (season: BreedingSeason) => void;
    onFinalize: (season: BreedingSeason) => void;
    onSwapLot: (lot: SireLot) => void;
    onRetireLot: (lot: SireLot) => void;
}

// --- TARJETA COMPACTA DESPLEGABLE ---
const SeasonMasterCard = ({ season, seasonLots, navigateTo, onEdit, onDelete, onDeleteLot, onAddSire, onFinalize, onSwapLot, onRetireLot }: SeasonMasterCardProps) => {
    const { fathers, animals, serviceRecords } = useData();
    const [showMenu, setShowMenu] = useState(false);
    const [showHist, setShowHist] = useState(false);

    const resolveSireName = useCallback((sireId: string): string => {
        const father = fathers.find(f => f.id === sireId);
        if (father) return formatAnimalDisplay(father);
        const animal = animals.find(a => a.id === sireId);
        if (animal) return formatAnimalDisplay(animal).split(' ')[1] || formatAnimalDisplay(animal);
        return 'Semental';
    }, [fathers, animals]);

    // Estadísticas por macho (hembras asignadas vs servidas por él).
    const statsByLot = useMemo(() => {
        const m = new Map<string, SireStats>();
        seasonLots.forEach(lot => {
            const assigned = animals.filter(a => a.sireLotId === lot.id && a.status === 'Activo' && !a.isReference);
            const served = assigned.filter(f => serviceRecords.some(sr => sr.femaleId === f.id && sr.sireLotId === lot.id)).length;
            m.set(lot.id, { total: assigned.length, served, rate: assigned.length ? (served / assigned.length) * 100 : 0 });
        });
        return m;
    }, [seasonLots, animals, serviceRecords]);

    // Machos activos ordenados por ACTIVIDAD (más servidas primero); retirados aparte.
    const activeLots = useMemo(() =>
        seasonLots.filter(l => !l.retiredDate)
            .sort((a, b) => (statsByLot.get(b.id)?.served || 0) - (statsByLot.get(a.id)?.served || 0)),
        [seasonLots, statsByLot]);
    const retiredLots = useMemo(() => seasonLots.filter(l => !!l.retiredDate), [seasonLots]);

    // Agregado de la temporada (cada hembra tiene un solo lote => sin duplicados).
    const agg = useMemo(() => {
        let total = 0, served = 0;
        seasonLots.forEach(l => { const s = statsByLot.get(l.id); if (s) { total += s.total; served += s.served; } });
        return { total, served, pct: total ? Math.round((served / total) * 100) : 0 };
    }, [seasonLots, statsByLot]);

    const startDate = new Date(season.startDate + 'T00:00:00');
    const endDate = new Date(season.endDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startT = startDate.getTime(), endT = endDate.getTime(), todayT = today.getTime();
    const DAY = 1000 * 60 * 60 * 24;
    const daysLeft = Math.max(0, Math.ceil((endT - todayT) / DAY));
    const daysUntilStart = Math.max(0, Math.ceil((startT - todayT) / DAY));

    const hasSires = seasonLots.length > 0;
    const isClosed = season.status === 'Cerrado';
    const isFuture = !isClosed && todayT < startT;
    const isEnded = !isClosed && todayT > endT;
    const needsFinalize = isEnded;
    const isWithinWindow = !isClosed && !isFuture && !isEnded;
    const isRunning = isWithinWindow && hasSires;
    const isOnHold = isWithinWindow && !hasSires;

    // Desplegada por defecto si está dentro de ventana o por finalizar.
    const [expanded, setExpanded] = useState(!isClosed && !isFuture);

    let statusConfig;
    if (isClosed) statusConfig = { color: 'text-c-text-faint', bg: 'bg-c-surface-2', border: 'border-c-border-strong', dot: 'bg-c-text-faint', label: 'Finalizada', pulse: false };
    else if (isFuture) statusConfig = { color: 'text-c-accent-sky', bg: 'bg-c-accent-sky/15', border: 'border-c-accent-sky/30', dot: 'bg-c-accent-sky', label: 'Próxima', pulse: false };
    else if (needsFinalize) statusConfig = { color: 'text-c-accent-gold', bg: 'bg-c-accent-gold/15', border: 'border-c-accent-gold/30', dot: 'bg-c-accent-gold', label: 'Por Finalizar', pulse: true };
    else if (isRunning) statusConfig = { color: 'text-c-accent', bg: 'bg-c-accent/15', border: 'border-c-accent/30', dot: 'bg-c-accent', label: 'En Curso', pulse: true };
    else statusConfig = { color: 'text-c-accent-gold', bg: 'bg-c-accent-gold/15', border: 'border-c-accent-gold/30', dot: 'bg-c-accent-gold', label: 'En Espera', pulse: false };

    const machoCount = isClosed ? retiredLots.length : activeLots.length;
    const fmt = (d: Date) => d.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
    const chipLots = [...activeLots, ...retiredLots].slice(0, 3);
    const extraLots = seasonLots.length - chipLots.length;
    const globalDone = agg.total > 0 && agg.served >= agg.total;

    // Texto de "tiempo" (idea C: días restantes)
    let timeText = '';
    if (isFuture) timeText = `comienza en ${daysUntilStart} d`;
    else if (needsFinalize) timeText = 'por finalizar';
    else if (isOnHold) timeText = 'sin machos';
    else if (isRunning) timeText = `faltan ${daysLeft} d`;

    return (
        <div className="bg-c-surface rounded-2xl border border-c-border shadow-sm mb-4 relative">
            {/* Menú de temporada (arriba a la derecha) */}
            <div className="absolute top-3 right-3 z-30">
                <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
                    className="p-1.5 text-c-text-faint hover:text-c-text hover:bg-c-surface-2 rounded-full transition-colors"
                >
                    <MoreVertical size={18} />
                </button>
                <AnimatePresence>
                    {showMenu && (
                        <>
                            <div className="fixed inset-0 z-20" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                className="absolute right-0 mt-1 w-44 bg-c-surface-2 border border-c-border-strong rounded-xl shadow-2xl z-30 overflow-hidden"
                            >
                                <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-c-text hover:bg-c-surface-3 flex items-center gap-3"><Edit size={16} /> Editar</button>
                                {!isClosed && (<><div className="h-px bg-c-border" /><button onClick={(e) => { e.stopPropagation(); onFinalize(season); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-c-text hover:bg-c-surface-3 flex items-center gap-3"><Flag size={16} /> Finalizar temporada</button></>)}
                                <div className="h-px bg-c-border" />
                                <button onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-brand-red hover:bg-brand-red/10 flex items-center gap-3"><Trash2 size={16} /> Eliminar</button>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Cabecera compacta (toca para desplegar) */}
            <div onClick={() => setExpanded(v => !v)} className="p-4 pr-12 cursor-pointer select-none">
                <div className="flex items-center gap-2.5 mb-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${statusConfig.dot} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
                    <span className="text-[17px] font-bold text-c-text-strong truncate flex-1">{season.name}</span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded-full border shrink-0 ${statusConfig.bg} ${statusConfig.border} ${statusConfig.color}`}>{statusConfig.label}</span>
                    <ChevronDown size={18} className={`text-c-text-faint transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
                </div>
                <p className="text-xs text-c-text-muted mb-3">
                    {fmt(startDate)} – {fmt(endDate)} · <b className="text-c-text font-bold">{machoCount} {machoCount === 1 ? 'macho' : 'machos'}</b>
                    {agg.total > 0 && <> · <b className={globalDone ? 'text-c-accent' : 'text-pink-500'}>{agg.pct}%</b> servidas</>}
                    {timeText && <> · <span className="text-c-text-faint">{timeText}</span></>}
                </p>

                {/* Chips de machos (solo colapsada) */}
                {!expanded && chipLots.length > 0 && (
                    <div className="flex gap-1.5 flex-wrap mb-3">
                        {chipLots.map(lot => (
                            <span key={lot.id} className="inline-flex items-center gap-1.5 bg-c-surface-2 border border-c-border rounded-full pl-1 pr-2.5 py-0.5 text-xs font-bold text-c-text">
                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white" style={{ backgroundColor: sireColor(lot.sireId) }}>{sireInitials(resolveSireName(lot.sireId))}</span>
                                {resolveSireName(lot.sireId)}
                            </span>
                        ))}
                        {extraLots > 0 && <span className="inline-flex items-center bg-transparent border border-dashed border-c-border-strong rounded-full px-2.5 py-1 text-xs font-bold text-c-text-muted">+{extraLots} {extraLots === 1 ? 'macho' : 'machos'}</span>}
                    </div>
                )}

                {/* Barra global de servidas */}
                {agg.total > 0 && (
                    <div className="h-1.5 rounded-full bg-c-surface-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${agg.pct}%`, background: globalDone ? 'var(--c-accent, #3a9d4e)' : 'linear-gradient(90deg,#ec4899,#f472b6)' }} />
                    </div>
                )}
            </div>

            {/* Cuerpo desplegable: machos con barra de saltos */}
            <AnimatePresence initial={false}>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }} className="overflow-hidden"
                    >
                        <div className="px-4 pb-3 border-t border-c-border pt-1">
                            {seasonLots.length > 0 ? (
                                <>
                                    {activeLots.map((lot, i) => (
                                        <SireRow key={lot.id} lot={lot} stats={statsByLot.get(lot.id)!} sireName={resolveSireName(lot.sireId)}
                                            navigateTo={navigateTo} onDelete={onDeleteLot} onSwap={onSwapLot} onRetire={onRetireLot}
                                            isLast={i === activeLots.length - 1 && retiredLots.length === 0 && isClosed} />
                                    ))}

                                    {!isClosed && (
                                        <button onClick={(e) => { e.stopPropagation(); onAddSire(season); }} className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-c-border-strong rounded-xl text-c-accent-sky font-bold text-sm hover:bg-c-accent-sky/5 transition-colors active:scale-[0.99]">
                                            <Plus size={16} /> Añadir macho
                                        </button>
                                    )}

                                    {retiredLots.length > 0 && (
                                        <div className="mt-2">
                                            <button onClick={(e) => { e.stopPropagation(); setShowHist(v => !v); }} className="flex items-center gap-1.5 text-[11px] font-bold text-c-text-faint uppercase tracking-widest py-2">
                                                <ChevronDown size={13} className={`transition-transform ${showHist ? 'rotate-180' : '-rotate-90'}`} /> Histórico de machos ({retiredLots.length})
                                            </button>
                                            {showHist && retiredLots.map((lot, i) => (
                                                <SireRow key={lot.id} lot={lot} stats={statsByLot.get(lot.id)!} sireName={resolveSireName(lot.sireId)}
                                                    navigateTo={navigateTo} onDelete={onDeleteLot} onSwap={onSwapLot} onRetire={onRetireLot}
                                                    isLast={i === retiredLots.length - 1} />
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                !isClosed && (
                                    <button onClick={(e) => { e.stopPropagation(); onAddSire(season); }} className="my-2 w-full flex flex-col items-center gap-1 py-6 border border-dashed border-c-border-strong rounded-xl text-c-text-faint hover:bg-c-surface-2 transition-colors">
                                        <Dna size={26} />
                                        <span className="text-sm font-medium">Sin machos asignados</span>
                                        <span className="text-xs text-c-accent-sky font-bold uppercase tracking-wide">Toca para añadir</span>
                                    </button>
                                )
                            )}

                            {needsFinalize && (
                                <button onClick={(e) => { e.stopPropagation(); onFinalize(season); }} className="mt-3 w-full flex items-center justify-center gap-2 bg-c-accent-gold/15 text-c-accent-gold hover:bg-c-accent-gold/25 font-bold py-2.5 rounded-xl transition-colors active:scale-[0.99]">
                                    <Flag size={16} /> Finalizar temporada
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL (LÓGICA DE ORDENAMIENTO MEJORADA) ---
interface BreedingLotsViewProps {
    navigateTo: (page: PageState) => void;
    onEditSeason: (season: BreedingSeason) => void;
}

export default function BreedingLotsView({ navigateTo, onEditSeason }: BreedingLotsViewProps) {
    const { breedingSeasons, sireLots, deleteBreedingSeason, deleteSireLot, addSireLot, closeBreedingSeason, retireSire, swapSire } = useData();
    const [deleteConfirmation, setDeleteConfirmation] = useState<BreedingSeason | null>(null);
    const [lotToDelete, setLotToDelete] = useState<SireLot | null>(null);
    const [finalizeConfirmation, setFinalizeConfirmation] = useState<BreedingSeason | null>(null);
    const [finalizeDate, setFinalizeDate] = useState(new Date().toISOString().split('T')[0]);
    const [swapForLot, setSwapForLot] = useState<SireLot | null>(null);
    const [retireForLot, setRetireForLot] = useState<SireLot | null>(null);
    const [retireDate, setRetireDate] = useState(new Date().toISOString().split('T')[0]);

    const handleConfirmFinalize = async () => {
        if (!finalizeConfirmation) return;
        try { await closeBreedingSeason(finalizeConfirmation.id, finalizeDate); }
        catch (err) { console.error(err); }
        setFinalizeConfirmation(null);
    };

    const handleSwap = async (newSireId: string, date?: string) => {
        if (!swapForLot) return;
        // swapSire lanza si el macho ya está activo; el error se muestra en el form.
        await swapSire(swapForLot.id, newSireId, date);
        setSwapForLot(null);
    };

    const handleConfirmRetire = async () => {
        if (!retireForLot) return;
        try { await retireSire(retireForLot.id, retireDate); }
        catch (err) { console.error(err); }
        setRetireForLot(null);
    };
    // Temporada para la que se está agregando un macho (abre el modal en la tarjeta).
    const [addSireForSeason, setAddSireForSeason] = useState<BreedingSeason | null>(null);

    // Agrega un macho a la temporada desde la propia tarjeta (evita duplicados).
    const handleAddSire = async (sireId: string) => {
        if (!addSireForSeason) return;
        const exists = sireLots.some(l => l.seasonId === addSireForSeason.id && l.sireId === sireId);
        if (exists) { alert('Este reproductor ya está en esta temporada.'); return; }
        try { await addSireLot({ seasonId: addSireForSeason.id, sireId }); }
        catch (err) { console.error(err); }
        setAddSireForSeason(null);
    };

    // --- ORDENAMIENTO POR PRIORIDAD ---
    const orderedSeasons = useMemo(() => {
        return [...breedingSeasons].sort((a, b) => {
            const hasSiresA = sireLots.some(lot => lot.seasonId === a.id);
            const hasSiresB = sireLots.some(lot => lot.seasonId === b.id);
            
            const now = new Date().getTime();
            const startA = new Date(a.startDate).getTime();
            const endA = new Date(a.endDate).getTime();
            const startB = new Date(b.startDate).getTime();
            const endB = new Date(b.endDate).getTime();

            // Prioridad consciente de fechas: en curso / en espera (dentro de
            // ventana) arriba; luego "por finalizar" (terminó pero sigue abierta);
            // luego próximas; al final las cerradas.
            const getPriority = (season: BreedingSeason, hasSires: boolean, start: number, end: number) => {
                if (season.status === 'Cerrado') return 4;
                if (start > now) return 3;      // próxima
                if (end < now) return 2;        // por finalizar
                return hasSires ? 0 : 1;        // en curso / en espera
            };

            const priorityA = getPriority(a, hasSiresA, startA, endA);
            const priorityB = getPriority(b, hasSiresB, startB, endB);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            if (priorityA <= 2) {
                return endA - endB; // dentro de ventana / por finalizar: por fin más próximo
            }
            if (priorityA === 3) {
                return startA - startB; // próximas: por inicio más próximo
            }

            return endB - endA; // cerradas: más recientes primero
        });
    }, [breedingSeasons, sireLots]);

    const handleConfirmDeleteSeason = async () => {
        if (!deleteConfirmation) return;
        try { await deleteBreedingSeason(deleteConfirmation.id); } 
        catch (err) { console.error(err); }
        setDeleteConfirmation(null);
    };

    const handleConfirmDeleteLot = async () => {
        if (!lotToDelete) return;
        try { await deleteSireLot(lotToDelete.id); }
        catch (err) { console.error(err); }
        setLotToDelete(null);
    };

    if (orderedSeasons.length === 0) {
        return (
             <div className="text-center py-20 px-6 mx-4 mt-6 bg-c-surface rounded-[2.5rem] border border-c-border border-dashed flex flex-col items-center gap-6">
                <div className="bg-c-surface-2 p-6 rounded-full text-c-text-faint shadow-inner">
                    <HeartHandshake size={56} strokeWidth={1} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-c-text-strong mb-2">Sin Temporadas Activas</h3>
                    <p className="text-base text-c-text-faint max-w-[240px] mx-auto leading-relaxed">
                        Inicia una nueva temporada para gestionar la reproducción controlada de tu finca.
                    </p>
                </div>
            </div>
        )
    }

    return (
        <>
            <div className="px-4 pt-4 pb-32">
                {orderedSeasons.map(season => {
                    const lotsForThisSeason = sireLots.filter(lot => lot.seasonId === season.id);
                    return (
                        <SeasonMasterCard
                            key={season.id}
                            season={season}
                            seasonLots={lotsForThisSeason}
                            navigateTo={navigateTo}
                            onEdit={() => onEditSeason(season)}
                            onDelete={() => setDeleteConfirmation(season)}
                            onDeleteLot={(lot: SireLot) => setLotToDelete(lot)}
                            onAddSire={(s: BreedingSeason) => setAddSireForSeason(s)}
                            onFinalize={(s: BreedingSeason) => {
                                const t = new Date().toISOString().split('T')[0];
                                setFinalizeDate(s.endDate && s.endDate < t ? s.endDate : t);
                                setFinalizeConfirmation(s);
                            }}
                            onSwapLot={(lot: SireLot) => setSwapForLot(lot)}
                            onRetireLot={(lot: SireLot) => { setRetireDate(new Date().toISOString().split('T')[0]); setRetireForLot(lot); }}
                        />
                    );
                })}
            </div>

            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleConfirmDeleteSeason}
                title="Eliminar Temporada"
                message={`¿Eliminar "${deleteConfirmation?.name}"? Se liberarán todas las hembras asignadas.`}
            />

            <ConfirmationModal
                isOpen={!!lotToDelete}
                onClose={() => setLotToDelete(null)}
                onConfirm={handleConfirmDeleteLot}
                title="Eliminar Semental"
                message="¿Quitar este reproductor de la temporada? Las hembras volverán a estar disponibles."
            />

            {/* Finalizar temporada: pide la fecha de finalización */}
            <Modal isOpen={!!finalizeConfirmation} onClose={() => setFinalizeConfirmation(null)} title="Finalizar temporada">
                <div className="space-y-4">
                    <p className="text-sm text-c-text-muted leading-relaxed">
                        {finalizeConfirmation && (<>Se cerrará <strong className="text-c-text">"{finalizeConfirmation.name}"</strong>. </>)}
                        No se registrarán más servicios en ella. Los registros históricos se conservan.
                    </p>
                    <div>
                        <label className="block text-sm font-bold text-c-text-strong mb-2">Fecha de finalización</label>
                        <input
                            type="date"
                            value={finalizeDate}
                            onChange={(e) => setFinalizeDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full bg-c-surface-2 border border-c-border-strong rounded-xl py-3 px-4 text-c-text focus:border-c-accent-sky outline-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setFinalizeConfirmation(null)} className="flex-1 px-5 py-3 bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-bold rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleConfirmFinalize} className="flex-1 px-5 py-3 bg-c-accent-gold hover:bg-c-accent-gold/90 text-white font-bold rounded-xl transition-colors active:scale-[0.98]">
                            Finalizar
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={!!addSireForSeason} onClose={() => setAddSireForSeason(null)} title="Agregar macho a la temporada">
                {addSireForSeason && (
                    <SireLotForm
                        seasonId={addSireForSeason.id}
                        onSave={handleAddSire}
                        onCancel={() => setAddSireForSeason(null)}
                    />
                )}
            </Modal>

            {/* Intercambiar macho: elige nuevo reproductor + fecha del cambio */}
            <Modal isOpen={!!swapForLot} onClose={() => setSwapForLot(null)} title="Intercambiar macho">
                {swapForLot && (
                    <SireLotForm
                        seasonId={swapForLot.seasonId}
                        onSave={handleSwap}
                        onCancel={() => setSwapForLot(null)}
                        dateLabel="Fecha del cambio"
                        submitLabel="Confirmar intercambio"
                    />
                )}
            </Modal>

            {/* Retirar macho: pide fecha y confirma */}
            <Modal isOpen={!!retireForLot} onClose={() => setRetireForLot(null)} title="Retirar macho">
                <div className="space-y-4">
                    <p className="text-sm text-c-text-muted">
                        El macho quedará en el histórico de la temporada. Las hembras que aún <strong>no</strong> fueron servidas por él volverán a estar disponibles; las ya servidas conservan su registro.
                    </p>
                    <div>
                        <label className="block text-sm font-bold text-c-text-strong mb-2">Fecha de retiro</label>
                        <input
                            type="date"
                            value={retireDate}
                            onChange={(e) => setRetireDate(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="w-full bg-c-surface-2 border border-c-border-strong rounded-xl py-3 px-4 text-c-text focus:border-c-accent-sky outline-none"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setRetireForLot(null)} className="flex-1 px-5 py-3 bg-c-surface-2 hover:bg-c-surface-3 text-c-text font-bold rounded-xl transition-colors">
                            Cancelar
                        </button>
                        <button type="button" onClick={handleConfirmRetire} className="flex-1 px-5 py-3 bg-c-accent-gold hover:bg-c-accent-gold/90 text-white font-bold rounded-xl transition-colors active:scale-[0.98]">
                            Retirar
                        </button>
                    </div>
                </div>
            </Modal>
        </>
    );
};