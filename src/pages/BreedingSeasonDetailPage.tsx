import { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { ArrowLeft, Plus, Users, ChevronRight, Edit, Trash2, GripVertical, AlertTriangle, PackageOpen, MoveRight } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { SireLotForm } from '../components/forms/SireLotForm';
import { GiGoat } from 'react-icons/gi';
import type { PageState } from '../types/navigation';
import { Reorder, motion, useAnimation, PanInfo, useDragControls } from 'framer-motion';
import { ConfirmationModal } from '../components/ui/ConfirmationModal';
import { TransferFemalesModal } from '../components/modals/TransferFemalesModal';
import { Animal } from '../db/local';
import { formatAnimalDisplay } from '../utils/formatting';

// --- SUB-COMPONENTES (Sin cambios) ---

const SireLotCardContent = ({ sireName, animalCount, dragControls }: { sireName: string, animalCount: number, dragControls: any }) => (
    <div className="w-full p-4 flex items-center">
        <div className="pl-2 pr-4 cursor-grab touch-none self-stretch flex items-center" onPointerDown={(e) => dragControls.start(e)}>
            <GripVertical className="text-zinc-500" />
        </div>
        <div className="flex-grow">
            <p className="font-bold text-lg text-white flex items-center gap-2">
                <GiGoat /> Lote: {sireName}
            </p>
            <p className="text-sm text-zinc-400 mt-1 flex items-center gap-2">
                <Users size={14} /> {animalCount} {animalCount === 1 ? 'hembra asignada' : 'hembras asignadas'}
            </p>
        </div>
        <ChevronRight className="text-zinc-600" />
    </div>
);

const SwipeableSireLotCard = ({ lot, onEdit, onDelete, onClick, dragControls }: { lot: any, onEdit: () => void, onDelete: () => void, onClick: () => void, dragControls: any }) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 160;

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        if (Math.abs(offset) < 2 && Math.abs(velocity) < 100) {
             // Es un clic
        } else if (offset < -buttonsWidth / 2 || velocity < -500) {
            swipeControls.start({ x: -buttonsWidth }); // Mostrar botones
        } else {
            swipeControls.start({ x: 0 }); // Ocultar
        }
        setTimeout(() => { dragStarted.current = false; }, 100);
    };

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <button onClick={onEdit} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Edit size={22} /><span className="text-xs mt-1 font-semibold">Editar</span>
                </button>
                <button onClick={onDelete} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-red text-white">
                    <Trash2 size={22} /><span className="text-xs mt-1 font-semibold">Eliminar</span>
                </button>
            </div>
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) { onClick(); } }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg"
            >
                <SireLotCardContent sireName={lot.sireName} animalCount={lot.animalCount} dragControls={dragControls} />
            </motion.div>
        </div>
    );
};

const ReorderableSireLotItem = ({ lot, navigateTo, onEdit, onDelete }: { lot: any, navigateTo: (page: PageState) => void, onEdit: (lot: any) => void, onDelete: (lot: any) => void }) => {
    const dragControls = useDragControls();
    return (
        <Reorder.Item key={lot.id} value={lot} dragListener={false} dragControls={dragControls}>
            <SwipeableSireLotCard
                lot={lot}
                dragControls={dragControls}
                onClick={() => navigateTo({ name: 'sire-lot-detail', lotId: lot.id })}
                onEdit={() => onEdit(lot)}
                onDelete={() => onDelete(lot)}
            />
        </Reorder.Item>
    );
};

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---

// --- INICIO CORRECCIÓN DE ADVERTENCIA ---
// 1. Eliminar 'scrollContainerRef' de los props
interface BreedingSeasonDetailPageProps {
    seasonId: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
    // scrollContainerRef: React.RefObject<HTMLDivElement>; <-- ELIMINADO
}

export default function BreedingSeasonDetailPage({ 
    seasonId, 
    onBack, 
    navigateTo,
    // scrollContainerRef <-- ELIMINADO
}: BreedingSeasonDetailPageProps) {
// --- FIN CORRECCIÓN DE ADVERTENCIA ---

    const { breedingSeasons, sireLots, fathers, animals, serviceRecords, addSireLot, updateSireLot, deleteSireLot, updateAnimal } = useData();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingLot, setEditingLot] = useState<any | undefined>(undefined);
    const [deleteConfirmation, setDeleteConfirmation] = useState<any | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [transferError, setTransferError] = useState<string | null>(null);

    // (Lógica de Memos y Handlers sin cambios)
    const season = useMemo(() => breedingSeasons.find(s => s.id === seasonId), [breedingSeasons, seasonId]);
    
    const lotsForSeason = useMemo(() => {
        return sireLots
            .filter(lot => lot.seasonId === seasonId)
            .map(lot => {
                const sire = fathers.find(f => f.id === lot.sireId);
                const sireName = sire ? formatAnimalDisplay(sire) : 'Desconocido';
                const animalCount = animals.filter(a => a.sireLotId === lot.id).length;
                return { ...lot, sireName, animalCount, sireId: lot.sireId };
            });
    }, [sireLots, seasonId, fathers, animals]);

    const [orderedLots, setOrderedLots] = useState(lotsForSeason);
    useEffect(() => { setOrderedLots(lotsForSeason) }, [lotsForSeason]);

    const unservicedFemales = useMemo(() => {
        if (!season || season.status !== 'Cerrado') return [];
        
        const lotIdsInSeason = new Set(lotsForSeason.map(l => l.id));
        const femalesInSeason = animals.filter((a: Animal) => a.sireLotId && lotIdsInSeason.has(a.sireLotId));
        
        const femalesWithService = new Set(
            serviceRecords
                .filter(sr => sr.sireLotId && lotIdsInSeason.has(sr.sireLotId))
                .map(sr => sr.femaleId)
        );
        
        return femalesInSeason.filter((animal: Animal) => !femalesWithService.has(animal.id));
    }, [season, lotsForSeason, animals, serviceRecords]);

    const handleOpenModal = (lot?: any) => { setEditingLot(lot); setModalOpen(true); };
    const handleSaveSireLot = async (sireId: string) => { 
        if (editingLot) { 
            await updateSireLot(editingLot.id, { sireId }); 
        } else { 
            await addSireLot({ seasonId, sireId }); 
        } 
        setModalOpen(false); setEditingLot(undefined); 
    };
    const handleDeleteAttempt = (lot: any) => { if (lot.animalCount > 0) { setDeleteError(`No se puede eliminar. Reasigna las ${lot.animalCount} hembra(s) a otro lote primero.`); } else { setDeleteConfirmation(lot); } };
    const handleDeleteConfirm = () => { if (deleteConfirmation) { deleteSireLot(deleteConfirmation.id); setDeleteConfirmation(null); } };
    
    const handleConfirmTransfer = async (destinationSeasonId: string, femaleIds: string[]) => {
        setTransferError(null);
        const firstLotOfDestination = sireLots.find(l => l.seasonId === destinationSeasonId);
        
        if (!firstLotOfDestination) {
            setTransferError("La temporada de destino no tiene lotes de reproductor. Por favor, crea uno primero.");
            setIsTransferModalOpen(false);
            return;
        }

        const updatePromises = femaleIds.map(id => 
            updateAnimal(id, { sireLotId: firstLotOfDestination.id, reproductiveStatus: 'En Servicio' })
        );
        await Promise.all(updatePromises);
        setIsTransferModalOpen(false);
    };


    if (!season) { return ( <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Temporada no encontrada.</h1><button onClick={onBack} className="mt-4 text-brand-orange">Volver</button></div> ); }

    return (
        <>
            {/* Layout (sin 'scrollContainerRef') */}
            <div className="w-full max-w-2xl mx-auto animate-fade-in">
                
                {/* Header (se mantiene 'sticky') */}
                <header className="flex items-center pt-4 pb-4 px-4 sticky top-0 bg-brand-dark z-10 border-b border-brand-border">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow"><h1 className="text-3xl font-bold tracking-tight text-white">{season.name}</h1><p className="text-lg text-zinc-400">Detalle de la Temporada</p></div>
                    <div className="w-8"></div>
                </header>
                
                {/* Sección Lotes (se mantiene 'sticky') */}
                <div className="sticky top-[97px] z-10 bg-brand-dark px-4 pt-6 pb-4 border-b border-brand-border/50">
                     <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-zinc-300">Lotes de Reproductor</h2>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm">
                            <Plus size={16} /> Añadir Lote
                        </button>
                    </div>
                </div>
                
                <div className="space-y-4 px-4 pt-4">
                    {orderedLots.length > 0 ? (
                        <Reorder.Group as="div" axis="y" values={orderedLots} onReorder={setOrderedLots} className="space-y-3">
                            {orderedLots.map(lot => ( <ReorderableSireLotItem key={lot.id} lot={lot} navigateTo={navigateTo} onEdit={handleOpenModal} onDelete={handleDeleteAttempt} /> ))}
                        </Reorder.Group>
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl"><p className="text-zinc-500">Esta temporada aún no tiene lotes de reproductor.</p></div>
                    )}
                </div>


                {/* Sección Hembras sin Servicio (se mantiene) */}
                {season.status === 'Cerrado' && (
                    <div className="space-y-4 px-4 pt-10">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold text-zinc-300">Resultados: Hembras sin Servicio</h2>
                            {unservicedFemales.length > 0 && (
                                <button onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-2 bg-brand-blue hover:bg-blue-600 text-white font-bold py-2 px-3 rounded-lg text-sm">
                                    <MoveRight size={16} /> Transferir
                                </button>
                            )}
                        </div>
                        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border space-y-2">
                            {unservicedFemales.length > 0 ? (
                                unservicedFemales.map((animal: Animal) => (
                                    <div key={animal.id} className="flex items-center justify-between p-2 bg-black/20 rounded-md">
                                        <span className="font-semibold text-white">{formatAnimalDisplay(animal)}</span>
                                        <span className="text-xs text-zinc-400">Lote Físico: {animal.location || 'N/A'}</span>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6 flex flex-col items-center gap-2">
                                    <PackageOpen size={32} className="text-zinc-600" />
                                    <p className="text-zinc-400 font-semibold">Todas las hembras tuvieron servicio en esta temporada.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* --- Modales (Sin cambios) --- */}
            <Modal isOpen={isModalOpen} onClose={() => { setModalOpen(false); setEditingLot(undefined); }} title={editingLot ? `Editar Lote de ${editingLot.sireName}` : "Añadir Lote de Reproductor"}>
                <SireLotForm 
                    onSave={handleSaveSireLot} 
                    onCancel={() => { setModalOpen(false); setEditingLot(undefined); }} 
                    editingLot={editingLot} 
                    seasonId={season.id} 
                />
            </Modal>
            <ConfirmationModal isOpen={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)} onConfirm={handleDeleteConfirm} title={`Eliminar Lote de ${deleteConfirmation?.sireName}`} message="¿Estás seguro de que quieres eliminar este lote? Esta acción es irreversible." />
            <Modal isOpen={!!deleteError} onClose={() => setDeleteError(null)} title="Acción no permitida">
                <div className="space-y-4 text-center"> <AlertTriangle size={40} className="mx-auto text-amber-400" /> <p className="text-zinc-300">{deleteError}</p> <button onClick={() => setDeleteError(null)} className="mt-4 bg-brand-orange text-white font-semibold py-2 px-6 rounded-lg">Entendido</button> </div>
            </Modal>
             <Modal isOpen={!!transferError} onClose={() => setTransferError(null)} title="Error de Transferencia">
                <div className="space-y-4 text-center"> <AlertTriangle size={40} className="mx-auto text-amber-400" /> <p className="text-zinc-300">{transferError}</p> <button onClick={() => setTransferError(null)} className="mt-4 bg-brand-orange text-white font-semibold py-2 px-6 rounded-lg">Entendido</button> </div>
            </Modal>
            <TransferFemalesModal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                femalesToTransfer={unservicedFemales.map(a => a.id)}
                originSeasonId={season.id}
                onConfirmTransfer={handleConfirmTransfer}
            />
        </>
    );
}