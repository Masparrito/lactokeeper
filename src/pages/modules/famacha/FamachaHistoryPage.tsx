// src/pages/modules/famacha/FamachaHistoryPage.tsx
// Historial de jornadas Famacha: cada fecha cargada como tarjeta delgada
// (revisados, desparasitados, índice), con filtros por periodo (pills).
import { useMemo, useState } from 'react';
import { CalendarClock, Syringe, Eye } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { famachaPeso, interpretarIndice } from '../../../utils/famachaLogic';
import { FamachaRev } from '../../../db/local';

type Periodo = 'mes' | 'trimestre' | 'semestre' | 'anio';

const fmtFecha = (f: string) => {
    try { return new Date(f + 'T00:00:00Z').toLocaleDateString('es-VE', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    catch { return f; }
};

export function FamachaHistoryPage() {
    const { famachaRevs } = useData();
    const [periodo, setPeriodo] = useState<Periodo>('trimestre');

    // Umbral de fecha (YYYY-MM-DD) según el periodo elegido.
    const desde = useMemo(() => {
        const now = new Date();
        const iso = (d: Date) => d.toISOString().split('T')[0];
        if (periodo === 'mes') return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        if (periodo === 'anio') return `${now.getFullYear()}-01-01`;
        const d = new Date(now);
        d.setDate(d.getDate() - (periodo === 'trimestre' ? 90 : 180));
        return iso(d);
    }, [periodo]);

    // Agrupa por jornada (fecha) y resume.
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

    const pills: { key: Periodo; label: string }[] = [
        { key: 'mes', label: 'Mes en curso' },
        { key: 'trimestre', label: 'Últ. trimestre' },
        { key: 'semestre', label: 'Últ. semestre' },
        { key: 'anio', label: 'Año' },
    ];

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-3">
            <div className="flex items-center gap-2 px-1">
                <CalendarClock size={18} className="text-rose-500" />
                <h2 className="font-semibold text-c-text-strong">Historial de jornadas</h2>
            </div>

            {/* Filtros por periodo */}
            <div className="flex flex-wrap gap-2">
                {pills.map(p => (
                    <button
                        key={p.key}
                        onClick={() => setPeriodo(p.key)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-full border transition-colors ${
                            periodo === p.key ? 'bg-rose-500 text-white border-rose-500' : 'bg-c-surface-2 text-c-text-muted border-c-border hover:border-c-text-faint'
                        }`}
                    >
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
                        <div key={j.fecha} className="flex items-center gap-3 bg-c-surface border border-c-border rounded-xl px-3 py-2.5">
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
