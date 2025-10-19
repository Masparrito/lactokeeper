import { useState, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useHealthAgenda, AgendaTask } from '../../../hooks/useHealthAgenda';
import { Modal } from '../../../components/ui/Modal';
import { LogHealthEventForm } from '../../../components/forms/LogHealthEventForm';
import { Plus } from 'lucide-react';
import { LogUnplannedHealthEventForm } from '../../../components/forms/LogUnplannedHealthEventForm';
import { motion } from 'framer-motion';

// Importar los estilos personalizados
import './CalendarStyles.css';

export default function HealthCalendarPage() {
    const { allTasks } = useHealthAgenda();
    const [loggingTask, setLoggingTask] = useState<AgendaTask | null>(null);
    const [isUnplannedModalOpen, setIsUnplannedModalOpen] = useState(false);
    const calendarRef = useRef<FullCalendar>(null);
    const [view, setView] = useState('dayGridMonth');
    const [calendarTitle, setCalendarTitle] = useState('');

    const events = useMemo(() => allTasks.map(task => ({
        id: task.key,
        title: `${task.animal.id} - ${task.activity.name}`,
        start: task.dueDate,
        allDay: true,
        extendedProps: { task },
        backgroundColor: task.status === 'Atrasada' ? '#FF3B30' : (task.status === 'Para Hoy' ? '#34C759' : '#007AFF'),
        borderColor: task.status === 'Atrasada' ? '#FF3B30' : (task.status === 'Para Hoy' ? '#34C759' : '#007AFF'),
    })), [allTasks]);

    const handleEventClick = (clickInfo: any) => {
        setLoggingTask(clickInfo.event.extendedProps.task);
    };

    const handleSaveSuccess = () => {
        setLoggingTask(null);
        setIsUnplannedModalOpen(false);
    };

    const changeView = (newView: string) => {
        calendarRef.current?.getApi().changeView(newView);
        setView(newView);
    };
    
    // Función para actualizar el título del calendario
    const handleDatesSet = (dateInfo: any) => {
        setCalendarTitle(dateInfo.view.title);
    };

    return (
        <>
            <div className="w-full h-full max-w-4xl mx-auto p-4 flex flex-col">
                <header className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-4">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight">Calendario Sanitario</h1>
                        <p className="text-base sm:text-lg text-zinc-400">Vista completa de actividades</p>
                    </div>
                     <button
                        onClick={() => setIsUnplannedModalOpen(true)}
                        className="flex-shrink-0 flex items-center justify-center gap-2 bg-brand-blue text-white font-semibold py-2 px-4 rounded-lg transition-colors text-sm w-full sm:w-auto"
                    >
                        <Plus size={16} /> Registrar Actividad
                    </button>
                </header>

                <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
                     <div className="flex items-center gap-2">
                        <button onClick={() => calendarRef.current?.getApi().prev()} className="p-2 bg-zinc-700 rounded-md hover:bg-zinc-600">‹</button>
                        <button onClick={() => calendarRef.current?.getApi().next()} className="p-2 bg-zinc-700 rounded-md hover:bg-zinc-600">›</button>
                        <h2 className="text-xl font-semibold text-white capitalize w-40 text-center">{calendarTitle}</h2>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => calendarRef.current?.getApi().today()} className="px-4 py-1.5 bg-zinc-700 rounded-md hover:bg-zinc-600 text-sm font-semibold">Hoy</button>
                        <div className="relative flex justify-between rounded-lg bg-zinc-700 p-1 text-sm font-semibold">
                            <button onClick={() => changeView('dayGridMonth')} className="relative z-10 w-20 py-1 rounded-md">Mes</button>
                            <button onClick={() => changeView('dayGridWeek')} className="relative z-10 w-20 py-1 rounded-md">Semana</button>
                            <motion.div layoutId="calendar-view-bg" transition={{ type: "spring", stiffness: 400, damping: 30 }} className={`absolute top-1 h-[calc(100%-0.5rem)] w-20 rounded-md bg-zinc-500 ${view === 'dayGridWeek' ? 'left-[calc(50%_-_2px)]' : 'left-1'}`} />
                        </div>
                    </div>
                </div>

                <div className="flex-grow">
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView={view}
                        locale={esLocale}
                        events={events}
                        eventClick={handleEventClick}
                        height="100%"
                        headerToolbar={false}
                        datesSet={handleDatesSet}
                    />
                </div>
            </div>

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
        </>
    );
}