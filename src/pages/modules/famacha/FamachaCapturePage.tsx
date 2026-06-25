import { useState, useMemo } from 'react';
import { Search, AlertTriangle, Plus, X } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { getAnimalZootecnicCategory } from '../../../utils/calculations';
import { getCleanId } from '../../../utils/formatting';
import { FamachaScore, FamachaAccion } from '../../../db/local';
import { calcularAccion, tratadoYNoMejora } from '../../../utils/famachaLogic';

const getDispositivo = (): string => {
    let d = localStorage.getItem('ganaderoOS_dispositivo');
    if (!d) {
        d = 'tel-' + Math.random().toString(36).slice(2, 6);
        localStorage.setItem('ganaderoOS_dispositivo', d);
    }
    return d;
};

// Escala por severidad (1 = sano … 5 = anémico grave)
const scoreColor: Record<FamachaScore, string> = {
    1: 'bg-emerald-600 border-emerald-600',
    2: 'bg-green-600 border-green-600',
    3: 'bg-yellow-600 border-yellow-600',
    4: 'bg-orange-600 border-orange-600',
    5: 'bg-red-600 border-red-600',
};

const accionText: Record<FamachaAccion, { label: string; cls: string }> = {
    '−': { label: 'No dosis', cls: 'text-zinc-400' },
    '+': { label: '+ Dosificar', cls: 'text-orange-400' },
    '=': { label: '= No repetir · revisar', cls: 'text-purple-300' },
    '+ separar': { label: '+ Separar + vet.', cls: 'text-red-400' },
};

export function FamachaCapturePage() {
    const { animals, famachaRevs, products, parturitions, appConfig, addFamachaRev, addAnimal } = useData();

    const today = new Date().toISOString().split('T')[0];
    const [fecha, setFecha] = useState<string>(today);
    const [search, setSearch] = useState('');
    const [productoDelDia, setProductoDelDia] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    // Modal "+ animal"
    const [showAdd, setShowAdd] = useState(false);
    const [newArete, setNewArete] = useState('');
    const [newSexo, setNewSexo] = useState<'Hembra' | 'Macho'>('Hembra');
    const [addError, setAddError] = useState('');

    const desparasitantes = useMemo(() => products.filter(p => p.category === 'Desparasitantes'), [products]);
    const activos = useMemo(() => animals.filter(a => a.status === 'Activo' && !a.isReference), [animals]);

    const revsDelDia = useMemo(() => {
        const map = new Map<string, { score: FamachaScore; accion: FamachaAccion }>();
        for (const r of famachaRevs) if (r.fecha === fecha) map.set(r.animalId, { score: r.score, accion: r.accion });
        return map;
    }, [famachaRevs, fecha]);

    const lista = useMemo(() => {
        const term = search.trim().toLowerCase();
        return activos
            .map(a => ({ animal: a, arete: getCleanId(a.id), tipo: getAnimalZootecnicCategory(a, parturitions, appConfig, animals) }))
            .filter(x => !term || x.arete.toLowerCase().includes(term))
            .sort((a, b) => a.arete.localeCompare(b.arete, undefined, { numeric: true }));
    }, [activos, search, parturitions, appConfig, animals]);

    const revisadosHoy = useMemo(() => activos.filter(a => revsDelDia.has(a.id)).length, [activos, revsDelDia]);

    const handleScore = async (animalId: string, arete: string, score: FamachaScore) => {
        setSavingId(animalId);
        try {
            const accion = calcularAccion(famachaRevs, animalId, fecha, score);
            const dosis = accion === '+' || accion === '+ separar';
            await addFamachaRev({ animalId, arete, fecha, score, accion, dosis, producto: dosis ? productoDelDia : '', dispositivo: getDispositivo() });
        } catch (e) {
            console.error('Error al guardar revisión Famacha:', e);
        } finally {
            setSavingId(null);
        }
    };

    const handleAddAnimal = async () => {
        const arete = newArete.trim().toUpperCase();
        if (!arete) { setAddError('Ingresa el arete.'); return; }
        try {
            await addAnimal({
                id: arete,
                sex: newSexo,
                status: 'Activo',
                birthDate: 'N/A',
                lifecycleStage: 'Indefinido',
                location: '',
                reproductiveStatus: 'No Aplica',
            });
            setShowAdd(false);
            setNewArete('');
            setAddError('');
        } catch (e: any) {
            setAddError(e?.message || 'No se pudo agregar.');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 space-y-3">
            {/* Tarjeta de instrucción + controles */}
            <div className="bg-brand-glass rounded-2xl border border-brand-border p-4 space-y-3">
                <div>
                    <h2 className="flex items-center gap-2 font-semibold text-white">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Revisión del día
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">Toca el Famacha (1-5) de cada animal — se guarda solo.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={fecha}
                        max={today}
                        onChange={e => setFecha(e.target.value)}
                        className="flex-1 bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold rounded-lg px-3 py-2">
                        <Plus size={16} /> animal
                    </button>
                </div>
                <select
                    value={productoDelDia}
                    onChange={e => setProductoDelDia(e.target.value)}
                    className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 text-sm border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                    <option value="">Producto del día: ninguno</option>
                    {desparasitantes.map(p => <option key={p.id} value={p.name}>Producto: {p.name}</option>)}
                </select>
                <div className="bg-rose-500/10 text-rose-300 text-sm font-semibold rounded-lg px-3 py-2 text-center">
                    {revisadosHoy} de {activos.length} revisados — {fecha}
                </div>
            </div>

            {/* Buscador */}
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar arete…"
                    className="w-full bg-zinc-800/80 text-white pl-10 pr-3 py-2.5 rounded-xl border border-transparent focus:border-rose-500 focus:outline-none placeholder-zinc-500"
                />
            </div>

            {/* Lista compacta */}
            <div className="bg-brand-glass rounded-2xl border border-brand-border divide-y divide-zinc-800 overflow-hidden">
                {lista.length === 0 && <p className="text-center text-zinc-500 py-8">No hay animales activos que coincidan.</p>}
                {lista.map(({ animal, arete }) => {
                    const rev = revsDelDia.get(animal.id);
                    const alerta = tratadoYNoMejora(famachaRevs, animal.id);
                    return (
                        <div key={animal.id} className="flex items-center gap-2 px-3 py-2.5">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white truncate">{arete}</span>
                                    {alerta && (
                                        <span title="Tratado y no mejora">
                                            <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                                        </span>
                                    )}
                                </div>
                                {rev && <span className={`text-[11px] ${accionText[rev.accion].cls}`}>{accionText[rev.accion].label}</span>}
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                                {([1, 2, 3, 4, 5] as FamachaScore[]).map(score => {
                                    const selected = rev?.score === score;
                                    return (
                                        <button
                                            key={score}
                                            disabled={savingId === animal.id}
                                            onClick={() => handleScore(animal.id, arete, score)}
                                            className={`w-9 h-9 rounded-lg font-bold text-sm border transition-all disabled:opacity-50 ${
                                                selected ? `${scoreColor[score]} text-white scale-105` : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
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

            {/* Modal + animal */}
            {showAdd && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
                    <div className="w-full max-w-sm bg-ios-modal-bg rounded-t-2xl sm:rounded-2xl p-5 m-0 sm:m-4 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-white text-lg">Agregar animal</h3>
                            <button onClick={() => setShowAdd(false)} className="text-zinc-500 hover:text-white"><X size={20} /></button>
                        </div>
                        <input
                            type="text"
                            value={newArete}
                            onChange={e => setNewArete(e.target.value)}
                            placeholder="Arete (ej. A047)"
                            className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2.5 border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-rose-500 mb-3"
                        />
                        <div className="flex gap-2 mb-3">
                            {(['Hembra', 'Macho'] as const).map(s => (
                                <button key={s} onClick={() => setNewSexo(s)} className={`flex-1 py-2 rounded-lg font-semibold text-sm border ${newSexo === s ? 'bg-rose-500/20 border-rose-500 text-rose-300' : 'bg-zinc-800 border-zinc-700 text-zinc-400'}`}>{s}</button>
                            ))}
                        </div>
                        {addError && <p className="text-red-400 text-sm mb-3">{addError}</p>}
                        <button onClick={handleAddAnimal} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl">Agregar</button>
                    </div>
                </div>
            )}
        </div>
    );
}
