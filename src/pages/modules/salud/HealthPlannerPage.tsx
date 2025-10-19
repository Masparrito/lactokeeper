import { useState, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { Plus, ChevronRight, ClipboardList, Trash2, Loader2 } from 'lucide-react';
import { HealthPlan, PlanActivity } from '../../../db/local';
import { Modal } from '../../../components/ui/Modal';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { HealthPlanBuilderForm } from '../../../components/forms/HealthPlanBuilderForm';

type SaludPageNavigation = { name: 'plan-detail', planId: string };

// --- COMPONENTE DE TARJETA DESLIZABLE PARA UN PLAN SANITARIO ---
const SwipeablePlanCard = ({ plan, onClick, onDelete, isDeleting }: { plan: HealthPlan, onClick: () => void, onDelete: () => void, isDeleting: boolean }) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 80;

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (Math.abs(offset) < 5 && !dragStarted.current) {
            onClick();
            return;
        }

        if (offset < -buttonsWidth / 2 || velocity < -500) {
            swipeControls.start({ x: -buttonsWidth });
        } else {
            swipeControls.start({ x: 0 });
        }
        setTimeout(() => { dragStarted.current = false; }, 100);
    };

    return (
        <div className={`relative w-full overflow-hidden rounded-2xl bg-dashboard-surface border border-brand-border transition-opacity ${isDeleting ? 'opacity-50' : 'opacity-100'}`}>
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <button onClick={onDelete} onPointerDown={(e) => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-red text-white transition-colors hover:bg-red-600">
                    <Trash2 size={22} /><span className="text-xs mt-1 font-semibold">Eliminar</span>
                </button>
            </div>

            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current && !isDeleting) onClick(); }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-4"
            >
                <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-lg text-white">{plan.name}</p>
                        <p className="text-sm text-zinc-400 mt-1">{plan.description || `Plan para ${plan.targetGroup}`}</p>
                    </div>
                    {isDeleting ? <Loader2 className="animate-spin text-zinc-400" /> : <ChevronRight className="text-zinc-600" />}
                </div>
            </motion.div>
        </div>
    );
};

// --- COMPONENTE PRINCIPAL DE LA PÁGINA DEL PLANIFICADOR ---
interface HealthPlannerPageProps {
    navigateTo: (page: SaludPageNavigation) => void;
}

export default function HealthPlannerPage({ navigateTo }: HealthPlannerPageProps) {
    const { healthPlans, deleteHealthPlan, addHealthPlanWithActivities } = useData();
    const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState<HealthPlan | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null); // <-- NUEVO ESTADO PARA EL FEEDBACK

    const handleSavePlan = async (plan: { name: string; description?: string; targetGroup: 'Maternidad' | 'Adultos' }, activities: Omit<PlanActivity, 'id' | 'healthPlanId'>[]) => {
        await addHealthPlanWithActivities(plan, activities);
        setIsBuilderModalOpen(false);
    };

    const handleDelete = async () => {
        if (deleteConfirmation?.id) {
            setDeletingId(deleteConfirmation.id);
            setDeleteConfirmation(null); // Cerrar el modal de confirmación inmediatamente
            try {
                await deleteHealthPlan(deleteConfirmation.id);
            } catch (error) {
                console.error("Error al eliminar el plan:", error);
                // Aquí podrías mostrar una alerta de error al usuario
            } finally {
                setDeletingId(null);
            }
        }
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4">
                <header className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Planificador Sanitario</h1>
                    <p className="text-lg text-zinc-400">Define tus Protocolos y Planes</p>
                </header>

                <button
                    onClick={() => setIsBuilderModalOpen(true)}
                    className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:opacity-90 text-black font-bold py-3 px-4 rounded-xl transition-colors text-base">
                    <Plus size={18} /> Crear Nuevo Plan Sanitario
                </button>

                <div className="space-y-3 pt-4">
                    {healthPlans.length > 0 ? (
                        healthPlans.map(plan => (
                            <SwipeablePlanCard
                                key={plan.id}
                                plan={plan}
                                onClick={() => navigateTo({ name: 'plan-detail', planId: plan.id! })}
                                onDelete={() => setDeleteConfirmation(plan)}
                                isDeleting={deletingId === plan.id}
                            />
                        ))
                    ) : (
                        <div className="text-center py-10 bg-dashboard-surface rounded-2xl flex flex-col items-center gap-4">
                            <ClipboardList size={48} className="text-zinc-600" />
                            <p className="text-zinc-400 font-semibold">Aún no has creado ningún plan.</p>
                            <p className="text-zinc-500 text-sm">Usa el botón de arriba para empezar.</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isBuilderModalOpen} onClose={() => setIsBuilderModalOpen(false)} title="">
                <HealthPlanBuilderForm
                    onSave={handleSavePlan}
                    onCancel={() => setIsBuilderModalOpen(false)}
                />
            </Modal>

            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDelete}
                title={`Eliminar Plan "${deleteConfirmation?.name}"`}
                message="¿Estás seguro? Al eliminar el plan, también se eliminarán todas sus actividades asociadas. Esta acción no se puede deshacer."
            />
        </>
    );
}