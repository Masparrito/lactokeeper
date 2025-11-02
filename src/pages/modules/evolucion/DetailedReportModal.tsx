import React, { useState, useMemo, useRef, forwardRef } from 'react';
import html2canvas from 'html2canvas';

// --- Recharts ---
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, ReferenceLine 
} from 'recharts';
    
// --- Iconos (V8.0: Corregidos) ---
import { 
  X, BarChart3, Activity, Table, Download, 
  TrendingUp, TrendingDown, ChevronsLeftRight, Zap, Droplet, Archive, CalendarClock, Scale,
  Users, Copy, Skull, ArrowRightLeft, UserMinus, PieChart,
  FileSpreadsheet
  // Cpu, Sparkles, Lightbulb (ELIMINADOS)
} from 'lucide-react';
    
// --- Tipos y Hooks (V8.0: Corregida importación) ---
import { 
    MonthlyEvolutionStep, 
    SemestralEvolutionStep, 
    AnnualEvolutionStep,
    SimulationConfig // V8.0: Importar tipo de Config
} from '../../../hooks/useHerdEvolution';
import { 
  useReportAnalytics, 
  YearlyMilkKpis, 
  HerdEfficiencyKpis, 
  HerdDynamicsKpis 
} from '../../../hooks/useReportAnalytics';
// V8.0: El hook 'useLinearityOptimizer' ya no se usa aquí, sino en GanaGeniusOptimizer

// --- V8.0: Importar el nuevo componente de UI ---
import { GanaGeniusOptimizer } from './GanaGeniusOptimizer'; // ¡Verifica esta ruta!

// --- Utilidades ---
import { formatNumber, formatCurrency } from '../../../utils/formatters'; 
import { exportDetailedReport } from '../../../utils/pdfExporter'; 
import { exportMonthlyDataToCSV } from '../../../utils/csvExporter';

// -----------------------------------------------------------------------------
// --- COMPONENTES INTERNOS DEL REPORTE (Restaurados) ---
// -----------------------------------------------------------------------------

// --- Componente KpiCard ---
interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ElementType;
  color?: string;
  tooltip?: string;
}
const KpiCard: React.FC<KpiCardProps> = ({ label, value, unit, icon: Icon, color = 'text-sky-500', tooltip }) => (
  <div className="bg-gray-800/50 p-4 rounded-lg border border-white/10 flex items-start gap-4" title={tooltip}>
    <div className={`p-2 rounded-lg bg-gray-700 ${color}`}>
      <Icon size={20} />
    </div>
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wider" title={tooltip}>{label}</p>
      <p className="text-xl font-bold text-white">
        {value} <span className="text-sm font-normal text-gray-300">{unit}</span>
      </p>
    </div>
  </div>
);

// --- Componente ReportSegmentedControl ---
interface ReportSegmentedControlProps<T extends string | number> { 
  options: { label: string; value: T }[]; 
  value: T; 
  onChange: (value: T) => void; 
}
const ReportSegmentedControl = <T extends string | number>({ options, value, onChange }: ReportSegmentedControlProps<T>) => ( 
  <div className="flex rounded-lg bg-gray-900 border border-brand-border p-0.5"> 
    {options.map((opt) => ( 
      <button 
        key={String(opt.value)} 
        onClick={() => onChange(opt.value)} 
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${ 
          value === opt.value ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-400 hover:text-white' 
        }`} 
      > 
        {opt.label} 
      </button> 
    ))} 
  </div> 
);

// --- V6.2: NUEVO Tooltip para el Gráfico de Leche ---
const MilkChartTooltip: React.FC<any> = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data: MonthlyEvolutionStep = payload[0].payload;
    const litros = data.litrosLeche;
    const animales = data.hembrasProduccion;
    const promDiario = (animales > 0) ? (litros / animales / 30.44) : 0;

    return (
      <div className="bg-gray-900/80 p-3 rounded-lg border border-white/10 shadow-lg backdrop-blur-md animate-fade-in">
        <p className="text-sm font-bold text-white">{data.periodLabel}</p>
        <hr className="border-white/10 my-1.5" />
        <div className="space-y-1">
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-sky-400">Litros (Mes):</span>
            <span className="text-xs font-mono text-white">{formatNumber(litros, 0)} L</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-gray-300">Animales:</span>
            <span className="text-xs font-mono text-white">{formatNumber(animales, 0)}</span>
          </div>
          <div className="flex justify-between items-center gap-4">
            <span className="text-xs text-gray-300">Prom. (L/día):</span>
            <span className="text-xs font-mono text-white">{promDiario.toFixed(2)} L/día</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// --- Componente Gráfico de Linealidad (V8.0: MODIFICADO con forwardRef) ---
const MilkLinearityChart = forwardRef<HTMLDivElement, { data: YearlyMilkKpis | undefined; monthlyData: MonthlyEvolutionStep[] }>(
  ({ data, monthlyData }, ref) => {
    
    const chartData = useMemo(() => {
      if (!data || !monthlyData) return [];
      const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
      
      return monthlyData
        .filter(m => m.year === data.year)
        .map((monthStep, index) => ({
          ...monthStep,
          name: monthLabels[index % 12],
          Litros: Math.round(monthStep.litrosLeche),
        }));
    }, [data, monthlyData]);

    if (!data) return <div className="text-gray-500">Selecciona un año.</div>;

    return (
      <div ref={ref} className="h-64 w-full bg-gray-800/50 p-4 rounded-lg border border-white/10">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} allowDecimals={false} tickFormatter={(val) => formatNumber(val, 0)} />
            <Tooltip
              cursor={{ fill: 'rgba(56, 189, 248, 0.1)' }}
              content={<MilkChartTooltip />}
            />
            <Bar dataKey="Litros" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            <ReferenceLine 
              y={data.avgMonthly} 
              label={{ value: `Prom: ${formatNumber(data.avgMonthly, 0)} L`, position: 'insideTopRight', fill: '#f3f4f6', fontSize: 12 }} 
              stroke="#f3f4f6" 
              strokeDasharray="4 4" 
              strokeOpacity={0.8}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }
);
MilkLinearityChart.displayName = 'MilkLinearityChart';


// --- Componente KPIs de Linealidad ---
const MilkLinearityKPIs: React.FC<{ data: YearlyMilkKpis | undefined }> = ({ data }) => {
  if (!data) return null;
  const cv = data.cv;
  let cvColor = 'text-green-500';
  if (cv > 15) cvColor = 'text-yellow-500';
  if (cv > 40) cvColor = 'text-red-500';
  const cvTooltip = "Coeficiente de Variación (CV):\nMide la estabilidad de la producción.\n< 15% = Muy Lineal\n> 40% = Muy Estacional";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard label="Coef. de Variación (CV)" value={cv.toFixed(1)} unit="%" icon={Zap} color={cvColor} tooltip={cvTooltip} />
      <KpiCard label="Promedio Mensual" value={formatNumber(data.avgMonthly, 0)} unit="Litros" icon={Scale} />
      <KpiCard label="Mes Pico" value={formatNumber(data.peakMonthValue, 0)} unit={`(${data.peakMonthLabel})`} icon={TrendingUp} color="text-green-500" />
      <KpiCard label="Mes Valle" value={formatNumber(data.valleyMonthValue, 0)} unit={`(${data.valleyMonthLabel})`} icon={TrendingDown} color="text-red-500" />
    </div>
  );
};

// --- Componente KPIs de Eficiencia Lechera ---
const HerdEfficiencyKPIs: React.FC<{ data: HerdEfficiencyKpis | null }> = ({ data }) => {
  if (!data) return null;
  return (
    <>
      <h3 className="text-base font-semibold text-white mt-6 mb-3">Eficiencia Lechera (Horizonte Total)</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total Litros (Horizonte)" value={formatNumber(data.totalLitrosHorizonte, 0)} unit="Litros" icon={Droplet} color="text-sky-500" />
        <KpiCard label="Litros / Vientre / Año" value={formatNumber(data.litrosPorVientrePorAnio, 0)} unit="L/Vientre" icon={Archive} color="text-sky-500" />
        <KpiCard label="Total Días-Lactancia" value={formatNumber(data.totalDiasLactancia, 0)} unit="Días" icon={CalendarClock} />
        <KpiCard label="Litros / Día-Lactancia" value={data.litrosPorDiaLactancia.toFixed(2)} unit="L/Día" icon={ChevronsLeftRight} />
      </div>
    </>
  );
};

// --- Componente KPIs de Dinámica del Rebaño ---
const HerdDynamicsKPIs: React.FC<{ data: HerdDynamicsKpis | null }> = ({ data }) => {
  if (!data) return null;
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-white mb-3">Tasas de Dinámica (Promedio Anualizado)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Tasa Natalidad" value={data.tasaNatalidadReal.toFixed(1)} unit="%" icon={Users} color="text-green-500" tooltip="Nacimientos / (Vientres Prom. * Años) * 100" />
          <KpiCard label="Tasa Prolificidad" value={data.tasaProlificidadReal.toFixed(1)} unit="%" icon={Copy} color="text-green-500" tooltip="Nacimientos Totales / Partos Totales * 100" />
          <KpiCard label="Tasa Reemplazo" value={data.tasaReemplazoReal.toFixed(1)} unit="%" icon={ArrowRightLeft} color="text-green-500" tooltip="Promociones (LTD -> Cabras) / (Cabras Prom. * Años) * 100" />
          <KpiCard label="Tasa Descarte" value={data.tasaDescarteReal.toFixed(1)} unit="%" icon={UserMinus} color="text-red-500" tooltip="Ventas Descarte / (Cabras Prom. * Años) * 100" />
        </div>
      </div>
      <div>
        <h3 className="text-base font-semibold text-white mb-3">Tasas de Bajas (Reales)</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
           <KpiCard label="% Mort. Crías (0-3m)" value={data.mortalidadCriasReal.toFixed(1)} unit="%" icon={Skull} color="text-red-500" tooltip="Muertes Crías / (Nacidos + Stock Inicial) * 100" />
           <KpiCard label="% Mort. Levante (Anual.)" value={data.mortalidadLevanteReal.toFixed(1)} unit="%" icon={Skull} color="text-red-500" tooltip="Muertes Levante / (Levante Prom. * Años) * 100" />
           <KpiCard label="% Mort. Cabras (Anual.)" value={data.mortalidadCabrasReal.toFixed(1)} unit="%" icon={Skull} color="text-red-500" tooltip="Muertes Cabras / (Cabras Prom. * Años) * 100" />
           <KpiCard label="% Elim. Crías M (0-3m)" value={data.tasaEliminacionCriasMReal.toFixed(1)} unit="%" icon={UserMinus} color="text-yellow-500" tooltip="Ventas Crías M / (Nacidos M - Muertes M) * 100" />
        </div>
      </div>
    </div>
  );
};

// --- Componente Tabla Detallada ---
type TableRowData = AnnualEvolutionStep | SemestralEvolutionStep;
const DetailedReportTable: React.FC<{
  annualData: AnnualEvolutionStep[];
  semestralData: SemestralEvolutionStep[];
}> = ({ annualData, semestralData }) => {
  
  // (El código de la tabla no cambia)
  const columnGroups: { name: string; span: number }[] = [
    { name: 'Población', span: 3 }, { name: 'Producción', span: 3 }, { name: 'Flujos: Entradas', span: 3 },
    { name: 'Flujos: Salidas (Muertes)', span: 4 }, { name: 'Flujos: Salidas (Ventas)', span: 2 },
    { name: 'Flujos: Internos (Promociones H)', span: 4 }, { name: 'Desglose Stock Final', span: 7 },
  ];
  const columns: { key: string; label: string; format?: (val: number) => string; tooltip?: string; }[] = [
    { key: 'startTotal', label: 'Inicio' }, { key: 'endTotal', label: 'Final' }, { key: 'netChange', label: 'Cambio' },
    { key: 'litrosLeche', label: 'Litros Totales', format: (val) => formatNumber(val, 0) }, 
    { key: 'kpiProductivasCount', label: 'Vientres (Final)', tooltip: "Vientres Productivos (>12m) al final del período." }, 
    { key: 'ingresosLeche', label: 'Ingresos Leche', format: (val) => formatCurrency(val, '$', 0) }, 
    { key: 'nacimientosH', label: 'Nacim. H' }, { key: 'nacimientosM', label: 'Nacim. M' }, { key: 'comprasVientres', label: 'Compras Vientres' },
    { key: 'muertesCriaH', label: 'Muertes Crías H' }, { key: 'muertesCriaM', label: 'Muertes Crías M' }, { key: 'muertesLevante', label: 'Muertes Levante (Total)' }, { key: 'muertesAdultas', label: 'Muertes Adultas (Total)' },
    { key: 'ventasCabritos', label: 'Ventas Crías M' }, { key: 'ventasDescartes', label: 'Ventas Descartes' },
    { key: 'promocionCriaH', label: 'Cría → LT' }, { key: 'promocionLevanteTemprano', label: 'LT → LM' }, { key: 'promocionLevanteMedio', label: 'LM → LTD' }, { key: 'promocionLevanteTardio', label: 'LTD → Cabras' },
    { key: 'endCriaH', label: 'Final Cría H' }, { key: 'endCriaM', label: 'Final Cría M' }, { key: 'endLevanteTemprano', label: 'Final LT' }, { key: 'endLevanteMedio', label: 'Final LM' }, { key: 'endLevanteTardio', label: 'Final LTD' }, { key: 'endCabras', label: 'Final Cabras' }, { key: 'endPadres', label: 'Final Padres' },
  ];

  const renderRow = (data: TableRowData, isSemestral = false) => {
    const muertesLevante = (data as any).muertesLevanteTemprano + (data as any).muertesLevanteMedio + (data as any).muertesLevanteTardio;
    const muertesAdultas = (data as any).muertesCabras + (data as any).muertesPadres;
    return (
      <tr key={data.periodLabel} className={isSemestral ? 'bg-gray-800/60' : 'bg-gray-700/50'}>
        <td className={`sticky left-0 z-10 p-2 text-sm whitespace-nowrap ${isSemestral ? 'bg-gray-800/60 pl-6' : 'bg-gray-700/50 font-semibold text-white'}`}>
          {data.periodLabel}
        </td>
        {columns.map(col => {
          let value: number;
          if (col.key === 'muertesLevante') value = muertesLevante;
          else if (col.key === 'muertesAdultas') value = muertesAdultas;
          else value = (data as any)[col.key] ?? 0;
          const formatter = col.format || ((val: number) => formatNumber(val, 0));
          return (
            <td key={col.key} className="p-2 text-sm text-right whitespace-nowrap text-gray-200 font-mono" title={col.tooltip}>
              {formatter(value)}
            </td>
          );
        })}
      </tr>
    );
  };
  
  return (
    <div className="overflow-x-auto h-full">
      <table className="min-w-full border-separate border-spacing-0">
        <thead className="sticky top-0 z-20">
          <tr className="bg-gray-900/80 backdrop-blur-lg">
            <th className="sticky left-0 z-30 p-2 text-xs font-semibold text-left uppercase text-white bg-gray-900/80 backdrop-blur-lg">Periodo</th>
            {columnGroups.map((group, index) => ( 
              <th key={index} colSpan={group.span} className="p-2 text-xs font-semibold text-center uppercase text-white border-b border-l border-white/10">
                {group.name}
              </th>
            ))}
          </tr>
          <tr className="bg-gray-900/80 backdrop-blur-lg">
            <th className="sticky left-0 z-30 p-2 text-xs font-semibold text-left uppercase text-white bg-gray-900/80 backdrop-blur-lg"></th>
            {columns.map(col => ( 
              <th key={col.key} className="p-2 text-xs font-semibold text-right uppercase text-gray-300 border-b border-l border-white/10 whitespace-nowrap" title={col.tooltip}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-gray-800">
          {annualData.map(year => {
            const relatedSemestres = semestralData.filter(s => s.year === year.year);
            return (
              <React.Fragment key={year.year}>
                {renderRow(year, false)}
                {relatedSemestres.map(semestre => renderRow(semestre, true))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};


// -----------------------------------------------------------------------------
// --- COMPONENTE PRINCIPAL DEL MODAL (V8.0: ACTUALIZADO) ---
// -----------------------------------------------------------------------------
interface DetailedReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthlyData: MonthlyEvolutionStep[];
  semestralData: SemestralEvolutionStep[];
  annualData: AnnualEvolutionStep[];
  simulationConfig: SimulationConfig; // V8.0: Prop necesaria para GanaGenius
}
type ReportView = 'produccion' | 'dinamica' | 'tabla';

interface TabButtonProps { label: string; icon: React.ElementType; isActive: boolean; onClick: () => void; }
const TabButton: React.FC<TabButtonProps> = ({ label, icon: Icon, isActive, onClick }) => (
  <button 
    onClick={onClick} 
    className={`flex-1 flex flex-col items-center justify-center p-3 text-xs font-medium transition-colors border-b-2 ${ 
      isActive 
        ? 'text-sky-500 border-sky-500'
        : 'text-gray-500 border-transparent hover:text-gray-300' 
    }`}
  >
    <Icon size={18} className="mb-1" />
    {label}
  </button>
);


export const DetailedReportModal: React.FC<DetailedReportModalProps> = ({
  isOpen,
  onClose,
  monthlyData,
  semestralData,
  annualData,
  simulationConfig, // V8.0: Recibir la config
}) => {
  const [activeView, setActiveView] = useState<ReportView>('produccion');
  const [isExporting, setIsExporting] = useState(false); 
  const milkChartRef = useRef<HTMLDivElement>(null);
  
  const { 
    isLoading, 
    milkLinearityKpis, 
    herdEfficiencyKpis, 
    herdDynamicsKpis,
    horizonInYears // V8.0: Obtener el horizonte del hook
  } = useReportAnalytics(monthlyData, annualData);

  const [selectedYear, setSelectedYear] = useState<number>(() => annualData[0]?.year ?? new Date().getFullYear());
  
  const yearOptions = useMemo(() => 
    annualData.map(y => ({ label: `Año ${y.year}`, value: y.year })), 
    [annualData]
  );
  
  React.useEffect(() => {
    if (annualData.length > 0 && !annualData.find(y => y.year === selectedYear)) {
      setSelectedYear(annualData[0].year);
    }
  }, [annualData, selectedYear]);

  const selectedYearData = useMemo(() => 
    milkLinearityKpis.find(kpi => kpi.year === selectedYear),
    [milkLinearityKpis, selectedYear]
  );
  
  // --- V8.0: Handler de Exportación PDF (Modificado) ---
  const handleExport = async () => {
    if (isLoading || !herdDynamicsKpis || !herdEfficiencyKpis || !selectedYearData) {
      alert("Los datos de analítica aún no están listos.");
      return;
    }
    
    if (activeView !== 'produccion') {
      await setActiveView('produccion');
      await new Promise(resolve => setTimeout(resolve, 50)); 
    }
    
    if (!milkChartRef.current) {
      alert("Error: No se pudo encontrar el gráfico para exportar.");
      return;
    }

    setIsExporting(true);

    try {
      const canvas = await html2canvas(milkChartRef.current, {
        backgroundColor: '#1f2937', 
        scale: 2,
      });
      const chartImage = canvas.toDataURL('image/png', 0.9);

      exportDetailedReport(
        annualData,
        semestralData,
        herdDynamicsKpis,
        herdEfficiencyKpis,
        milkLinearityKpis,
        chartImage
      );

    } catch (error) {
      console.error("Error al generar la imagen del gráfico:", error);
      alert("Ocurrió un error al exportar el gráfico.");
    } finally {
      setIsExporting(false);
    }
  };

  // --- V4.2 (FASE 4): Handler de Exportación CSV ---
  const handleExportCSV = () => {
    if (isLoading || !monthlyData || monthlyData.length === 0) {
      alert("Los datos mensuales aún no están listos para exportar.");
      return;
    }
    exportMonthlyDataToCSV(monthlyData, `simulacion_detallada_mensual.csv`);
  };

  if (!isOpen) {
    return null;
  }

  // --- Renderizado de Contenido de Pestaña (V8.0: ACTUALIZADO) ---
  const renderContent = () => {
    if (isLoading) {
      return <div className="p-10 text-center text-gray-400">Calculando analíticas...</div>
    }

    switch (activeView) {
      // --- PESTAÑA 1: PRODUCCIÓN ---
      case 'produccion':
        return (
          <div className="p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-white">📈 Análisis de Linealidad de Leche</h2>
              <ReportSegmentedControl 
                options={yearOptions}
                value={selectedYear}
                onChange={(v) => setSelectedYear(v as number)}
              />
            </div>
            <MilkLinearityChart 
              ref={milkChartRef} 
              data={selectedYearData} 
              monthlyData={monthlyData} 
            />
            <MilkLinearityKPIs data={selectedYearData} />
            
            {/* --- V8.0: TARJETA GanaGenius ELIMINADA DE AQUÍ --- */}

            <HerdEfficiencyKPIs data={herdEfficiencyKpis} />
          </div>
        );
      
      // --- PESTAÑA 2: DINÁMICA ---
      case 'dinamica':
        return (
          <div className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-white">📊 KPIs de Dinámica del Rebaño</h2>
            <HerdDynamicsKPIs data={herdDynamicsKpis} />
          </div>
        );
        
      // --- PESTAÑA 3: TABLA ---
      case 'tabla':
        return (
          <div className="w-full h-full overflow-hidden"> 
            <DetailedReportTable
              annualData={annualData}
              semestralData={semestralData}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    // Contenedor principal (Overlay)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      {/* Panel del Modal */}
      <div
        className="relative flex flex-col w-full h-full max-w-4xl max-h-[90vh] bg-gray-900 border border-brand-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()} 
      >
        {/* V8.0: Overlay de Carga */}
        {isExporting && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm">
            <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-white text-lg font-semibold mt-4">Generando PDF de Alto Nivel...</p>
          </div>
        )}
        
        {/* Cabecera del Modal (V8.0: ACTUALIZADA) */}
        <header className="relative flex items-center justify-between p-4 border-b border-brand-border flex-shrink-0 pr-48"> {/* Padding aumentado (pr-36 -> pr-48) */}
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-lg bg-sky-600/20 text-sky-400"> 
              <PieChart size={20} /> 
            </span>
            <div>
              <h1 className="text-base font-bold text-white">Reporte Detallado de Simulación</h1>
              <p className="text-xs text-gray-400">Análisis de eficiencia y producción del rebaño</p>
            </div>
          </div>
          
          <div className='absolute top-3 right-3 flex items-center gap-1'> 
            {/* --- V8.0: NUEVO BOTÓN GanaGenius --- */}
            <GanaGeniusOptimizer
              baseConfig={simulationConfig}
              baseCV={selectedYearData?.cv}
              horizonInYears={horizonInYears}
            />

            <button 
              onClick={handleExportCSV}
              disabled={isLoading || isExporting}
              title="Exportar datos mensuales a CSV (para Google Sheets/Excel)"
              className="p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={20} />
            </button>

            <button 
              onClick={handleExport}
              disabled={isLoading || isExporting}
              title="Exportar Resumen a PDF de Alto Nivel"
              className="p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download size={20} />
            </button>
            <button
              onClick={onClose}
              disabled={isExporting}
              title="Cerrar"
              className="p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Selector de Pestañas */}
        <nav className="flex items-stretch border-b border-brand-border flex-shrink-0">
          <TabButton
            label="Producción de Leche"
            icon={BarChart3}
            isActive={activeView === 'produccion'}
            onClick={() => setActiveView('produccion')}
          />
          <TabButton
            label="Dinámica del Rebaño"
            icon={Activity}
            isActive={activeView === 'dinamica'}
            onClick={() => setActiveView('dinamica')}
          />
          <TabButton
            label="Tabla Detallada"
            icon={Table}
            isActive={activeView === 'tabla'}
            onClick={() => setActiveView('tabla')}
          />
        </nav>

        {/* Contenido Principal (con scroll) */}
        <main className="flex-1 overflow-y-auto bg-gray-900/50">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};