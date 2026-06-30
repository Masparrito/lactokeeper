import { useState, useMemo } from 'react';
import { Search, AlertTriangle, Plus, X, Check, Syringe, Pencil, Trash2, CheckCircle2, Lock, CalendarCheck } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { getAnimalZootecnicCategory } from '../../../utils/calculations';
import { getCleanId } from '../../../utils/formatting';
import { FamachaScore, FamachaAccion, FamachaRev } from '../../../db/local';
import { calcularAccion, tratadoYNoMejora, tendenciaFamacha, infoDosificacion } from '../../../utils/famachaLogic';
import { TrendArrow } from '../../../components/famacha/FamachaTrend';
import { useToastUndo } from '../../../context/ToastUndoContext';

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
    '−': { label: 'No dosis', cls: 'text-c-text-muted' },
    '+': { label: '+ Dosificar', cls: 'text-orange-600' },
    '=': { label: '= No repetir · revisar', cls: 'text-purple-600' },
    '+ separar': { label: '+ Separar + vet.', cls: 'text-red-600' },
};

export function FamachaCapturePage() {
    const { animals, famachaRevs, products, parturitions, appConfig, addFamachaRev, deleteFamachaRev, addAnimal } = useData();
    const { showUndo, showToast } = useToastUndo();

    const today = new Date().toISOString().split('T')[0];
    const [fecha, setFecha] = useState<string>(today);
    const [search, setSearch] = useState('');
    const [productoDelDia, setProductoDelDia] = useState('');
    const [savingId, setSavingId] = useState<string | null>(null);

    // La jornada arranca INACTIVA: hay que elegir la fecha y pulsar "Comenzar"
    // para habilitar los botones (evita tocar números por accidente).
    const [jornadaActiva, setJornadaActiva] = useState(false);
    // Filas desbloqueadas para edición. Una fila ya declarada queda en "hold":
    // para cambiar su valor hay que pulsar el lápiz (la mete aquí).
    const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

    const lockRow = (id: string) => setUnlockedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    const unlockRow = (id: string) => setUnlockedIds(prev => { const n = new Set(prev); n.add(id); return n; });

    // Modal "+ animal"
    const [showAdd, setShowAdd] = useState(false);
    const [newArete, setNewArete] = useState('');
    const [newSexo, setNewSexo] = useState<'Hembra' | 'Macho'>('Hembra');
    const [addError, setAddError] = useState('');

    const desparasitantes = useMemo(() => products.filter(p => p.category === 'Desparasitantes'), [products]);
    const activos = useMemo(() => animals.filter(a => a.status === 'Activo' && !a.isReference), [animals]);

    const revsDelDia = useMemo(() => {
        const map = new Map<string, FamachaRev>();
        for (const r of famachaRevs) if (r.fecha === fecha) map.set(r.animalId, r);
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
        // Estado previo de la revisión (para "Deshacer").
        const prevRev = famachaRevs.find(r => r.animalId === animalId && r.fecha === fecha);
        try {
            const accion = calcularAccion(famachaRevs, animalId, fecha, score);
            const dosis = accion === '+' || accion === '+ separar';
            const { revId } = await addFamachaRev({ animalId, arete, fecha, score, accion, dosis, producto: dosis ? productoDelDia : '', dispositivo: getDispositivo() });
            showUndo(`Famacha de ${arete}: ${score}`, () => {
                if (prevRev) {
                    return addFamachaRev({ animalId: prevRev.animalId, arete: prevRev.arete, fecha: prevRev.fecha, score: prevRev.score, accion: prevRev.accion, dosis: prevRev.dosis, producto: prevRev.producto, dispositivo: prevRev.dispositivo }).then(() => {});
                }
                return deleteFamachaRev(revId);
            });
            lockRow(animalId); // queda en "hold" tras declarar/editar
        } catch (e) {
            console.error('Error al guardar revisión Famacha:', e);
        } finally {
            setSavingId(null);
        }
    };

    // Eliminar la revisión de este día (limpiar un valor cargado por error).
    const handleDeleteRev = async (animalId: string) => {
        const rev = revsDelDia.get(animalId);
        if (!rev) return;
        setSavingId(animalId);
        try {
            await deleteFamachaRev(rev.id);
            lockRow(animalId);
        } catch (e) {
            console.error('Error al eliminar revisión Famacha:', e);
        } finally {
            setSavingId(null);
        }
    };

    // "Cargar": el usuario confirma que terminó la jornada → se bloquea todo.
    const handleFinalizar = () => {
        setJornadaActiva(false);
        setUnlockedIds(new Set());
        setSearch('');
        showToast(`Jornada del ${fecha} cargada: ${revisadosHoy} animal(es) revisado(s).`);
    };

    // Toggle explícito de dosis: registra el precedente real de si se aplicó o no
    // desparasitante, independiente de la sugerencia automática.
    const handleToggleDose = async (animalId: string, arete: string) => {
        const rev = revsDelDia.get(animalId);
        if (!rev) return;
        const nuevaDosis = !rev.dosis;
        setSavingId(animalId);
        try {
            await addFamachaRev({
                animalId, arete, fecha, score: rev.score, accion: rev.accion,
                dosis: nuevaDosis, producto: nuevaDosis ? (rev.producto || productoDelDia) : '',
                dispositivo: getDispositivo(),
            });
        } catch (e) {
            console.error('Error al cambiar dosis Famacha:', e);
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
            <div className="bg-c-surface rounded-2xl border border-c-border p-4 space-y-3">
                <div>
                    <h2 className="flex items-center gap-2 font-semibold text-c-text-strong">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Revisión Famacha
                    </h2>
                    <p className="text-xs text-c-text-muted mt-1">
                        {jornadaActiva
                            ? 'Toca el Famacha (1-5). Un valor declarado queda fijo: usa el lápiz para editarlo.'
                            : 'Elige la fecha de la jornada y pulsa «Comenzar» para habilitar la carga.'}
                    </p>
                </div>

                {!jornadaActiva ? (
                    /* --- PUERTA: la jornada arranca inactiva --- */
                    <>
                        <label className="block text-xs font-semibold text-c-text-muted">Fecha de la jornada</label>
                        <input
                            type="date"
                            value={fecha}
                            max={today}
                            onChange={e => setFecha(e.target.value)}
                            className="w-full bg-c-surface-2 text-c-text rounded-lg px-3 py-2.5 text-sm border border-c-border focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        {revsDelDia.size > 0 && (
                            <p className="text-[11px] text-c-text-faint">Esta fecha ya tiene {revsDelDia.size} animal(es) cargado(s).</p>
                        )}
                        <button
                            onClick={() => setJornadaActiva(true)}
                            className="w-full flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl"
                        >
                            <CalendarCheck size={18} /> Comenzar revisión
                        </button>
                    </>
                ) : (
                    /* --- JORNADA ACTIVA --- */
                    <>
                        <div className="flex items-center justify-between gap-2 bg-c-surface-2 rounded-lg px-3 py-2">
                            <span className="text-sm font-semibold text-c-text">Jornada: {fecha}</span>
                            <button onClick={() => { setJornadaActiva(false); setUnlockedIds(new Set()); }} className="text-xs font-semibold text-rose-500">Cambiar fecha</button>
                        </div>
                        <div className="flex items-center gap-2">
                            <select
                                value={productoDelDia}
                                onChange={e => setProductoDelDia(e.target.value)}
                                className="flex-1 bg-c-surface-2 text-c-text rounded-lg px-3 py-2 text-sm border border-c-border focus:outline-none focus:ring-2 focus:ring-rose-500"
                            >
                                <option value="">Producto del día: ninguno</option>
                                {desparasitantes.map(p => <option key={p.id} value={p.name}>Producto: {p.name}</option>)}
                            </select>
                            <button onClick={() => setShowAdd(true)} className="flex items-center gap-1 bg-c-surface-2 hover:bg-c-surface-3 text-c-text text-sm font-semibold rounded-lg px-3 py-2">
                                <Plus size={16} /> animal
                            </button>
                        </div>
                        <div className="bg-rose-500/10 text-rose-600 text-sm font-semibold rounded-lg px-3 py-2 text-center">
                            {revisadosHoy} de {activos.length} revisados
                        </div>
                        {/* "Cargar": confirmar y bloquear la jornada (botón superior) */}
                        <button
                            onClick={handleFinalizar}
                            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl"
                        >
                            <CheckCircle2 size={18} /> Cargar jornada ({revisadosHoy})
                        </button>
                    </>
                )}
            </div>

            {/* Buscador (solo con jornada activa) */}
            {jornadaActiva && (
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
            )}

            {/* Lista compacta (solo con jornada activa) */}
            {jornadaActiva && (
            <div className="bg-c-surface rounded-2xl border border-c-border divide-y divide-c-border overflow-hidden">
                {lista.length === 0 && <p className="text-center text-c-text-faint py-8">No hay animales activos que coincidan.</p>}
                {lista.map(({ animal, arete }) => {
                    const rev = revsDelDia.get(animal.id);
                    const alerta = tratadoYNoMejora(famachaRevs, animal.id);
                    const dosisInfo = infoDosificacion(famachaRevs, animal.id, fecha);
                    const tendencia = rev ? tendenciaFamacha(famachaRevs, animal.id, fecha, rev.score) : null;
                    const dosisChipCls = dosisInfo.nivel === 'block' ? 'text-red-600' : dosisInfo.nivel === 'warn' ? 'text-amber-600' : 'text-c-text-faint';
                    // "hold": una fila ya declarada queda bloqueada hasta pulsar el lápiz.
                    const bloqueada = !!rev && !unlockedIds.has(animal.id);
                    return (
                        <div key={animal.id} className="px-3 py-2.5 space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-c-text-strong truncate">{arete}</span>
                                        {tendencia && <TrendArrow tendencia={tendencia} size={15} />}
                                        {alerta && (
                                            <span title="Tratado y no mejora">
                                                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0" />
                                            </span>
                                        )}
                                    </div>
                                    {/* Precedente de dosis: cuántos días desde la última aplicación */}
                                    {dosisInfo.ultimaDosisFecha && (
                                        <span className={`text-[11px] ${dosisChipCls}`}>
                                            💉 Dosis hace {dosisInfo.diasDesdeUltimaDosis}d{dosisInfo.nivel === 'block' ? ' · máx. alcanzado' : dosisInfo.nivel === 'warn' ? ' · espera 7d' : ''}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {([1, 2, 3, 4, 5] as FamachaScore[]).map(score => {
                                        const selected = rev?.score === score;
                                        return (
                                            <button
                                                key={score}
                                                disabled={savingId === animal.id || bloqueada}
                                                onClick={() => handleScore(animal.id, arete, score)}
                                                className={`w-9 h-9 rounded-lg font-bold text-sm border transition-all disabled:opacity-50 ${
                                                    selected ? `${scoreColor[score]} text-white scale-105` : 'bg-c-surface-2 border-c-border-strong text-c-text-muted hover:border-c-text-faint'
                                                } ${bloqueada && !selected ? 'opacity-30' : ''}`}
                                            >
                                                {score}
                                            </button>
                                        );
                                    })}
                                    {/* Lápiz para editar una fila en "hold" */}
                                    {bloqueada && (
                                        <button
                                            onClick={() => unlockRow(animal.id)}
                                            title="Editar valor declarado"
                                            className="ml-1 w-9 h-9 rounded-lg flex items-center justify-center text-c-text-muted bg-c-surface-2 border border-c-border-strong hover:text-rose-500"
                                        >
                                            <Pencil size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>
                            {/* Fila de decisión: sugerencia + dosis + editar/eliminar */}
                            {rev && (
                                <div className="flex items-center gap-2 pl-0.5">
                                    <span className={`text-[11px] font-semibold ${accionText[rev.accion].cls}`}>{accionText[rev.accion].label}</span>
                                    {bloqueada && <Lock size={11} className="text-c-text-faint" />}
                                    {!bloqueada && (
                                        <button
                                            onClick={() => handleDeleteRev(animal.id)}
                                            disabled={savingId === animal.id}
                                            title="Eliminar revisión de este día"
                                            className="flex items-center gap-1 text-[11px] font-semibold text-red-500 disabled:opacity-50"
                                        >
                                            <Trash2 size={13} /> Eliminar
                                        </button>
                                    )}
                                    <button
                                        disabled={savingId === animal.id}
                                        onClick={() => handleToggleDose(animal.id, arete)}
                                        className={`ml-auto flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all disabled:opacity-50 ${
                                            rev.dosis
                                                ? 'bg-orange-600 border-orange-600 text-white'
                                                : 'bg-c-surface-2 border-c-border-strong text-c-text-muted'
                                        }`}
                                    >
                                        {rev.dosis ? <Check size={14} /> : <Syringe size={14} />}
                                        {rev.dosis ? 'Dosificado' : 'No dosificado'}
                                    </button>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            )}

            {/* Modal + animal */}
            {showAdd && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center" onClick={() => setShowAdd(false)}>
                    <div className="w-full max-w-sm bg-c-surface rounded-t-2xl sm:rounded-2xl p-5 m-0 sm:m-4 animate-slide-up" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-c-text-strong text-lg">Agregar animal</h3>
                            <button onClick={() => setShowAdd(false)} className="text-c-text-faint hover:text-c-text"><X size={20} /></button>
                        </div>
                        <input
                            type="text"
                            value={newArete}
                            onChange={e => setNewArete(e.target.value)}
                            placeholder="Arete (ej. A047)"
                            className="w-full bg-c-surface-2 text-c-text rounded-lg px-3 py-2.5 border border-c-border focus:outline-none focus:ring-2 focus:ring-rose-500 mb-3"
                        />
                        <div className="flex gap-2 mb-3">
                            {(['Hembra', 'Macho'] as const).map(s => (
                                <button key={s} onClick={() => setNewSexo(s)} className={`flex-1 py-2 rounded-lg font-semibold text-sm border ${newSexo === s ? 'bg-rose-500/20 border-rose-500 text-rose-600' : 'bg-c-surface-2 border-c-border text-c-text-muted'}`}>{s}</button>
                            ))}
                        </div>
                        {addError && <p className="text-red-600 text-sm mb-3">{addError}</p>}
                        <button onClick={handleAddAnimal} className="w-full bg-rose-500 hover:bg-rose-600 text-white font-bold py-3 rounded-xl">Agregar</button>
                    </div>
                </div>
            )}
        </div>
    );
}
