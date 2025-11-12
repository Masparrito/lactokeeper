// src/components/profile/EventsTab.tsx
// Componente para la pestaña de Eventos
// CORREGIDO: Eliminada importación de 'FileText' no usada

import React from 'react';
// 'FileText' se eliminó de 'lucide-react'
import { Animal } from '../../db/local';
import { EVENT_ICONS } from '../../config/eventIcons';

interface EventsTabProps {
    events: any[];
    animal: Animal | null | undefined;
}

export const EventsTab: React.FC<EventsTabProps> = ({ events, animal }) => {

    if (!events || events.length === 0) {
        return <div className="text-center p-8 text-zinc-500">Este animal no tiene eventos registrados.</div>;
    }
    return (
        <div className="space-y-3">
            {events.map((event: any) => {
                const eventMeta = EVENT_ICONS[event.type] || EVENT_ICONS['Default'];
                const IconComponent = eventMeta.icon;
                let displayDate = 'Fecha desconocida';
                let dateLabelPrefix = '';

                if (event.type === 'Registro Manual' && animal && animal.createdAt) {
                    displayDate = new Date(animal.createdAt).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' });
                    dateLabelPrefix = 'Registrado el: ';
                } else if (event.date && event.date !== 'N/A') {
                    try {
                        displayDate = new Date(event.date + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
                    } catch (e) {
                        console.error("Error formatting event date:", event.date, e);
                        displayDate = event.date;
                    }
                }

                return (
                    <div key={event.id} className="flex items-start gap-4 p-3 bg-black/20 rounded-lg">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${eventMeta.color}`}>
                            <IconComponent size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{event.type}</p>
                            <p className="text-sm text-zinc-300">{event.details}</p>
                            <p className="text-xs text-zinc-500 mt-1">
                                {dateLabelPrefix}{displayDate}
                                {event.lotName && ` | Lote: ${event.lotName}`}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};