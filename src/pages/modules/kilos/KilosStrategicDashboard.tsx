// src/pages/modules/kilos/KilosStrategicDashboard.tsx
// (Página Estratégica vs. Metas - Actualizada con GrowthTooltip)

import React, { useState } from 'react';
// Importar el hook de analíticas y sus tipos
import { 
    useGrowthAnalytics, 
    GrowthAnalyzedAnimal, 
    CategoryPerformance, 
    TargetClassification 
} from '../../../hooks/useGrowthAnalytics';
// Icons
import { ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
// Recharts components
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
// --- (CORREGIDO) Importar GrowthTooltip ---
import { GrowthTooltip } from '../../../components/ui/GrowthTooltip';

// --- SUB-COMPONENTES REUTILIZABLES ---

const KpiCard = ({ icon: Icon, label, value, unit, colorClass }: { icon: React.ElementType, label: string, value: string | number, unit?: string, colorClass?: string }) => (
    <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border ${colorClass || ''}`}>
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Icon size={14} /><span>{label}</span></div>
        <p className="text-2xl font-bold text-white mt-1">{value} <span className="text-lg text-zinc-400">{unit}</span></p>
    </div>
);

// Fila de Animal (Muestra clasificación vs. METAS)
const AnimalRow = ({ animal, onSelect }: {
    animal: GrowthAnalyzedAnimal,
    onSelect: (id: string) => void,
}) => {
    
    const classification = animal.targetClassification;
    const deviation = animal.targetDeviation;
    
    const classificationColor: Record<TargetClassification, string> = {
        'Superior': 'text-brand-green',
        'En Meta': 'text-zinc-300',
        'Bajo Meta': 'text-yellow-400',
        'Alerta': 'text-brand-red',
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
                        <span className="text-sm text-zinc-400"> / Meta</span>
                    </p>
                    <p className={`font-bold text-xs ${classificationColor[classification]}`}>{classification}</p>
                </div>
                <ChevronRight className="text-zinc-600 w-5 h-5" />
            </div>
        </button>
    );
};

// Fila de Categoría (Muestra clasificación vs. METAS)
const CategoryPerformanceRow = ({ category }: { category: CategoryPerformance }) => {
    
    const deviation = category.avgTargetDeviation;
    const deviationPct = (deviation * 100).toFixed(0);
    const color = deviation >= 1.0 ? 'text-brand-green' : deviation < 0.85 ? 'text-brand-red' : 'text-yellow-400';

    return (
        <div className="flex justify-between items-center bg-black/20 p-3 rounded-lg">
            <div>
                <p className="font-semibold text-white">{category.categoryName}</p>
                <p className="text-xs text-zinc-400">{category.animalCount} Animales ({category.alertCount} en Alerta)</p>
            </div>
            <div className={`text-right ${color}`}>
                <p className="font-bold text-lg">{deviationPct}%</p>
                <p className="text-xs">Cumplimiento</p>
            </div>
        </div>
    );
};

// --- Componente de Contenido ---
export default function KilosStrategicDashboard({ onSelectAnimal }: { onSelectAnimal: (animalId: string) => void }) {
    const { animals, targetKPIs, categoryPerformance, alertList } = useGrowthAnalytics();
    const [filter, setFilter] = useState<'all' | 'alert' | 'below' | 'on_target'>('all');

    const distribution = [
        { name: 'Alerta', count: targetKPIs.alertPct, fill: '#FF3B30' },
        { name: 'Bajo Meta', count: targetKPIs.belowTargetPct, fill: '#FF9500' },
        { name: 'En Meta', count: targetKPIs.onTargetPct, fill: '#34C759' },
    ];

    const filteredAnimals = React.useMemo(() => {
        let list = [...animals].sort((a,b) => a.targetDeviation - b.targetDeviation); // Ordenar por "Meta"
        if (filter === 'all') return list;
        if (filter === 'alert') return alertList;
        if (filter === 'below') return list.filter(a => a.targetClassification === 'Bajo Meta');
        if (filter === 'on_target') return list.filter(a => a.targetClassification === 'En Meta' || a.targetClassification === 'Superior');
        return list;
    }, [animals, alertList, filter]);

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
        // Añadido padding (pt-4, pb-24) para scrolling dentro del shell
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pb-24 pt-4">
            
             <header className="text-center">
                <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard (Metas)</h1>
                <p className="text-md text-zinc-400">{targetKPIs.totalAnimals} Animales vs. Metas</p>
            </header>
            
            {/* KPIs Estratégicos */}
            <div className="grid grid-cols-2 gap-4">
                <KpiCard 
                    icon={CheckCircle} 
                    label="% En Meta" 
                    value={targetKPIs.onTargetPct.toFixed(0)} 
                    unit="%" 
                    colorClass={targetKPIs.onTargetPct > 80 ? "border-brand-green/50" : "border-zinc-500/50"}
                />
                <KpiCard 
                    icon={AlertTriangle} 
                    label="% En Alerta" 
                    value={targetKPIs.alertPct.toFixed(0)} 
                    unit="%"
                    colorClass={targetKPIs.alertPct > 15 ? "border-brand-red/50" : "border-zinc-500/50"}
                />
            </div>
            
            {/* Gráfico de Distribución por Meta */}
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="text-lg font-semibold text-white mb-4">Cumplimiento de Meta</h3>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        {/* --- (CORREGIDO) Usar GrowthTooltip --- */}
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
            
            {/* --- (CORREGIDO) Agrupado por Categoría --- */}
            {categoryPerformance.length > 0 && (
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Eficiencia por Categoría (vs. Metas)</h3>
                    <div className="space-y-2">
                        {categoryPerformance.map(category => (
                            <CategoryPerformanceRow key={category.categoryName} category={category} />
                        ))}
                    </div>
                </div>
            )}
            
            {/* Lista de Animales */}
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 ml-1">
                    {filter === 'all' && 'Todos los Animales'}
                    {filter === 'alert' && 'Animales en Alerta'}
                    {filter === 'below' && 'Animales Bajo Meta'}
                    {filter === 'on_target' && 'Animales En Meta'}
                    ({filteredAnimals.length})
                </h3>
                {filteredAnimals.length > 0 ? (
                    filteredAnimals.map(animal => (
                        <AnimalRow key={animal.id} animal={animal} onSelect={onSelectAnimal} />
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