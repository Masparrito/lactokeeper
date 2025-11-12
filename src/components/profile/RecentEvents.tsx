// src/components/profile/RecentEvents.tsx
// Componente para la sección de "Últimos 3 Eventos" en la pestaña principal


import { FormGroup } from '../ui/FormGroup';
import { EVENT_ICONS } from '../../config/eventIcons';

export const RecentEvents = ({ events }: { events: any[] }) => {
    const recentEvents = events.slice(0, 3);

    if (recentEvents.length === 0) {
        return (
            <FormGroup title="Últimos 3 Eventos">
                <div className="text-center p-4 text-zinc-500">
                    No hay eventos recientes.
                </div>
            </FormGroup>
        );
    }

    return (
        <FormGroup title="Últimos 3 Eventos">
            {recentEvents.map((event: any) => {
                const eventMeta = EVENT_ICONS[event.type] || EVENT_ICONS['Default'];
                const IconComponent = eventMeta.icon;
                let displayDate = 'Fecha desconocida';
                if (event.date && event.date !== 'N/A') {
                    try {
                        displayDate = new Date(event.date + 'T00:00:00Z').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
                    } catch (e) { displayDate = event.date; }
                }

                return (
                    <div key={event.id} className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${eventMeta.color}`}>
                            <IconComponent size={20} />
                        </div>
                        <div>
                            <p className="font-semibold text-white">{event.type}</p>
                            <p className="text-sm text-zinc-300">{event.details}</p>
                            <p className="text-xs text-zinc-500 mt-1">{displayDate}</p>
                        </div>
                    </div>
                );
            })}
        </FormGroup>
    );
};