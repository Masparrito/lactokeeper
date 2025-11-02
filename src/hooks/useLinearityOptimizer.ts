// --- ARCHIVO: src/hooks/useLinearityOptimizer.ts ---
// (Actualizado para V8.0 - Corrección de Bundler)

import { useState, useEffect, useRef } from 'react';
import { SimulationConfig } from './useHerdEvolution'; // Ajusta la ruta

// --- V8.0: Importar los tipos de mensajes del Worker ---
import { 
    OptimizerWorkerInput, 
    OptimizerWorkerOutput 
} from '../workers/optimizationWorker'; // ¡Asegúrate que la ruta sea correcta!

// --- V8.0: CORRECCIÓN DE BUNDLER (Vite) ---
// Importar el constructor del Worker usando el sufijo '?worker' de Vite
import OptimizerWorker from '../workers/optimizationWorker.ts?worker';

// -----------------------------------------------------------------------------
// --- HOOK DE OPTIMIZACIÓN (GanaGenius V8.0) ---
// -----------------------------------------------------------------------------

/**
 * Propiedades de entrada para el hook optimizador.
 */
interface UseLinearityOptimizerProps {
  /**
   * La configuración base (ej. realConfig) que se usará como punto de partida.
   */
  baseConfig: SimulationConfig | null;
  /**
   * El horizonte (ej. 3 años) para correr las simulaciones.
   */
  horizonInYears: number;
  /**
   * Un interruptor para activar el hook. Poner a 'true' para iniciar la optimización.
   */
  enabled: boolean;
  /**
   * El número total de simulaciones a correr.
   */
  totalSimulations?: number;
}

/**
 * El estado y los resultados devueltos por el hook.
 */
export interface UseLinearityOptimizerResult {
  /**
   * True si el worker está calculando escenarios.
   */
  isLoading: boolean;
  /**
   * El progreso del cálculo (0.0 a 1.0).
   */
  progress: number;
  /**
   * El Coeficiente de Variación (CV) más bajo encontrado.
   */
  bestCV: number | null;
  /**
   * La distribución de montas (ej. [40, 30, 20, 10]) que logró el mejor CV.
   */
  bestDistribution: number[] | null;
  /**
   * Mensaje de error, si ocurre alguno.
   */
  error: string | null;
}

/**
 * Hook "GanaGenius" (V8.0) para la Optimización de Linealidad.
 *
 * Ejecuta cientos de simulaciones en un Web Worker (segundo plano)
 * para encontrar la distribución de montas que genera el flujo de
 * producción de leche más estable (CV más bajo).
 */
export const useLinearityOptimizer = ({
  baseConfig,
  horizonInYears,
  enabled,
  totalSimulations = 200, // Correr 200 escenarios por defecto
}: UseLinearityOptimizerProps): UseLinearityOptimizerResult => {
  
  // --- Estado Interno del Hook ---
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bestCV, setBestCV] = useState<number | null>(null);
  const [bestDistribution, setBestDistribution] = useState<number[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Referencia al Worker ---
  const workerRef = useRef<Worker | null>(null);

  // --- Efecto Principal: Control del Worker ---
  useEffect(() => {
    
    // 1. Guardias: No correr si no está habilitado, no hay config, o ya está corriendo.
    if (!enabled || !baseConfig || isLoading) {
      return;
    }

    // 2. Iniciar Proceso: Resetear estado y activar 'isLoading'
    setIsLoading(true);
    setProgress(0);
    setBestCV(null);
    setBestDistribution(null);
    setError(null);
    console.log('[GanaGenius V8.0] Iniciando optimizador de linealidad...');

    // 3. Crear el Worker
    try {
      // --- V8.0: CORRECCIÓN DE BUNDLER (Vite) ---
      // Usar el constructor importado con '?worker'
      const worker = new OptimizerWorker();
      workerRef.current = worker;
      // --- FIN CORRECCIÓN ---

      // 4. Escuchar Mensajes (Resultados) del Worker
      worker.onmessage = (event: MessageEvent<OptimizerWorkerOutput>) => {
        const { type, progress, bestCV, bestDistribution, error } = event.data;

        if (type === 'progress') {
          setProgress(progress ?? 0);
          if (bestCV) setBestCV(bestCV);
        
        } else if (type === 'result') {
          console.log('[GanaGenius V8.0] ¡Optimización completada!', event.data);
          setIsLoading(false);
          setProgress(progress ?? 1);
          setBestCV(bestCV ?? null);
          setBestDistribution(bestDistribution ?? null);
          worker.terminate(); // ¡Trabajo terminado!
          workerRef.current = null;
        
        } else if (type === 'error') {
          console.error('[GanaGenius V8.0] Error en Worker:', error);
          setIsLoading(false);
          setError(error ?? 'Error desconocido en el worker');
          worker.terminate();
          workerRef.current = null;
        }
      };

      // 5. Escuchar Errores Generales del Worker
      worker.onerror = (err) => {
        console.error('[GanaGenius V8.0] Error fatal del Worker:', err);
        setIsLoading(false);
        // CORRECCIÓN: Devolver el mensaje de error real
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
        console.error('[GanaGenius V8.0] No se pudo crear el Worker:', err);
        setIsLoading(false);
        setError(`No se pudo iniciar el optimizador: ${err.message}`);
    }

    // 7. Función de Limpieza (CRÍTICA)
    // Se ejecuta si el componente se desmonta o si 'enabled' cambia a false
    return () => {
      if (workerRef.current) {
        console.log('[GanaGenius V8.0] Terminando optimización prematuramente...');
        workerRef.current.terminate();
        workerRef.current = null;
        setIsLoading(false); // Resetear estado
      }
    };
    
  }, [baseConfig, horizonInYears, enabled, totalSimulations, isLoading]); // 'isLoading' previene re-arranques

  // --- Devolver el estado actual a la UI ---
  return { isLoading, progress, bestCV, bestDistribution, error };
};