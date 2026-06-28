import React, { useState, useRef, useMemo } from 'react';
import { useKilosAnalytics } from '../../../hooks/useKilosAnalytics';
import { useData } from '../../../context/DataContext';
import { KilosFilterBar } from '../../../components/kilos/KilosFilterBar';
import { KilosKPIsView } from './KilosKPIsView';
import { KilosChartView } from './KilosChartView';
import { KilosListView } from './KilosListView';
import { 
    X, Filter, ChevronLeft, Users, Clock, ChevronRight 
} from 'lucide-react';
import { formatAnimalDisplay } from '../../../utils/formatting';
import { getInterpolatedWeight } from '../../../utils/calculations';

// --- COMPONENTE UI INTERNO: BottomSheet (Dark Mode Original) ---
const ResizableBottomSheet = ({ isOpen, onClose, children, title, subtitle }: { 
    isOpen: boolean; 
    onClose: () => void; 
    children: React.ReactNode;
    title?: string;
    subtitle?: string;
}) => {
    const [height, setHeight] = useState<'closed' | 'peek' | 'full'>('closed');
    const startY = useRef<number>(0);
    const currentY = useRef<number>(0);

    React.useEffect(() => {
        if (isOpen && height === 'closed') setHeight('peek');
        if (!isOpen) setHeight('closed');
    }, [isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => { startY.current = e.touches[0].clientY; };
    const handleTouchMove = (e: React.TouchEvent) => { currentY.current = e.touches[0].clientY; };
    const handleTouchEnd = () => {
        const diff = currentY.current - startY.current;
        if (diff < -50 && height === 'peek') setHeight('full');
        else if (diff > 50 && height === 'full') setHeight('peek');
        else if (diff > 50 && height === 'peek') { setHeight('closed'); setTimeout(onClose, 300); }
    };

    const getHeightClass = () => {
        switch (height) {
            case 'full': return 'h-[90dvh]';
            case 'peek': return 'h-[50vh]'; 
            case 'closed': return 'h-0';
        }
    };

    return (
        <>
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${height !== 'closed' ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => { setHeight('closed'); setTimeout(onClose, 300); }} 
            />
            <div
                className={`fixed inset-x-0 bottom-0 z-50 bg-c-surface rounded-t-3xl border-t border-c-border shadow-2xl transition-all duration-300 ease-out flex flex-col ${getHeightClass()}`}
            >
                <div
                    className="w-full pt-3 pb-2 px-4 flex flex-col items-center flex-shrink-0 bg-c-surface rounded-t-3xl z-10 touch-none"
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                >
                    <div className="w-12 h-1.5 bg-c-text-faint rounded-full mb-4 opacity-50" />
                    <div className="w-full flex justify-between items-center mb-2">
                        <div>
                            {title && <h3 className="text-c-text-strong font-bold text-lg leading-none">{title}</h3>}
                            {subtitle && <p className="text-c-text-muted text-xs mt-1">{subtitle}</p>}
                        </div>
                        <button onClick={() => { setHeight('closed'); setTimeout(onClose, 300); }} className="p-2 bg-c-surface-2 rounded-full text-c-text-muted hover:text-c-text">
                            <X size={18} />
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto px-4 pb-8">
                    {children}
                </div>
            </div>
        </>
    );
};

// --- PÁGINA PRINCIPAL DASHBOARD ---

interface KilosDashboardPageProps {
    onSelectAnimal: (id: string) => void;
    onBack: () => void;
}

export default function KilosDashboardPage({ onSelectAnimal, onBack }: KilosDashboardPageProps) {
    const { bodyWeighings } = useData(); 
    
    // 1. Hook Centralizado
    const analytics = useKilosAnalytics();
    const { filterState, setters, rawAnimals, kpis, approachingServiceList } = analytics;

    // 2. Estados UI
    const [currentPage, setCurrentPage] = useState(0);
    const [showFilters, setShowFilters] = useState(false);
    
    // 3. Estados de Modales (BottomSheets)
    const [selectedPointDay, setSelectedPointDay] = useState<number | null>(null);
    const [showApproachingModal, setShowApproachingModal] = useState(false);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const handleScroll = () => {
        if (scrollContainerRef.current) {
            const scrollLeft = scrollContainerRef.current.scrollLeft;
            const width = scrollContainerRef.current.offsetWidth;
            const page = Math.round(scrollLeft / width);
            setCurrentPage(page);
        }
    };

    // --- Cálculo de Datos para el Bottom Sheet (Gráfico) ---
    const sheetAnimals = useMemo(() => {
        if (selectedPointDay === null) return [];
        
        const animalsWithWeight = rawAnimals.map(animal => {
            const animalWeighings = bodyWeighings
                .filter(w => w.animalId === animal.id)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            const allPoints = [...animalWeighings];
            if (animal.birthWeight && animal.birthDate) {
                allPoints.unshift({ id: 'birth', animalId: animal.id, date: animal.birthDate, kg: animal.birthWeight, userId: '', _synced: true });
            }

            const weightAtDay = getInterpolatedWeight(allPoints, animal.birthDate || '', selectedPointDay);
            if (weightAtDay !== null) return { ...animal, projectedWeight: weightAtDay };
            return null;
        }).filter(Boolean) as (typeof rawAnimals[0] & { projectedWeight: number })[];

        return animalsWithWeight.sort((a, b) => b.projectedWeight - a.projectedWeight);
    }, [selectedPointDay, rawAnimals, bodyWeighings]);


    return (
        <div className="flex flex-col h-screen w-full bg-c-bg text-c-text font-sans overflow-hidden">

            {/* HEADER CORREGIDO: pt-12 para separar de la barra de estado */}
            <div className="flex-shrink-0 pt-12 pb-2 px-4 flex justify-between items-center bg-c-bg z-30 border-b border-c-border">
                <div className="flex items-center gap-3">
                    <button onClick={onBack} className="text-c-text-muted hover:text-c-text transition-colors">
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-c-text-strong leading-none tracking-tight">Monitor Kilos</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="bg-c-accent text-white text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                                <Users size={10} />
                                N = {kpis.totalAnimals}
                            </span>
                            <span className="text-[10px] text-c-text-faint font-bold uppercase tracking-wide">
                                • {filterState.filterType}
                                {(filterState.filterType === 'ANUAL' || filterState.filterType === 'COHORTE') && ` • ${filterState.selectedYear}`}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-2 rounded-full transition-colors ${showFilters ? 'bg-c-accent text-white' : 'bg-c-surface text-c-text-muted'}`}
                >
                    {showFilters ? <X size={20} /> : <Filter size={20} />}
                </button>
            </div>

            {/* FILTROS */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out bg-c-surface-2 border-b border-c-border z-20 flex-shrink-0 ${showFilters ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0'}`}>
                <KilosFilterBar filterState={filterState} setters={setters} />
            </div>

            {/* CARRUSEL DE PÁGINAS */}
            <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex-1 flex overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide"
            >
                {/* PÁGINA 1: KPIs */}
                <div className="min-w-full h-full snap-center overflow-hidden">
                    <KilosKPIsView 
                        analytics={analytics} 
                        onOpenApproachingList={() => setShowApproachingModal(true)} 
                    />
                </div>

                {/* PÁGINA 2: GRÁFICO */}
                <div className="min-w-full h-full snap-center overflow-hidden relative">
                    <KilosChartView 
                        analytics={analytics} 
                        onPointClick={(day) => setSelectedPointDay(day)}
                    />
                </div>

                {/* PÁGINA 3: LISTA */}
                <div className="min-w-full h-full snap-center overflow-hidden">
                    <KilosListView analytics={analytics} />
                </div>
            </div>

            {/* PAGINACIÓN */}
            <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 pointer-events-none z-20">
                {[0, 1, 2].map((idx) => (
                    <div
                        key={idx}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            currentPage === idx ? 'bg-c-accent w-4' : 'bg-c-text-faint'
                        }`}
                    />
                ))}
            </div>

            {/* MODAL 1: DETALLE GRÁFICO (Histórico) */}
            <ResizableBottomSheet 
                isOpen={selectedPointDay !== null} 
                onClose={() => setSelectedPointDay(null)}
                title={selectedPointDay !== null ? `Día ${selectedPointDay}` : ''}
                subtitle={`${sheetAnimals.length} animales proyectados`}
            >
                <div className="space-y-1">
                    {sheetAnimals.map((animal) => (
                        <button
                            key={animal.id}
                            onClick={() => onSelectAnimal(animal.id)}
                            className="w-full flex items-center justify-between p-3 bg-c-surface/50 border border-c-border/50 rounded-xl hover:bg-c-surface-2 transition-colors group"
                        >
                            <div className="flex flex-col text-left">
                                <span className="font-mono font-bold text-c-text-strong text-sm">{animal.id}</span>
                                <span className="text-xs text-c-text-faint">{formatAnimalDisplay(animal).split('-')[1] || formatAnimalDisplay(animal)}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-c-accent-gold text-sm">
                                    {animal.projectedWeight.toFixed(1)} <span className="text-[10px] text-c-text-faint">kg</span>
                                </span>
                                <ChevronRight size={16} className="text-c-text-faint group-hover:text-c-text" />
                            </div>
                        </button>
                    ))}
                    {sheetAnimals.length === 0 && <div className="text-center text-c-text-faint py-4 text-sm">Sin datos.</div>}
                </div>
            </ResizableBottomSheet>

            {/* MODAL 2: PRÓXIMOS A SERVICIO (Proactivo) */}
            <ResizableBottomSheet 
                isOpen={showApproachingModal} 
                onClose={() => setShowApproachingModal(false)}
                title="Próximos a Servicio"
                subtitle="Proyección a 30 días según GDP actual"
            >
                <div className="space-y-1">
                    {approachingServiceList.length > 0 ? (
                        approachingServiceList.map((row) => (
                            <button
                                key={row.id}
                                onClick={() => onSelectAnimal(row.id)}
                                className="w-full flex items-center justify-between p-3 bg-c-surface/50 border border-c-border/50 rounded-xl hover:bg-c-surface-2 transition-colors group"
                            >
                                <div className="flex flex-col text-left">
                                    <span className="font-mono font-bold text-c-text-strong text-sm">{row.id}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] bg-pink-500/10 text-pink-400 px-1.5 py-0.5 rounded border border-pink-500/20 font-bold">
                                            Faltan {row.daysToServiceGoal}d
                                        </span>
                                        <span className="text-[10px] text-c-text-faint">
                                            {row.currentWeight.toFixed(1)} Kg
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-c-text-strong">{row.gdp.toFixed(0)} g/d</span>
                                    <ChevronRight size={16} className="text-c-text-faint group-hover:text-c-text" />
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-8 text-c-text-faint">
                            <Clock size={32} className="mb-2 opacity-20" />
                            <p className="text-sm">No hay animales próximos a la meta en este momento.</p>
                        </div>
                    )}
                </div>
            </ResizableBottomSheet>

        </div>
    );
}