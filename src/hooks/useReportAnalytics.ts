import { useMemo } from 'react';
import { 
    MonthlyEvolutionStep, 
    // SemestralEvolutionStep, // <-- Eliminado (TS6133)
    AnnualEvolutionStep 
} from './useHerdEvolution'; // Asumiendo que este archivo está en la misma carpeta 'hooks'

// -----------------------------------------------------------------------------
// --- TIPOS DE RESULTADOS DEL REPORTE (Sin Cambios) ---
// -----------------------------------------------------------------------------

// KPIs de Linealidad (3.2.2) - Uno por año
export interface YearlyMilkKpis {
  year: number;
  monthlyProduction: number[];
  totalProduction: number;
  avgMonthly: number;
  peakMonthValue: number;
  peakMonthLabel: string;
  valleyMonthValue: number;
  valleyMonthLabel: string;
  stdDev: number; // Desviación Estándar
  cv: number; // Coeficiente de Variación (%)
}

// KPIs de Eficiencia Lechera (3.2.3) - Para todo el horizonte
export interface HerdEfficiencyKpis {
  totalLitrosHorizonte: number;
  totalDiasLactancia: number;
  litrosPorDiaLactancia: number;
  avgVientresProductivosHorizonte: number;
  litrosPorVientrePorAnio: number;
}

// KPIs de Dinámica del Rebaño (3.3) - Para todo el horizonte
export interface HerdDynamicsKpis {
  tasaNatalidadReal: number;
  tasaProlificidadReal: number;
  mortalidadCriasReal: number;
  mortalidadLevanteReal: number;
  mortalidadCabrasReal: number;
  tasaReemplazoReal: number;
  tasaDescarteReal: number;
  tasaEliminacionCriasMReal: number;
}

// Objeto de resultado del Hook
export interface UseReportAnalyticsResult {
  isLoading: boolean;
  milkLinearityKpis: YearlyMilkKpis[];
  herdEfficiencyKpis: HerdEfficiencyKpis | null;
  herdDynamicsKpis: HerdDynamicsKpis | null;
  horizonInYears: number;
}

// -----------------------------------------------------------------------------
// --- FUNCIONES DE UTILIDAD ESTADÍSTICA (Sin Cambios) ---
// -----------------------------------------------------------------------------

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Calcula la media (promedio) de un array de números
const getMean = (data: number[]): number => {
  if (!data || data.length === 0) return 0;
  const sum = data.reduce((acc, val) => acc + val, 0);
  return sum / data.length;
};

// Calcula la desviación estándar
const getStdDeviation = (data: number[]): number => {
  if (!data || data.length < 2) return 0; // Se necesita al menos 2 puntos
  const mean = getMean(data);
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (data.length - 1); // Sample StDev
  return Math.sqrt(variance);
};

// -----------------------------------------------------------------------------
// --- HOOK PRINCIPAL DE ANALÍTICA (CORREGIDO) ---
// -----------------------------------------------------------------------------

export const useReportAnalytics = (
  monthlyData: MonthlyEvolutionStep[],
  annualData: AnnualEvolutionStep[]
): UseReportAnalyticsResult => {

  const analytics = useMemo(() => {
    // Si no hay datos, retornar estado vacío
    if (!monthlyData || monthlyData.length === 0 || !annualData || annualData.length === 0) {
      return {
        isLoading: true,
        milkLinearityKpis: [],
        herdEfficiencyKpis: null,
        herdDynamicsKpis: null,
        horizonInYears: 0,
      };
    }

    const horizonInYears = annualData.length;
    
    // --- 1. Cálculo de Linealidad de Leche (3.2.1 y 3.2.2) (Sin Cambios) ---
    const milkLinearityKpis: YearlyMilkKpis[] = annualData.map((yearData) => {
      const year = yearData.year;
      // Filtrar los 12 meses de este año
      const yearMonths = monthlyData.filter(m => m.year === year);
      const monthlyProduction = yearMonths.map(m => m.litrosLeche);

      const totalProduction = monthlyProduction.reduce((sum, val) => sum + val, 0);
      const avgMonthly = getMean(monthlyProduction);
      const stdDev = getStdDeviation(monthlyProduction);
      const cv = avgMonthly > 0 ? (stdDev / avgMonthly) * 100 : 0; 
      
      const peakMonthValue = Math.max(...monthlyProduction);
      const peakMonthIndex = monthlyProduction.indexOf(peakMonthValue);
      const peakMonthLabel = MONTH_LABELS[peakMonthIndex % 12];

      const valleyMonthValue = Math.min(...monthlyProduction);
      const valleyMonthIndex = monthlyProduction.indexOf(valleyMonthValue);
      const valleyMonthLabel = MONTH_LABELS[valleyMonthIndex % 12];

      return {
        year,
        monthlyProduction,
        totalProduction,
        avgMonthly,
        peakMonthValue,
        peakMonthLabel,
        valleyMonthValue,
        valleyMonthLabel,
        stdDev,
        cv,
      };
    });

    // --- 2. Cálculo de Eficiencia Lechera (3.2.3) (CORREGIDO) ---
    const totalLitrosHorizonte = annualData.reduce((sum, year) => sum + year.litrosLeche, 0);
    
    // --- CORRECCIÓN AQUÍ ---
    // Ahora leemos 'hembrasProduccion' que fue añadido en V4.2
    const diasPorMes = 30.44;
    const totalDiasLactancia = monthlyData.reduce((sum, month) => {
        return sum + (month.hembrasProduccion * diasPorMes);
    }, 0);

    const litrosPorDiaLactancia = totalLitrosHorizonte / (totalDiasLactancia || 1);
    // --- FIN CORRECCIÓN ---
    
    const avgVientresProductivosHorizonte = getMean(annualData.map(a => a.kpiProductivasCount));
    const litrosPorVientrePorAnio = (totalLitrosHorizonte / horizonInYears) / (avgVientresProductivosHorizonte || 1);

    const herdEfficiencyKpis: HerdEfficiencyKpis = {
      totalLitrosHorizonte,
      totalDiasLactancia, // Corregido
      litrosPorDiaLactancia, // Corregido
      avgVientresProductivosHorizonte,
      litrosPorVientrePorAnio,
    };

    // --- 3. Cálculo de Dinámica del Rebaño (3.3) (CORREGIDO) ---
    const avgVientresProdMes = getMean(monthlyData.map(m => m.startCabras + m.startLevanteTardio));
    const avgPobLevanteMes = getMean(monthlyData.map(m => m.startLevanteTemprano + m.startLevanteMedio + m.startLevanteTardio));
    const avgPobCabrasMes = getMean(monthlyData.map(m => m.startCabras));
    
    const totalNacimientos = annualData.reduce((sum, y) => sum + y.nacimientosH + y.nacimientosM, 0);
    const totalMuertesCrias = annualData.reduce((sum, y) => sum + y.muertesCriaH + y.muertesCriaM, 0);
    const totalMuertesLevante = annualData.reduce((sum, y) => sum + y.muertesLevanteTemprano + y.muertesLevanteMedio + y.muertesLevanteTardio, 0);
    const totalMuertesCabras = annualData.reduce((sum, y) => sum + y.muertesCabras, 0);
    const totalPromocionesLTD = annualData.reduce((sum, y) => sum + y.promocionLevanteTardio, 0);
    const totalVentasDescartes = annualData.reduce((sum, y) => sum + y.ventasDescartes, 0);
    const totalVentasCriasM = annualData.reduce((sum, y) => sum + y.ventasCabritos, 0);
    const totalNacimientosM = annualData.reduce((sum, y) => sum + y.nacimientosM, 0);
    const totalMuertesCriasM = annualData.reduce((sum, y) => sum + y.muertesCriaM, 0);

    // --- CORRECCIÓN AQUÍ ---
    // 'partos' no está en annualData. Debemos sumarlo de monthlyData.
    const totalPartosHorizonte = monthlyData.reduce((sum, m) => sum + m.partos, 0);
    
    // Tasa de Natalidad: (Nacimientos Totales) / (Promedio de Vientres * Años) * 100
    // (Da nacimientos por cada 100 vientres por año)
    const tasaNatalidadReal = (totalNacimientos / (avgVientresProdMes * horizonInYears || 1)) * 100;

    // Tasa de Prolificidad: (Nacimientos / Partos) * 100
    const tasaProlificidadReal = (totalNacimientos / (totalPartosHorizonte || 1)) * 100; // Da % (ej. 150%)
    
    // % Mortalidad Crías: (Muertes) / (Nacidos + Stock Inicial) * 100
    const pobInicialCrias = (monthlyData[0]?.startCriaH ?? 0) + (monthlyData[0]?.startCriaM ?? 0);
    const mortalidadCriasReal = (totalMuertesCrias / (totalNacimientos + pobInicialCrias || 1)) * 100;

    // % Mortalidad Levante (Anualizada): (Muertes Totales) / (Promedio Pob * Años) * 100
    const mortalidadLevanteReal = (totalMuertesLevante / (avgPobLevanteMes * horizonInYears || 1)) * 100;
    
    // % Mortalidad Cabras (Anualizada)
    const mortalidadCabrasReal = (totalMuertesCabras / (avgPobCabrasMes * horizonInYears || 1)) * 100;

    // Tasa de Reemplazo (Anualizada)
    const tasaReemplazoReal = (totalPromocionesLTD / (avgPobCabrasMes * horizonInYears || 1)) * 100;

    // Tasa de Descarte (Anualizada)
    const tasaDescarteReal = (totalVentasDescartes / (avgPobCabrasMes * horizonInYears || 1)) * 100;
    
    // % Eliminación Crías M: (Ventas M) / (Sobrevivientes M) * 100
    const criasMSobrevivientes = totalNacimientosM - totalMuertesCriasM;
    const tasaEliminacionCriasMReal = (totalVentasCriasM / (criasMSobrevivientes || 1)) * 100;

    const herdDynamicsKpis: HerdDynamicsKpis = {
        tasaNatalidadReal,
        tasaProlificidadReal,
        mortalidadCriasReal,
        mortalidadLevanteReal,
        mortalidadCabrasReal,
        tasaReemplazoReal,
        tasaDescarteReal,
        tasaEliminacionCriasMReal,
    };

    // --- Objeto Final ---
    return {
      isLoading: false,
      milkLinearityKpis,
      herdEfficiencyKpis,
      herdDynamicsKpis,
      horizonInYears,
    };

  }, [monthlyData, annualData]);

  return analytics;
};