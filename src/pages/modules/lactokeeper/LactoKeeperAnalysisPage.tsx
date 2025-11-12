import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../../../context/DataContext';
// --- CORRECCIÓN: Imports limpios ---
import { Plus, ChevronRight, ArrowUp, ArrowDown, Sparkles, ChevronLeft, FilterX, Info, Sigma, Droplets, TrendingUp, LogIn, LogOut, Target, Search, Trash2, BarChart as BarChartIconLucide, Wind, Archive } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList, CartesianGrid, ReferenceLine } from 'recharts';
// ---
import { useGaussAnalysis, AnalyzedAnimal } from '../../../hooks/useGaussAnalysis';
import { WeighingTrendIcon } from '../../../components/ui/WeighingTrendIcon';
import { Modal } from '../../../components/ui/Modal';
import { useWeighingTrend } from '../../../hooks/useWeighingTrend';
import { formatAge, getAnimalStatusObjects } from '../../../utils/calculations';
import { formatAnimalDisplay } from '../../../utils/formatting';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
import { useSearch } from '../../../hooks/useSearch';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { StatusIcons } from '../../../components/icons/StatusIcons';
import { ActionSheetModal, ActionSheetAction } from '../../../components/ui/ActionSheetModal';
import { AddMilkWeighingModal } from '../../../components/modals/AddMilkWeighingModal';
import { useDryingCandidates } from '../../../hooks/useDryingCandidates';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../../../hooks/useAnimalStatus';
import { ExitingAnimalsModal } from '../../../components/modals/ExitingAnimalsModal';
import { DeleteSessionModal } from '../../../components/modals/DeleteSessionModal';
import { Animal } from '../../../db/local';

// --- SUB-COMPONENTES ---

const KpiCard = ({ title, value, unit, icon: Icon, onClick }: { title: string, value: string, unit?: string, icon: React.ElementType, onClick: () => void }) => (
    <button onClick={onClick} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left hover:border-brand-orange transition-colors w-full">
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase">
            <Icon size={14} />
            <span>{title}</span>
        </div>
        <p className="text-2xl font-bold text-white mt-1">{value} <span className="text-lg text-zinc-400">{unit}</span></p>
    </button>
);

// Este componente wrapper calcula el trend
const MilkingAnimalRowWrapper = ({ animal, onSelectAnimal, onOpenActions, isNewEntry }: {
    animal: AnalyzedAnimal & Animal & { formattedAge: string; statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] },
    onSelectAnimal: (id: string) => void,
    onOpenActions: (animal: AnalyzedAnimal) => void,
    isNewEntry: boolean
}) => {
    const { weighings } = useData();
    const { trend, isLongTrend } = useWeighingTrend(animal.id, weighings);

    return (
        <MilkingAnimalRow
            animal={animal}
            onSelectAnimal={onSelectAnimal}
            onOpenActions={onOpenActions}
            isNewEntry={isNewEntry}
            trend={trend}
            isLongTrend={isLongTrend}
        />
    );
};

// Componente para mostrar la fila de un animal en la lista de análisis
const MilkingAnimalRow = ({ animal, onSelectAnimal, onOpenActions, isNewEntry, trend, isLongTrend }: {
    animal: AnalyzedAnimal & Animal & { formattedAge: string; statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] },
    onSelectAnimal: (id: string) => void,
    onOpenActions: (animal: AnalyzedAnimal) => void,
    isNewEntry: boolean,
    trend: 'up' | 'down' | 'stable' | 'single' | null, 
    isLongTrend: boolean
}) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 80;

    const classificationColor = {
        'Sobresaliente': 'bg-brand-green',
        'Promedio': 'bg-gray-500',
        'Pobre': 'bg-brand-red',
    };

    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            onOpenActions(animal);
        }
        swipeControls.start({ x: 0 });
        setTimeout(() => { dragStarted.current = false; }, 100);
    };

    return (
        <div className="relative w-full overflow-hidden bg-brand-glass border-b border-brand-border/50 last:border-b-0">
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <div className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                     <Plus size={22} /><span className="text-xs mt-1 font-semibold">Acciones</span>
                </div>
            </div>
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) { onSelectAnimal(animal.id); } }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-3"
            >
                <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${animal.latestWeighing > 0 ? classificationColor[animal.classification] : 'bg-transparent'}`} title={`Rendimiento: ${animal.classification}`}></div>
                
                <div className="flex justify-between items-center w-full">
                    <div className="min-w-0 pr-3">
                        <p className="font-mono font-semibold text-base text-white truncate">{animal.id.toUpperCase()}</p>
                        
                        <p className="text-sm font-normal text-zinc-300 truncate h-5"> 
                            {formattedName || <>&nbsp;</>}
                        </p>

                        <div className="text-xs text-zinc-500 mt-1 min-h-[1rem] truncate">
                            <span>{animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'N/A'}</span>
                        </div>
                    </div>
                    {/* --- INICIO DE LA CORRECCIÓN DE POSICIÓN --- */}
                    <div className="flex items-center space-x-2 flex-shrink-0 pl-4"> {/* Ajuste en pl */}
                        {/* StatusIcons ahora va antes del valor de Kg */}
                        <div className="flex-shrink-0 pt-0.5"> {/* Añadido pt-0.5 para alinear con el texto */}
                            <StatusIcons
                                statuses={animal.statusObjects}
                                sex={animal.sex}
                                size={14} // Tamaño pequeño
                                hideLactationStatus={true} // Ocultar iconos de lactancia aquí
                            />
                        </div>
                        <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-base text-brand-orange">{animal.latestWeighing > 0 ? `${animal.latestWeighing.toFixed(2)} Kg` : 'Sin Pesar'}</p>
                            {animal.del > 0 && <p className="text-xs text-zinc-400">DEL: {animal.del}</p>}
                        </div>
                        
                        {isNewEntry ? (
                           <span title="Primer Ingreso al Control Lechero" className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500/20 text-brand-green">
                               <LogIn size={16} strokeWidth={2.5}/>
                           </span>
                       ) : (
                           <div className="w-6 h-6 flex items-center justify-center">
                               <WeighingTrendIcon trend={trend} isLongTrend={isLongTrend} />
                           </div>
                       )}
                        <ChevronRight className="text-zinc-600 w-5 h-5" />
                    </div>
                    {/* --- FIN DE LA CORRECCIÓN DE POSICIÓN --- */}
                </div>
            </motion.div>
        </div>
    );
};

const TrendModalContent = ({ animalId }: { animalId: string }) => {
    const { weighings } = useData();
    const { lastTwoWeighings, difference } = useWeighingTrend(animalId, weighings);
    
    if (lastTwoWeighings.length < 2) {
        return <p>No hay suficientes datos para comparar.</p>;
    }
    
    return (
        <div className="text-center text-white space-y-4">
             <div className="grid grid-cols-2 gap-4 text-center">
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
    const { x, y, width, height, value, total } = props;
    if (total === 0 || value === 0) return null;
    const percentage = ((value / total) * 100).toFixed(0);
    
    return (
         <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize="14px" fontWeight="bold" opacity={0.8}>{`${percentage}%`}</text>
    );
};

// Props para la página de análisis
interface LactoKeeperAnalysisPageProps {
    onSelectAnimal: (animalId: string) => void;
}

// --- COMPONENTE PRINCIPAL DE LA PÁGINA DE ANÁLISIS ---
export default function LactoKeeperAnalysisPage({ onSelectAnimal }: LactoKeeperAnalysisPageProps) {
    const { animals, parturitions, weighings, isLoading, serviceRecords, sireLots, breedingSeasons, startDryingProcess, setLactationAsDry, deleteWeighingSession } = useData();
    const [isWeighted, setIsWeighted] = useState(false);
    const [classificationFilter, setClassificationFilter] = useState<'all' | 'Pobre' | 'Promedio' | 'Sobresaliente'>('all');
    const [trendFilter, setTrendFilter] = useState<'all' | 'up' | 'down' | 'stable' | 'single'>('all');
    const [specialFilter, setSpecialFilter] = useState<'all' | 'new'>('all');
    const [lactationPhaseFilter, setLactationPhaseFilter] = useState<'all' | 'first' | 'second' | 'third' | 'drying'>('all');
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [trendModalAnimal, setTrendModalAnimal] = useState<AnalyzedAnimal | null>(null);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
    const [isScoreInfoModalOpen, setIsScoreInfoModalOpen] = useState(false);
    const [isExitingAnimalsModalOpen, setIsExitingAnimalsModalOpen] = useState(false);
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);
    const [actionSheetAnimal, setActionSheetAnimal] = useState<AnalyzedAnimal | null>(null);
    const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false);
    const [dateIndex, setDateIndex] = useState(0);

    const dryingCandidateIds = useDryingCandidates();

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

    const classifiedAnimalsWithStatus = useMemo(() => {
        const animalMap = new Map(animals.map(a => [a.id, a]));
        return classifiedAnimals.map(ca => {
            const originalAnimal = animalMap.get(ca.id);
            return {
                ...(originalAnimal as Animal), 
                ...ca,
                formattedAge: originalAnimal ? formatAge(originalAnimal.birthDate) : 'N/A',
                statusObjects: originalAnimal ? getAnimalStatusObjects(originalAnimal, parturitions, serviceRecords, sireLots, breedingSeasons) : []
            };
        });
    }, [classifiedAnimals, animals, parturitions, serviceRecords, sireLots, breedingSeasons]);

    const previousDayWeighings = useMemo(() => {
        if (dateIndex + 1 < availableDates.length) {
            const previousDate = availableDates[dateIndex + 1];
            return weighingsByDate[previousDate] || [];
        }
        return [];
    }, [dateIndex, availableDates, weighingsByDate]);

    const previousDayAnalysis = useGaussAnalysis(previousDayWeighings, animals, weighings, parturitions, false);

    const pageData = useMemo(() => {
        const currentAnalyzedAnimalIds = new Set(classifiedAnimals.map(a => a.id));
        const previousAnalyzedAnimalIds = new Set(previousDayAnalysis.classifiedAnimals.map(a => a.id));
        let newAnimalIds = new Set<string>();
        let exitingAnimalIds = new Set<string>();
        if (dateIndex === availableDates.length - 1 && availableDates.length > 0) { newAnimalIds = currentAnalyzedAnimalIds; }
        else if (availableDates.length > 0){
             newAnimalIds = new Set([...currentAnalyzedAnimalIds].filter(id => !previousAnalyzedAnimalIds.has(id)));
             exitingAnimalIds = new Set([...previousAnalyzedAnimalIds].filter(id => !currentAnalyzedAnimalIds.has(id)));
        }
        const trendData = availableDates.slice(Math.max(0, dateIndex - 2), dateIndex + 1).map(date => {
            const dateWeighings = weighingsByDate[date] || [];
            if (dateWeighings.length === 0) return { date, avg: 0 };
            const total = dateWeighings.reduce((sum, w) => sum + w.kg, 0);
            return { date: new Date(date + 'T00:00:00').toLocaleDateString('es-VE', {month: 'short', day: 'numeric'}), avg: total / dateWeighings.length };
        }).reverse();

        let topPerformer: (AnalyzedAnimal & Animal & { formattedAge: string; statusObjects: any[] }) | null = null;
        let bottomPerformer: (AnalyzedAnimal & Animal & { formattedAge: string; statusObjects: any[] }) | null = null;
        let total = 0, max = 0, min = Infinity;
        if (classifiedAnimalsWithStatus.length > 0) {
            total = classifiedAnimalsWithStatus.reduce((sum, a) => sum + a.latestWeighing, 0);
            const productions = classifiedAnimalsWithStatus.map(a => a.latestWeighing);
            max = Math.max(...productions);
            min = Math.min(...productions.filter(kg => kg > 0));
             if(min === Infinity) min = 0;
            topPerformer = classifiedAnimalsWithStatus.find(a => a.latestWeighing === max) || null;
            bottomPerformer = classifiedAnimalsWithStatus.find(a => a.latestWeighing === min) || null;
        }
        const lowerBound = mean - stdDev;
        const upperBound = mean + stdDev;
        const consistentCount = classifiedAnimals.filter(a => a.latestWeighing >= lowerBound && a.latestWeighing <= upperBound).length;
        const consistencyPercentage = classifiedAnimals.length > 0 ? (consistentCount / classifiedAnimals.length) * 100 : 0;

        return { trendData, kpi: { total, max, min }, topPerformer, bottomPerformer, consistency: { percentage: consistencyPercentage }, newAnimalIds, exitingAnimalIds };
    }, [classifiedAnimals, classifiedAnimalsWithStatus, previousDayAnalysis.classifiedAnimals, availableDates, dateIndex, weighingsByDate, mean, stdDev]);

    
    const { searchTerm, setSearchTerm, filteredItems } = useSearch(
        classifiedAnimalsWithStatus, 
        ['id', 'name']
    ) as { 
        searchTerm: string; 
        setSearchTerm: (term: string) => void; 
        filteredItems: (AnalyzedAnimal & Animal & { formattedAge: string; statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] })[]; 
    };

    const finalAnimalList = useMemo(() => {
        let list = filteredItems; 

        if (classificationFilter !== 'all') { 
            list = list.filter(a => a.classification === classificationFilter); 
        }
        if (specialFilter === 'new') { 
            list = list.filter(animal => pageData.newAnimalIds.has(animal.id)); 
        }
        if (trendFilter !== 'all') { 
            list = list.filter(animal => animal.trend === trendFilter); 
        }
        if (lactationPhaseFilter !== 'all') {
            list = list.filter(animal => {
                const del = animal.del;
                if (lactationPhaseFilter === 'drying') return dryingCandidateIds.includes(animal.id);
                if (del === 0 || del === undefined) return false;
                if (lactationPhaseFilter === 'first') return del > 0 && del <= 100;
                if (lactationPhaseFilter === 'second') return del > 100 && del <= 200;
                if (lactationPhaseFilter === 'third') return del > 200 && del < 270;
                return false;
            });
        }
        return list.sort((a,b) => b.latestWeighing - a.latestWeighing);
    }, [filteredItems, classificationFilter, trendFilter, lactationPhaseFilter, specialFilter, pageData.newAnimalIds, dryingCandidateIds]); 
    
    const trendCounts = useMemo(() => {
        const totalWithHistory = classifiedAnimals.filter(a => !pageData.newAnimalIds.has(a.id)).length;
        if (classifiedAnimals.length === 0) return { up: 0, down: 0, stable: 0, new: 0 };
        if (totalWithHistory === 0 && pageData.newAnimalIds.size > 0) return { up: 0, down: 0, stable: 0, new: 100 };
        if (totalWithHistory === 0) return { up: 0, down: 0, stable: 0, new: 0 };
        const upCount = classifiedAnimals.filter(a => a.trend === 'up').length;
        const downCount = classifiedAnimals.filter(a => a.trend === 'down').length;
        const stableCount = classifiedAnimals.filter(a => a.trend === 'stable').length;
        return {
            up: (upCount / totalWithHistory) * 100,
            down: (downCount / totalWithHistory) * 100,
            stable: (stableCount / totalWithHistory) * 100,
            new: (pageData.newAnimalIds.size / classifiedAnimals.length * 100) || 0,
        };
    }, [classifiedAnimals, pageData.newAnimalIds]);

    const resetFilters = () => { setClassificationFilter('all'); setTrendFilter('all'); setLactationPhaseFilter('all'); setSpecialFilter('all'); setSearchTerm(''); };
    const handleBarClick = (data: any) => { if (data?.payload?.name) { const newFilter = data.payload.name as 'Pobre' | 'Promedio' | 'Sobresaliente'; setClassificationFilter(prev => prev === newFilter ? 'all' : newFilter); }};
    const handleOpenActions = (animal: AnalyzedAnimal) => { setActionSheetAnimal(animal); setIsActionSheetOpen(true); };

    const getActionsForAnimal = (animal: AnalyzedAnimal | null): ActionSheetAction[] => {
        if (!animal) return [];
        const actions: ActionSheetAction[] = [];
        const currentParturition = parturitions.find(p => p.goatId === animal.id && (p.status === 'activa' || p.status === 'en-secado'));
        actions.push({ label: "Registrar/Editar Pesaje", icon: Droplets, onClick: () => { setIsActionSheetOpen(false); setActiveModal('milkWeighing'); }});
        if (currentParturition) {
            if (currentParturition.status === 'activa') {
                actions.push({ label: "Iniciar Secado", icon: Wind, onClick: () => { startDryingProcess(currentParturition.id); setIsActionSheetOpen(false); }, color: 'text-blue-400' });
            }
            if (currentParturition.status === 'activa' || currentParturition.status === 'en-secado') {
                 actions.push({ label: "Declarar Seca", icon: Archive, onClick: () => { setLactationAsDry(currentParturition.id); setIsActionSheetOpen(false); }, color: 'text-zinc-400' });
            }
        }
        return actions;
    };

    const closeModal = () => { setActiveModal(null); setActionSheetAnimal(null); };

    const handleDeleteCurrentSession = async () => {
        if (!currentDate) return;
        try { await deleteWeighingSession(currentDate); setDateIndex(0); setIsDeleteSessionModalOpen(false); }
        catch (error) { console.error("Error deleting session:", error); }
    };

    if (isLoading && availableDates.length === 0) return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Calculando análisis...</h1></div>;
    if (availableDates.length === 0) return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">No hay pesajes registrados.</h1></div>;

    // --- RENDERIZADO DE LA PÁGINA ---
    return (
        <>
            <div className="w-full max-w-2xl mx-auto">
                <div className="p-4 space-y-4">
                    {/* Controles, KPIs, Gráficos */}
                     <div className="bg-brand-glass rounded-2xl p-3 border border-brand-border flex justify-between items-center">
                        <button onClick={() => setDateIndex(i => Math.min(i + 1, availableDates.length - 1))} disabled={dateIndex >= availableDates.length - 1} className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30"><ChevronLeft /></button>
                        <div className="text-center">
                            <h1 className="text-lg font-semibold text-white">{currentDate ? new Date(currentDate + 'T00:00:00').toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin Datos'}</h1>
                            <p className="text-sm text-zinc-400">{selectedWeighings.length} animales pesados</p>
                        </div>
                        <div className="flex items-center">
                            <button onClick={() => setIsDeleteSessionModalOpen(true)} className="p-2 rounded-full text-zinc-500 hover:text-brand-red hover:bg-red-500/10 transition-colors mr-2" title="Eliminar pesajes de este día"> <Trash2 size={18}/> </button>
                            <button onClick={() => setDateIndex(i => Math.max(i - 1, 0))} disabled={dateIndex === 0} className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30"><ChevronRight /></button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <KpiCard icon={Droplets} title={isWeighted ? 'Media Ponderada' : 'Media Prod.'} value={(isWeighted ? weightedMean : mean).toFixed(2)} unit="Kg" onClick={() => setActiveModal('media')} />
                        <KpiCard icon={Sigma} title="Prod. Total" value={pageData.kpi.total.toFixed(2)} unit="Kg" onClick={() => setActiveModal('total')} />
                        <KpiCard icon={Target} title="Consistencia" value={stdDev.toFixed(2)} unit="σ" onClick={() => setActiveModal('stdDev')} />
                        <KpiCard icon={TrendingUp} title="Rango Prod." value={`${pageData.kpi.min.toFixed(2)} - ${pageData.kpi.max.toFixed(2)}`} unit="Kg" onClick={() => setActiveModal('rango')} />
                    </div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in">
                        <div className="flex justify-between items-center border-b border-brand-border pb-2 mb-4">
                             <div className="flex items-center space-x-2"><BarChartIconLucide className="text-brand-orange w-[18px] h-[18px]" /><h3 className="text-lg font-semibold text-white">Análisis del Día</h3><button onClick={() => setIsInfoModalOpen(true)} className="text-zinc-500 hover:text-white"><Info size={14}/></button></div>
                             <label className="flex items-center space-x-2 text-sm text-zinc-300 cursor-pointer">
                                 <Sparkles size={14} className={isWeighted ? 'text-brand-orange' : 'text-zinc-500'}/>
                                 <span>Ponderado a DEL</span>
                                 <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsScoreInfoModalOpen(true); }} className="text-zinc-500 hover:text-white -ml-1"><Info size={14}/></button>
                                 <input type="checkbox" checked={isWeighted} onChange={(e) => setIsWeighted(e.target.checked)} className="form-checkbox h-4 w-4 bg-zinc-700 border-zinc-600 rounded text-brand-orange focus:ring-brand-orange focus:ring-offset-0"/>
                             </label>
                        </div>
                        <div className="w-full h-48">
                            <ResponsiveContainer>
                                <BarChart data={distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                                    <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} allowDecimals={false}/>
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                                    <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                        {distribution.map((entry) => (<Cell key={entry.name} fill={entry.fill} className={`${classificationFilter !== 'all' && classificationFilter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />))}
                                        <LabelList dataKey="count" content={<CustomBarLabel total={classifiedAnimals.length} />} />
                                    </Bar>
                                    <ReferenceLine x={mean.toFixed(2)} stroke="#34C759" strokeWidth={2} label={{ value: `μ`, fill: '#34C759', position: 'insideTopLeft' }} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-center text-xs text-zinc-400 mt-2"><span>μ = {mean.toFixed(2)}</span> | <span>σ = {stdDev.toFixed(2)}</span></div>
                    </div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-2 border border-brand-border space-y-2">
                         <div className="flex justify-between items-center px-2 pt-2">
                           <div className="flex items-center space-x-1 sm:space-x-2">
                               <button onClick={() => { setTrendFilter('all'); setSpecialFilter('all'); }} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${trendFilter === 'all' && specialFilter === 'all' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>Todos</button>
                               <button onClick={() => { setTrendFilter('up'); setSpecialFilter('all'); }} disabled={trendCounts.up === 0 && classifiedAnimals.length - pageData.newAnimalIds.size > 0} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${trendFilter === 'up' ? 'bg-brand-green/80 text-white' : 'bg-zinc-800/50 text-brand-green'} disabled:opacity-40`}><ArrowUp size={14}/> <span>{trendCounts.up.toFixed(0)}%</span></button>
                               <button onClick={() => { setTrendFilter('down'); setSpecialFilter('all'); }} disabled={trendCounts.down === 0 && classifiedAnimals.length - pageData.newAnimalIds.size > 0} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${trendFilter === 'down' ? 'bg-brand-red/80 text-white' : 'bg-zinc-800/50 text-brand-red'} disabled:opacity-40`}><ArrowDown size={14}/> <span>{trendCounts.down.toFixed(0)}%</span></button>
                               <button onClick={() => { setTrendFilter('single'); setSpecialFilter('all'); }} disabled={trendCounts.new === 0 && classifiedAnimals.length > 0} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 ${trendFilter === 'single' ? 'bg-brand-blue/80 text-white' : 'bg-zinc-800/50 text-brand-blue'} disabled:opacity-40`}><Sparkles size={14}/> <span>{trendCounts.new.toFixed(0)}%</span></button>
                           </div>
                           <button onClick={resetFilters} title="Limpiar todos los filtros" className="text-zinc-500 hover:text-white"><FilterX size={16}/></button>
                        </div>
                        <div className="flex justify-between items-center p-2 border-t border-brand-border">
                           <div className="text-xs font-semibold text-zinc-400">Fase Lactancia:</div>
                           <div className="flex items-center space-x-1 sm:space-x-2">
                               <button onClick={() => setLactationPhaseFilter('all')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'all' ? 'bg-zinc-600 text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>Todos</button>
                               <button onClick={() => setLactationPhaseFilter('first')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'first' ? 'bg-brand-blue text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>1er T</button>
                               <button onClick={() => setLactationPhaseFilter('second')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'second' ? 'bg-brand-blue text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>2do T</button>
                               <button onClick={() => setLactationPhaseFilter('third')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'third' ? 'bg-brand-blue text-white' : 'bg-zinc-800/50 text-zinc-300'}`}>3er T</button>
                               <button onClick={() => setLactationPhaseFilter('drying')} className={`px-2 py-1 text-xs font-semibold rounded-md ${lactationPhaseFilter === 'drying' ? 'bg-brand-red/80 text-white' : 'bg-zinc-800/50 text-brand-red'}`}>A Secado</button>
                           </div>
                        </div>
                        <div className="flex justify-between items-center p-2 border-t border-brand-border">
                            <div className="text-xs font-semibold text-zinc-400">Movimientos:</div>
                            <div className="flex items-center space-x-2">
                                <button onClick={() => setSpecialFilter(prev => prev === 'new' ? 'all' : 'new')} disabled={pageData.newAnimalIds.size === 0} className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all ${specialFilter === 'new' ? 'bg-brand-green text-white shadow-lg shadow-green-500/20' : 'bg-zinc-800/50 text-zinc-300'} ${pageData.newAnimalIds.size > 0 && specialFilter !== 'new' && 'animate-pulse'} disabled:opacity-40 disabled:cursor-not-allowed`}><LogIn size={14}/> <span>Ingresos ({pageData.newAnimalIds.size})</span></button>
                                <button onClick={() => setIsExitingAnimalsModalOpen(true)} disabled={pageData.exitingAnimalIds.size === 0} className={`px-3 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all bg-zinc-800/50 text-zinc-300 ${pageData.exitingAnimalIds.size > 0 && 'animate-pulse'} disabled:opacity-40 disabled:cursor-not-allowed`}><LogOut size={14}/> <span>Salidas ({pageData.exitingAnimalIds.size})</span></button>
                            </div>
                        </div>
                    </div>
                    <div className="relative px-4">
                        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                        <input type="search" placeholder={`Buscar ID o Nombre en ${finalAnimalList.length} animales...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-brand-glass border border-brand-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-brand-orange"/>
                    </div>
                </div>

                <div className="pt-2 space-y-0 pb-4">
                    {finalAnimalList.length > 0 ? (
                        <div className="bg-brand-glass rounded-2xl border border-brand-border overflow-hidden mx-4">
                            {finalAnimalList.map((animal: AnalyzedAnimal & Animal & { formattedAge: string; statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] }) => (
                                <MilkingAnimalRowWrapper 
                                    key={animal.id} 
                                    animal={animal} 
                                    onSelectAnimal={onSelectAnimal} 
                                    onOpenActions={handleOpenActions} 
                                    isNewEntry={pageData.newAnimalIds.has(animal.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4">
                            <p className="text-zinc-400">{searchTerm ? `No se encontraron resultados` : "No hay animales con los filtros."}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- Modales (Contenido envuelto en children) --- */}
            <Modal isOpen={activeModal === 'media'} onClose={() => setActiveModal(null)} title="Análisis de Producción Media">
                <div className="text-zinc-300 space-y-4 text-base"><p>La **Media de Producción** del día es **{mean.toFixed(2)} Kg**. Representa el promedio simple.</p><p>La **Media Ponderada** ({weightedMean.toFixed(2)} Kg) premia la **persistencia lechera** (más valor a producción tardía).</p></div>
            </Modal>
            <Modal isOpen={activeModal === 'total'} onClose={() => setActiveModal(null)} title="Producción Total del Día">
                <div className="text-center"><p className="text-zinc-400">La producción total registrada el {currentDate ? new Date(currentDate + 'T00:00:00').toLocaleDateString('es-VE') : '-'} fue:</p><h2 className="text-5xl font-bold text-brand-orange my-2">{pageData.kpi.total.toFixed(2)} Kg</h2></div>
            </Modal>
            <Modal isOpen={activeModal === 'stdDev'} onClose={() => setActiveModal(null)} title="Análisis de Consistencia (σ)">
                <div className="text-zinc-300 space-y-4 text-base"><p>La Desviación Estándar (σ) de **{stdDev.toFixed(2)}** mide la dispersión. Un valor **bajo** es ideal (rebaño consistente).</p><div className="bg-black/30 p-4 rounded-lg text-center"><p className="text-sm uppercase text-zinc-400">Rebaño dentro de 1σ</p><p className="text-4xl font-bold text-brand-orange my-1">{pageData.consistency.percentage.toFixed(0)}%</p><p className="text-sm text-zinc-400">Cercanía al promedio de <span className="font-bold text-white">{mean.toFixed(2)} Kg</span>.</p></div></div>
            </Modal>
            <Modal isOpen={activeModal === 'rango'} onClose={() => setActiveModal(null)} title="Extremos de Producción del Día">
                 <div className="space-y-4">
                     {pageData.topPerformer && <div className="bg-green-900/40 border border-green-500/50 rounded-2xl p-4"><h3 className="font-semibold text-brand-green mb-2">Producción Máxima</h3><MilkingAnimalRowWrapper animal={pageData.topPerformer} onSelectAnimal={() => { setActiveModal(null); onSelectAnimal(pageData.topPerformer!.id); }} onOpenActions={handleOpenActions} isNewEntry={pageData.newAnimalIds.has(pageData.topPerformer.id)} /></div>}
                     {pageData.bottomPerformer && <div className="bg-red-900/40 border border-red-500/50 rounded-2xl p-4"><h3 className="font-semibold text-brand-red mb-2">Producción Mínima</h3><MilkingAnimalRowWrapper animal={pageData.bottomPerformer} onSelectAnimal={() => { setActiveModal(null); onSelectAnimal(pageData.bottomPerformer!.id); }} onOpenActions={handleOpenActions} isNewEntry={pageData.newAnimalIds.has(pageData.bottomPerformer.id)} /></div>}
                 </div>
            </Modal>
            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="¿Qué es el Análisis del Ordeño?">
                <div className="text-zinc-300 space-y-4 text-base"><p>Clasifica animales (Pobre, Promedio, Sobresaliente) usando la media (μ) y desviación estándar (σ).</p><div><h4 className="font-semibold text-white mb-1">Ponderado a DEL (<Sparkles size={12} className="inline-block mb-0.5"/>)</h4><p className="text-sm">Activa este cálculo para dar más valor a la producción temprana (persistencia).</p></div></div>
            </Modal>
            <Modal isOpen={isScoreInfoModalOpen} onClose={() => setIsScoreInfoModalOpen(false)} title="¿Qué es el Score Ponderado?">
                <div className="text-zinc-300 space-y-4 text-base"><p>Ajusta la producción para premiar la **persistencia lechera**.</p><div><h4 className="font-semibold text-white mb-1">Fórmula</h4><div className="bg-black/30 p-3 rounded-lg text-sm font-mono text-center text-orange-300">Score = Kg × (1 + ((DEL - 50) / (DEL + 50)))</div></div><p className="pt-2 border-t border-zinc-700/80 text-sm">2 Kg en día **200** valen más que 2 Kg en día 40.</p></div>
            </Modal>

            {trendModalAnimal && <Modal isOpen={!!trendModalAnimal} onClose={() => setTrendModalAnimal(null)} title={`Tendencia de ${formatAnimalDisplay(trendModalAnimal)}`}>
                <TrendModalContent animalId={trendModalAnimal.id} />
            </Modal>}

            <ExitingAnimalsModal isOpen={isExitingAnimalsModalOpen} onClose={() => setIsExitingAnimalsModalOpen(false)} animalIds={Array.from(pageData.exitingAnimalIds)} onSelectAnimal={onSelectAnimal}/>
            <ActionSheetModal isOpen={isActionSheetOpen} onClose={() => setIsActionSheetOpen(false)} title={`Acciones para ${formatAnimalDisplay(actionSheetAnimal)}`} actions={getActionsForAnimal(actionSheetAnimal)}/>
             {activeModal === 'milkWeighing' && actionSheetAnimal && ( <AddMilkWeighingModal animal={actionSheetAnimal} onCancel={closeModal} onSaveSuccess={closeModal}/> )}
            {currentDate && <DeleteSessionModal isOpen={isDeleteSessionModalOpen} onClose={() => setIsDeleteSessionModalOpen(false)} onConfirm={handleDeleteCurrentSession} dateToDelete={currentDate}/>}
        </>
    );
}