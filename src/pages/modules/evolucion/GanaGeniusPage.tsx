// --- ARCHIVO: src/pages/modules/evolucion/GanaGeniusPage.tsx ---
// (V8.5: CORREGIDO EL ERROR DE IMPORTACIÓN)

import React, { useState, useMemo } from 'react';
// CORRECCIÓN: Importar 'recharts' por separado
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, Legend } from 'recharts';
// CORRECCIÓN: Importar solo íconos de 'lucide-react'
import { Cpu, Lightbulb, TrendingUp, BarChart, Check } from 'lucide-react';

import { SimulationConfig, MonthlyEvolutionStep } from '../../../hooks/useHerdEvolution';
import { useLinearityOptimizer } from '../../../hooks/useLinearityOptimizer';
import { 
    useSensitivityAnalysis, 
    UseSensitivityAnalysisResult,
    SensitivityImpact 
} from '../../../hooks/useSensitivityAnalysis'; 
import { formatNumber, formatCurrency } from '../../../utils/formatters';

// -----------------------------------------------------------------------------
// --- COMPONENTES DE GRÁFICOS COMPARATIVOS ---
// -----------------------------------------------------------------------------

// --- Tooltip Personalizado ---
const CustomTooltip: React.FC<any> = ({ active, payload }) => { // 'label' no se usa
  if (active && payload && payload.length) {
    const month = payload[0].payload.periodLabel;
    return (
      <div className="bg-gray-900/80 p-3 rounded-lg border border-white/10 shadow-lg backdrop-blur-md">
        <p className="text-sm font-bold text-white">{month}</p>
        <hr className="border-white/10 my-1.5" />
        <div className="space-y-1">
          {payload.map((entry: any) => (
            <div key={entry.name} className="flex justify-between items-center gap-4">
              <span className="text-xs" style={{ color: entry.color }}>{entry.name}:</span>
              <span className="text-xs font-mono text-white">
                {entry.dataKey.includes('Ingreso') // Usar 'Ingreso'
                  ? formatCurrency(entry.value, '$', 0) 
                  : formatNumber(entry.value, 0) + ' L'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// --- Gráfico de Linealidad (Leche) ---
const ComparativeLinearityChart: React.FC<{
  baseData: MonthlyEvolutionStep[] | null;
  optimizedData: MonthlyEvolutionStep[] | null;
}> = ({ baseData, optimizedData }) => {
  
  const chartData = useMemo(() => {
    if (!baseData || !optimizedData) return [];
    // Mapear los datos del primer año (12 meses)
    return baseData.slice(0, 12).map((step, index) => ({
      name: step.periodLabel.split(' ')[2], // "Mes 1" -> "1"
      "CV Actual (L)": step.litrosLeche,
      "CV Optimizado (L)": optimizedData[index]?.litrosLeche ?? 0,
      // V8.5: Añadir periodLabel para el tooltip
      periodLabel: step.periodLabel, 
    }));
  }, [baseData, optimizedData]);

  return (
    <div className="h-64 w-full bg-gray-800/50 p-4 rounded-lg border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
          <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(val: number) => formatNumber(val, 0)} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" name="CV Actual (L)" dataKey="CV Actual (L)" stroke="#f87171" strokeWidth={2} dot={false} />
          <Line type="monotone" name="CV Optimizado (L)" dataKey="CV Optimizado (L)" stroke="#4ade80" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// --- Gráfico de Sensibilidad (Ingresos) ---
const ComparativeIncomeChart: React.FC<{
  baseData: MonthlyEvolutionStep[] | null;
  optimizedData: MonthlyEvolutionStep[] | null;
  kpiName: string;
}> = ({ baseData, optimizedData, kpiName }) => {

  const chartData = useMemo(() => {
    if (!baseData || !optimizedData) return [];
    // Mapear los datos de todos los años
    return baseData.map((step, index) => ({
      name: `A${step.year} M${step.month}`,
      periodLabel: step.periodLabel,
      "Ingreso Actual": step.ingresosTotales,
      [`Ingreso (+${kpiName})`]: optimizedData[index]?.ingresosTotales ?? 0,
    }));
  }, [baseData, optimizedData, kpiName]);
  
  const formatXAxis = (tick: string) => {
    if (tick.endsWith('M1')) return tick.split(' ')[0]; // "A1", "A2", "A3"
    return '';
  };

  return (
    <div className="h-64 w-full bg-gray-800/50 p-4 rounded-lg border border-white/10">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
          <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickFormatter={formatXAxis} />
          <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(val: number) => `${formatNumber(val / 1000, 0)}k`} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" name="Ingreso Actual" dataKey="Ingreso Actual" stroke="#9ca3af" strokeWidth={2} dot={false} />
          <Line type="monotone" name={`Ingreso (+${kpiName})`} dataKey={`Ingreso (+${kpiName})`} stroke="#4ade80" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};


// -----------------------------------------------------------------------------
// --- PÁGINA PRINCIPAL DE GanaGenius (V8.5) ---
// -----------------------------------------------------------------------------

interface GanaGeniusPageProps {
  baseConfig: SimulationConfig; // La 'realConfig'
  horizonInYears: number;
  onSaveOptimizedPlan: (config: SimulationConfig) => void;
}

type ModalStep = 'idle' | 'diagnosing' | 'diagnosis_result' | 'optimizing' | 'optimization_result';

export const GanaGeniusPage: React.FC<GanaGeniusPageProps> = ({ 
  baseConfig, 
  horizonInYears,
  onSaveOptimizedPlan 
}) => {
  const [modalStep, setModalStep] = useState<ModalStep>('idle');

  // --- Hook de Diagnóstico (Paso 1) ---
  const { 
    isLoading: isDiagnosing, 
    report: diagnosisReport, 
    error: diagnosisError 
  } = useSensitivityAnalysis({
    baseConfig: baseConfig,
    horizonInYears: horizonInYears,
    enabled: modalStep === 'diagnosing',
  });

  // --- Hook de Optimización (Paso 2) ---
  const { 
    isLoading: isOptimizing, 
    progress: linearityProgress, 
    baseCV, 
    bestCV, 
    bestDistribution, 
    error: linearityError,
    baseMonthlyData: linearityBaseData,
    bestMonthlyData: linearityBestData
  } = useLinearityOptimizer({
    baseConfig: baseConfig,
    horizonInYears: horizonInYears,
    enabled: modalStep === 'optimizing',
  });

  // const isLoading = isDiagnosing || isOptimizing; // <-- LÍNEA ELIMINADA
    const error = diagnosisError || linearityError;

  // --- Handlers ---
  const handleStartDiagnosis = () => {
    setModalStep('diagnosing');
  };

  const handleStartLinearityOptimization = () => {
    setModalStep('optimizing');
  };

  const handleApplyLinearity = (distribution: number[]) => {
    if (!baseConfig) return;
    
    const newConfig: SimulationConfig = {
      ...baseConfig,
      matingDistribution: distribution,
    };
    
    onSaveOptimizedPlan(newConfig); 
  };
  
  
  // --- Nombres de Meses (para sugerencia de linealidad) ---
  const activeSeasons = [
    baseConfig?.mesInicioMonta1,
    baseConfig?.mesInicioMonta2,
    baseConfig?.mesInicioMonta3,
    baseConfig?.mesInicioMonta4,
  ].filter(m => typeof m === 'number' && m > 0);
  const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];


  // --- Sub-componente: Resultado del Diagnóstico (Paso 1) ---
  const renderDiagnosisResult = (report: UseSensitivityAnalysisResult['report']) => {
    if (!report) return null;

    const bestKpi = report.impacts[0];
    const currency = baseConfig?.monedaSimbolo ?? '$';
    
    const bestKpiData = report.impacts.find(i => i.kpi === bestKpi.kpi);

    return (
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white">Diagnóstico Zootécnico Completo</h2>
        <p className="text-sm text-gray-300">
          Tu **{bestKpi.kpi}** es tu eslabón más débil (y tu mayor oportunidad). Mejorar este KPI tiene el mayor impacto en tus ingresos.
        </p>
        
        <ComparativeIncomeChart
          baseData={report.baseMonthlyData}
          optimizedData={bestKpiData?.monthlyData ?? null}
          kpiName={bestKpi.kpi}
        />

        <div className="my-4 space-y-2 text-left">
          {report.impacts.map((item: SensitivityImpact) => (
            <div 
              key={item.kpi} 
              className={`p-3 rounded-lg border ${item.kpi === bestKpi.kpi ? 'bg-green-900/50 border-green-700' : 'bg-gray-800 border-gray-700'}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold text-white">{item.kpi}</span>
                <span className={`font-bold ${item.kpi === bestKpi.kpi ? 'text-green-400' : 'text-gray-300'}`}>
                  + {formatCurrency(item.impact, currency, 0)}
                </span>
              </div>
              <p className="text-xs text-gray-400">
                {item.kpi === 'Mortalidad' ? 'Reduciendo mortalidad' : `Mejorando a ${formatNumber(item.newValue, 0)}%`}
              </p>
            </div>
          ))}
        </div>
        
        <hr className="border-gray-700 my-4" />
        
        <p className="text-sm text-gray-300 mb-2">
          **Paso 2 (Opcional):** Ahora que conoces tu prioridad zootécnica, podemos optimizar tu flujo de caja.
        </p>
        <button
          type="button"
          onClick={handleStartLinearityOptimization}
          className="w-full rounded-md bg-sky-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-sky-500"
        >
          <BarChart size={18} className="inline-block -mt-1 mr-2" />
          Optimizar Linealidad (Flujo de Caja)
        </button>
      </div>
    );
  };

  // --- Sub-componente: Resultado de Linealidad (Paso 2) ---
  const renderLinearityResult = () => {
    const isBetter = (typeof bestDistribution !== 'undefined' && bestDistribution !== null);
    
    let suggestion = '';
    if (isBetter && bestDistribution) {
      suggestion = bestDistribution.map((limit, index) => {
        const monthNumber = activeSeasons[index];
        if (typeof monthNumber !== 'number') return '?';
        const monthIndex = monthNumber - 1;
        const label = monthLabels[monthIndex] || 'Mes?';
        return `${label}: ${formatNumber(limit, 0)} cabras`;
      }).join(' / ');
    }

    return (
      <div className="p-4 max-w-2xl mx-auto space-y-6">
        <h2 className="text-2xl font-bold text-white">Optimización de Linealidad Completa</h2>
        
        {isBetter ? (
          <>
            <p className="text-sm text-gray-300">
              ¡Mejora de flujo de caja encontrada! GanaGenius ha aplanado tu "montaña rusa" de producción.
            </p>
            
            <ComparativeLinearityChart
              baseData={linearityBaseData}
              optimizedData={linearityBestData}
            />

            <div className="flex justify-center gap-4 my-4">
              <div className="p-3 bg-gray-800 rounded-lg text-center">
                <p className="text-xs text-red-400">CV Actual</p>
                <p className="text-2xl font-bold text-white">{formatNumber(baseCV, 1)}%</p>
              </div>
              <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg text-center">
                <p className="text-xs text-green-400">CV Óptimo</p>
                <p className="text-2xl font-bold text-white">{formatNumber(bestCV, 1)}%</p>
              </div>
            </div>
            
            <h3 className="font-semibold text-white">Plan de Acción (Cupos de Monta):</h3>
            <p className="text-base font-semibold text-green-400 bg-gray-800 p-3 rounded-md mt-2">
              {suggestion}
            </p>
            
            <button
              type="button"
              onClick={() => handleApplyLinearity(bestDistribution!)} // '!' es seguro por el check 'isBetter'
              className="mt-6 w-full rounded-md bg-green-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-green-500"
            >
              <Check size={18} className="inline-block -mt-1 mr-2" />
              Guardar y Usar este Plan Optimizado
            </button>
            
            <button
              type="button"
              onClick={() => setModalStep('diagnosis_result')} // Volver al paso anterior
              className="w-full text-center text-sm text-gray-400 hover:text-white mt-4"
            >
              Volver al Diagnóstico
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-gray-300">
              ¡Buen trabajo! Tu escenario actual (CV: {formatNumber(baseCV, 1)}%) 
              ya es el más lineal encontrado. No se requiere optimización.
            </p>
            <button
              type="button"
              onClick={() => setModalStep('diagnosis_result')} // Volver
              className="mt-6 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
            >
              Volver al Diagnóstico
            </button>
          </>
        )}
      </div>
    );
  };

  // --- Renderizado del Contenido del Modal ---
  const renderModalContent = () => {
    // 1. Errores
    if (error) {
      return (
        <div className="p-4 max-w-2xl mx-auto text-center">
          <h3 className="text-lg font-medium text-red-400">Error en GanaGenius</h3>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
          <button type="button" onClick={() => setModalStep('idle')} className="mt-6 w-full rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white">
            Volver
          </button>
        </div>
      );
    }
    
    // 2. Cargando (Paso 1 - Diagnóstico)
    if (isDiagnosing) {
      return (
        <div className="p-6 text-center max-w-2xl mx-auto">
          <Cpu size={48} className="mx-auto text-sky-400 animate-pulse" />
          <h3 className="mt-4 text-lg font-medium text-white">GanaGenius está diagnosticando...</h3>
          <p className="mt-2 text-sm text-gray-400">
            Analizando el impacto de tus KPIs... (Corriendo 4 simulaciones)
          </p>
        </div>
      );
    }

    // 3. Cargando (Paso 2 - Optimización)
    if (isOptimizing) {
       return (
        <div className="p-6 text-center max-w-2xl mx-auto">
          <Cpu size={48} className="mx-auto text-sky-400 animate-pulse" />
          <h3 className="mt-4 text-lg font-medium text-white">GanaGenius está optimizando...</h3>
          <p className="mt-2 text-sm text-gray-400">
            Analizando {Math.round(linearityProgress * 200)} / 200 escenarios de montas.
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
            <div 
              className="bg-sky-500 h-2.5 rounded-full transition-all" 
              style={{ width: `${linearityProgress * 100}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-500">
              CV Actual: {formatNumber(baseCV, 1)}%
              {bestCV && baseCV && bestCV < baseCV ? ` | Mejor: ${formatNumber(bestCV, 1)}%` : ''}
          </p>
        </div>
      );
    }
    
    // 4. Resultado (Paso 2 - Optimización)
    if (modalStep === 'optimizing' && bestCV !== null) {
      return renderLinearityResult();
    }

    // 5. Resultado (Paso 1 - Diagnóstico)
    if (modalStep === 'diagnosing' && diagnosisReport) {
      return renderDiagnosisResult(diagnosisReport);
    }
    
    // 6. Estado Inicial (Paso 0 - Bienvenida)
    return (
      <div className="p-4 max-w-2xl mx-auto text-center">
        <Lightbulb size={48} className="mx-auto text-yellow-400" />
        <h2 className="text-2xl font-bold text-white mt-4">Asistente Zootécnico GanaGenius</h2>
        <p className="mt-2 text-lg text-gray-300">
          Bienvenido a tu "Cuarto de Guerra".
        </p>
        <p className="mt-4 text-sm text-gray-400">
          GanaGenius usará la proyección de tus **Datos Reales** para ayudarte a tomar dos decisiones críticas:
        </p>
        <ul className="text-left text-sm text-gray-300 space-y-2 my-4 list-decimal list-inside">
          <li>**Diagnosticar** tu principal cuello de botella zootécnico (el eslabón más débil).</li>
          <li>**Optimizar** tu flujo de caja (linealidad) sugiriendo un plan de montas.</li>
        </ul>
        <button
          type="button"
          onClick={handleStartDiagnosis}
          className="mt-4 w-full rounded-md bg-sky-600 px-4 py-3 text-base font-medium text-white shadow-sm hover:bg-sky-500"
        >
          <TrendingUp size={18} className="inline-block -mt-1 mr-2" />
          Iniciar Diagnóstico Zootécnico
        </button>
      </div>
    );
  };

  // --- Renderizado del Componente ---
  // V8.5: La página ahora es un div simple, no un modal.
  return (
    <div className="py-8">
      {renderModalContent()}
    </div>
  );
};