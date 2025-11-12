// src/components/lots/BreedingLotsView.tsx (Actualizado)

import { useState, useMemo, useEffect, useRef } from 'react';
import type { PageState } from '../../types/navigation';
import { useData } from '../../context/DataContext';
// (NUEVO) Importar Trash2 y Modal
import { ChevronRight, Zap, Sun, Edit, GripVertical, Trash2 } from 'lucide-react';
import { BreedingSeason } from '../../db/local';
import { Reorder, motion, useAnimation, useDragControls } from 'framer-motion';
import { Modal } from '../ui/Modal'; // Importar Modal base

// --- (NUEVO) SUB-COMPONENTE DE CONFIRMACIÓN ---
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

// --- SUB-COMPONENTES (Contenido sin cambios) ---

const SeasonCardContent = ({ season, dragControls }: { season: BreedingSeason, dragControls: any }) => (
    <div className="w-full p-4 flex items-center">
        <div className="pl-2 pr-4 cursor-grab touch-none self-stretch flex items-center" onPointerDown={(e) => dragControls.start(e)}>
            <GripVertical className="text-zinc-500" />
        </div>
        <div className="flex-grow">
            <p className="font-bold text-lg text-white flex items-center gap-2">
                {season.name}
                {season.requiresLightTreatment && (
                    <span title="Requiere Tratamiento de Luz">
                        <Sun size={16} className="text-yellow-400" />
                    </span>
                )}
            </p>
            <p className="text-sm text-zinc-400">
                {new Date(season.startDate + 'T00:00:00').toLocaleDateString()} - {new Date(season.endDate + 'T00:00:00').toLocaleDateString()}
            </p>
        </div>
        <div className="flex items-center gap-4">
            <span className={`px-2 py-1 text-xs font-bold rounded-full ${season.status === 'Activo' ? 'bg-green-500/80 text-white' : 'bg-zinc-600 text-zinc-300'}`}>
                {season.status}
            </span>
            <ChevronRight className="text-zinc-600" />
        </div>
    </div>
);

// --- (ACTUALIZADO) Tarjeta Swipeable con "Eliminar" ---
const SwipeableSeasonCard = ({ season, onEdit, onDelete, onClick, dragControls }: { 
    season: BreedingSeason, 
    onEdit: () => void, 
    onDelete: () => void, // (NUEVO)
    onClick: () => void, 
    dragControls: any 
}) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 160; // (ACTUALIZADO) 80px para Editar + 80px para Eliminar

    const dragProps = {
        drag: "x" as "x",
        dragConstraints: { left: -buttonsWidth, right: 0 },
        dragElastic: 0.1,
        onPanStart: () => { dragStarted.current = true; },
        onPanEnd: (_e: any, info: any) => { // (CORREGIDO) Añadido _e
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
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            {/* (ACTUALIZADO) Opciones de Swipe */}
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <button onClick={onEdit} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Edit size={22} /><span className="text-xs mt-1 font-semibold">Editar</span>
                </button>
                {/* (NUEVO) Botón Eliminar */}
                <button onClick={onDelete} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-red text-white">
                    <Trash2 size={22} /><span className="text-xs mt-1 font-semibold">Eliminar</span>
                </button>
            </div>
            
            <motion.div
                {...dragProps}
                dragListener={dragControls ? false : undefined}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg"
            >
                <SeasonCardContent season={season} dragControls={dragControls} />
            </motion.div>
        </div>
    );
};

// --- (ACTUALIZADO) Item Reordenable con "onDelete" ---
const ReorderableSeasonItem = ({ season, navigateTo, onEdit, onDelete }: { 
    season: BreedingSeason, 
    navigateTo: (page: PageState) => void, 
    onEdit: (season: BreedingSeason) => void,
    onDelete: (season: BreedingSeason) => void // (NUEVO)
}) => {
    const dragControls = useDragControls();
    return (
        <Reorder.Item key={season.id} value={season} dragListener={false} dragControls={dragControls}>
            <SwipeableSeasonCard 
                season={season}
                dragControls={dragControls}
                onClick={() => navigateTo({ name: 'breeding-season-detail', seasonId: season.id })}
                onEdit={() => onEdit(season)}
                onDelete={() => onDelete(season)} // (NUEVO)
            />
        </Reorder.Item>
    );
};


interface BreedingLotsViewProps {
    navigateTo: (page: PageState) => void;
    onEditSeason: (season: BreedingSeason) => void;
}

// --- (ACTUALIZADO) Componente Principal con Lógica de Eliminación ---
export default function BreedingLotsView({ navigateTo, onEditSeason }: BreedingLotsViewProps) {

    // (ACTUALIZADO) Obtener 'deleteBreedingSeason'
    const { breedingSeasons, deleteBreedingSeason } = useData();
    
    // (NUEVO) Estado para el modal de confirmación
    const [deleteConfirmation, setDeleteConfirmation] = useState<BreedingSeason | null>(null);

    const sortedSeasons = useMemo(() => {
        return [...breedingSeasons].sort((a, b) => {
            if (a.status === 'Activo' && b.status !== 'Activo') return -1;
            if (a.status !== 'Activo' && b.status === 'Activo') return 1;
            return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        });
    }, [breedingSeasons]);

    const [orderedSeasons, setOrderedSeasons] = useState(sortedSeasons);
    useEffect(() => { setOrderedSeasons(sortedSeasons); }, [sortedSeasons]);

    // (NUEVO) Handler para confirmar la eliminación
    const handleConfirmDelete = async () => {
        if (!deleteConfirmation) return;
        try {
            await deleteBreedingSeason(deleteConfirmation.id);
            // No se necesita alerta de error aquí, DataContext maneja los errores
        } catch (err: any) {
            console.error("Error al eliminar temporada:", err);
            // Quizás mostrar una alerta de error aquí si es necesario
        }
        setDeleteConfirmation(null);
    };

    if (orderedSeasons.length === 0) {
        return (
             <div className="text-center py-10 bg-brand-glass rounded-2xl flex flex-col items-center gap-2 mx-4">
                <Zap size={32} className="text-zinc-600" />
                <p className="text-zinc-500 font-semibold">No hay temporadas de monta creadas.</p>
                <p className="text-xs text-zinc-600">Usa el botón 'Crear Temporada' de arriba para empezar.</p>
            </div>
        )
    }

    return (
        <>
            <Reorder.Group as="div" axis="y" values={orderedSeasons} onReorder={setOrderedSeasons} className="space-y-3 px-4 pt-4">
                {orderedSeasons.map(season => (
                    <ReorderableSeasonItem
                        key={season.id}
                        season={season}
                        navigateTo={navigateTo}
                        onEdit={onEditSeason}
                        onDelete={setDeleteConfirmation} // (NUEVO)
                    />
                ))}
            </Reorder.Group>
            
            {/* (NUEVO) Modal de Confirmación */}
            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleConfirmDelete}
                title="Eliminar Temporada de Monta"
                message={`¿Estás seguro de que quieres eliminar "${deleteConfirmation?.name}"? Se desasignarán ${deleteConfirmation?.status === 'Activo' ? 'TODAS' : ''} las hembras de sus lotes de monta y se marcarán como 'Vacías'. Esta acción no se puede deshacer.`}
            />
        </>
    );
};