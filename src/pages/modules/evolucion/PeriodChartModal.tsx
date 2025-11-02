import React, { useMemo, useState } from 'react';
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer 
} from 'recharts';
import { X, Check, EyeOff } from 'lucide-react';
import { 
  MonthlyEvolutionStep, 
  AnnualEvolutionStep, 
  SemestralEvolutionStep 
} from '../../../hooks/useHerdEvolution'; // ¡Verifica esta ruta!
import { formatNumber } from '../../../utils/formatters'; // ¡Verifica esta ruta!

// -----------------------------------------------------------------------------
// --- V7.1: Definición de Categorías y Colores (Constante) ---
// -----------------------------------------------------------------------------
const CATEGORIES = [
  { key: 'endCabras', name: 'Cabras (>18m)', color: "#5856D6", gradientId: "colorCabrasPeriod" },
  { key: 'endLevanteTardio', name: 'L. Tardío (12-18m)', color: "#007AFF", gradientId: "colorLTardioPeriod" },
  { key: 'endLevanteMedio', name: 'L. Medio (6-12m)', color: "#34C759", gradientId: "colorLMedioPeriod" },
  { key: 'endLevanteTemprano', name: 'L. Temprano (3-6m)', color: "#FF9500", gradientId: "colorLTempranoPeriod" },
  { key: 'endCriaH', name: 'Crías H (0-3m)', color: "#FFCC00", gradientId: "colorCriaHPeriod" },
];
// Array de todas las keys para el estado inicial
const allCategoryKeys = CATEGORIES.map(c => c.key as keyof MonthlyEvolutionStep);

// -----------------------------------------------------------------------------
// --- COMPONENTE Tooltip Interactivo ---
// -----------------------------------------------------------------------------
const CustomTooltip: React.FC<any> = ({ active, payload }) => { 
  if (active && payload && payload.length) {
    const data: MonthlyEvolutionStep = payload[0].payload;
    const totalHembras = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);

    return (
      <div className="bg-gray-900/80 p-3 rounded-lg border border-white/10 shadow-lg backdrop-blur-md animate-fade-in">
        <p className="text-sm font-bold text-white">{data.periodLabel}</p>
        <p className="text-lg font-mono text-white">Total Hembras: {formatNumber(totalHembras, 0)}</p>
        <hr className="border-white/10 my-1.5" />
        <div className="space-y-1">
          {payload.slice().reverse().map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span style={{ backgroundColor: entry.color }} className="w-2.5 h-2.5 rounded-full" />
                <span className="text-xs text-gray-300">{entry.name}</span>
              </div>
              <span className="text-xs font-mono text-white">{formatNumber(entry.value, 0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};
// Formatter simple para el eje Y
const formatYAxis = (tick: number) => {
  if (tick >= 1000) return `${(tick / 1000).toFixed(0)}k`; // 1000 -> 1k
  return tick.toString();
};

// -----------------------------------------------------------------------------
// --- Componente de Filtros ---
// -----------------------------------------------------------------------------
interface ChartFilterControlsProps {
  visibleCategories: (keyof MonthlyEvolutionStep)[];
  onToggleCategory: (key: keyof MonthlyEvolutionStep) => void;
}

const ChartFilterControls: React.FC<ChartFilterControlsProps> = ({ visibleCategories, onToggleCategory }) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-2 border-b border-brand-border">
      {CATEGORIES.map(cat => {
        const isVisible = visibleCategories.includes(cat.key as keyof MonthlyEvolutionStep);
        return (
          <button
            key={cat.key}
            onClick={() => onToggleCategory(cat.key as keyof MonthlyEvolutionStep)}
            className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
              isVisible 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-800 text-gray-500 hover:bg-gray-700 hover:text-gray-400'
            }`}
          >
            <span style={{ backgroundColor: cat.color }} className="w-2.5 h-2.5 rounded-full" />
            {cat.name}
            {isVisible ? <Check size={14} /> : <EyeOff size={14} />}
          </button>
        );
      })}
    </div>
  );
};

// -----------------------------------------------------------------------------
// --- COMPONENTE Gráfico de Población ---
// -----------------------------------------------------------------------------
const PeriodChartComponent: React.FC<{ 
  data: (MonthlyEvolutionStep & { name: string })[]; // Data ya filtrada y con 'name'
  visibleCategories: (keyof MonthlyEvolutionStep)[]; 
}> = ({ data, visibleCategories }) => {
  
  return (
    <div className="h-[calc(90vh-200px)] w-full p-4"> {/* Altura ajustada */}
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 5 }} stackOffset="none">
          {/* Definición de Gradientes */}
          <defs>
            {CATEGORIES.map(cat => (
              <linearGradient key={cat.gradientId} id={cat.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={cat.color} stopOpacity={0.7}/>
                <stop offset="95%" stopColor={cat.color} stopOpacity={0.1}/>
              </linearGradient>
            ))}
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} vertical={false} />
          <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} padding={{ left: 10, right: 10 }} />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis} width={40} />

          <Tooltip content={<CustomTooltip />} />
          
          {/* V7.1: Áreas Apiladas Dinámicas */}
          {CATEGORIES.map(cat => {
            if (!visibleCategories.includes(cat.key as keyof MonthlyEvolutionStep)) return null;
            return (
              <Area 
                key={cat.key}
                type="monotone" 
                dataKey={cat.key} 
                name={cat.name}
                stackId="1"
                stroke={cat.color}
                strokeWidth={2}
                fill={`url(#${cat.gradientId})`}
                activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: cat.color }}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};


// -----------------------------------------------------------------------------
// --- COMPONENTE PeriodChartModal (V7.1) ---
// -----------------------------------------------------------------------------
interface PeriodChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyData: MonthlyEvolutionStep[];
  periodData: AnnualEvolutionStep | SemestralEvolutionStep | null;
}

export const PeriodChartModal: React.FC<PeriodChartModalProps> = ({
  isOpen,
  onClose,
  monthlyData,
  periodData,
}) => {
  
  const [visibleCategories, setVisibleCategories] = useState<(keyof MonthlyEvolutionStep)[]>(allCategoryKeys);

  const handleToggleCategory = (keyToToggle: keyof MonthlyEvolutionStep) => {
    setVisibleCategories(prev => {
      const isVisible = prev.includes(keyToToggle);
      if (isVisible) {
        if (prev.length === 1) return prev; // No permitir desactivar el último
        return prev.filter(key => key !== keyToToggle);
      } else {
        return [...prev, keyToToggle];
      }
    });
  };

  // --- Lógica de Filtrado de Datos ---
  const periodMonthlyData = useMemo(() => {
    if (!periodData || !monthlyData) return [];
    
    let startIndex = 0;
    let count = 0;
    const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

    if ('semestreIndex' in periodData) { // Es Semestral
      startIndex = (periodData.semestreIndex || 0) * 6;
      count = 6;
    } else { // Es Anual
      startIndex = (periodData.year - 1) * 12;
      count = 12;
    }

    // Asegurarse de que el slice no se salga de los límites
    const slicedData = monthlyData.slice(startIndex, startIndex + count);
    
    // Mapear los datos para el gráfico
    return slicedData.map(step => ({
      ...step,
      // Crear el label para el X-Axis
      name: monthLabels[step.month - 1] 
    }));
  }, [periodData, monthlyData]);

  if (!isOpen || !periodData) {
    return null;
  }

  return (
    // Contenedor principal (Overlay)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Panel del Modal (V7.1: Más Ancho) */}
      <div
        className="relative flex flex-col w-full h-full max-w-6xl max-h-[90vh] bg-gray-900 border border-brand-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()} 
      >
        {/* Cabecera del Modal */}
        <header className="flex items-center justify-between p-4 border-b border-brand-border flex-shrink-0">
          <h1 className="text-xl font-bold text-white">Evolución de Hembras: {periodData.periodLabel}</h1>
          <button
            onClick={onClose}
            title="Cerrar"
            className="p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </header>

        {/* V7.1: Barra de Filtros */}
        <ChartFilterControls 
          visibleCategories={visibleCategories}
          onToggleCategory={handleToggleCategory}
        />

        {/* Contenido Principal: El gráfico */}
        <main className="flex-1 overflow-hidden bg-gray-900/50 flex items-center justify-center">
          {periodMonthlyData.length > 0 ? (
            <PeriodChartComponent 
              data={periodMonthlyData} 
              visibleCategories={visibleCategories} 
            />
          ) : (
            <p className="text-gray-400">No hay datos para mostrar el gráfico.</p>
          )}
        </main>
      </div>
    </div>
  );
};