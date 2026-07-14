import { useState, useMemo } from 'react';
import type { PageState } from '../../types/navigation';
import { useData } from '../../context/DataContext';
import {
    HeartHandshake, Trash2, Edit, Dna, Users, Activity, GripVertical, MoreVertical, ChevronRight,
    Timer, Plus
} from 'lucide-react';
import { BreedingSeason, SireLot } from '../../db/local';
import { formatAnimalDisplay } from '../../utils/formatting';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { Modal } from '../ui/Modal';
import { SireLotForm } from '../forms/SireLotForm';
import { Reorder, useDragControls, useMotionValue, useTransform, motion, AnimatePresence } from 'framer-motion';

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

// --- SUB-COMPONENTE: Fila de Semental (DARK REDESIGN) ---
interface SwipeableSireRowProps {
    lot: SireLot;
    navigateTo: (page: PageState) => void;
    onDelete: (lot: SireLot) => void;
}

const SwipeableSireRow = ({ lot, navigateTo, onDelete }: SwipeableSireRowProps) => {
    const { fathers, animals } = useData();
    const stats = useSireLotStats(lot.id);
    
    const sireName = useMemo(() => {
        const father = fathers.find(f => f.id === lot.sireId);
        if (father) return formatAnimalDisplay(father);
        const animal = animals.find(a => a.id === lot.sireId);
        if (animal) return formatAnimalDisplay(animal).split(' ')[1] || formatAnimalDisplay(animal);
        return 'Semental';
    }, [fathers, animals, lot.sireId]);

    // Swipe Logic
    const x = useMotionValue(0);
    const deleteOpacity = useTransform(x, [-30, -70], [0, 1]); 
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnd = (_: any, info: any) => {
        setIsDragging(false);
        if (info.offset.x < -80) {
            if (navigator.vibrate) navigator.vibrate(50);
            onDelete(lot);
        }
    };

    return (
        <div className="relative mb-3 overflow-hidden h-[80px]"> 
            {/* Fondo Rojo de Eliminación */}
            <motion.div
                style={{ opacity: deleteOpacity }}
                className="absolute inset-0 bg-brand-red/15 rounded-2xl flex items-center justify-end pr-6 pointer-events-none z-0 border border-brand-red/30"
            >
                <Trash2 size={24} className="text-brand-red" />
            </motion.div>

            {/* Tarjeta Deslizable (Frente) */}
            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0.4, right: 0 }}
                dragDirectionLock={true}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={handleDragEnd}
                style={{ x, touchAction: "pan-y" }}
                className="absolute inset-0 bg-c-surface border border-c-border rounded-2xl p-3 flex items-center justify-between z-10 cursor-pointer active:cursor-grabbing hover:bg-c-surface-2 transition-colors shadow-sm"
                onClick={() => !isDragging && navigateTo({ name: 'sire-lot-detail', lotId: lot.id })}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar Grande */}
                    <div className="w-12 h-12 rounded-xl bg-c-bg flex items-center justify-center text-c-accent-sky border border-c-border flex-shrink-0">
                        <Dna size={24} strokeWidth={2} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-c-text truncate leading-tight">{sireName}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-c-text-muted bg-c-surface-2 px-2 py-0.5 rounded-md uppercase tracking-wide border border-c-border">
                                {stats.totalFemales} Hembras
                            </span>
                            {stats.serviceRate > 0 && (
                                <span className="text-[10px] font-bold text-c-accent bg-c-accent/10 px-2 py-0.5 rounded-md border border-c-accent/20 flex items-center gap-1">
                                    <Activity size={10} /> {stats.serviceRate.toFixed(0)}% Servidas
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="pl-2 flex flex-col items-end justify-center">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${stats.serviceRate >= 100 ? 'bg-c-accent/10 text-c-accent' : 'bg-c-surface-2 text-c-text-faint'}`}>
                        <ChevronRight size={18} />
                    </div>
                </div>
            </motion.div>
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
}

// --- TARJETA MAESTRA ---
const SeasonMasterCard = ({ season, seasonLots, navigateTo, onEdit, onDelete, dragControls, onDeleteLot, onAddSire }: SeasonMasterCardProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const seasonStats = useSeasonAggregateStats(seasonLots);
    
    const startDate = new Date(season.startDate + 'T00:00:00');
    const endDate = new Date(season.endDate + 'T00:00:00');
    
    const totalDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const today = new Date();
    const elapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUntilStart = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, totalDuration - elapsed);
    const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
    
    const isActiveStatus = season.status === 'Activo';
    const hasSires = seasonLots.length > 0;
    
    // --- LÓGICA DE ESTADO REFINADA ---
    const isRunning = isActiveStatus && hasSires;
    const isOnHold = isActiveStatus && !hasSires;
    const isFuture = daysUntilStart > 0;
    
    // Configuración Visual del Badge (tokens de tema, legible en claro y oscuro)
    let statusConfig;
    if (isRunning) {
        statusConfig = { color: 'text-c-accent', bg: 'bg-c-accent/15', border: 'border-c-accent/30', dot: 'bg-c-accent', label: 'En Curso', pulse: true };
    } else if (isOnHold) {
        statusConfig = { color: 'text-c-accent-gold', bg: 'bg-c-accent-gold/15', border: 'border-c-accent-gold/30', dot: 'bg-c-accent-gold', label: 'En Espera', pulse: false };
    } else if (isFuture) {
        statusConfig = { color: 'text-c-accent-sky', bg: 'bg-c-accent-sky/15', border: 'border-c-accent-sky/30', dot: 'bg-c-accent-sky', label: 'Próxima', pulse: false };
    } else {
        statusConfig = { color: 'text-c-text-faint', bg: 'bg-c-surface-2', border: 'border-c-border-strong', dot: 'bg-c-text-faint', label: 'Finalizada', pulse: false };
    }

    return (
        <div 
            className="bg-c-surface rounded-[2rem] overflow-hidden border border-c-border shadow-lg mb-6 relative group"
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
                            {isActiveStatus ? `${Math.round(progress)}% Completado` : (isFuture ? 'Pendiente' : 'Finalizado')}
                        </p>
                        {isActiveStatus && (
                            <div className={`flex items-center gap-1.5 text-xs font-bold ${isOnHold ? 'text-c-accent-gold' : 'text-c-accent-sky'}`}>
                                <Timer size={12} />
                                <span>{isOnHold ? 'Sin actividad' : `${daysLeft} días restantes`}</span>
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
                        <Users size={14} /> Equipo de Monta ({seasonLots.length})
                    </h3>
                    {isActiveStatus && (
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
                        {seasonLots.map((lot: SireLot) => (
                            <SwipeableSireRow 
                                key={lot.id} 
                                lot={lot} 
                                navigateTo={navigateTo} 
                                onDelete={onDeleteLot}
                            />
                        ))}
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
    const { breedingSeasons, sireLots, deleteBreedingSeason, deleteSireLot, addSireLot } = useData();
    const [deleteConfirmation, setDeleteConfirmation] = useState<BreedingSeason | null>(null);
    const [lotToDelete, setLotToDelete] = useState<SireLot | null>(null);
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

            const getPriority = (season: BreedingSeason, hasSires: boolean, start: number) => {
                if (season.status === 'Activo') {
                    return hasSires ? 0 : 1;
                }
                if (start > now) return 2; 
                return 3; 
            };

            const priorityA = getPriority(a, hasSiresA, startA);
            const priorityB = getPriority(b, hasSiresB, startB);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            if (priorityA <= 1) { 
                return endA - endB; 
            }
            if (priorityA === 2) { 
                return startA - startB; 
            }
            
            return endB - endA;
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

            <Modal isOpen={!!addSireForSeason} onClose={() => setAddSireForSeason(null)} title="Agregar macho a la temporada">
                {addSireForSeason && (
                    <SireLotForm
                        seasonId={addSireForSeason.id}
                        onSave={handleAddSire}
                        onCancel={() => setAddSireForSeason(null)}
                    />
                )}
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