// --- ARCHIVO: src/pages/modules/evolucion/GanaGeniusOptimizer.tsx ---
// (Actualizado para V8.2 - Mostrar "Cupos" Absolutos)

import React, { useState } from 'react';
import { Sparkles, Cpu, Lightbulb, X, CheckCircle, TrendingUp, BarChart, Check } from 'lucide-react';
import { SimulationConfig } from '../../../hooks/useHerdEvolution';
import { useLinearityOptimizer } from '../../../hooks/useLinearityOptimizer';
import { 
    useSensitivityAnalysis, 
    UseSensitivityAnalysisResult, 
    SensitivityImpact 
} from '../../../hooks/useSensitivityAnalysis'; 
import { formatNumber, formatCurrency } from '../../../utils/formatters';

// -----------------------------------------------------------------------------
// --- COMPONENTE GanaGeniusOptimizer ---
// -----------------------------------------------------------------------------

interface GanaGeniusOptimizerProps {
  baseConfig: SimulationConfig | null;
  horizonInYears: number;
  onSimulate: (config: SimulationConfig) => void;
}

type ModalStep = 'idle' | 'diagnosing' | 'diagnosis_result' | 'optimizing' | 'optimization_result';

export const GanaGeniusOptimizer: React.FC<GanaGeniusOptimizerProps> = ({ 
  baseConfig, 
  horizonInYears,
  onSimulate 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    error: linearityError 
  } = useLinearityOptimizer({
    baseConfig: baseConfig,
    horizonInYears: horizonInYears,
    enabled: modalStep === 'optimizing',
  });

  const isLoading = isDiagnosing || isOptimizing;
  const error = diagnosisError || linearityError;

  // --- Handlers ---
  const handleOpenModal = () => {
    setModalStep('idle');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isLoading) return; 
    setIsModalOpen(false);
    setModalStep('idle');
  };

  const handleStartDiagnosis = () => {
    if (baseConfig) {
      setModalStep('diagnosing');
    }
  };

  const handleStartLinearityOptimization = () => {
    if (baseConfig) {
      setModalStep('optimizing');
    }
  };

  // --- V8.2: Handler para Aplicar Sugerencia (Diagnóstico) ---
  const handleApplySensitivity = (bestKpi: SensitivityImpact) => {
    if (!baseConfig) return;

    let newConfig = { ...baseConfig };
    
    switch (bestKpi.kpi) {
      case 'Preñez':
        newConfig.porcentajePrenez = bestKpi.newValue;
        break;
      case 'Prolificidad':
        newConfig.porcentajeProlificidad = bestKpi.newValue;
        break;
      case 'Mortalidad':
        newConfig.mortalidadCrias = Math.max(0, (baseConfig.mortalidadCrias ?? 5) - 3);
        newConfig.mortalidadLevante = Math.max(0, (baseConfig.mortalidadLevante ?? 3) - 2);
        newConfig.mortalidadCabras = Math.max(0, (baseConfig.mortalidadCabras ?? 3) - 2);
        break;
    }
    
    onSimulate(newConfig);
    handleCloseModal();
  };

  // --- V8.2: Handler para Aplicar Sugerencia (Linealidad) ---
  const handleApplyLinearity = (distribution: number[]) => {
    if (!baseConfig) return;
    
    const newConfig: SimulationConfig = {
      ...baseConfig,
      matingDistribution: distribution,
    };
    
    onSimulate(newConfig);
    handleCloseModal();
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

    return (
      <div className="text-center">
        <CheckCircle size={48} className="mx-auto text-green-400" />
        <h3 className="mt-4 text-lg font-medium text-white">Diagnóstico Completo</h3>
        <p className="mt-2 text-sm text-gray-300">
          Tu **{bestKpi.kpi}** es tu eslabón más débil (y tu mayor oportunidad).
        </p>

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

        <p className="text-sm text-gray-400">
          **Recomendación:** Tu prioridad #1 debe ser mejorar tu **{bestKpi.kpi}**.
        </p>
        
        <button
          type="button"
          onClick={() => handleApplySensitivity(bestKpi)}
          className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-500"
        >
          <Check size={16} className="inline-block -mt-1 mr-2" />
          Aplicar y re-simular con este KPI
        </button>
        
        <hr className="border-gray-700 my-4" />
        
        <p className="text-sm text-gray-300 mb-2">
          **Paso 2 (Opcional):** Optimizar flujo de caja.
        </p>
        <button
          type="button"
          onClick={handleStartLinearityOptimization}
          className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
        >
          <BarChart size={16} className="inline-block -mt-1 mr-2" />
          Optimizar Linealidad
        </button>
      </div>
    );
  };

  // --- Sub-componente: Resultado de Linealidad (Paso 2) ---
  const renderLinearityResult = () => {
    const isBetter = (typeof bestDistribution !== 'undefined' && bestDistribution !== null);
    
    let suggestion = '';
    if (isBetter && bestDistribution) {
      // V8.2: Mostrar cupos absolutos (ej. 125 cabras) en lugar de %
      suggestion = bestDistribution.map((limit, index) => {
        const monthNumber = activeSeasons[index];
        if (typeof monthNumber !== 'number') return '?';
        const monthIndex = monthNumber - 1;
        const label = monthLabels[monthIndex] || 'Mes?';
        return `${label}: ${formatNumber(limit, 0)} cabras`;
      }).join(' / ');
    }

    return (
      <div className="text-center">
        <CheckCircle size={48} className={`mx-auto ${isBetter ? 'text-green-400' : 'text-sky-400'}`} />
        <h3 className="mt-4 text-lg font-medium text-white">Optimización de Linealidad Completa</h3>
        
        {isBetter ? (
          <>
            <p className="mt-2 text-sm text-gray-300">
              ¡Mejora de flujo de caja encontrada!
            </p>
            <div className="flex justify-center gap-4 my-4">
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-red-400">CV Actual</p>
                <p className="text-2xl font-bold text-white">{formatNumber(baseCV, 1)}%</p>
              </div>
              <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg">
                <p className="text-xs text-green-400">CV Óptimo</p>
                <p className="text-2xl font-bold text-white">{formatNumber(bestCV, 1)}%</p>
              </div>
            </div>
            {/* V8.2: Texto actualizado */}
            <p className="text-sm text-gray-300">Sugerencia: Distribuir los cupos de monta de cabras:</p>
            <p className="text-base font-semibold text-green-400 bg-gray-800 p-2 rounded-md mt-2">
              {suggestion}
            </p>
            <button
              type="button"
              onClick={() => handleApplyLinearity(bestDistribution!)} // '!' es seguro por el check 'isBetter'
              className="mt-6 w-full rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-500"
            >
              <Check size={16} className="inline-block -mt-1 mr-2" />
              Aplicar este Plan Optimizado
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
              onClick={handleCloseModal}
              className="mt-6 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
            >
              Entendido
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
        <div className="p-6 text-center">
          <h3 className="text-lg font-medium text-red-400">Error en GanaGenius</h3>
          <p className="mt-2 text-sm text-gray-400">{error}</p>
          <button type="button" onClick={handleCloseModal} className="mt-6 w-full rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white">
            Cerrar
          </button>
        </div>
      );
    }
    
    // 2. Cargando (Paso 1 - Diagnóstico)
    if (isDiagnosing) {
      return (
        <div className="p-6 text-center">
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
        <div className="p-6 text-center">
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
      <div className="p-6 text-center">
        <Lightbulb size={48} className="mx-auto text-yellow-400" />
        <h3 className="mt-4 text-lg font-medium text-white">Asistente Zootécnico GanaGenius</h3>
        <p className="mt-2 text-sm text-gray-400">
          GanaGenius analizará tu simulación para identificar tu eslabón más débil y te ofrecerá optimizar tu flujo de caja.
        </p>
        <button
          type="button"
          onClick={handleStartDiagnosis}
          className="mt-6 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
        >
          <TrendingUp size={16} className="inline-block -mt-1 mr-2" />
          Iniciar Diagnóstico Zootécnico
        </button>
      </div>
    );
  };

  // --- Renderizado del Componente ---
  return (
    <>
      {/* 1. El Botón-Ícono (que vive en la cabecera) */}
      <button 
        onClick={handleOpenModal}
        disabled={!baseConfig} // Deshabilitado si no hay config
        title="GanaGenius: Asistente Zootécnico"
        className="p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-800 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Sparkles size={20} />
      </button>

      {/* 2. El Modal (que se muestra al hacer clic) */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-md bg-gray-900 border border-brand-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()} 
          >
            {/* Botón de Cerrar (dentro del modal) */}
            {!isLoading && (
              <button
                onClick={handleCloseModal}
                title="Cerrar"
                className="absolute top-3 right-3 p-2 text-gray-500 rounded-full transition-colors hover:bg-gray-800 hover:text-white"
              >
                <X size={20} />
              </button>
            )}
            
            {/* Contenido dinámico del modal */}
            <div className="p-4">
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};