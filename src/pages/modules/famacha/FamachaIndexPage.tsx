import { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { FamachaScore } from '../../../db/local';
import { calcularIndice, famachaPeso } from '../../../utils/famachaLogic';

const scoreBadge: Record<FamachaScore, string> = {
    1: 'bg-emerald-600',
    2: 'bg-green-600',
    3: 'bg-yellow-600',
    4: 'bg-orange-600',
    5: 'bg-red-600',
};

const interpRows = [
    { rango: '0 – 0.8', estado: 'SANO', que: 'Vigilancia habitual', color: '#34C759' },
    { rango: '0.9 – 1.5', estado: 'VIGILAR', que: 'Acortar intervalo de revisión', color: '#FFD60A' },
    { rango: '1.6 – 2.5', estado: 'ALERTA', que: 'Revisar manejo y desparasitación', color: '#FF9500' },
    { rango: '+2.5', estado: 'CRÍTICO', que: 'Veterinario, revisar resistencia', color: '#FF3B30' },
];

export function FamachaIndexPage() {
    const { animals, famachaRevs } = useData();

    const activeIds = useMemo(() => animals.filter(a => a.status === 'Activo' && !a.isReference).map(a => a.id), [animals]);
    const { indice, puntaje, totalConRevision, interpretacion, distribucion } = useMemo(
        () => calcularIndice(famachaRevs, activeIds),
        [famachaRevs, activeIds]
    );

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-4">
            {/* Tabla de cálculo */}
            <div className="bg-c-surface rounded-2xl border border-c-border p-4">
                <h2 className="font-semibold text-c-text-strong flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> Índice de salud del rebaño
                </h2>
                <p className="text-xs text-c-text-muted mt-1 mb-4">
                    Última revisión de cada animal. Pesos: F1=0 · F2=1 · F3=2 · F4=3 · F5=4.
                </p>

                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-c-text-muted text-xs uppercase">
                            <th className="text-left font-semibold pb-2">Famacha</th>
                            <th className="text-right font-semibold pb-2">Animales</th>
                            <th className="text-right font-semibold pb-2">Puntos</th>
                            <th className="text-right font-semibold pb-2">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-c-border">
                        {([1, 2, 3, 4, 5] as FamachaScore[]).map(score => {
                            const count = distribucion[score];
                            const puntos = famachaPeso(score);
                            return (
                                <tr key={score}>
                                    <td className="py-2">
                                        <span className={`w-7 h-7 rounded-md inline-flex items-center justify-center text-white text-xs font-bold ${scoreBadge[score]}`}>{score}</span>
                                    </td>
                                    <td className="text-right text-c-text-strong">{count}</td>
                                    <td className="text-right text-c-text-muted">{puntos}</td>
                                    <td className="text-right text-c-text-strong font-mono">{count * puntos}</td>
                                </tr>
                            );
                        })}
                        <tr className="font-bold text-c-text-strong">
                            <td className="py-2">Total</td>
                            <td className="text-right">{totalConRevision}</td>
                            <td></td>
                            <td className="text-right font-mono">{puntaje}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="text-center mt-4">
                    <p className="text-sm text-c-text-muted">
                        ÍNDICE = {puntaje} ÷ {totalConRevision || 0} ={' '}
                        <span className="text-2xl font-bold" style={{ color: interpretacion.color }}>
                            {indice === null ? '—' : indice.toFixed(2)}
                        </span>
                    </p>
                    <span
                        className="inline-block mt-2 px-4 py-1.5 rounded-full text-white font-bold text-sm"
                        style={{ backgroundColor: interpretacion.color }}
                    >
                        {interpretacion.estado}
                    </span>
                    <p className="text-xs text-c-text-muted mt-2">{interpretacion.accion}</p>
                </div>
            </div>

            {/* Interpretación */}
            <div className="bg-c-surface rounded-2xl border border-c-border p-4">
                <h3 className="font-semibold text-c-text-strong mb-3">Interpretación</h3>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-c-text-muted text-xs uppercase">
                            <th className="text-left font-semibold pb-2">Índice</th>
                            <th className="text-left font-semibold pb-2">Estado</th>
                            <th className="text-left font-semibold pb-2">Qué hacer</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-c-border">
                        {interpRows.map(r => (
                            <tr key={r.estado}>
                                <td className="py-2 text-c-text-strong font-mono whitespace-nowrap">{r.rango}</td>
                                <td className="py-2 font-bold" style={{ color: r.color }}>{r.estado}</td>
                                <td className="py-2 text-c-text-muted text-xs">{r.que}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
