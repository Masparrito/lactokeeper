// src/pages/modules/salud/AgendaPage.tsx

import React, { useState } from 'react'; // <-- Se añade useState
import { useHealthAgenda, AgendaTask } from '../../../hooks/useHealthAgenda';
import { AlertTriangle, CalendarCheck, CalendarClock } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal'; // <-- Se importa el Modal
import { LogHealthEventForm } from '../../../components/forms/LogHealthEventForm'; // <-- Se importa el nuevo formulario

// --- CAMBIO CLAVE 1: El componente TaskCard ahora necesita una función para abrir el modal ---
const TaskCard = ({ task, onRegisterClick }: { task: AgendaTask, onRegisterClick: (task: AgendaTask) => void }) => {
    const { animal, task: planTask, dueDate } = task;

    return (
        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center">
            <div className="flex-grow">
                <p className="font-bold text-lg text-white">{animal.id}</p>
                <p className="text-sm text-zinc-300">{planTask.name}</p>
                <p className="text-xs text-zinc-500 mt-1">
                    Plan: {task.plan.name}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <p className="text-sm font-semibold text-white">
                        {dueDate.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' })}
                    </p>
                    <p className="text-xs text-zinc-400">
                        {dueDate.toLocaleDateString('es-VE', { weekday: 'short' })}
                    </p>
                </div>
                <button 
                    onClick={() => onRegisterClick(task)} // Llama a la función del componente padre
                    className="bg-brand-green hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm"
                >
                    Registrar
                </button>
            </div>
        </div>
    );
};

const AgendaSection = ({ title, tasks, icon: Icon, colorClass, onRegisterClick }: { title: string, tasks: AgendaTask[], icon: React.ElementType, colorClass: string, onRegisterClick: (task: AgendaTask) => void }) => {
    if (tasks.length === 0) return null;

    return (
        <div className="space-y-3">
            <h3 className={`flex items-center gap-2 text-lg font-semibold ${colorClass}`}>
                <Icon size={20} />
                {title} ({tasks.length})
            </h3>
            <div className="space-y-2">
                {tasks.map(task => <TaskCard key={task.key} task={task} onRegisterClick={onRegisterClick} />)}
            </div>
        </div>
    );
};

export default function AgendaPage() {
    const { overdue, today, upcoming, allTasks } = useHealthAgenda();
    // --- CAMBIO CLAVE 2: Estado para controlar el modal y la tarea seleccionada ---
    const [loggingTask, setLoggingTask] = useState<AgendaTask | null>(null);

    const handleSaveSuccess = () => {
        // Simplemente cerramos el modal. El hook se actualizará automáticamente y la tarea desaparecerá de la lista.
        setLoggingTask(null);
    };

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in px-4">
                <header className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Agenda Sanitaria</h1>
                    <p className="text-lg text-zinc-400">Tareas de salud pendientes</p>
                </header>

                {allTasks.length === 0 ? (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl flex flex-col items-center gap-4">
                        <CalendarCheck size={48} className="text-zinc-600" />
                        <p className="text-zinc-400 font-semibold text-lg">¡Todo al día!</p>
                        <p className="text-zinc-500 text-sm">No hay tareas sanitarias pendientes en tu agenda.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <AgendaSection title="Atrasadas" tasks={overdue} icon={AlertTriangle} colorClass="text-brand-red" onRegisterClick={setLoggingTask} />
                        <AgendaSection title="Para Hoy" tasks={today} icon={CalendarCheck} colorClass="text-brand-green" onRegisterClick={setLoggingTask} />
                        <AgendaSection title="Próximas" tasks={upcoming} icon={CalendarClock} colorClass="text-zinc-300" onRegisterClick={setLoggingTask} />
                    </div>
                )}
            </div>

            {/* --- CAMBIO CLAVE 3: Se añade el Modal de registro --- */}
            {loggingTask && (
                <Modal 
                    isOpen={!!loggingTask} 
                    onClose={() => setLoggingTask(null)} 
                    title={`Registrar: ${loggingTask.task.name}`}
                >
                    <LogHealthEventForm 
                        task={loggingTask}
                        onSave={handleSaveSuccess}
                        onCancel={() => setLoggingTask(null)}
                    />
                </Modal>
            )}
        </>
    );
}