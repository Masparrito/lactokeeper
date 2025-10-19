import { useState, useMemo, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { ArrowLeft, Plus, Edit, Trash2, Calendar, Syringe, ClipboardCheck } from 'lucide-react';
import { PlanActivity } from '../../../db/local';
import { Modal } from '../../../components/ui/Modal';
import { PlanActivityForm } from '../../../components/forms/PlanActivityForm';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { motion, useAnimation, PanInfo } from 'framer-motion';

// Componente de Tarjeta Deslizable para una Actividad del Plan
const SwipeableActivityCard = ({ activity, onEdit, onDelete }: { activity: PlanActivity, onEdit: () => void, onDelete: () => void }) => {
    const { products } = useData();
    const product = products.find(p => p.id === activity.productId);
    const complementaryProduct = products.find(p => p.id === activity.complementaryProductId);
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 160;

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            swipeControls.start({ x: -buttonsWidth });
        } else {
            swipeControls.start({ x: 0 });
        }
        setTimeout(() => { dragStarted.current = false; }, 100);
    };
    
    const renderTriggerDescription = () => {
        const { trigger } = activity;
        switch(trigger.type) {
            case 'age':
                // Ahora muestra el arreglo de días
                return `Días: ${trigger.days?.join(', ') || 'N/A'}`;
            case 'fixed_date_period':
                const monthName = new Date(2024, trigger.month! - 1, 1).toLocaleString('es-VE', { month: 'long' });
                return `${trigger.week}a semana de ${monthName}`;
            case 'birthing_season_event':
                const prefix = trigger.offsetDays! >= 0 ? 'días después' : 'días antes';
                return `${Math.abs(trigger.offsetDays!)} ${prefix} del inicio de la temporada de partos`;
            default:
                return 'Tiempo no especificado';
        }
    };

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-black/20 border border-zinc-700">
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <button onClick={onEdit} onPointerDown={e => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white"><Edit size={20} /><span className="text-xs mt-1 font-semibold">Editar</span></button>
                <button onClick={onDelete} onPointerDown={e => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-red text-white"><Trash2 size={20} /><span className="text-xs mt-1 font-semibold">Eliminar</span></button>
            </div>

            <motion.div drag="x" dragConstraints={{ left: -buttonsWidth, right: 0 }} dragElastic={0.1} onDragStart={() => { dragStarted.current = true; }} onDragEnd={onDragEnd} animate={swipeControls} transition={{ type: "spring", stiffness: 400, damping: 40 }} className="relative w-full z-10 cursor-grab bg-ios-modal-bg/50 p-4">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="font-bold text-lg text-white">{activity.name}</p>
                        <p className={`text-sm font-semibold ${activity.category === 'Tratamiento' ? 'text-blue-400' : 'text-purple-400'}`}>{activity.category}</p>
                        {product && <p className="text-xs text-zinc-400 mt-1">Ppal: {product.name}</p>}
                        {complementaryProduct && <p className="text-xs text-zinc-400">Comp: {complementaryProduct.name}</p>}
                    </div>
                    {activity.category === 'Tratamiento' ? <Syringe className="text-blue-400" /> : <ClipboardCheck className="text-purple-400" />}
                </div>
                <div className="mt-3 pt-3 border-t border-zinc-700 flex items-center text-zinc-300">
                    <Calendar size={16} className="mr-2" />
                    <span className="text-sm font-semibold">{renderTriggerDescription()}</span>
                </div>
            </motion.div>
        </div>
    );
};

interface PlanDetailPageProps {
    planId: string;
    onBack: () => void;
}

export default function PlanDetailPage({ planId, onBack }: PlanDetailPageProps) {
    const { healthPlans, planActivities, addPlanActivity, updatePlanActivity, deletePlanActivity } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<PlanActivity | undefined>(undefined);
    const [deleteConfirmation, setDeleteConfirmation] = useState<PlanActivity | null>(null);

    const plan = useMemo(() => healthPlans.find(p => p.id === planId), [healthPlans, planId]);
    const activities = useMemo(() => {
        if (!plan) return [];
        return planActivities
            .filter(t => t.healthPlanId === planId)
            // --- CORRECCIÓN DE LÓGICA DE ORDENAMIENTO ---
            .sort((a, b) => (a.trigger.days?.[0] || 0) - (b.trigger.days?.[0] || 0));
    }, [planActivities, planId, plan]);

    const handleOpenModal = (activity?: PlanActivity) => {
        setEditingActivity(activity);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingActivity(undefined);
    };

    const handleSaveActivity = async (activityData: Omit<PlanActivity, 'id' | 'healthPlanId'> & { id?: string }) => {
        if (editingActivity?.id) {
            await updatePlanActivity(editingActivity.id, activityData);
        } else {
            await addPlanActivity({ ...activityData, healthPlanId: planId });
        }
        handleCloseModal();
    };

    const handleDelete = async () => {
        if (deleteConfirmation?.id) {
            await deletePlanActivity(deleteConfirmation.id);
        }
        setDeleteConfirmation(null);
    };

    if (!plan) {
        return (
            <div className="text-center p-10">
                <h1 className="text-2xl text-zinc-400">Plan no encontrado.</h1>
                <button onClick={onBack} className="mt-4 text-brand-amber">Volver al Planificador</button>
            </div>
        );
    }

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-6 pb-12 animate-fade-in px-4">
                <header className="flex items-center pt-8 pb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{plan.name}</h1>
                        <p className="text-lg text-zinc-400">{plan.targetGroup}</p>
                    </div>
                    <div className="w-8"></div>
                </header>

                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-zinc-300">Actividades del Plan</h2>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm"><Plus size={16} /> Añadir Actividad</button>
                    </div>
                    {activities.length > 0 ? (
                        <div className="space-y-3">
                            {activities.map(activity => <SwipeableActivityCard key={activity.id} activity={activity} onEdit={() => handleOpenModal(activity)} onDelete={() => setDeleteConfirmation(activity)} />)}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl"><p className="text-zinc-500 font-semibold">Este plan aún no tiene actividades.</p><p className="text-zinc-500 text-sm">Añade tratamientos o controles para empezar.</p></div>
                    )}
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingActivity ? "Editar Actividad" : "Añadir Actividad al Plan"}>
                <PlanActivityForm healthPlanId={plan.id!} targetGroup={plan.targetGroup} onSave={handleSaveActivity} onCancel={handleCloseModal} existingActivity={editingActivity} />
            </Modal>

            <ConfirmationModal isOpen={!!deleteConfirmation} onClose={() => setDeleteConfirmation(null)} onConfirm={handleDelete} title={`Eliminar Actividad "${deleteConfirmation?.name}"`} message="¿Estás seguro de que quieres eliminar esta actividad del plan? Esta acción no se puede deshacer." />
        </>
    );
}