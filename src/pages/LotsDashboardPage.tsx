import { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { PageState } from './RebanoShell';
import { ChevronRight, Users, Zap, Plus, AlertTriangle, Trash2, Edit, Move, ClipboardList, TestTube, GripVertical } from 'lucide-react';
import { BreedingGroup } from '../db/local';
import { AddBreedingGroupModal } from '../components/ui/AddBreedingGroupModal';
import { AddLotModal } from '../components/ui/AddLotModal';
import { useBreedingAnalysis } from '../hooks/useBreedingAnalysis';
import { Reorder, motion, useAnimation, PanInfo, useDragControls } from 'framer-motion';
import { ActionSheetModal, ActionSheetAction } from '../components/ui/ActionSheetModal';
import { Modal } from '../components/ui/Modal';

// --- Modal de Confirmación ---
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <p className="text-zinc-300">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">
                        Confirmar
                    </button>
                </div>
            </div>
        </Modal>
    );
};


// --- Tarjeta de Lote Físico (con "Drag Handle") ---
const LotCard = ({ lotName, count, dragControls }: { lotName: string, count: number, dragControls: any }) => (
    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center">
        <div 
            className="p-2 cursor-grab touch-none"
            onPointerDown={(e) => dragControls.start(e)}
        >
            <GripVertical className="text-zinc-500" />
        </div>
        <div className="flex-grow ml-2">
            <p className="font-bold text-lg text-white">{lotName}</p>
            <p className="text-sm text-zinc-400">{count} {count === 1 ? 'animal' : 'animales'}</p>
        </div>
        <div className="flex items-center gap-4">
            <span className="bg-blue-600/80 text-white font-bold text-lg rounded-lg px-3 py-1">{count}</span>
            <ChevronRight className="text-zinc-600" />
        </div>
    </div>
);

// --- Componente Envoltorio para Gestos de Deslizar ---
const SwipeableLotCard = ({ 
    lot, 
    onEdit, 
    onDelete, 
    onClick, 
    dragControls 
}: { 
    lot: { id: string, name: string, count: number }, 
    onEdit: () => void, 
    onDelete: () => void, 
    onClick: () => void, 
    dragControls: any 
}) => {
    const swipeControls = useAnimation();
    const [isSwiped, setIsSwiped] = useState(false);

    const showEdit = lot.count > 0;
    const showDelete = lot.name !== 'Sin Asignar';
    const buttonsWidth = (showEdit ? 70 : 0) + (showDelete ? 70 : 0);
    const dragThreshold = -buttonsWidth / 2;

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (info.offset.x < dragThreshold) {
            swipeControls.start({ x: -buttonsWidth });
            setIsSwiped(true);
        } else {
            swipeControls.start({ x: 0 });
            setIsSwiped(false);
        }
    };

    const handleActionClick = (e: React.PointerEvent, action: 'edit' | 'delete') => {
        e.stopPropagation();
        swipeControls.start({ x: 0 });
        setIsSwiped(false);
        
        setTimeout(() => {
            if (action === 'edit') onEdit();
            if (action === 'delete') onDelete();
        }, 150);
    };

    return (
        <div className="relative w-full overflow-hidden rounded-2xl">
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                {showEdit && (
                    <button
                        onPointerDown={(e) => handleActionClick(e, 'edit')}
                        className="h-full w-[70px] flex flex-col items-center justify-center bg-brand-orange text-white"
                    >
                        <Edit size={22} />
                        <span className="text-xs mt-1">Editar</span>
                    </button>
                )}
                {showDelete && (
                    <button
                        onPointerDown={(e) => handleActionClick(e, 'delete')}
                        className="h-full w-[70px] flex flex-col items-center justify-center bg-brand-red text-white"
                    >
                        <Trash2 size={22} />
                        <span className="text-xs mt-1">Borrar</span>
                    </button>
                )}
            </div>
            
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragEnd={onDragEnd}
                onClick={() => {
                    if (!isSwiped) {
                        onClick();
                    } else {
                        swipeControls.start({ x: 0 });
                        setIsSwiped(false);
                    }
                }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="relative bg-gray-900 w-full z-10 cursor-pointer"
            >
                <LotCard lotName={lot.name} count={lot.count} dragControls={dragControls} />
            </motion.div>
        </div>
    );
};

const ReorderableLotItem = ({ lot, navigateTo, onEdit, onDelete }: { lot: { id: string, name: string, count: number }, navigateTo: (page: PageState) => void, onEdit: (lot: any) => void, onDelete: (lot: any) => void }) => {
    const dragControls = useDragControls();
    return (
        <Reorder.Item 
            key={lot.id} 
            value={lot}
            dragListener={false}
            dragControls={dragControls}
        >
            <SwipeableLotCard
                lot={lot}
                dragControls={dragControls}
                onClick={() => navigateTo({ name: 'lot-detail', lotName: lot.name })}
                onEdit={() => onEdit(lot)}
                onDelete={() => onDelete(lot)}
            />
        </Reorder.Item>
    );
};

const BreedingGroupCard = ({ group, animalCount, hasAlert, onClick }: { group: BreedingGroup, animalCount: number, hasAlert: boolean, onClick: () => void }) => {
    const alertClasses = hasAlert 
        ? 'border-red-500/80 ring-2 ring-red-500/60 shadow-lg shadow-red-900/50' 
        : 'border-brand-border';
    return (
        <button onClick={onClick} className={`w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border flex justify-between items-center hover:border-brand-amber transition-all ${alertClasses}`}>
            <div>
                <p className="font-bold text-lg text-white flex items-center gap-2">
                    {group.name}
                    {hasAlert && <AlertTriangle className="text-red-400" size={16} />}
                </p>
                <p className="text-sm text-zinc-400">
                    Semental: {group.sireId} | {animalCount} {animalCount === 1 ? 'hembra' : 'hembras'}
                </p>
            </div>
            <div className="flex items-center gap-4">
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${group.status === 'Activo' ? 'bg-green-500/80 text-white' : 'bg-zinc-600 text-zinc-300'}`}>
                    {group.status}
                </span>
                <ChevronRight className="text-zinc-600" />
            </div>
        </button>
    );
};

interface LotsDashboardPageProps {
    navigateTo: (page: PageState) => void;
}

const PhysicalLotsView = ({ navigateTo }: LotsDashboardPageProps) => {
    const { animals, lots, deleteLot } = useData();
    const [isActionSheetOpen, setActionSheetOpen] = useState(false);
    const [selectedLot, setSelectedLot] = useState<{ id: string, name: string } | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<{ id: string, name: string } | null>(null);

    const lotsSummary = useMemo(() => {
        const countsByLocation = animals.reduce((acc, animal) => { const location = animal.location || 'Sin Asignar'; acc[location] = (acc[location] || 0) + 1; return acc; }, {} as Record<string, number>);
        const allLotNames = new Set([...lots.map(l => l.name), ...Object.keys(countsByLocation)]);
        return Array.from(allLotNames).map(lotName => ({ id: lotName, name: lotName, count: countsByLocation[lotName] || 0, })).sort((a, b) => b.count - a.count);
    }, [animals, lots]);

    const [orderedLots, setOrderedLots] = useState(lotsSummary);
    useEffect(() => { setOrderedLots(lotsSummary); }, [lotsSummary]);

    const lotActions: ActionSheetAction[] = [
        { label: "Mover Animales", icon: Move, onClick: () => navigateTo({ name: 'lot-detail', lotName: selectedLot?.name || '' }) },
        { label: "Asignar Alimentación", icon: ClipboardList, onClick: () => navigateTo({ name: 'feeding-plan', lotName: selectedLot?.name || '' }) },
        { label: "Asignar Tratamiento", icon: TestTube, onClick: () => navigateTo({ name: 'batch-treatment', lotName: selectedLot?.name || '' }) },
        { label: "Convertir en Lote de Monta", icon: Zap, onClick: () => alert(`FUNCIONALIDAD FUTURA: Convertir ${selectedLot?.name} en Lote de Monta`) },
    ];
    
    const handleDelete = () => {
        if (!deleteConfirmation) return;
        const lotToDelete = lots.find(l => l.name === deleteConfirmation.name);
        if (lotToDelete) {
            deleteLot(lotToDelete.id);
        }
    };

    return (
        <>
            <div className="animate-fade-in">
                <Reorder.Group axis="y" values={orderedLots} onReorder={setOrderedLots} className="space-y-2">
                    {orderedLots.map((lot) => (
                        <ReorderableLotItem
                            key={lot.id}
                            lot={lot}
                            navigateTo={navigateTo}
                            onEdit={(lotToEdit) => {
                                setSelectedLot(lotToEdit);
                                setActionSheetOpen(true);
                            }}
                            onDelete={(lotToDelete) => setDeleteConfirmation(lotToDelete)}
                        />
                    ))}
                </Reorder.Group>
            </div>
            <ActionSheetModal
                isOpen={isActionSheetOpen}
                onClose={() => setActionSheetOpen(false)}
                title={`Acciones para "${selectedLot?.name}"`}
                actions={lotActions}
            />
            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDelete}
                title={`Eliminar Lote`}
                message={`¿Estás seguro de que quieres eliminar el lote "${deleteConfirmation?.name}"? Esta acción no se puede deshacer.`}
            />
        </>
    );
};

const BreedingLotsView = ({ navigateTo }: LotsDashboardPageProps) => {
    const { breedingGroups, animals } = useData();
    const [isModalOpen, setModalOpen] = useState(false);
    const { concludedGroups, groupsWithAlerts } = useBreedingAnalysis();

    const lotsData = useMemo(() => {
        const concludedIds = new Set(concludedGroups.map((g: BreedingGroup) => g.id));
        const activeLots = breedingGroups.filter(group => group.status === 'Activo' && !concludedIds.has(group.id)).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        const mapGroupToData = (group: BreedingGroup) => { const count = animals.filter(animal => animal.breedingGroupId === group.id).length; return { ...group, animalCount: count }; };
        return { active: activeLots.map(mapGroupToData), concluded: concludedGroups.map(mapGroupToData), };
    }, [breedingGroups, animals, concludedGroups]);

    return (
        <>
            <div className="space-y-4 animate-fade-in">
                <button onClick={() => setModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-lg">
                    <Plus size={20} /> Activar Temporada de Monta
                </button>
                <div className="space-y-2 pt-2">
                    <h3 className="text-lg font-semibold text-zinc-300 px-2">Temporadas Activas</h3>
                    {lotsData.active.length > 0 ? ( lotsData.active.map(group => ( <BreedingGroupCard key={group.id} group={group} animalCount={group.animalCount} hasAlert={groupsWithAlerts.has(group.id)} onClick={() => navigateTo({ name: 'breeding-group-detail', groupId: group.id })} /> ))) : ( <div className="text-center py-6 bg-brand-glass rounded-2xl"> <p className="text-zinc-500">No hay temporadas de monta activas.</p> </div> )}
                </div>
                <div className="space-y-2 pt-4">
                    <h3 className="text-lg font-semibold text-zinc-300 px-2">Temporadas Concluidas</h3>
                     {lotsData.concluded.length > 0 ? ( lotsData.concluded.map(group => ( <BreedingGroupCard key={group.id} group={group} animalCount={group.animalCount} hasAlert={false} onClick={() => navigateTo({ name: 'breeding-group-detail', groupId: group.id })} /> ))) : ( <div className="text-center py-6 bg-brand-glass rounded-2xl"> <p className="text-zinc-500">Aún no hay temporadas concluidas.</p> </div> )}
                </div>
            </div>
            <AddBreedingGroupModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
        </>
    );
};

export default function LotsDashboardPage({ navigateTo }: LotsDashboardPageProps) {
    const [activeTab, setActiveTab] = useState<'physical' | 'breeding'>('physical');
    const [isAddLotModalOpen, setAddLotModalOpen] = useState(false);

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
                <header className="text-center pt-8 pb-4">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Lotes</h1>
                    <p className="text-xl text-zinc-400">Gestión de Grupos</p>
                </header>
                <div className="relative bg-brand-glass rounded-xl p-1 border border-brand-border flex items-center">
                    <button 
                        onClick={() => setActiveTab('physical')} 
                        className={`w-1/2 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'physical' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                    >
                        <Users size={16}/>
                        <span className="text-sm font-semibold">Lotes Físicos</span>
                        <span 
                            onClick={(e) => {
                                e.stopPropagation();
                                setAddLotModalOpen(true);
                            }}
                            className="ml-2 p-1 rounded-full hover:bg-brand-orange/50"
                        >
                           <Plus size={18} />
                        </span>
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('breeding')} 
                        className={`w-1/2 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 ${activeTab === 'breeding' ? 'bg-zinc-700 text-white' : 'text-zinc-400'}`}
                    >
                        <Zap size={16}/> Lotes de Monta
                    </button>
                </div>
                <div className="pt-4">
                    {activeTab === 'physical' ? <PhysicalLotsView navigateTo={navigateTo} /> : <BreedingLotsView navigateTo={navigateTo} />}
                </div>
            </div>
            
            <AddLotModal
                isOpen={isAddLotModalOpen}
                onClose={() => setAddLotModalOpen(false)}
            />
        </>
    );
}