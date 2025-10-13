// src/pages/modules/lactokeeper/LactoKeeperHistoryPage.tsx

import { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { ArrowLeft, ChevronRight, BarChart2, Calendar, TrendingUp, Droplet, ArrowUp, ArrowDown, Users } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { useGaussAnalysis, AnalyzedAnimal } from '../../../hooks/useGaussAnalysis';
import { useHistoricalAnalysis, PeriodStats } from '../../../hooks/useHistoricalAnalysis';
// --- LÍNEA CORREGIDA: Se elimina 'Modal' que no se utiliza ---
import type { PageState as RebanoPageState } from '../../../types/navigation';

// --- SUB-COMPONENTES ---

const ChangeIndicator = ({ value }: { value?: number }) => {
    if (value === undefined || isNaN(value)) return null;
    const isPositive = value > 0;
    const color = isPositive ? 'text-brand-green' : 'text-brand-red';
    const Icon = isPositive ? ArrowUp : ArrowDown;
    return ( <span className={`flex items-center text-sm font-bold ${color}`}><Icon size={16} className="mr-0.5" />{value.toFixed(1)}%</span> );
};

const PeriodCard = ({ stats, onClick }: { stats: PeriodStats, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-orange transition-colors">
        <div>
            <p className="font-bold text-lg text-white">{stats.periodLabel}</p>
            <p className="text-sm text-zinc-400">Prom: {stats.averageKg.toFixed(2)} Kg | {stats.animalCount} animales</p>
        </div>
        <div className="flex items-center space-x-4"><ChangeIndicator value={stats.avgKgChange} /><ChevronRight className="text-zinc-600" /></div>
    </button>
);

const WeighingRow = ({ weighing, onSelectAnimal }: { weighing: AnalyzedAnimal, onSelectAnimal: (id: string) => void }) => (
    <button onClick={() => onSelectAnimal(weighing.id)} className="w-full text-left bg-black/20 rounded-lg p-3 border border-zinc-700/50 flex justify-between items-center hover:border-orange-400/50">
        <div className="flex items-center gap-4">
            <div>
                <p className="font-bold text-base text-white flex items-center gap-2">
                    {weighing.id}
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${weighing.classification === 'Pobre' ? 'bg-brand-red/80' : weighing.classification === 'Sobresaliente' ? 'bg-brand-green/80' : 'bg-gray-500/80'}`}>
                        {weighing.classification}
                    </span>
                </p>
            </div>
        </div>
        <p className="font-semibold text-lg text-white">{weighing.latestWeighing.toFixed(2)} <span className="text-base font-medium text-zinc-400">Kg</span></p>
    </button>
);

const CustomBarLabel = (props: any) => {
    const { x, y, width, value, total } = props;
    if (total === 0 || value === 0) return null;
    const percentage = ((value / total) * 100).toFixed(0);
    return ( <text x={x + width / 2} y={y + 20} fill="#fff" textAnchor="middle" fontSize="12px" fontWeight="bold">{`${percentage}%`}</text> );
};

interface LactoKeeperHistoryPageProps {
    navigateToRebano: (page: RebanoPageState) => void;
}

export default function LactoKeeperHistoryPage({ navigateToRebano }: LactoKeeperHistoryPageProps) {
    const { animals, weighings, parturitions, isLoading } = useData();
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodStats | null>(null);
    const [classificationFilter, setClassificationFilter] = useState<'all' | 'Pobre' | 'Promedio' | 'Sobresaliente'>('all');

    const { monthlyData } = useHistoricalAnalysis(weighings);
    
    const periodAnalysis = useGaussAnalysis(selectedPeriod?.weighings || [], animals, weighings, parturitions, false);

    const filteredWeighings = useMemo(() => {
        if (classificationFilter === 'all') return periodAnalysis.classifiedAnimals;
        return periodAnalysis.classifiedAnimals.filter(animal => animal.classification === classificationFilter);
    }, [periodAnalysis.classifiedAnimals, classificationFilter]);
    
    const handleBarClick = (data: any) => { if (data?.name) { const newFilter = data.name as any; setClassificationFilter(prev => prev === newFilter ? 'all' : newFilter); }};
    
    if (isLoading) { return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando historial...</h1></div>; }

    if (!selectedPeriod) {
        return (
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12 px-4">
                <header className="text-center pt-4 pb-4"><h1 className="text-2xl font-bold tracking-tight text-white">Historial de Producción</h1></header>
                <div className="space-y-2">{(monthlyData || []).map(stats => (<PeriodCard key={stats.periodId} stats={stats} onClick={() => setSelectedPeriod(stats)} />))}</div>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 pb-12 animate-fade-in px-4">
            <header className="flex items-center pt-4 pb-4">
                <button onClick={() => { setSelectedPeriod(null); setClassificationFilter('all'); }} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                <div className="text-center flex-grow"><h1 className="text-2xl font-bold tracking-tight text-white">{selectedPeriod.periodLabel}</h1></div>
                <div className="w-8"></div>
            </header>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-glass p-3 rounded-2xl"><div className="text-xs uppercase text-zinc-400 mb-1 flex items-center gap-1"><Droplet size={14}/>Promedio / Animal</div><div className="flex items-baseline gap-2"><p className="text-2xl font-bold text-white">{selectedPeriod.averageKg.toFixed(2)}<span className="text-lg ml-1 text-zinc-400">Kg</span></p><ChangeIndicator value={selectedPeriod.avgKgChange} /></div></div>
                <div className="bg-brand-glass p-3 rounded-2xl"><div className="text-xs uppercase text-zinc-400 mb-1 flex items-center gap-1"><Calendar size={14}/>Eventos de Pesaje</div><p className="text-2xl font-bold text-white">{selectedPeriod.weighingEvents}</p></div>
                <div className="bg-brand-glass p-3 rounded-2xl"><div className="text-xs uppercase text-zinc-400 mb-1 flex items-center gap-1"><Users size={14}/>Animales Ordeñados</div><p className="text-2xl font-bold text-white">{selectedPeriod.animalCount}</p></div>
                <div className="bg-brand-glass p-3 rounded-2xl"><div className="text-xs uppercase text-zinc-400 mb-1 flex items-center gap-1"><TrendingUp size={14}/>Total Registrado</div><p className="text-2xl font-bold text-white">{selectedPeriod.totalKg.toFixed(0)}<span className="text-lg ml-1 text-zinc-400">Kg</span></p></div>
            </div>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <div className="flex items-center space-x-2 border-b border-brand-border pb-2 mb-4"><BarChart2 className="text-brand-orange" size={18}/><h3 className="text-lg font-semibold text-white">Distribución del Período</h3></div>
                <div className="w-full h-48">
                    <ResponsiveContainer><BarChart data={periodAnalysis.distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} /><YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                        <Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                        <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                            {periodAnalysis.distribution.map((entry) => (<Cell key={entry.name} fill={entry.fill} className={`${classificationFilter !== 'all' && classificationFilter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />))}
                            <LabelList dataKey="count" content={<CustomBarLabel total={periodAnalysis.classifiedAnimals.length} />} />
                        </Bar>
                    </BarChart></ResponsiveContainer>
                </div>
                <div className="text-center text-xs text-zinc-400 mt-2"><span>μ = {periodAnalysis.mean.toFixed(2)} Kg</span> | <span>σ = {periodAnalysis.stdDev.toFixed(2)}</span></div>
            </div>

            <div className="space-y-2">
                <h3 className="text-lg font-semibold text-zinc-300 ml-1 mt-4">Pesajes del Período ({filteredWeighings.length})</h3>
                {filteredWeighings.sort((a,b) => b.latestWeighing - a.latestWeighing).map((animal) => (
                    <WeighingRow key={animal.weighingId || animal.id} weighing={animal} onSelectAnimal={(id) => navigateToRebano({ name: 'lactation-profile', animalId: id })} />
                ))}
            </div>
        </div>
    );
}