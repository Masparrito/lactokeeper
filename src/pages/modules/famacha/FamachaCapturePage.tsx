import { useState, useMemo } from 'react';
import { Search, AlertTriangle, Check } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { getAnimalZootecnicCategory } from '../../../utils/calculations';
import { getCleanId } from '../../../utils/formatting';
import { FamachaScore, FamachaAccion } from '../../../db/local';
import { calcularAccion, tratadoYNoMejora } from '../../../utils/famachaLogic';

// Identificador de dispositivo (trazabilidad de qué teléfono cargó la revisión)
const getDispositivo = (): string => {
    let d = localStorage.getItem('ganaderoOS_dispositivo');
    if (!d) {
        d = 'tel-' + Math.random().toString(36).slice(2, 6);
        localStorage.setItem('ganaderoOS_dispositivo', d);
    }
    return d;
};

// Colores por severidad (1 = sano … 5 = anémico severo)
const scoreColor: Record<FamachaScore, string> = {
    1: 'bg-emerald-600',
    2: 'bg-green-500',
    3: 'bg-yellow-500',
    4: 'bg-orange-500',
    5: 'bg-red-600',
};

const accionStyle: Record<FamachaAccion, { label: string; cls: string }> = {
    '−': { label: 'No dosis', cls: 'bg-zinc-700 text-zinc-300' },
    '+': { label: 'Dosificar', cls: 'bg-orange-500/20 text-orange-400' },
    '=': { label: 'No repetir · revisar', cls: 'bg-purple-500/20 text-purple-300' },
    '+ separar': { label: 'Dosis + separar + vet.', cls: 'bg-red-600/20 text-red-400' },
};

export function FamachaCapturePage() {
    const { animals, famachaRevs, products, parturitions, appConfig, addFamachaRev } = useData();

    const today = new Date().toISOString().split('T')[0];
    const [fecha, setFecha] = useState<string>(today);
    const [search, setSearch] = useState('');
    const [productoDelDia, setProductoDelDia] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    const desparasitantes = useMemo(
        () => products.filter(p => p.category === 'Desparasitantes'),
        [products]
    );

    // Animales activos del rebaño (reusa el inventario existente)
    const activos = useMemo(
        () => animals.filter(a => a.status === 'Activo' && !a.isReference),
        [animals]
    );

    // Revisiones de la jornada seleccionada, por animal
    const revsDelDia = useMemo(() => {
        const map = new Map<string, { score: FamachaScore; accion: FamachaAccion }>();
        for (const r of famachaRevs) {
            if (r.fecha === fecha) map.set(r.animalId, { score: r.score, accion: r.accion });
        }
        return map;
    }, [famachaRevs, fecha]);

    const lista = useMemo(() => {
        const term = search.trim().toLowerCase();
        return activos
            .map(a => ({
                animal: a,
                arete: getCleanId(a.id),
                tipo: getAnimalZootecnicCategory(a, parturitions, appConfig, animals),
            }))
            .filter(x => !term || x.arete.toLowerCase().includes(term))
            .sort((a, b) => a.arete.localeCompare(b.arete, undefined, { numeric: true }));
    }, [activos, search, parturitions, appConfig, animals]);

    const revisadosHoy = useMemo(
        () => activos.filter(a => revsDelDia.has(a.id)).length,
        [activos, revsDelDia]
    );

    const handleScore = async (animalId: string, arete: string, score: FamachaScore) => {
        setSavingId(animalId);
        try {
            const accion = calcularAccion(famachaRevs, animalId, fecha, score);
            const dosis = accion === '+' || accion === '+ separar';
            await addFamachaRev({
                animalId,
                arete,
                fecha,
                score,
                accion,
                dosis,
                producto: dosis ? productoDelDia : '',
                dispositivo: getDispositivo(),
            });
        } catch (e) {
            console.error('Error al guardar revisión Famacha:', e);
        } finally {
            setSavingId(null);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-4">
            {/* Controles de jornada */}
            <div className="bg-brand-glass rounded-2xl border border-brand-border p-4 space-y-3 mt-2">
                <div className="flex items-center justify-between gap-3">
                    <label className="text-sm text-zinc-400">Jornada</label>
                    <input
                        type="date"
                        value={fecha}
                        max={today}
                        onChange={e => setFecha(e.target.value)}
                        className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                </div>
                <div className="flex items-center justify-between gap-3">
                    <label className="text-sm text-zinc-400">Producto del día</label>
                    <select
                        value={productoDelDia}
                        onChange={e => setProductoDelDia(e.target.value)}
                        className="bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 max-w-[60%] focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                        <option value="">Sin producto</option>
                        {desparasitantes.map(p => (
                            <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400">Revisados en esta jornada</span>
                    <span className="font-bold text-rose-400">{revisadosHoy} / {activos.length}</span>
                </div>
            </div>

            {/* Buscador */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por arete…"
                    className="w-full bg-zinc-800/80 text-white pl-10 pr-3 py-2.5 rounded-xl border border-transparent focus:border-rose-500 focus:outline-none placeholder-zinc-500"
                />
            </div>

            {/* Lista de captura */}
            <div className="space-y-2 pb-4">
                {lista.length === 0 && (
                    <p className="text-center text-zinc-500 py-8">No hay animales activos que coincidan.</p>
                )}
                {lista.map(({ animal, arete, tipo }) => {
                    const rev = revsDelDia.get(animal.id);
                    const alerta = tratadoYNoMejora(famachaRevs, animal.id);
                    return (
                        <div key={animal.id} className="bg-brand-glass rounded-xl border border-brand-border p-3">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-bold text-white text-lg truncate">{arete}</span>
                                    {rev && <Check size={16} className="text-emerald-500 flex-shrink-0" />}
                                    {alerta && (
                                        <span title="Tratado y no mejora: revisar / consultar veterinario">
                                            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0" />
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <span className="text-xs text-zinc-400">{tipo}</span>
                                    {rev && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${accionStyle[rev.accion].cls}`}>
                                            {accionStyle[rev.accion].label}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {([1, 2, 3, 4, 5] as FamachaScore[]).map(score => {
                                    const selected = rev?.score === score;
                                    return (
                                        <button
                                            key={score}
                                            disabled={savingId === animal.id}
                                            onClick={() => handleScore(animal.id, arete, score)}
                                            className={`flex-1 h-11 rounded-lg font-bold text-white transition-all disabled:opacity-50 ${
                                                selected
                                                    ? `${scoreColor[score]} ring-2 ring-white scale-105`
                                                    : `${scoreColor[score]} opacity-40 hover:opacity-80`
                                            }`}
                                        >
                                            {score}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
