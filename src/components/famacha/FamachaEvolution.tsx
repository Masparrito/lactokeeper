// src/components/famacha/FamachaEvolution.tsx
// Evolución Famacha de un animal en sus últimas N revisiones (de izq. a der.,
// de más antigua a más reciente), con marca visual de en cuáles se desparasitó.
import { FamachaRev } from '../../db/local';
import { Syringe } from 'lucide-react';
import { TrendArrow, famachaScoreColor } from './FamachaTrend';
import { tendenciaFamacha } from '../../utils/famachaLogic';

const fmtShort = (f: string) => {
    try { return new Date(f + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', timeZone: 'UTC' }); }
    catch { return f; }
};

export function FamachaEvolution({ revs, animalId, limit = 5 }: { revs: FamachaRev[]; animalId: string; limit?: number }) {
    const items = revs
        .filter(r => r.animalId === animalId)
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
        .slice(0, limit)
        .reverse(); // cronológico: más antigua → más reciente

    if (items.length === 0) return <p className="text-xs text-c-text-faint">Sin revisiones.</p>;

    return (
        <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
            {items.map((r, i) => {
                const tend = tendenciaFamacha(revs, animalId, r.fecha, r.score);
                return (
                    <div key={r.id} className="flex items-center gap-1 flex-shrink-0">
                        {i > 0 && <TrendArrow tendencia={tend} size={14} />}
                        <div className={`flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1 ${r.dosis ? 'bg-orange-500/10 border border-orange-500/30' : ''}`}>
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold ${famachaScoreColor[r.score]}`}>{r.score}</div>
                            <span className="text-[9px] text-c-text-faint font-mono">{fmtShort(r.fecha)}</span>
                            {r.dosis
                                ? <span title="Se desparasitó" className="flex items-center gap-0.5 text-[9px] font-bold text-orange-500"><Syringe size={9} /> dosis</span>
                                : <span className="text-[9px] text-c-text-faint">sin dosis</span>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
