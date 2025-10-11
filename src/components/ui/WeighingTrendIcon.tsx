// src/components/ui/WeighingTrendIcon.tsx

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Trend } from '../../hooks/useWeighingTrend';

interface WeighingTrendIconProps {
    trend: Trend;
    isLongTrend: boolean;
}

export const WeighingTrendIcon: React.FC<WeighingTrendIconProps> = ({ trend, isLongTrend }) => {
    // Si no hay tendencia o es un único pesaje, no se muestra nada.
    if (!trend || trend === 'single') return null;

    // --- MEJORA: Se definen clases de color más claras para cada estado ---
    const trendConfig = {
        up: {
            Icon: ArrowUp,
            color: 'text-brand-green',
        },
        down: {
            Icon: ArrowDown,
            color: 'text-brand-red',
        },
        stable: {
            // --- MEJORA: Se usa un ícono 'Minus' en lugar de un guion para mayor visibilidad ---
            Icon: Minus,
            color: 'text-zinc-400', // Un color neutro pero visible
        },
    };

    const { Icon, color } = trendConfig[trend];

    return (
        <div className={`flex items-center font-semibold text-sm ${color}`}>
            <Icon size={18} strokeWidth={3} />
            {isLongTrend && <span className="ml-0.5 font-bold">+</span>}
        </div>
    );
};