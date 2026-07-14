// src/pages/modules/lactokeeper/LactoKeeperDashboardPage.tsx (CORREGIDO - Flujo de importación ELIMINADO)

import { useState, useMemo, useRef } from 'react'; // (CORREGIDO) React sí se usa
import { Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, ReferenceLine, ComposedChart, Line, Cell, Tooltip, CartesianGrid } from 'recharts';
import { useData } from '../../../context/DataContext';
import { useHerdAnalytics } from '../../../hooks/useHerdAnalytics';
import { useHerdLactation } from '../../../hooks/useHerdLactation';
// (CORREGIDO) Eliminados Plus, Camera, FilePen
import { Droplet, ActivitySquare, BarChart as BarChartIconLucide, Info, TrendingUp, Activity, Calendar, Layers, Target, Download, FileText, FileSpreadsheet, Globe } from 'lucide-react';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
import { Modal } from '../../../components/ui/Modal';
import { exportLactationToPDF, exportLactationToCSV, exportLactationToHTML } from '../../../utils/lactationExporter';

interface LactoKeeperDashboardProps {
  onNavigateToAnalysis: () => void;
}

export default function LactoKeeperDashboardPage({ onNavigateToAnalysis }: LactoKeeperDashboardProps) {
  const { animals, weighings, parturitions, isLoading } = useData();
  const { totalVientres } = useHerdAnalytics();
  const [period, setPeriod] = useState<'1m' | '3m' | '6m' | '12m' | 'all'>('6m');
  const [isChartInfoModalOpen, setIsChartInfoModalOpen] = useState(false);
  const [isGaussInfoModalOpen, setIsGaussInfoModalOpen] = useState(false);

  // Opciones configurables de la curva + menú de descargas.
  const [showBand, setShowBand] = useState(true);
  const [showWood, setShowWood] = useState(true);
  const [showMean, setShowMean] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const lactationCardRef = useRef<HTMLDivElement>(null);

  // Curva de lactancia + KPIs (sensible a la config de la finca).
  const lactation = useHerdLactation(period);

  const PERIOD_LABELS: Record<typeof period, string> = {
    '1m': 'Último mes', '3m': 'Último trimestre', '6m': 'Últimos 6 meses',
    '12m': 'Último año', 'all': 'Histórico completo',
  };

  const handleExport = async (kind: 'pdf' | 'csv' | 'html') => {
    setExportMenuOpen(false);
    const meta = { periodLabel: PERIOD_LABELS[period], herdAverage: analytics.herdAverage, activeGoats: analytics.activeGoats };
    try {
      if (kind === 'csv') { exportLactationToCSV(lactation, meta); return; }
      if (kind === 'html') { exportLactationToHTML(lactation, meta); return; }
      // PDF captura la tarjeta renderizada
      if (!lactationCardRef.current) return;
      setIsExporting(true);
      await exportLactationToPDF(lactationCardRef.current, lactation, meta);
    } catch (e) {
      console.error('Error exportando la curva de lactancia:', e);
      alert('No se pudo generar la descarga. Intenta de nuevo.');
    } finally {
      setIsExporting(false);
    }
  };

  const analytics = useMemo(() => {
    // ... (Lógica de 'analytics' sin cambios) ...
    if (isLoading || !weighings.length || !animals.length) {
      return {
        herdAverage: 0, activeGoats: 0, stageDist: [],
        gaussData: { distribution: [], mean: 0, stdDev: 0 }
      };
    }
    let animalsInLastWeighing = 0;
    if (weighings.length > 0) {
        const latestDate = weighings.reduce((max, w) => w.date > max ? w.date : max, weighings[0].date);
        animalsInLastWeighing = new Set(weighings.filter(w => w.date === latestDate).map(w => w.goatId)).size;
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
    return { herdAverage: totalAverage, activeGoats: animalsInLastWeighing, stageDist, gaussData };
  }, [animals, weighings, parturitions, isLoading]);

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

            {/* ===================== CURVA DE LACTANCIA ===================== */}
            <div className="bg-c-surface rounded-2xl p-5 border border-c-border shadow-sm">
                <div className="flex justify-between items-start gap-3 mb-1">
                    <div className="flex items-center gap-2 text-c-text-strong font-bold text-sm">
                        <TrendingUp size={18} className="text-c-accent-sky"/>
                        <span>Curva de Lactancia</span>
                        <button onClick={() => setIsChartInfoModalOpen(true)} className="text-c-text-faint hover:text-c-accent-sky transition-colors">
                            <Info size={15}/>
                        </button>
                    </div>
                    <div className="flex bg-c-surface-2 rounded-lg p-0.5 shrink-0">
                        {([['1m','Mes'],['3m','Trim.'],['6m','Sem.'],['12m','Año'],['all','Todo']] as const).map(([val, lbl]) => (
                            <button key={val} onClick={() => setPeriod(val)} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${period === val ? 'bg-c-accent-sky text-white shadow-sm' : 'text-c-text-muted hover:text-c-text'}`}>
                                {lbl}
                            </button>
                        ))}
                    </div>
                </div>
                <p className="text-[11px] text-c-text-faint mb-3">
                    Basada en <span className="font-semibold text-c-text-muted">{lactation.sampleSize.weighings}</span> pesajes de <span className="font-semibold text-c-text-muted">{lactation.sampleSize.animals}</span> animales{period !== 'all' ? ` · últimos ${period === '1m' ? '30 días' : period === '3m' ? '3 meses' : period === '6m' ? '6 meses' : '12 meses'}` : ' · histórico completo'} · meta {lactation.targetDays} d.
                </p>

                {/* Barra de opciones: toggles configurables + descargas */}
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                    <div className="flex gap-1.5 flex-wrap">
                        {([['band', 'Banda', showBand, setShowBand], ['wood', 'Curva', showWood, setShowWood], ['mean', 'Puntos', showMean, setShowMean]] as const).map(([key, lbl, val, setter]) => (
                            <button
                                key={key}
                                onClick={() => setter(v => !v)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${val ? 'bg-c-accent-sky/10 border-c-accent-sky text-c-accent-sky' : 'bg-c-surface-2 border-c-border text-c-text-muted hover:text-c-text'}`}
                            >
                                {lbl}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setExportMenuOpen(o => !o)}
                            disabled={isExporting || (!lactation.kpis && lactation.chart.length === 0)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full bg-c-accent-sky text-white shadow-sm hover:bg-c-accent-sky/90 transition-colors disabled:opacity-50 active:scale-95"
                        >
                            <Download size={14} />
                            {isExporting ? 'Generando…' : 'Descargar'}
                        </button>
                        {exportMenuOpen && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={() => setExportMenuOpen(false)} />
                                <div className="absolute right-0 mt-2 z-20 w-56 bg-c-surface border border-c-border rounded-xl shadow-xl overflow-hidden animate-fade-in">
                                    {[
                                        { kind: 'pdf' as const, icon: FileText, tint: 'text-brand-red', title: 'PDF', sub: 'Gráfico + tablas para imprimir' },
                                        { kind: 'html' as const, icon: Globe, tint: 'text-c-accent-sky', title: 'HTML interactivo', sub: 'Súper gráfico dinámico, offline' },
                                        { kind: 'csv' as const, icon: FileSpreadsheet, tint: 'text-c-accent', title: 'CSV para Excel', sub: 'Datos y KPIs en tabla' },
                                    ].map(opt => (
                                        <button
                                            key={opt.kind}
                                            onClick={() => handleExport(opt.kind)}
                                            className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-c-surface-2 transition-colors border-b border-c-border last:border-0"
                                        >
                                            <opt.icon size={18} className={`${opt.tint} mt-0.5 shrink-0`} />
                                            <div>
                                                <p className="text-sm font-semibold text-c-text-strong leading-tight">{opt.title}</p>
                                                <p className="text-[11px] text-c-text-faint leading-tight mt-0.5">{opt.sub}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>

              <div ref={lactationCardRef} className="bg-c-surface rounded-xl">
                {/* KPIs — 2×2 amplios y legibles */}
                {lactation.kpis && (
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        {[
                            { icon: Calendar, tint: 'text-c-accent-sky', label: 'Día pico', value: `${lactation.kpis.peakDay}`, unit: 'días', help: 'DEL del máximo' },
                            { icon: TrendingUp, tint: 'text-c-accent-gold', label: 'Producción pico', value: lactation.kpis.peakYield.toFixed(2), unit: 'Kg/día', help: 'Máximo del rebaño' },
                            { icon: Activity, tint: 'text-c-accent', label: 'Persistencia', value: `${lactation.kpis.persistence}`, unit: '%', help: '100 días tras el pico' },
                            { icon: Target, tint: 'text-c-accent-sky', label: `Proy. ${lactation.targetDays} d`, value: `${lactation.kpis.projTotal}`, unit: 'Kg', help: 'Total por lactancia' },
                        ].map((k) => (
                            <div key={k.label} className="bg-c-surface-2 rounded-2xl p-4 border border-c-border/60">
                                <div className="flex items-center gap-2 mb-2">
                                    <k.icon size={16} className={k.tint} />
                                    <span className="text-[11px] font-semibold text-c-text-muted uppercase tracking-wide">{k.label}</span>
                                </div>
                                <p className="text-2xl font-bold text-c-text-strong leading-none">
                                    {k.value}<span className="text-sm font-medium text-c-text-faint ml-1">{k.unit}</span>
                                </p>
                                <p className="text-[10px] text-c-text-faint mt-1.5">{k.help}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Gráfico amplio */}
                <div className="w-full h-72">
                    <ResponsiveContainer>
                        <ComposedChart data={lactation.chart} margin={{ top: 8, right: 12, left: 0, bottom: 18 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis type="number" dataKey="del" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#cbd5e1" tickLine={false} axisLine={false} domain={[0, lactation.displayMax]} ticks={Array.from({ length: Math.floor(lactation.displayMax / 50) + 1 }, (_, i) => i * 50)} label={{ value: 'Días en leche (DEL)', position: 'insideBottom', offset: -8, fontSize: 11, fill: '#94a3b8' }} />
                            <YAxis orientation="right" tick={{ fill: '#64748b', fontSize: 11 }} stroke="#cbd5e1" tickLine={false} axisLine={false} domain={[0, 'auto']} width={34} label={{ value: 'Kg/día', angle: 90, position: 'insideRight', fontSize: 10, fill: '#94a3b8' }} />
                            <Tooltip content={({ active, payload }: any) => {
                                if (!active || !payload || !payload.length) return null;
                                const d = payload[0].payload;
                                return (
                                    <div className="bg-c-surface border border-c-border rounded-lg px-3 py-2 shadow-lg text-xs">
                                        <p className="font-bold text-c-text">Día {Math.round(d.del)}</p>
                                        {d.wood != null && <p className="text-c-accent-sky font-semibold">Curva: {d.wood} Kg</p>}
                                        {d.p25 != null && d.p75 != null && <p className="text-c-text-muted">Rango: {d.p25}–{d.p75} Kg</p>}
                                        <p className="text-c-text-faint">{d.n} pesajes</p>
                                    </div>
                                );
                            }} />
                            {/* Banda P25–P75: base invisible + banda visible (apiladas) */}
                            {showBand && <Area type="monotone" dataKey="p25" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />}
                            {showBand && <Area type="monotone" dataKey="band" stackId="band" stroke="none" fill="#1E6FAD" fillOpacity={0.12} isAnimationActive={false} />}
                            {/* Promedios por intervalo (puntos) */}
                            {showMean && <Line type="monotone" dataKey="mean" stroke="none" dot={{ r: 2.5, fill: '#1E6FAD', fillOpacity: 0.5, strokeWidth: 0 }} isAnimationActive={false} connectNulls={false} />}
                            {/* Curva de Wood ajustada */}
                            {showWood && <Line type="monotone" dataKey="wood" stroke="#1E6FAD" strokeWidth={3} dot={false} isAnimationActive={false} connectNulls />}
                            {showWood && lactation.kpis && <ReferenceLine x={lactation.kpis.peakDay} stroke="#2F843C" strokeDasharray="4 4" label={{ value: 'Pico', fill: '#2F843C', fontSize: 10, position: 'top' }} />}
                            {/* Meta de lactancia (config de la finca) */}
                            <ReferenceLine x={lactation.targetDays} stroke="#B45309" strokeDasharray="2 4" strokeWidth={1.5} label={{ value: `Meta ${lactation.targetDays}d`, fill: '#B45309', fontSize: 10, position: 'insideTopRight' }} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>

                {/* Leyenda */}
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-[10px] text-c-text-faint">
                    <span className="flex items-center gap-1.5"><span className="inline-block w-4 h-0.5 rounded bg-[#1E6FAD]"/>Curva ajustada (Wood)</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded-sm bg-[#1E6FAD]/20"/>Rango P25–P75</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t border-dashed border-[#2F843C]"/>Pico</span>
                    <span className="flex items-center gap-1.5"><span className="inline-block w-4 border-t border-dashed border-[#B45309]"/>Meta lactancia</span>
                </div>

                {!lactation.kpis && (
                    <p className="text-xs text-c-text-faint text-center mt-3">Aún no hay suficientes pesajes para ajustar una curva definida. Se muestra la banda de dispersión disponible. Amplía el período para incluir más datos.</p>
                )}
              </div>
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