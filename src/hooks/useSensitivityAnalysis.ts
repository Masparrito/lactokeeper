// --- ARCHIVO: src/hooks/useSensitivityAnalysis.ts ---
// (Confirmado para V8.5 - Listo para pasar datos de gráficos)

import { useState, useEffect, useRef } from 'react';
import { SimulationConfig } from './useHerdEvolution'; // Ajusta la ruta

// --- V8.1: Importar los tipos de mensajes del Worker ---
import { 
    SensitivityWorkerInput, 
    SensitivityWorkerOutput,
    SensitivityReport
} from '../workers/sensitivityWorker'; // ¡Asegúrate que la ruta sea correcta!

// --- V8.1: RE-EXPORTAR EL TIPO (Para que la UI lo use) ---
export type { SensitivityImpact } from '../workers/sensitivityWorker';

// --- V8.1: Importar el constructor del Worker (Vite) ---
import SensitivityWorker from '../workers/sensitivityWorker.ts?worker';

// -----------------------------------------------------------------------------
// --- HOOK DE ANÁLISIS DE SENSIBILIDAD (GanaGenius V8.1) ---
// -----------------------------------------------------------------------------

/**
 * Propiedades de entrada para el hook.
 */
interface UseSensitivityAnalysisProps {
  baseConfig: SimulationConfig | null;
  horizonInYears: number;
  /**
   * Poner a 'true' para iniciar el análisis.
   */
  enabled: boolean;
}

/**
 * El estado y los resultados devueltos por el hook.
 */
export interface UseSensitivityAnalysisResult {
  isLoading: boolean;
  /**
   * El reporte completo con el impacto de cada KPI.
   */
  report: SensitivityReport | null;
  error: string | null;
}

/**
 * Hook "GanaGenius" (V8.1) para el Diagnóstico Zootécnico.
 *
 * Ejecuta 4 simulaciones en un Web Worker (segundo plano) para
 * identificar qué KPI biológico (Preñez, Mortalidad, etc.)
 * tiene el mayor impacto en la rentabilidad.
 */
export const useSensitivityAnalysis = ({
  baseConfig,
  horizonInYears,
  enabled,
}: UseSensitivityAnalysisProps): UseSensitivityAnalysisResult => {
  
  // --- Estado Interno del Hook ---
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState<SensitivityReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Referencia al Worker ---
  const workerRef = useRef<Worker | null>(null);

  // --- Efecto Principal: Control del Worker ---
  useEffect(() => {
    
    // 1. Guardias: No correr si no está habilitado, o no hay config.
    if (!enabled || !baseConfig) {
      return;
    }
    
    // Evitar re-ejecución si ya está corriendo
    if (workerRef.current) {
        return;
    }

    // 2. Iniciar Proceso: Resetear estado y activar 'isLoading'
    setIsLoading(true);
    setReport(null);
    setError(null);
    console.log('[GanaGenius V8.5] Iniciando Análisis de Sensibilidad...');

    // 3. Crear el Worker
    try {
      const worker = new SensitivityWorker();
      workerRef.current = worker;

      // 4. Escuchar Mensajes (Resultados) del Worker
      worker.onmessage = (event: MessageEvent<SensitivityWorkerOutput>) => {
        const { type, report, error } = event.data;

        if (type === 'result' && report) {
          console.log('[GanaGenius V8.5] Análisis de Sensibilidad completado.', report);
          // El 'report' ahora contiene los 'monthlyData' para los gráficos
          setReport(report);
          setIsLoading(false);
          worker.terminate();
          workerRef.current = null;
        
        } else if (type === 'error') {
          console.error('[GanaGenius V8.5] Error en Sensitivity Worker:', error);
          setError(error ?? 'Error desconocido en el worker');
          setIsLoading(false);
          worker.terminate();
          workerRef.current = null;
        }
      };

      // 5. Escuchar Errores Generales del Worker
      worker.onerror = (err) => {
        console.error('[GanaGenius V8.5] Error fatal del Sensitivity Worker:', err);
        setError(`Error en el Worker: ${err.message || 'Falló la instanciación'}`);
        setIsLoading(false);
        worker.terminate();
        workerRef.current = null;
      };

      // 6. Enviar el "trabajo" (Config Base) al Worker
      const input: SensitivityWorkerInput = {
        baseConfig,
        horizonInYears,
      };
      worker.postMessage(input);

    } catch (err: any) {
        console.error('[GanaGenius V8.5] No se pudo crear el Sensitivity Worker:', err);
        setError(`No se pudo iniciar el análisis: ${err.message}`);
        setIsLoading(false);
    }

    // 7. Función de Limpieza
    return () => {
      if (workerRef.current) {
        console.log('[GanaGenius V8.5] Terminando análisis de sensibilidad...');
        workerRef.current.terminate();
        workerRef.current = null;
        setIsLoading(false);
      }
    };
    
  }, [baseConfig, horizonInYears, enabled]);

  // --- Devolver el estado actual a la UI ---
  return { isLoading, report, error };
};