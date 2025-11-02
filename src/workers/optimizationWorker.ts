// --- ARCHIVO: src/workers/optimizationWorker.ts ---
// (Actualizado para V8.0 - Corrección de Bundler)

// Este archivo se ejecuta en un hilo separado (Web Worker)

import { runSimulationEngine } from '../hooks/simulationEngine'; // Ajusta la ruta
import { calculateCV } from '../utils/analyticsHelpers'; // Ajusta la ruta
import { SimulationConfig } from '../hooks/useHerdEvolution';

// -----------------------------------------------------------------------------
// --- TIPOS DE MENSAJES DEL WORKER ---
// -----------------------------------------------------------------------------

// Mensaje que el hook envía AL worker
export type OptimizerWorkerInput = {
  baseConfig: SimulationConfig;
  horizonInYears: number;
  totalSimulations: number;
};

// Mensaje que el worker envía DE VUELTA al hook
export type OptimizerWorkerOutput = {
  type: 'progress' | 'result' | 'error';
  progress?: number; // 0.0 a 1.0
  bestCV?: number;
  bestDistribution?: number[];
  error?: string;
};

// -----------------------------------------------------------------------------
// --- FUNCIONES DEL OPTIMIZADOR ---
// -----------------------------------------------------------------------------

/**
 * Genera un array de 'n' números aleatorios que suman 100.
 * @param n El número de temporadas de monta (ej. 4)
 */
const generateRandomDistribution = (n: number): number[] => {
  if (n <= 0) return [];
  
  // 1. Generar n-1 puntos de corte aleatorios
  const cuts = Array.from({ length: n - 1 }, () => Math.random() * 100);
  cuts.sort((a, b) => a - b); // Ordenarlos
  
  // 2. Añadir 0 y 100
  const points = [0, ...cuts, 100];
  
  // 3. Calcular las diferencias (los porcentajes)
  const distribution: number[] = [];
  for (let i = 0; i < n; i++) {
    distribution.push(points[i + 1] - points[i]);
  }
  
  // 4. Redondear para que sean enteros (necesario para sumar 100)
  const rounded = distribution.map(d => Math.round(d));
  
  // 5. Ajustar la suma a 100 (por errores de redondeo)
  const sum = rounded.reduce((s, v) => s + v, 0);
  const diff = 100 - sum;
  
  // Añadir la diferencia al elemento más grande
  if (diff !== 0) {
    const maxIndex = rounded.indexOf(Math.max(...rounded));
    rounded[maxIndex] += diff;
  }
  
  return rounded;
};

/**
 * El cerebro de GanaGenius: corre simulaciones para encontrar la mejor linealidad.
 */
const findBestScenario = (
  baseConfig: SimulationConfig,
  horizonInYears: number,
  totalSimulations: number
) => {
  let bestCV = Infinity;
  let bestDistribution: number[] = [];

  // Contar cuántas temporadas de monta activas hay (1, 2, 3 o 4)
  const activeSeasons = [
    baseConfig.mesInicioMonta1,
    baseConfig.mesInicioMonta2,
    baseConfig.mesInicioMonta3,
    baseConfig.mesInicioMonta4,
  ].filter(m => typeof m === 'number' && m > 0).length;

  // Si no hay temporadas de monta, no se puede optimizar
  if (activeSeasons === 0) {
    throw new Error('No se definieron temporadas de monta.');
  }

  // Si solo hay 1 temporada, la única distribución es [100]
  if (activeSeasons === 1) {
    totalSimulations = 1;
  }

  // Iniciar la búsqueda
  for (let i = 0; i < totalSimulations; i++) {
    let currentDistribution: number[];

    if (i === 0) {
      // 1. La primera simulación (i=0) es el "Caso Base" (distribución uniforme)
      const equalPart = Math.round(100 / activeSeasons);
      currentDistribution = Array(activeSeasons).fill(equalPart);
      // Ajustar suma a 100
      const sum = currentDistribution.reduce((s, v) => s + v, 0);
      currentDistribution[0] += (100 - sum);

    } else if (activeSeasons === 1) {
      currentDistribution = [100];
    
    } else {
      // 2. Simulaciones aleatorias
      currentDistribution = generateRandomDistribution(activeSeasons);
    }

    // 3. Crear la config para esta simulación
    const simConfig: SimulationConfig = {
      ...baseConfig,
      matingDistribution: currentDistribution,
    };

    // 4. Correr el motor V8.0
    const monthlyData = runSimulationEngine(simConfig, horizonInYears);

    // 5. Calcular la métrica (Linealidad)
    const cv = calculateCV(monthlyData, horizonInYears);

    // 6. Comparar y guardar el mejor
    if (cv < bestCV) {
      bestCV = cv;
      bestDistribution = currentDistribution;
    }

    // 7. Reportar progreso (cada 10%)
    if (i % Math.floor(totalSimulations / 10) === 0) {
      // 'self' es el 'this' global de un Web Worker
      self.postMessage({
        type: 'progress',
        progress: (i / totalSimulations),
        bestCV: bestCV,
      });
    }
  }

  // 8. Enviar el resultado final
  self.postMessage({
    type: 'result',
    progress: 1.0,
    bestCV: bestCV,
    bestDistribution: bestDistribution,
  });
};

// -----------------------------------------------------------------------------
// --- PUNTO DE ENTRADA DEL WORKER ---
// -----------------------------------------------------------------------------

/**
 * Escucha los mensajes del hilo principal.
 */
self.onmessage = (event: MessageEvent<OptimizerWorkerInput>) => {
  try {
    const { baseConfig, horizonInYears, totalSimulations } = event.data;
    
    // Iniciar el proceso
    findBestScenario(baseConfig, horizonInYears, totalSimulations);

  } catch (e: any) {
    // Enviar un mensaje de error si algo falla
    self.postMessage({
      type: 'error',
      error: e.message || 'Error desconocido en el worker',
    });
  }
};

// (El 'export default {}' fue eliminado)