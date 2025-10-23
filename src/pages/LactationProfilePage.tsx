// src/pages/LactationProfilePage.tsx

import { useState, useMemo } from 'react';
// Imports necesarios de recharts (LineChart/Line se usan en el Modal, AreaChart/Area en ambos)
import { XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { LactationCycle, useAnimalData } from '../hooks/useAnimalData';
// ComparisonResult sí se usa en useComparativeData
import { useComparativeData, ComparisonRequest, ComparisonTargetType } from '../hooks/useComparativeData';
import { ArrowLeft, Droplet, TrendingUp, CalendarDays, Repeat, CalendarCheck2, Wind, Archive, FileText, BarChart2, Loader2, XCircle } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { calculateDEL } from '../utils/calculations';
import type { PageState } from '../types/navigation';
// --- CORRECCIÓN: Se importa solo el componente HistoricalLactationChart ---
import { HistoricalLactationChart } from '../components/charts/HistoricalLactationChart';
// --- CORRECCIÓN: Eliminada la importación de 'ComparisonData' de HistoricalLactationChart ---
// import type { ComparisonData } from '../components/charts/HistoricalLactationChart'; // <-- LÍNEA ELIMINADA
import { LactationSummaryCard } from '../components/ui/LactationSummaryCard';
import { ComparativeMetricsDisplay } from '../components/ui/ComparativeMetricsDisplay';
// src/utils/formatting.ts (Example)
import { Animal, Father } from '../db/local'; // Adjust import as needed


export const formatAnimalDisplay = (animal: Animal | Father | { id: string, name?: string } | undefined | null): string => {
    if (!animal) return 'N/A';
    if (animal.name && animal.name.trim() !== '') {
        return `${animal.id} (${animal.name})`;
    }
    return animal.id;
};
// Tooltip específico para el modal (sin cambios)
const CurrentCurveTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-zinc-800/80 backdrop-blur-md p-3 rounded-lg border border-zinc-700 text-white shadow-xl">
                <p className="label text-zinc-400 text-sm font-medium mb-1">DEL: {label}</p>
                {/* Asegurarse de que el color funcione si no hay 'stroke' (e.g., Area) */}
                <p className="font-semibold text-base" style={{ color: payload[0].stroke || payload[0].payload?.stroke || payload[0].fill }}>
                    {payload[0].name}: {payload[0].value.toFixed(2)} Kg
                </p>
            </div>
        );
    }
    return null;
};


interface LactationProfilePageProps {
    animalId: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
}

export default function LactationProfilePage({ animalId, onBack, navigateTo }: LactationProfilePageProps) {
    // --- 1. TODOS LOS HOOKS SE LLAMAN PRIMERO, DE FORMA INCONDICIONAL ---
    const { animals, parturitions, weighings, startDryingProcess, setLactationAsDry } = useData();
    const { allLactations, parturitionIntervals, lastWeighingDate, isLoading } = useAnimalData(animalId);

    const [isCurveModalOpen, setIsCurveModalOpen] = useState(false);
    const [modalLactationData, setModalLactationData] = useState<LactationCycle | null>(null);
    const [isComparing, setIsComparing] = useState(false);
    const [highlightedLactationDate, setHighlightedLactationDate] = useState<string | null>(null); // Estado para Zoom/Resaltado

    const currentAnimal = useMemo(() => animals.find(a => a.id === animalId) || null, [animals, animalId]);

    // Estado para la petición de comparación (incluye DEL max)
    const [comparisonRequest, setComparisonRequest] = useState<ComparisonRequest>({
        type: null,
        animal: currentAnimal,
        highlightedLactationDEL: undefined,
    });

    const { comparativeData, isLoading: isComparativeLoading } = useComparativeData(
        comparisonRequest, animals, parturitions, weighings
    );

    // --- 2. MEMOS (calculados antes del check isLoading) ---
    const currentLactationData = useMemo(() => {
        if (allLactations.length === 0) return null;
        const lastLactationCycle = allLactations[allLactations.length - 1];
        const correspondingParturition = parturitions.find(p =>
            p.parturitionDate === lastLactationCycle.parturitionDate && p.goatId === animalId
        );
        return { ...lastLactationCycle, id: correspondingParturition?.id, status: correspondingParturition?.status };
    }, [allLactations, parturitions, animalId]);

    const currentDEL = useMemo(() => {
       if (!currentLactationData || currentLactationData.status === 'seca' || currentLactationData.status === 'finalizada') return 'N/A';
        const referenceDate = (currentLactationData.status !== 'activa' && lastWeighingDate)
            ? lastWeighingDate
            : new Date().toISOString().split('T')[0];
        return calculateDEL(currentLactationData.parturitionDate, referenceDate);
    }, [currentLactationData, lastWeighingDate]);

    const lastWeighingKg = useMemo(() => {
        if (!currentLactationData || currentLactationData.weighings.length === 0) return null;
        const sortedWeighings = [...currentLactationData.weighings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return sortedWeighings[0].kg;
    }, [currentLactationData]);

    // --- CORRECCIÓN: Eliminada la anotación de tipo ': ComparisonData | null' ---
    const chartComparisonData = useMemo(() => { // TypeScript inferirá el tipo
        if (!isComparing || !comparativeData || isComparativeLoading || comparativeData.curve.length === 0) {
            return null;
        }
        return {
            name: comparativeData.name,
            curve: comparativeData.curve
        };
    }, [isComparing, comparativeData, isComparativeLoading]);

    // --- CORRECCIÓN: Movidos ANTES del 'if (isLoading)' ---
    const currentLactation = useMemo(() => allLactations.length > 0 ? allLactations[allLactations.length - 1] : null, [allLactations]);
    const latestInterval = useMemo(() => parturitionIntervals.length > 0 ? parturitionIntervals[parturitionIntervals.length - 1].days : 0, [parturitionIntervals]);
    const previousLactations = useMemo(() => {
        if (allLactations.length <= 1) return [];
        return allLactations.slice(0, -1).reverse();
    }, [allLactations]);

    // --- 3. RETORNO TEMPRANO ---
    if (isLoading) { return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando perfil...</h1></div>; }


    // --- 4. RESTO DE LA LÓGICA Y HANDLERS ---
    // Esta variable se calcula DESPUÉS del isLoading check, porque no es un hook
    const isCurrentAnimalPrimipara = allLactations.length === 1;

    // Función para calcular max DEL (usada en handlers)
    const getMaxDELForLactation = (parturitionDate: string | null): number | undefined => {
         if (!parturitionDate) return undefined;
         const lactation = allLactations.find(l => l.parturitionDate === parturitionDate);
         if (!lactation || lactation.lactationCurve.length === 0) return 0;
         return Math.max(...lactation.lactationCurve.map(p => p.del), 0);
    };

    // Handler para Zoom/Clic en gráfico
    const handleLactationClick = (parturitionDate: string | null) => {
        setHighlightedLactationDate(parturitionDate);
        const newMaxDEL = getMaxDELForLactation(parturitionDate);
        if (parturitionDate) {
            setIsComparing(true);
            setComparisonRequest(prev => ({ ...prev, animal: currentAnimal, highlightedLactationDEL: newMaxDEL }));
        } else {
            setIsComparing(false);
            setComparisonRequest({ type: null, animal: null, highlightedLactationDEL: undefined });
        }
    };

    // Handler para Toggle Comparar
    const handleCompareToggle = () => {
        const newIsComparing = !isComparing;
        setIsComparing(newIsComparing);
        if (newIsComparing) {
            let dateToHighlight = highlightedLactationDate;
            if (!dateToHighlight && currentLactation) {
                dateToHighlight = currentLactation.parturitionDate;
                setHighlightedLactationDate(dateToHighlight);
            }
            const newMaxDEL = getMaxDELForLactation(dateToHighlight);
            setComparisonRequest(prev => ({ ...prev, animal: currentAnimal, highlightedLactationDEL: newMaxDEL }));
        } else {
            setHighlightedLactationDate(null);
            setComparisonRequest({ type: null, animal: null, highlightedLactationDEL: undefined });
        }
    };

    // Handler para Selección de Tipo de Comparación
    const handleComparisonSelect = (type: ComparisonTargetType, index?: number) => {
        setComparisonRequest(prev => {
            const newType = prev.type === type && prev.specificLactationIndex === index ? null : type;
            let dateToHighlight = highlightedLactationDate;
            if (newType) {
                 setIsComparing(true);
                 if (!dateToHighlight && currentLactation) {
                     dateToHighlight = currentLactation.parturitionDate;
                     setHighlightedLactationDate(dateToHighlight);
                 }
            }
            const newMaxDEL = getMaxDELForLactation(dateToHighlight);
            return {
                ...prev,
                type: newType,
                animal: currentAnimal,
                specificLactationIndex: type === 'SPECIFIC_LACTATION' ? index : undefined,
                highlightedLactationDEL: newMaxDEL
            };
        });
    };

    const openLactationModal = (lactation: LactationCycle | null) => {
        if (lactation && lactation.lactationCurve.length > 0) {
            setModalLactationData(lactation);
            setIsCurveModalOpen(true);
        }
    };

    const getCompareButtonStyle = (type: ComparisonTargetType, index?: number) => {
        const isActive = comparisonRequest.type === type && (type !== 'SPECIFIC_LACTATION' || comparisonRequest.specificLactationIndex === index);
        let ringClass = '';
        if (isCurrentAnimalPrimipara && type === 'PRIMIPARAS_AVG') ringClass = 'ring-2 ring-amber-400';
        if (!isCurrentAnimalPrimipara && type === 'MULTIPARAS_AVG') ringClass = 'ring-2 ring-amber-400';
        return `px-2 py-1 text-xs rounded-md transition-colors ${
            isActive ? 'bg-amber-500 text-black font-semibold' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50'
        } ${ringClass}`;
    };

    const isZoomActive = highlightedLactationDate !== null;

    return (
        <>
            <div className="w-full max-w-4xl mx-auto space-y-4 animate-fade-in px-4 pb-12">
                <header className="flex items-center pt-8 pb-4 sticky top-0 z-10 bg-brand-dark/80 backdrop-blur-md -mx-4 px-4 border-b border-brand-border/50 mb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        <h1 className="text-3xl font-bold tracking-tight text-white">{animalId}</h1>
                        <p className="text-lg text-zinc-400">Perfil de Lactancia</p>
                    </div>
                    <button onClick={() => navigateTo({ name: 'rebano-profile', animalId })} className="p-2 -mr-2 text-zinc-400 hover:text-white transition-colors" title="Ir a la ficha general del animal"><FileText size={24} /></button>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left">
                        <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><Droplet size={14} /><span>Promedio Actual</span></div>
                        <p className="text-2xl font-bold text-white">{currentLactation?.averageProduction.toFixed(2) || 'N/A'} <span className="text-lg text-zinc-400">Kg</span></p>
                    </div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left">
                        <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><TrendingUp size={14} /><span>Pico Prod. Actual</span></div>
                        <p className="text-2xl font-bold text-white">{currentLactation?.peakProduction.kg.toFixed(2) || 'N/A'} <span className="text-lg text-zinc-400">Kg</span></p>
                    </div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left">
                        <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><CalendarDays size={14} /><span>DEL Actual</span></div>
                        <p className="text-2xl font-bold text-white">{currentDEL}</p>
                    </div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left">
                        <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><Repeat size={14} /><span>Últ. Int. Partos</span></div>
                        <p className="text-2xl font-bold text-white">{latestInterval || 'N/A'} <span className="text-lg text-zinc-400">días</span></p>
                    </div>
                    <button
                        onClick={() => openLactationModal(currentLactation)}
                        disabled={!currentLactation || currentLactation.weighings.length === 0}
                        className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left hover:border-brand-amber transition-colors col-span-2 md:col-span-1 disabled:opacity-50 disabled:cursor-not-allowed relative group"
                    >
                       <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><CalendarCheck2 size={14} /><span>Últ. Pesaje</span></div>
                        <p className="text-2xl font-bold text-white">{lastWeighingKg?.toFixed(2) ?? 'N/A'} <span className="text-lg text-zinc-400">Kg</span></p>
                        <p className="text-xs text-zinc-500 mt-0.5">{lastWeighingDate ? new Date(lastWeighingDate + 'T00:00:00').toLocaleDateString() : ''}</p>
                        <div className="absolute top-3 right-3 text-zinc-500 group-hover:text-brand-amber transition-colors">
                            <BarChart2 size={18} />
                        </div>
                    </button>
                </div>

                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border relative">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-brand-border pb-2 mb-4 gap-2">
                        <h3 className="text-zinc-400 font-semibold text-xs uppercase">Historial de Lactancias</h3>
                        <div className="flex items-center space-x-2 self-end sm:self-center">
                            {isZoomActive && (
                                <button
                                    onClick={() => handleLactationClick(null)}
                                    className="text-xs font-semibold text-zinc-400 hover:text-white animate-fade-in flex items-center gap-1 bg-zinc-700/50 px-2 py-1 rounded-md"
                                    title="Quitar zoom"
                                >
                                    <XCircle size={14} />
                                    Ver Todo
                                </button>
                            )}
                            <span className="text-xs font-semibold text-zinc-300">Comparar:</span>
                            <button onClick={handleCompareToggle} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isComparing ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                                <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isComparing ? 'translate-x-5' : 'translate-x-0'}`}/>
                            </button>
                        </div>
                    </div>

                    {isComparing && (
                        <div className="flex flex-wrap items-center gap-2 mb-4 animate-fade-in p-2 bg-black/20 rounded-lg">
                            <span className="text-xs font-semibold text-zinc-300 w-full sm:w-auto">Grupos:</span>
                            <button onClick={() => handleComparisonSelect('PRIMIPARAS_AVG')} className={getCompareButtonStyle('PRIMIPARAS_AVG')}>vs Primíparas</button>
                            <button onClick={() => handleComparisonSelect('MULTIPARAS_AVG')} className={getCompareButtonStyle('MULTIPARAS_AVG')}>vs Multíparas</button>
                            <button onClick={() => handleComparisonSelect('HERD_AVG')} className={getCompareButtonStyle('HERD_AVG')}>vs Rebaño</button>
                            <button onClick={() => handleComparisonSelect('PEERS_AVG')} className={getCompareButtonStyle('PEERS_AVG')}>vs Pares</button>
                            <span className="text-xs font-semibold text-zinc-300 w-full sm:w-auto pt-2 sm:pt-0">Familia:</span>
                            <button onClick={() => handleComparisonSelect('DAM')} className={getCompareButtonStyle('DAM')} disabled={!currentAnimal?.motherId}>Madre</button>
                            <button onClick={() => handleComparisonSelect('PROGENY_AVG')} className={getCompareButtonStyle('PROGENY_AVG')}>Prom. Hijas</button>
                            <span className="text-xs font-semibold text-zinc-300 w-full sm:w-auto pt-2 sm:pt-0">Propias:</span>
                            {previousLactations.map((lact, index) => (
                                <button
                                    key={lact.parturitionDate}
                                    onClick={() => handleComparisonSelect('SPECIFIC_LACTATION', allLactations.length - 2 - index)}
                                    className={getCompareButtonStyle('SPECIFIC_LACTATION', allLactations.length - 2 - index)}
                                >
                                    vs Lact. #{allLactations.length - 1 - index} ({new Date(lact.parturitionDate).getFullYear()})
                                </button>
                            ))}
                        </div>
                    )}
                    <HistoricalLactationChart
                        lactationsData={allLactations}
                        comparisonData={chartComparisonData} // Pasamos el resultado directo del hook
                        highlightedLactationDate={highlightedLactationDate}
                        onLactationClick={handleLactationClick}
                    />
                    {isComparativeLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl text-white">
                            <Loader2 className="animate-spin mr-2" /> Calculando comparación...
                        </div>
                    )}
                    {isComparing && comparativeData && currentLactation && !isComparativeLoading && (
                        <ComparativeMetricsDisplay
                            lactationA={allLactations.find(l => l.parturitionDate === highlightedLactationDate) || currentLactation}
                            comparisonB={comparativeData} // Pasamos el resultado directo del hook
                            allParturitions={parturitions}
                            animalId={animalId}
                        />
                    )}
                </div>

                {previousLactations.length > 0 && (
                    <div className="space-y-3 pt-4">
                        <h3 className="text-lg font-semibold text-zinc-300 px-1">Lactancias Anteriores</h3>
                        {previousLactations.map((lact, index) => (
                            <LactationSummaryCard
                                key={lact.parturitionDate}
                                lactationNumber={allLactations.length - 1 - index}
                                lactationData={lact}
                                onClick={() => openLactationModal(lact)}
                            />
                        ))}
                    </div>
                )}

                {currentLactationData?.id && currentLactationData.status !== 'finalizada' && (
                     <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                        <h3 className="text-zinc-400 font-semibold text-xs uppercase mb-3">Gestión de Lactancia Actual</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {currentLactationData.status === 'activa' && (
                                <button onClick={() => startDryingProcess(currentLactationData.id!)} className="w-full flex items-center justify-center space-x-2 bg-blue-600/80 hover:bg-blue-500/80 text-white font-semibold py-3 px-4 rounded-xl transition-colors"><Wind size={20} /><span>Iniciar Proceso de Secado</span></button>
                            )}
                            {(currentLactationData.status === 'activa' || currentLactationData.status === 'en-secado') && (
                                <button onClick={() => setLactationAsDry(currentLactationData.id!)} className="w-full flex items-center justify-center space-x-2 bg-gray-600/80 hover:bg-gray-500/80 text-white font-semibold py-3 px-4 rounded-xl transition-colors"><Archive size={20} /><span>Declarar Lactancia como Seca</span></button>
                            )}
                            {currentLactationData.status === 'seca' && (
                                <div className="w-full text-center p-3 bg-black/20 rounded-xl"><p className="font-semibold text-green-400">Esta lactancia ha finalizado.</p></div>
                            )}
                        </div>
                        {currentLactationData.status === 'en-secado' && (
                             <p className="text-center text-xs text-zinc-400 mt-2">El animal está en su período de secado.</p>
                        )}
                    </div>
                )}
            </div>

            <Modal isOpen={isCurveModalOpen} onClose={() => setIsCurveModalOpen(false)} title={`Curva Lactancia (${modalLactationData ? new Date(modalLactationData.parturitionDate).getFullYear() : 'Actual'}) - ${animalId}`}>
                {modalLactationData ? (
                    <div className="w-full h-[320px] -ml-2 -mr-2">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={modalLactationData.lactationCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorLactation" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#FBBF24" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="#FBBF24" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                                <XAxis
                                    dataKey="del"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                                />
                                <YAxis
                                    orientation="right"
                                    tickFormatter={(value) => `${value.toFixed(1)} Kg`}
                                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                                />
                                <Tooltip content={<CurrentCurveTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="kg"
                                    name={`${animalId} (${new Date(modalLactationData.parturitionDate).getFullYear()})`}
                                    stroke="#FBBF24"
                                    fill="url(#colorLactation)"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, fill: '#FBBF24', stroke: '#FBBF24', strokeWidth: 1 }}
                                    activeDot={{ r: 5, fill: '#FFFFFF', stroke: '#FBBF24', strokeWidth: 2 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className="text-center text-zinc-400 py-8">No hay datos para mostrar la curva seleccionada.</p>
                )}
            </Modal>
        </>
    );
}