// src/components/lots/PhysicalLotsView.tsx

import { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import type { PageState } from '../../types/navigation';
import { Trash2, Edit, Move, GripVertical, Layers } from 'lucide-react'; 
import { Reorder, motion, useAnimation, useDragControls } from 'framer-motion';
import { ActionSheetModal, ActionSheetAction } from '../ui/ActionSheetModal';
import { Modal } from '../ui/Modal';
import { GiBarn } from 'react-icons/gi';

// --- SUB-COMPONENTES ---

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
    if (!isOpen) return null;
    return ( <Modal isOpen={isOpen} onClose={onClose} title={title}> <div className="space-y-6"> <p className="text-zinc-300">{message}</p> <div className="flex justify-end gap-4"><button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button><button onClick={() => { onConfirm(); onClose(); }} className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Confirmar</button></div> </div> </Modal> );
};

const LotCardContent = ({ lotName, count, subLotsCount, dragControls, isSubLot }: { 
    lotName: string, 
    count: number, 
    subLotsCount: number, 
    dragControls: any, 
    isSubLot: boolean 
}) => (
    <div className="w-full p-4 flex items-center">
        {!isSubLot && (
            <div className="pl-2 pr-4 cursor-grab touch-none self-stretch flex items-center" onPointerDown={(e) => dragControls.start(e)}>
                <GripVertical className="text-zinc-500" />
            </div>
        )}
        {isSubLot && <div className="w-4 flex-shrink-0"></div>}

        <div className="flex-grow">
            <p className="font-bold text-lg text-white flex items-center gap-2">
                {lotName}
                {subLotsCount > 0 && (
                    <span title={`${subLotsCount} sub-lotes`} className="bg-zinc-700/80 p-1 rounded-full">
                        <Layers size={12} className="text-zinc-400" />
                    </span>
                )}
            </p>
            <p className="text-sm text-zinc-400">
                <span className="font-semibold text-brand-orange">{count}</span> {count === 1 ? 'animal' : 'animales'} 
                {subLotsCount > 0 ? ' (directos)' : ''}
            </p>
        </div>
    </div>
);

const SwipeableLotCard = ({ lot, onEdit, onDelete, onClick, dragControls, isSubLot = false }: { 
    lot: { id: string, name: string, count: number, subLots?: any[] }, 
    onEdit: () => void, 
    onDelete: () => void, 
    onClick: () => void, 
    dragControls?: any, 
    isSubLot?: boolean 
}) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    // --- LÍNEA CORREGIDA ---
    const showEdit = lot.count > 0 || (lot.subLots?.length || 0) > 0; // Permitir editar si tiene sub-lotes
    const showDelete = lot.name !== 'Sin Asignar';
    const buttonsWidth = (showEdit ? 80 : 0) + (showDelete ? 80 : 0);

    const dragProps = {
        drag: "x" as "x", 
        dragConstraints: { left: -buttonsWidth, right: 0 }, 
        dragElastic: 0.1, 
        onPanStart: () => { dragStarted.current = true; },
        onPanEnd: () => { setTimeout(() => { dragStarted.current = false; }, 50); },
        onTap: () => { if (!dragStarted.current) { onClick(); } }, 
        animate: swipeControls, 
        transition: { type: "spring", stiffness: 400, damping: 40 }
    };

    return (
        <div className={`relative w-full overflow-hidden ${isSubLot ? 'rounded-lg' : 'rounded-2xl'} bg-brand-glass border border-brand-border`}>
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                {showEdit && <button onClick={onEdit} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-orange text-white"><Edit size={22} /><span className="text-xs mt-1 font-semibold">Editar</span></button>}
                {showDelete && <button onClick={onDelete} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-red text-white"><Trash2 size={22} /><span className="text-xs mt-1 font-semibold">Borrar</span></button>}
            </div>
            <motion.div 
                {...dragProps}
                dragListener={!isSubLot && dragControls ? false : undefined}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg"
            >
                <LotCardContent 
                    lotName={lot.name} 
                    count={lot.count} 
                    subLotsCount={lot.subLots?.length || 0} 
                    dragControls={dragControls}
                    isSubLot={isSubLot}
                />
            </motion.div>
        </div>
    );
};

const ReorderableLotItem = ({ lot, navigateTo, onEdit, onDelete }: { lot: any, navigateTo: (page: PageState) => void, onEdit: (lot: any) => void, onDelete: (lot: any) => void }) => {
    const dragControls = useDragControls();
    return ( 
        <Reorder.Item 
            key={lot.id} 
            value={lot} 
            dragListener={false} 
            dragControls={dragControls} 
            className="space-y-1"
        >
            <SwipeableLotCard 
                lot={lot} 
                dragControls={dragControls} 
                onClick={() => navigateTo({ name: 'lot-detail', lotName: lot.name })} 
                onEdit={() => onEdit(lot)} 
                onDelete={() => onDelete(lot)} 
                isSubLot={false}
            />
            {lot.subLots && lot.subLots.length > 0 && (
                <div className="pl-6 space-y-1">
                    {lot.subLots.map((subLot: any) => (
                        <SwipeableLotCard
                            key={subLot.id}
                            lot={subLot}
                            onClick={() => navigateTo({ name: 'lot-detail', lotName: subLot.name })}
                            onEdit={() => onEdit(subLot)}
                            onDelete={() => onDelete(subLot)}
                            isSubLot={true}
                        />
                    ))}
                </div>
            )}
        </Reorder.Item> 
    );
};

// --- COMPONENTE PRINCIPAL DE LA VISTA ---
export default function PhysicalLotsView({ navigateTo }: { navigateTo: (page: PageState) => void; }) {
    const { animals, lots, deleteLot } = useData();
    const [isActionSheetOpen, setActionSheetOpen] = useState(false);
    const [selectedLot, setSelectedLot] = useState<any | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<any | null>(null);

    const lotsSummary = useMemo(() => {
        const lotCounts = new Map<string, number>();
        lots.forEach(lot => lotCounts.set(lot.name, 0));
        (animals || []).forEach(animal => { 
            const location = animal.location || 'Sin Asignar'; 
            lotCounts.set(location, (lotCounts.get(location) || 0) + 1); 
        });

        const allLotsSummary = lots.map(lot => ({
            id: lot.id,
            name: lot.name,
            count: lotCounts.get(lot.name) || 0,
            parentLotId: lot.parentLotId,
        }));

        const subLotMap = new Map<string, any[]>();
        allLotsSummary.forEach(lot => {
            if (lot.parentLotId) {
                if (!subLotMap.has(lot.parentLotId)) {
                    subLotMap.set(lot.parentLotId, []);
                }
                subLotMap.get(lot.parentLotId)!.push(lot);
            }
        });

        const parentLots = allLotsSummary
            .filter(lot => !lot.parentLotId)
            .map(lot => ({
                ...lot,
                subLots: subLotMap.get(lot.id) || []
            }));
            
        const unassignedCount = lotCounts.get('Sin Asignar') || 0;
        if (unassignedCount > 0 || (parentLots.length === 0 && unassignedCount > 0)) {
            parentLots.push({
                id: 'unassigned', 
                name: 'Sin Asignar', 
                count: unassignedCount, 
                parentLotId: undefined,
                subLots: [] 
            });
        }

        return parentLots.sort((a, b) => a.name.localeCompare(b.name));
    }, [animals, lots]);

    const [orderedLots, setOrderedLots] = useState(lotsSummary);
    useEffect(() => { setOrderedLots(lotsSummary); }, [lotsSummary]);

    const lotActions: ActionSheetAction[] = [
        { label: "Mover Animales", icon: Move, onClick: () => navigateTo({ name: 'lot-detail', lotName: selectedLot?.name || '' }) },
    ];
    
    const handleDelete = () => {
        if (!deleteConfirmation) return;
        deleteLot(deleteConfirmation.id);
        setDeleteConfirmation(null);
    };

    if (orderedLots.length === 0) {
        return (
            <div className="text-center py-10 bg-brand-glass rounded-2xl flex flex-col items-center gap-2">
                <GiBarn size={32} className="text-zinc-600" />
                <p className="text-zinc-500 font-semibold">No hay lotes físicos creados.</p>
                <p className="text-xs text-zinc-600">Usa el botón '+' para empezar a organizar tu rebaño.</p>
            </div>
        );
    }

    return (
        <>
            <Reorder.Group as="div" axis="y" values={orderedLots} onReorder={setOrderedLots} className="space-y-3">
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
            <ActionSheetModal isOpen={isActionSheetOpen} onClose={() => setActionSheetOpen(false)} title={`Acciones para "${selectedLot?.name}"`} actions={lotActions} />
            <ConfirmationModal isOpen={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)} onConfirm={handleDelete} title={`Eliminar Lote`} message={`¿Estás seguro de que quieres eliminar el lote "${deleteConfirmation?.name}"? Esta acción no se puede deshacer.`} />
        </>
    );
};