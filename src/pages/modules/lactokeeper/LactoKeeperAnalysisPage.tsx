// src/pages/modules/lactokeeper/LactoKeeperAnalysisPage.tsx

import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../../../context/DataContext';
import { Plus, ChevronRight, ArrowUp, ArrowDown, Sparkles, ChevronLeft, FilterX, Info, Sigma, Droplets, TrendingUp, LogIn, LogOut, Target, Search, Trash2, BarChart as BarChartIconLucide, Wind, Archive } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import { useGaussAnalysis, AnalyzedAnimal } from '../../../hooks/useGaussAnalysis';
import { WeighingTrendIcon } from '../../../components/ui/WeighingTrendIcon';
import { Modal } from '../../../components/ui/Modal';
import { useWeighingTrend } from '../../../hooks/useWeighingTrend';
import { formatAge, getAnimalStatusObjects } from '../../../utils/calculations';
import { formatAnimalDisplay } from '../../../utils/formatting'; // <--- IMPORTACIÓN PRESENTE
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
import { Animal } from '../../../db/local'; // Import Animal

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

// Componente para mostrar la fila de un animal en la lista de análisis
const MilkingAnimalRow = ({ animal, onSelectAnimal, onOpenActions, isNewEntry }: {
    animal: AnalyzedAnimal & { statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] },
    onSelectAnimal: (id: string) => void,
    onOpenActions: (animal: AnalyzedAnimal) => void,
    isNewEntry: boolean
}) => {
    const { weighings } = useData(); // Acceder a todos los pesajes para calcular tendencia
    const { trend, isLongTrend } = useWeighingTrend(animal.id, weighings); // Hook para calcular tendencia
    const swipeControls = useAnimation(); // Control para animación de swipe
    const dragStarted = useRef(false); // Ref para diferenciar tap de drag
    const buttonsWidth = 80; // Ancho del botón de acciones oculto

    // Mapeo de clasificación a color de fondo para el indicador visual
    const classificationColor = {
        'Sobresaliente': 'bg-brand-green',
        'Promedio': 'bg-gray-500',
        'Pobre': 'bg-brand-red',
    };

    const formattedAge = formatAge(animal.birthDate); // Formatear edad

    // Handler para fin de arrastre
    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x; // Desplazamiento
        const velocity = info.velocity.x; // Velocidad
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            onOpenActions(animal);
        }
        swipeControls.start({ x: 0 }); // Volver a posición 0
        setTimeout(() => { dragStarted.current = false; }, 100); // Resetear estado de drag
    };

    return (
        // Contenedor de la fila, con borde inferior
        <div className="relative w-full overflow-hidden bg-brand-glass border-b border-brand-border/50 last:border-b-0">
            {/* Botón de acciones oculto */}
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <div className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                     <Plus size={22} /><span className="text-xs mt-1 font-semibold">Acciones</span>
                </div>
            </div>
            {/* Contenido deslizable */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) { onSelectAnimal(animal.id); } }} // Seleccionar solo en tap
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-4" // Estilos
            >
                {/* Indicador de clasificación (punto de color) */}
                <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${animal.latestWeighing > 0 ? classificationColor[animal.classification] : 'bg-transparent'}`} title={`Rendimiento: ${animal.classification}`}></div>
                <div className="flex justify-between items-center">
                    {/* Información Izquierda */}
                    <div>
                        {/* --- USO DE formatAnimalDisplay --- */}
                        <p className="font-bold text-lg text-white">{formatAnimalDisplay(animal)}</p>
                        <p className="text-sm text-zinc-400 mt-1">
                            {animal.sex} | {formattedAge} | Lote: {animal.location || 'Sin Asignar'}
                        </p>
                    </div>
                    {/* Información Derecha */}
                    <div className="flex items-center space-x-3">
                        {/* Producción y DEL */}
                        <div className="text-right">
                            <p className="font-semibold text-brand-orange">{animal.latestWeighing > 0 ? `${animal.latestWeighing.toFixed(2)} Kg` : 'Sin Pesar'}</p>
                            {animal.del > 0 && <p className="text-xs text-zinc-400">DEL: {animal.del}</p>}
                        </div>
                        {/* Iconos de Estado */}
                        <StatusIcons statuses={animal.statusObjects} />
                        {/* Icono de Nuevo Ingreso o Tendencia */}
                        {isNewEntry ? (
                           <span title="Primer Ingreso al Control Lechero" className="w-8 h-8 flex items-center justify-center rounded-full bg-green-500/20 text-brand-green">
                               <LogIn size={18} strokeWidth={3}/>
                           </span>
                       ) : (
                           <div className="w-8 h-8 flex items-center justify-center">
                               <WeighingTrendIcon trend={trend} isLongTrend={isLongTrend} />
                           </div>
                       )}
                       {/* Flecha */}
                        <ChevronRight className="text-zinc-600" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};


// Componente para el contenido del modal de tendencia
const TrendModalContent = ({ animalId }: { animalId: string }) => {
    const { weighings } = useData();
    const { lastTwoWeighings, difference } = useWeighingTrend(animalId, weighings);



    if (lastTwoWeighings.length < 2) return <p>No hay suficientes datos para comparar.</p>;
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

// Componente para las etiquetas de las barras del gráfico
const CustomBarLabel = (props: any) => {
    const { x, y, width, height, value, total } = props;
    if (total === 0 || value === 0) return null; // No mostrar si no hay valor o total
    const percentage = ((value / total) * 100).toFixed(0); // Calcular porcentaje
    return ( <text x={x + width / 2} y={y + height / 2} fill="#fff" textAnchor="middle" dominantBaseline="middle" fontSize="14px" fontWeight="bold" opacity={0.8}>{`${percentage}%`}</text> );
};

// Props para la página de análisis
interface LactoKeeperAnalysisPageProps {
    onSelectAnimal: (animalId: string) => void; // Función para navegar al perfil de lactancia
}

// --- COMPONENTE PRINCIPAL DE LA PÁGINA DE ANÁLISIS ---
export default function LactoKeeperAnalysisPage({ onSelectAnimal }: LactoKeeperAnalysisPageProps) {
    // Hooks de datos y estado
    const { animals, parturitions, weighings, isLoading, serviceRecords, sireLots, breedingSeasons, startDryingProcess, setLactationAsDry, deleteWeighingSession } = useData();
    const [isWeighted, setIsWeighted] = useState(false); // ¿Usar cálculo ponderado?
    // Estados de filtros
    const [classificationFilter, setClassificationFilter] = useState<'all' | 'Pobre' | 'Promedio' | 'Sobresaliente'>('all');
    const [trendFilter, setTrendFilter] = useState<'all' | 'up' | 'down' | 'stable' | 'single'>('all');
    const [specialFilter, setSpecialFilter] = useState<'all' | 'new'>('all'); // Filtro Ingresos/Salidas
    const [lactationPhaseFilter, setLactationPhaseFilter] = useState<'all' | 'first' | 'second' | 'third' | 'drying'>('all'); // Filtro Fase Lactancia
    // Estados de modales
    const [activeModal, setActiveModal] = useState<string | null>(null); // Qué modal de info/acción mostrar
    const [trendModalAnimal, setTrendModalAnimal] = useState<AnalyzedAnimal | null>(null); // Animal para modal de tendencia
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false); // Modal info análisis
    const [isScoreInfoModalOpen, setIsScoreInfoModalOpen] = useState(false); // Modal info score ponderado
    const [isExitingAnimalsModalOpen, setIsExitingAnimalsModalOpen] = useState(false); // Modal animales que salieron
    const [isActionSheetOpen, setIsActionSheetOpen] = useState(false); // ActionSheet general
    const [actionSheetAnimal, setActionSheetAnimal] = useState<AnalyzedAnimal | null>(null); // Animal para ActionSheet
    const [isDeleteSessionModalOpen, setIsDeleteSessionModalOpen] = useState(false); // Modal confirmar borrar sesión

    const [dateIndex, setDateIndex] = useState(0); // Índice de la fecha seleccionada

    const dryingCandidateIds = useDryingCandidates(); // Hook para obtener IDs de candidatas a secado

    // Memoizar pesajes agrupados por fecha y fechas disponibles
    const { weighingsByDate, availableDates } = useMemo(() => {
        const groups: Record<string, any[]> = {};
        weighings.forEach(w => { if (!groups[w.date]) groups[w.date] = []; groups[w.date].push(w); });
        const dates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()); // Ordenar fechas desc
        return { weighingsByDate: groups, availableDates: dates };
    }, [weighings]);

    const currentDate = availableDates[dateIndex]; // Fecha actual seleccionada

    // Memoizar pesajes únicos para la fecha actual
    const selectedWeighings = useMemo(() => {
        if (!currentDate) return [];
        const weighingsForDate = weighingsByDate[currentDate] || [];
        const unique = new Map(); // Usar Map para obtener el último pesaje por animal si hay duplicados
        weighingsForDate.forEach(w => unique.set(w.goatId, w));
        return Array.from(unique.values());
    }, [currentDate, weighingsByDate]);

    // Hook para análisis Gaussiano (clasificación) de los pesajes seleccionados
    const { classifiedAnimals, distribution, mean, stdDev, weightedMean } = useGaussAnalysis(selectedWeighings, animals, weighings, parturitions, isWeighted);

    // Memoizar animales clasificados con sus objetos de estado
    const classifiedAnimalsWithStatus = useMemo(() => {
        return classifiedAnimals.map(ca => {
            const originalAnimal = animals.find((a: Animal) => a.id === ca.id); // Encontrar animal original
            return {
                ...ca, // Mantener todos los datos de AnalyzedAnimal
                id: ca.id,
                name: (originalAnimal as Animal)?.name, // Añadir 'name' explícitamente desde 'animals'
                statusObjects: originalAnimal ? getAnimalStatusObjects(originalAnimal, parturitions, serviceRecords, sireLots, breedingSeasons) : [] // Añadir estados
            };
        });
    }, [classifiedAnimals, animals, parturitions, serviceRecords, sireLots, breedingSeasons]);

    // Memoizar pesajes del día anterior para calcular ingresos/salidas
    const previousDayWeighings = useMemo(() => {
        if (dateIndex + 1 < availableDates.length) {
            const previousDate = availableDates[dateIndex + 1];
            return weighingsByDate[previousDate] || [];
        }
        return [];
    }, [dateIndex, availableDates, weighingsByDate]);

    // Análisis Gaussiano del día anterior
    const previousDayAnalysis = useGaussAnalysis(previousDayWeighings, animals, weighings, parturitions, false); // No ponderado para comparación simple

    // Memoizar datos derivados de la página (tendencia, KPIs, extremos, ingresos/salidas)
    const pageData = useMemo(() => {
        // IDs de animales en el análisis actual y anterior
        const currentAnalyzedAnimalIds = new Set(classifiedAnimals.map(a => a.id));
        const previousAnalyzedAnimalIds = new Set(previousDayAnalysis.classifiedAnimals.map(a => a.id));

        let newAnimalIds = new Set<string>(); // Animales que ingresaron al control
        let exitingAnimalIds = new Set<string>(); // Animales que salieron del control

        // Calcular ingresos/salidas comparando con el día anterior
        if (dateIndex === availableDates.length - 1 && availableDates.length > 0) {
            newAnimalIds = currentAnalyzedAnimalIds; // Si es el primer día, todos son ingresos
        } else if (availableDates.length > 0){
             newAnimalIds = new Set([...currentAnalyzedAnimalIds].filter(id => !previousAnalyzedAnimalIds.has(id))); // IDs en actual pero no en anterior
             exitingAnimalIds = new Set([...previousAnalyzedAnimalIds].filter(id => !currentAnalyzedAnimalIds.has(id))); // IDs en anterior pero no en actual
        }

        // Datos para gráfico de tendencia de producción media (últimos 3 días)
        const trendData = availableDates.slice(Math.max(0, dateIndex - 2), dateIndex + 1).map(date => {
            const dateWeighings = weighingsByDate[date] || [];
            if (dateWeighings.length === 0) return { date, avg: 0 };
            const total = dateWeighings.reduce((sum, w) => sum + w.kg, 0);
            return { date: new Date(date + 'T00:00:00').toLocaleDateString('es-VE', {month: 'short', day: 'numeric'}), avg: total / dateWeighings.length };
        }).reverse(); // Revertir para orden cronológico

        // Calcular KPIs: total, max, min, y encontrar animales extremos
        let topPerformer: (AnalyzedAnimal & { statusObjects: any[] }) | null = null;
        let bottomPerformer: (AnalyzedAnimal & { statusObjects: any[] }) | null = null;
        let total = 0, max = 0, min = Infinity; // Iniciar min en Infinito
        if (classifiedAnimalsWithStatus.length > 0) {
            total = classifiedAnimalsWithStatus.reduce((sum, a) => sum + a.latestWeighing, 0);
            const productions = classifiedAnimalsWithStatus.map(a => a.latestWeighing);
            max = Math.max(...productions);
            min = Math.min(...productions.filter(kg => kg > 0)); // Excluir 0 para el mínimo si hay animales sin pesar
             if(min === Infinity) min = 0; // Si todos pesaron 0, min es 0
            topPerformer = classifiedAnimalsWithStatus.find(a => a.latestWeighing === max) || null;
            bottomPerformer = classifiedAnimalsWithStatus.find(a => a.latestWeighing === min) || null;
        }

        // Calcular consistencia (porcentaje dentro de 1 desviación estándar)
        const lowerBound = mean - stdDev;
        const upperBound = mean + stdDev;
        const consistentCount = classifiedAnimals.filter(a => a.latestWeighing >= lowerBound && a.latestWeighing <= upperBound).length;
        const consistencyPercentage = classifiedAnimals.length > 0 ? (consistentCount / classifiedAnimals.length) * 100 : 0;

        return { trendData, kpi: { total, max, min }, topPerformer, bottomPerformer, consistency: { percentage: consistencyPercentage }, newAnimalIds, exitingAnimalIds };
    }, [classifiedAnimals, classifiedAnimalsWithStatus, previousDayAnalysis.classifiedAnimals, availableDates, dateIndex, weighingsByDate, mean, stdDev]);

    // Hook de búsqueda textual
    const { searchTerm, setSearchTerm, filteredItems } = useSearch(classifiedAnimalsWithStatus, ['id', 'name']); // Buscar por ID y Nombre

    // Memoizar lista final de animales a mostrar (aplicando todos los filtros)
    const finalAnimalList = useMemo(() => {
        let list: (AnalyzedAnimal & { statusObjects: any[]; name?: string })[] = searchTerm ? filteredItems : classifiedAnimalsWithStatus; // Empezar con lista buscada o completa

        // Aplicar filtros de UI
        if (classificationFilter !== 'all') { list = list.filter(a => a.classification === classificationFilter); }
        if (specialFilter === 'new') { list = list.filter(animal => pageData.newAnimalIds.has(animal.id)); }
        if (trendFilter !== 'all') {
             list = list.filter(animal => { const { trend } = useWeighingTrend(animal.id, weighings); return trend === trendFilter; });
        }
        if (lactationPhaseFilter !== 'all') {
            list = list.filter(animal => {
                const del = animal.del;
                if (lactationPhaseFilter === 'drying') return dryingCandidateIds.includes(animal.id);
                if (del === 0) return false;
                if (lactationPhaseFilter === 'first') return del > 0 && del <= 100;
                if (lactationPhaseFilter === 'second') return del > 100 && del <= 200;
                if (lactationPhaseFilter === 'third') return del > 200 && del < 270;
                return false;
            });
        }

        return list.sort((a,b) => b.latestWeighing - a.latestWeighing); // Ordenar por producción descendente

    }, [searchTerm, filteredItems, classifiedAnimalsWithStatus, classificationFilter, trendFilter, lactationPhaseFilter, specialFilter, pageData.newAnimalIds, dryingCandidateIds, weighings]);

    // Memoizar porcentajes de tendencia para botones de filtro
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

    // Resetear filtros
    const resetFilters = () => {
        setClassificationFilter('all'); setTrendFilter('all'); setLactationPhaseFilter('all'); setSpecialFilter('all'); setSearchTerm('');
    };

    // Manejar clic en barras del gráfico de distribución para filtrar
    const handleBarClick = (data: any) => { if (data?.payload?.name) { const newFilter = data.payload.name as 'Pobre' | 'Promedio' | 'Sobresaliente'; setClassificationFilter(prev => prev === newFilter ? 'all' : newFilter); }};
    
    // Abrir ActionSheet para un animal
    const handleOpenActions = (animal: AnalyzedAnimal) => { setActionSheetAnimal(animal); setIsActionSheetOpen(true); };

    // Obtener acciones para el ActionSheet
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

    // Cerrar modal
    const closeModal = () => { setActiveModal(null); setActionSheetAnimal(null); };

    // Borrar sesión de pesaje actual
    const handleDeleteCurrentSession = async () => {
        if (!currentDate) return;
        try {
            await deleteWeighingSession(currentDate);
            setDateIndex(0);
            setIsDeleteSessionModalOpen(false);
        } catch (error) { console.error("Error deleting session:", error); }
    };

    // Estados de carga y sin datos
    if (isLoading && availableDates.length === 0) return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Calculando análisis...</h1></div>;
    if (availableDates.length === 0) return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">No hay pesajes registrados.</h1></div>;

    // --- RENDERIZADO DE LA PÁGINA ---
    return (
        <>
            <div className="w-full max-w-2xl mx-auto"> {/* Contenedor principal */}
                {/* Contenido superior (controles, KPIs, gráficos) CON padding */}
                <div className="p-4 space-y-4">
                    {/* Selector de Fecha */}
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

                    {/* KPIs */}
                    <div className="grid grid-cols-2 gap-4">
                        <KpiCard icon={Droplets} title={isWeighted ? 'Media Ponderada' : 'Media Prod.'} value={(isWeighted ? weightedMean : mean).toFixed(2)} unit="Kg" onClick={() => setActiveModal('media')} />
                        <KpiCard icon={Sigma} title="Prod. Total" value={pageData.kpi.total.toFixed(2)} unit="Kg" onClick={() => setActiveModal('total')} />
                        <KpiCard icon={Target} title="Consistencia" value={stdDev.toFixed(2)} unit="σ" onClick={() => setActiveModal('stdDev')} />
                        <KpiCard icon={TrendingUp} title="Rango Prod." value={`${pageData.kpi.min.toFixed(2)} - ${pageData.kpi.max.toFixed(2)}`} unit="Kg" onClick={() => setActiveModal('rango')} />
                    </div>

                    {/* Gráfico de Distribución (Gauss) */}
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
                                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                                    <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} allowDecimals={false}/>
                                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                                    <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                        {/* Colorear barras y aplicar opacidad según filtro */}
                                        {distribution.map((entry) => (<Cell key={entry.name} fill={entry.fill} className={`${classificationFilter !== 'all' && classificationFilter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />))}
                                        {/* Añadir etiquetas de porcentaje */}
                                        <LabelList dataKey="count" content={<CustomBarLabel total={classifiedAnimals.length} />} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        {/* Mostrar media y desviación */}
                        <div className="text-center text-xs text-zinc-400 mt-2"><span>μ = {mean.toFixed(2)}</span> | <span>σ = {stdDev.toFixed(2)}</span></div>
                    </div>

                    {/* Barra de Filtros */}
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-2 border border-brand-border space-y-2">
                        {/* Filtros de Tendencia y Especiales */}
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

                    {/* Barra de Búsqueda */}
                    <div className="relative px-4">
                        <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                        <input type="search" placeholder={`Buscar ID o Nombre en ${finalAnimalList.length} animales...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-brand-glass border border-brand-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-brand-orange"/>
                    </div>
                </div>

                {/* Lista de Animales (SIN padding horizontal aquí) */}
                <div className="pt-2 space-y-0 pb-4"> {/* Added pb-4 for bottom spacing */}
                    {finalAnimalList.length > 0 ? (
                        // Contenedor full-width con bordes y overflow hidden
                        <div className="bg-brand-glass rounded-2xl border border-brand-border overflow-hidden mx-4"> {/* Márgenes laterales aplicados aquí */}
                            {finalAnimalList.map(animal => (
                                <MilkingAnimalRow
                                    key={animal.id}
                                    animal={animal as AnalyzedAnimal & { statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] }} // Asegurar tipo
                                    onSelectAnimal={onSelectAnimal} // Navegar al perfil
                                    onOpenActions={handleOpenActions} // Abrir acciones
                                    isNewEntry={pageData.newAnimalIds.has(animal.id)} // Marcar si es nuevo ingreso
                                />
                            ))}
                        </div>
                    ) : ( // Mensaje si no hay animales
                        <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4">
                            <p className="text-zinc-400">{searchTerm ? `No se encontraron resultados` : "No hay animales con los filtros."}</p>
                        </div>
                    )}
                </div>
            </div> {/* Fin contenedor principal */}

            {/* Modales */}
            <Modal isOpen={activeModal === 'media'} onClose={() => setActiveModal(null)} title="Análisis de Producción Media"><div className="text-zinc-300 space-y-4 text-base"><p>La **Media de Producción** del día es **{mean.toFixed(2)} Kg**. Representa el promedio simple.</p><p>La **Media Ponderada** ({weightedMean.toFixed(2)} Kg) premia la **persistencia lechera** (más valor a producción tardía).</p></div></Modal>
            <Modal isOpen={activeModal === 'total'} onClose={() => setActiveModal(null)} title="Producción Total del Día"><div className="text-center"><p className="text-zinc-400">La producción total registrada el {currentDate ? new Date(currentDate + 'T00:00:00').toLocaleDateString('es-VE') : '-'} fue:</p><h2 className="text-5xl font-bold text-brand-orange my-2">{pageData.kpi.total.toFixed(2)} Kg</h2></div></Modal>
            <Modal isOpen={activeModal === 'stdDev'} onClose={() => setActiveModal(null)} title="Análisis de Consistencia (σ)"><div className="text-zinc-300 space-y-4 text-base"><p>La Desviación Estándar (σ) de **{stdDev.toFixed(2)}** mide la dispersión. Un valor **bajo** es ideal (rebaño consistente).</p><div className="bg-black/30 p-4 rounded-lg text-center"><p className="text-sm uppercase text-zinc-400">Rebaño dentro de 1σ</p><p className="text-4xl font-bold text-brand-orange my-1">{pageData.consistency.percentage.toFixed(0)}%</p><p className="text-sm text-zinc-400">Cercanía al promedio de <span className="font-bold text-white">{mean.toFixed(2)} Kg</span>.</p></div></div></Modal>
            <Modal isOpen={activeModal === 'rango'} onClose={() => setActiveModal(null)} title="Extremos de Producción del Día">
                 <div className="space-y-4">
                     {pageData.topPerformer && <div className="bg-green-900/40 border border-green-500/50 rounded-2xl p-4"><h3 className="font-semibold text-brand-green mb-2">Producción Máxima</h3><MilkingAnimalRow animal={pageData.topPerformer} onSelectAnimal={() => { setActiveModal(null); onSelectAnimal(pageData.topPerformer!.id); }} onOpenActions={handleOpenActions} isNewEntry={pageData.newAnimalIds.has(pageData.topPerformer.id)} /></div>}
                     {pageData.bottomPerformer && <div className="bg-red-900/40 border border-red-500/50 rounded-2xl p-4"><h3 className="font-semibold text-brand-red mb-2">Producción Mínima</h3><MilkingAnimalRow animal={pageData.bottomPerformer} onSelectAnimal={() => { setActiveModal(null); onSelectAnimal(pageData.bottomPerformer!.id); }} onOpenActions={handleOpenActions} isNewEntry={pageData.newAnimalIds.has(pageData.bottomPerformer.id)} /></div>}
                 </div>
            </Modal>
            <Modal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} title="¿Qué es el Análisis del Ordeño?"><div className="text-zinc-300 space-y-4 text-base"><p>Clasifica animales (Pobre, Promedio, Sobresaliente) usando la media (μ) y desviación estándar (σ).</p><div><h4 className="font-semibold text-white mb-1">Ponderado a DEL (<Sparkles size={12} className="inline-block mb-0.5"/>)</h4><p className="text-sm">Activa este cálculo para dar más valor a la producción temprana (persistencia).</p></div></div></Modal>
            <Modal isOpen={isScoreInfoModalOpen} onClose={() => setIsScoreInfoModalOpen(false)} title="¿Qué es el Score Ponderado?"><div className="text-zinc-300 space-y-4 text-base"><p>Ajusta la producción para premiar la **persistencia lechera**.</p><div><h4 className="font-semibold text-white mb-1">Fórmula</h4><div className="bg-black/30 p-3 rounded-lg text-sm font-mono text-center text-orange-300">Score = Kg × (1 + ((DEL - 50) / (DEL + 50)))</div></div><p className="pt-2 border-t border-zinc-700/80 text-sm">2 Kg en día **200** valen más que 2 Kg en día 40.</p></div></Modal>
            
            {/* --- USO DE formatAnimalDisplay en título --- */}
            {trendModalAnimal && <Modal isOpen={!!trendModalAnimal} onClose={() => setTrendModalAnimal(null)} title={`Tendencia de ${formatAnimalDisplay(trendModalAnimal)}`}><TrendModalContent animalId={trendModalAnimal.id} /></Modal>}
            
            {/* Modal para mostrar animales que salieron del control */}
            <ExitingAnimalsModal
                isOpen={isExitingAnimalsModalOpen}
                onClose={() => setIsExitingAnimalsModalOpen(false)}
                animalIds={Array.from(pageData.exitingAnimalIds)}
                onSelectAnimal={onSelectAnimal} // Permitir navegar al perfil desde aquí
            />
            
            {/* ActionSheet para acciones rápidas */}
            <ActionSheetModal
                isOpen={isActionSheetOpen}
                onClose={() => setIsActionSheetOpen(false)}
                 // --- USO DE formatAnimalDisplay en título ---
                title={`Acciones para ${formatAnimalDisplay(actionSheetAnimal)}`}
                actions={getActionsForAnimal(actionSheetAnimal)}
            />
            
             {/* Modal para añadir/editar pesaje */}
             {activeModal === 'milkWeighing' && actionSheetAnimal && (
                 <AddMilkWeighingModal
                     animal={actionSheetAnimal}
                     onCancel={closeModal}
                     onSaveSuccess={closeModal}
                 />
             )}

            {/* Modal para confirmar borrado de sesión */}
            {currentDate && <DeleteSessionModal
                isOpen={isDeleteSessionModalOpen}
                onClose={() => setIsDeleteSessionModalOpen(false)}
                onConfirm={handleDeleteCurrentSession}
                dateToDelete={currentDate}
            />}
        </>
    );
}