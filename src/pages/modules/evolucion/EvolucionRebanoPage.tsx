// --- ARCHIVO: src/pages/modules/evolucion/EvolucionRebanoPage.tsx ---
// (Actualizado para V8.5 - Prop 'onSimulate' eliminada)

import React, { useState } from 'react';
import { 
    TrendingUp, TrendingDown, ShoppingCart, Activity, Baby, Skull, UserMinus, 
    Percent, BarChartHorizontal, ChevronDown, ChevronUp, PieChart, LineChart, Download
} from 'lucide-react';
import { 
  useHerdEvolution, 
  AnnualEvolutionStep, 
  SemestralEvolutionStep, 
  SimulationConfig,
} from '../../../hooks/useHerdEvolution';
import { DetailedReportModal } from './DetailedReportModal';
import { PopulationChartModal } from './PopulationChartModal';
import { PeriodChartModal } from './PeriodChartModal';
import { exportPeriodReport } from '../../../utils/pdfPeriodExporter';

// -----------------------------------------------------------------------------
// --- Componente KpiRow (Sin Cambios) ---
// -----------------------------------------------------------------------------
type KpiRowProps = {
  data: AnnualEvolutionStep | SemestralEvolutionStep;
  onViewYearChart: (data: AnnualEvolutionStep | SemestralEvolutionStep) => void;
  onExportPeriodPdf: (data: AnnualEvolutionStep | SemestralEvolutionStep) => void;
};

const formatNum = (num: number | undefined): number => Math.round(num || 0);

const KpiRow: React.FC<KpiRowProps> = ({ data, onViewYearChart, onExportPeriodPdf }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatPercent = (num: number | undefined): string => (num || 0).toFixed(1);
  const kpiStartProductivasCount = formatNum(data.startCabras) + formatNum(data.startLevanteTardio);
  const kpiEndProductivasCount = formatNum(data.endCabras) + formatNum(data.endLevanteTardio);
  const kpiStartCrecimientoCount = formatNum(data.startLevanteTemprano) + formatNum(data.startLevanteMedio) + formatNum(data.startCriaH);
  const kpiEndCrecimientoCount = formatNum(data.endLevanteTemprano) + formatNum(data.endLevanteMedio) + formatNum(data.endCriaH);
  const kpiStartHembrasTotales = kpiStartProductivasCount + kpiStartCrecimientoCount;
  const kpiEndHembrasTotales = kpiEndProductivasCount + kpiEndCrecimientoCount;
  const netChangeVientres = kpiEndProductivasCount - kpiStartProductivasCount;
  const growthRateVientres = kpiStartProductivasCount > 0 ? (netChangeVientres / kpiStartProductivasCount) * 100 : 0;
  const isPositiveVientres = netChangeVientres >= 0;
  const TrendIconVientres = isPositiveVientres ? TrendingUp : TrendingDown;
  const trendColorVientres = isPositiveVientres ? 'text-green-500' : 'text-red-500';
  const netChangeHembras = kpiEndHembrasTotales - kpiStartHembrasTotales;
  const growthRateHembras = kpiStartHembrasTotales > 0 ? (netChangeHembras / kpiStartHembrasTotales) * 100 : 0;
  const isPositiveHembras = netChangeHembras >= 0;
  const TrendIconHembras = isPositiveHembras ? TrendingUp : TrendingDown;
  const trendColorHembras = isPositiveHembras ? 'text-green-500' : 'text-red-500';

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/10 bg-gray-800/50 shadow-md backdrop-blur-lg">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full p-5 text-left focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-t-xl">
        <div className="flex items-start justify-between">
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
          <div className="ml-4 text-gray-500 pt-2"> {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />} </div>
        </div>
      </button>

      {isExpanded && (
        <div className="relative border-t border-white/10 px-5 pb-14 pt-4 animate-fade-in">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
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
            
            <div className="space-y-3 md:pr-4 md:border-r md:border-white/10">
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Movimientos del Periodo</p>
              <div className="space-y-0.5">
                 <div className="flex items-center gap-2 text-green-400 text-sm"><Baby size={14} /> <span className="font-semibold">{formatNum(data.nacimientosH + data.nacimientosM)} Nacimientos Totales</span></div>
                 <div className="ml-6 text-xs text-gray-300"><div>{formatNum(data.nacimientosH)} Hembras (0-3m)</div> <div>{formatNum(data.nacimientosM)} Machos (0-3m)</div></div>
              </div>
              <div className="space-y-0.5">
                 <div className="flex items-center gap-2 text-blue-400 text-sm"><Activity size={14} /> <span className="font-semibold">Promociones (Hembras)</span></div>
                 <div className="ml-6 text-xs text-gray-300">
                    <div>{formatNum(data.promocionCriaH)} Cría H → L. Temprano</div>
                    <div>{formatNum(data.promocionLevanteTemprano)} L. Temprano → L. Medio</div>
                    <div>{formatNum(data.promocionLevanteMedio)} L. Medio → L. Tardío</div>
                    <div>{formatNum(data.promocionLevanteTardio)} L. Tardío → Cabras</div>
                 </div>
              </div>
              <div className="space-y-0.5">
                 <div className="flex items-center gap-2 text-red-400 text-sm"><Skull size={14} /> <span className="font-semibold">{formatNum(data.muertesTotales)} Muertes</span></div>
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
              <div className="space-y-0.5">
                 <div className="flex items-center gap-2 text-red-400 text-sm"><UserMinus size={14} /> <span className="font-semibold">{formatNum(data.ventasTotales)} Ventas (Elim./Descarte)</span></div>
                 <div className="ml-6 text-xs text-gray-300">
                    {data.ventasCabritos > 0 && <div>{formatNum(data.ventasCabritos)} Crías M (Eliminación)</div>}
                    {data.ventasDescartes > 0 && <div>{formatNum(data.ventasDescartes)} Cabras (Descarte)</div>}
                 </div>
              </div>
              {data.comprasTotales > 0 && (
                <div className="space-y-0.5">
                   <div className="flex items-center gap-2 text-green-400 text-sm"><ShoppingCart size={14} /> <span className="font-semibold">{formatNum(data.comprasTotales)} Compras</span></div>
                   <div className="ml-6 text-xs text-gray-300">
                      {data.comprasVientres > 0 && <div>{formatNum(data.comprasVientres)} Vientres (12-18m)</div>}
                      {data.comprasPadres > 0 && <div>{formatNum(data.comprasPadres)} Padres</div>}
                   </div>
                </div>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-400 mb-2">Capacidad Productiva (Inicio → Fin)</p>
              <div className="space-y-1 text-sm text-gray-300">
                  <div className="flex items-center justify-between"> 
                    <span className="flex items-center gap-1.5"><BarChartHorizontal size={12}/> Vientres Productivos ({'>'}12m)</span> 
                    <span className="font-semibold text-white">{kpiStartProductivasCount} → {kpiEndProductivasCount}</span> 
                  </div>
                  <div className="flex items-center justify-between"> 
                    <span className="flex items-center gap-1.5"><Percent size={12}/> % Vientres Productivos (Final)</span> 
                    <span className="font-semibold text-white">{formatPercent(data.kpiProductivasPercent)}%</span> 
                  </div>
                  <hr className="my-2 border-white/10" />
                  <div className="flex items-center justify-between"> 
                    <span className="flex items-center gap-1.5"><TrendingUp size={12}/> Hembras en Crecimiento ({'<'}12m)</span> 
                    <span className="font-semibold text-white">{kpiStartCrecimientoCount} → {kpiEndCrecimientoCount}</span> 
                  </div>
                  <div className="flex items-center justify-between"> 
                    <span className="flex items-center gap-1.5"><Percent size={12}/> % Hembras en Crecimiento (Final)</span> 
                    <span className="font-semibold text-white">{formatPercent(data.kpiCrecimientoPercent)}%</span> 
                  </div>
              </div>
            </div>
            
          </div>
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button 
                onClick={(e) => { e.stopPropagation(); onViewYearChart(data); }} 
                className="p-2 rounded-full text-gray-300 bg-gray-700/80 hover:text-white hover:bg-gray-600 transition-colors backdrop-blur-sm"
                title={`Ver evolución detallada de ${data.periodLabel}`}
            >
                <LineChart size={18} />
            </button>
            <button 
                onClick={(e) => { e.stopPropagation(); onExportPeriodPdf(data); }}
                className="p-2 rounded-full text-gray-300 bg-gray-700/80 hover:text-white hover:bg-gray-600 transition-colors backdrop-blur-sm ml-2"
                title={`Exportar ${data.periodLabel} a PDF`}
            >
                <Download size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// --- Componente SegmentedControl (SIN CAMBIOS) ---
// -----------------------------------------------------------------------------
interface SegmentedControlProps<T extends string | number> { options: { label: string; value: T }[]; value: T; onChange: (value: T) => void; }
const SegmentedControl = <T extends string | number>({ options, value, onChange }: SegmentedControlProps<T>) => ( <div className="flex rounded-lg bg-gray-700 p-0.5"> {options.map((opt) => ( <button key={String(opt.value)} onClick={() => onChange(opt.value)} className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${ value === opt.value ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-300 hover:text-white' }`} > {opt.label} </button> ))} </div> );


// -----------------------------------------------------------------------------
// --- Página Principal EvolucionRebanoPage (V8.5: 'onSimulate' ELIMINADO) ---
// -----------------------------------------------------------------------------
interface EvolucionRebanoPageProps { 
  simulationConfig: SimulationConfig; 
  mode: 'simulacion' | 'real';
  // V8.5: Prop 'onSimulate' eliminada
  // onSimulate: (config: SimulationConfig) => void; 
}

export const EvolucionRebanoPage: React.FC<EvolucionRebanoPageProps> = ({ 
  simulationConfig, 
  mode,
  // onSimulate // V8.5: Prop eliminada
}) => {
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isPopulationChartModalOpen, setIsPopulationChartModalOpen] = useState(false);

    const [isPeriodChartOpen, setIsPeriodChartOpen] = useState(false);
    const [selectedPeriodData, setSelectedPeriodData] = useState<AnnualEvolutionStep | SemestralEvolutionStep | null>(null);

    const [horizon, setHorizon] = useState(3);
    const [view, setView] = useState<'Anual' | 'Semestral'>('Anual');
    const { annualData, semestralData, monthlyData } = useHerdEvolution(simulationConfig, horizon); 
    const dataToShow: (AnnualEvolutionStep | SemestralEvolutionStep)[] = view === 'Anual' ? annualData : semestralData;
    const horizonOptions = [ { label: '1 Año', value: 1 }, { label: '3 Años', value: 3 }, { label: '5 Años', value: 5 }, { label: '10 Años', value: 10 } ];
    const viewOptions = [ { label: 'Anual', value: 'Anual' as 'Anual' }, { label: 'Semestral', value: 'Semestral' as 'Semestral' } ];

    const handleViewPeriodChart = (data: AnnualEvolutionStep | SemestralEvolutionStep) => {
      setSelectedPeriodData(data);
      setIsPeriodChartOpen(true);
    };

    const handleExportPeriodPdf = (data: AnnualEvolutionStep | SemestralEvolutionStep) => {
      exportPeriodReport(data);
    };

    return (
        <div className="py-8">
            <div className="flex flex-col items-stretch gap-6">
                <h1 className="text-2xl font-bold text-white max-w-4xl mx-auto px-4 text-center md:text-left"> Evolución del Rebaño <span className="ml-3 font-normal text-gray-400 hidden md:inline">({mode === 'simulacion' ? 'Simulación' : 'Proyección Real'})</span> </h1>
                
                <div className="flex flex-col items-center gap-4 max-w-4xl mx-auto px-4">
                  <div className="flex items-center gap-2 w-full justify-center"> 
                    <span className="text-sm text-gray-400 hidden md:inline">Horizonte:</span> 
                    <SegmentedControl options={horizonOptions} value={horizon} onChange={(v) => setHorizon(v as number)} /> 
                  </div>
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
                    <div className="flex items-center gap-2"> 
                      <span className="text-sm text-gray-400 hidden md:inline">Vista:</span> 
                      <SegmentedControl options={viewOptions} value={view} onChange={(v) => setView(v as 'Anual' | 'Semestral')} /> 
                    </div>
                    <div className="flex gap-2 mt-4 md:mt-0">
                      <button
                        onClick={() => setIsPopulationChartModalOpen(true)}
                        disabled={!monthlyData || monthlyData.length === 0}
                        className="flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-sky-300 transition-colors hover:bg-gray-600 disabled:opacity-50"
                        title="Ver gráfico de evolución de población"
                      >
                        <LineChart size={16} />
                        <span className="hidden sm:inline">Gráfico Total</span> 
                      </button>
                      <button
                        onClick={() => setIsReportOpen(true)}
                        disabled={!annualData || annualData.length === 0}
                        className="flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-1.5 text-sm font-medium text-sky-300 transition-colors hover:bg-gray-600 disabled:opacity-50"
                        title="Ver reporte detallado de simulación"
                      >
                        <PieChart size={16} />
                        <span className="hidden sm:inline">Reporte Detallado</span> 
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-stretch gap-4 max-w-4xl mx-auto px-4">
                    {dataToShow.map((item) => {
                        const key = view === 'Anual' ? `anno-${(item as AnnualEvolutionStep).year}` : `sem-${(item as SemestralEvolutionStep).semestreIndex}`;
                        return ( 
                          <KpiRow 
                            key={key} 
                            data={item} 
                            onViewYearChart={handleViewPeriodChart}
                            onExportPeriodPdf={handleExportPeriodPdf}
                          /> 
                        );
                    })}
                </div>
            </div>

            {/* --- V8.5: Modal de Reporte Detallado (SIMPLIFICADO) --- */}
            <DetailedReportModal
              isOpen={isReportOpen}
              onClose={() => setIsReportOpen(false)}
              monthlyData={monthlyData}
              semestralData={semestralData}
              annualData={annualData}
              // V8.5: Props de GanaGenius eliminadas
              // simulationConfig={simulationConfig}
              // onSimulate={onSimulate} 
            />

            <PopulationChartModal
              isOpen={isPopulationChartModalOpen}
              onClose={() => setIsPopulationChartModalOpen(false)}
              monthlyData={monthlyData}
              title={`Evolución Total del Rebaño (${horizon} Años)`}
            />
            
            {selectedPeriodData && (
              <PeriodChartModal
                isOpen={isPeriodChartOpen}
                onClose={() => {
                  setIsPeriodChartOpen(false);
                  setSelectedPeriodData(null);
                }}
                periodData={selectedPeriodData}
                monthlyData={monthlyData}
              />
            )}
        </div>
    );
};