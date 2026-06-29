// src/pages/modules/lactokeeper/LactoKeeperDashboardPage.tsx (CORREGIDO - Flujo de importación ELIMINADO)

import { useState, useMemo } from 'react'; // (CORREGIDO) React sí se usa
import { Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, ReferenceLine, ComposedChart, Line, Cell, Tooltip, CartesianGrid } from 'recharts';
import { useData } from '../../../context/DataContext';
import { useHerdAnalytics } from '../../../hooks/useHerdAnalytics';
import { calculateDEL } from '../../../utils/calculations';
// (CORREGIDO) Eliminados Plus, Camera, FilePen
import { Droplet, ActivitySquare, BarChart as BarChartIconLucide, Info, TrendingUp, Activity, Calendar, Layers } from 'lucide-react';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
import { Modal } from '../../../components/ui/Modal';
// (CORREGIDO) Eliminadas importaciones de flujo
import { Weighing } from '../../../db/local';

// --- Modelo de lactancia de Wood: y = a · t^b · e^(−c·t) ---
// Se ajusta por mínimos cuadrados linealizando ln(y) = ln(a) + b·ln(t) − c·t.
interface WoodParams { a: number; b: number; c: number; }

function solve3(A: number[][], b: number[]): number[] | null {
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < 3; col++) {
        let piv = col;
        for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
        if (Math.abs(M[piv][col]) < 1e-12) return null;
        [M[col], M[piv]] = [M[piv], M[col]];
        for (let r = 0; r < 3; r++) {
            if (r === col) continue;
            const f = M[r][col] / M[col][col];
            for (let k = col; k < 4; k++) M[r][k] -= f * M[col][k];
        }
    }
    return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

function fitWoodParams(points: { t: number; y: number }[]): WoodParams | null {
    const pts = points.filter(p => p.t >= 1 && p.y > 0 && isFinite(p.t) && isFinite(p.y));
    if (pts.length < 12) return null;
    const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const rhs = [0, 0, 0];
    for (const { t, y } of pts) {
        const x = [1, Math.log(t), t];
        const ly = Math.log(y);
        for (let i = 0; i < 3; i++) { rhs[i] += x[i] * ly; for (let j = 0; j < 3; j++) S[i][j] += x[i] * x[j]; }
    }
    const beta = solve3(S, rhs);
    if (!beta) return null;
    const a = Math.exp(beta[0]); const b = beta[1]; const c = -beta[2];
    if (!(a > 0) || !(b > 0) || !(c > 0)) return null; // sin pico => modelo no útil
    return { a, b, c };
}

const evalWood = (p: WoodParams, t: number) => p.a * Math.pow(t, p.b) * Math.exp(-p.c * t);

function percentile(sorted: number[], q: number): number {
    if (!sorted.length) return 0;
    const idx = (sorted.length - 1) * q;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

interface LactoKeeperDashboardProps {
  onNavigateToAnalysis: () => void;
}

export default function LactoKeeperDashboardPage({ onNavigateToAnalysis }: LactoKeeperDashboardProps) {
  const { animals, weighings, parturitions, isLoading } = useData();
  const { totalVientres } = useHerdAnalytics();
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '12m' | 'all'>('6m');
  const [isChartInfoModalOpen, setIsChartInfoModalOpen] = useState(false);
  const [isGaussInfoModalOpen, setIsGaussInfoModalOpen] = useState(false);

  // --- (CORREGIDO) Estados del flujo de importación ELIMINADOS ---

  const analytics = useMemo(() => {
    // ... (Lógica de 'analytics' sin cambios) ...
    if (isLoading || !weighings.length || !animals.length) {
      return {
        herdAverage: 0, activeGoats: 0, woodChart: [], woodKpis: null, stageDist: [],
        sampleSize: { weighings: 0, animals: 0 },
        gaussData: { distribution: [], mean: 0, stdDev: 0 }
      };
    }
    let animalsInLastWeighing = 0;
    if (weighings.length > 0) {
        const latestDate = weighings.reduce((max, w) => w.date > max ? w.date : max, weighings[0].date);
        animalsInLastWeighing = new Set(weighings.filter(w => w.date === latestDate).map(w => w.goatId)).size;
    }
    // Filtrar los pesajes por período (ventana hacia atrás desde hoy).
    const PERIOD_DAYS: Record<string, number | null> = { '1m': 30, '3m': 90, '6m': 182, '12m': 365, 'all': null };
    const days = PERIOD_DAYS[period];
    const cutoffMs = days ? Date.now() - days * 86400000 : null;
    const weighingsForChart = cutoffMs
        ? weighings.filter((w: Weighing) => new Date(w.date + 'T00:00:00').getTime() >= cutoffMs)
        : weighings;

    // Puntos (DEL, kg) para ajustar la curva de lactancia del rebaño.
    const delPoints: { t: number; y: number }[] = [];
    const curveAnimals = new Set<string>();
    weighingsForChart.forEach(w => {
        const parturitionForWeighing = parturitions
            .filter(p => p.goatId === w.goatId && new Date(w.date) >= new Date(p.parturitionDate))
            .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
        if (!parturitionForWeighing) return;
        const del = calculateDEL(parturitionForWeighing.parturitionDate, w.date);
        if (del >= 1 && w.kg > 0) { delPoints.push({ t: del, y: w.kg }); curveAnimals.add(w.goatId); }
    });
    const sampleSize = { weighings: delPoints.length, animals: curveAnimals.size };

    const woodParams = fitWoodParams(delPoints);
    const observedMax = delPoints.reduce((m, p) => Math.max(m, p.t), 0);
    const displayMax = Math.min(320, Math.max(120, observedMax));
    const BIN = 10;
    const woodChart: any[] = [];
    for (let start = 0; start < displayMax; start += BIN) {
        const center = start + BIN / 2;
        const ys = delPoints.filter(p => p.t >= start && p.t < start + BIN).map(p => p.y).sort((a, b) => a - b);
        const p25 = ys.length ? percentile(ys, 0.25) : null;
        const p75 = ys.length ? percentile(ys, 0.75) : null;
        woodChart.push({
            del: center,
            mean: ys.length ? +(ys.reduce((s, v) => s + v, 0) / ys.length).toFixed(2) : null,
            p25: p25 !== null ? +p25.toFixed(2) : null,
            band: (p25 !== null && p75 !== null) ? +(p75 - p25).toFixed(2) : null,
            wood: woodParams ? +evalWood(woodParams, center).toFixed(2) : null,
            n: ys.length,
        });
    }

    let woodKpis: { peakDay: number; peakYield: number; persistence: number; proj305: number } | null = null;
    if (woodParams) {
        const peakDay = woodParams.b / woodParams.c;
        const peakYield = evalWood(woodParams, peakDay);
        let proj = 0;
        for (let t = 1; t <= 305; t++) proj += evalWood(woodParams, t);
        const post = evalWood(woodParams, peakDay + 100);
        if (peakDay > 0 && peakDay < 400 && peakYield > 0 && isFinite(proj)) {
            woodKpis = {
                peakDay: Math.round(peakDay),
                peakYield: +peakYield.toFixed(2),
                persistence: Math.round((post / peakYield) * 100),
                proj305: Math.round(proj),
            };
        }
    }

    // Distribución por etapa de lactancia (animales con lactancia activa, a hoy).
    const todayMs = Date.now();
    const STAGE_DEFS = [
        { key: 'Inicio', sub: '0–30 d', max: 30, color: '#22c55e' },
        { key: 'Pico', sub: '31–90 d', max: 90, color: '#3b82f6' },
        { key: 'Media', sub: '91–200 d', max: 200, color: '#f59e0b' },
        { key: 'Final', sub: '+200 d', max: Infinity, color: '#ef4444' },
    ];
    const stageAgg: Record<string, { count: number; sumKg: number; nKg: number }> = {};
    STAGE_DEFS.forEach(s => stageAgg[s.key] = { count: 0, sumKg: 0, nKg: 0 });
    parturitions.filter(p => p.status === 'activa').forEach(p => {
        const del = Math.floor((todayMs - new Date(p.parturitionDate).getTime()) / 86400000);
        if (del < 0) return;
        const stage = STAGE_DEFS.find(s => del <= s.max)!;
        stageAgg[stage.key].count++;
        const lastW = weighings.filter(w => w.goatId === p.goatId).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
        if (lastW && lastW.kg > 0) { stageAgg[stage.key].sumKg += lastW.kg; stageAgg[stage.key].nKg++; }
    });
    const stageDist = STAGE_DEFS.map(s => ({
        stage: s.key, sub: s.sub, color: s.color,
        count: stageAgg[s.key].count,
        avgKg: stageAgg[s.key].nKg ? +(stageAgg[s.key].sumKg / stageAgg[s.key].nKg).toFixed(2) : 0,
    }));
    const animalAverages = animals.map(animal => {
        const animalWeighings = weighings.filter(w => w.goatId === animal.id);
        if (animalWeighings.length === 0) return null;
        const totalKg = animalWeighings.reduce((sum, w) => sum + w.kg, 0);
        return { avg: totalKg / animalWeighings.length };
    }).filter(Boolean) as { avg: number; }[];
    const mean = animalAverages.length > 0 ? animalAverages.reduce((sum, g) => sum + g.avg, 0) / animalAverages.length : 0;
    const stdDev = animalAverages.length > 0 ? Math.sqrt(animalAverages.reduce((sum, g) => sum + Math.pow(g.avg - mean, 2), 0) / animalAverages.length) : 0;
    const distribution = [];
    if(animalAverages.length > 0){
        const minProd = Math.floor(Math.min(...animalAverages.map(g => g.avg)) * 4) / 4;
        const maxProd = Math.ceil(Math.max(...animalAverages.map(g => g.avg)) * 4) / 4;
        for (let i = minProd; i <= maxProd; i += 0.25) {
            const rangeStart = i; const rangeEnd = i + 0.25;
            const count = animalAverages.filter(g => g.avg >= rangeStart && g.avg < rangeEnd).length;
            if (count > 0) {
              distribution.push({ range: `${rangeStart.toFixed(2)}`, count });
            }
        }
    }
    const gaussData = { distribution, mean, stdDev };
    const totalAverage = weighings.length > 0 ? weighings.reduce((sum,w) => sum + w.kg, 0) / weighings.length : 0;
    return { herdAverage: totalAverage, activeGoats: animalsInLastWeighing, woodChart, woodKpis, stageDist, sampleSize, gaussData };
  }, [animals, weighings, parturitions, isLoading, period]);

  // --- (CORREGIDO) Handlers del flujo de importación ELIMINADOS ---

  if (isLoading) {
    return <div className="text-center p-10"><h1 className="text-2xl text-c-text-muted">Cargando datos del rebaño...</h1></div>;
  }

  return (
    <>
        {/* --- (CORREGIDO) Botón Flotante ELIMINADO --- */}

        {/* (CORREGIDO) Padding inferior 'pb-24' ELIMINADO */}
        <div className="w-full max-w-2xl mx-auto space-y-4 px-4"> 
            <header className="text-center pt-4 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-c-text">Dashboard de Producción</h1>
                <p className="text-md text-c-text-muted">Análisis General de LactoKeeper</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-c-surface rounded-2xl p-4 border border-c-border shadow-sm">
                    <div className="flex items-center space-x-2 text-c-text-muted font-semibold mb-2 text-xs uppercase tracking-wider">
                        <Droplet size={14} className="text-c-accent-sky" />
                        <span>Promedio Global</span>
                    </div>
                    <p className="text-4xl font-bold tracking-tight text-c-accent-gold">{analytics.herdAverage.toFixed(2)} <span className="text-2xl font-medium text-c-text-faint">Kg</span></p>
                </div>
                 <button
                   onClick={onNavigateToAnalysis}
                   className="bg-c-surface rounded-2xl p-4 border border-c-border shadow-sm text-left hover:border-c-accent-sky transition-colors active:scale-[0.99]"
                 >
                    <div className="flex items-center space-x-2 text-c-text-muted font-semibold mb-2 text-xs uppercase tracking-wider"><ActivitySquare size={14} className="text-c-accent-sky" /><span>Animales en Ordeño</span></div>
                    <div className="flex items-baseline gap-2 flex-wrap">
                        <p className="text-3xl font-bold tracking-tight text-c-text leading-none">{analytics.activeGoats}</p>
                        <p className="text-sm font-medium text-c-text-muted">de {totalVientres} {totalVientres === 1 ? 'vientre' : 'vientres'}</p>
                    </div>
                    <p className="text-xs font-bold text-c-accent-sky mt-1.5">
                        {totalVientres > 0 ? Math.round((analytics.activeGoats / totalVientres) * 100) : 0}% en ordeño
                    </p>
                </button>
            </div>

            {/* ... (Resto de los gráficos de Curva de Lactancia y Distribución SIN CAMBIOS) ... */}
            <div className="bg-c-surface rounded-2xl p-4 border border-c-border shadow-sm">
                <div className="flex justify-between items-center border-b border-c-border pb-2 mb-4">
                    <div className="flex items-center space-x-2 text-c-text-muted font-semibold text-xs uppercase tracking-wider">
                        <BarChartIconLucide size={16}/>
                        <span>Curva de Lactancia</span>
                        <button onClick={() => setIsChartInfoModalOpen(true)} className="text-c-text-faint hover:text-c-text transition-colors">
                            <Info size={14}/>
                        </button>
                    </div>
                    <div className="flex bg-c-surface-2 rounded-lg p-0.5">
                        {([['1m','Mes'],['3m','Trim.'],['6m','Sem.'],['12m','Año'],['all','Todo']] as const).map(([val, lbl]) => (
                            <button key={val} onClick={() => setPeriod(val)} className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${period === val ? 'bg-c-accent-sky text-white shadow-sm' : 'text-c-text-muted hover:text-c-text'}`}>
                                {lbl}
                            </button>
                        ))}
                    </div>
                </div>
                <p className="text-[11px] text-c-text-faint -mt-2 mb-3">
                    Basada en <span className="font-semibold text-c-text-muted">{analytics.sampleSize.weighings}</span> pesajes de <span className="font-semibold text-c-text-muted">{analytics.sampleSize.animals}</span> animales{period !== 'all' ? ` (últimos ${period === '1m' ? '30 días' : period === '3m' ? '3 meses' : period === '6m' ? '6 meses' : '12 meses'})` : ''}.
                </p>
                {analytics.woodKpis && (
                    <div className="grid grid-cols-4 gap-2 mb-3">
                        {[
                            { icon: Calendar, label: 'Día pico', value: `${analytics.woodKpis.peakDay}`, unit: 'd' },
                            { icon: TrendingUp, label: 'Pico', value: analytics.woodKpis.peakYield.toFixed(2), unit: 'Kg' },
                            { icon: Activity, label: 'Persistencia', value: `${analytics.woodKpis.persistence}`, unit: '%' },
                            { icon: Droplet, label: 'Proy. 305d', value: `${analytics.woodKpis.proj305}`, unit: 'Kg' },
                        ].map((k) => (
                            <div key={k.label} className="bg-c-surface-2 rounded-xl p-2 text-center">
                                <k.icon size={13} className="text-c-accent-sky mx-auto mb-1" />
                                <p className="text-base font-bold text-c-text leading-none">{k.value}<span className="text-[10px] font-medium text-c-text-faint ml-0.5">{k.unit}</span></p>
                                <p className="text-[9px] text-c-text-faint uppercase tracking-wide mt-1">{k.label}</p>
                            </div>
                        ))}
                    </div>
                )}
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <ComposedChart data={analytics.woodChart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis type="number" dataKey="del" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#cbd5e1" tickLine={false} axisLine={false} domain={[0, 'dataMax']} label={{ value: 'Días en leche (DEL)', position: 'insideBottom', offset: -3, fontSize: 10, fill: '#94a3b8' }} />
                            <YAxis orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#cbd5e1" tickLine={false} axisLine={false} domain={[0, 'auto']} width={30} />
                            <Tooltip content={({ active, payload }: any) => {
                                if (!active || !payload || !payload.length) return null;
                                const d = payload[0].payload;
                                const p75 = (d.p25 != null && d.band != null) ? (d.p25 + d.band).toFixed(2) : null;
                                return (
                                    <div className="bg-c-surface border border-c-border rounded-lg px-3 py-2 shadow-lg text-xs">
                                        <p className="font-bold text-c-text">Día {Math.round(d.del)}</p>
                                        {d.wood != null && <p className="text-c-accent-sky font-semibold">Curva: {d.wood} Kg</p>}
                                        {d.p25 != null && p75 != null && <p className="text-c-text-muted">Rango: {d.p25}–{p75} Kg</p>}
                                        <p className="text-c-text-faint">{d.n} pesajes</p>
                                    </div>
                                );
                            }} />
                            {/* Banda P25–P75: base invisible + banda visible (apiladas) */}
                            <Area type="monotone" dataKey="p25" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
                            <Area type="monotone" dataKey="band" stackId="band" stroke="none" fill="#1E6FAD" fillOpacity={0.12} isAnimationActive={false} />
                            {/* Curva de Wood ajustada */}
                            <Line type="monotone" dataKey="wood" stroke="#1E6FAD" strokeWidth={3} dot={false} isAnimationActive={false} connectNulls />
                            {analytics.woodKpis && <ReferenceLine x={analytics.woodKpis.peakDay} stroke="#2F843C" strokeDasharray="4 4" label={{ value: 'Pico', fill: '#2F843C', fontSize: 10, position: 'top' }} />}
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                {!analytics.woodKpis && (
                    <p className="text-xs text-c-text-faint text-center mt-2">Aún no hay suficientes pesajes para ajustar una curva definida. Se muestra la banda de dispersión disponible.</p>
                )}
            </div>

            {/* Distribución por etapa de lactancia */}
            <div className="bg-c-surface rounded-2xl p-4 border border-c-border shadow-sm">
                <div className="flex items-center gap-2 border-b border-c-border pb-2 mb-4 text-c-text-muted font-semibold text-xs uppercase tracking-wider">
                    <Layers size={16}/>
                    <span>Etapa de Lactancia (en ordeño)</span>
                </div>
                <div className="w-full h-40">
                    <ResponsiveContainer>
                        <BarChart data={analytics.stageDist} margin={{ top: 16, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="stage" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" tickLine={false} axisLine={false} />
                            <YAxis orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#cbd5e1" tickLine={false} axisLine={false} allowDecimals={false} width={28} />
                            <Tooltip content={({ active, payload }: any) => {
                                if (!active || !payload || !payload.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-c-surface border border-c-border rounded-lg px-3 py-2 shadow-lg text-xs">
                                        <p className="font-bold text-c-text">{d.stage} <span className="text-c-text-faint font-normal">({d.sub})</span></p>
                                        <p className="text-c-text-muted">{d.count} {d.count === 1 ? 'animal' : 'animales'}</p>
                                        <p className="text-c-accent-gold font-semibold">Prom: {d.avgKg} Kg</p>
                                    </div>
                                );
                            }} cursor={{ fill: 'rgba(30,111,173,0.06)' }} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} label={{ position: 'top', fontSize: 11, fill: '#64748b' }}>
                                {analytics.stageDist.map((s: any) => <Cell key={s.stage} fill={s.color} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                    {analytics.stageDist.map((s: any) => (
                        <div key={s.stage} className="text-center">
                            <p className="text-sm font-bold text-c-text leading-none">{s.avgKg > 0 ? `${s.avgKg}` : '—'}<span className="text-[10px] text-c-text-faint ml-0.5">Kg</span></p>
                            <p className="text-[9px] text-c-text-faint mt-0.5">prom. {s.stage.toLowerCase()}</p>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-c-surface rounded-2xl p-4 border border-c-border shadow-sm">
                <div className="flex justify-between items-center border-b border-c-border pb-2 mb-4">
                    <div className="flex items-center space-x-2 text-c-text-muted font-semibold text-xs uppercase tracking-wider">
                        <BarChartIconLucide size={16}/>
                        <span>Distribución del Rebaño</span>
                        <button onClick={() => setIsGaussInfoModalOpen(true)} className="text-c-text-faint hover:text-c-text transition-colors">
                            <Info size={14}/>
                        </button>
                    </div>
                </div>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={analytics.gaussData.distribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" tickLine={false} axisLine={false} />
                            <YAxis orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(30, 111, 173, 0.06)'}} />
                            <Bar dataKey="count" fill="rgba(30, 111, 173, 0.45)" name="Nº de Cabras" radius={[4, 4, 0, 0]} />
                            <ReferenceLine x={analytics.gaussData.mean.toFixed(2)} stroke="#2F843C" strokeWidth={2} label={{ value: `μ`, fill: '#2F843C', position: 'insideTopLeft' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* --- (CORREGIDO) Flujo de Modales de Importación ELIMINADO --- */}

        {/* ... (Modales de Info de Gráficos SIN CAMBIOS) ... */}
        <Modal    
            isOpen={isChartInfoModalOpen}    
            onClose={() => setIsChartInfoModalOpen(false)}    
            title="¿Qué es la Curva de Lactancia del Rebaño?"
        >
            <div className="text-c-text-muted space-y-4 text-base">
                <p>Es la **curva de lactancia ajustada** de tu rebaño: una línea suave y definida que resume cómo sube y baja la producción a lo largo de los días en leche (DEL).</p>
                <div>
                    <h4 className="font-semibold text-c-text mb-1">¿Cómo se calcula?</h4>
                    <p className="text-sm">Se ajusta el modelo zootécnico de **Wood** (y = a·t^b·e^(−c·t)) a todos tus pesajes. En vez de unir puntos sueltos (que generan picos falsos), se traza la tendencia real. La **banda celeste** muestra la dispersión (rango P25–P75): qué tan parejo ordeña el rebaño en cada etapa.</p>
                </div>
                <div>
                    <h4 className="font-semibold text-c-text mb-1">Los indicadores</h4>
                    <p className="text-sm"><strong>Día pico</strong> y <strong>Pico</strong>: cuándo y cuánto rinde el rebaño en su máximo. <strong>Persistencia</strong>: % del pico que aún se produce 100 días después (más alto = lactancia más sostenida). <strong>Proy. 305d</strong>: producción total estimada por lactancia.</p>
                </div>
                <p className="pt-2 border-t border-c-border text-sm">El <strong>selector de período</strong> (Mes/Trim./Sem./Año/Todo) define qué pesajes alimentan la curva. Debajo del título se indica <strong>cuántos pesajes y animales</strong> se usaron, para saber qué tan confiable es. Con pocos pesajes la curva puede no ajustarse: amplía el período.</p>
            </div>
        </Modal>

        <Modal    
            isOpen={isGaussInfoModalOpen}    
            onClose={() => setIsGaussInfoModalOpen(false)}    
            title="¿Qué es la Distribución del Rebaño?"
        >
            <div className="text-c-text-muted space-y-4 text-base">
                <p>Este gráfico, conocido como Campana de Gauss o distribución normal, clasifica el rendimiento promedio de cada animal en el rebaño.</p>
                <div>
                    <h4 className="font-semibold text-c-text mb-1">Media (μ)</h4>
                    <p className="text-sm">La línea verde marcada como **μ** representa el **promedio de producción de todo el rebaño**. Es el punto de referencia central.</p>
                </div>
                <div>
                    <h4 className="font-semibold text-c-text mb-1">Las Barras</h4>
                    <p className="text-sm">Cada barra muestra cuántos animales caen dentro de un rango específico de producción. Una barra alta en el centro (cerca de μ) indica que la mayoría de tu rebaño tiene un rendimiento promedio y consistente.</p>
                </div>
                <p className="pt-2 border-t border-c-border">Esta herramienta es clave para identificar rápidamente a los animales de élite (extremo derecho) y a los que podrían necesitar atención (extremo izquierdo).</p>
            </div>
        </Modal>
    </>
  );
}