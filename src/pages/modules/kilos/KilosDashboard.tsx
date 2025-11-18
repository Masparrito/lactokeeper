// src/pages/modules/kilos/KilosDashboard.tsx
// (Limpiado de imports no usados)

import React, { useState, useMemo, useRef } from 'react';
// (NUEVO) Importar el hook de analíticas y sus tipos
import { 
    useGrowthAnalytics, 
    GrowthAnalyzedAnimal, 
    CategoryPerformance, 
    TargetClassification, 
    HerdClassification,
    GrowthAnalytics
} from '../../../hooks/useGrowthAnalytics';
// Icons
// --- (CORREGIDO) 'BarChartIcon' y 'Users' eliminados ---
import { ChevronRight, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react';
// Recharts components
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
// UI Components
import { GrowthTooltip } from '../../../components/ui/GrowthTooltip';

// --- SUB-COMPONENTES REUTILIZABLES ---

const KpiCard = ({ icon: Icon, label, value, unit, colorClass }: { icon: React.ElementType, label: string, value: string | number, unit?: string, colorClass?: string }) => (
    <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border ${colorClass || ''}`}>
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Icon size={14} /><span>{label}</span></div>
        <p className="text-2xl font-bold text-white mt-1">{value} <span className="text-lg text-zinc-400">{unit}</span></p>
    </div>
);

// Fila de Animal (Genérica, muestra la clasificación que se le pase)
const AnimalRow = ({ animal, onSelect, type }: {
    animal: GrowthAnalyzedAnimal,
    onSelect: (id: string) => void,
    type: 'target' | 'herd'
}) => {
    
    const classification = type === 'target' ? animal.targetClassification : animal.herdClassification;
    const deviation = type ==='target' ? animal.targetDeviation : animal.herdDeviation;
    
    const classificationColor: Record<TargetClassification | HerdClassification, string> = {
        'Superior': 'text-brand-green',
        'En Meta': 'text-zinc-300',
        'Bajo Meta': 'text-yellow-400',
        'Alerta': 'text-brand-red',
        'Promedio': 'text-zinc-300',
        'Inferior': 'text-brand-red',
        'N/A': 'text-zinc-500',
    };
    
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';
    
    return (
        <button onClick={() => onSelect(animal.id)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border flex justify-between items-center hover:border-brand-green transition-colors min-h-[80px]">
            <div className="min-w-0 pr-3">
                <p className="font-mono font-semibold text-base text-white truncate">{animal.id.toUpperCase()}</p>
                {formattedName && (
                  <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                )}
                <div className="text-xs text-zinc-500 mt-1 min-h-[1rem] truncate">
                    <span>{animal.sex} | {animal.formattedAge} | Cat: {animal.lifecycleStage}</span>
                </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                    <p className="font-semibold text-white text-base">
                        <span className={classificationColor[classification]}>
                            {(deviation * 100).toFixed(0)}%
                        </span>
                        <span className="text-sm text-zinc-400"> / {type === 'target' ? 'Meta' : 'Prom.'}</span>
                    </p>
                    <p className={`font-bold text-xs ${classificationColor[classification]}`}>{classification}</p>
                </div>
                <ChevronRight className="text-zinc-600 w-5 h-5" />
            </div>
        </button>
    );
};

// Fila de Categoría
const CategoryPerformanceRow = ({ category, type }: { category: CategoryPerformance, type: 'target' | 'herd' }) => {
    
    const deviation = type === 'target' ? category.avgTargetDeviation : category.avgHerdDeviation;
    const deviationPct = (deviation * 100).toFixed(0);
    const color = deviation >= 1.0 ? 'text-brand-green' : deviation < 0.85 ? 'text-brand-red' : 'text-yellow-400';

    return (
        <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
            <div>
                <p className="font-semibold text-white">{category.categoryName}</p>
                <p className="text-xs text-zinc-400">{category.animalCount} Animales ({type === 'target' ? `${category.alertCount} en Alerta` : ''})</p>
            </div>
            <div className={`text-right ${color}`}>
                <p className="font-bold text-lg">{deviationPct}%</p>
                <p className="text-xs">Cumplimiento</p>
            </div>
        </div>
    );
};

// --- PÁGINA 1: DASHBOARD (REALIDAD) ---
const RealityDashboard = ({ analytics, onSelectAnimal }: {
    analytics: GrowthAnalytics,
    onSelectAnimal: (animalId: string) => void
}) => {
    const [filter, setFilter] = useState<'all' | 'Superior' | 'Promedio' | 'Inferior'>('all');

    const distribution = [
        { name: 'Inferior', count: analytics.herdKPIs.belowAvgPct, fill: '#FF3B30' },
        { name: 'Prom./Sup.', count: analytics.herdKPIs.aboveAvgPct, fill: '#34C759' },
    ];

    const filteredAnimals = useMemo(() => {
        let list = [...analytics.animals].sort((a,b) => b.herdDeviation - a.herdDeviation);
        if (filter === 'all') return list;
        return list.filter(a => a.herdClassification === filter);
    }, [analytics.animals, filter]);

    const handleBarClick = (data: any) => {
        if (data?.payload?.name) {
            const name = data.payload.name;
            let newFilter: typeof filter = 'all';
            if (name === 'Inferior') newFilter = 'Inferior';
            if (name === 'Prom./Sup.') newFilter = 'Superior';
            setFilter(prev => prev === newFilter ? 'all' : newFilter);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pb-24 pt-4">
             <header className="text-center">
                <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard (Realidad)</h1>
                <p className="text-md text-zinc-400">{analytics.herdKPIs.totalAnimals} Animales vs. Promedio</p>
            </header>
            
            <KpiCard 
                icon={TrendingUp} 
                label="Desempeño Gral. Finca" 
                value={(analytics.herdKPIs.avgDeviation * 100).toFixed(0)} 
                unit="%"
                colorClass={analytics.herdKPIs.avgDeviation > 1 ? "border-brand-green/50" : "border-brand-red/50"}
            />
            
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="text-lg font-semibold text-white mb-4">Rendimiento vs. Promedio</h3>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} layout="vertical">
                            <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <Tooltip content={<GrowthTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" name="%" onClick={handleBarClick} cursor="pointer">
                                {distribution.map(entry => <Cell key={entry.name} fill={entry.fill} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {analytics.categoryPerformance.length > 0 && (
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Eficiencia por Categoría (vs. Realidad)</h3>
                    <div className="space-y-2">
                        {analytics.categoryPerformance.map((category: CategoryPerformance) => (
                            <CategoryPerformanceRow key={category.categoryName} category={category} type="herd" />
                        ))}
                    </div>
                </div>
            )}
            
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 ml-1">Animales ({filteredAnimals.length})</h3>
                {filteredAnimals.length > 0 ? (
                    filteredAnimals.map((animal: GrowthAnalyzedAnimal) => (
                        <AnimalRow key={animal.id} animal={animal} onSelect={onSelectAnimal} type="herd" />
                    ))
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-500">No hay animales que coincidan con los filtros.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- PÁGINA 2: DASHBOARD (METAS) ---
const StrategicDashboard = ({ analytics, onSelectAnimal }: {
    analytics: GrowthAnalytics,
    onSelectAnimal: (animalId: string) => void
}) => {
    const [filter, setFilter] = useState<'all' | 'alert' | 'below' | 'on_target'>('all');

    const distribution = [
        { name: 'Alerta', count: analytics.targetKPIs.alertPct, fill: '#FF3B30' },
        { name: 'Bajo Meta', count: analytics.targetKPIs.belowTargetPct, fill: '#FF9500' },
        { name: 'En Meta', count: analytics.targetKPIs.onTargetPct, fill: '#34C759' },
    ];

    const filteredAnimals = React.useMemo(() => {
        let list = [...analytics.animals].sort((a,b) => a.targetDeviation - b.targetDeviation);
        if (filter === 'all') return list;
        if (filter === 'alert') return analytics.alertList;
        if (filter === 'below') return list.filter(a => a.targetClassification === 'Bajo Meta');
        if (filter === 'on_target') return list.filter(a => a.targetClassification === 'En Meta' || a.targetClassification === 'Superior');
        return list;
    }, [analytics.animals, analytics.alertList, filter]);

    const handleBarClick = (data: any) => {
        if (data?.payload?.name) {
            const name = data.payload.name;
            let newFilter: typeof filter = 'all';
            if (name === 'Alerta') newFilter = 'alert';
            if (name === 'Bajo Meta') newFilter = 'below';
            if (name === 'En Meta') newFilter = 'on_target';
            setFilter(prev => prev === newFilter ? 'all' : newFilter);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pb-24 pt-4">
             <header className="text-center">
                <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard (Metas)</h1>
                <p className="text-md text-zinc-400">{analytics.targetKPIs.totalAnimals} Animales vs. Metas</p>
            </header>

            <div className="grid grid-cols-2 gap-4">
                <KpiCard 
                    icon={CheckCircle} 
                    label="% En Meta" 
                    value={analytics.targetKPIs.onTargetPct.toFixed(0)} 
                    unit="%" 
                    colorClass={analytics.targetKPIs.onTargetPct > 80 ? "border-brand-green/50" : "border-zinc-500/50"}
                />
                <KpiCard 
                    icon={AlertTriangle} 
                    label="% En Alerta" 
                    value={analytics.targetKPIs.alertPct.toFixed(0)} 
                    unit="%"
                    colorClass={analytics.targetKPIs.alertPct > 15 ? "border-brand-red/50" : "border-zinc-500/50"}
                />
            </div>
            
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="text-lg font-semibold text-white mb-4">Cumplimiento de Meta</h3>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }} layout="vertical">
                            <XAxis type="number" domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" width={80} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <Tooltip content={<GrowthTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" name="%" onClick={handleBarClick} cursor="pointer">
                                {distribution.map(entry => {
                                    let selectedFilter: string = '';
                                    if (filter === 'alert') selectedFilter = 'Alerta';
                                    if (filter === 'below') selectedFilter = 'Bajo Meta';
                                    if (filter === 'on_target') selectedFilter = 'En Meta';
                                    return <Cell key={entry.name} fill={entry.fill} className={`${filter !== 'all' && selectedFilter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            {analytics.categoryPerformance.length > 0 && (
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Eficiencia por Categoría (vs. Metas)</h3>
                    <div className="space-y-2">
                        {analytics.categoryPerformance.map((category: CategoryPerformance) => (
                            <CategoryPerformanceRow key={category.categoryName} category={category} type="target" />
                        ))}
                    </div>
                </div>
            )}
            
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 ml-1">
                    {filter === 'all' && 'Todos los Animales'}
                    {filter === 'alert' && 'Animales en Alerta'}
                    {filter === 'below' && 'Animales Bajo Meta'}
                    {filter === 'on_target' && 'Animales En Meta'}
                    ({filteredAnimals.length})
                </h3>
                {filteredAnimals.length > 0 ? (
                    filteredAnimals.map((animal: GrowthAnalyzedAnimal) => (
                        <AnimalRow key={animal.id} animal={animal} onSelect={onSelectAnimal} type="target" />
                    ))
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-500">No hay animales que coincidan con los filtros.</p>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL (SHELL) ---
export default function KilosDashboard({ onSelectAnimal }: { onSelectAnimal: (animalId: string) => void }) {
    
    const strategicAnalytics = useGrowthAnalytics();
    
    const [activePage, setActivePage] = useState<0 | 1>(0); // 0 = Realidad, 1 = Metas
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // El botón flotante se ha ELIMINADO

    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const scrollLeft = scrollContainerRef.current.scrollLeft;
            const pageWidth = scrollContainerRef.current.clientWidth;
            const threshold = pageWidth / 2;
            let currentPage: 0 | 1 = 0;
            
            if (scrollLeft > threshold) {
                currentPage = 1;
            } else {
                currentPage = 0;
            }
            
            if (currentPage !== activePage) {
                setActivePage(currentPage);
            }
        }
    };
    
    const goToPage = (page: 0 | 1) => {
        if (scrollContainerRef.current) {
            const pageWidth = scrollContainerRef.current.clientWidth;
            scrollContainerRef.current.scrollTo({ 
                left: pageWidth * page, 
                behavior: 'smooth' 
            });
            setActivePage(page);
        }
    };

    return (
        <>
            {/* El botón flotante ha sido ELIMINADO */}

            {/* --- Contenedor de Swipe --- */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="w-full h-full overflow-x-auto overflow-y-hidden snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                <div className="flex w-[200vw] h-full"> {/* 200vw = 2 páginas */}
                    
                    {/* --- Página 1: DASHBOARD (REALIDAD) --- */}
                    <div className="w-screen h-full snap-start overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                        <RealityDashboard 
                            analytics={strategicAnalytics}
                            onSelectAnimal={onSelectAnimal} 
                        />
                    </div>

                    {/* --- Página 2: DASHBOARD (METAS) --- */}
                    <div className="w-screen h-full snap-start overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                        <StrategicDashboard
                            analytics={strategicAnalytics}
                            onSelectAnimal={onSelectAnimal} 
                        />
                    </div>

                </div>
            </div>

            {/* --- Indicadores de Página (Paginación) --- */}
            <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-10 flex space-x-2">
                <button 
                    onClick={() => goToPage(0)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${activePage === 0 ? 'bg-white scale-110' : 'bg-zinc-600'}`}
                    aria-label="Ir a Dashboard (Realidad)"
                />
                <button 
                    onClick={() => goToPage(1)}
                    className={`w-2.5 h-2.5 rounded-full transition-colors ${activePage === 1 ? 'bg-white scale-110' : 'bg-zinc-600'}`}
                    aria-label="Ir a Dashboard (Metas)"
                />
            </div>

            {/* El Modal de Carga se llama desde el menú inferior de la App, no aquí */}
        </>
    );
}