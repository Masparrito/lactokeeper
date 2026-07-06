// src/pages/modules/famacha/FamachaHistoryPage.tsx
// Historial de jornadas Famacha: cada fecha como tarjeta delgada (revisados,
// desparasitados, índice) con filtros por periodo (pills). Al tocar una jornada
// se abre su detalle: balance desplegable + lista de animales con dosis y
// tendencia (mejoró/empeoró) vs. su Famacha anterior.
import { useMemo, useState } from 'react';
import { CalendarClock, Syringe, Eye, X, ChevronDown, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useData } from '../../../context/DataContext';
import { famachaPeso, interpretarIndice, tendenciaFamacha } from '../../../utils/famachaLogic';
import { FamachaRev, FamachaScore } from '../../../db/local';
import { FamachaScoreDot, TrendArrow, tendenciaLabel } from '../../../components/famacha/FamachaTrend';

type Periodo = 'mes' | 'trimestre' | 'semestre' | 'anio';

const fmtFecha = (f: string) => {
    try { return new Date(f + 'T00:00:00Z').toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    catch { return f; }
};

export function FamachaHistoryPage() {
    const { famachaRevs } = useData();
    const [periodo, setPeriodo] = useState<Periodo>('trimestre');
    const [openFecha, setOpenFecha] = useState<string | null>(null);
    const [showBalance, setShowBalance] = useState(true);

    const desde = useMemo(() => {
        const now = new Date();
        const iso = (d: Date) => d.toISOString().split('T')[0];
        if (periodo === 'mes') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        if (periodo === 'anio') return `${now.getFullYear()}-01-01`;
        const d = new Date(now);
        d.setDate(d.getDate() - (periodo === 'trimestre' ? 90 : 180));
        return iso(d);
    }, [periodo]);

    const jornadas = useMemo(() => {
        const byFecha = new Map<string, FamachaRev[]>();
        for (const r of famachaRevs) {
            if (r.fecha < desde) continue;
            const arr = byFecha.get(r.fecha) || [];
            arr.push(r);
            byFecha.set(r.fecha, arr);
        }
        return Array.from(byFecha.entries())
            .map(([fecha, revs]) => {
                const dosificados = revs.filter(r => r.dosis).length;
                const indice = revs.length ? revs.reduce((s, r) => s + famachaPeso(r.score), 0) / revs.length : null;
                return { fecha, revisados: revs.length, dosificados, indice, interp: interpretarIndice(indice) };
            })
            .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
    }, [famachaRevs, desde]);

    // Detalle de la jornada abierta.
    const detalle = useMemo(() => {
        if (!openFecha) return null;
        const revs = famachaRevs
            .filter(r => r.fecha === openFecha)
            .map(r => ({ ...r, tend: tendenciaFamacha(famachaRevs, r.animalId, r.fecha, r.score) }))
            .sort((a, b) => b.score - a.score || a.arete.localeCompare(b.arete, undefined, { numeric: true }));
        const dist: Record<FamachaScore, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        revs.forEach(r => { dist[r.score]++; });
        const tratados = revs.filter(r => r.dosis).length;
        const mejoraron = revs.filter(r => r.tend === 'mejoro').length;
        const empeoraron = revs.filter(r => r.tend === 'empeoro').length;
        const igual = revs.filter(r => r.tend === 'igual').length;
        const indice = revs.length ? revs.reduce((s, r) => s + famachaPeso(r.score), 0) / revs.length : null;
        return { revs, dist, tratados, mejoraron, empeoraron, igual, indice, interp: interpretarIndice(indice) };
    }, [openFecha, famachaRevs]);

    const pills: { key: Periodo; label: string }[] = [
        { key: 'mes', label: 'Mes en curso' },
        { key: 'trimestre', label: 'Últ. trimestre' },
        { key: 'semestre', label: 'Últ. semestre' },
        { key: 'anio', label: 'Año' },
    ];

    const scoreBar: Record<FamachaScore, string> = { 1: 'bg-emerald-600', 2: 'bg-green-600', 3: 'bg-yellow-600', 4: 'bg-orange-600', 5: 'bg-red-600' };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-3">
            <div className="flex items-center gap-2 px-1">
                <CalendarClock size={18} className="text-rose-500" />
                <h2 className="font-semibold text-c-text-strong">Historial de jornadas</h2>
            </div>

            <div className="flex flex-wrap gap-2">
                {pills.map(p => (
                    <button key={p.key} onClick={() => setPeriodo(p.key)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${periodo === p.key ? 'bg-rose-500 text-white border-rose-500' : 'bg-c-surface-2 text-c-text-muted border-c-border hover:border-c-text-faint'}`}>
                        {p.label}
                    </button>
                ))}
            </div>

            <p className="text-xs text-c-text-faint px-1">{jornadas.length} jornada(s) en el periodo.</p>

            {jornadas.length === 0 ? (
                <div className="bg-c-surface rounded-2xl border border-c-border p-8 text-center">
                    <Eye size={28} className="text-c-text-faint mx-auto mb-2 opacity-40" />
                    <p className="text-sm text-c-text-faint">No hay jornadas Famacha en este periodo.</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {jornadas.map(j => (
                        <button key={j.fecha} onClick={() => { setOpenFecha(j.fecha); setShowBalance(true); }}
                            className="w-full flex items-center gap-3 bg-c-surface border border-c-border rounded-xl px-3 py-2.5 text-left hover:bg-c-surface-2 transition-colors">
                            <div className="w-1.5 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: j.interp.color }} />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-c-text-strong">{fmtFecha(j.fecha)}</p>
                                <p className="text-xs text-c-text-muted flex items-center gap-2 flex-wrap">
                                    <span>{j.revisados} revisado(s)</span>
                                    <span className="flex items-center gap-0.5 text-orange-500 font-semibold"><Syringe size={11} /> {j.dosificados} dosis</span>
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                <p className="text-lg font-bold leading-none" style={{ color: j.interp.color }}>{j.indice === null ? '—' : j.indice.toFixed(2)}</p>
                                <p className="text-[10px] font-bold uppercase" style={{ color: j.interp.color }}>{j.interp.estado}</p>
                            </div>
                            <ChevronRight size={18} className="text-c-text-faint flex-shrink-0" />
                        </button>
                    ))}
                </div>
            )}

            {/* Detalle de jornada */}
            {openFecha && detalle && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setOpenFecha(null)}>
                    <div className="w-full max-w-lg bg-c-surface rounded-t-2xl p-5 max-h-[85vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 1.25rem)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <div>
                                <h3 className="font-bold text-c-text-strong text-lg">{fmtFecha(openFecha)}</h3>
                                <p className="text-xs text-c-text-muted">{detalle.revs.length} revisados · <span style={{ color: detalle.interp.color }} className="font-bold">Índice {detalle.indice?.toFixed(2)} · {detalle.interp.estado}</span></p>
                            </div>
                            <button onClick={() => setOpenFecha(null)} className="text-c-text-faint hover:text-c-text"><X size={22} /></button>
                        </div>

                        {/* Balance desplegable */}
                        <div className="bg-c-surface-2 rounded-xl border border-c-border mb-4 overflow-hidden">
                            <button onClick={() => setShowBalance(s => !s)} className="w-full flex items-center justify-between px-3 py-2.5">
                                <span className="text-xs font-bold uppercase tracking-wider text-c-text-muted">Balance de la jornada</span>
                                <ChevronDown size={16} className={`text-c-text-faint transition-transform ${showBalance ? 'rotate-180' : ''}`} />
                            </button>
                            {showBalance && (
                                <div className="px-3 pb-3 space-y-3 animate-fade-in">
                                    {/* Por grado */}
                                    <div>
                                        <p className="text-[11px] text-c-text-faint mb-1">Animales por grado</p>
                                        <div className="flex gap-1.5">
                                            {([1, 2, 3, 4, 5] as FamachaScore[]).map(s => (
                                                <div key={s} className="flex-1 text-center">
                                                    <div className={`${scoreBar[s]} text-white rounded-md py-1 text-sm font-bold`}>{detalle.dist[s]}</div>
                                                    <div className="text-[9px] text-c-text-faint mt-0.5">F{s}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Resumen */}
                                    <div className="grid grid-cols-4 gap-2 text-center">
                                        <div className="bg-c-surface rounded-lg py-2"><div className="text-base font-bold text-orange-500">{detalle.tratados}</div><div className="text-[9px] text-c-text-muted uppercase">Tratados</div></div>
                                        <div className="bg-c-surface rounded-lg py-2"><div className="text-base font-bold text-emerald-500">{detalle.mejoraron}</div><div className="text-[9px] text-c-text-muted uppercase">Mejoraron</div></div>
                                        <div className="bg-c-surface rounded-lg py-2"><div className="text-base font-bold text-red-500">{detalle.empeoraron}</div><div className="text-[9px] text-c-text-muted uppercase">Empeoraron</div></div>
                                        <div className="bg-c-surface rounded-lg py-2"><div className="text-base font-bold text-amber-500">{detalle.igual}</div><div className="text-[9px] text-c-text-muted uppercase">Igual</div></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Lista de animales revisados */}
                        <p className="text-[11px] font-bold uppercase tracking-wider text-c-text-faint mb-2">Animales revisados</p>
                        <div className="space-y-2">
                            {detalle.revs.map(r => (
                                <div key={r.id} className="flex items-center gap-3 bg-c-surface-2 rounded-xl p-2.5">
                                    <FamachaScoreDot score={r.score} size={34} />
                                    <span className="font-bold text-c-text-strong flex-1 truncate">{r.arete}</span>
                                    {r.dosis && (
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-orange-500 bg-orange-500/10 border border-orange-500/30 rounded px-1.5 py-0.5">
                                            <Syringe size={12} /> dosis
                                        </span>
                                    )}
                                    {r.tend ? (
                                        <span className="flex items-center gap-1">
                                            <TrendArrow tendencia={r.tend} size={16} />
                                            <span className="text-[11px] font-semibold text-c-text-muted w-16">{tendenciaLabel[r.tend]}</span>
                                        </span>
                                    ) : <span className="text-[11px] text-c-text-faint w-[88px] text-right">1ª revisión</span>}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
