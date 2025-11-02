// --- NUEVO ARCHIVO: src/pages/modules/evolucion/GanaGeniusOptimizer.tsx ---
// (Corregido para usar formatNumber)

import React, { useState } from 'react';
import { Sparkles, Cpu, Lightbulb, X, CheckCircle } from 'lucide-react';
import { SimulationConfig } from '../../../hooks/useHerdEvolution';
import { useLinearityOptimizer } from '../../../hooks/useLinearityOptimizer';
import { formatNumber } from '../../../utils/formatters'; // <-- AHORA SE USA

// -----------------------------------------------------------------------------
// --- COMPONENTE GanaGeniusOptimizer ---
// -----------------------------------------------------------------------------

interface GanaGeniusOptimizerProps {
  /**
   * La config base (real o manual) para optimizar.
   */
  baseConfig: SimulationConfig | null;
  /**
   * El CV (Coef. de Variación) actual, para comparar.
   */
  baseCV: number | undefined;
  /**
   * El horizonte de la simulación.
   */
  horizonInYears: number;
}

export const GanaGeniusOptimizer: React.FC<GanaGeniusOptimizerProps> = ({ 
  baseConfig, 
  baseCV, 
  horizonInYears 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false); // 'enabled' para el hook

  // Hook GanaGenius: Se activa cuando isOptimizing = true
  const { isLoading, progress, bestCV, bestDistribution, error } = useLinearityOptimizer({
    baseConfig: baseConfig,
    horizonInYears: horizonInYears,
    enabled: isOptimizing,
  });

  // Nombres de los meses para mostrar la sugerencia
  const activeSeasons = [
    baseConfig?.mesInicioMonta1,
    baseConfig?.mesInicioMonta2,
    baseConfig?.mesInicioMonta3,
    baseConfig?.mesInicioMonta4,
  ].filter(m => typeof m === 'number' && m > 0);
  
  const monthLabels = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // --- Handlers ---
  const handleOpenModal = () => {
    // Resetear el estado al abrir el modal (por si se corrió antes)
    setIsOptimizing(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isLoading) return; // No permitir cerrar mientras se optimiza
    setIsModalOpen(false);
  };

  const handleStartOptimization = () => {
    if (baseConfig) {
      setIsOptimizing(true);
    }
  };

  // --- Renderizado del Contenido del Modal ---
  const renderModalContent = () => {
    // 1. Estado: Error
    if (error) {
      return (
        <div className="p-6 text-center">
          <h3 className="text-lg font-medium text-red-400">Error en GanaGenius</h3>
          <p className="mt-2 text-sm text-gray-400">
            Ocurrió un error en el worker de optimización:
          </p>
          <p className="mt-2 text-sm text-red-500 bg-red-900/50 p-2 rounded-md">
            {error}
          </p>
          <button
            type="button"
            onClick={handleCloseModal}
            className="mt-6 w-full rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-500"
          >
            Cerrar
          </button>
        </div>
      );
    }

    // 2. Estado: Cargando (Optimizando)
    if (isLoading) {
      return (
        <div className="p-6 text-center">
          <Cpu size={48} className="mx-auto text-sky-400 animate-pulse" />
          <h3 className="mt-4 text-lg font-medium text-white">GanaGenius está trabajando...</h3>
          <p className="mt-2 text-sm text-gray-400">
            Analizando {Math.round(progress * 200)} / 200 escenarios de montas.
          </p>
          <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
            <div 
              className="bg-sky-500 h-2.5 rounded-full transition-all" 
              style={{ width: `${progress * 100}%` }}
            ></div>
          </div>
          {bestCV && (
            <p className="mt-2 text-sm text-gray-500">
              Mejor CV encontrado hasta ahora: {formatNumber(bestCV, 1)}%
            </p>
          )}
        </div>
      );
    }

    // 3. Estado: Éxito (Resultado listo)
    if (bestCV !== null && bestDistribution) {
      const isBetter = typeof baseCV === 'number' ? bestCV < baseCV : true;
      
      const suggestion = bestDistribution.map((percent, index) => {
        const monthNumber = activeSeasons[index];
        if (typeof monthNumber !== 'number') return '?';
        const monthIndex = monthNumber - 1;
        const label = monthLabels[monthIndex] || 'Mes?';
        return `${label}: ${formatNumber(percent, 0)}%`; // <-- CORREGIDO
      }).join(' / ');

      return (
        <div className="p-6 text-center">
          <CheckCircle size={48} className={`mx-auto ${isBetter ? 'text-green-400' : 'text-sky-400'}`} />
          <h3 className="mt-4 text-lg font-medium text-white">Optimización Completa</h3>
          
          {isBetter ? (
            <>
              <p className="mt-2 text-sm text-gray-300">
                ¡Mejora encontrada! Es posible reducir tu Coeficiente de Variación (CV):
              </p>
              <div className="flex justify-center gap-4 my-4">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-xs text-red-400">CV Actual</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(baseCV, 1) ?? 'N/A'}%</p>
                </div>
                <div className="p-3 bg-green-900/50 border border-green-700 rounded-lg">
                  <p className="text-xs text-green-400">CV Óptimo</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(bestCV, 1)}%</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">Sugerencia de GanaGenius:</p>
              <p className="text-base font-semibold text-green-400 bg-gray-800 p-2 rounded-md mt-2">
                {suggestion}
              </p>
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-300">
              ¡Buen trabajo! Tu escenario actual (CV: {formatNumber(baseCV, 1)}%) 
              ya es el más lineal encontrado tras 200 simulaciones. No se requiere optimización.
            </p>
          )}

          <button
            type="button"
            onClick={handleCloseModal}
            className="mt-6 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
          >
            Entendido
          </button>
        </div>
      );
    }

    // 4. Estado: Inicial (Botón para iniciar)
    return (
      <div className="p-6 text-center">
        <Lightbulb size={48} className="mx-auto text-yellow-400" />
        <h3 className="mt-4 text-lg font-medium text-white">Asistente de Optimización GanaGenius</h3>
        <p className="mt-2 text-sm text-gray-400">
          GanaGenius analizará 200 escenarios de montas en segundo plano para encontrar la distribución que genere la producción de leche más estable (CV más bajo).
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Esto puede tardar unos segundos.
        </p>
        <button
          type="button"
          onClick={handleStartOptimization}
          className="mt-6 w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-sky-500"
        >
          <Sparkles size={16} className="inline-block -mt-1 mr-2" />
          Comenzar Optimización
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
        title="GanaGenius: Optimizar Linealidad"
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
            {renderModalContent()}
          </div>
        </div>
      )}
    </>
  );
};