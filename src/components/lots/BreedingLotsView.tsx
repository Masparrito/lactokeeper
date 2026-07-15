import { useState, useMemo } from 'react';
import type { PageState } from '../../types/navigation';
import { useData } from '../../context/DataContext';
import {
    HeartHandshake, Trash2, Edit, Dna, Users, Activity, GripVertical, MoreVertical, ChevronRight,
    Timer, Plus, Flag, Repeat, LogOut
} from 'lucide-react';
import { BreedingSeason, SireLot } from '../../db/local';
import { formatAnimalDisplay } from '../../utils/formatting';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Modal } from '../ui/Modal';
import { SireLotForm } from '../forms/SireLotForm';
import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';

// --- HELPER: Estadísticas por Semental ---
const useSireLotStats = (lotId: string) => {
    const { animals, serviceRecords } = useData();
    return useMemo(() => {
        const assignedFemales = animals.filter(a => a.sireLotId === lotId && a.status === 'Activo' && !a.isReference);
        const totalFemales = assignedFemales.length;
        
        const servicedFemalesCount = assignedFemales.filter(female => 
            serviceRecords.some(sr => sr.femaleId === female.id && sr.sireLotId === lotId)
        ).length;

        const serviceRate = totalFemales > 0 ? (servicedFemalesCount / totalFemales) * 100 : 0;

        return { totalFemales, servicedFemalesCount, serviceRate };
    }, [animals, serviceRecords, lotId]);
};

// --- HELPER: Estadísticas agregadas de la temporada (hembras y servidas) ---
const useSeasonAggregateStats = (seasonLots: SireLot[]) => {
    const { animals, serviceRecords } = useData();
    return useMemo(() => {
        const lotIds = new Set(seasonLots.map(l => l.id));
        const assigned = animals.filter(a =>
            a.sireLotId && lotIds.has(a.sireLotId) && a.status === 'Activo' && !a.isReference
        );
        const total = assigned.length;
        const served = assigned.filter(f =>
            serviceRecords.some(sr => sr.femaleId === f.id && lotIds.has(sr.sireLotId))
        ).length;
        const pct = total > 0 ? Math.round((served / total) * 100) : 0;
        return { total, served, pct };
    }, [animals, serviceRecords, seasonLots]);
};

// --- SUB-COMPONENTE: Fila de Semental (con acciones) ---
interface SireRowProps {
    lot: SireLot;
    navigateTo: (page: PageState) => void;
    onDelete: (lot: SireLot) => void;
    onSwap: (lot: SireLot) => void;
    onRetire: (lot: SireLot) => void;
}

const SireRow = ({ lot, navigateTo, onDelete, onSwap, onRetire }: SireRowProps) => {
    const { fathers, animals } = useData();
    const stats = useSireLotStats(lot.id);
    const [menuOpen, setMenuOpen] = useState(false);
    const isRetired = !!lot.retiredDate;

    const sireName = useMemo(() => {
        const father = fathers.find(f => f.id === lot.sireId);
        if (father) return formatAnimalDisplay(father);
        const animal = animals.find(a => a.id === lot.sireId);
        if (animal) return formatAnimalDisplay(animal).split(' ')[1] || formatAnimalDisplay(animal);
        return 'Semental';
    }, [fathers, animals, lot.sireId]);

    const retiredLabel = isRetired && lot.retiredDate
        ? new Date(lot.retiredDate + 'T00:00:00').toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })
        : '';

    return (
        <div className={`relative mb-3 rounded-2xl border transition-colors ${isRetired ? 'bg-c-surface-2/40 border-c-border border-dashed' : 'bg-c-surface border-c-border hover:bg-c-surface-2 shadow-sm'}`}>
            <div className="flex items-center justify-between p-3">
                <button
                    onClick={() => navigateTo({ name: 'sire-lot-detail', lotId: lot.id })}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${isRetired ? 'bg-c-surface-2 text-c-text-faint border-c-border' : 'bg-c-bg text-c-accent-sky border-c-border'}`}>
                        <Dna size={22} strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className={`text-base font-bold truncate leading-tight ${isRetired ? 'text-c-text-muted' : 'text-c-text'}`}>{sireName}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {isRetired ? (
                                <span className="text-[10px] font-bold text-c-text-faint bg-c-surface-2 px-2 py-0.5 rounded-md uppercase tracking-wide border border-c-border">
                                    Retirado {retiredLabel}
                                </span>
                            ) : (
                                <>
                                    <span className="text-[10px] font-bold text-c-text-muted bg-c-surface-2 px-2 py-0.5 rounded-md uppercase tracking-wide border border-c-border">
                                        {stats.totalFemales} Hembras
                                    </span>
                                    {stats.serviceRate > 0 && (
                                        <span className="text-[10px] font-bold text-c-accent bg-c-accent/10 px-2 py-0.5 rounded-md border border-c-accent/20 flex items-center gap-1">
                                            <Activity size={10} /> {stats.serviceRate.toFixed(0)}% Servidas
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </button>

                <div className="flex items-center gap-1 flex-shrink-0 pl-1">
                    {!isRetired && (
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
                                className="p-2 text-c-text-faint hover:text-c-text hover:bg-c-surface-2 rounded-full transition-colors"
                            >
                                <MoreVertical size={18} />
                            </button>
                            <AnimatePresence>
                                {menuOpen && (
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
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                    <ChevronRight size={18} className="text-c-text-faint" />
                </div>
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
    dragControls: any;
    onDeleteLot: (lot: SireLot) => void;
    onAddSire: (season: BreedingSeason) => void;
    onFinalize: (season: BreedingSeason) => void;
    onSwapLot: (lot: SireLot) => void;
    onRetireLot: (lot: SireLot) => void;
}

// --- TARJETA MAESTRA ---
const SeasonMasterCard = ({ season, seasonLots, navigateTo, onEdit, onDelete, dragControls, onDeleteLot, onAddSire, onFinalize, onSwapLot, onRetireLot }: SeasonMasterCardProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const seasonStats = useSeasonAggregateStats(seasonLots);
    // Machos activos primero; los retirados van al histórico (abajo).
    const activeLots = useMemo(() => seasonLots.filter(l => !l.retiredDate), [seasonLots]);
    const retiredLots = useMemo(() => seasonLots.filter(l => !!l.retiredDate), [seasonLots]);
    
    const startDate = new Date(season.startDate + 'T00:00:00');
    const endDate = new Date(season.endDate + 'T00:00:00');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startT = startDate.getTime(), endT = endDate.getTime(), todayT = today.getTime();
    const DAY = 1000 * 60 * 60 * 24;

    const totalDuration = Math.max(1, Math.ceil((endT - startT) / DAY));
    const elapsed = Math.ceil((todayT - startT) / DAY);
    const daysLeft = Math.max(0, Math.ceil((endT - todayT) / DAY));
    const daysUntilStart = Math.max(0, Math.ceil((startT - todayT) / DAY));
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

    const hasSires = seasonLots.length > 0;

    // --- ESTADO CONSCIENTE DE FECHAS ---
    // Cerrada (finalizada manualmente) > Próxima (aún no inicia) > Por Finalizar
    // (ya pasó su fin pero sigue abierta) > En Curso (dentro de ventana, con
    // machos) > En Espera (dentro de ventana, sin machos).
    const isClosed = season.status === 'Cerrado';
    const isFuture = !isClosed && todayT < startT;
    const isEnded = !isClosed && todayT > endT;
    const needsFinalize = isEnded;                 // "Por Finalizar"
    const isWithinWindow = !isClosed && !isFuture && !isEnded;
    const isRunning = isWithinWindow && hasSires;
    const isOnHold = isWithinWindow && !hasSires;

    let statusConfig;
    if (isClosed) {
        statusConfig = { color: 'text-c-text-faint', bg: 'bg-c-surface-2', border: 'border-c-border-strong', dot: 'bg-c-text-faint', label: 'Finalizada', pulse: false };
    } else if (isFuture) {
        statusConfig = { color: 'text-c-accent-sky', bg: 'bg-c-accent-sky/15', border: 'border-c-accent-sky/30', dot: 'bg-c-accent-sky', label: 'Próxima', pulse: false };
    } else if (needsFinalize) {
        statusConfig = { color: 'text-c-accent-gold', bg: 'bg-c-accent-gold/15', border: 'border-c-accent-gold/30', dot: 'bg-c-accent-gold', label: 'Por Finalizar', pulse: true };
    } else if (isRunning) {
        statusConfig = { color: 'text-c-accent', bg: 'bg-c-accent/15', border: 'border-c-accent/30', dot: 'bg-c-accent', label: 'En Curso', pulse: true };
    } else {
        statusConfig = { color: 'text-c-accent-gold', bg: 'bg-c-accent-gold/15', border: 'border-c-accent-gold/30', dot: 'bg-c-accent-gold', label: 'En Espera', pulse: false };
    }

    return (
        <div
            className="bg-c-surface rounded-[2rem] border border-c-border shadow-lg mb-6 relative group"
        >
            {/* 1. HEADER EXPANDIDO */}
            <div className="p-6 pb-2 relative">
                
                <div className="flex justify-between items-center mb-4">
                    {/* Badge de Estado Dinámico */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${statusConfig.bg} ${statusConfig.border}`}>
                        <span className={`w-2 h-2 rounded-full ${statusConfig.dot} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
                        <span className={`text-[11px] font-extrabold uppercase tracking-wide ${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* Drag Handle */}
                        <div 
                            className="p-2 text-c-text-faint cursor-grab active:cursor-grabbing touch-none hover:text-c-text-strong hover:bg-c-surface-2 rounded-full transition-colors"
                            onPointerDown={(e) => dragControls.start(e)}
                        >
                            <GripVertical size={20} />
                        </div>
                        {/* Menú */}
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-2 text-c-text-faint hover:text-c-text hover:bg-c-surface-2 rounded-full transition-colors"
                            >
                                <MoreVertical size={20} />
                            </button>
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                        className="absolute right-0 mt-1 w-40 bg-c-surface-2 border border-c-border-strong rounded-xl shadow-2xl z-20 overflow-hidden"
                                    >
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-c-text hover:bg-c-surface-3 flex items-center gap-3">
                                            <Edit size={16} /> Editar
                                        </button>
                                        {!isClosed && (
                                            <>
                                                <div className="h-px bg-c-border"></div>
                                                <button onClick={(e) => { e.stopPropagation(); onFinalize(season); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-c-text hover:bg-c-surface-3 flex items-center gap-3">
                                                    <Flag size={16} /> Finalizar temporada
                                                </button>
                                            </>
                                        )}
                                        <div className="h-px bg-c-border"></div>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-brand-red hover:bg-brand-red/10 flex items-center gap-3">
                                            <Trash2 size={16} /> Eliminar
                                        </button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* Título Masivo */}
                <h2 
                    onClick={() => navigateTo({ name: 'breeding-season-detail', seasonId: season.id })}
                    className="text-3xl font-bold text-c-text-strong leading-tight mb-5 cursor-pointer hover:text-c-accent-sky transition-colors tracking-tight"
                >
                    {season.name}
                </h2>

                {/* Línea de Tiempo */}
                <div className="bg-c-surface-2 rounded-2xl p-4 border border-c-border mb-3">
                    <div className="flex justify-between items-end mb-2 text-sm">
                        <div>
                            <p className="text-c-text-faint text-[10px] font-bold uppercase tracking-wider mb-1">Inicio</p>
                            <p className="font-bold text-c-text-strong">{startDate.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-c-text-faint text-[10px] font-bold uppercase tracking-wider mb-1">Fin</p>
                            <p className="font-bold text-c-text-strong">{endDate.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}</p>
                        </div>
                    </div>

                    <div className="h-3 w-full bg-c-surface-3 rounded-full overflow-hidden relative">
                        {/* Barra de Progreso Dinámica */}
                        <div
                            className={`h-full rounded-full ${isRunning ? 'bg-c-accent-sky' : (isOnHold ? 'bg-c-accent-gold' : 'bg-c-border-strong')}`}
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="flex justify-between mt-2 items-center">
                        <p className="text-[10px] text-c-text-faint font-bold uppercase tracking-wide">
                            {isFuture ? 'Pendiente' : (isEnded || isClosed) ? 'Completado' : `${Math.round(progress)}% Completado`}
                        </p>
                        {!isClosed && (
                            <div className={`flex items-center gap-1.5 text-xs font-bold ${needsFinalize ? 'text-c-accent-gold' : isOnHold ? 'text-c-accent-gold' : 'text-c-accent-sky'}`}>
                                <Timer size={12} />
                                <span>
                                    {isFuture ? `Comienza en ${daysUntilStart} d`
                                        : needsFinalize ? 'Terminó — por finalizar'
                                        : isOnHold ? 'Sin machos'
                                        : `${daysLeft} días restantes`}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Medidor de servidas (reemplaza el gráfico decorativo) */}
                {seasonStats.total > 0 && (
                    <div className="bg-c-surface-2 rounded-2xl p-4 border border-c-border">
                        <div className="flex justify-between items-baseline mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-c-text-faint">Servidas</span>
                            <span className="text-sm font-bold text-c-text-strong">
                                {seasonStats.served}<span className="text-c-text-faint font-medium">/{seasonStats.total}</span>
                                <span className="text-c-accent"> · {seasonStats.pct}%</span>
                            </span>
                        </div>
                        <div className="h-2.5 w-full bg-c-surface-3 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-c-accent transition-all" style={{ width: `${seasonStats.pct}%` }} />
                        </div>
                    </div>
                )}
            </div>

            {/* 2. AREA DE SEMENTALES */}
            <div className="px-6 pb-6">
                <div className="flex justify-between items-center mb-3 mt-2">
                    <h3 className="text-xs font-extrabold text-c-text-faint uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} /> Equipo de Monta ({activeLots.length})
                    </h3>
                    {!isClosed && (
                        <button
                            onClick={() => onAddSire(season)}
                            className="flex items-center gap-1 text-xs font-bold text-c-accent-sky bg-c-accent-sky/10 hover:bg-c-accent-sky/20 px-2.5 py-1 rounded-lg transition-colors active:scale-95"
                        >
                            <Plus size={14} /> Agregar macho
                        </button>
                    )}
                </div>

                {seasonLots.length > 0 ? (
                    <div className="space-y-0">
                        {activeLots.map((lot: SireLot) => (
                            <SireRow
                                key={lot.id}
                                lot={lot}
                                navigateTo={navigateTo}
                                onDelete={onDeleteLot}
                                onSwap={onSwapLot}
                                onRetire={onRetireLot}
                            />
                        ))}

                        {retiredLots.length > 0 && (
                            <>
                                <p className="text-[10px] font-bold text-c-text-faint uppercase tracking-widest mt-4 mb-2 px-1">Histórico de machos</p>
                                {retiredLots.map((lot: SireLot) => (
                                    <SireRow
                                        key={lot.id}
                                        lot={lot}
                                        navigateTo={navigateTo}
                                        onDelete={onDeleteLot}
                                        onSwap={onSwapLot}
                                        onRetire={onRetireLot}
                                    />
                                ))}
                            </>
                        )}
                    </div>
                ) : (
                    <div
                        onClick={() => navigateTo({ name: 'breeding-season-detail', seasonId: season.id })}
                        className="py-8 text-center bg-c-surface-2 rounded-2xl border border-c-border border-dashed cursor-pointer hover:bg-c-surface-3 transition-colors"
                    >
                        <Dna size={32} className="text-c-text-faint mx-auto mb-2" />
                        <p className="text-sm font-medium text-c-text-faint">Sin sementales asignados</p>
                        <p className="text-xs text-c-accent-sky font-bold mt-1 uppercase tracking-wide">Toca para añadir</p>
                    </div>
                )}

                {/* CTA visible para finalizar una temporada cuya ventana ya terminó */}
                {needsFinalize && (
                    <button
                        onClick={() => onFinalize(season)}
                        className="mt-4 w-full flex items-center justify-center gap-2 bg-c-accent-gold/15 text-c-accent-gold hover:bg-c-accent-gold/25 font-bold py-3 rounded-xl transition-colors active:scale-[0.99]"
                    >
                        <Flag size={16} /> Finalizar temporada
                    </button>
                )}
            </div>

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

    // Estado local para Reorder
    const [localOrderedSeasons, setLocalOrderedSeasons] = useState(orderedSeasons);
    
    useMemo(() => {
        setLocalOrderedSeasons(orderedSeasons);
    }, [orderedSeasons]);


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

    if (localOrderedSeasons.length === 0) {
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
            <Reorder.Group axis="y" values={localOrderedSeasons} onReorder={setLocalOrderedSeasons} className="space-y-8 px-4 pt-4 pb-32">
                {localOrderedSeasons.map(season => {
                    const lotsForThisSeason = sireLots.filter(lot => lot.seasonId === season.id);
                    
                    return (
                        <Reorder.Item key={season.id} value={season} dragListener={false} dragControls={undefined}>
                             <DraggableSeasonCard
                                season={season}
                                seasonLots={lotsForThisSeason}
                                navigateTo={navigateTo}
                                onEdit={() => onEditSeason(season)}
                                onDelete={() => setDeleteConfirmation(season)}
                                onDeleteLot={(lot: SireLot) => setLotToDelete(lot)}
                                onAddSire={(s: BreedingSeason) => setAddSireForSeason(s)}
                                onFinalize={(s: BreedingSeason) => {
                                    const t = new Date().toISOString().split('T')[0];
                                    // Por defecto, la fecha de fin planificada si ya pasó; si no, hoy.
                                    setFinalizeDate(s.endDate && s.endDate < t ? s.endDate : t);
                                    setFinalizeConfirmation(s);
                                }}
                                onSwapLot={(lot: SireLot) => setSwapForLot(lot)}
                                onRetireLot={(lot: SireLot) => { setRetireDate(new Date().toISOString().split('T')[0]); setRetireForLot(lot); }}
                             />
                        </Reorder.Item>
                    );
                })}
            </Reorder.Group>
            
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

const DraggableSeasonCard = (props: any) => {
    const dragControls = useDragControls();
    return (
        <SeasonMasterCard {...props} dragControls={dragControls} />
    );
};