import { useState, useMemo } from 'react';
import type { PageState } from '../../types/navigation';
import { useData } from '../../context/DataContext';
import { 
    HeartHandshake, Trash2, Edit, Dna, Users, Activity, GripVertical, MoreVertical, ChevronRight,
    Timer
} from 'lucide-react';
import { BreedingSeason, SireLot } from '../../db/local';
import { formatAnimalDisplay } from '../../utils/formatting';
import { ConfirmationModal } from '../ui/ConfirmationModal';
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

// --- HELPER: Mapa de Calor ---
const useSeasonHeatmap = (season: BreedingSeason, seasonLots: SireLot[]) => {
    const { serviceRecords } = useData();
    return useMemo(() => {
        if (!season.startDate || !season.endDate) return [];
        const start = new Date(season.startDate).getTime();
        const end = new Date(season.endDate).getTime();
        const duration = end - start;
        const lotIds = new Set(seasonLots.map(l => l.id));

        const seasonServices = serviceRecords.filter(sr => 
            lotIds.has(sr.sireLotId) && 
            new Date(sr.serviceDate).getTime() >= start && 
            new Date(sr.serviceDate).getTime() <= end
        );

        if (seasonServices.length === 0) return []; 

        const buckets = new Array(20).fill(0); 
        const bucketSize = duration / 20;

        seasonServices.forEach(sr => {
            const time = new Date(sr.serviceDate).getTime();
            const bucketIndex = Math.min(Math.floor((time - start) / bucketSize), 19);
            buckets[bucketIndex]++;
        });
        const max = Math.max(...buckets);
        return buckets.map(v => (max > 0 ? (v / max) * 100 : 0));
    }, [season, seasonLots, serviceRecords]);
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
                className="absolute inset-0 bg-red-900/20 rounded-2xl flex items-center justify-end pr-6 pointer-events-none z-0 border border-red-900/30"
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
                className="absolute inset-0 bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex items-center justify-between z-10 cursor-pointer active:cursor-grabbing hover:bg-zinc-800 transition-colors shadow-sm"
                onClick={() => !isDragging && navigateTo({ name: 'sire-lot-detail', lotId: lot.id })}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Avatar Grande */}
                    <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-brand-blue border border-zinc-800 flex-shrink-0">
                        <Dna size={24} strokeWidth={2} />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                        <p className="text-base font-bold text-white truncate leading-tight">{sireName}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded-md uppercase tracking-wide border border-zinc-800">
                                {stats.totalFemales} Hembras
                            </span>
                            {stats.serviceRate > 0 && (
                                <span className="text-[10px] font-bold text-green-400 bg-green-900/20 px-2 py-0.5 rounded-md border border-green-900/30 flex items-center gap-1">
                                    <Activity size={10} /> {stats.serviceRate.toFixed(0)}% Servidas
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="pl-2 flex flex-col items-end justify-center">
                     <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${stats.serviceRate >= 100 ? 'bg-green-500/10 text-brand-green' : 'bg-zinc-800 text-zinc-600'}`}>
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
}

// --- TARJETA MAESTRA (DARK MODE REFINED) ---
const SeasonMasterCard = ({ season, seasonLots, navigateTo, onEdit, onDelete, dragControls, onDeleteLot }: SeasonMasterCardProps) => {
    const [showMenu, setShowMenu] = useState(false);
    
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
    
    const heatmapData = useSeasonHeatmap(season, seasonLots);
    const hasActivity = heatmapData.some(v => v > 0);

    // Configuración Visual del Badge
    let statusConfig;
    if (isRunning) {
        statusConfig = { color: 'text-green-400', bg: 'bg-green-900/20', border: 'border-green-500/30', dot: 'bg-green-500', label: 'En Curso', pulse: true };
    } else if (isOnHold) {
        statusConfig = { color: 'text-yellow-400', bg: 'bg-yellow-900/20', border: 'border-yellow-500/30', dot: 'bg-yellow-500', label: 'En Espera', pulse: false };
    } else if (isFuture) {
        statusConfig = { color: 'text-brand-blue', bg: 'bg-blue-900/20', border: 'border-blue-500/30', dot: 'bg-brand-blue', label: 'Próxima', pulse: false };
    } else {
        statusConfig = { color: 'text-zinc-500', bg: 'bg-zinc-800', border: 'border-zinc-700', dot: 'bg-zinc-600', label: 'Finalizada', pulse: false };
    }

    return (
        <div 
            className="bg-[#1c1c1e] rounded-[2rem] overflow-hidden border border-zinc-800 shadow-lg mb-6 relative group"
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
                            className="p-2 text-zinc-600 cursor-grab active:cursor-grabbing touch-none hover:text-zinc-300 hover:bg-zinc-800 rounded-full transition-colors"
                            onPointerDown={(e) => dragControls.start(e)}
                        >
                            <GripVertical size={20} />
                        </div>
                        {/* Menú */}
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-2 text-zinc-600 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <MoreVertical size={20} />
                            </button>
                            <AnimatePresence>
                                {showMenu && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                                        className="absolute right-0 mt-1 w-40 bg-[#2C2C2E] border border-zinc-700 rounded-xl shadow-2xl z-20 overflow-hidden"
                                    >
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-700 flex items-center gap-3">
                                            <Edit size={16} /> Editar
                                        </button>
                                        <div className="h-px bg-zinc-700"></div>
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(); setShowMenu(false); }} className="w-full text-left px-4 py-3 text-sm font-semibold text-red-400 hover:bg-red-900/30 flex items-center gap-3">
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
                    className="text-3xl font-bold text-white leading-tight mb-5 cursor-pointer hover:text-brand-purple transition-colors tracking-tight"
                >
                    {season.name}
                </h2>

                {/* Línea de Tiempo */}
                <div className="bg-black/30 rounded-2xl p-4 border border-zinc-800/50 mb-3">
                    <div className="flex justify-between items-end mb-2 text-sm">
                        <div>
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Inicio</p>
                            <p className="font-bold text-zinc-300">{startDate.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-1">Fin</p>
                            <p className="font-bold text-zinc-300">{endDate.toLocaleDateString('es-VE', { day: 'numeric', month: 'short' })}</p>
                        </div>
                    </div>
                    
                    <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden relative">
                        {/* Barra de Progreso Dinámica */}
                        <div 
                            className={`h-full rounded-full ${isRunning ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : (isOnHold ? 'bg-yellow-600' : 'bg-zinc-700')}`} 
                            style={{ width: `${progress}%` }} 
                        />
                    </div>
                    
                    <div className="flex justify-between mt-2 items-center">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wide">
                            {isActiveStatus ? `${Math.round(progress)}% Completado` : (isFuture ? 'Pendiente' : 'Finalizado')}
                        </p>
                        {isActiveStatus && (
                            <div className={`flex items-center gap-1.5 text-xs font-bold ${isOnHold ? 'text-yellow-500' : 'text-brand-blue'}`}>
                                <Timer size={12} />
                                <span>{isOnHold ? 'Sin actividad' : `${daysLeft} días restantes`}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. AREA DE SEMENTALES */}
            <div className="px-6 pb-6">
                <div className="flex justify-between items-center mb-3 mt-2">
                    <h3 className="text-xs font-extrabold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                        <Users size={14} /> Equipo de Monta ({seasonLots.length})
                    </h3>
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
                        className="py-8 text-center bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed cursor-pointer hover:bg-zinc-800 transition-colors"
                    >
                        <Dna size={32} className="text-zinc-700 mx-auto mb-2" />
                        <p className="text-sm font-medium text-zinc-500">Sin sementales asignados</p>
                        <p className="text-xs text-brand-blue font-bold mt-1 uppercase tracking-wide">Toca para añadir</p>
                    </div>
                )}
            </div>

            {/* 3. MAPA DE CALOR (Footer Sutil) */}
            {hasActivity && (
                <div className="relative h-14 w-full bg-gradient-to-t from-pink-900/10 to-transparent border-t border-zinc-800/50">
                     <div className="absolute left-6 top-3 flex items-center gap-2">
                        <Activity size={12} className="text-pink-500" />
                        <span className="text-[9px] font-bold text-pink-500/70 uppercase tracking-widest">
                            Actividad Reciente
                        </span>
                     </div>
                     <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-2 h-full opacity-60 pb-1">
                        {heatmapData.map((val, idx) => (
                            <div 
                                key={idx} 
                                className="w-full mx-[2px] bg-pink-500 rounded-t-sm transition-all"
                                style={{ height: `${Math.max(val, 5)}%`, opacity: val > 0 ? 0.6 : 0.1 }}
                            />
                        ))}
                     </div>
                </div>
            )}
        </div>
    );
};

// --- COMPONENTE PRINCIPAL (LÓGICA DE ORDENAMIENTO MEJORADA) ---
interface BreedingLotsViewProps {
    navigateTo: (page: PageState) => void;
    onEditSeason: (season: BreedingSeason) => void;
}

export default function BreedingLotsView({ navigateTo, onEditSeason }: BreedingLotsViewProps) {
    const { breedingSeasons, sireLots, deleteBreedingSeason, deleteSireLot } = useData();
    const [deleteConfirmation, setDeleteConfirmation] = useState<BreedingSeason | null>(null);
    const [lotToDelete, setLotToDelete] = useState<SireLot | null>(null);

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
             <div className="text-center py-20 px-6 mx-4 mt-6 bg-[#1c1c1e] rounded-[2.5rem] border border-zinc-800 border-dashed flex flex-col items-center gap-6">
                <div className="bg-zinc-900 p-6 rounded-full text-zinc-600 shadow-inner">
                    <HeartHandshake size={56} strokeWidth={1} />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-white mb-2">Sin Temporadas Activas</h3>
                    <p className="text-base text-zinc-500 max-w-[240px] mx-auto leading-relaxed">
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
        </>
    );
};

const DraggableSeasonCard = (props: any) => {
    const dragControls = useDragControls();
    return (
        <SeasonMasterCard {...props} dragControls={dragControls} />
    );
};