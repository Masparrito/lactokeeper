// --- ARCHIVO: src/hooks/useLinearityOptimizer.ts ---
// (Actualizado para V8.5 - Devolver datos de gráficos comparativos)

import { useState, useEffect, useRef } from 'react';
import { SimulationConfig, MonthlyEvolutionStep } from './useHerdEvolution'; // Ajusta la ruta

// --- V8.0: Importar los tipos de mensajes del Worker ---
import { 
    OptimizerWorkerInput, 
    OptimizerWorkerOutput 
} from '../workers/optimizationWorker'; // ¡Asegúrate que la ruta sea correcta!

// --- V8.0: CORRECCIÓN DE BUNDLER (Vite) ---
// Importar el constructor del Worker usando el sufijo '?worker' de Vite
import OptimizerWorker from '../workers/optimizationWorker.ts?worker';

// -----------------------------------------------------------------------------
// --- HOOK DE OPTIMIZACIÓN (GanaGenius V8.5) ---
// -----------------------------------------------------------------------------

/**
 * Propiedades de entrada para el hook optimizador.
 */
interface UseLinearityOptimizerProps {
  baseConfig: SimulationConfig | null;
  horizonInYears: number;
  enabled: boolean;
  totalSimulations?: number;
}

/**
 * El estado y los resultados devueltos por el hook.
 */
export interface UseLinearityOptimizerResult {
  isLoading: boolean;
  progress: number;
  baseCV: number | null;
  bestCV: number | null;
  bestDistribution: number[] | null;
  error: string | null;
  
  // --- V8.5: Añadido para el gráfico comparativo ---
  baseMonthlyData: MonthlyEvolutionStep[] | null;
  bestMonthlyData: MonthlyEvolutionStep[] | null;
}

/**
 * Hook "GanaGenius" (V8.5) para la Optimización de Linealidad.
 */
export const useLinearityOptimizer = ({
  baseConfig,
  horizonInYears,
  enabled,
  totalSimulations = 200,
}: UseLinearityOptimizerProps): UseLinearityOptimizerResult => {
  
  // --- Estado Interno del Hook (V8.5: Añadidos datos de gráficos) ---
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [baseCV, setBaseCV] = useState<number | null>(null);
  const [bestCV, setBestCV] = useState<number | null>(null);
  const [bestDistribution, setBestDistribution] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // V8.5: Estados para los datos del gráfico
  const [baseMonthlyData, setBaseMonthlyData] = useState<MonthlyEvolutionStep[] | null>(null);
  const [bestMonthlyData, setBestMonthlyData] = useState<MonthlyEvolutionStep[] | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // --- Efecto Principal: Control del Worker ---
  useEffect(() => {
    
    if (!enabled || !baseConfig) {
      return;
    }
    
    if (workerRef.current) {
        return; // Ya está corriendo
    }

    // 2. Iniciar Proceso: Resetear estado
    setIsLoading(true);
    setProgress(0);
    setBaseCV(null);
    setBestCV(null);
    setBestDistribution(null);
    setError(null);
    setBaseMonthlyData(null); // V8.5
    setBestMonthlyData(null); // V8.5
    console.log('[GanaGenius V8.5] Iniciando optimizador de linealidad...');

    // 3. Crear el Worker
    try {
      const worker = new OptimizerWorker();
      workerRef.current = worker;

      // 4. Escuchar Mensajes (Resultados) del Worker
      worker.onmessage = (event: MessageEvent<OptimizerWorkerOutput>) => {
        const { 
          type, progress, baseCV, bestCV, 
          bestDistribution, error, 
          baseMonthlyData, bestMonthlyData // V8.5
        } = event.data;

        if (type === 'progress') {
          setProgress(progress ?? 0);
          if (baseCV) setBaseCV(baseCV);
          if (bestCV) setBestCV(bestCV);
        
        } else if (type === 'result') {
          console.log('[GanaGenius V8.5] ¡Optimización completada!', event.data);
          setIsLoading(false);
          setProgress(progress ?? 1);
          setBaseCV(baseCV ?? null);
          setBestCV(bestCV ?? null);
          setBestDistribution(bestDistribution ?? null);
          setBaseMonthlyData(baseMonthlyData ?? null); // V8.5
          setBestMonthlyData(bestMonthlyData ?? null); // V8.5
          
          worker.terminate();
          workerRef.current = null;
        
        } else if (type === 'error') {
          console.error('[GanaGenius V8.5] Error en Worker:', error);
          setIsLoading(false);
          setError(error ?? 'Error desconocido en el worker');
          worker.terminate();
          workerRef.current = null;
        }
      };

      // 5. Escuchar Errores Generales del Worker
      worker.onerror = (err) => {
        console.error('[GanaGenius V8.5] Error fatal del Worker:', err);
        setIsLoading(false);
        setError(`Error en el Worker: ${err.message || 'Falló la instanciación'}`);
        worker.terminate();
        workerRef.current = null;
      };

      // 6. Enviar el "trabajo" (Config Base) al Worker
      const input: OptimizerWorkerInput = {
        baseConfig,
        horizonInYears,
        totalSimulations,
      };
      worker.postMessage(input);

    } catch (err: any) {
        console.error('[GanaGenius V8.5] No se pudo crear el Worker:', err);
        setIsLoading(false);
        setError(`No se pudo iniciar el optimizador: ${err.message}`);
    }

    // 7. Función de Limpieza
    return () => {
      if (workerRef.current) {
        console.log('[GanaGenius V8.5] Terminando optimización prematuramente...');
        workerRef.current.terminate();
        workerRef.current = null;
        setIsLoading(false);
      }
    };
    
  }, [baseConfig, horizonInYears, enabled, totalSimulations]);

  // --- Devolver el estado actual a la UI ---
  return { 
    isLoading, 
    progress, 
    baseCV, 
    bestCV, 
    bestDistribution, 
    error,
    baseMonthlyData, // V8.5
    bestMonthlyData  // V8.5
  };
};