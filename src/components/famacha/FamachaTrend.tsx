// src/components/famacha/FamachaTrend.tsx
// Piezas visuales compartidas del módulo Famacha (flecha de tendencia y punto de score).
import { ArrowUpRight, ArrowDownRight, ArrowRight } from 'lucide-react';
import type { Tendencia } from '../../utils/famachaLogic';
import type { FamachaScore } from '../../db/local';

export const famachaScoreColor: Record<FamachaScore, string> = {
    1: 'bg-emerald-600',
    2: 'bg-green-600',
    3: 'bg-yellow-600',
    4: 'bg-orange-600',
    5: 'bg-red-600',
};

// Flecha de tendencia respecto a la revisión anterior.
// Famacha menor = mejor → mejoró = flecha verde hacia arriba.
export function TrendArrow({ tendencia, size = 16 }: { tendencia: Tendencia; size?: number }) {
    if (tendencia === 'mejoro') return <ArrowUpRight size={size} className="text-emerald-500" strokeWidth={2.75} aria-label="Mejoró" />;
    if (tendencia === 'empeoro') return <ArrowDownRight size={size} className="text-red-500" strokeWidth={2.75} aria-label="Empeoró" />;
    if (tendencia === 'igual') return <ArrowRight size={size} className="text-amber-500" strokeWidth={2.75} aria-label="Igual" />;
    return null;
}

export const tendenciaLabel: Record<Exclude<Tendencia, null>, string> = {
    mejoro: 'Mejoró',
    empeoro: 'Empeoró',
    igual: 'Igual',
};

export function FamachaScoreDot({ score, size = 28 }: { score: FamachaScore; size?: number }) {
    return (
        <span
            className={`inline-flex items-center justify-center rounded-lg text-white font-bold ${famachaScoreColor[score]}`}
            style={{ width: size, height: size, fontSize: size * 0.45 }}
        >
            {score}
        </span>
    );
}
