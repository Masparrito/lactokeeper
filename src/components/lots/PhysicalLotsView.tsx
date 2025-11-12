// src/components/lots/PhysicalLotsView.tsx (Corregido)

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import type { PageState } from '../../types/navigation';
// (CORREGIDO) Importar AlertTriangle, eliminar X
import { Trash2, Edit, GripVertical, Layers, AlertTriangle } from 'lucide-react'; 
import { Reorder, motion, useAnimation, useDragControls } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { GiBarn } from 'react-icons/gi';
import { Lot } from '../../db/local'; // Importar el tipo Lot

// --- (CORREGIDO) Definición de Tipo movida a la parte superior ---
interface LotWithCount extends Lot {
    count: number;
    subLots: LotWithCount[];
}

// --- SUB-COMPONENTES DE MODALES ---

// Modal de Confirmación para Eliminar
const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { 
    isOpen: boolean, 
    onClose: () => void, 
    onConfirm: () => void, 
    title: string, 
    message: string 
}) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6">
                <p className="text-zinc-300">{message}</p>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Confirmar</button>
                </div>
            </div>
        </Modal>
    );
};

// Modal de Alerta para Errores
const AlertModal = ({ isOpen, onClose, title, message }: {
    isOpen: boolean,
    onClose: () => void,
    title: string,
    message: string
}) => {
    if (!isOpen) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title}>
            <div className="space-y-6 text-center">
                <AlertTriangle size={48} className="text-brand-red mx-auto" />
                <p className="text-zinc-300">{message}</p>
                <div className="flex justify-center">
                    <button onClick={onClose} className="bg-brand-red hover:bg-red-700 text-white font-bold py-2 px-6 rounded-lg">Entendido</button>
                </div>
            </div>
        </Modal>
    );
};

// Input simple para el modal de renombrar
const FormInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
    <input
        ref={ref}
        {...props}
        className={`w-full bg-zinc-800 border border-zinc-700 rounded-lg p-2.5 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-orange ${className}`}
    />
));

// Modal para Renombrar Lote
const RenameLotModal = ({ isOpen, onClose, updateLot, lot }: {
    isOpen: boolean,
    onClose: () => void,
    updateLot: (lotId: string, dataToUpdate: Partial<Lot>) => Promise<void>, // (CORREGIDO) Tipo correcto
    lot: LotWithCount | null
}) => {
    const [newName, setNewName] = useState(lot?.name || '');
    const [error, setError] = useState('');

    const handleSave = async () => {
        if (!lot) return;
        if (!newName || newName.trim() === '') {
            setError('El nombre no puede estar vacío.');
            return;
        }
        if (newName.trim() === lot.name) {
            onClose(); // No hay cambios
            return;
        }
        try {
            setError('');
            // (CORREGIDO) Llama a updateLot con el objeto Partial<Lot>
            await updateLot(lot.id, { name: newName.trim() });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Error al renombrar el lote.');
        }
    };

    // Sincronizar estado interno cuando el modal se abre
    useEffect(() => {
        if (isOpen && lot) {
            setNewName(lot.name);
            setError('');
        }
    }, [isOpen, lot]);

    if (!isOpen || !lot) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Renombrar "${lot.name}"`}>
            <div className="space-y-4">
                <FormInput
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nuevo nombre del lote"
                    autoFocus={true}
                />
                {error && (
                    <p className="text-sm text-brand-red text-center">{error}</p>
                )}
                <div className="flex justify-end gap-4 pt-4">
                    <button onClick={onClose} className="bg-zinc-600 hover:bg-zinc-500 text-white font-bold py-2 px-6 rounded-lg">Cancelar</button>
                    <button onClick={handleSave} className="bg-brand-orange hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg">Guardar</button>
                </div>
            </div>
        </Modal>
    );
};


// --- Componente de Contenido (Sin cambios) ---
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

// --- Componente de Tarjeta Swipeable ---
const SwipeableLotCard = ({ lot, onEdit, onDelete, onClick, dragControls, isSubLot = false }: { 
    lot: LotWithCount, 
    onEdit: () => void, 
    onDelete: () => void, 
    onClick: () => void, 
    dragControls?: any, 
    isSubLot?: boolean 
}) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const showEdit = lot.name !== 'Sin Asignar';
    const showDelete = lot.name !== 'Sin Asignar';
    const buttonsWidth = (showEdit ? 80 : 0) + (showDelete ? 80 : 0);

    const dragProps = {
        drag: "x" as "x", 
        dragConstraints: { left: -buttonsWidth, right: 0 }, 
        dragElastic: 0.1, 
        onPanStart: () => { dragStarted.current = true; },
        // (CORREGIDO TS6133) 'e' se reemplaza con '_e' para indicar que no se usa
        onPanEnd: (_e: any, info: any) => {
            if (Math.abs(info.offset.x) < buttonsWidth / 2) {
                swipeControls.start({ x: 0 });
            } else {
                swipeControls.start({ x: -buttonsWidth });
            }
            setTimeout(() => { dragStarted.current = false; }, 50); 
        },
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

// --- Componente de Item Reordenable ---
const ReorderableLotItem = ({ lot, navigateTo, onEdit, onDelete }: { 
    lot: LotWithCount, 
    navigateTo: (page: PageState) => void, 
    onEdit: (lot: LotWithCount) => void, 
    onDelete: (lot: LotWithCount) => void 
}) => {
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
                    {lot.subLots.map((subLot: LotWithCount) => (
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
    // (CORREGIDO) Importar updateLot
    const { animals, lots, deleteLot, updateLot } = useData();
    
    const [renameModal, setRenameModal] = useState<LotWithCount | null>(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState<LotWithCount | null>(null);
    const [alertModal, setAlertModal] = useState<{ title: string, message: string } | null>(null);

    const lotsSummary = useMemo((): LotWithCount[] => {
        const lotCounts = new Map<string, number>();
        lots.forEach(lot => lotCounts.set(lot.name, 0));
        
        (animals || []).forEach(animal => { 
            const location = animal.location || 'Sin Asignar'; 
            lotCounts.set(location, (lotCounts.get(location) || 0) + 1); 
        });

        const allLotsSummary: LotWithCount[] = lots.map(lot => ({
            ...lot,
            count: lotCounts.get(lot.name) || 0,
            subLots: [], // Se llenará después
        }));

        const subLotMap = new Map<string, LotWithCount[]>();
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
                subLots: (subLotMap.get(lot.id) || []).sort((a, b) => a.name.localeCompare(b.name))
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

    const handleDeleteRequest = (lot: LotWithCount) => {
        // (CORREGIDO TS7006) Tipos explícitos en reduce
        const totalAnimalsInLot = lot.count + (lot.subLots.reduce((acc: number, sub: LotWithCount) => acc + sub.count, 0));
        
        if (totalAnimalsInLot > 0) {
            setAlertModal({
                title: "Lote No Vacío",
                message: `No se puede eliminar "${lot.name}". Primero debe reasignar los ${totalAnimalsInLot} animales que contiene.`
            });
        } else if (lot.subLots.length > 0) {
            setAlertModal({
                title: "Lote No Vacío",
                message: `No se puede eliminar "${lot.name}". Primero debe eliminar los ${lot.subLots.length} sub-lotes que contiene.`
            });
        } else {
            setDeleteConfirmation(lot);
        }
    };
    
    const handleConfirmDelete = async () => {
        if (!deleteConfirmation) return;
        try {
            await deleteLot(deleteConfirmation.id);
        } catch (err: any) {
            setAlertModal({ title: "Error al Eliminar", message: err.message });
        }
        setDeleteConfirmation(null);
    };

    // (CORREGIDO) Esta función ya no es necesaria, se pasa 'updateLot' directamente
    // const handleSaveRename = async (lotId: string, newName: string) => { ... };

    if (orderedLots.length === 0) {
        return (
            <div className="text-center py-10 bg-brand-glass rounded-2xl flex flex-col items-center gap-2 mx-4">
                <GiBarn size={32} className="text-zinc-600" />
                <p className="text-zinc-500 font-semibold">No hay lotes físicos creados.</p>
                <p className="text-xs text-zinc-600">Usa el botón '+' para empezar a organizar tu rebaño.</p>
            </div>
        );
    }

    return (
        <>
            <Reorder.Group as="div" axis="y" values={orderedLots} onReorder={setOrderedLots} className="space-y-3 px-4 pt-4">
                {orderedLots.map((lot) => (
                    <ReorderableLotItem 
                        key={lot.id} 
                        lot={lot} 
                        navigateTo={navigateTo} 
                        onEdit={(lotToEdit) => setRenameModal(lotToEdit)}
                        onDelete={(lotToDelete) => handleDeleteRequest(lotToDelete)}
                    />
                ))}
            </Reorder.Group>
            
            <ConfirmationModal 
                isOpen={!!deleteConfirmation} 
                onClose={() => setDeleteConfirmation(null)} 
                onConfirm={handleConfirmDelete} 
                title={`Eliminar Lote`} 
                message={`¿Estás seguro de que quieres eliminar el lote "${deleteConfirmation?.name}"? Esta acción no se puede deshacer.`} 
            />
            <RenameLotModal
                isOpen={!!renameModal}
                onClose={() => setRenameModal(null)}
                updateLot={updateLot} // (CORREGIDO TS2322) Pasar la función 'updateLot' directamente
                lot={renameModal}
            />
            <AlertModal
                isOpen={!!alertModal}
                onClose={() => setAlertModal(null)}
                title={alertModal?.title || 'Error'}
                message={alertModal?.message || 'Ha ocurrido un error.'}
            />
        </>
    );
};