import React from 'react';
import { Modal } from '../ui/Modal';
import { PlanActivity } from '../../db/local';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import esLocale from '@fullcalendar/core/locales/es';
import { motion } from 'framer-motion';

interface PlanPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    activities: Omit<PlanActivity, 'id' | 'healthPlanId'>[];
    targetGroup: 'Maternidad' | 'Adultos';
}

// Función para generar los eventos del calendario a partir de las actividades del plan
const generatePreviewEvents = (activities: Omit<PlanActivity, 'id' | 'healthPlanId'>[], targetGroup: 'Maternidad' | 'Adultos') => {
    const events: { title: string, start: Date, backgroundColor: string, borderColor: string }[] = [];
    const today = new Date();
    const currentYear = today.getFullYear();

    activities.forEach((act) => {
        const color = act.category === 'Tratamiento' ? '#007AFF' : '#AF52DE'; // Azul para Tratamiento, Púrpura para Control

        if (targetGroup === 'Maternidad' && act.trigger.type === 'age' && act.trigger.days) {
            act.trigger.days.forEach(day => {
                const eventDate = new Date();
                eventDate.setDate(today.getDate() + day);
                events.push({
                    title: act.name,
                    start: eventDate,
                    backgroundColor: color,
                    borderColor: color,
                });
            });
        } else if (targetGroup === 'Adultos' && act.trigger.type === 'fixed_date_period' && act.trigger.month && act.trigger.week) {
            const dayOfMonth = (act.trigger.week - 1) * 7 + 1;
            const eventDate = new Date(currentYear, act.trigger.month - 1, dayOfMonth);
            events.push({
                title: act.name,
                start: eventDate,
                backgroundColor: color,
                borderColor: color,
            });
        }
    });

    return events;
};

export const PlanPreviewModal: React.FC<PlanPreviewModalProps> = ({ isOpen, onClose, activities, targetGroup }) => {
    const previewEvents = React.useMemo(() => generatePreviewEvents(activities, targetGroup), [activities, targetGroup]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full max-w-2xl mx-auto p-4 sm:p-0"
            >
                {/* --- ENCABEZADO REDISEÑADO --- */}
                <div className="mb-4">
                    <h2 className="text-3xl sm:text-4xl font-bold text-white leading-none">Previsualización del Plan</h2>
                    <p className="text-zinc-400 mt-2">
                        {targetGroup === 'Maternidad'
                            ? 'Este calendario simula las fechas de las actividades asumiendo un nacimiento el día de hoy.'
                            : 'Este calendario muestra la distribución de las actividades a lo largo del año actual.'}
                    </p>
                </div>
                
                {/* Asegúrate de que tus estilos del calendario (CalendarStyles.css) se importen globalmente */}
                <div className="h-[55vh] sm:h-[60vh] text-white">
                    <FullCalendar
                        plugins={[dayGridPlugin]}
                        initialView="dayGridMonth"
                        locale={esLocale}
                        events={previewEvents}
                        height="100%"
                        headerToolbar={{
                            left: 'prev,next',
                            center: 'title',
                            right: 'today'
                        }}
                    />
                </div>
                 <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="px-6 py-3 bg-brand-blue text-white font-bold rounded-xl w-full sm:w-auto">
                        Cerrar
                    </button>
                </div>
            </motion.div>
        </Modal>
    );
};