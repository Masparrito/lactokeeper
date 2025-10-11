// src/pages/modules/salud/HealthPlannerPage.tsx

import { useState, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { Plus, ChevronRight, ClipboardList, Edit, Trash2 } from 'lucide-react';
import { HealthPlan } from '../../../db/local';
import { Modal } from '../../../components/ui/Modal';
import { HealthPlanForm } from '../../../components/forms/HealthPlanForm';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { motion, useAnimation, PanInfo } from 'framer-motion';

// Definimos el tipo para la función de navegación que recibiremos
type SaludPageNavigation = { name: 'plan-detail', planId: string };

// --- MEJORA: Convertimos PlanCard en un componente interactivo con Swipe ---
const SwipeablePlanCard = ({ plan, onClick, onEdit, onDelete }: { plan: HealthPlan, onClick: () => void, onEdit: () => void, onDelete: () => void }) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 160; // 80px para Editar + 80px para Eliminar

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        // Si el arrastre es mínimo, lo tratamos como un clic
        if (Math.abs(offset) < 5) { onClick(); return; }
        
        // Si se desliza lo suficiente hacia la izquierda, muestra los botones
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            swipeControls.start({ x: -buttonsWidth });
        } else {
            swipeControls.start({ x: 0 }); // Vuelve a la posición original
        }
        setTimeout(() => { dragStarted.current = false; }, 100);
    };

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            {/* Botones de acción ocultos */}
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <button onClick={onEdit} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Edit size={22} /><span className="text-xs mt-1 font-semibold">Editar</span>
                </button>
                <button onClick={onDelete} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-red text-white">
                    <Trash2 size={22} /><span className="text-xs mt-1 font-semibold">Eliminar</span>
                </button>
            </div>

            {/* Contenido principal arrastrable */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) { onClick(); } }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-4"
            >
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-lg text-white">{plan.name}</p>
                        <p className="text-sm text-zinc-400 mt-1">{plan.description}</p>
                    </div>
                    <ChevronRight className="text-zinc-600" />
                </div>
            </motion.div>
        </div>
    );
};


interface HealthPlannerPageProps {
    navigateTo: (page: SaludPageNavigation) => void;
}

export default function HealthPlannerPage({ navigateTo }: HealthPlannerPageProps) {
    const { healthPlans, addHealthPlan, updateHealthPlan, deleteHealthPlan } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<HealthPlan | undefined>(undefined);
    const [deleteConfirmation, setDeleteConfirmation] = useState<HealthPlan | null>(null);

    const handleOpenModal = (plan?: HealthPlan) => {
        setEditingPlan(plan);
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingPlan(undefined);
    };

    const handleSavePlan = async (planData: Omit<HealthPlan, 'id'>) => {
        if (editingPlan?.id) {
            await updateHealthPlan(editingPlan.id, planData);
        } else {
            await addHealthPlan(planData);
        }
        handleCloseModal();
    };
    
    const handleDelete = async () => {
        if (deleteConfirmation?.id) {
            await deleteHealthPlan(deleteConfirmation.id);
        }
        setDeleteConfirmation(null);
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4">
                <header className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Planificador Sanitario</h1>
                    <p className="text-lg text-zinc-400">Define tus Protocolos y Planes</p>
                </header>

                <button    
                    onClick={() => handleOpenModal()}
                    className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-xl transition-colors text-base">
                    <Plus size={18} /> Crear Nuevo Plan Sanitario
                </button>

                <div className="space-y-3 pt-4">
                    {healthPlans.length > 0 ? (
                        healthPlans.map(plan => (
                            <SwipeablePlanCard    
                                key={plan.id}    
                                plan={plan}    
                                onClick={() => navigateTo({ name: 'plan-detail', planId: plan.id! })}
                                onEdit={() => handleOpenModal(plan)}
                                onDelete={() => setDeleteConfirmation(plan)}
                            />
                        ))
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl flex flex-col items-center gap-4">
                            <ClipboardList size={48} className="text-zinc-600" />
                            <p className="text-zinc-500">Aún no has creado ningún plan sanitario.</p>
                            <p className="text-zinc-500 text-sm">Usa el botón de arriba para empezar a definir tus protocolos.</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPlan ? "Editar Plan Sanitario" : "Crear Nuevo Plan Sanitario"}>
                <HealthPlanForm    
                    onSave={handleSavePlan}
                    onCancel={handleCloseModal}
                    existingPlan={editingPlan}
                />
            </Modal>
            
            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDelete}
                title={`Eliminar Plan "${deleteConfirmation?.name}"`}
                message="¿Estás seguro? Al eliminar el plan, también se eliminarán todas sus tareas asociadas. Esta acción no se puede deshacer."
            />
        </>
    );
}