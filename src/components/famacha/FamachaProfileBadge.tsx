// src/components/famacha/FamachaProfileBadge.tsx
// Insignia Famacha para el perfil del animal: muestra el grado de la última
// revisión + flecha de tendencia; al tocar abre el histórico completo (índice).
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, X, AlertTriangle } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { FamachaRev } from '../../db/local';
import {
    tendenciaFamacha, tratadoYNoMejora, MENSAJE_NO_MEJORA,
} from '../../utils/famachaLogic';
import { TrendArrow, FamachaScoreDot, famachaScoreColor, tendenciaLabel } from './FamachaTrend';

const accionLabel: Record<string, string> = {
    '−': 'No dosis', '+': 'Dosificar', '=': 'No repetir', '+ separar': 'Separar + vet.',
};

const fmtFecha = (f: string) => {
    try { return new Date(f + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    catch { return f; }
};

export function FamachaProfileBadge({ animalId }: { animalId: string }) {
    const { famachaRevs } = useData();
    const [open, setOpen] = useState(false);

    const revs = useMemo(
        () => famachaRevs.filter(r => r.animalId === animalId).sort((a, b) => (a.fecha < b.fecha ? 1 : -1)),
        [famachaRevs, animalId]
    );
    const ultima: FamachaRev | undefined = revs[0];
    const tendencia = ultima ? tendenciaFamacha(famachaRevs, animalId, ultima.fecha, ultima.score) : null;
    const alerta = tratadoYNoMejora(famachaRevs, animalId);

    if (!ultima) return null; // sin datos Famacha: no mostramos nada

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="inline-flex items-center gap-2 bg-c-surface-2 hover:bg-c-surface-3 border border-c-border rounded-xl px-3 py-2 transition-colors"
                title="Ver histórico Famacha"
            >
                <Eye size={16} className="text-rose-500" />
                <span className="text-xs font-bold uppercase tracking-wide text-c-text-muted">Famacha</span>
                <FamachaScoreDot score={ultima.score} size={24} />
                {tendencia && <TrendArrow tendencia={tendencia} size={16} />}
                {alerta && <AlertTriangle size={14} className="text-amber-400" />}
            </button>

            {open && createPortal(
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setOpen(false)}>
                    <div className="w-full max-w-lg bg-c-surface rounded-t-2xl sm:rounded-2xl p-5 max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 1.25rem)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-c-text-strong text-lg flex items-center gap-2"><Eye size={18} className="text-rose-500" /> Histórico Famacha</h3>
                            <button onClick={() => setOpen(false)} className="text-c-text-faint hover:text-c-text"><X size={22} /></button>
                        </div>

                        {/* Resumen último */}
                        <div className="flex items-center gap-3 bg-c-surface-2 rounded-xl p-3 mb-3">
                            <FamachaScoreDot score={ultima.score} size={40} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-c-text-strong flex items-center gap-1.5">
                                    Último: Famacha {ultima.score}
                                    {tendencia && <TrendArrow tendencia={tendencia} size={16} />}
                                    {tendencia && <span className="text-xs font-semibold text-c-text-muted">{tendenciaLabel[tendencia]}</span>}
                                </p>
                                <p className="text-xs text-c-text-muted">{fmtFecha(ultima.fecha)} · {ultima.dosis ? `Dosis${ultima.producto ? `: ${ultima.producto}` : ''}` : 'Sin dosis'} · {revs.length} revisión(es)</p>
                            </div>
                        </div>

                        {alerta && (
                            <div className="flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-3">
                                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 leading-relaxed">{MENSAJE_NO_MEJORA}</p>
                            </div>
                        )}

                        {/* Lista completa con tendencia por revisión */}
                        <div className="space-y-2">
                            {revs.map(r => {
                                const t = tendenciaFamacha(famachaRevs, animalId, r.fecha, r.score);
                                return (
                                    <div key={r.id} className="flex items-center gap-3 bg-c-surface-2 rounded-xl p-3">
                                        <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 ${famachaScoreColor[r.score]}`}>{r.score}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-c-text-strong text-sm font-semibold flex items-center gap-1.5">
                                                {fmtFecha(r.fecha)}
                                                {t && <TrendArrow tendencia={t} size={14} />}
                                            </p>
                                            <p className="text-xs text-c-text-muted">
                                                {accionLabel[r.accion] || r.accion} · {r.dosis ? `Dosis${r.producto ? `: ${r.producto}` : ''}` : 'Sin dosis'}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
