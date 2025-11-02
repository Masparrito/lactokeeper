import { useMemo } from 'react';
// --- V8.0: Importar el motor ---
import { runSimulationEngine } from './simulationEngine'; // ¡Verifica esta ruta!

// -----------------------------------------------------------------------------
// INTERFAZ DE CONFIGURACIÓN (V8.0: ACTUALIZADA)
// -----------------------------------------------------------------------------
export interface SimulationConfig {
  initialCabras: number;
  initialLevanteTardio: number;
  initialLevanteMedio: number;
  initialLevanteTemprano: number;
  initialCriaH: number;
  initialCriaM: number;
  initialPadres: number;
  comprasVientresAnual?: number;
  mesInicioMonta1?: number;
  mesInicioMonta2?: number;
  mesInicioMonta3?: number;
  mesInicioMonta4?: number;
  duracionMontaDias?: number;
  diasGestacion?: number;
  distribucionPartosPorcentaje?: number;
  distribucionPartosDias?: number;
  litrosPromedioPorAnimal?: number;
  litrosPicoPorAnimal?: number; // V5.0
  diasLactanciaObjetivo?: number; // 210 o 305
  porcentajePrenez?: number;
  porcentajeProlificidad?: number;
  mortalidadCrias?: number;
  mortalidadLevante?: number;
  mortalidadCabras?: number;
  tasaReemplazo?: number;
  eliminacionCabritos?: number;
  precioLecheLitro?: number;
  precioVentaCabritoKg?: number;
  precioVentaDescarteAdulto?: number;
  monedaSimbolo?: string;
  
  // --- V8.0: Añadido para GanaGenius Optimizer ---
  // Un array de porcentajes [40, 10, 30, 20] que coincide con las 4 temporadas
  matingDistribution?: number[]; 
}

// -----------------------------------------------------------------------------
// INTERFACES DE RESULTADOS (V4.3)
// -----------------------------------------------------------------------------
export interface MonthlyEvolutionStep {
  monthIndex: number; year: number; month: number; periodLabel: string;
  startCriaH: number; startCriaM: number; startLevanteTemprano: number; startLevanteMedio: number; startLevanteTardio: number; startCabras: number; startPadres: number; startTotal: number;
  partos: number; nacimientosH: number; nacimientosM: number;
  muertesCriaH: number; muertesCriaM: number; muertesLevanteTemprano: number; muertesLevanteMedio: number; muertesLevanteTardio: number; muertesCabras: number; muertesPadres: number; muertesTotales: number;
  ventasCabritos: number; ventasDescartes: number; ventasTotales: number;
  comprasVientres: number; comprasPadres: number; comprasTotales: number;
  promocionCriaH: number; promocionLevanteTemprano: number; promocionLevanteMedio: number; promocionLevanteTardio: number;
  endCriaH: number; endCriaM: number; endLevanteTemprano: number; endLevanteMedio: number; endLevanteTardio: number; endCabras: number; endPadres: number; endTotal: number;
  litrosLeche: number; 
  ingresosTotales: number;
  hembrasProduccion: number;
  ingresosLeche: number; 
}

interface AggregatedStepBase {
  startTotal: number; endTotal: number; netChange: number; growthRate: number;
  startCriaH: number; startCriaM: number; startLevanteTemprano: number; startLevanteMedio: number; startLevanteTardio: number; startCabras: number; startPadres: number;
  endCriaH: number; endCriaM: number; endLevanteTemprano: number; endLevanteMedio: number; endLevanteTardio: number; endCabras: number; endPadres: number;
  nacimientosH: number; nacimientosM: number;
  muertesCriaH: number; muertesCriaM: number; muertesLevanteTemprano: number; muertesLevanteMedio: number; muertesLevanteTardio: number; muertesCabras: number; muertesPadres: number; muertesTotales: number;
  ventasCabritos: number; ventasDescartes: number; ventasTotales: number;
  comprasVientres: number; comprasPadres: number; comprasTotales: number;
  promocionCriaH: number; promocionLevanteTemprano: number; promocionLevanteMedio: number; promocionLevanteTardio: number;
  kpiProductivasCount: number; kpiProductivasPercent: number; kpiCrecimientoCount: number; kpiCrecimientoPercent: number;
  litrosLeche: number; ingresosTotales: number;
}

export interface SemestralEvolutionStep extends AggregatedStepBase { semestreIndex: number; year: number; periodLabel: string; }
export interface AnnualEvolutionStep extends AggregatedStepBase { year: number; periodLabel: string; }
export interface UseHerdEvolutionResult { 
  monthlyData: MonthlyEvolutionStep[]; 
  semestralData: SemestralEvolutionStep[]; 
  annualData: AnnualEvolutionStep[];
}

// -----------------------------------------------------------------------------
// LÓGICA DE AGREGACIÓN (V4.1 - SIN CAMBIOS)
// -----------------------------------------------------------------------------
function aggregateMonthlyData<T extends SemestralEvolutionStep | AnnualEvolutionStep>(
  monthlyData: MonthlyEvolutionStep[],
  monthsPerStep: 6 | 12,
  stepType: 'Semestral' | 'Anual'
): T[] {
  const aggregatedData: T[] = [];
  if (!monthlyData || monthlyData.length === 0) { return aggregatedData; }
  for (let i = 0; i < monthlyData.length; i += monthsPerStep) {
    const periodMonths = monthlyData.slice(i, i + monthsPerStep);
    if (periodMonths.length === 0) continue;
    const pStart = periodMonths[0]; 
    const pEnd = periodMonths[periodMonths.length - 1];
    if (!pStart || !pEnd) continue;
    const startTotal = pStart.startTotal; const endTotal = pEnd.endTotal; const netChange = endTotal - startTotal;
    const prevStep = aggregatedData[aggregatedData.length - 1]; const prevStepEndTotal = prevStep ? prevStep.endTotal : startTotal;
    const growthRate = prevStepEndTotal > 0 ? (netChange / prevStepEndTotal) * 100 : 0;
    const sum = (field: keyof MonthlyEvolutionStep): number => periodMonths.reduce((acc: number, m: MonthlyEvolutionStep | undefined) => (m && typeof m[field] === 'number' ? acc + (m[field] as number) : acc), 0);
    const kpiProductivasCount = pEnd.endCabras + pEnd.endLevanteTardio;
    const kpiProductivasPercent = endTotal > 0 ? (kpiProductivasCount / endTotal) * 100 : 0;
    const kpiCrecimientoCount = pEnd.endCriaH + pEnd.endLevanteTemprano + pEnd.endLevanteMedio;
    const kpiCrecimientoPercent = endTotal > 0 ? (kpiCrecimientoCount / endTotal) * 100 : 0;
    const aggregatedStep: AggregatedStepBase = {
      startTotal, endTotal, netChange, growthRate,
      startCriaH: pStart.startCriaH, startCriaM: pStart.startCriaM,
      startLevanteTemprano: pStart.startLevanteTemprano,
      startLevanteMedio: pStart.startLevanteMedio,
      startLevanteTardio: pStart.startLevanteTardio,
      startCabras: pStart.startCabras,
      startPadres: pStart.startPadres,
      endCriaH: pEnd.endCriaH, endCriaM: pEnd.endCriaM, endLevanteTemprano: pEnd.endLevanteTemprano, endLevanteMedio: pEnd.endLevanteMedio, endLevanteTardio: pEnd.endLevanteTardio, endCabras: pEnd.endCabras, endPadres: pEnd.endPadres,
      nacimientosH: sum('nacimientosH'), nacimientosM: sum('nacimientosM'),
      muertesCriaH: sum('muertesCriaH'), muertesCriaM: sum('muertesCriaM'), muertesLevanteTemprano: sum('muertesLevanteTemprano'), muertesLevanteMedio: sum('muertesLevanteMedio'), muertesLevanteTardio: sum('muertesLevanteTardio'), muertesCabras: sum('muertesCabras'), muertesPadres: sum('muertesPadres'), muertesTotales: sum('muertesTotales'),
      ventasCabritos: sum('ventasCabritos'), ventasDescartes: sum('ventasDescartes'), ventasTotales: sum('ventasTotales'),
      comprasVientres: sum('comprasVientres'), comprasPadres: sum('comprasPadres'), comprasTotales: sum('comprasTotales'),
      promocionCriaH: sum('promocionCriaH'), promocionLevanteTemprano: sum('promocionLevanteTemprano'), promocionLevanteMedio: sum('promocionLevanteMedio'), promocionLevanteTardio: sum('promocionLevanteTardio'),
      kpiProductivasCount, kpiProductivasPercent, kpiCrecimientoCount, kpiCrecimientoPercent,
      litrosLeche: sum('litrosLeche'), ingresosTotales: sum('ingresosTotales'),
    };
    if (stepType === 'Semestral') { aggregatedData.push({ ...aggregatedStep, semestreIndex: i / 6, year: pStart.year, periodLabel: `S${(i / 6) % 2 + 1} (Año ${pStart.year})` } as T); }
    else { aggregatedData.push({ ...aggregatedStep, year: pStart.year, periodLabel: `Año ${pStart.year}` } as T); }
  }
  return aggregatedData;
}


// -----------------------------------------------------------------------------
// --- HOOK PRINCIPAL (MOTOR V8.0 - REFACTORIZADO) ---
// -----------------------------------------------------------------------------
export const useHerdEvolution = (
  params: SimulationConfig, 
  horizonInYears: number
): UseHerdEvolutionResult => {

  const result: UseHerdEvolutionResult = useMemo(() => {
    
    // --- 1. Ejecutar el motor de simulación ---
    const monthlyData = runSimulationEngine(params, horizonInYears);

    // --- 2. Agregar los resultados ---
    const semestralData = aggregateMonthlyData<SemestralEvolutionStep>(monthlyData, 6, 'Semestral');
    const annualData = aggregateMonthlyData<AnnualEvolutionStep>(monthlyData, 12, 'Anual');

    return { monthlyData, semestralData, annualData };

  }, [params, horizonInYears]);

  return result;
};