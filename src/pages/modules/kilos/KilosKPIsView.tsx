import React, { useState, useMemo } from 'react';
import { useKilosAnalytics } from '../../../hooks/useKilosAnalytics';
import { 
    Calendar, Scale, TrendingUp, Target, 
    ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Users,
    MousePointerClick
} from 'lucide-react';

interface KilosKPIsViewProps {
    analytics: ReturnType<typeof useKilosAnalytics>;
    onOpenApproachingList?: () => void;
}

// --- 1. COMPONENTE DE LISTA ACORDEÓN (Optimizado) ---
const CollapsibleAnimalList = ({ rows }: { rows: any[] }) => {
    const [isOpen, setIsOpen] = useState(false);

    const groupedAnimals = useMemo(() => {
        const groups: Record<string, typeof rows> = {};
        rows.forEach(row => {
            const cat = row.category || 'Sin Categoría';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(row);
        });
        return groups;
    }, [rows]);

    return (
        <div className="mt-4 border-t border-zinc-800 pt-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl transition-colors border border-zinc-800 active:scale-[0.98]"
            >
                <div className="flex items-center gap-3">
                    <div className="bg-zinc-800 p-1.5 rounded-lg text-zinc-400">
                        <Users size={16} />
                    </div>
                    <div className="text-left">
                        <span className="block text-sm font-bold text-white">Ver Lista Detallada</span>
                        <span className="text-[10px] text-zinc-500 font-medium">{rows.length} animales</span>
                    </div>
                </div>
                {isOpen ? <ChevronDown className="text-zinc-400" size={18} /> : <ChevronRight className="text-zinc-400" size={18} />}
            </button>

            {isOpen && (
                <div className="mt-3 space-y-4 animate-fade-in pl-1">
                    {Object.entries(groupedAnimals).map(([category, list]) => (
                        <div key={category} className="space-y-1.5">
                            <h4 className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest pl-2 mb-1 border-l-2 border-brand-blue">
                                {category} <span className="text-zinc-600 font-normal">({list.length})</span>
                            </h4>
                            <div className="grid grid-cols-1 gap-1.5">
                                {list.map((animal: any) => (
                                    <div key={animal.id} className="flex justify-between items-center p-2.5 bg-black border border-zinc-800/60 rounded-lg">
                                        <div className="flex flex-col">
                                            <span className="font-mono font-bold text-sm text-white leading-none mb-0.5">{animal.id}</span>
                                            <span className="text-[10px] text-zinc-500 truncate max-w-[120px]">
                                                {animal.name || ''}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-3 text-right">
                                            <div>
                                                <span className="block text-[8px] text-zinc-600 uppercase font-bold">GDP</span>
                                                <span className="font-mono font-bold text-zinc-300 text-xs">{animal.gdp > 0 ? animal.gdp.toFixed(0) : '-'}</span>
                                            </div>
                                            <div>
                                                <span className="block text-[8px] text-zinc-600 uppercase font-bold">Peso</span>
                                                <span className="font-mono font-bold text-white text-xs">
                                                    {animal.currentWeight > 0 ? animal.currentWeight.toFixed(1) : '-'}
                                                </span>
                                            </div>
                                            {/* Estado Visual Compacto */}
                                            <div className={`w-1.5 h-1.5 rounded-full ${animal.classification === 'Superior' || animal.classification === 'En Meta' ? 'bg-brand-green' : 'bg-brand-red'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                    {rows.length === 0 && (
                        <p className="text-center text-zinc-600 text-xs py-4 italic">Sin datos para mostrar.</p>
                    )}
                </div>
            )}
        </div>
    );
};

// --- 2. COMPONENTES VISUALES KPI (Optimizados Mobile) ---

const TimeEfficiencyCard = ({ label, value, target, icon: Icon, color, bgColor, onClick, isInteractive, subtitle }: any) => {
    const isMet = !isInteractive && value > 0 && value <= (target * 1.1);
    const hasData = value > 0;

    return (
        <div 
            onClick={isInteractive ? onClick : undefined}
            className={`
                rounded-2xl p-3.5 border border-zinc-800 bg-zinc-900 flex flex-col justify-between h-28 relative overflow-hidden group transition-all
                ${isInteractive ? 'cursor-pointer hover:border-zinc-700 active:scale-[0.98]' : ''}
            `}
        >
            <div className={`absolute top-0 right-0 p-2.5 ${bgColor} rounded-bl-2xl opacity-80`}>
                <Icon size={16} className={color} />
            </div>
            
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider w-3/4 leading-tight">{label}</span>
            
            <div className="flex flex-col z-10 mt-auto">
                <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-mono font-bold text-white tracking-tighter leading-none">
                        {!isInteractive && !hasData ? '--' : value.toFixed(0)}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-medium">
                        {isInteractive ? 'animales' : 'días'}
                    </span>
                </div>
                
                <div className="flex items-center gap-1.5 mt-1.5 min-h-[14px]">
                    {isInteractive ? (
                        <div className="flex items-center gap-1 text-brand-blue animate-pulse">
                            <MousePointerClick size={10} />
                            <span className="text-[9px] font-bold uppercase tracking-wide">{subtitle || 'VER LISTA'}</span>
                        </div>
                    ) : (
                        hasData ? (
                            <>
                                {isMet ? 
                                    <CheckCircle2 size={10} className="text-brand-green" /> : 
                                    <AlertTriangle size={10} className="text-brand-red" />
                                }
                                <span className={`text-[9px] font-bold uppercase ${isMet ? 'text-brand-green' : 'text-brand-red'}`}>
                                    {isMet ? 'En Meta' : 'Excede'}
                                </span>
                                <span className="text-[9px] text-zinc-600 font-mono">
                                    /{target}d
                                </span>
                            </>
                        ) : (
                            <span className="text-[9px] text-zinc-600 italic">Sin datos</span>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const MilestoneRow = ({ label, value, target }: { label: string, value: number, target: number }) => {
    const hasData = value > 0;
    const gap = value - target;
    const isMet = gap >= 0;
    const isClose = gap > -1 && gap < 0;

    return (
        <div className="flex justify-between items-center px-4 py-3 hover:bg-zinc-800/30 transition-colors">
            <div className="flex items-center gap-2">
                <div className={`w-1 h-1 rounded-full ${isMet ? 'bg-brand-green' : 'bg-zinc-600'}`}></div>
                <span className="text-xs text-zinc-300 font-medium">{label}</span>
            </div>
            
            <div className="flex items-center gap-3">
                {/* Meta en móvil: solo texto pequeño */}
                <div className="text-right">
                    <span className="text-[9px] text-zinc-600 block leading-none mb-0.5">Meta</span>
                    <span className="text-[10px] font-mono text-zinc-500">{target}</span>
                </div>

                <div className="flex flex-col items-end min-w-[50px]">
                    <span className="text-base font-mono font-bold text-white tracking-tight leading-none">
                        {hasData ? value.toFixed(1) : '--'}
                    </span>
                </div>

                {hasData && (
                    <div className={`flex items-center justify-center w-10 h-5 rounded border ${
                        isMet ? 'bg-brand-green/10 border-brand-green/20 text-brand-green' : 
                        isClose ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500' :
                        'bg-brand-red/10 border-brand-red/20 text-brand-red'
                    }`}>
                        <span className="text-[9px] font-bold font-mono">
                            {gap > 0 ? '+' : ''}{gap.toFixed(1)}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- 3. VISTA PRINCIPAL (Layout Mobile First) ---

export const KilosKPIsView: React.FC<KilosKPIsViewProps> = ({ analytics, onOpenApproachingList }) => {
    const { kpis, targets, rows, filterType } = analytics;

    // Estado GDP
    const gdpPct = Math.min((kpis.avgGDP / targets.gdp) * 100, 100);
    const isGdpMet = kpis.avgGDP >= targets.gdp;
    const isActualView = filterType === 'ACTUAL';

    return (
        <div className="p-3 space-y-3 pb-24 overflow-y-auto h-full scroll-smooth">
            
            {/* 1. TIEMPOS (Grid 2 columnas) */}
            <div className="grid grid-cols-2 gap-3">
                <TimeEfficiencyCard 
                    label="Edad Destete" 
                    value={kpis.avgDaysToWeaning} 
                    target={targets.weaningDays}
                    icon={Calendar}
                    color="text-yellow-400"
                    bgColor="bg-yellow-400/10"
                />
                <TimeEfficiencyCard 
                    label={isActualView ? "Próximos a Serv." : "Edad 1er Serv."}
                    value={isActualView ? kpis.approachingServiceCount : kpis.avgDaysToService}
                    target={targets.serviceDays}
                    icon={Target}
                    color="text-pink-400"
                    bgColor="bg-pink-400/10"
                    isInteractive={isActualView}
                    onClick={isActualView ? onOpenApproachingList : undefined}
                    subtitle="30d Proyección"
                />
            </div>

            {/* 2. GDP (Tarjeta Ancha Compacta) */}
            <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-1 relative z-10">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                        <TrendingUp size={14} />
                        <span>Ganancia Diaria</span>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isGdpMet ? 'text-brand-green border-brand-green/30 bg-brand-green/5' : 'text-brand-red border-brand-red/30 bg-brand-red/5'}`}>
                        {isGdpMet ? 'OK' : 'BAJO'}
                    </span>
                </div>
                
                <div className="flex items-baseline gap-1.5 relative z-10 my-1">
                    {/* Ajuste de tamaño de fuente para móviles */}
                    <span className="text-4xl sm:text-5xl font-mono font-bold text-white tracking-tighter">
                        {kpis.avgGDP.toFixed(0)}
                    </span>
                    <span className="text-xs font-medium text-zinc-500">g/día</span>
                </div>

                {/* Barra de progreso */}
                <div className="w-full bg-black/40 h-1.5 rounded-full mt-3 overflow-hidden relative z-10 border border-zinc-800/50">
                    <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isGdpMet ? 'bg-brand-green' : 'bg-brand-red'}`} 
                        style={{ width: `${gdpPct}%` }} 
                    />
                </div>
                <div className="flex justify-between mt-1 relative z-10">
                    <span className="text-[9px] text-zinc-600 font-mono">0</span>
                    <span className="text-[9px] text-zinc-500 font-mono">Meta: {targets.gdp}</span>
                </div>

                <TrendingUp className="absolute -bottom-3 -right-3 text-zinc-800/40 w-24 h-24 rotate-12 z-0 pointer-events-none" />
            </div>

            {/* 3. PESOS (Lista Compacta) */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-sm">
                <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-800/30 flex justify-between items-center">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Scale size={12} />
                        Control de Hitos
                    </span>
                </div>
                <div className="divide-y divide-zinc-800/60">
                    <MilestoneRow label="90 Días" value={kpis.avgWeight90d} target={targets.w90} />
                    <MilestoneRow label="180 Días" value={kpis.avgWeight180d} target={targets.w180} />
                    <MilestoneRow label="270 Días" value={kpis.avgWeight270d} target={targets.w270} />
                </div>
            </div>

            {/* 4. LISTA */}
            <CollapsibleAnimalList rows={rows} />

            <div className="h-4"></div>
        </div>
    );
};