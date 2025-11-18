// src/components/profile/EventsTab.tsx
// CORREGIDO: Prop 'animal' eliminada (ya no es necesaria)

import React, { useState, useRef } from 'react';
// --- 'Animal' ya no se importa ---
import { EVENT_ICONS } from '../../config/eventIcons';
import { useData } from '../../context/DataContext';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Trash2, Edit } from 'lucide-react';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { EditEventNotesModal } from '../modals/EditEventNotesModal';

interface EventsTabProps {
    events: any[]; // Acepta 'any[]' para compatibilidad con useEvents
    // --- 'animal' prop eliminada ---
}

/**
 * --- SUBCOMPONENTE: EventCard ---
 * (Este componente no sufre cambios)
 */
const EventCard: React.FC<{ event: any }> = ({ event }) => {
    const { deleteEvent } = useData();
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    
    const buttonsWidth = 130; 

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

    const handleEdit = () => {
        if (event.id === 'manual-registration-event') {
             alert("El evento de 'Registro' no se puede editar.");
             swipeControls.start({ x: 0 });
             return;
        }
        setIsEditModalOpen(true);
        swipeControls.start({ x: 0 });
    };

    const handleDeleteClick = () => {
        setIsDeleteConfirmOpen(true);
        swipeControls.start({ x: 0 });
    };

    const confirmDelete = async () => {
        if (isDeleting) return;
        setIsDeleting(true);
        try {
            await deleteEvent(event.id);
            setIsDeleteConfirmOpen(false);
        } catch (e: any) {
            console.error("Error al eliminar evento:", e.message);
            alert(`Error al eliminar: ${e.message}`);
            setIsDeleting(false); 
        }
    };

    const eventMeta = EVENT_ICONS[event.type] || EVENT_ICONS['Default'];
    const IconComponent = eventMeta.icon;
    let displayDate = 'Fecha desconocida';

    if (event.date && event.date !== 'N/A') {
        try {
            displayDate = new Date(event.date + 'T00:00:00Z').toLocaleString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
        } catch (e) {
            displayDate = event.date;
        }
    }

    // Lógica para deshabilitar botones en eventos "virtuales"
    const isVirtualEvent = event.id === 'manual-registration-event' ||
                           event.id.endsWith('_wean') ||
                           event.id.endsWith('_decom') ||
                           (event.type === 'Servicio' && !event.notes) || 
                           (event.type === 'Hito de Peso' && !event.notes);

    return (
        <>
            <div className="relative w-full overflow-hidden rounded-lg">
                {/* Botones Ocultos */}
                <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                    <button
                        onClick={handleEdit}
                        disabled={isVirtualEvent}
                        className="h-full w-[65px] flex flex-col items-center justify-center bg-brand-blue text-white disabled:bg-zinc-700 disabled:opacity-60"
                    >
                        <Edit size={20} />
                        <span className="text-xs mt-1 font-semibold">Editar</span>
                    </button>
                    <button
                        onClick={handleDeleteClick}
                        disabled={isVirtualEvent}
                        className="h-full w-[65px] flex flex-col items-center justify-center bg-brand-red text-white disabled:bg-zinc-700 disabled:opacity-60"
                    >
                        <Trash2 size={20} />
                        <span className="text-xs mt-1 font-semibold">Eliminar</span>
                    </button>
                </div>

                {/* Tarjeta Visible */}
                <motion.div
                    drag="x"
                    dragConstraints={{ left: -buttonsWidth, right: 0 }}
                    dragElastic={0.1}
                    onDragStart={() => { dragStarted.current = true; }}
                    onDragEnd={onDragEnd}
                    onTap={() => { if (!dragStarted.current) swipeControls.start({ x: 0 }); }}
                    animate={swipeControls}
                    transition={{ type: "spring", stiffness: 400, damping: 40 }}
                    className="relative w-full z-10 cursor-pointer flex items-start gap-4 p-3 bg-ios-modal-bg" 
                >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${eventMeta.color}`}>
                        <IconComponent size={20} />
                    </div>
                    <div>
                        <p className="font-semibold text-white">{event.type}</p>
                        <p className="text-sm text-zinc-300">{event.details}</p>
                        {event.notes && (
                            <p className="text-sm text-yellow-400/80 italic mt-1 pt-1 border-t border-zinc-700/50">Nota: {event.notes}</p>
                        )}
                        <p className="text-xs text-zinc-500 mt-1">
                            {displayDate}
                            {event.lotName && ` | Lote: ${event.lotName}`}
                        </p>
                    </div>
                </motion.div>
            </div>

            {/* Modal de Confirmación */}
            <ConfirmationModal
                isOpen={isDeleteConfirmOpen}
                onClose={() => setIsDeleteConfirmOpen(false)}
                onConfirm={confirmDelete}
                title="¿Eliminar Evento?"
                message={`¿Estás seguro de que quieres eliminar este evento? (${event.type}: ${event.details}). Si este evento creó un Parto o Aborto, ese registro también se eliminará. Esta acción no se puede deshacer.`}
            />

            {/* Modal de Edición */}
            {isEditModalOpen && (
                <EditEventNotesModal
                    event={event}
                    onClose={() => setIsEditModalOpen(false)}
                    onSaveSuccess={() => {
                        setIsEditModalOpen(false);
                    }}
                />
            )}
        </>
    );
};


/**
 * --- Componente Principal de la Pestaña ---
 */
// --- 'animal' prop eliminada de los argumentos ---
export const EventsTab: React.FC<EventsTabProps> = ({ events }) => {

    if (!events || events.length === 0) {
        return <div className="text-center p-8 text-zinc-500">Este animal no tiene eventos registrados.</div>;
    }
    
    // El evento de 'Registro' ya está incluido en la prop 'events' desde useEvents.ts
    const sortedEvents: any[] = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="space-y-3">
            {sortedEvents.map((event: any) => (
                <EventCard key={`${event.id}_${event.date}`} event={event} />
            ))}
        </div>
    );
};