// src/components/lots/PhysicalLotsView.tsx (Corregido)

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../../context/DataContext';
import type { PageState } from '../../types/navigation';
// (CORREGIDO) Importar AlertTriangle, eliminar X
import { Trash2, Edit, GripVertical, Layers, AlertTriangle, ChevronRight } from 'lucide-react';
import { Reorder, motion, useAnimation, useDragControls } from 'framer-motion';
import { Modal } from '../ui/Modal';
import { GiBarn } from 'react-icons/gi';
import { Lot } from '../../db/local'; // Importar el tipo Lot
import { subLotDisplayName } from '../../utils/lots';

// --- (CORREGIDO) Definición de Tipo movida a la parte superior ---
interface LotWithCount extends Lot {
    count: number;
    subLots: LotWithCount[];
}

// Color de identidad estable por lote (derivado del id, no del orden), para el
// punto de color de la lista densa.
const LOT_COLORS = ['bg-c-accent', 'bg-c-accent-sky', 'bg-c-accent-gold', 'bg-[#6d5fd6]', 'bg-[#e07a3c]', 'bg-[#d6467a]'];
const lotColorClass = (id: string): string => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
    return LOT_COLORS[h % LOT_COLORS.length];
};

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


// --- Componente de Contenido: fila delgada de la lista densa ---
const LotCardContent = ({ lotName, count, subLotsCount, dragControls, colorClass }: {
    lotName: string,
    count: number,
    subLotsCount: number,
    dragControls: any,
    colorClass: string
}) => (
    <div className="w-full py-3 pl-2 pr-3 flex items-center">
        <div className="pr-2.5 cursor-grab touch-none self-stretch flex items-center text-c-border-strong" onPointerDown={(e) => dragControls.start(e)}>
            <GripVertical size={16} />
        </div>
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 mr-3 ${colorClass}`} />
        <div className="flex-grow min-w-0">
            <p className="font-bold text-[15px] text-c-text truncate flex items-center gap-1.5">
                {lotName}
                {subLotsCount > 0 && (
                    <Layers size={12} className="text-c-text-muted shrink-0" />
                )}
            </p>
        </div>
        <div className="flex items-baseline gap-1 mr-1.5 shrink-0">
            <span className="text-[15px] font-bold text-c-accent">{count}</span>
            <span className="text-[11px] text-c-text-faint font-semibold">{count === 1 ? 'animal' : 'animales'}</span>
        </div>
        <ChevronRight size={16} className="text-c-text-faint shrink-0" />
    </div>
);

// --- Fila Swipeable de la lista densa ---
const SwipeableLotCard = ({ lot, onEdit, onDelete, onClick, dragControls, subLots = [], onSubLotClick }: {
    lot: LotWithCount,
    onEdit: () => void,
    onDelete: () => void,
    onClick: () => void,
    dragControls?: any,
    subLots?: LotWithCount[],
    onSubLotClick?: (lot: LotWithCount) => void
}) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 72 + 72;

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
        <div className="relative w-full overflow-hidden">
            <div className="absolute inset-y-0 right-0 flex items-stretch z-0">
                <button onClick={onEdit} onPointerDown={(e) => e.stopPropagation()} className="w-[72px] flex flex-col items-center justify-center bg-c-accent-sky text-white"><Edit size={18} /><span className="text-[10px] mt-0.5 font-semibold">Editar</span></button>
                <button onClick={onDelete} onPointerDown={(e) => e.stopPropagation()} className="w-[72px] flex flex-col items-center justify-center bg-brand-red text-white"><Trash2 size={18} /><span className="text-[10px] mt-0.5 font-semibold">Borrar</span></button>
            </div>
            <motion.div
                {...dragProps}
                dragListener={dragControls ? false : undefined}
                className="relative w-full z-10 cursor-pointer bg-c-surface"
            >
                <LotCardContent
                    lotName={lot.name}
                    count={lot.count}
                    subLotsCount={lot.subLots?.length || 0}
                    dragControls={dragControls}
                    colorClass={lotColorClass(lot.id)}
                />

                {/* Sub-lotes (corrales) como chips verdes dentro de la fila */}
                {subLots.length > 0 && (
                    <div className="px-4 pb-3 -mt-1 pl-10 flex flex-wrap gap-2">
                        {subLots.map(sl => (
                            <button
                                key={sl.id}
                                onClick={(e) => { e.stopPropagation(); onSubLotClick?.(sl); }}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="flex items-center gap-1.5 bg-c-accent/10 hover:bg-c-accent/20 text-c-accent border border-c-accent/25 rounded-lg pl-2.5 pr-1.5 py-1 text-xs font-semibold active:scale-95 transition-all"
                            >
                                {subLotDisplayName(sl.name)}
                                <span className="text-[11px] font-bold bg-c-accent/15 rounded px-1.5 py-0.5 min-w-[1.25rem] text-center">{sl.count}</span>
                            </button>
                        ))}
                    </div>
                )}
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
            className="relative bg-c-surface border-b border-c-border last:border-b-0"
        >
            <SwipeableLotCard
                lot={lot}
                dragControls={dragControls}
                onClick={() => navigateTo({ name: 'lot-detail', lotName: lot.name })}
                onEdit={() => onEdit(lot)}
                onDelete={() => onDelete(lot)}
                subLots={lot.subLots}
                onSubLotClick={(sl) => navigateTo({ name: 'lot-detail', lotName: sl.name })}
            />
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

    // Solo contamos animales del rebaño activo (no referencias), para que el
    // conteo de cada lote coincida con lo que muestra el detalle del lote.
    const activeAnimals = useMemo(() => (animals || []).filter(a => !a.isReference), [animals]);

    const lotsSummary = useMemo((): LotWithCount[] => {
        const lotCounts = new Map<string, number>();
        lots.forEach(lot => lotCounts.set(lot.name, 0));

        activeAnimals.forEach(animal => {
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

        // "Sin Asignar" ya no es una tarjeta: se muestra como texto accionable aparte.
        return parentLots.sort((a, b) => a.name.localeCompare(b.name));
    }, [activeAnimals, lots]);

    // Animales activos sin lote asignado. Usamos EXACTAMENTE el mismo criterio que
    // el detalle del lote (location vacío O igual al literal 'Sin Asignar'), para
    // que el conteo coincida con el listado que se abre.
    const unassignedCount = useMemo(
        () => activeAnimals.filter(a => (a.location || 'Sin Asignar') === 'Sin Asignar').length,
        [activeAnimals]
    );

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

    const unassignedLink = unassignedCount > 0 && (
        <button
            onClick={() => navigateTo({ name: 'lot-detail', lotName: 'Sin Asignar' })}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-3 text-c-accent font-semibold hover:underline active:opacity-70 transition-opacity"
        >
            Ver {unassignedCount} {unassignedCount === 1 ? 'animal' : 'animales'} sin asignar
            <ChevronRight size={16} />
        </button>
    );

    if (orderedLots.length === 0 && unassignedCount === 0) {
        return (
            <div className="text-center py-10 bg-c-surface border border-c-border rounded-2xl flex flex-col items-center gap-2 mx-4">
                <GiBarn size={32} className="text-c-text-faint" />
                <p className="text-c-text-muted font-semibold">No hay lotes físicos creados.</p>
                <p className="text-xs text-c-text-faint">Usa el botón '+' para empezar a organizar tu rebaño.</p>
            </div>
        );
    }

    return (
        <>
            <div className="mx-4">
                <Reorder.Group as="div" axis="y" values={orderedLots} onReorder={setOrderedLots} className="bg-c-surface border border-c-border rounded-2xl overflow-hidden shadow-sm">
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

                {unassignedLink}
            </div>

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