// src/pages/modules/salud/PlanDetailPage.tsx

import { useState, useMemo, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { ArrowLeft, Plus, Edit, Trash2, Clock } from 'lucide-react';
import { HealthPlanTask } from '../../../db/local';
import { Modal } from '../../../components/ui/Modal';
import { HealthPlanTaskForm } from '../../../components/forms/HealthPlanTaskForm';
import { ConfirmationModal } from '../../../components/ui/ConfirmationModal';
import { motion, useAnimation, PanInfo } from 'framer-motion';

// --- MEJORA: Convertimos TaskCard en un componente interactivo con Swipe ---
const SwipeableTaskCard = ({ task, onEdit, onDelete }: { task: HealthPlanTask, onEdit: () => void, onDelete: () => void }) => {
    const { products } = useData();
    const product = products.find(p => p.id === task.productId);
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

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-black/20 border border-zinc-700">
            {/* Botones de acción ocultos */}
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <button onClick={onEdit} onPointerDown={e => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Edit size={20} /><span className="text-xs mt-1 font-semibold">Editar</span>
                </button>
                <button onClick={onDelete} onPointerDown={e => e.stopPropagation()} className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-red text-white">
                    <Trash2 size={20} /><span className="text-xs mt-1 font-semibold">Eliminar</span>
                </button>
            </div>

            {/* Contenido principal arrastrable */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-grab bg-ios-modal-bg/50"
            >
                <div className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold text-lg text-white">{task.name}</p>
                            <p className="text-sm text-teal-300">{task.type}</p>
                            <p className="text-xs text-zinc-400 mt-1">Producto: {product?.name || 'No especificado'}</p>
                        </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-zinc-700 flex items-center text-zinc-300">
                        <Clock size={16} className="mr-2" />
                        <span className="text-sm">Se activa a los <span className="font-bold text-white">{task.trigger.days}</span> días de edad</span>
                    </div>
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
    const { healthPlans, healthPlanTasks, addHealthPlanTask, updateHealthPlanTask, deleteHealthPlanTask } = useData();
    const [isTaskModalOpen, setTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<HealthPlanTask | undefined>(undefined);
    const [deleteConfirmation, setDeleteConfirmation] = useState<HealthPlanTask | null>(null);

    const plan = useMemo(() => healthPlans.find(p => p.id === planId), [healthPlans, planId]);
    const tasks = useMemo(() => {
        return healthPlanTasks
            .filter(t => t.healthPlanId === planId)
            .sort((a, b) => (a.trigger.days || 0) - (b.trigger.days || 0));
    }, [healthPlanTasks, planId]);

    const handleOpenModal = (task?: HealthPlanTask) => {
        setEditingTask(task);
        setTaskModalOpen(true);
    };

    const handleCloseModal = () => {
        setTaskModalOpen(false);
        setEditingTask(undefined);
    };

    const handleSaveTask = async (taskData: Omit<HealthPlanTask, 'id'>) => {
        if (editingTask?.id) {
            await updateHealthPlanTask(editingTask.id, taskData);
        } else {
            await addHealthPlanTask(taskData);
        }
        handleCloseModal();
    };

    const handleDelete = async () => {
        if (deleteConfirmation?.id) {
            await deleteHealthPlanTask(deleteConfirmation.id);
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
            <div className="w-full max-w-2xl mx-auto space-y-6 pb-12 animate-fade-in">
                <header className="flex items-center pt-8 pb-4 px-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <div className="text-center flex-grow">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{plan.name}</h1>
                        <p className="text-lg text-zinc-400">Detalles del Plan Sanitario</p>
                    </div>
                    <div className="w-8"></div>
                </header>

                <div className="px-4">
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border space-y-2">
                        <h3 className="text-sm font-semibold text-zinc-400">Descripción</h3>
                        <p className="text-white">{plan.description || 'Sin descripción.'}</p>
                        <h3 className="text-sm font-semibold text-zinc-400 pt-2">Criterios de Aplicación</h3>
                        <div className="flex flex-wrap gap-2">
                            {plan.targetCriteria.minAgeDays && <span className="bg-zinc-700 text-xs font-semibold px-2 py-1 rounded-full">Desde {plan.targetCriteria.minAgeDays} días</span>}
                            {plan.targetCriteria.maxAgeDays && <span className="bg-zinc-700 text-xs font-semibold px-2 py-1 rounded-full">Hasta {plan.targetCriteria.maxAgeDays} días</span>}
                            {plan.targetCriteria.categories?.map(cat => <span key={cat} className="bg-zinc-700 text-xs font-semibold px-2 py-1 rounded-full">{cat}</span>)}
                        </div>
                    </div>
                </div>

                <div className="space-y-4 px-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-zinc-300">Tareas del Plan</h2>
                        <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3 rounded-lg transition-colors text-sm">
                            <Plus size={16} /> Añadir Tarea
                        </button>
                    </div>
                    {tasks.length > 0 ? (
                        <div className="space-y-3">
                            {tasks.map(task => 
                                <SwipeableTaskCard 
                                    key={task.id} 
                                    task={task}
                                    onEdit={() => handleOpenModal(task)}
                                    onDelete={() => setDeleteConfirmation(task)}
                                />
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl">
                            <p className="text-zinc-500">Este plan aún no tiene tareas.</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isTaskModalOpen} onClose={handleCloseModal} title={editingTask ? "Editar Tarea" : "Añadir Tarea al Plan"}>
                <HealthPlanTaskForm
                    planId={plan.id!}
                    onSave={handleSaveTask}
                    onCancel={handleCloseModal}
                    existingTask={editingTask}
                />
            </Modal>

            <ConfirmationModal
                isOpen={!!deleteConfirmation}
                onClose={() => setDeleteConfirmation(null)}
                onConfirm={handleDelete}
                title={`Eliminar Tarea "${deleteConfirmation?.name}"`}
                message="¿Estás seguro de que quieres eliminar esta tarea del plan? Esta acción no se puede deshacer."
            />
        </>
    );
}