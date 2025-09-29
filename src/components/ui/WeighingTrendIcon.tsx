// src/components/ui/WeighingTrendIcon.tsx

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { Trend } from '../../hooks/useWeighingTrend';

interface WeighingTrendIconProps {
    trend: Trend;
    isLongTrend: boolean;
}

export const WeighingTrendIcon: React.FC<WeighingTrendIconProps> = ({ trend, isLongTrend }) => {
    if (!trend || trend === 'single') return null;

    const trendClasses = {
        up: 'text-green-400',
        down: 'text-red-400',
        stable: 'text-zinc-500',
    };

    return (
        <div className={`flex items-center font-semibold text-sm ${trendClasses[trend]}`}>
            {trend === 'up' && <ArrowUp size={16} />}
            {trend === 'down' && <ArrowDown size={16} />}
            {trend === 'stable' && <Minus size={16} />}
            {isLongTrend && <span className="ml-0.5 font-bold">+</span>}
        </div>
    );
};