// src/pages/LactationProfilePage.tsx

import { useState, useMemo } from 'react';
// Imports necesarios de recharts (LineChart/Line se usan en el Modal, AreaChart/Area en ambos)
import { XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { LactationCycle, useAnimalData } from '../hooks/useAnimalData';
// ComparisonResult sí se usa en useComparativeData
import { useComparativeData, ComparisonRequest, ComparisonTargetType } from '../hooks/useComparativeData';
import { ArrowLeft, Droplet, TrendingUp, CalendarDays, Repeat, CalendarCheck2, Wind, Archive, FileText, BarChart2, Loader2, XCircle, ChevronRight, PlusCircle, AlertTriangle, Trash2 } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { ParturitionModal } from '../components/modals/ParturitionModal';
import { useData } from '../context/DataContext';
import { calculateDEL } from '../utils/calculations';
import type { PageState } from '../types/navigation';
// --- CORRECCIÓN: Se importa solo el componente HistoricalLactationChart ---
import { HistoricalLactationChart } from '../components/charts/HistoricalLactationChart';
// --- CORRECCIÓN: Eliminada la importación de 'ComparisonData' de HistoricalLactationChart ---
// import type { ComparisonData } from '../components/charts/HistoricalLactationChart'; // <-- LÍNEA ELIMINADA
import { ComparativeMetricsDisplay } from '../components/ui/ComparativeMetricsDisplay';
// src/utils/formatting.ts (Example)
import { Animal, Father, Parturition } from '../db/local'; // Adjust import as needed


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
            <div className="bg-c-surface-2/80 backdrop-blur-md p-3 rounded-lg border border-c-border-strong text-c-text shadow-xl">
                <p className="label text-c-text-muted text-sm font-medium mb-1">DEL: {label}</p>
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
    const { animals, parturitions, weighings, startDryingProcess, setLactationAsDry, addParturition, deleteParturition } = useData();
    const { allLactations, parturitionIntervals, lastWeighingDate, isLoading } = useAnimalData(animalId);

    const todayStr = new Date().toISOString().split('T')[0];
    const [isCurveModalOpen, setIsCurveModalOpen] = useState(false);
    const [modalLactationData, setModalLactationData] = useState<LactationCycle | null>(null);
    // Crear lactancia (parto provisional) y completar parto provisional.
    const [isCreateOpen, setCreateOpen] = useState(false);
    const [createDate, setCreateDate] = useState(todayStr);
    const [createError, setCreateError] = useState('');
    const [partoModal, setPartoModal] = useState<{ date: string; id: string } | null>(null);
    const [deleteLactPart, setDeleteLactPart] = useState<Parturition | null>(null);

    // Parto de cada lactancia (para detectar provisionales) indexado por fecha.
    const parturitionByDate = useMemo(() => {
        const m = new Map<string, Parturition>();
        parturitions.filter(p => p.goatId === animalId).forEach(p => m.set(p.parturitionDate, p));
        return m;
    }, [parturitions, animalId]);

    const partDatesAsc = useMemo(() => [...parturitionByDate.keys()].sort(), [parturitionByDate]);

    // ¿Cuántos pesajes EXISTENTES quedarían dentro de la ventana de la lactancia
    // que se va a crear? (esos se "moverían" a la nueva lactancia). Sirve para
    // avisar antes de crear y evitar sorpresas.
    const createAbsorbedCount = useMemo(() => {
        if (!createDate) return 0;
        const nextParto = partDatesAsc.find(d => d > createDate);
        return weighings.filter(w => w.goatId === animalId && w.date >= createDate && (!nextParto || w.date < nextParto)).length;
    }, [createDate, partDatesAsc, weighings, animalId]);

    const handleDeleteLactation = async () => {
        if (!deleteLactPart) return;
        await deleteParturition(deleteLactPart.id);
        setDeleteLactPart(null);
    };

    const handleCreateLactation = async () => {
        if (!createDate) { setCreateError('Elige la fecha del parto.'); return; }
        if (createDate > todayStr) { setCreateError('La fecha no puede ser futura.'); return; }
        if (parturitionByDate.has(createDate)) { setCreateError('Ya existe una lactancia con esa fecha.'); return; }
        setCreateError('');
        await addParturition({
            goatId: animalId, parturitionDate: createDate, provisional: true,
            sireId: '', offspringCount: 0, parturitionType: 'Simple', parturitionOutcome: 'Normal', liveOffspring: [],
        });
        setCreateOpen(false);
    };
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
    if (isLoading) { return <div className="text-center p-10"><h1 className="text-2xl text-c-text-muted">Cargando perfil...</h1></div>; }


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
            isActive ? 'bg-amber-500 text-black font-semibold' : 'bg-c-surface-2/50 text-c-text-strong hover:bg-c-surface-2'
        } ${ringClass}`;
    };

    const isZoomActive = highlightedLactationDate !== null;

    return (
        <>
            <div className="w-full max-w-4xl mx-auto space-y-4 animate-fade-in px-4 pb-12">
                <header className="flex items-center pt-8 pb-4 sticky top-0 z-10 bg-c-surface/80 backdrop-blur-md -mx-4 px-4 border-b border-c-border/50 mb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-c-text-muted hover:text-c-text transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow">
                        <h1 className="text-3xl font-bold tracking-tight text-c-text-strong">{animalId}</h1>
                        <p className="text-lg text-c-text-muted">Perfil de Lactancia</p>
                    </div>
                    <button onClick={() => navigateTo({ name: 'rebano-profile', animalId })} className="p-2 -mr-2 text-c-text-muted hover:text-c-text transition-colors" title="Ir a la ficha general del animal"><FileText size={24} /></button>
                </header>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-3 border border-c-border text-left">
                        <div className="flex items-center space-x-2 text-c-text-muted font-semibold mb-1 text-xs uppercase"><Droplet size={14} /><span>Promedio Actual</span></div>
                        <p className="text-2xl font-bold text-c-text">{currentLactation?.averageProduction.toFixed(2) || 'N/A'} <span className="text-lg text-c-text-muted">Kg</span></p>
                    </div>
                    <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-3 border border-c-border text-left">
                        <div className="flex items-center space-x-2 text-c-text-muted font-semibold mb-1 text-xs uppercase"><TrendingUp size={14} /><span>Pico Prod. Actual</span></div>
                        <p className="text-2xl font-bold text-c-text">{currentLactation?.peakProduction.kg.toFixed(2) || 'N/A'} <span className="text-lg text-c-text-muted">Kg</span></p>
                    </div>
                    <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-3 border border-c-border text-left">
                        <div className="flex items-center space-x-2 text-c-text-muted font-semibold mb-1 text-xs uppercase"><CalendarDays size={14} /><span>DEL Actual</span></div>
                        <p className="text-2xl font-bold text-c-text">{currentDEL}</p>
                    </div>
                    <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-3 border border-c-border text-left">
                        <div className="flex items-center space-x-2 text-c-text-muted font-semibold mb-1 text-xs uppercase"><Repeat size={14} /><span>Últ. Int. Partos</span></div>
                        <p className="text-2xl font-bold text-c-text">{latestInterval || 'N/A'} <span className="text-lg text-c-text-muted">días</span></p>
                    </div>
                    <button
                        onClick={() => openLactationModal(currentLactation)}
                        disabled={!currentLactation || currentLactation.weighings.length === 0}
                        className="bg-c-surface backdrop-blur-xl rounded-2xl p-3 border border-c-border text-left hover:border-brand-amber transition-colors col-span-2 md:col-span-1 disabled:opacity-50 disabled:cursor-not-allowed relative group"
                    >
                       <div className="flex items-center space-x-2 text-c-text-muted font-semibold mb-1 text-xs uppercase"><CalendarCheck2 size={14} /><span>Últ. Pesaje</span></div>
                        <p className="text-2xl font-bold text-c-text">{lastWeighingKg?.toFixed(2) ?? 'N/A'} <span className="text-lg text-c-text-muted">Kg</span></p>
                        <p className="text-xs text-c-text-faint mt-0.5">{lastWeighingDate ? new Date(lastWeighingDate + 'T00:00:00').toLocaleDateString() : ''}</p>
                        <div className="absolute top-3 right-3 text-c-text-faint group-hover:text-brand-amber transition-colors">
                            <BarChart2 size={18} />
                        </div>
                    </button>
                </div>

                {/* Lactancias del animal (encima del gráfico). Tocar → lista de pesajes. */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-c-text-muted font-semibold text-xs uppercase">Lactancias ({allLactations.length})</h3>
                        <button onClick={() => { setCreateDate(todayStr); setCreateError(''); setCreateOpen(true); }} className="flex items-center gap-1 text-sm font-bold text-c-accent-sky">
                            <PlusCircle size={16} /> Crear lactancia
                        </button>
                    </div>
                    {allLactations.length === 0 && (
                        <p className="text-xs text-c-text-faint px-1 py-2">
                            Este animal no tiene lactancias. Crea una (con la fecha del parto) para empezar a cargar pesajes.
                        </p>
                    )}
                    {allLactations.map((lact, index) => {
                        const n = index + 1; // Lactancia 1, 2, 3…
                        const year = new Date(lact.parturitionDate + 'T00:00:00Z').getUTCFullYear();
                        const hasWeighings = lact.weighings.length > 0;
                        const isCurrent = index === allLactations.length - 1 &&
                            (currentLactationData?.status === 'activa' || currentLactationData?.status === 'en-secado');
                        const part = parturitionByDate.get(lact.parturitionDate);
                        const isProvisional = !!part?.provisional;
                        return (
                            <div key={lact.parturitionDate} className="space-y-1">
                                <button
                                    onClick={() => navigateTo({ name: 'lactation-weighings', animalId, parturitionDate: lact.parturitionDate })}
                                    className="w-full flex items-center gap-3 bg-c-surface border border-c-border rounded-xl px-3 py-2.5 text-left hover:bg-c-surface-2 transition-colors"
                                >
                                    <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-500 flex items-center justify-center font-bold flex-shrink-0">{n}</div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-c-text-strong">Lactancia {n}</span>
                                            <span className="text-xs text-c-text-faint">{year}</span>
                                            {isCurrent && <span className="text-[10px] font-bold uppercase bg-c-accent/15 text-c-accent px-1.5 py-0.5 rounded">Actual</span>}
                                        </div>
                                        <p className="text-xs text-c-text-muted truncate">
                                            {hasWeighings
                                                ? `Prom ${lact.averageProduction.toFixed(2)} · Pico ${lact.peakProduction.kg.toFixed(2)} Kg · ${lact.totalDays} días · ${lact.weighings.length} pesajes`
                                                : 'Sin pesajes registrados'}
                                        </p>
                                    </div>
                                    <ChevronRight size={18} className="text-c-text-faint flex-shrink-0" />
                                </button>
                                {isProvisional && part && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setPartoModal({ date: part.parturitionDate, id: part.id })}
                                            className="flex-1 flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-lg px-3 py-2 text-left hover:bg-amber-500/15 transition-colors"
                                        >
                                            <AlertTriangle size={15} className="flex-shrink-0" />
                                            <span className="text-xs font-semibold flex-1">Falta cargar parto — toca para registrarlo</span>
                                            <ChevronRight size={15} className="flex-shrink-0" />
                                        </button>
                                        <button
                                            onClick={() => setDeleteLactPart(part)}
                                            title="Eliminar esta lactancia"
                                            className="p-2 rounded-lg text-c-text-faint hover:text-red-400 hover:bg-red-500/10 border border-c-border flex-shrink-0"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-4 border border-c-border relative">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-c-border pb-2 mb-4 gap-2">
                        <h3 className="text-c-text-muted font-semibold text-xs uppercase">Historial de Lactancias</h3>
                        <div className="flex items-center space-x-2 self-end sm:self-center">
                            {isZoomActive && (
                                <button
                                    onClick={() => handleLactationClick(null)}
                                    className="text-xs font-semibold text-c-text-muted hover:text-c-text animate-fade-in flex items-center gap-1 bg-c-surface-2/50 px-2 py-1 rounded-md"
                                    title="Quitar zoom"
                                >
                                    <XCircle size={14} />
                                    Ver Todo
                                </button>
                            )}
                            <span className="text-xs font-semibold text-c-text-strong">Comparar:</span>
                            <button onClick={handleCompareToggle} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isComparing ? 'bg-amber-500' : 'bg-c-surface-2'}`}>
                                <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isComparing ? 'translate-x-5' : 'translate-x-0'}`}/>
                            </button>
                        </div>
                    </div>

                    {isComparing && (
                        <div className="flex flex-wrap items-center gap-2 mb-4 animate-fade-in p-2 bg-c-surface-2 rounded-lg">
                            <span className="text-xs font-semibold text-c-text-strong w-full sm:w-auto">Grupos:</span>
                            <button onClick={() => handleComparisonSelect('PRIMIPARAS_AVG')} className={getCompareButtonStyle('PRIMIPARAS_AVG')}>vs Primíparas</button>
                            <button onClick={() => handleComparisonSelect('MULTIPARAS_AVG')} className={getCompareButtonStyle('MULTIPARAS_AVG')}>vs Multíparas</button>
                            <button onClick={() => handleComparisonSelect('HERD_AVG')} className={getCompareButtonStyle('HERD_AVG')}>vs Rebaño</button>
                            <button onClick={() => handleComparisonSelect('PEERS_AVG')} className={getCompareButtonStyle('PEERS_AVG')}>vs Pares</button>
                            <span className="text-xs font-semibold text-c-text-strong w-full sm:w-auto pt-2 sm:pt-0">Familia:</span>
                            <button onClick={() => handleComparisonSelect('DAM')} className={getCompareButtonStyle('DAM')} disabled={!currentAnimal?.motherId}>Madre</button>
                            <button onClick={() => handleComparisonSelect('PROGENY_AVG')} className={getCompareButtonStyle('PROGENY_AVG')}>Prom. Hijas</button>
                            <span className="text-xs font-semibold text-c-text-strong w-full sm:w-auto pt-2 sm:pt-0">Propias:</span>
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
                        <div className="absolute inset-0 flex items-center justify-center bg-c-surface/60 backdrop-blur-sm rounded-xl text-c-text">
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

                {currentLactationData?.id && currentLactationData.status !== 'finalizada' && (
                     <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-4 border border-c-border">
                        <h3 className="text-c-text-muted font-semibold text-xs uppercase mb-3">Gestión de Lactancia Actual</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {currentLactationData.status === 'activa' && (
                                <button onClick={() => startDryingProcess(currentLactationData.id!)} className="w-full flex items-center justify-center space-x-2 bg-c-accent-sky hover:bg-c-accent-sky/90 text-white font-semibold py-3 px-4 rounded-xl transition-colors"><Wind size={20} /><span>Iniciar Proceso de Secado</span></button>
                            )}
                            {(currentLactationData.status === 'activa' || currentLactationData.status === 'en-secado') && (
                                <button onClick={() => setLactationAsDry(currentLactationData.id!)} className="w-full flex items-center justify-center space-x-2 bg-c-surface-2 hover:bg-c-surface-3 text-c-text-strong font-semibold py-3 px-4 rounded-xl transition-colors"><Archive size={20} /><span>Declarar Lactancia como Seca</span></button>
                            )}
                            {currentLactationData.status === 'seca' && (
                                <div className="w-full text-center p-3 bg-c-surface-2 rounded-xl"><p className="font-semibold text-green-400">Esta lactancia ha finalizado.</p></div>
                            )}
                        </div>
                        {currentLactationData.status === 'en-secado' && (
                             <p className="text-center text-xs text-c-text-muted mt-2">El animal está en su período de secado.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Crear lactancia (parto provisional) */}
            <Modal isOpen={isCreateOpen} onClose={() => setCreateOpen(false)} title="Crear lactancia">
                <div className="space-y-4">
                    <p className="text-sm text-c-text-muted">
                        Ingresa la fecha del parto que originó esta lactancia. Podrás cargar los pesajes de inmediato; si aún no registras los datos completos del parto, la lactancia quedará marcada como «Falta cargar parto».
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-c-text-muted mb-1">Fecha del parto</label>
                        <input type="date" value={createDate} max={todayStr} onChange={e => setCreateDate(e.target.value)}
                            className="w-full bg-c-surface-2 text-c-text p-3 rounded-xl border border-c-border focus:outline-none focus:ring-2 focus:ring-c-accent-sky" />
                    </div>
                    {createAbsorbedCount > 0 && (
                        <div className="flex gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
                            <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-amber-700 leading-relaxed">
                                Hay <b>{createAbsorbedCount} pesaje(s)</b> con fecha igual o posterior al {new Date(createDate + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })} que <b>pasarán a esta nueva lactancia</b> (dejarán de contar en la lactancia anterior). No se borra ningún pesaje; solo se reagrupan por la nueva fecha de parto.
                            </p>
                        </div>
                    )}
                    {createError && <p className="text-sm text-red-500 text-center">{createError}</p>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setCreateOpen(false)} className="px-5 py-2 bg-c-surface-2 hover:bg-c-surface-3 font-semibold rounded-lg text-c-text">Cancelar</button>
                        <button onClick={handleCreateLactation} className={`px-5 py-2 text-white font-bold rounded-lg ${createAbsorbedCount > 0 ? 'bg-amber-600 hover:bg-amber-700' : 'bg-c-accent-sky hover:bg-blue-600'}`}>
                            {createAbsorbedCount > 0 ? 'Entiendo, crear' : 'Crear'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Eliminar lactancia (parto provisional) */}
            <Modal isOpen={!!deleteLactPart} onClose={() => setDeleteLactPart(null)} title="Eliminar lactancia">
                <div className="space-y-4">
                    <p className="text-c-text-muted text-sm leading-relaxed">
                        Se eliminará esta lactancia{deleteLactPart ? ` (parto del ${new Date(deleteLactPart.parturitionDate + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })})` : ''}.
                        Los pesajes que caían en su rango <b>volverán a la lactancia anterior</b>. No se elimina ningún pesaje.
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <button onClick={() => setDeleteLactPart(null)} className="px-5 py-2 bg-c-surface-2 hover:bg-c-surface-3 font-semibold rounded-lg text-c-text">Cancelar</button>
                        <button onClick={handleDeleteLactation} className="px-5 py-2 bg-brand-red hover:bg-red-700 text-white font-bold rounded-lg">Eliminar lactancia</button>
                    </div>
                </div>
            </Modal>

            {/* Completar parto provisional */}
            {partoModal && (
                <ParturitionModal
                    isOpen={true}
                    onClose={() => setPartoModal(null)}
                    motherId={animalId}
                    defaultDate={partoModal.date}
                    replaceProvisionalId={partoModal.id}
                />
            )}

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
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.2)" vertical={false} />
                                <XAxis
                                    dataKey="del"
                                    type="number"
                                    domain={['dataMin', 'dataMax']}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#94a3b8' }}
                                />
                                <YAxis
                                    orientation="right"
                                    tickFormatter={(value) => `${value.toFixed(1)} Kg`}
                                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={{ stroke: '#94a3b8' }}
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
                    <p className="text-center text-c-text-muted py-8">No hay datos para mostrar la curva seleccionada.</p>
                )}
            </Modal>
        </>
    );
}