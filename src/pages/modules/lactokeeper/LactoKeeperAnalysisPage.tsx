import React, { useState, useMemo } from 'react';
import { useData } from '../../../context/DataContext';
import { ChevronRight, ArrowUp, ArrowDown, Sparkles, ChevronLeft, FilterX, Info, Sigma, Droplets, TrendingUp, LogIn, LogOut, Target, Search } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import { useGaussAnalysis, AnalyzedAnimal } from '../../../hooks/useGaussAnalysis';
import { WeighingTrendIcon } from '../../../components/ui/WeighingTrendIcon';
import { Modal } from '../../../components/ui/Modal';
import { useWeighingTrend } from '../../../hooks/useWeighingTrend';
import { formatAge } from '../../../utils/calculations';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';

// --- SUB-COMPONENTES DE UI PARA ESTA PÁGINA ---

const KpiCard = ({ title, value, unit, icon: Icon, onClick }: { title: string, value: string, unit?: string, icon: React.ElementType, onClick: () => void }) => (
    <button onClick={onClick} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left hover:border-brand-orange transition-colors w-full">
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase">
            <Icon size={14} />
            <span>{title}</span>
        </div>
        <p className="text-2xl font-bold text-white mt-1">{value} <span className="text-lg text-zinc-400">{unit}</span></p>
    </button>
);

const MilkingAnimalRow = ({ animal, onSelectAnimal, onTrendClick, isNewEntry }: { animal: AnalyzedAnimal, onSelectAnimal: (id: string) => void, onTrendClick: (animal: AnalyzedAnimal) => void, isNewEntry: boolean }) => {
    const { weighings } = useData();
    const { trend, isLongTrend } = useWeighingTrend(animal.id, weighings);

    const classificationColor = {
        'Sobresaliente': 'bg-brand-green',
        'Promedio': 'bg-gray-500',
        'Pobre': 'bg-brand-red',
    };

    const handleTrendClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isNewEntry && trend && trend !== 'single') {
            onTrendClick(animal);
        }
    };
    const formattedAge = formatAge(animal.birthDate);

    return (
        <div onClick={() => onSelectAnimal(animal.id)} className="relative w-full cursor-pointer text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-orange transition-colors">
            <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${animal.latestWeighing > 0 ? classificationColor[animal.classification] : 'bg-transparent'}`} title={`Rendimiento: ${animal.classification}`}></div>
            <div>
                <p className="font-bold text-lg text-white">{animal.id}</p>
                <p className="text-sm text-zinc-400 mt-1">
                    {animal.sex} | {formattedAge} | Lote: {animal.location || 'Sin Asignar'}
                </p>
            </div>
            <div className="flex items-center space-x-3">
                <div className="text-right">
                    <p className="font-semibold text-brand-orange">{animal.latestWeighing > 0 ? `${animal.latestWeighing.toFixed(2)} Kg` : 'Sin Pesar'}</p>
                    {animal.del > 0 && <p className="text-xs text-zinc-400">DEL: {animal.del}</p>}
                </div>
                {isNewEntry ? (
                    <span title="Primer Ingreso al Control Lechero" className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/20 text-brand-green">
                        <LogIn size={18} strokeWidth={3}/>
                    </span>
                ) : (
                    <button onClick={handleTrendClick} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors disabled:cursor-not-allowed" disabled={!trend || trend === 'single'}>
                        <WeighingTrendIcon trend={trend} isLongTrend={isLongTrend} />
                    </button>
                )}
                <ChevronRight className="text-zinc-600" />
            </div>
        </div>
    );
};

const TrendModalContent = ({ animalId }: { animalId: string }) => {
    const { weighings } = useData();
    const { lastTwoWeighings, difference } = useWeighingTrend(animalId, weighings);
    if (lastTwoWeighings.length < 2) return <p>No hay suficientes datos para comparar.</p>;
    return (
        <div className="text-center text-white space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-sm text-zinc-400">Pesaje Anterior ({new Date(lastTwoWeighings[1].date + 'T00:00:00').toLocaleDateString()})</p>
                    <p className="text-2xl font-semibold">{lastTwoWeighings[1]?.kg.toFixed(2) || 'N/A'} Kg</p>
                </div>
                <div>
                    <p className="text-sm text-zinc-400">Último Pesaje ({new Date(lastTwoWeighings[0].date + 'T00:00:00').toLocaleDateString()})</p>
                    <p className="text-2xl font-semibold">{lastTwoWeighings[0]?.kg.toFixed(2) || 'N/A'} Kg</p>
                </div>
            </div>
            <div>
                <p className="text-zinc-400 text-base mb-1">Diferencia</p>
                <p className={`text-3xl font-bold ${difference > 0.15 ? 'text-brand-green' : difference < -0.15 ? 'text-brand-red' : 'text-zinc-400'}`}>
                    {difference > 0 ? '+' : ''}{difference.toFixed(2)} Kg
                </p>
            </div>
        </div>
    );
};

const CustomBarLabel = (props: any) => {
    const { x, y, width, value, total } = props;
    if (total === 0 || value === 0) return null;
    const percentage = ((value / total) * 100).toFixed(0);
    return (<text x={x + width / 2} y={y + 18} fill="#fff" textAnchor="middle" fontSize="12px" fontWeight="bold">{`${percentage}%`}</text>);
};

interface LactoKeeperAnalysisPageProps {
    onSelectAnimal: (animalId: string) => void;
}

export default function LactoKeeperAnalysisPage({ onSelectAnimal }: LactoKeeperAnalysisPageProps) {
    const { animals, parturitions, weighings, isLoading } = useData();
    const [isWeighted, setIsWeighted] = useState(false);
    const [classificationFilter, setClassificationFilter] = useState<'all' | 'Pobre' | 'Promedio' | 'Sobresaliente'>('all');
    const [trendFilter, setTrendFilter] = useState<'all' | 'up' | 'down' | 'stable'>('all');
    const [specialFilter, setSpecialFilter] = useState<'all' | 'new'>('all');
    const [lactationPhaseFilter, setLactationPhaseFilter] = useState<'all' | 'first' | 'second' | 'third' | 'drying'>('all');
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [trendModalAnimal, setTrendModalAnimal] = useState<AnalyzedAnimal | null>(null);
    const [isExitingAnimalsModalOpen, setIsExitingAnimalsModalOpen] = useState(false);
    const [dateIndex, setDateIndex] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    
    const { weighingsByDate, availableDates } = useMemo(() => {
        const groups: Record<string, any[]> = {};
        weighings.forEach(w => { if (!groups[w.date]) groups[w.date] = []; groups[w.date].push(w); });
        const dates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        return { weighingsByDate: groups, availableDates: dates };
    }, [weighings]);
    
    const currentDate = availableDates[dateIndex];
    
    const selectedWeighings = useMemo(() => {
        if (!currentDate) return [];
        const weighingsForDate = weighingsByDate[currentDate] || [];
        const unique = new Map();
        weighingsForDate.forEach(w => unique.set(w.goatId, w));
        return Array.from(unique.values());
    }, [currentDate, weighingsByDate]);
    
    const { classifiedAnimals, distribution, mean, stdDev, weightedMean } = useGaussAnalysis(selectedWeighings, animals, weighings, parturitions, isWeighted);
    
    const { newAnimalIds, exitingAnimalIds } = useMemo(() => {
        const currentIds = new Set(selectedWeighings.map(w => w.goatId));
        const allPreviousWeighingIds = new Set(weighings.filter(w => new Date(w.date) < new Date(currentDate)).map(w => w.goatId));
        const newIds = new Set([...currentIds].filter(id => !allPreviousWeighingIds.has(id)));
        
        const previousDayWeighings = availableDates[dateIndex + 1] ? (weighingsByDate[availableDates[dateIndex + 1]] || []) : [];
        const previousDayIds = new Set(previousDayWeighings.map(w => w.goatId));
        const exitingIds = new Set([...previousDayIds].filter(id => !currentIds.has(id)));

        return { newAnimalIds: newIds, exitingAnimalIds: exitingIds };
    }, [selectedWeighings, dateIndex, availableDates, weighingsByDate, weighings, currentDate]);

    const trendCounts = useMemo(() => {
        const nonNewEntries = classifiedAnimals.filter(a => !newAnimalIds.has(a.id));
        const totalWithHistory = nonNewEntries.length;
        if (totalWithHistory === 0) return { up: 0, down: 0, stable: 0 };
        return {
            up: (nonNewEntries.filter(a => a.trend === 'up').length / totalWithHistory) * 100,
            down: (nonNewEntries.filter(a => a.trend === 'down').length / totalWithHistory) * 100,
            stable: (nonNewEntries.filter(a => a.trend === 'stable').length / totalWithHistory) * 100,
        };
    }, [classifiedAnimals, newAnimalIds]);
    
    const animalsInProduction = useMemo(() => animals.filter(a => {
        const lastParturition = parturitions.filter(p => p.goatId === a.id).sort((a,b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
        return lastParturition?.status === 'activa';
    }), [animals, parturitions]);

    const finalAnimalList = useMemo(() => {
        let list: AnalyzedAnimal[];

        if (searchTerm) {
            list = animalsInProduction
                .filter(a => a.id.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(animal => {
                    const weighingData = classifiedAnimals.find(ca => ca.id === animal.id);
                    return {
                        ...(animal as any),
                        latestWeighing: weighingData?.latestWeighing || 0,
                        del: weighingData?.del || 0,
                        score: weighingData?.score || 0,
                        classification: weighingData?.classification || 'Promedio',
                        trend: weighingData?.trend || null,
                        weighingId: weighingData?.weighingId,
                        date: weighingData?.date || currentDate,
                    };
                });
        } else {
            list = [...classifiedAnimals];
            if (classificationFilter !== 'all') list = list.filter(a => a.classification === classificationFilter);
            if (specialFilter === 'new') {
                list = list.filter(a => newAnimalIds.has(a.id));
            } else if (trendFilter !== 'all') {
                list = list.filter(a => !newAnimalIds.has(a.id) && a.trend === trendFilter);
            }
            if (lactationPhaseFilter !== 'all') {
                list = list.filter(animal => {
                    const del = animal.del;
                    if (del === 0) return false;
                    if (lactationPhaseFilter === 'first') return del > 0 && del <= 100;
                    if (lactationPhaseFilter === 'second') return del > 100 && del <= 200;
                    if (lactationPhaseFilter === 'third') return del > 200 && del < 270;
                    if (lactationPhaseFilter === 'drying') return del >= 270;
                    return true;
                });
            }
        }
        return list.sort((a, b) => b.latestWeighing - a.latestWeighing);
    }, [searchTerm, classifiedAnimals, classificationFilter, trendFilter, specialFilter, lactationPhaseFilter, newAnimalIds, animalsInProduction, currentDate]);

    const { topPerformer, bottomPerformer, totalProd, consistency } = useMemo(() => {
        if (classifiedAnimals.length === 0) return { topPerformer: null, bottomPerformer: null, totalProd: 0, consistency: 0 };
        const productions = classifiedAnimals.map(a => a.latestWeighing);
        const total = productions.reduce((sum, kg) => sum + kg, 0);
        const max = Math.max(...productions);
        const min = Math.min(...productions);
        const lowerBound = mean - stdDev;
        const upperBound = mean + stdDev;
        const consistentCount = classifiedAnimals.filter(a => a.latestWeighing >= lowerBound && a.latestWeighing <= upperBound).length;
        return { topPerformer: classifiedAnimals.find(a => a.latestWeighing === max), bottomPerformer: classifiedAnimals.find(a => a.latestWeighing === min), totalProd: total, consistency: (consistentCount / classifiedAnimals.length) * 100 };
    }, [classifiedAnimals, mean, stdDev]);

    const resetFilters = () => { setClassificationFilter('all'); setTrendFilter('all'); setSpecialFilter('all'); setLactationPhaseFilter('all'); setSearchTerm(''); };
    const handleBarClick = (data: any) => { if (data?.name) { const newFilter = data.name as any; setClassificationFilter(prev => prev === newFilter ? 'all' : newFilter); }};
    
    if (isLoading && availableDates.length === 0) return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Calculando análisis...</h1></div>;
    if (availableDates.length === 0) return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">No hay pesajes registrados.</h1></div>;
    
    return (
        <>
            {/* --- LÍNEA CORREGIDA --- */}
            <div className="w-full max-w-2xl mx-auto h-full overflow-y-auto">
                <div className="p-4 space-y-4">
                    <div className="bg-brand-glass rounded-2xl p-3 border border-brand-border flex justify-between items-center"><button onClick={() => setDateIndex(i => Math.min(i + 1, availableDates.length - 1))} disabled={dateIndex >= availableDates.length - 1} className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30"><ChevronLeft /></button><div className="text-center"><h1 className="text-lg font-semibold text-white">{new Date(currentDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}</h1><p className="text-sm text-zinc-400">{selectedWeighings.length} animales pesados</p></div><button onClick={() => setDateIndex(i => Math.max(i - 1, 0))} disabled={dateIndex === 0} className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30"><ChevronRight /></button></div>
                    <div className="grid grid-cols-2 gap-4"><KpiCard icon={Droplets} title={isWeighted ? 'Media Ponderada' : 'Media de Prod.'} value={(isWeighted ? weightedMean : mean).toFixed(2)} unit="Kg" onClick={() => setActiveModal('media')} /><KpiCard icon={Sigma} title="Prod. Total" value={totalProd.toFixed(2)} unit="Kg" onClick={() => setActiveModal('total')} /><KpiCard icon={Target} title="Consistencia" value={stdDev.toFixed(2)} unit="σ" onClick={() => setActiveModal('consistencia')} /><KpiCard icon={TrendingUp} title="Rango Prod." value={`${bottomPerformer?.latestWeighing.toFixed(2) || 0} - ${topPerformer?.latestWeighing.toFixed(2) || 0}`} unit="Kg" onClick={() => setActiveModal('rango')} /></div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border"><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold text-white">Distribución del Día</h3><label className="flex items-center space-x-2 text-sm text-zinc-300 cursor-pointer"><Sparkles size={14} className={isWeighted ? 'text-brand-orange' : 'text-zinc-500'}/><span>Ponderado</span><button type="button" onClick={() => setActiveModal('infoPonderado')} className="text-zinc-500 hover:text-white -ml-1"><Info size={14}/></button><input type="checkbox" checked={isWeighted} onChange={(e) => setIsWeighted(e.target.checked)} className="form-checkbox h-4 w-4 bg-zinc-700 border-zinc-600 rounded text-brand-orange focus:ring-brand-orange focus:ring-offset-0"/></label></div><div className="w-full h-48"><ResponsiveContainer><BarChart data={distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}><XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} /><YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} /><Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} /><Bar dataKey="count" onClick={handleBarClick} cursor="pointer">{distribution.map(entry => (<Cell key={entry.name} fill={entry.fill} className={`${classificationFilter !== 'all' && classificationFilter !== entry.name ? 'opacity-30' : 'opacity-100'}`} />))}<LabelList dataKey="count" content={<CustomBarLabel total={classifiedAnimals.length} />} /></Bar></BarChart></ResponsiveContainer></div></div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-2 border border-brand-border space-y-2">
                        <div className="flex justify-between items-center px-2 pt-2"><div className="flex items-center space-x-1 sm:space-x-2"><button onClick={() => { setTrendFilter('all'); setSpecialFilter('all'); }} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${trendFilter === 'all' && specialFilter === 'all' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>Todos</button><button onClick={() => { setTrendFilter('up'); setSpecialFilter('all'); }} disabled={Object.values(trendCounts).every(v=>v===0)} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${trendFilter === 'up' ? 'bg-brand-green/80 text-white' : 'bg-zinc-800/50 text-brand-green'} disabled:opacity-40`}><ArrowUp size={14}/> <span>{trendCounts.up.toFixed(0)}%</span></button><button onClick={() => { setTrendFilter('down'); setSpecialFilter('all'); }} disabled={Object.values(trendCounts).every(v=>v===0)} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${trendFilter === 'down' ? 'bg-brand-red/80 text-white' : 'bg-zinc-800/50 text-brand-red'} disabled:opacity-40`}><ArrowDown size={14}/> <span>{trendCounts.down.toFixed(0)}%</span></button></div><button onClick={resetFilters} title="Limpiar todos los filtros" className="text-zinc-500 hover:text-white"><FilterX size={16}/></button></div>
                        <div className="flex justify-between items-center p-2 border-t border-brand-border"><div className="text-xs font-semibold text-zinc-400">Fase Lactancia:</div><div className="flex items-center space-x-1 sm:space-x-2"><button onClick={() => setLactationPhaseFilter('all')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'all' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>Todos</button><button onClick={() => setLactationPhaseFilter('first')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'first' ? 'bg-brand-blue text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>1er T</button><button onClick={() => setLactationPhaseFilter('second')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'second' ? 'bg-brand-blue text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>2do T</button><button onClick={() => setLactationPhaseFilter('third')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'third' ? 'bg-brand-blue text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>3er T</button><button onClick={() => setLactationPhaseFilter('drying')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'drying' ? 'bg-brand-red/80 text-white' : 'bg-zinc-800/50 text-brand-red'}`}>A Secado</button></div></div>
                        <div className="flex justify-between items-center p-2 border-t border-brand-border"><div className="text-xs font-semibold text-zinc-400">Movimientos:</div><div className="flex items-center space-x-2"><button onClick={() => setSpecialFilter(prev => prev === 'new' ? 'all' : 'new')} disabled={newAnimalIds.size === 0} className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${specialFilter === 'new' ? 'bg-brand-green text-white' : 'bg-zinc-800/50 text-zinc-300'} disabled:opacity-40`}><LogIn size={14}/> <span>Ingresos ({newAnimalIds.size})</span></button><button onClick={() => setIsExitingAnimalsModalOpen(true)} disabled={exitingAnimalIds.size === 0} className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all bg-zinc-800/50 text-zinc-300 disabled:opacity-40`}><LogOut size={14}/> <span>Salidas ({exitingAnimalIds.size})</span></button></div></div>
                    </div>
                    <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" /><input type="search" placeholder="Buscar en animales en producción..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-brand-glass border border-brand-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-brand-orange"/></div>
                    
                    <div className="pt-2 space-y-2">
                        {finalAnimalList.length > 0 ? (
                            finalAnimalList.map(animal => (
                                <MilkingAnimalRow key={animal.id} animal={animal} onSelectAnimal={onSelectAnimal} onTrendClick={setTrendModalAnimal} isNewEntry={newAnimalIds.has(animal.id)} />
                            ))
                        ) : (
                            <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4">
                                <p className="text-zinc-400">{searchTerm ? `No se encontraron resultados` : "No hay animales con los filtros aplicados."}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            
            <Modal isOpen={activeModal === 'media'} onClose={() => setActiveModal(null)} title="Análisis de Producción Media"><div className="text-zinc-300 space-y-4 text-base"><p>La **Media de Producción** del día es **{mean.toFixed(2)} Kg**. Representa el promedio simple de todos los animales pesados.</p><p>La **Media Ponderada** ({weightedMean.toFixed(2)} Kg) es un cálculo avanzado que premia la **persistencia lechera**. Tiene más valor un animal que produce 2 Kg en su día 250 de lactancia que uno que produce 2 Kg en el día 40. Este indicador te ayuda a identificar a tus animales más eficientes a largo plazo.</p></div></Modal>
            <Modal isOpen={activeModal === 'total'} onClose={() => setActiveModal(null)} title="Producción Total del Día"><div className="text-center"><p className="text-zinc-400">La producción total registrada el {new Date(currentDate + 'T00:00:00').toLocaleDateString()} fue:</p><h2 className="text-5xl font-bold text-brand-orange my-2">{totalProd.toFixed(2)} Kg</h2></div></Modal>
            <Modal isOpen={activeModal === 'consistencia'} onClose={() => setActiveModal(null)} title="Análisis de Consistencia (σ)"><div className="text-zinc-300 space-y-4 text-base"><p>La Desviación Estándar (σ) de **{stdDev.toFixed(2)}** mide qué tan dispersa está la producción. Un valor bajo es ideal, indica un rebaño consistente.</p><div className="bg-black/30 p-4 rounded-lg text-center"><p className="text-sm uppercase text-zinc-400">Rebaño dentro de 1σ de la media</p><p className="text-4xl font-bold text-brand-orange my-1">{consistency.toFixed(0)}%</p><p className="text-sm text-zinc-400">Esto significa que la mayoría de tu rebaño tiene un rendimiento cercano al promedio de {mean.toFixed(2)} Kg.</p></div></div></Modal>
            <Modal isOpen={activeModal === 'rango'} onClose={() => setActiveModal(null)} title="Extremos de Producción del Día"><div className="space-y-4">{topPerformer && <div className="bg-green-900/40 border border-green-500/50 rounded-2xl p-4"><h3 className="font-semibold text-brand-green mb-2">Producción Máxima</h3><MilkingAnimalRow animal={topPerformer} onSelectAnimal={onSelectAnimal} onTrendClick={setTrendModalAnimal} isNewEntry={newAnimalIds.has(topPerformer.id)} /></div>} {bottomPerformer && <div className="bg-red-900/40 border border-red-500/50 rounded-2xl p-4"><h3 className="font-semibold text-brand-red mb-2">Producción Mínima</h3><MilkingAnimalRow animal={bottomPerformer} onSelectAnimal={onSelectAnimal} onTrendClick={setTrendModalAnimal} isNewEntry={newAnimalIds.has(bottomPerformer.id)} /></div>}</div></Modal>
            <Modal isOpen={activeModal === 'infoPonderado'} onClose={() => setActiveModal(null)} title="¿Qué es el Score Ponderado?"><div className="text-zinc-300 space-y-4 text-base"><p>El Score Ponderado ajusta la producción de un animal para premiar la **persistencia lechera**, un indicador clave de la calidad genética y la eficiencia.</p><div><h4 className="font-semibold text-white mb-1">Fórmula Aplicada</h4><div className="bg-black/30 p-3 rounded-lg text-sm font-mono text-center text-orange-300">Score = Kg × (1 + ((DEL - 50) / (DEL + 50)))</div></div><p className="pt-2 border-t border-zinc-700/80 text-sm">Esto significa que 2 Kg en el día **200** de lactancia obtendrán un score **mucho más alto** que 2 Kg en el día 40, ayudándote a identificar a tus animales más eficientes y persistentes.</p></div></Modal>
            {trendModalAnimal && <Modal isOpen={!!trendModalAnimal} onClose={() => setTrendModalAnimal(null)} title={`Tendencia de ${trendModalAnimal.id}`}><TrendModalContent animalId={trendModalAnimal.id} /></Modal>}
            <Modal isOpen={isExitingAnimalsModalOpen} onClose={() => setIsExitingAnimalsModalOpen(false)} title="Animales que Salieron del Ordeño"><div className="space-y-2 max-h-80 overflow-y-auto pr-2">{exitingAnimalIds.size > 0 ? Array.from(exitingAnimalIds).map(id => (<button key={id as string} onClick={() => { onSelectAnimal(id as string); setIsExitingAnimalsModalOpen(false); }} className="w-full text-left p-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex justify-between items-center"><span className="font-semibold text-white">{id}</span><ChevronRight className="text-zinc-500" /></button>)) : <p className="text-center text-zinc-500 py-4">No hay animales en esta lista.</p>}</div></Modal>
        </>
    );
}