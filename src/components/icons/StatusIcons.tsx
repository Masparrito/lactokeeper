import React from 'react';
import { AnimalStatusKey, STATUS_DEFINITIONS } from '../../hooks/useAnimalStatus';

// Usamos el tipo que exportamos del hook para definir las props
type StatusObject = typeof STATUS_DEFINITIONS[AnimalStatusKey];

interface StatusIconsProps {
    statuses: StatusObject[];
}

export const StatusIcons: React.FC<StatusIconsProps> = ({ statuses }) => {
    // Si no hay estados, no renderizamos nada
    if (!statuses || statuses.length === 0) {
        return null;
    }

    // Ordenamos los iconos para que siempre aparezcan en el mismo orden (ej: productivo primero, luego reproductivo)
    const orderedStatuses = [...statuses].sort((a, b) => {
        const order = ['MILKING', 'DRYING_OFF', 'DRY', 'PREGNANT', 'IN_SERVICE_CONFIRMED', 'IN_SERVICE', 'EMPTY', 'SIRE_IN_SERVICE'];
        return order.indexOf(a.key) - order.indexOf(b.key);
    });

    return (
        <div className="flex items-center space-x-1.5">
            {orderedStatuses.map(({ key, Icon, color, label }) => (
                // El 'title' permite que al pasar el mouse sobre el icono (en escritorio) se muestre la etiqueta
                <span key={key} title={label}>
                    <Icon className={color} size={16} strokeWidth={2.5} />
                </span>
            ))}
        </div>
    );
};