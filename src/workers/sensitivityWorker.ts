// --- ARCHIVO: src/workers/sensitivityWorker.ts ---
// (Actualizado para V8.5 - Devolver datos de gráficos comparativos)

import { runSimulationEngine } from '../hooks/simulationEngine'; // Ajusta la ruta
import { SimulationConfig, MonthlyEvolutionStep } from '../hooks/useHerdEvolution';

// -----------------------------------------------------------------------------
// --- TIPOS DE MENSAJES DEL WORKER ---
// -----------------------------------------------------------------------------

// Mensaje que el hook envía AL worker
export type SensitivityWorkerInput = {
  baseConfig: SimulationConfig;
  horizonInYears: number;
};

// V8.5: El resultado del análisis de un KPI
export interface SensitivityImpact {
  kpi: 'Preñez' | 'Prolificidad' | 'Mortalidad';
  impact: number; // El $ ganado
  newValue: number; // El nuevo valor del KPI (ej. 85%)
  monthlyData: MonthlyEvolutionStep[]; // V8.5: Datos para el gráfico
}

// V8.5: El reporte completo que se devuelve a la UI
export interface SensitivityReport {
  baseIncome: number;
  baseCV: number; // (Aún no se usa, pero está en el tipo)
  baseMonthlyData: MonthlyEvolutionStep[]; // V8.5: Datos para el gráfico
  impacts: SensitivityImpact[];
}

// Mensaje que el worker envía DE VUELTA al hook
export type SensitivityWorkerOutput = {
  type: 'result' | 'error';
  report?: SensitivityReport;
  error?: string;
};

// -----------------------------------------------------------------------------
// --- FUNCIONES DEL ANALIZADOR ---
// -----------------------------------------------------------------------------

/**
 * Función de ayuda para calcular el ingreso total de una simulación.
 */
const calculateTotalIncome = (monthlyData: MonthlyEvolutionStep[]): number => {
  return monthlyData.reduce((sum, month) => sum + month.ingresosTotales, 0);
};

/**
 * Ejecuta el análisis de sensibilidad V8.5
 */
const runSensitivityAnalysis = (
  baseConfig: SimulationConfig,
  horizonInYears: number
) => {
  
  const impacts: SensitivityImpact[] = [];

  // --- 1. SIMULACIÓN BASE ---
  // (Usando los datos reales o manuales del usuario)
  const baseMonthlyData = runSimulationEngine(baseConfig, horizonInYears);
  const baseIncome = calculateTotalIncome(baseMonthlyData);
  
  // --- 2. SIMULACIÓN: MEJORAR PREÑEZ ---
  const newPrenez = (baseConfig.porcentajePrenez ?? 85) + 10;
  const configPrenez: SimulationConfig = {
    ...baseConfig,
    porcentajePrenez: newPrenez > 100 ? 100 : newPrenez,
  };
  const dataPrenez = runSimulationEngine(configPrenez, horizonInYears);
  const incomePrenez = calculateTotalIncome(dataPrenez);
  impacts.push({
    kpi: 'Preñez',
    impact: incomePrenez - baseIncome,
    newValue: configPrenez.porcentajePrenez!,
    monthlyData: dataPrenez, // V8.5
  });

  // --- 3. SIMULACIÓN: MEJORAR PROLIFICIDAD ---
  const newProlif = (baseConfig.porcentajeProlificidad ?? 120) + 10;
  const configProlif: SimulationConfig = {
    ...baseConfig,
    porcentajeProlificidad: newProlif,
  };
  const dataProlif = runSimulationEngine(configProlif, horizonInYears);
  const incomeProlif = calculateTotalIncome(dataProlif);
  impacts.push({
    kpi: 'Prolificidad',
    impact: incomeProlif - baseIncome,
    newValue: configProlif.porcentajeProlificidad!,
    monthlyData: dataProlif, // V8.5
  });

  // --- 4. SIMULACIÓN: REDUCIR MORTALIDAD ---
  const newMortCrias = Math.max(0, (baseConfig.mortalidadCrias ?? 5) - 3);
  const newMortLevante = Math.max(0, (baseConfig.mortalidadLevante ?? 3) - 2);
  const newMortCabras = Math.max(0, (baseConfig.mortalidadCabras ?? 3) - 2);
  
  const configMort: SimulationConfig = {
    ...baseConfig,
    mortalidadCrias: newMortCrias,
    mortalidadLevante: newMortLevante,
    mortalidadCabras: newMortCabras,
  };
  const dataMort = runSimulationEngine(configMort, horizonInYears);
  const incomeMort = calculateTotalIncome(dataMort);
  impacts.push({
    kpi: 'Mortalidad',
    impact: incomeMort - baseIncome,
    newValue: newMortCrias, // Solo reportamos el de crías como referencia
    monthlyData: dataMort, // V8.5
  });

  // 5. Enviar el reporte final
  const report: SensitivityReport = {
    baseIncome: baseIncome,
    baseCV: 0,
    baseMonthlyData: baseMonthlyData, // V8.5
    impacts: impacts.sort((a, b) => b.impact - a.impact), // Ordenar por mayor impacto
  };
  
  self.postMessage({
    type: 'result',
    report: report,
  });
};

// -----------------------------------------------------------------------------
// --- PUNTO DE ENTRADA DEL WORKER ---
// -----------------------------------------------------------------------------

self.onmessage = (event: MessageEvent<SensitivityWorkerInput>) => {
  try {
    const { baseConfig, horizonInYears } = event.data;
    
    if (!baseConfig) {
      throw new Error('No se proporcionó configuración base al worker.');
    }
    
    runSensitivityAnalysis(baseConfig, horizonInYears);

  } catch (e: any) {
    self.postMessage({
      type: 'error',
      error: e.message || 'Error desconocido en el worker de sensibilidad',
    });
  }
};