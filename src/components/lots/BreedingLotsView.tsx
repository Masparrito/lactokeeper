// src/components/lots/BreedingLotsView.tsx

import { useState, useMemo, useEffect, useRef } from 'react';
import type { PageState } from '../../types/navigation';
import { useData } from '../../context/DataContext';
import { Plus, ChevronRight, Zap, Sun, Edit, GripVertical } from 'lucide-react';
import { BreedingSeason } from '../../db/local';
import { Modal } from '../ui/Modal';
import { BreedingSeasonForm } from '../forms/BreedingSeasonForm';
import { Reorder, motion, useAnimation, useDragControls } from 'framer-motion';

// --- SUB-COMPONENTES ---

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

const SwipeableSeasonCard = ({ season, onEdit, onClick, dragControls }: { season: BreedingSeason, onEdit: () => void, onClick: () => void, dragControls: any }) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 80;

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <button onClick={onEdit} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Edit size={22} /><span className="text-xs mt-1 font-semibold">Editar</span>
                </button>
            </div>
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onPanStart={() => { dragStarted.current = true; }}
                onPanEnd={() => { setTimeout(() => { dragStarted.current = false; }, 50); }}
                onTap={() => { if (!dragStarted.current) { onClick(); } }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg"
            >
                <SeasonCardContent season={season} dragControls={dragControls} />
            </motion.div>
        </div>
    );
};

const ReorderableSeasonItem = ({ season, navigateTo, onEdit }: { season: BreedingSeason, navigateTo: (page: PageState) => void, onEdit: (season: BreedingSeason) => void }) => {
    const dragControls = useDragControls();
    return (
        <Reorder.Item key={season.id} value={season} dragListener={false} dragControls={dragControls}>
            <SwipeableSeasonCard 
                season={season}
                dragControls={dragControls}
                onClick={() => navigateTo({ name: 'breeding-season-detail', seasonId: season.id })}
                onEdit={() => onEdit(season)}
            />
        </Reorder.Item>
    );
};


export default function BreedingLotsView({ navigateTo }: { navigateTo: (page: PageState) => void; }) {
    // --- CORRECCIÓN: Se eliminan sireLots, animals, fathers, serviceRecords que no se usan en ESTE archivo ---
    const { breedingSeasons, addBreedingSeason, updateBreedingSeason } = useData();
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingSeason, setEditingSeason] = useState<BreedingSeason | undefined>(undefined);

    const sortedSeasons = useMemo(() => {
        return [...breedingSeasons].sort((a, b) => {
            if (a.status === 'Activo' && b.status !== 'Activo') return -1;
            if (a.status !== 'Activo' && b.status === 'Activo') return 1;
            return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        });
    }, [breedingSeasons]);

    const [orderedSeasons, setOrderedSeasons] = useState(sortedSeasons);
    useEffect(() => { setOrderedSeasons(sortedSeasons); }, [sortedSeasons]);

    const handleOpenModal = (season?: BreedingSeason) => {
        setEditingSeason(season);
        setModalOpen(true);
    };

    const handleSaveSeason = async (seasonData: Omit<BreedingSeason, 'id' | 'status'>) => {
        if (editingSeason) {
            await updateBreedingSeason(editingSeason.id, { ...seasonData });
        } else {
            await addBreedingSeason({ ...seasonData, status: 'Activo' });
        }
        setModalOpen(false);
        setEditingSeason(undefined);
    };

    if (orderedSeasons.length === 0) {
        return (
             <div className="text-center py-10 bg-brand-glass rounded-2xl flex flex-col items-center gap-2">
                <Zap size={32} className="text-zinc-600" />
                <p className="text-zinc-500 font-semibold">No hay temporadas de monta creadas.</p>
                <p className="text-xs text-zinc-600">Usa el botón de abajo para empezar a planificar.</p>
            </div>
        )
    }

    return (
        <>
            <Reorder.Group as="div" axis="y" values={orderedSeasons} onReorder={setOrderedSeasons} className="space-y-3">
                {orderedSeasons.map(season => (
                    <ReorderableSeasonItem
                        key={season.id}
                        season={season}
                        navigateTo={navigateTo}
                        onEdit={handleOpenModal}
                    />
                ))}
            </Reorder.Group>
            
            <div className="px-4 mt-4">
                <button 
                    onClick={() => handleOpenModal()}
                    className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base">
                    <Plus size={20} /> Crear Nueva Temporada
                </button>
            </div>


            <Modal isOpen={isModalOpen} onClose={() => { setModalOpen(false); setEditingSeason(undefined); }} title={editingSeason ? "Editar Temporada de Monta" : "Crear Temporada de Monta"}>
                <BreedingSeasonForm 
                    onSave={handleSaveSeason}
                    onCancel={() => { setModalOpen(false); setEditingSeason(undefined); }}
                    existingSeason={editingSeason}
                />
            </Modal>
        </>
    );
};