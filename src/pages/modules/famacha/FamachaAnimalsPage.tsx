import { useState, useMemo } from 'react';
import { Search, ChevronRight, X, AlertTriangle } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { getCleanId } from '../../../utils/formatting';
import { FamachaScore, FamachaRev } from '../../../db/local';
import { tratadoYNoMejora, MENSAJE_NO_MEJORA } from '../../../utils/famachaLogic';

const scoreBar: Record<FamachaScore, string> = {
    1: 'bg-emerald-600',
    2: 'bg-green-600',
    3: 'bg-yellow-600',
    4: 'bg-orange-600',
    5: 'bg-red-600',
};

const accionLabel: Record<string, string> = {
    '−': 'no dosis',
    '+': 'dosificar',
    '=': 'no repetir',
    '+ separar': 'separar + vet.',
};

export function FamachaAnimalsPage() {
    const { animals, famachaRevs } = useData();
    const [search, setSearch] = useState('');
    const [openId, setOpenId] = useState<string | null>(null);

    const activos = useMemo(() => animals.filter(a => a.status === 'Activo' && !a.isReference), [animals]);

    // Resumen por animal (última rev + conteo)
    const filas = useMemo(() => {
        const byAnimal = new Map<string, FamachaRev[]>();
        for (const r of famachaRevs) {
            const arr = byAnimal.get(r.animalId) || [];
            arr.push(r);
            byAnimal.set(r.animalId, arr);
        }
        const term = search.trim().toLowerCase();
        return activos
            .map(a => {
                const revs = (byAnimal.get(a.id) || []).slice().sort((x, y) => (x.fecha < y.fecha ? 1 : -1));
                return { animalId: a.id, arete: getCleanId(a.id), revs, ultima: revs[0] };
            })
            .filter(f => !term || f.arete.toLowerCase().includes(term))
            .sort((a, b) => {
                const sa = a.ultima?.score ?? -1;
                const sb = b.ultima?.score ?? -1;
                if (sb !== sa) return sb - sa; // más severos primero
                return a.arete.localeCompare(b.arete, undefined, { numeric: true });
            });
    }, [activos, famachaRevs, search]);

    const detalle = openId ? filas.find(f => f.animalId === openId) : null;
    const alertaDetalle = detalle ? tratadoYNoMejora(famachaRevs, detalle.animalId) : false;

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-3">
            <p className="text-sm text-c-text-muted px-1">Toca un animal para ver todo su historial Famacha.</p>

            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-c-text-faint" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar arete…"
                    className="w-full bg-c-surface-2/80 text-c-text pl-10 pr-3 py-2.5 rounded-xl border border-transparent focus:border-rose-500 focus:outline-none placeholder-c-text-faint"
                />
            </div>

            <div className="bg-c-surface rounded-2xl border border-c-border divide-y divide-c-border overflow-hidden">
                {filas.map(f => (
                    <button key={f.animalId} onClick={() => f.ultima && setOpenId(f.animalId)} className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-c-surface-2 transition-colors">
                        <span className={`w-1 self-stretch rounded-full ${f.ultima ? scoreBar[f.ultima.score] : 'bg-c-border-strong'}`} />
                        <div className="min-w-0 flex-1">
                            <span className="font-bold text-c-text-strong">{f.arete}</span>
                            <p className="text-xs text-c-text-muted truncate">
                                {f.ultima
                                    ? `F${f.ultima.score} · ${f.ultima.fecha} · ${accionLabel[f.ultima.accion] || f.ultima.accion} · ${f.revs.length} revisión(es)`
                                    : 'Sin revisiones'}
                            </p>
                        </div>
                        {f.ultima && <ChevronRight size={18} className="text-c-text-faint flex-shrink-0" />}
                    </button>
                ))}
                {filas.length === 0 && <p className="text-center text-c-text-faint py-8">Sin animales.</p>}
            </div>

            {/* Modal historial */}
            {detalle && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center" onClick={() => setOpenId(null)}>
                    <div className="w-full max-w-lg bg-c-surface rounded-t-2xl p-5 max-h-[80vh] overflow-y-auto animate-slide-up" onClick={e => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 1.25rem)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-c-text-strong text-xl">{detalle.arete}</h3>
                            <button onClick={() => setOpenId(null)} className="text-c-text-faint hover:text-c-text"><X size={22} /></button>
                        </div>

                        {alertaDetalle && (
                            <div className="flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
                                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-700 leading-relaxed">{MENSAJE_NO_MEJORA}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            {detalle.revs.map(r => (
                                <div key={r.id} className="flex items-center gap-3 bg-c-surface-2 rounded-xl p-3">
                                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0 ${scoreBar[r.score]}`}>{r.score}</span>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-c-text-strong text-sm font-semibold">{r.fecha} · {accionLabel[r.accion] || r.accion}</p>
                                        <p className="text-xs text-c-text-muted">
                                            {r.dosis ? `Dosis${r.producto ? `: ${r.producto}` : ''}` : 'Sin dosis'}
                                            {r.dispositivo ? ` · ${r.dispositivo}` : ''}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
