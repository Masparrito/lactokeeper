import React, { useState, useMemo, useRef } from 'react';
// --- INICIO CORRECCIÓN (Error TS2304) ---
// Importamos 'AgendaTask' que es necesario para el estado 'loggingTask'
import { useHealthAgenda, GroupedAgendaTask, AgendaTask } from '../../../hooks/useHealthAgenda';
// --- FIN CORRECCIÓN ---
import { Modal } from '../../../components/ui/Modal';
import { LogHealthEventForm } from '../../../components/forms/LogHealthEventForm'; 
import { Plus, Calendar, AlertTriangle, Check, Clock, Users } from 'lucide-react';
import { LogUnplannedHealthEventForm } from '../../../components/forms/LogUnplannedHealthEventForm';
import { motion, useAnimation, PanInfo } from 'framer-motion';
// Componentes movidos al nivel superior (sin cambios en imports)


// =================================================================================
// --- COMPONENTES INTERNOS ---
// =================================================================================

// --- Modal de Detalle de Actividad (Lista de Animales) ---
interface ActivityDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    taskGroup: GroupedAgendaTask | null;
}

const ActivityDetailModal: React.FC<ActivityDetailModalProps> = ({ isOpen, onClose, taskGroup }) => {
    if (!isOpen || !taskGroup) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={taskGroup.activity.name}>
            <div className="flex flex-col space-y-3 max-h-[60vh] overflow-y-auto">
                <p className="text-zinc-400 text-sm">
                    Esta actividad aplica a los siguientes {taskGroup.animalCount} animales:
                </p>
                <div className="bg-black/20 rounded-lg p-2 space-y-1">
                    {taskGroup.animals.map(animal => (
                        <div key={animal.id} className="flex justify-between items-center p-2 rounded hover:bg-zinc-700/50">
                            <div>
                                <p className="font-mono text-white font-semibold">{animal.id}</p>
                                <p className="text-xs text-zinc-400">{animal.name || 'Sin Nombre'}</p>
                            </div>
                            <span className="text-xs text-zinc-500">{animal.location || 'N/A'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
};

// --- Componente de Tarjeta Agrupada Swipeable ---
const GroupedActivityCard = ({ task, onMarkDone, onClick }: { 
    task: GroupedAgendaTask, 
    onMarkDone: () => void,
    onClick: () => void
}) => {
    const { activity, dueDate, status, animalCount } = task;
    const isOverdue = status === 'Atrasada';

    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 80;

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (offset > buttonsWidth / 2 || velocity > 500) {
            swipeControls.start({ x: buttonsWidth });
            setTimeout(() => onMarkDone(), 150);
        } else {
            swipeControls.start({ x: 0 });
        }
        setTimeout(() => { dragStarted.current = false; }, 50);
    };

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            <div className="absolute inset-y-0 left-0 flex items-center justify-start z-0 h-full w-[80px] bg-brand-green text-white">
                <div className="flex flex-col items-center justify-center w-full">
                    <Check size={20} />
                    <span className="text-[10px] mt-0.5 font-semibold">Hecho</span>
                </div>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center justify-end z-0 h-full w-[80px] bg-brand-blue text-white opacity-30">
                <div className="flex flex-col items-center justify-center w-full">
                    <Clock size={20} />
                    <span className="text-[10px] mt-0.5 font-semibold">Mover</span>
                </div>
            </div>

            <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: buttonsWidth }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) onClick(); }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-4 flex items-center gap-4"
            >
                {isOverdue && (
                    <div className="flex-shrink-0 text-brand-red" title="Actividad Vencida">
                        <AlertTriangle size={24} />
                    </div>
                )}
                <div className="flex-grow min-w-0">
                    <p className="font-semibold text-white truncate">{activity.name}</p>
                    <p className="text-sm text-zinc-400 flex items-center gap-1.5">
                        <Users size={14} />
                        {animalCount} {animalCount === 1 ? 'animal' : 'animales'}
                    </p>
                </div>
                <div className="flex-shrink-0 text-right">
                    <p className={`font-semibold text-sm ${isOverdue ? 'text-brand-red' : 'text-zinc-300'}`}>
                        {new Date(dueDate).toLocaleString('es-VE', { timeZone: 'UTC' })}
                    </p>
                    <p className="text-xs text-zinc-500">{status}</p>
                </div>
            </motion.div>
        </div>
    );
};
// =================================================================================
// --- FIN DE COMPONENTES
// =================================================================================


export default function HealthCalendarPage() {
    // --- INICIO CORRECCIÓN (Error TS2339) ---
    // El hook ahora devuelve 'overdueWeeks' y 'upcomingWeeks'
    const { overdueWeeks, upcomingWeeks } = useHealthAgenda();
    // --- FIN CORRECCIÓN ---
    
    // Esta línea ahora es válida gracias a la corrección de importación
    const [loggingTask, setLoggingTask] = useState<AgendaTask | null>(null);
    
    const [isUnplannedModalOpen, setIsUnplannedModalOpen] = useState(false);
    const [detailTaskGroup, setDetailTaskGroup] = useState<GroupedAgendaTask | null>(null);
    
    // --- INICIO CORRECCIÓN (Errores TS2339 y Lógica) ---
    // Creamos 'overdueTasks' aplanando las actividades de 'overdueWeeks'
    const overdueTasks = useMemo(() => {
        // flatMap toma todas las listas 'activities' de cada 'week' y las une en una sola lista
        return overdueWeeks.flatMap(week => week.activities);
    }, [overdueWeeks]);
    // --- FIN CORRECCIÓN ---

    // --- INICIO CORRECCIÓN (Errores TS2339, TS7006 y Lógica) ---
    // Creamos 'allUpcomingTasks' aplanando las actividades de 'upcomingWeeks'
    const allUpcomingTasks = useMemo(() => {
        // Esto corrige el error TS7006 porque 'upcomingWeeks' está bien tipado (no es 'any')
        return upcomingWeeks.flatMap(week => week.activities);
    }, [upcomingWeeks]);
    // --- FIN CORRECCIÓN ---

    const handleEventClick = (taskGroup: GroupedAgendaTask) => {
        if (taskGroup.tasks.length > 0) {
            setLoggingTask(taskGroup.tasks[0]);
        }
    };

    const handleSaveSuccess = () => {
        setIsUnplannedModalOpen(false);
        setLoggingTask(null);
    };

    return (
        <>
            <div className="w-full h-full max-w-2xl mx-auto flex flex-col">
                
                <header className="flex justify-between items-center p-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">StockCare</h1>
                        <p className="text-lg text-zinc-400">Agenda Sanitaria</p>
                    </div>
                    <div className="flex items-center gap-2">
                         <button
                            onClick={() => setIsUnplannedModalOpen(true)}
                            className="flex-shrink-0 bg-brand-blue text-white font-semibold p-2 rounded-lg transition-colors"
                            title="Registrar Actividad"
                        >
                            <Plus size={20} />
                        </button>
                         <button
                            onClick={() => alert('Modal de Calendario (en desarrollo)')}
                            className="flex-shrink-0 bg-zinc-700 text-white font-semibold p-2 rounded-lg transition-colors"
                            title="Ver Calendario"
                        >
                            <Calendar size={20} />
                        </button>
                    </div>
                </header>

                <div className="flex-grow overflow-y-auto px-4 space-y-6 pb-4">
                    
                    {/* Esta sección ahora usa el 'overdueTasks' corregido */}
                    {overdueTasks.length > 0 && (
                        <section className="animate-fade-in">
                            <h2 className="text-xl font-semibold text-brand-red mb-3">Vencidas</h2>
                            <div className="space-y-3">
                                {overdueTasks.map(taskGroup => (
                                    <GroupedActivityCard 
                                        key={taskGroup.groupKey} 
                                        task={taskGroup}
                                        onMarkDone={() => handleEventClick(taskGroup)}
                                        onClick={() => setDetailTaskGroup(taskGroup)}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Esta sección ahora usa 'allUpcomingTasks' corregido (y corrige TS7006) */}
                    <section className="animate-fade-in">
                        <h2 className="text-xl font-semibold text-zinc-300 mb-3">Próximas</h2>
                        {allUpcomingTasks.length > 0 ? (
                            <div className="space-y-3">
                                {allUpcomingTasks.map(taskGroup => ( // 'taskGroup' ahora está correctamente tipado
                                    <GroupedActivityCard 
                                        key={taskGroup.groupKey} 
                                        task={taskGroup}
                                        onMarkDone={() => handleEventClick(taskGroup)}
                                        onClick={() => setDetailTaskGroup(taskGroup)}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 bg-brand-glass rounded-2xl">
                                <p className="text-zinc-500">No hay actividades próximas agendadas.</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>

            {/* Modal para registrar evento "Realizado" (usa LogHealthEventForm) */}
            {loggingTask && (
                <Modal    
                    isOpen={!!loggingTask}    
                    onClose={() => setLoggingTask(null)}    
                    title={`Registrar: ${loggingTask.activity.name}`}
                >
                    <LogHealthEventForm    
                        task={loggingTask}
                        onSave={handleSaveSuccess}
                        onCancel={() => setLoggingTask(null)}
                    />
                </Modal>
            )}

             <Modal
                isOpen={isUnplannedModalOpen}
                onClose={() => setIsUnplannedModalOpen(false)}
                title="Registrar Actividad No Planificada"
            >
                <LogUnplannedHealthEventForm
                    onSaveSuccess={handleSaveSuccess}
                    onCancel={() => setIsUnplannedModalOpen(false)}
                />
            </Modal>
            
            {/* Modal para ver la lista de animales */}
            <ActivityDetailModal
                isOpen={!!detailTaskGroup}
                onClose={() => setDetailTaskGroup(null)}
                taskGroup={detailTaskGroup}
            />

            {/* Modales de reprogramación eliminados (lógica del componente original) */}
        </>
    );
}