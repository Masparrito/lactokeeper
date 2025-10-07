import { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { PageState } from '../../pages/RebanoShell';
import { Zap, Trash2, Edit, Move, ClipboardList, TestTube, GripVertical } from 'lucide-react';
import { Reorder, motion, useAnimation, PanInfo, useDragControls } from 'framer-motion';
import { ActionSheetModal, ActionSheetAction } from '../ui/ActionSheetModal';
import { Modal } from '../ui/Modal';

// --- SUB-COMPONENTES (VIVEN DENTRO DE ESTE ARCHIVO) ---

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
    if (!isOpen) return null;
    return ( <Modal isOpen={isOpen} onClose={onClose} title={title}> <div className="space-y-6"> <p className="text-zinc-300">{message}</p> <div className="flex justify-end gap-4"><button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button><button onClick={() => { onConfirm(); onClose(); }} className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Confirmar</button></div> </div> </Modal> );
};

const LotCardContent = ({ lotName, count, dragControls }: { lotName: string, count: number, dragControls: any }) => (
    <div className="w-full p-4 flex items-center">
        <div className="pl-2 pr-4 cursor-grab touch-none self-stretch flex items-center" onPointerDown={(e) => dragControls.start(e)}><GripVertical className="text-zinc-500" /></div>
        <div className="flex-grow">
            <p className="font-bold text-lg text-white">{lotName}</p>
            <p className="text-sm text-zinc-400"><span className="font-semibold text-brand-orange">{count}</span> {count === 1 ? 'animal' : 'animales'}</p>
        </div>
    </div>
);

const SwipeableLotCard = ({ lot, onEdit, onDelete, onClick, dragControls }: { lot: { id: string, name: string, count: number }, onEdit: () => void, onDelete: () => void, onClick: () => void, dragControls: any }) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const showEdit = lot.count > 0;
    const showDelete = lot.name !== 'Sin Asignar';
    const buttonsWidth = (showEdit ? 80 : 0) + (showDelete ? 80 : 0);
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
                {showEdit && <button onClick={onEdit} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-orange text-white"><Edit size={22} /><span className="text-xs mt-1 font-semibold">Editar</span></button>}
                {showDelete && <button onClick={onDelete} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-red text-white"><Trash2 size={22} /><span className="text-xs mt-1 font-semibold">Borrar</span></button>}
            </div>
            <motion.div drag="x" dragConstraints={{ left: -buttonsWidth, right: 0 }} dragElastic={0.1} onDragStart={() => { dragStarted.current = true; }} onDragEnd={onDragEnd} onTap={() => { if (!dragStarted.current) { onClick(); } }} animate={swipeControls} transition={{ type: "spring", stiffness: 400, damping: 40 }} className="relative w-full z-10 cursor-pointer bg-ios-modal-bg">
                <LotCardContent lotName={lot.name} count={lot.count} dragControls={dragControls} />
            </motion.div>
        </div>
    );
};

const ReorderableLotItem = ({ lot, navigateTo, onEdit, onDelete }: { lot: any, navigateTo: (page: PageState) => void, onEdit: (lot: any) => void, onDelete: (lot: any) => void }) => {
    const dragControls = useDragControls();
    return ( <Reorder.Item key={lot.id} value={lot} dragListener={false} dragControls={dragControls}> <SwipeableLotCard lot={lot} dragControls={dragControls} onClick={() => navigateTo({ name: 'lot-detail', lotName: lot.name })} onEdit={() => onEdit(lot)} onDelete={() => onDelete(lot)} /> </Reorder.Item> );
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
        (animals || []).forEach(animal => { const location = animal.location || 'Sin Asignar'; lotCounts.set(location, (lotCounts.get(location) || 0) + 1); });
        const allLotNames = Array.from(new Set([...lots.map(l => l.name), ...animals.map(a => a.location || 'Sin Asignar')]));
        return allLotNames.map(name => {
            const lot = lots.find(l => l.name === name);
            return { id: lot?.id || name, name: name, count: lotCounts.get(name) || 0, };
        }).sort((a, b) => a.name.localeCompare(b.name));
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
        deleteLot(deleteConfirmation.id);
    };

    return (
        <>
            <Reorder.Group as="div" axis="y" values={orderedLots} onReorder={setOrderedLots} className="space-y-3">
                {orderedLots.map((lot) => (
                    <ReorderableLotItem key={lot.id} lot={lot} navigateTo={navigateTo} onEdit={(lotToEdit) => { setSelectedLot(lotToEdit); setActionSheetOpen(true); }} onDelete={(lotToDelete) => setDeleteConfirmation(lotToDelete)} />
                ))}
            </Reorder.Group>
            <ActionSheetModal isOpen={isActionSheetOpen} onClose={() => setActionSheetOpen(false)} title={`Acciones para "${selectedLot?.name}"`} actions={lotActions} />
            <ConfirmationModal isOpen={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)} onConfirm={handleDelete} title={`Eliminar Lote`} message={`¿Estás seguro de que quieres eliminar el lote "${deleteConfirmation?.name}"? Esta acción no se puede deshacer.`} />
        </>
    );
};