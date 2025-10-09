// src/components/lots/BreedingLotsView.tsx

import { useState, useMemo, useEffect, useRef } from 'react';
import type { PageState } from '../../types/navigation'; // <-- LÍNEA CORREGIDA
import { useData } from '../../context/DataContext';
import { ChevronRight, Plus, AlertTriangle, Trash2, Edit, Archive, GripVertical } from 'lucide-react';
import { BreedingGroup } from '../../db/local';
import { AddBreedingGroupModal } from '../ui/AddBreedingGroupModal';
import { useBreedingAnalysis } from '../../hooks/useBreedingAnalysis';
import { Reorder, motion, useAnimation, PanInfo, useDragControls } from 'framer-motion';
import { ActionSheetModal, ActionSheetAction } from '../ui/ActionSheetModal';
import { Modal } from '../ui/Modal';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
    if (!isOpen) return null;
    return ( <Modal isOpen={isOpen} onClose={onClose} title={title}> <div className="space-y-6"> <p className="text-zinc-300">{message}</p> <div className="flex justify-end gap-4"><button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button><button onClick={() => { onConfirm(); onClose(); }} className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Confirmar</button></div> </div> </Modal> );
};

const BreedingGroupCardContent = ({ group, dragControls }: { group: any, dragControls: any }) => (
    <div className="w-full p-4 flex items-center">
        <div className="pl-2 pr-4 cursor-grab touch-none self-stretch flex items-center" onPointerDown={(e) => dragControls.start(e)}><GripVertical className="text-zinc-500" /></div>
        <div className="flex-grow">
            <p className="font-bold text-lg text-white flex items-center gap-2"> {group.name} {group.hasAlert && <AlertTriangle className="text-brand-red" size={16} />} </p>
            <p className="text-sm text-zinc-400">Semental: {group.sireId} | <span className="font-semibold text-brand-orange">{group.animalCount}</span> {group.animalCount === 1 ? 'hembra' : 'hembras'}</p>
        </div>
        <ChevronRight className="text-zinc-600" />
    </div>
);

const SwipeableBreedingCard = ({ group, onEdit, onDelete, onClick, dragControls }: { group: any, onEdit: () => void, onDelete: () => void, onClick: () => void, dragControls: any }) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 160; // 80px para Opciones + 80px para Eliminar
    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        if (Math.abs(offset) < 2) { onClick(); return; }
        if (offset < -buttonsWidth / 2 || velocity < -500) { swipeControls.start({ x: -buttonsWidth }); } else { swipeControls.start({ x: 0 }); }
        setTimeout(() => { dragStarted.current = false; }, 100);
    };
    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <button onClick={onEdit} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-orange text-white"><Edit size={22} /><span className="text-xs mt-1 font-semibold">Opciones</span></button>
                <button onClick={onDelete} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-red text-white"><Trash2 size={22} /><span className="text-xs mt-1 font-semibold">Eliminar</span></button>
            </div>
            <motion.div drag="x" dragConstraints={{ left: -buttonsWidth, right: 0 }} dragElastic={0.1} onDragStart={() => { dragStarted.current = true; }} onDragEnd={onDragEnd} onTap={() => { if (!dragStarted.current) { onClick(); } }} animate={swipeControls} transition={{ type: "spring", stiffness: 400, damping: 40 }} className="relative w-full z-10 cursor-pointer bg-ios-modal-bg">
                <BreedingGroupCardContent group={group} dragControls={dragControls} />
            </motion.div>
        </div>
    );
};

const ReorderableBreedingItem = ({ group, navigateTo, onEdit, onDelete }: { group: any, navigateTo: (page: PageState) => void, onEdit: (group: any) => void, onDelete: (group: any) => void }) => {
    const dragControls = useDragControls();
    return ( <Reorder.Item key={group.id} value={group} dragListener={false} dragControls={dragControls}> <SwipeableBreedingCard group={group} dragControls={dragControls} onClick={() => navigateTo({ name: 'breeding-group-detail', groupId: group.id })} onEdit={() => onEdit(group)} onDelete={() => onDelete(group)} /> </Reorder.Item> );
};

export default function BreedingLotsView({ navigateTo }: { navigateTo: (page: PageState) => void; }) {
    const { breedingGroups, animals, updateBreedingGroup, deleteBreedingGroup } = useData();
    const [isModalOpen, setModalOpen] = useState(false);
    const { concludedGroups, groupsWithAlerts } = useBreedingAnalysis();
    const [isActionSheetOpen, setActionSheetOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<any | null>(null);
    
    const lotsData = useMemo(() => {
        const mapGroupToData = (group: BreedingGroup) => ({ ...group, animalCount: animals.filter(animal => animal.breedingGroupId === group.id).length, hasAlert: groupsWithAlerts.has(group.id) });
        const activeLots = breedingGroups.filter(group => group.status === 'Activo' && !concludedGroups.some(cg => cg.id === group.id)).map(mapGroupToData).sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
        const concluded = concludedGroups.map(mapGroupToData);
        return { active: activeLots, concluded };
    }, [breedingGroups, animals, concludedGroups, groupsWithAlerts]);
    
    const [orderedActive, setOrderedActive] = useState(lotsData.active);
    useEffect(() => { setOrderedActive(lotsData.active); }, [lotsData.active]);

    const handlePermanentDelete = () => { if (!deleteConfirmation) return; deleteBreedingGroup(deleteConfirmation.id); };

    const groupActions: ActionSheetAction[] = [
        { label: "Cerrar Temporada", icon: Archive, onClick: () => { if(selectedGroup) updateBreedingGroup(selectedGroup.id, { status: 'Cerrado' }) } },
    ];

    return (
        <div className="space-y-4">
            <button onClick={() => setModalOpen(true)} className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-lg"><Plus size={20} /> Activar Temporada de Monta</button>
            <div className="space-y-2 pt-2">
                <h3 className="text-lg font-semibold text-zinc-300">Temporadas Activas</h3>
                {orderedActive.length > 0 ? (
                    <Reorder.Group as="div" axis="y" values={orderedActive} onReorder={setOrderedActive} className="space-y-3">
                        {orderedActive.map(group => ( <ReorderableBreedingItem key={group.id} group={group} navigateTo={navigateTo} onEdit={(groupToEdit) => { setSelectedGroup(groupToEdit); setActionSheetOpen(true); }} onDelete={(groupToDelete) => setDeleteConfirmation(groupToDelete)} /> ))}
                    </Reorder.Group>
                ) : ( <div className="text-center py-6 bg-brand-glass rounded-2xl"> <p className="text-zinc-500">No hay temporadas de monta activas.</p> </div> )}
            </div>
            <div className="space-y-2 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300">Temporadas Concluidas</h3>
                {lotsData.concluded.length > 0 ? ( 
                    lotsData.concluded.map(group => ( 
                        <ReorderableBreedingItem 
                            key={group.id} 
                            group={{...group, hasAlert: false}} 
                            navigateTo={navigateTo} 
                            onEdit={(groupToEdit) => { setSelectedGroup(groupToEdit); setActionSheetOpen(true); }} 
                            onDelete={(groupToDelete) => alert(`El lote concluido '${groupToDelete.name}' no se puede eliminar permanentemente.`)} 
                        /> 
                    ))
                ) : ( <div className="text-center py-6 bg-brand-glass rounded-2xl"> <p className="text-zinc-500">Aún no hay temporadas concluidas.</p> </div> )}
            </div>
            <AddBreedingGroupModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} />
            <ActionSheetModal isOpen={isActionSheetOpen} onClose={() => setActionSheetOpen(false)} title={`Opciones para "${selectedGroup?.name}"`} actions={groupActions} />
            <ConfirmationModal isOpen={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)} onConfirm={handlePermanentDelete} title={`Eliminar Lote de Monta`} message={`¿Estás seguro de que quieres ELIMINAR PERMANENTEMENTE el lote "${deleteConfirmation?.name}"? Esta acción no se puede deshacer.`} />
        </div>
    );
};