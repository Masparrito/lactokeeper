// src/pages/modules/lactokeeper/LactoKeeperHistoryMonthlyView.tsx
// Vista "Mes a Mes" del Historial (rescatada de la versión anterior): separa la
// producción por período mensual y deriva en los animales pesados ese mes, con
// análisis de distribución (Gauss). Se usa como vista alternativa dentro de
// LactoKeeperHistoryPage.

import { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { ArrowLeft, ChevronRight, BarChart2, Calendar, TrendingUp, Droplet, ArrowUp, ArrowDown, Users } from 'lucide-react';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from 'recharts';
import { useGaussAnalysis, AnalyzedAnimal } from '../../../hooks/useGaussAnalysis';
import { useHistoricalAnalysis, PeriodStats } from '../../../hooks/useHistoricalAnalysis';
import type { PageState as RebanoPageState } from '../../../types/navigation';
import { Modal } from '../../../components/ui/Modal';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';

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
    <button onClick={onClick} className="w-full text-left bg-c-surface backdrop-blur-xl rounded-2xl p-4 border border-c-border flex justify-between items-center hover:border-c-accent-sky transition-colors">
        <div className="min-w-0 mr-2">
            <p className="font-bold text-lg text-c-text truncate">{stats.periodLabel}</p>
            <p className="text-sm text-c-text-muted truncate">Prom: {stats.averageKg.toFixed(2)} Kg | {stats.animalCount} animales</p>
        </div>
        <div className="flex-shrink-0 flex items-center space-x-2">
            <ChangeIndicator value={stats.avgKgChange} />
            <ChevronRight className="text-c-text-faint flex-shrink-0" />
        </div>
    </button>
);

const WeighingRow = ({ weighing, onSelectAnimal }: { weighing: AnalyzedAnimal, onSelectAnimal: (id: string) => void }) => {
    const formattedName = weighing.name ? String(weighing.name).toUpperCase().trim() : '';
    return (
        <button onClick={() => onSelectAnimal(weighing.id)} className="w-full text-left bg-c-surface-2 rounded-lg p-3 border border-c-border flex justify-between items-center hover:border-c-accent-sky/50">
            <div className="min-w-0 pr-3 flex items-center gap-3">
                <div>
                    <p className="font-mono font-semibold text-base text-c-text truncate">{weighing.id.toUpperCase()}</p>
                    {formattedName && (
                        <p className="text-xs font-normal text-c-text-muted truncate">{formattedName}</p>
                    )}
                </div>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white whitespace-nowrap ${weighing.classification === 'Pobre' ? 'bg-brand-red/80' :
                    weighing.classification === 'Sobresaliente' ? 'bg-brand-green/80' :
                        'bg-c-text-faint/80'
                    }`}>
                    {weighing.classification}
                </span>
            </div>
            <p className="font-semibold text-lg text-c-accent-gold flex-shrink-0">
                {weighing.latestWeighing.toFixed(2)}
                <span className="text-base font-medium text-c-text-faint ml-1">Kg</span>
            </p>
        </button>
    );
};

const CustomBarLabel = (props: any) => {
    const { x, y, width, value, total } = props;
    if (total === 0 || value === 0) return null;
    const percentage = ((value / total) * 100).toFixed(0);
    return (<text x={x + width / 2} y={y + 20} fill="#fff" textAnchor="middle" fontSize="12px" fontWeight="bold">{`${percentage}%`}</text>);
};

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

    const handleBarClick = (barData: any) => { if (barData?.payload?.name) { const newFilter = barData.payload.name as any; setClassificationFilter(prev => prev === newFilter ? 'all' : newFilter); } };

    if (!isOpen || !data) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Análisis Nuevos Ingresos - ${periodLabel}`}>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-c-surface-2 p-3 rounded-2xl"><div className="text-xs uppercase text-c-text-muted mb-1 flex items-center gap-1"><Droplet size={14} />Promedio</div><p className="text-2xl font-bold text-c-accent-gold">{analysis.mean.toFixed(2)}<span className="text-lg ml-1 text-c-text-faint">Kg</span></p></div>
                    <div className="bg-c-surface-2 p-3 rounded-2xl"><div className="text-xs uppercase text-c-text-muted mb-1 flex items-center gap-1"><Users size={14} />Animales</div><p className="text-2xl font-bold text-c-text">{analysis.classifiedAnimals.length}</p></div>
                </div>
                <div className="bg-c-surface-2 backdrop-blur-xl rounded-2xl p-4 border border-c-border">
                    <div className="w-full h-48">
                        <ResponsiveContainer><BarChart data={analysis.distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" /><YAxis orientation="left" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30, 111, 173, 0.06)' }} />
                            <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                {analysis.distribution.map(entry => <Cell key={entry.name} fill={entry.fill} className={`${classificationFilter !== 'all' && classificationFilter !== entry.name ? 'opacity-30' : 'opacity-100'}`} />)}
                                <LabelList dataKey="count" content={<CustomBarLabel total={analysis.classifiedAnimals.length} />} />
                            </Bar>
                        </BarChart></ResponsiveContainer>
                    </div>
                </div>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {filteredAnimals.sort((a, b) => b.latestWeighing - a.latestWeighing).map((animal) => (
                        <WeighingRow key={animal.weighingId || animal.id} weighing={animal} onSelectAnimal={onSelectAnimal} />
                    ))}
                </div>
            </div>
        </Modal>
    );
};

export function MonthlyHistoryView({ navigateToRebano }: { navigateToRebano: (page: RebanoPageState) => void }) {
    const { animals, weighings, parturitions, isLoading } = useData();
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodStats | null>(null);
    const [classificationFilter, setClassificationFilter] = useState<'all' | 'Pobre' | 'Promedio' | 'Sobresaliente'>('all');
    const [isVariationModalOpen, setIsVariationModalOpen] = useState(false);
    const [analysisModalData, setAnalysisModalData] = useState<PeriodStats | null>(null);

    const { monthlyData } = useHistoricalAnalysis(weighings);
    const periodAnalysis = useGaussAnalysis(selectedPeriod?.weighings || [], animals, weighings, parturitions, false);

    const filteredWeighings = useMemo(() => {
        if (classificationFilter === 'all') return periodAnalysis.classifiedAnimals;
        return periodAnalysis.classifiedAnimals.filter(animal => animal.classification === classificationFilter);
    }, [periodAnalysis.classifiedAnimals, classificationFilter]);

    // Un renglón por CABRA (no por pesaje): se conserva el pesaje más reciente del
    // período por animal, y se ordena por producción.
    const uniqueAnimals = useMemo(() => {
        const map = new Map<string, AnalyzedAnimal>();
        for (const a of filteredWeighings) {
            const prev = map.get(a.id);
            if (!prev || new Date(a.date).getTime() > new Date(prev.date).getTime()) map.set(a.id, a);
        }
        return Array.from(map.values()).sort((a, b) => b.latestWeighing - a.latestWeighing);
    }, [filteredWeighings]);

    const handleBarClick = (data: any) => { if (data?.payload?.name) { const newFilter = data.payload.name as any; setClassificationFilter(prev => prev === newFilter ? 'all' : newFilter); } };

    if (isLoading) { return <div className="text-center p-10"><h1 className="text-2xl text-c-text-muted">Cargando historial...</h1></div>; }

    if (!selectedPeriod) {
        return (
            <div className="w-full max-w-2xl mx-auto space-y-2 pb-12 px-4">
                {monthlyData.length > 0 ? (
                    monthlyData.map(stats => (<PeriodCard key={stats.periodId} stats={stats} onClick={() => setSelectedPeriod(stats)} />))
                ) : (
                    <div className="text-center py-10 bg-c-surface rounded-2xl">
                        <p className="text-c-text-muted">No hay datos históricos de pesajes registrados.</p>
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 pb-12 animate-fade-in px-4">
                <header className="flex items-center pt-2 pb-2">
                    <button onClick={() => { setSelectedPeriod(null); setClassificationFilter('all'); }} className="p-2 -ml-2 text-c-text-muted hover:text-c-text transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow"><h1 className="text-2xl font-bold tracking-tight text-c-text">{selectedPeriod.periodLabel}</h1></div>
                    <div className="w-8"></div>
                </header>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-c-surface p-3 rounded-2xl"><div className="text-xs uppercase text-c-text-muted mb-1 flex items-center gap-1"><Droplet size={14} />Promedio / Animal</div><div className="flex items-baseline gap-2"><p className="text-2xl font-bold text-c-accent-gold">{selectedPeriod.averageKg.toFixed(2)}<span className="text-lg ml-1 text-c-text-faint">Kg</span></p><ChangeIndicator value={selectedPeriod.avgKgChange} /></div></div>
                    <div className="bg-c-surface p-3 rounded-2xl"><div className="text-xs uppercase text-c-text-muted mb-1 flex items-center gap-1"><Calendar size={14} />Eventos de Pesaje</div><p className="text-2xl font-bold text-c-text">{selectedPeriod.weighingEvents}</p></div>
                    <button onClick={() => setIsVariationModalOpen(true)} className="bg-c-surface p-3 rounded-2xl text-left hover:border-c-accent-sky transition-colors border border-c-border"><div className="text-xs uppercase text-c-text-muted mb-1 flex items-center gap-1"><Users size={14} />Animales Ordeñados</div><div className="flex items-baseline gap-2"><p className="text-2xl font-bold text-c-text">{selectedPeriod.animalCount}</p><ChangeIndicator value={selectedPeriod.animalCountChange} /></div></button>
                    <div className="bg-c-surface p-3 rounded-2xl"><div className="text-xs uppercase text-c-text-muted mb-1 flex items-center gap-1"><TrendingUp size={14} />Total Registrado</div><p className="text-2xl font-bold text-c-accent-gold">{selectedPeriod.totalKg.toFixed(0)}<span className="text-lg ml-1 text-c-text-faint">Kg</span></p></div>
                </div>

                <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-4 border border-c-border">
                    <div className="flex items-center space-x-2 border-b border-c-border pb-2 mb-4"><BarChart2 className="text-c-accent-sky" size={18} /><h3 className="text-lg font-semibold text-c-text">Distribución del Período</h3></div>
                    <div className="w-full h-48">
                        <ResponsiveContainer><BarChart data={periodAnalysis.distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" /><YAxis orientation="left" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30, 111, 173, 0.06)' }} />
                            <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                {periodAnalysis.distribution.map((entry) => (<Cell key={entry.name} fill={entry.fill} className={`${classificationFilter !== 'all' && classificationFilter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />))}
                                <LabelList dataKey="count" content={<CustomBarLabel total={periodAnalysis.classifiedAnimals.length} />} />
                            </Bar>
                        </BarChart></ResponsiveContainer>
                    </div>
                    <div className="text-center text-xs text-c-text-muted mt-2"><span>μ = {periodAnalysis.mean.toFixed(2)} Kg</span> | <span>σ = {periodAnalysis.stdDev.toFixed(2)}</span></div>
                </div>

                <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-c-text-strong ml-1 mt-4">Animales del Período ({uniqueAnimals.length})</h3>
                    {uniqueAnimals.length > 0 ? (
                        uniqueAnimals.map((animal) => (
                            <WeighingRow key={animal.id} weighing={animal} onSelectAnimal={(id) => navigateToRebano({ name: 'lactation-profile', animalId: id })} />
                        ))
                    ) : (
                        <div className="text-center py-6 bg-c-surface rounded-lg">
                            <p className="text-c-text-faint">No hay pesajes que coincidan con el filtro.</p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={isVariationModalOpen} onClose={() => setIsVariationModalOpen(false)} title="Variación de Animales en Ordeño">
                <div className="text-c-text-strong space-y-4">
                    <div>
                        <h4 className="font-semibold text-c-text mb-1">{selectedPeriod.periodLabel} vs Mes Anterior</h4>
                        <p className="text-sm text-c-text-muted">El mes anterior tenías <span className='font-bold text-c-text'>{selectedPeriod.previousAnimalCount}</span> animales en ordeño. Este mes tienes <span className='font-bold text-c-text'>{selectedPeriod.animalCount}</span>.</p>
                        <div className="flex items-center gap-2 mt-2">
                            <p>El cambio neto es de <span className='font-bold text-c-text'>{selectedPeriod.animalCount - (selectedPeriod.previousAnimalCount || 0)}</span> animales</p>
                            <ChangeIndicator value={selectedPeriod.animalCountChange} />
                        </div>
                    </div>
                    <div className="pt-4 border-t border-c-border">
                        {selectedPeriod.exitingAnimalCount! > 0 && <p className="text-sm text-c-text-muted mt-1">Salieron del ordeño: <span className="font-bold text-brand-red">{selectedPeriod.exitingAnimalCount}</span> animales.</p>}
                        {selectedPeriod.newAnimalsWeighings.length > 0 && <p className="text-sm text-c-text-muted mt-1">Nuevos ingresos: <span className="font-bold text-brand-green">{new Set(selectedPeriod.newAnimalsWeighings.map(w => w.goatId)).size}</span> animales.</p>}

                        {selectedPeriod.newAnimalsWeighings.length > 0 && (
                            <button onClick={() => { setAnalysisModalData(selectedPeriod); setIsVariationModalOpen(false); }} className="w-full mt-4 bg-c-accent-sky text-white font-semibold py-2 rounded-lg hover:opacity-90 transition-colors">
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
                onSelectAnimal={(id) => navigateToRebano({ name: 'lactation-profile', animalId: id })}
            />
        </>
    );
}
