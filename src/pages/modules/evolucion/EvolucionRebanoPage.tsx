import React, { useState } from 'react';
// --- V6.2: Importaciones de Recharts para el gráfico ---
import { 
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer 
} from 'recharts';
// Íconos (Completos) - Todos se usan ahora
import { 
    TrendingUp, TrendingDown, ShoppingCart, Activity, Baby, Skull, UserMinus, 
    Percent, BarChartHorizontal, ChevronDown, ChevronUp, PieChart 
} from 'lucide-react';
// Hook y Tipos V6.1
import { useHerdEvolution, AnnualEvolutionStep, SemestralEvolutionStep, SimulationConfig, MonthlyEvolutionStep } from '../../../hooks/useHerdEvolution'; // ¡Verifica esta ruta!
// --- FASE 3: Importar el nuevo Modal ---
import { DetailedReportModal } from './DetailedReportModal'; // ¡Verifica esta ruta!

// -----------------------------------------------------------------------------
// --- Componente KpiRow (V6.1 - CÓDIGO COMPLETO) ---
// -----------------------------------------------------------------------------
type KpiRowProps = {
  data: AnnualEvolutionStep | SemestralEvolutionStep;
};

// (Función auxiliar interna)
const formatNum = (num: number | undefined): number => Math.round(num || 0);

const KpiRow: React.FC<KpiRowProps> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const formatPercent = (num: number | undefined): string => (num || 0).toFixed(1);

  // --- V6.1: CÁLCULO DE VIENTRES (CORREGIDO REDONDEO) ---
  const kpiStartProductivasCount = formatNum(data.startCabras) + formatNum(data.startLevanteTardio);
  const kpiEndProductivasCount = formatNum(data.endCabras) + formatNum(data.endLevanteTardio);
  
  // --- V6.1: CÁLCULO DE CRECIMIENTO (CORREGIDO REDONDEO) ---
  const kpiStartCrecimientoCount = formatNum(data.startLevanteTemprano) + formatNum(data.startLevanteMedio) + formatNum(data.startCriaH);
  const kpiEndCrecimientoCount = formatNum(data.endLevanteTemprano) + formatNum(data.endLevanteMedio) + formatNum(data.endCriaH);

  // --- V6.1: CÁLCULO DE HEMBRAS TOTALES (NUEVO) ---
  const kpiStartHembrasTotales = kpiStartProductivasCount + kpiStartCrecimientoCount;
  const kpiEndHembrasTotales = kpiEndProductivasCount + kpiEndCrecimientoCount;

  // --- V4.2: Calcular Crecimiento de Vientres ---
  const netChangeVientres = kpiEndProductivasCount - kpiStartProductivasCount;
  const growthRateVientres = kpiStartProductivasCount > 0 ? (netChangeVientres / kpiStartProductivasCount) * 100 : 0;
  const isPositiveVientres = netChangeVientres >= 0;
  const TrendIconVientres = isPositiveVientres ? TrendingUp : TrendingDown;
  const trendColorVientres = isPositiveVientres ? 'text-green-500' : 'text-red-500'; // Estilo Stocks

  // --- V6.1: Calcular Crecimiento de Hembras Totales ---
  const netChangeHembras = kpiEndHembrasTotales - kpiStartHembrasTotales;
  const growthRateHembras = kpiStartHembrasTotales > 0 ? (netChangeHembras / kpiStartHembrasTotales) * 100 : 0;
  const isPositiveHembras = netChangeHembras >= 0;
  const TrendIconHembras = isPositiveHembras ? TrendingUp : TrendingDown;
  const trendColorHembras = isPositiveHembras ? 'text-green-500' : 'text-red-500';


  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-gray-800/50 shadow-md backdrop-blur-lg">
      {/* Botón Clickable */}
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full p-5 text-left focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-t-xl">
        <div className="flex items-start justify-between">
          {/* KPIs Principales */}
          <div className="flex-1 space-y-1">
            <p className="text-lg font-bold text-white">{data.periodLabel}</p>
            <div className="flex items-baseline gap-3">
               <p className="text-4xl font-bold leading-none text-white">{kpiEndProductivasCount}</p>
               <p className="text-2xl font-medium text-gray-400">(Inicio: {kpiStartProductivasCount})</p>
            </div>
            <p className="text-sm text-gray-400">Vientres Productivos (Final vs. Inicial)</p>
            <p className="text-sm text-gray-400 pt-1">
              Hembras Totales: <span className="font-semibold text-white">{kpiEndHembrasTotales}</span> (Inicio: {kpiStartHembrasTotales})
            </p>
          </div>
          {/* Crecimiento */}
          <div className="flex-1 text-right space-y-2">
            <div className={`text-right ${trendColorVientres}`}>
              <div className="flex items-center justify-end gap-1"> 
                <TrendIconVientres size="1.2em" /> 
                <p className="text-xl font-bold">{formatPercent(growthRateVientres)}%</p> 
              </div>
              <p className="text-lg font-medium">{isPositiveVientres ? '+' : ''}{netChangeVientres} Vientres</p>
            </div>
            <div className={`text-right text-xs ${trendColorHembras} opacity-70`}>
              <div className="flex items-center justify-end gap-1"> 
                <TrendIconHembras size="1em" /> 
                <p className="font-semibold">{formatPercent(growthRateHembras)}%</p> 
              </div>
              <p className="font-medium">{isPositiveHembras ? '+' : ''}{netChangeHembras} Hembras Totales</p>
            </div>
          </div>
          {/* Icono Expansión */}
          <div className="ml-4 text-gray-500 pt-2"> {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />} </div>
        </div>
      </button>
      
      {/* --- INICIO CÓDIGO FALTANTE (AHORA INCLUIDO) --- */}
      {/* --- Sección Expandible --- */}
      {isExpanded && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4 animate-fade-in">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">

            {/* Col 1: Desglose Final */}
            <div className="space-y-0.5 md:pr-4 md:border-r md:border-white/10">
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Desglose Final (Periodo)</p>
              <p className="text-sm text-gray-200"><span className="font-bold text-white">{formatNum(data.endCabras)}</span> Cabras ({'>'}18m)</p>
              <p className="text-sm text-gray-200"><span className="font-bold text-white">{formatNum(data.endLevanteTardio)}</span> L. Tardío (12-18m)</p>
              <p className="text-sm text-gray-200"><span className="font-bold text-white">{formatNum(data.endLevanteMedio)}</span> L. Medio (6-12m)</p>
              <p className="text-sm text-gray-200"><span className="font-bold text-white">{formatNum(data.endLevanteTemprano)}</span> L. Temprano (3-6m)</p>
              <p className="text-sm text-gray-200"><span className="font-bold text-white">{formatNum(data.endCriaH)}</span> Crías H (0-3m)</p>
              <p className="text-sm text-gray-200"><span className="font-bold text-white">{formatNum(data.endCriaM)}</span> Crías M (0-3m)</p>
              <p className="text-sm text-gray-200"><span className="font-bold text-white">{formatNum(data.endPadres)}</span> Padres ({'>'}12m)</p>
              <hr className="my-1 border-white/10" />
              <p className="text-sm text-gray-100"><span className="font-bold text-white">{formatNum(data.endTotal)}</span> Animales Totales (Final)</p>
            </div>
            
            {/* Col 2: Movimientos */}
            <div className="space-y-3 md:pr-4 md:border-r md:border-white/10">
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Movimientos del Periodo</p>
              {/* Nacimientos */}
              <div className="space-y-0.5">
                 <div className="flex items-center gap-2 text-green-400 text-sm">
                   <Baby size={14} className="flex-shrink-0" />
                   <span className="font-semibold">{formatNum(data.nacimientosH + data.nacimientosM)} Nacimientos Totales</span>
                 </div>
                 <div className="ml-6 text-xs text-gray-300">
                    <div>{formatNum(data.nacimientosH)} Hembras (0-3m)</div>
                    <div>{formatNum(data.nacimientosM)} Machos (0-3m)</div>
                 </div>
              </div>
              {/* Promociones */}
              <div className="space-y-0.5">
                 <div className="flex items-center gap-2 text-blue-400 text-sm">
                   <Activity size={14} className="flex-shrink-0" />
                   <span className="font-semibold">Promociones (Hembras)</span>
                 </div>
                 <div className="ml-6 text-xs text-gray-300">
                    <div>{formatNum(data.promocionCriaH)} Cría H → L. Temprano</div>
                    <div>{formatNum(data.promocionLevanteTemprano)} L. Temprano → L. Medio</div>
                    <div>{formatNum(data.promocionLevanteMedio)} L. Medio → L. Tardío</div>
                    <div>{formatNum(data.promocionLevanteTardio)} L. Tardío → Cabras</div>
                 </div>
              </div>
              {/* Muertes */}
              <div className="space-y-0.5">
                 <div className="flex items-center gap-2 text-red-400 text-sm">
                   <Skull size={14} className="flex-shrink-0" />
                   <span className="font-semibold">{formatNum(data.muertesTotales)} Muertes</span>
                 </div>
                 <div className="ml-6 text-xs text-gray-300">
                     {data.muertesCriaH > 0 && <div>{formatNum(data.muertesCriaH)} Crías H (0-3m)</div>}
                     {data.muertesCriaM > 0 && <div>{formatNum(data.muertesCriaM)} Crías M (0-3m)</div>}
                     {data.muertesLevanteTemprano > 0 && <div>{formatNum(data.muertesLevanteTemprano)} L. Temprano (3-6m)</div>}
                     {data.muertesLevanteMedio > 0 && <div>{formatNum(data.muertesLevanteMedio)} L. Medio (6-12m)</div>}
                     {data.muertesLevanteTardio > 0 && <div>{formatNum(data.muertesLevanteTardio)} L. Tardío (12-18m)</div>}
                     {data.muertesCabras > 0 && <div>{formatNum(data.muertesCabras)} Cabras ({'>'}18m)</div>}
                     {data.muertesPadres > 0 && <div>{formatNum(data.muertesPadres)} Padres</div>}
                 </div>
              </div>
              {/* Eliminaciones y Descarte */}
              <div className="space-y-0.5">
                 <div className="flex items-center gap-2 text-red-400 text-sm">
                   <UserMinus size={14} className="flex-shrink-0" />
                   <span className="font-semibold">{formatNum(data.ventasTotales)} Ventas (Elim./Descarte)</span>
                 </div>
                 <div className="ml-6 text-xs text-gray-300">
                    {data.ventasCabritos > 0 && <div>{formatNum(data.ventasCabritos)} Crías M (Eliminación)</div>}
                    {data.ventasDescartes > 0 && <div>{formatNum(data.ventasDescartes)} Cabras (Descarte)</div>}
                 </div>
              </div>
              {/* Compras (Opcional) */}
              {data.comprasTotales > 0 && (
                <div className="space-y-0.5">
                   <div className="flex items-center gap-2 text-green-400 text-sm">
                     <ShoppingCart size={14} className="flex-shrink-0" />
                     <span className="font-semibold">{formatNum(data.comprasTotales)} Compras</span>
                   </div>
                   <div className="ml-6 text-xs text-gray-300">
                      {data.comprasVientres > 0 && <div>{formatNum(data.comprasVientres)} Vientres (12-18m)</div>}
                      {data.comprasPadres > 0 && <div>{formatNum(data.comprasPadres)} Padres</div>}
                   </div>
                </div>
              )}
            </div>
            
            {/* Col 3: KPIs Productivos */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Capacidad Productiva (Inicio → Fin)</p>
              <div className="space-y-1 text-sm text-gray-300">
                  {/* --- Vientres Productivos (Inicio -> Fin) --- */}
                  <div className="flex items-center justify-between"> 
                    <span className="flex items-center gap-1.5"><BarChartHorizontal size={12}/> Vientres Productivos ({'>'}12m)</span> 
                    <span className="font-semibold text-white">
                      {kpiStartProductivasCount} → {kpiEndProductivasCount}
                    </span> 
                  </div>
                  {/* --- % Vientres (Final) --- */}
                  <div className="flex items-center justify-between"> 
                    <span className="flex items-center gap-1.5"><Percent size={12}/> % Vientres Productivos (Final)</span> 
                    <span className="font-semibold text-white">{formatPercent(data.kpiProductivasPercent)}%</span> 
                  </div>
                  
                  <hr className="my-2 border-white/10" />

                  {/* --- Hembras Crecimiento (Inicio -> Fin) --- */}
                  <div className="flex items-center justify-between"> 
                    <span className="flex items-center gap-1.5"><TrendingUp size={12}/> Hembras en Crecimiento ({'<'}12m)</span> 
                    <span className="font-semibold text-white">
                      {kpiStartCrecimientoCount} → {kpiEndCrecimientoCount}
                    </span> 
                  </div>
                  {/* --- % Crecimiento (Final) --- */}
                  <div className="flex items-center justify-between"> 
                    <span className="flex items-center gap-1.5"><Percent size={12}/> % Hembras en Crecimiento (Final)</span> 
                    <span className="font-semibold text-white">{formatPercent(data.kpiCrecimientoPercent)}%</span> 
                  </div>
              </div>
            </div>

          </div>
        </div>
      )}
      {/* --- FIN CÓDIGO FALTANTE --- */}
    </div>
  );
};

// -----------------------------------------------------------------------------
// --- Componente SegmentedControl (SIN CAMBIOS) ---
// -----------------------------------------------------------------------------
interface SegmentedControlProps<T extends string | number> { options: { label: string; value: T }[]; value: T; onChange: (value: T) => void; }
const SegmentedControl = <T extends string | number>({ options, value, onChange }: SegmentedControlProps<T>) => ( <div className="flex rounded-lg bg-gray-700 p-0.5"> {options.map((opt) => ( <button key={String(opt.value)} onClick={() => onChange(opt.value)} className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${ value === opt.value ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-300 hover:text-white' }`} > {opt.label} </button> ))} </div> );

// -----------------------------------------------------------------------------
// --- V6.3: COMPONENTE Tooltip Interactivo (CORREGIDO) ---
// -----------------------------------------------------------------------------
const CustomTooltip: React.FC<any> = ({ active, payload }) => { // Corregido: label -> _label
  if (active && payload && payload.length) {
    const data: MonthlyEvolutionStep = payload[0].payload;
    
    // Corregido: Añadir tipos a sum y entry
    const totalHembras = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);

    return (
      <div className="bg-gray-900/80 p-3 rounded-lg border border-white/10 shadow-lg backdrop-blur-md animate-fade-in">
        <p className="text-sm font-bold text-white">{data.periodLabel}</p>
        <p className="text-lg font-mono text-white">Total Hembras: {formatNum(totalHembras)}</p>
        <hr className="border-white/10 my-1.5" />
        <div className="space-y-1">
          {payload.slice().reverse().map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span style={{ backgroundColor: entry.color }} className="w-2.5 h-2.5 rounded-full" />
                <span className="text-xs text-gray-300">{entry.name}</span>
              </div>
              <span className="text-xs font-mono text-white">{formatNum(entry.value)}</span>
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
// --- V6.3: COMPONENTE Gráfico de Población (ACTUALIZADO) ---
// -----------------------------------------------------------------------------
const PopulationChart: React.FC<{ data: MonthlyEvolutionStep[] }> = ({ data }) => {
  
  // IDs únicos para los gradientes
  const gradientIds = {
    cabras: "colorCabras",
    lTardio: "colorLTardio",
    lMedio: "colorLMedio",
    lTemprano: "colorLTemprano",
    criaH: "colorCriaH",
  };
  
  // Colores (estilo iOS / Weather)
  const colors = {
    cabras: "#5856D6",    // Púrpura iOS
    lTardio: "#007AFF",   // Azul iOS
    lMedio: "#34C759",    // Verde iOS
    lTemprano: "#FF9500", // Naranja iOS
    criaH: "#FFCC00",     // Amarillo iOS
  };

  // Formatter para el eje X: Muestra etiquetas solo al inicio de cada año
  const formatXAxis = (monthIndex: number) => {
    const step = data[monthIndex];
    if (step && (step.month === 1 || monthIndex === 0)) { // Si es Enero o el primer mes
      return `Año ${step.year}`;
    }
    // Muestra cada 6 meses (Julio)
    if (step && step.month === 7) {
      return `S2`;
    }
    return ''; // Ocultar otras etiquetas
  };

  return (
    <div className="h-60 w-full rounded-xl bg-gray-800/50 p-4 border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }} stackOffset="none">
          {/* 1. Definición de Gradientes (Estilo Weather) */}
          <defs>
            <linearGradient id={gradientIds.cabras} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.cabras} stopOpacity={0.7}/>
              <stop offset="95%" stopColor={colors.cabras} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id={gradientIds.lTardio} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.lTardio} stopOpacity={0.7}/>
              <stop offset="95%" stopColor={colors.lTardio} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id={gradientIds.lMedio} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.lMedio} stopOpacity={0.7}/>
              <stop offset="95%" stopColor={colors.lMedio} stopOpacity={0.1}/>
            </linearGradient>
            <linearGradient id={gradientIds.lTemprano} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.lTemprano} stopOpacity={0.7}/>
              <stop offset="95%" stopColor={colors.lTemprano} stopOpacity={0.1}/>
            </linearGradient>
             <linearGradient id={gradientIds.criaH} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={colors.criaH} stopOpacity={0.7}/>
              <stop offset="95%" stopColor={colors.criaH} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          
          {/* 2. Rejilla y Ejes Minimalistas */}
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis dataKey="monthIndex" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatXAxis} padding={{ left: 10, right: 10 }} />
          <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatYAxis} />

          {/* 3. Tooltip Interactivo (Estilo Stocks) */}
          <Tooltip content={<CustomTooltip />} />
          
          {/* 4. Las Áreas Apiladas (SOLO HEMBRAS) */}
          <Area 
            type="monotone" 
            dataKey="endCabras" 
            name="Cabras (>18m)"
            stackId="1"
            stroke={colors.cabras}
            strokeWidth={2}
            fill={`url(#${gradientIds.cabras})`}
            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: colors.cabras }}
          />
          <Area 
            type="monotone" 
            dataKey="endLevanteTardio" 
            name="L. Tardío (12-18m)"
            stackId="1"
            stroke={colors.lTardio}
            strokeWidth={2}
            fill={`url(#${gradientIds.lTardio})`}
            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: colors.lTardio }}
          />
          <Area 
            type="monotone" 
            dataKey="endLevanteMedio" 
            name="L. Medio (6-12m)"
            stackId="1"
            stroke={colors.lMedio}
            strokeWidth={2}
            fill={`url(#${gradientIds.lMedio})`}
            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: colors.lMedio }}
          />
          <Area 
            type="monotone" 
            dataKey="endLevanteTemprano" 
            name="L. Temprano (3-6m)"
            stackId="1"
            stroke={colors.lTemprano}
            strokeWidth={2}
            fill={`url(#${gradientIds.lTemprano})`}
            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: colors.lTemprano }}
          />
          <Area 
            type="monotone" 
            dataKey="endCriaH" 
            name="Crías H (0-3m)"
            stackId="1"
            stroke={colors.criaH}
            strokeWidth={2}
            fill={`url(#${gradientIds.criaH})`}
            activeDot={{ r: 6, stroke: 'white', strokeWidth: 2, fill: colors.criaH }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};


// -----------------------------------------------------------------------------
// --- Página Principal (V6.3 - Gráfico Reemplazado) ---
// -----------------------------------------------------------------------------
interface EvolucionRebanoPageProps { simulationConfig: SimulationConfig; mode: 'simulacion' | 'real'; }

export const EvolucionRebanoPage: React.FC<EvolucionRebanoPageProps> = ({ simulationConfig, mode }) => {
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [horizon, setHorizon] = useState(3);
    const [view, setView] = useState<'Anual' | 'Semestral'>('Anual');
    const { annualData, semestralData, monthlyData } = useHerdEvolution(simulationConfig, horizon); 
    const dataToShow: (AnnualEvolutionStep | SemestralEvolutionStep)[] = view === 'Anual' ? annualData : semestralData;
    const horizonOptions = [ { label: '1 Año', value: 1 }, { label: '3 Años', value: 3 }, { label: '5 Años', value: 5 }, { label: '10 Años', value: 10 } ];
    const viewOptions = [ { label: 'Anual', value: 'Anual' as 'Anual' }, { label: 'Semestral', value: 'Semestral' as 'Semestral' } ];

    return (
        <div className="mx-auto max-w-4xl px-4 py-8">
            <div className="flex flex-col items-stretch gap-6">
                <h1 className="text-2xl font-bold text-white"> Evolución del Rebaño <span className="ml-3 font-normal text-gray-400">({mode === 'simulacion' ? 'Simulación' : 'Proyección Real'})</span> </h1>
                
                {/* Controles (Sin cambios) */}
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                    <div className="flex items-center gap-2"> 
                      <span className="text-sm text-gray-400">Horizonte:</span> 
                      <SegmentedControl options={horizonOptions} value={horizon} onChange={(v) => setHorizon(v as number)} /> 
                    </div>
                    <div className="flex items-center gap-2"> 
                      <span className="text-sm text-gray-400">Vista:</span> 
                      <SegmentedControl options={viewOptions} value={view} onChange={(v) => setView(v as 'Anual' | 'Semestral')} /> 
                    </div>
                    <button
                      onClick={() => setIsReportOpen(true)}
                      disabled={!annualData || annualData.length === 0}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-sky-300 transition-colors hover:bg-gray-600 disabled:opacity-50 md:w-auto"
                    >
                      <PieChart size={16} />
                      Reporte Detallado
                    </button>
                </div>

                {/* --- V6.3: GRÁFICO REEMPLAZADO --- */}
                <PopulationChart data={monthlyData} />
                
                {/* Lista de KPIs (Sin cambios) */}
                <div className="flex flex-col items-stretch gap-4">
                    {dataToShow.map((item) => {
                        const key = view === 'Anual' ? `anno-${(item as AnnualEvolutionStep).year}` : `sem-${(item as SemestralEvolutionStep).semestreIndex}`;
                        return ( <KpiRow key={key} data={item} /> );
                    })}
                </div>
            </div>

            {/* Modal (Sin cambios) */}
            <DetailedReportModal
              isOpen={isReportOpen}
              onClose={() => setIsReportOpen(false)}
              monthlyData={monthlyData}
              semestralData={semestralData}
              annualData={annualData}
            />
        </div>
    );
};