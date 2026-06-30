import { useMemo } from 'react';
import { FileDown } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { FamachaScore, FamachaRev } from '../../../db/local';
import {
    calcularIndice, famachaPeso, ultimaJornada, jornadaAnterior, interpretarIndice,
} from '../../../utils/famachaLogic';
import { exportFamachaPDF } from '../../../utils/famachaPdf';
import { TrendArrow } from '../../../components/famacha/FamachaTrend';

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

    // Resumen del último Famacha (jornada más reciente) + comparativa con la anterior.
    const resumenUltimo = useMemo(() => {
        const fecha = ultimaJornada(famachaRevs);
        if (!fecha) return null;
        const indiceDe = (revs: FamachaRev[]) => revs.length ? revs.reduce((s, r) => s + famachaPeso(r.score), 0) / revs.length : null;
        const revsUlt = famachaRevs.filter(r => r.fecha === fecha);
        const fechaPrev = jornadaAnterior(famachaRevs);
        const revsPrev = fechaPrev ? famachaRevs.filter(r => r.fecha === fechaPrev) : [];
        const indiceUlt = indiceDe(revsUlt);
        const indicePrev = indiceDe(revsPrev);
        const delta = indiceUlt !== null && indicePrev !== null ? indiceUlt - indicePrev : null;
        // Menor índice = mejor → mejoró si delta < 0.
        const tendencia = delta === null ? null : delta < -0.001 ? 'mejoro' : delta > 0.001 ? 'empeoro' : 'igual';
        return {
            fecha, fechaPrev, revisados: revsUlt.length, dosificados: revsUlt.filter(r => r.dosis).length,
            indiceUlt, indicePrev, tendencia: tendencia as 'mejoro' | 'empeoro' | 'igual' | null,
            interp: interpretarIndice(indiceUlt),
        };
    }, [famachaRevs]);

    const fmtFecha = (f: string) => {
        try { return new Date(f + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
        catch { return f; }
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-4">
            {/* Último Famacha + descarga PDF */}
            {resumenUltimo && (
                <div className="bg-c-surface rounded-2xl border border-c-border p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <h2 className="font-semibold text-c-text-strong flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-rose-500" /> Último Famacha
                            </h2>
                            <p className="text-xs text-c-text-muted mt-1">{fmtFecha(resumenUltimo.fecha)}</p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1.5 justify-end">
                                <span className="text-2xl font-bold" style={{ color: resumenUltimo.interp.color }}>
                                    {resumenUltimo.indiceUlt === null ? '—' : resumenUltimo.indiceUlt.toFixed(2)}
                                </span>
                                {resumenUltimo.tendencia && <TrendArrow tendencia={resumenUltimo.tendencia} size={20} />}
                            </div>
                            <span className="text-[11px] font-bold uppercase" style={{ color: resumenUltimo.interp.color }}>{resumenUltimo.interp.estado}</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-c-surface-2 rounded-xl p-3 text-center">
                            <div className="text-xl font-bold text-c-text-strong">{resumenUltimo.revisados}</div>
                            <div className="text-[11px] text-c-text-muted uppercase tracking-wide">Revisados</div>
                        </div>
                        <div className="bg-c-surface-2 rounded-xl p-3 text-center">
                            <div className="text-xl font-bold text-c-text-strong">{resumenUltimo.dosificados}</div>
                            <div className="text-[11px] text-c-text-muted uppercase tracking-wide">Desparasitados</div>
                        </div>
                    </div>
                    {resumenUltimo.indicePrev !== null && resumenUltimo.fechaPrev && (
                        <p className="text-[11px] text-c-text-faint mt-2">
                            Jornada anterior ({fmtFecha(resumenUltimo.fechaPrev)}): índice {resumenUltimo.indicePrev.toFixed(2)}.
                        </p>
                    )}
                    <button
                        onClick={() => exportFamachaPDF(famachaRevs)}
                        className="mt-3 w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-3 rounded-xl"
                    >
                        <FileDown size={18} /> Descargar último Famacha (PDF)
                    </button>
                </div>
            )}
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
