// src/pages/HistoryPage.tsx

import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { ArrowLeft, ChevronRight, BarChart2 as BarChartIconLucide, Users, Droplets, ArrowUp, ArrowDown, TrendingUp } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { useGaussAnalysis, AnalyzedAnimal } from '../hooks/useGaussAnalysis';
import { useHistoricalAnalysis, PeriodStats } from '../hooks/useHistoricalAnalysis';
// --- CAMBIO: Ruta de importación corregida y tipo no usado eliminado ---
import { Modal } from '../components/ui/Modal';
// --- CAMBIO: Ruta de importación corregida ---
import { CustomTooltip } from '../components/ui/CustomTooltip';
import { formatAnimalDisplay } from '../utils/formatting';

// --- SUB-COMPONENTES ---

const ChangeIndicator = ({ value }: { value?: number }) => {
    if (value === undefined || isNaN(value) || value === 0) {
        return <div className="w-16 h-5"></div>;
    }
    const isPositive = value > 0;
    const color = isPositive ? 'text-brand-green' : 'text-brand-red';
    const Icon = isPositive ? ArrowUp : ArrowDown;
    return (
        <span className={`flex items-center text-sm font-bold ${color} whitespace-nowrap`}>
            <Icon size={16} className="mr-0.5" />
            {value.toFixed(1)}%
        </span>
    );
};

const PeriodCard = ({ stats, onClick }: { stats: PeriodStats, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-orange transition-colors">
        <div className="min-w-0 mr-2">
            <p className="font-bold text-lg text-white truncate">{stats.periodLabel}</p>
            <p className="text-sm text-zinc-400 truncate">Prom: {stats.averageKg.toFixed(2)} Kg | {stats.animalCount} animales</p>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-2">
             <ChangeIndicator value={stats.avgKgChange} />
            <ChevronRight className="text-zinc-600 flex-shrink-0" />
        </div>
    </button>
);

const WeighingRow = ({ weighing, onSelectAnimal }: { weighing: AnalyzedAnimal, onSelectAnimal: (id: string) => void }) => {
    return(
        <button onClick={() => onSelectAnimal(weighing.id)} className="w-full text-left bg-black/20 rounded-lg p-3 border border-zinc-700/50 flex justify-between items-center hover:border-orange-400/50">
            <div className="min-w-0 pr-3 flex items-center gap-3">
                <div>
                    <p className="font-mono font-semibold text-base text-white truncate">{formatAnimalDisplay(weighing)}</p>
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white whitespace-nowrap ${
                    weighing.classification === 'Pobre' ? 'bg-brand-red/80' :
                    weighing.classification === 'Sobresaliente' ? 'bg-brand-green/80' :
                    'bg-gray-500/80'
                }`}>
                    {weighing.classification}
                </span>
            </div>
            <p className="font-semibold text-lg text-white flex-shrink-0">
                {weighing.latestWeighing.toFixed(2)}
                <span className="text-base font-medium text-zinc-400 ml-1">Kg</span>
            </p>
        </button>
    );
};

const CustomBarLabel = (props: any) => {
    const { x, y, width, value, total } = props;
    if (total === 0 || value === 0) return null;
    const percentage = ((value / total) * 100).toFixed(0);
    return ( <text x={x + width / 2} y={y + 20} fill="#fff" textAnchor="middle" fontSize="12px" fontWeight="bold">{`${percentage}%`}</text> );
};

// Modal para análisis de ingresos
const AnalysisModal = ({ isOpen, onClose, data, periodLabel, onSelectAnimal }: {
    isOpen: boolean,
    onClose: () => void,
    data: PeriodStats | null,
    periodLabel: string,
    onSelectAnimal: (id: string) => void
}) => {
    const { animals, weighings, parturitions } = useData();
    const [classificationFilter, setClassificationFilter] = useState<'all' | 'Pobre' | 'Promedio' | 'Sobresaliente'>('all');

    const analysis = useGaussAnalysis(data?.newAnimalsWeighings || [], animals, weighings, parturitions, false);

    const filteredAnimals = useMemo(() => {
        if (classificationFilter === 'all') return analysis.classifiedAnimals;
        return analysis.classifiedAnimals.filter(a => a.classification === classificationFilter);
    }, [analysis.classifiedAnimals, classificationFilter]);

    const handleBarClick = (barData: any) => { if (barData?.payload?.name) { const newFilter = barData.payload.name as any; setClassificationFilter(prev => prev === newFilter ? 'all' : newFilter); }};

    if (!isOpen || !data) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Análisis Nuevos Ingresos - ${periodLabel}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 p-3 rounded-2xl"><div className="text-xs uppercase text-zinc-400 mb-1 flex items-center gap-1"><Droplets size={14}/>Promedio</div><p className="text-2xl font-bold text-white">{analysis.mean.toFixed(2)}<span className="text-lg ml-1 text-zinc-400">Kg</span></p></div>
                    <div className="bg-black/20 p-3 rounded-2xl"><div className="text-xs uppercase text-zinc-400 mb-1 flex items-center gap-1"><Users size={14}/>Animales</div><p className="text-2xl font-bold text-white">{analysis.classifiedAnimals.length}</p></div>
                </div>
                <div className="bg-black/20 backdrop-blur-xl rounded-2xl p-4 border border-zinc-800/50">
                    <div className="w-full h-48">
                        <ResponsiveContainer><BarChart data={analysis.distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} /><YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                {analysis.distribution.map(entry => <Cell key={entry.name} fill={entry.fill} className={`${classificationFilter !== 'all' && classificationFilter !== entry.name ? 'opacity-30' : 'opacity-100'}`} />)}
                                <LabelList dataKey="count" content={(props) => <CustomBarLabel {...props} total={analysis.classifiedAnimals.length} />} />
                            </Bar>
                        </BarChart></ResponsiveContainer>
                    </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {filteredAnimals.sort((a,b) => b.latestWeighing - a.latestWeighing).map((animal) => (
                        <WeighingRow key={animal.weighingId || animal.id} weighing={animal} onSelectAnimal={onSelectAnimal} />
                    ))}
                </div>
            </div>
        </Modal>
    );
};


interface HistoryPageProps {
    onSelectAnimal: (animalId: string) => void;
    selectedPeriod: PeriodStats | null;
    setSelectedPeriod: (period: PeriodStats | null) => void;
}

// --- COMPONENTE PRINCIPAL ---
export default function HistoryPage({ onSelectAnimal, selectedPeriod, setSelectedPeriod }: HistoryPageProps) {
    const { animals, weighings, parturitions, isLoading } = useData();
    const [viewMode, setViewMode] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
    const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
    const [analysisModalData, setAnalysisModalData] = useState<PeriodStats | null>(null);

    const { monthlyData } = useHistoricalAnalysis(weighings);

    const dataMap = { monthly: monthlyData, quarterly: [], yearly: [] };
    const currentData = dataMap[viewMode];

    if (isLoading) { return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando historial...</h1></div>; }

    if (!selectedPeriod) {
        return (
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12 px-4 pt-4">
                <header className="text-center pb-4"><h1 className="text-2xl font-bold tracking-tight text-white">Historial de Producción</h1></header>
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-2 border border-brand-border"><div className="flex bg-zinc-900/80 rounded-xl p-1 w-full">
                    <button onClick={() => setViewMode('monthly')} className={`w-1/3 px-4 py-1.5 text-sm font-semibold rounded-lg transition-colors ${viewMode === 'monthly' ? 'bg-brand-orange text-white' : 'text-zinc-300 hover:bg-zinc-700/50'}`}>Mensual</button>
                    <button disabled className="w-1/3 px-4 py-1.5 text-sm font-semibold rounded-lg opacity-50 cursor-not-allowed">Trimestral</button>
                    <button disabled className="w-1/3 px-4 py-1.5 text-sm font-semibold rounded-lg opacity-50 cursor-not-allowed">Anual</button>
                </div></div>
                {currentData.length > 0 ? (
                    <div className="space-y-2">
                        {currentData.map(stats => (<PeriodCard key={stats.periodId} stats={stats} onClick={() => setSelectedPeriod(stats)} />))}
                    </div>
                 ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4">
                        <p className="text-zinc-400">No hay datos históricos de pesajes registrados.</p>
                    </div>
                 )}
            </div>
        );
    }

    // --- Vista de Detalle del Periodo ---
    const periodAnalysis = useGaussAnalysis(selectedPeriod?.weighings || [], animals, weighings, parturitions, false);
    const [classificationFilter, setClassificationFilter] = useState<'all' | 'Pobre' | 'Promedio' | 'Sobresaliente'>('all');
    const filteredWeighings = useMemo(() => {
        if (classificationFilter === 'all') return periodAnalysis.classifiedAnimals;
        return periodAnalysis.classifiedAnimals.filter(animal => animal.classification === classificationFilter);
    }, [periodAnalysis.classifiedAnimals, classificationFilter]);
    const handleBarClick = (data: any) => { if (data?.payload?.name) { const newFilter = data.payload.name as any; setClassificationFilter(prev => prev === newFilter ? 'all' : newFilter); }};


    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12 animate-fade-in px-4">
                <header className="flex items-center pt-4 pb-4">
                    <button onClick={() => { setSelectedPeriod(null); setClassificationFilter('all'); }} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow"><h1 className="text-2xl font-bold tracking-tight text-white">{selectedPeriod.periodLabel}</h1></div>
                    <div className="w-8"></div>
                </header>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-brand-glass p-3 rounded-2xl"><div className="text-xs uppercase text-zinc-400 mb-1 flex items-center gap-1"><Droplets size={14}/>Promedio / Animal</div><div className="flex items-baseline gap-2"><p className="text-2xl font-bold text-white">{selectedPeriod.averageKg.toFixed(2)}<span className="text-lg ml-1 text-zinc-400">Kg</span></p><ChangeIndicator value={selectedPeriod.avgKgChange} /></div></div>
                    <button onClick={() => setIsVariationModalOpen(true)} className="bg-brand-glass p-3 rounded-2xl text-left hover:border-brand-orange transition-colors border border-brand-border"><div className="text-xs uppercase text-zinc-400 mb-1 flex items-center gap-1"><Users size={14}/>Animales Ordeñados</div><div className="flex items-baseline gap-2"><p className="text-2xl font-bold text-white">{selectedPeriod.animalCount}</p><ChangeIndicator value={selectedPeriod.animalCountChange}/></div></button>
                    <div className="bg-brand-glass p-3 rounded-2xl"><div className="text-xs uppercase text-zinc-400 mb-1 flex items-center gap-1"><TrendingUp size={14}/>Total Registrado</div><p className="text-2xl font-bold text-white">{selectedPeriod.totalKg.toFixed(0)}<span className="text-lg ml-1 text-zinc-400">Kg</span></p></div>
                </div>

                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <div className="flex items-center space-x-2 border-b border-brand-border pb-2 mb-4"><BarChartIconLucide className="text-brand-orange" size={18}/><h3 className="text-lg font-semibold text-white">Distribución del Período</h3></div>
                    <div className="w-full h-48">
                        <ResponsiveContainer><BarChart data={periodAnalysis.distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} /><YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                {periodAnalysis.distribution.map((entry) => (<Cell key={entry.name} fill={entry.fill} className={`${classificationFilter !== 'all' && classificationFilter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />))}
                                <LabelList dataKey="count" content={(props) => <CustomBarLabel {...props} total={periodAnalysis.classifiedAnimals.length} />} />
                            </Bar>
                        </BarChart></ResponsiveContainer>
                    </div>
                    <div className="text-center text-xs text-zinc-400 mt-2"><span>μ = {periodAnalysis.mean.toFixed(2)} Kg</span> | <span>σ = {periodAnalysis.stdDev.toFixed(2)}</span></div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-zinc-300 ml-1 mt-4">Pesajes del Período ({filteredWeighings.length})</h3>
                    {filteredWeighings.length > 0 ? (
                        filteredWeighings.sort((a,b) => b.latestWeighing - a.latestWeighing).map((animal) => (
                            <WeighingRow key={animal.weighingId || animal.id} weighing={animal} onSelectAnimal={onSelectAnimal} />
                        ))
                    ) : (
                        <div className="text-center py-6 bg-brand-glass rounded-lg">
                            <p className="text-zinc-500">No hay pesajes que coincidan con el filtro.</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isVariationModalOpen} onClose={() => setIsVariationModalOpen(false)} title="Variación de Animales en Ordeño">
                <div className="text-zinc-300 space-y-4">
                    <div>
                        <h4 className="font-semibold text-white mb-1">{selectedPeriod.periodLabel} vs Mes Anterior</h4>
                        <p className="text-sm text-zinc-400">El mes anterior tenías <span className='font-bold text-white'>{selectedPeriod.previousAnimalCount}</span> animales en ordeño. Este mes tienes <span className='font-bold text-white'>{selectedPeriod.animalCount}</span>.</p>
                        <div className="flex items-center gap-2 mt-2">
                            <p>El cambio neto es de <span className='font-bold text-white'>{selectedPeriod.animalCount - (selectedPeriod.previousAnimalCount || 0)}</span> animales</p>
                            <ChangeIndicator value={selectedPeriod.animalCountChange}/>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-zinc-700/80">
                        {selectedPeriod.exitingAnimalCount! > 0 && <p className="text-sm text-zinc-400 mt-1">Salieron del ordeño: <span className="font-bold text-brand-red">{selectedPeriod.exitingAnimalCount}</span> animales.</p>}
                        {selectedPeriod.newAnimalsWeighings.length > 0 && <p className="text-sm text-zinc-400 mt-1">Nuevos ingresos: <span className="font-bold text-brand-green">{new Set(selectedPeriod.newAnimalsWeighings.map(w => w.goatId)).size}</span> animales.</p>}

                        {selectedPeriod.newAnimalsWeighings.length > 0 && (
                            <button onClick={() => { setAnalysisModalData(selectedPeriod); setIsVariationModalOpen(false); }} className="w-full mt-4 bg-brand-orange text-white font-semibold py-2 rounded-lg hover:bg-orange-600 transition-colors">
                                Analizar los {new Set(selectedPeriod.newAnimalsWeighings.map(w => w.goatId)).size} Nuevos Ingresos
                            </button>
                        )}
                    </div>
                </div>
            </Modal>

            <AnalysisModal
                isOpen={!!analysisModalData}
                onClose={() => setAnalysisModalData(null)}
                data={analysisModalData}
                periodLabel={selectedPeriod.periodLabel}
                onSelectAnimal={onSelectAnimal}
            />
        </>
    );
}