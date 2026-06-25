import { useMemo } from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { getCleanId } from '../../../utils/formatting';
import { FamachaScore } from '../../../db/local';
import { calcularIndice, ultimaRevPorAnimal } from '../../../utils/famachaLogic';

const scoreColor: Record<FamachaScore, string> = {
    1: 'bg-emerald-600',
    2: 'bg-green-500',
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-red-600',
};

export function FamachaIndexPage() {
    const { animals, famachaRevs } = useData();

    const activos = useMemo(
        () => animals.filter(a => a.status === 'Activo' && !a.isReference),
        [animals]
    );
    const activeIds = useMemo(() => activos.map(a => a.id), [activos]);

    const resultado = useMemo(
        () => calcularIndice(famachaRevs, activeIds),
        [famachaRevs, activeIds]
    );

    // Animales en alerta: última revisión con score >= 4
    const enAlerta = useMemo(() => {
        const ultimas = ultimaRevPorAnimal(famachaRevs);
        const activeSet = new Set(activeIds);
        return famachaRevs
            .length === 0
            ? []
            : Array.from(ultimas.values())
                  .filter(r => activeSet.has(r.animalId) && r.score >= 4)
                  .sort((a, b) => b.score - a.score || a.arete.localeCompare(b.arete, undefined, { numeric: true }));
    }, [famachaRevs, activeIds]);

    const { indice, interpretacion, distribucion, totalConRevision } = resultado;
    const maxDist = Math.max(1, ...([1, 2, 3, 4, 5] as FamachaScore[]).map(s => distribucion[s]));

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-4 mt-2">
            {/* Tarjeta del índice */}
            <div className="bg-brand-glass rounded-2xl border border-brand-border p-5 text-center">
                <div className="flex items-center justify-center gap-2 text-zinc-400 text-sm uppercase font-semibold">
                    <Activity size={16} />
                    <span>Índice de salud del rebaño</span>
                </div>
                <p className="text-6xl font-bold mt-2" style={{ color: interpretacion.color }}>
                    {indice === null ? '—' : indice.toFixed(2)}
                </p>
                <p className="text-xl font-bold mt-1" style={{ color: interpretacion.color }}>
                    {interpretacion.estado}
                </p>
                <p className="text-sm text-zinc-400 mt-1">{interpretacion.accion}</p>
                <p className="text-xs text-zinc-500 mt-3">
                    Basado en la última revisión de {totalConRevision} de {activos.length} animales activos.
                </p>
            </div>

            {/* Distribución por score */}
            <div className="bg-brand-glass rounded-2xl border border-brand-border p-4">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3">Distribución (última revisión)</h3>
                <div className="space-y-2">
                    {([1, 2, 3, 4, 5] as FamachaScore[]).map(score => {
                        const count = distribucion[score];
                        const pct = (count / maxDist) * 100;
                        return (
                            <div key={score} className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold ${scoreColor[score]}`}>
                                    {score}
                                </span>
                                <div className="flex-1 h-5 bg-zinc-800 rounded-md overflow-hidden">
                                    <div className={`h-full ${scoreColor[score]} transition-all`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="w-8 text-right text-sm text-zinc-300 font-mono">{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Animales en alerta */}
            <div className="bg-brand-glass rounded-2xl border border-brand-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300 mb-3">
                    <AlertTriangle size={16} className="text-orange-400" />
                    En alerta (Famacha 4-5)
                </h3>
                {enAlerta.length === 0 ? (
                    <p className="text-sm text-zinc-500 text-center py-2">Ninguno en su última revisión. 👍</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {enAlerta.map(r => (
                            <span
                                key={r.animalId}
                                className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${scoreColor[r.score as FamachaScore]}`}
                            >
                                {getCleanId(r.arete)} · F{r.score}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
