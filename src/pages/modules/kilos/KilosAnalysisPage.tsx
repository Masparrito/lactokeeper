// src/pages/modules/kilos/KilosAnalysisPage.tsx
// (COMPLETO Y CORREGIDO: Soluciona error de sintaxis y añade lógica de 'initialDate')

import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../../../context/DataContext';
import { useGdpAnalysis, GdpAnalyzedAnimal, SessionTrend } from '../../../hooks/useGdpAnalysis'; 
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import { ChevronRight, TrendingUp, Sigma, Search, ChevronLeft, ArrowUp, ArrowDown, Sparkles, Minus, FilterX, LogIn, Trash2, Award } from 'lucide-react';
import { GrowthTooltip } from '../../../components/ui/GrowthTooltip';
import { BodyWeighing } from '../../../db/local';
import { useSearch } from '../../../hooks/useSearch'; 
import { DeleteBodyWeighingSessionModal } from '../../../components/modals/DeleteBodyWeighingSessionModal';
import type { PageState } from '../../../types/navigation';

// --- SUB-COMPONENTE: Icono de Tendencia ---
const TrendIcon = ({ trend }: { trend: SessionTrend }) => {
    switch (trend) {
        case 'up':
            return <ArrowUp size={18} className="text-brand-green" />;
        case 'down':
            return <ArrowDown size={18} className="text-brand-red" />;
        case 'stable':
            return <Minus size={18} className="text-zinc-500" />;
        case 'single':
            return <Sparkles size={18} className="text-brand-blue" />;
        default:
            return <Minus size={18} className="text-zinc-500" />;
    }
};

// --- SUB-COMPONENTE: Fila de Animal ---
const AnimalRow = ({ animal, onSelect, isNew }: { 
    animal: GdpAnalyzedAnimal, 
    onSelect: (animal: GdpAnalyzedAnimal) => void,
    isNew: boolean
}) => { 
    const classificationColor = {
        'Sobresaliente': 'bg-brand-green/80',
        'Promedio': 'bg-gray-500/80',
        'Pobre': 'bg-brand-red/80',
        'N/A': 'bg-zinc-700/80'
    };
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    return (
        <button 
            onClick={() => onSelect(animal)} 
            className={`w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border flex justify-between items-center hover:border-brand-green transition-colors min-h-[80px] ${
                animal.isWeaningCandidate ? 'border-yellow-400/80' : 'border-brand-border'
            }`}
        >
            <div className="min-w-0 pr-3">
                <p className="font-mono font-semibold text-base text-white truncate">{animal.id.toUpperCase()}</p>
                {formattedName && (
                  <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                )}
                <div className="text-xs text-zinc-500 mt-1 min-h-[1rem] truncate">
                    {animal.isWeaningCandidate && (
                        <span className="px-1.5 py-0.5 bg-yellow-400/20 text-yellow-300 font-bold rounded mr-2">DESTETE</span>
                    )}
                    <span>{animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'N/A'}</span>
                </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className='text-right'>
                    <p className="font-semibold text-white text-base">
                        {animal.gdp ? `${animal.gdp.toFixed(0)}` : '--'}
                        <span className="text-sm text-zinc-400"> g/día</span>
                    </p>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${classificationColor[animal.classification]}`}>
                        {animal.classification}
                    </span>
                </div>
                {isNew ? (
                    <span title="Primer Pesaje" className="w-6 h-6 flex items-center justify-center rounded-full bg-blue-500/20 text-brand-blue">
                        <LogIn size={16} strokeWidth={2.5}/>
                    </span>
                ) : (
                    <div className="w-6 h-6 flex items-center justify-center">
                        <TrendIcon trend={animal.trend} />
                    </div>
                )}
                <ChevronRight className="text-zinc-600 w-5 h-5" />
            </div>
        </button>
    );
};
// --- FIN AnimalRow ---

const CustomBarLabel = (props: any) => {
    const { x, y, width, value } = props;
    if (value === 0) return null;
    return (
        <text x={x + width / 2} y={y - 5} fill="#fff" textAnchor="middle" fontSize="12px" fontWeight="bold" opacity={0.8}>
            {value}
        </text>
    );
};

// --- Componente de Filtro ---
interface FilterButtonProps {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  color?: 'green' | 'yellow' | 'red' | 'purple' | 'blue' | 'gray';
  isPulsing?: boolean;
  disabled?: boolean;
}
const FilterButton: React.FC<FilterButtonProps> = ({ label, count, isActive, onClick, color = 'gray', isPulsing = false, disabled = false }) => {
    const baseClasses = 'px-4 py-2 rounded-full text-sm font-semibold flex-shrink-0 transition-all duration-150 flex items-center gap-1.5';
    const activeClasses: Record<string, string> = { 
        blue: 'bg-blue-500 text-white', 
        green: 'bg-brand-green text-white', 
        yellow: 'bg-brand-orange text-white', 
        red: 'bg-red-500 text-white',
        purple: 'bg-purple-500 text-white',
        gray: 'bg-zinc-500 text-white'
    };
    const inactiveClasses: Record<string, string> = {
        blue: 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600',
        green: 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600',
        yellow: `bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30 ${isPulsing ? 'animate-pulse' : ''}`, 
        red: 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600',
        purple: 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600',
        gray: 'bg-zinc-700 text-zinc-300 hover:bg-zinc-600'
    };
    const disabledClasses = 'bg-zinc-800 text-zinc-600 opacity-70 cursor-not-allowed';
    let finalClasses = '';
    if (disabled) {
        finalClasses = disabledClasses;
    } else if (isActive) {
        finalClasses = activeClasses[color] || activeClasses.gray;
    } else {
        finalClasses = inactiveClasses[color] || inactiveClasses.gray;
    }
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={`${baseClasses} ${finalClasses}`}>
        {color === 'yellow' && <Award size={14} />}
        {label} 
        <span className={`ml-1.5 px-2 py-0.5 rounded-full text-xs ${isActive ? 'bg-black/20' : 'bg-zinc-800/80'}`}>{count}</span>
      </button>
    );
};
// --- Fin FilterButton ---


// --- (ACTUALIZADO) Props de la Página ---
interface KilosAnalysisPageProps {
    onSelectAnimal: (animalId: string) => void;
    navigateTo: (page: PageState) => void;
    initialDate: string | null; // <-- Prop recibida
    onDateChange: (date: string) => void; // <-- Prop recibida
}

export default function KilosAnalysisPage({ 
    onSelectAnimal, 
    navigateTo, 
    initialDate, 
    onDateChange 
}: KilosAnalysisPageProps) { 
    
    const { animals, bodyWeighings, isLoading, deleteBodyWeighingSession, appConfig } = useData();
    
    const { weighingsByDate, availableDates } = useMemo(() => {
        const groups: Record<string, BodyWeighing[]> = {};
        bodyWeighings.forEach(w => { 
            if (!groups[w.date]) groups[w.date] = []; 
            groups[w.date].push(w); 
        });
        const dates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        return { weighingsByDate: groups, availableDates: dates };
    }, [bodyWeighings]);

    // (ACTUALIZADO) El estado de dateIndex se inicializa usando la prop 'initialDate'
    const [dateIndex, setDateIndex] = useState(() => {
        if (initialDate && availableDates.includes(initialDate)) {
            return availableDates.indexOf(initialDate);
        }
        return 0; // Por defecto al último pesaje
    });
    
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // (NUEVO) useEffect para notificar al padre cuando la fecha cambie
    useEffect(() => {
        const currentDate = availableDates[dateIndex];
        if (currentDate) {
            onDateChange(currentDate);
        }
    }, [dateIndex, availableDates, onDateChange]);
    
    const currentDate = availableDates[dateIndex];
    const selectedWeighings = weighingsByDate[currentDate] || [];

    const { classifiedAnimals, distribution, gaussChartData, meanGdp, stdDev, newAnimalIds, weaningCandidateCount } = useGdpAnalysis(
        selectedWeighings, 
        animals, 
        bodyWeighings,
        appConfig 
    );
    
    const { searchTerm, setSearchTerm, filteredItems } = useSearch(classifiedAnimals, ['id', 'name']);

    const [filter, setFilter] = useState<'all' | 'Sobresaliente' | 'Promedio' | 'Pobre' | 'N/A'>('all');
    const [showWeaningOnly, setShowWeaningOnly] = useState(false);

    const filteredAnimals = React.useMemo(() => {
        let list = searchTerm ? filteredItems : classifiedAnimals;
        if (showWeaningOnly) { list = list.filter(a => a.isWeaningCandidate); }
        if (filter !== 'all') { list = list.filter(a => a.classification === filter); }
        return list;
    }, [classifiedAnimals, filter, searchTerm, filteredItems, showWeaningOnly]);

    const handleBarClick = (data: any) => {
        if (data?.payload?.name) { 
            const newFilter = data.payload.name as 'Sobresaliente' | 'Promedio' | 'Pobre';
            const isActive = filter === newFilter;
            setFilter(isActive ? 'all' : newFilter);
            setShowWeaningOnly(false); 
            setSearchTerm(''); 
        }
    };
    
    const resetFilters = () => {
        setFilter('all');
        setSearchTerm('');
        setShowWeaningOnly(false);
    };

    const handleDeleteSession = async () => {
        if (!currentDate) return;
        try {
            await deleteBodyWeighingSession(currentDate);
            setDateIndex(0); 
            setIsDeleteModalOpen(false);
        } catch (error) {
            console.error("Error al eliminar sesión de pesaje corporal:", error);
        }
    };

    // --- (ACTUALIZADO) Handler de Navegación Condicional ---
    const handleAnimalClick = (animal: GdpAnalyzedAnimal) => {
        if (showWeaningOnly && animal.isWeaningCandidate) {
            // (LA CORRECCIÓN) Pasa 'contextDate' al navegar al perfil de rebaño
            navigateTo({ 
                name: 'rebano-profile', 
                animalId: animal.id,
                contextDate: animal.weighingDate // <-- Pasa la fecha del pesaje
            } as PageState); // Asignación de tipo para incluir contextDate
        } else {
            onSelectAnimal(animal.id);
        }
    };
    // --- Fin del Handler ---

    if (isLoading && availableDates.length === 0) return (
        <div className="w-full max-w-2xl mx-auto px-4 pb-24 pt-4">
            <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Calculando análisis...</h1></div>
        </div>
    );
    if (availableDates.length === 0) return (
        <div className="w-full max-w-2xl mx-auto px-4 pb-24 pt-4">
             <header className="text-center pt-4">
                <h1 className="text-3xl font-bold tracking-tight text-white">Análisis de Crecimiento</h1>
                <p className="text-lg text-zinc-400">Análisis Táctico Semanal</p>
            </header>
            <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">No hay pesajes corporales registrados.</h1></div>
        </div>
    );

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pb-24 pt-4">
                
                <header className="text-center">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Análisis de Crecimiento</h1>
                    <p className="text-lg text-zinc-400">Análisis Táctico Semanal</p>
                </header>
                
                {/* Selector de Fecha (ACTUALIZADO para llamar a setDateIndex) */}
                <div className="bg-brand-glass rounded-2xl p-3 border border-brand-border flex justify-between items-center">
                    <button 
                        onClick={() => setDateIndex(i => Math.min(i + 1, availableDates.length - 1))} 
                        disabled={dateIndex >= availableDates.length - 1} 
                        className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30"
                    >
                        <ChevronLeft />
                    </button>
                    <div className="text-center">
                        <h1 className="text-lg font-semibold text-white">{currentDate ? new Date(currentDate + 'T00:00:00').toLocaleString('es-VE', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : 'Sin Datos'}</h1>
                        <p className="text-sm text-zinc-400">{selectedWeighings.length} animales pesados</p>
                    </div>
                    <div className="flex items-center">
                        <button 
                            onClick={() => setIsDeleteModalOpen(true)} 
                            className="p-2 rounded-full text-zinc-500 hover:text-brand-red hover:bg-red-500/10 transition-colors mr-2" 
                            title="Eliminar pesajes de este día"
                        >
                            <Trash2 size={18}/>
                        </button>
                        <button 
                            onClick={() => setDateIndex(i => Math.max(i - 1, 0))} 
                            disabled={dateIndex === 0} 
                            className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30"
                        >
                            <ChevronRight />
                        </button>
                    </div>
                </div>

                {/* KPIs y Gráficos (sin cambios) ... */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border">
                        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><TrendingUp size={14} /><span>GDP Media (Sesión)</span></div>
                        <p className="text-2xl font-bold text-white">{(meanGdp).toFixed(0)} <span className="text-lg text-zinc-400">g/día</span></p>
                    </div>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border">
                        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Sigma size={14} /><span>Desv. Estándar</span></div>
                        <p className="text-2xl font-bold text-white">{(stdDev).toFixed(0)} <span className="text-lg text-zinc-400">g/día</span></p>
                    </div>
                </div>

                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Distribución GDP (Sesión)</h3>
                    <div className="w-full h-48">
                        <ResponsiveContainer>
                            <BarChart data={distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                                <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} allowDecimals={false} />
                                <Tooltip content={<GrowthTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                                <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                    {distribution.map(entry => <Cell key={entry.name} fill={entry.fill} className={`${filter !== 'all' && filter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />)}
                                    <LabelList dataKey="count" position="top" fill="#fff" fontSize={12} fontWeight="bold" /> 
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Campana de Gauss (g/día)</h3>
                    <div className="w-full h-48">
                        <ResponsiveContainer>
                            <BarChart data={gaussChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 10 }} interval={0} />
                                <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} allowDecimals={false} />
                                <Tooltip content={<GrowthTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                                <Bar dataKey="count" fill="rgba(52, 199, 89, 0.6)" name="Nº Animales">
                                    <LabelList dataKey="count" content={CustomBarLabel} /> 
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="text-center text-xs text-zinc-400 mt-2">
                        <span>μ = {(meanGdp).toFixed(0)} g/día</span> | <span>σ = {stdDev.toFixed(0)} g/día</span>
                    </div>
                </div>
                
                {/* Barra de Filtros y Búsqueda */}
                <div className="space-y-3">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                        <input 
                            type="search" 
                            placeholder={`Buscar en ${classifiedAnimals.length} animales...`} 
                            value={searchTerm} 
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowWeaningOnly(false);
                                setFilter('all'); 
                            }} 
                            className="w-full bg-brand-glass border border-brand-border rounded-xl pl-10 pr-10 py-3 text-white focus:ring-2 focus:ring-brand-orange"
                        />
                        {(searchTerm || filter !== 'all' || showWeaningOnly) && (
                            <button onClick={resetFilters} title="Limpiar filtros" className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 hover:text-white">
                                <FilterX size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        <FilterButton
                            label="Candidatos a Destete"
                            count={weaningCandidateCount}
                            isActive={showWeaningOnly}
                            onClick={() => {
                                setShowWeaningOnly(true);
                                setFilter('all'); 
                                setSearchTerm(''); 
                            }}
                            color="yellow"
                            isPulsing={weaningCandidateCount > 0 && !showWeaningOnly}
                            disabled={weaningCandidateCount === 0}
                        />
                         <FilterButton
                            label="Sobresaliente"
                            count={distribution.find(d => d.name === 'Sobresaliente')?.count || 0}
                            isActive={filter === 'Sobresaliente'}
                            onClick={() => {
                                setFilter('Sobresaliente');
                                setShowWeaningOnly(false);
                            }}
                            color="green"
                        />
                         <FilterButton
                            label="Promedio"
                            count={distribution.find(d => d.name === 'Promedio')?.count || 0}
                            isActive={filter === 'Promedio'}
                            onClick={() => {
                                setFilter('Promedio');
                                setShowWeaningOnly(false);
                            }}
                            color="gray"
                        />
                        <FilterButton
                            label="Pobre"
                            count={distribution.find(d => d.name === 'Pobre')?.count || 0}
                            isActive={filter === 'Pobre'}
                            onClick={() => {
                                setFilter('Pobre');
                                setShowWeaningOnly(false);
                            }}
                            color="red"
                        />
                    </div>
                </div>
                {/* --- Fin Barra de Filtros --- */}


                <div className="space-y-4 pt-4">
                    <h3 className="text-lg font-semibold text-zinc-300 ml-1">
                        {showWeaningOnly 
                            ? `Candidatos a Destete (${filteredAnimals.length})` 
                            : (filter === 'all' ? 'Animales Pesados' : `Animales (${filter})`) + ` (${filteredAnimals.length})`
                        }
                    </h3>
                    {filteredAnimals.length > 0 ? (
                        filteredAnimals.map(animal => (
                            <AnimalRow 
                                key={animal.id} 
                                animal={animal} 
                                onSelect={handleAnimalClick} 
                                isNew={newAnimalIds.has(animal.id)}
                            />
                        ))
                    ) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl">
                            <p className="text-zinc-500">{searchTerm ? "No se encontraron resultados." : "No hay animales que coincidan con los filtros."}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Borrado */}
            {currentDate && (
                <DeleteBodyWeighingSessionModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => setIsDeleteModalOpen(false)}
                    onConfirm={handleDeleteSession}
                    dateToDelete={currentDate}
                />
            )}
        </>
    );
}