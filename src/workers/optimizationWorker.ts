// --- ARCHIVO: src/workers/optimizationWorker.ts ---
// (Actualizado para V8.5 - Devolver datos de gráficos comparativos)

import { runSimulationEngine } from '../hooks/simulationEngine'; // Ajusta la ruta
import { calculateCV } from '../utils/analyticsHelpers'; // Ajusta la ruta
import { SimulationConfig, MonthlyEvolutionStep } from '../hooks/useHerdEvolution'; // Importar MonthlyEvolutionStep

// -----------------------------------------------------------------------------
// --- TIPOS DE MENSAJES DEL WORKER ---
// -----------------------------------------------------------------------------

export type OptimizerWorkerInput = {
  baseConfig: SimulationConfig;
  horizonInYears: number;
  totalSimulations: number;
};

export interface SensitivityImpact {
  kpi: 'Preñez' | 'Prolificidad' | 'Mortalidad';
  impact: number;
  newValue: number;
}

export interface SensitivityReport {
  baseIncome: number;
  baseCV: number;
  impacts: SensitivityImpact[];
}

export type OptimizerWorkerOutput = {
  type: 'progress' | 'result' | 'error';
  progress?: number;
  baseCV?: number;
  bestCV?: number;
  bestDistribution?: number[];
  error?: string;
  
  // --- V8.5: Añadido para el gráfico comparativo ---
  baseMonthlyData?: MonthlyEvolutionStep[];
  bestMonthlyData?: MonthlyEvolutionStep[];
};

// -----------------------------------------------------------------------------
// --- FUNCIONES DEL OPTIMIZADOR ---
// -----------------------------------------------------------------------------

const generateRandomDistribution = (n: number, totalAnimals: number): number[] => {
  if (n <= 0) return [];
  if (totalAnimals === 0) return Array(n).fill(0);
  
  const cuts = Array.from({ length: n - 1 }, () => Math.random() * totalAnimals);
  cuts.sort((a, b) => a - b);
  const points = [0, ...cuts, totalAnimals];
  const distribution: number[] = [];
  for (let i = 0; i < n; i++) {
    distribution.push(points[i + 1] - points[i]);
  }
  const rounded = distribution.map(d => Math.round(d));
  const sum = rounded.reduce((s, v) => s + v, 0);
  const diff = totalAnimals - sum;
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
  totalSimulations: number // ej. 200
) => {
  
  const activeSeasons = [
    baseConfig.mesInicioMonta1,
    baseConfig.mesInicioMonta2,
    baseConfig.mesInicioMonta3,
    baseConfig.mesInicioMonta4,
  ].filter(m => typeof m === 'number' && m > 0).length;

  if (activeSeasons === 0) {
    throw new Error('No se definieron temporadas de monta.');
  }

  const totalGoatsToDistribute = baseConfig.initialCabras ?? 0;

  // --- V8.1: PASO 1 ---
  // Correr la simulación base (matingDistribution: undefined)
  const baseMonthlyData = runSimulationEngine(baseConfig, horizonInYears);
  const baseCV = calculateCV(baseMonthlyData, horizonInYears);

  let bestCV = baseCV;
  let bestDistribution: number[] | undefined = undefined;
  // --- V8.5: Guardar los datos de la mejor simulación ---
  let bestMonthlyData: MonthlyEvolutionStep[] = baseMonthlyData; 

  // Reportar el progreso inicial (0%)
  self.postMessage({
    type: 'progress',
    progress: 0,
    baseCV: baseCV,
    bestCV: bestCV,
  });

  if (activeSeasons === 1) {
    totalSimulations = 1; // Solo se corrió el base case
  }
  
  const simulationsToRun = totalSimulations - 1; // Ya corrimos el base case

  // --- V8.2: PASO 2 ---
  for (let i = 0; i < simulationsToRun; i++) {
    let currentDistribution: number[];

    if (i === 0) {
      // "Caso Uniforme": Repartir el rebaño de cabras equitativamente
      const equalPart = Math.round(totalGoatsToDistribute / activeSeasons);
      currentDistribution = Array(activeSeasons).fill(equalPart);
      const sum = currentDistribution.reduce((s, v) => s + v, 0);
      currentDistribution[0] += (totalGoatsToDistribute - sum); // Ajustar suma
    } else {
      // "Casos Aleatorios": Repartir el rebaño aleatoriamente
      currentDistribution = generateRandomDistribution(activeSeasons, totalGoatsToDistribute);
    }

    const simConfig: SimulationConfig = {
      ...baseConfig,
      matingDistribution: currentDistribution, // Ej. [125, 125, 125, 125]
    };

    const monthlyData = runSimulationEngine(simConfig, horizonInYears);
    const cv = calculateCV(monthlyData, horizonInYears);

    if (cv < bestCV) {
      bestCV = cv;
      bestDistribution = currentDistribution;
      bestMonthlyData = monthlyData; // V8.5: Guardar los datos de la nueva mejor sim
    }

    if (i % Math.floor(simulationsToRun / 20) === 0) {
      self.postMessage({
        type: 'progress',
        progress: (i / simulationsToRun),
        baseCV: baseCV,
        bestCV: bestCV,
      });
    }
  }

  // --- V8.5: PASO 3 ---
  // Enviar el resultado final, incluyendo los datos del gráfico
  self.postMessage({
    type: 'result',
    progress: 1.0,
    baseCV: baseCV,
    bestCV: bestCV,
    bestDistribution: bestDistribution,
    baseMonthlyData: baseMonthlyData, // V8.5
    bestMonthlyData: bestMonthlyData, // V8.5
  });
};

// -----------------------------------------------------------------------------
// --- PUNTO DE ENTRADA DEL WORKER ---
// -----------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<OptimizerWorkerInput>) => {
  try {
    const { baseConfig, horizonInYears, totalSimulations } = event.data;
    if (!baseConfig) {
      throw new Error('No se proporcionó configuración base al worker.');
    }
    findBestScenario(baseConfig, horizonInYears, totalSimulations);
  } catch (e: any) {
    self.postMessage({
      type: 'error',
      error: e.message || 'Error desconocido en el worker de optimización',
    });
  }
};