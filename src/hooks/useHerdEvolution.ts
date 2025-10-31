import { useMemo } from 'react';

// -----------------------------------------------------------------------------
// INTERFAZ DE CONFIGURACIÓN (V5.0)
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
  // ... (lógica de agregación sin cambios)
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

// --- V6.0: Tipos de Cohorte ---
interface Cohort {
  id: number;
  size: number;
  monthEnd: number; // Mes en el que esta cohorte termina su estado
}

// --- V6.1: Tipo de Cohorte de Lactancia ---
interface LactationCohort {
  id: number;
  deliveries: number; // 'size' se llama 'deliveries' aquí para claridad
  startMonth: number; // Mes en el que esta cohorte *inició* la lactancia
}

// --- HOOK PRINCIPAL (MOTOR V6.2 - BUG DE DOBLE BAJA CORREGIDO) ---
export const useHerdEvolution = (
  params: SimulationConfig, horizonInYears: number
): UseHerdEvolutionResult => {
  const result: UseHerdEvolutionResult = useMemo(() => {
    
    // --- 1. Inicializar Parámetros (safeParams V5.0) ---
    const safeParams = {
        initialCabras: params.initialCabras ?? 0, initialLevanteTardio: params.initialLevanteTardio ?? 0, initialLevanteMedio: params.initialLevanteMedio ?? 0, initialLevanteTemprano: params.initialLevanteTemprano ?? 0, initialCriaH: params.initialCriaH ?? 0, initialCriaM: params.initialCriaM ?? 0, initialPadres: params.initialPadres ?? 1,
        comprasVientresAnual: params.comprasVientresAnual ?? 0, mesInicioMonta1: params.mesInicioMonta1, mesInicioMonta2: params.mesInicioMonta2, mesInicioMonta3: params.mesInicioMonta3, mesInicioMonta4: params.mesInicioMonta4, duracionMontaDias: params.duracionMontaDias ?? 45, diasGestacion: params.diasGestacion ?? 150, 
        litrosPromedioPorAnimal: params.litrosPromedioPorAnimal ?? 1.8,
        diasLactanciaObjetivo: params.diasLactanciaObjetivo ?? 305,
        litrosPicoPorAnimal: params.litrosPicoPorAnimal ?? 
                             ((params.diasLactanciaObjetivo ?? 305) >= 305 ? 
                             (params.litrosPromedioPorAnimal ?? 1.8) * 1.4 : 
                             (params.litrosPromedioPorAnimal ?? 1.8) * 1.5), 
        porcentajePrenez: params.porcentajePrenez ?? 85, porcentajeProlificidad: params.porcentajeProlificidad ?? 120, mortalidadCrias: params.mortalidadCrias ?? 5, mortalidadLevante: params.mortalidadLevante ?? 3, mortalidadCabras: params.mortalidadCabras ?? 3, tasaReemplazo: params.tasaReemplazo ?? 20, eliminacionCabritos: params.eliminacionCabritos ?? 100, precioLecheLitro: params.precioLecheLitro ?? 0.5, precioVentaCabritoKg: params.precioVentaCabritoKg ?? 3, precioVentaDescarteAdulto: params.precioVentaDescarteAdulto ?? 50, monedaSimbolo: params.monedaSimbolo ?? "$",
    };
    
    // --- 2. Preparar Tasas y Constantes ---
    const monthlyData: MonthlyEvolutionStep[] = [];
    const totalMonths = horizonInYears * 12;
    const diasPorMes = 30.44;
    
    // --- V6.1: Lógica de Cohortes CORREGIDA ---
    let gestationCohorts: Cohort[] = []; // Animales preñados
    let waitCohorts: Cohort[] = []; // Animales en espera post-parto
    let lactationCohorts: LactationCohort[] = []; 
    let cohortCounter = 0;

    const mesesGestacion = Math.round(safeParams.diasGestacion / diasPorMes); 
    const mesesEspera = 6; 
    
    const mortCriaMes = safeParams.mortalidadCrias / 100 / 12;
    const mortLevanteMes = safeParams.mortalidadLevante / 100 / 12;
    const mortCabrasMes = safeParams.mortalidadCabras / 100 / 12;
    const reemplazoMes = safeParams.tasaReemplazo / 100 / 12;
    const comprasVientresMes = safeParams.comprasVientresAnual / 12;
    
    const matingStartMonths = new Set<number>();
    [ params.mesInicioMonta1, params.mesInicioMonta2, params.mesInicioMonta3, params.mesInicioMonta4 ]
        .filter((m): m is number => typeof m === 'number' && m > 0)
        .forEach(month => matingStartMonths.add(month));
    
    // --- 3. LÓGICA V5.0: Generar Curva de Lactancia Dinámica ---
    const BASE_CURVE_305 = [0.8, 1.4, 1.4, 1.3, 1.2, 1.0, 0.9, 0.8, 0.7, 0.5]; 
    const BASE_CURVE_210 = [0.7, 1.5, 1.5, 1.3, 1.0, 0.6, 0.4]; 
    const use305Curve = safeParams.diasLactanciaObjetivo >= 305;
    const baseCurve = use305Curve ? BASE_CURVE_305 : BASE_CURVE_210;
    const basePeak = use305Curve ? 1.4 : 1.5;
    const curveLength = baseCurve.length; 
    const desiredAvg = safeParams.litrosPromedioPorAnimal;
    const desiredPeak = safeParams.litrosPicoPorAnimal;
    const desiredPeakRatio = (desiredPeak > desiredAvg && desiredAvg > 0) 
                            ? desiredPeak / desiredAvg 
                            : basePeak; 
    const s = (basePeak > 1) ? (desiredPeakRatio - 1) / (basePeak - 1) : 1;
    const dynamicLactationCurve = baseCurve.map(baseFactor => (baseFactor - 1) * s + 1);

    // --- 4. Bucle Mensual (MOTOR V6.2 - MODIFICADO) ---
    for (let i = 0; i < totalMonths; i++) {
        const prevStep = monthlyData[i - 1];
        const currentYear = Math.floor(i / 12) + 1;
        const currentMonth = (i % 12) + 1;
        const monthLabel = `Año ${currentYear} - Mes ${currentMonth}`;

        // 4.1: POBLACIÓN INICIAL
        const startCriaH = prevStep ? prevStep.endCriaH : safeParams.initialCriaH; const startCriaM = prevStep ? prevStep.endCriaM : safeParams.initialCriaM; const startLevanteTemprano = prevStep ? prevStep.endLevanteTemprano : safeParams.initialLevanteTemprano; const startLevanteMedio = prevStep ? prevStep.endLevanteMedio : safeParams.initialLevanteMedio; const startLevanteTardio = prevStep ? prevStep.endLevanteTardio : safeParams.initialLevanteTardio;
        const startCabras = prevStep ? prevStep.endCabras : safeParams.initialCabras;
        const startPadres = prevStep ? prevStep.endPadres : safeParams.initialPadres;
        const startTotal = startCriaH + startCriaM + startLevanteTemprano + startLevanteMedio + startLevanteTardio + startCabras + startPadres;

        // 4.2: PARTOS Y FLUJO DE ESTADOS (V6.1)
        let partos = 0;
        const newWaitCohorts: Cohort[] = [];
        gestationCohorts = gestationCohorts.filter(cohort => {
            if (cohort.monthEnd === i) {
                partos += cohort.size;
                newWaitCohorts.push({ id: cohort.id, size: cohort.size, monthEnd: i + mesesEspera });
                lactationCohorts.push({ id: cohort.id, deliveries: cohort.size, startMonth: i }); 
                return false; 
            }
            return true;
        });
        waitCohorts.push(...newWaitCohorts);

        // Remover cohortes que terminan la espera
        waitCohorts = waitCohorts.filter(cohort => cohort.monthEnd > i);
        
        const nacimientosTotales = partos * (safeParams.porcentajeProlificidad / 100);
        const nacimientosH = nacimientosTotales * 0.5;
        const nacimientosM = nacimientosTotales * 0.5;

        // 4.3: MONTAS (V6.0 - CORREGIDO)
        let newlyPregnant_Cabras = 0;
        let newlyPregnant_Cabritonas = 0;

        if (matingStartMonths.has(currentMonth)) {
            const totalGestantes = gestationCohorts.reduce((sum, c) => sum + c.size, 0);
            const totalEnEspera = waitCohorts.reduce((sum, c) => sum + c.size, 0);

            const cabrasAbiertas = Math.max(0, startCabras - totalGestantes - totalEnEspera);
            const cabritonasElegibles = Math.max(0, startLevanteTardio * (1 - mortLevanteMes));
            
            newlyPregnant_Cabras = cabrasAbiertas * (safeParams.porcentajePrenez / 100);
            newlyPregnant_Cabritonas = cabritonasElegibles * (safeParams.porcentajePrenez / 100);
            
            if (newlyPregnant_Cabras > 0) {
                gestationCohorts.push({ id: ++cohortCounter, size: newlyPregnant_Cabras, monthEnd: i + mesesGestacion });
            }
            if (newlyPregnant_Cabritonas > 0) {
                gestationCohorts.push({ id: ++cohortCounter, size: newlyPregnant_Cabritonas, monthEnd: i + mesesGestacion });
            }
        }

        // 4.4: MUERTES (V6.2 - CORREGIDO EL BUG DE DOBLE BAJA)
        const muertesCriaH = (startCriaH + nacimientosH) * mortCriaMes; const muertesCriaM = (startCriaM + nacimientosM) * mortCriaMes; 
        const muertesLevanteTemprano = startLevanteTemprano * mortLevanteMes; const muertesLevanteMedio = startLevanteMedio * mortLevanteMes; 
        const muertesLevanteTardio = startLevanteTardio * mortLevanteMes; 
        const muertesPadres = startPadres * mortCabrasMes;
        
        // Bajas de Cabras
        const muertesCabras = startCabras * mortCabrasMes;
        const cabrasSobrevivientes_preVenta = startCabras - muertesCabras;
        const ventasDescartes = cabrasSobrevivientes_preVenta * reemplazoMes;
        const totalBajasCabras = muertesCabras + ventasDescartes;

        // V6.0: Aplicar bajas proporcionalmente a las cohortes
        const bajaPropCabras = (startCabras > 0) ? (totalBajasCabras / startCabras) : 0;
        
        gestationCohorts.forEach(c => c.size *= (1 - bajaPropCabras));
        waitCohorts.forEach(c => c.size *= (1 - bajaPropCabras));
        
        // --- LÍNEA ELIMINADA (V6.2) ---
        // La doble baja ocurría aquí. Las cohortes de lactancia no son un
        // stock poblacional, solo son para economía. Las bajas ya se aplican
        // a 'waitCohorts' (que incluye a las lactantes).
        // lactationCohorts.forEach(c => c.deliveries *= (1 - bajaPropCabras)); 
        
        const muertesTotales = muertesCriaH + muertesCriaM + muertesLevanteTemprano + muertesLevanteMedio + muertesLevanteTardio + muertesCabras + muertesPadres;

        // 4.5: VENTAS Y COMPRAS
        const criasMSobrevivientes = Math.max(0, (startCriaM + nacimientosM) - muertesCriaM); const ventasCabritos = criasMSobrevivientes * (safeParams.eliminacionCabritos / 100);
        const ventasTotales = ventasCabritos + ventasDescartes;
        const comprasVientres = comprasVientresMes; const comprasPadres = 0; const comprasTotales = comprasVientres + comprasPadres;

        // 4.6: PROMOCIONES (V6.0)
        const criasHSobrevivientes_promo = Math.max(0, (startCriaH + nacimientosH) - muertesCriaH); 
        const ltSobrevivientes_promo = Math.max(0, startLevanteTemprano - muertesLevanteTemprano); 
        const lmSobrevivientes_promo = Math.max(0, startLevanteMedio - muertesLevanteMedio); 
        
        const ltdSobrevivientes_promo = Math.max(0, startLevanteTardio - muertesLevanteTardio);
        const ltdDisponiblesParaPromocion = Math.max(0, ltdSobrevivientes_promo - newlyPregnant_Cabritonas);
        
        const promocionCriaH = criasHSobrevivientes_promo / 3; 
        const promocionLevanteTemprano = ltSobrevivientes_promo / 3; 
        const promocionLevanteMedio = lmSobrevivientes_promo / 6;
        const promocionLevanteTardio = ltdDisponiblesParaPromocion / 6; 

        // 4.7: POBLACIÓN FINAL (V6.0 - CORREGIDO)
        const endCriaH = Math.max(0, criasHSobrevivientes_promo - promocionCriaH); 
        const endCriaM = Math.max(0, criasMSobrevivientes - ventasCabritos); 
        const endLevanteTemprano = Math.max(0, ltSobrevivientes_promo - promocionLevanteTemprano + promocionCriaH); 
        const endLevanteMedio = Math.max(0, lmSobrevivientes_promo - promocionLevanteMedio + promocionLevanteTemprano); 
        
        const endLevanteTardio = Math.max(0, ltdSobrevivientes_promo - newlyPregnant_Cabritonas - promocionLevanteTardio + comprasVientres + promocionLevanteMedio); 
        const endCabras = Math.max(0, startCabras - totalBajasCabras + promocionLevanteTardio + newlyPregnant_Cabritonas); 
        
        const endPadres = Math.max(0, startPadres - muertesPadres + comprasPadres);
        const endTotal = endCriaH + endCriaM + endLevanteTemprano + endLevanteMedio + endLevanteTardio + endCabras + endPadres;

        // --- 4.8: ECONOMÍA (V6.2) ---
        let totalLitrosMes = 0;
        let totalHembrasProduccion = 0;
        
        // V6.2: Aplicar bajas a cohortes de lactancia ANTES de calcular la leche
        lactationCohorts.forEach(c => c.deliveries *= (1 - bajaPropCabras));
        
        lactationCohorts = lactationCohorts.filter(cohort => {
            const monthsInLactation = i - cohort.startMonth;
            if (monthsInLactation < curveLength) { 
                const curveFactor = dynamicLactationCurve[monthsInLactation] || 0;
                totalLitrosMes += cohort.deliveries * safeParams.litrosPromedioPorAnimal * diasPorMes * curveFactor;
                totalHembrasProduccion += cohort.deliveries; 
                return true; 
            }
            return false; // Lactancia terminada
        });

        const litrosLeche = totalLitrosMes;
        const hembrasProduccion = totalHembrasProduccion;
        const ingresosLeche = litrosLeche * safeParams.precioLecheLitro; 
        const ingresosVentaCabritos = ventasCabritos * 10 * safeParams.precioVentaCabritoKg;
        const ingresosVentaDescartes = ventasDescartes * safeParams.precioVentaDescarteAdulto; 
        const ingresosTotales = ingresosLeche + ingresosVentaCabritos + ingresosVentaDescartes;

        // --- 4.9: GUARDAR (V4.3) ---
         monthlyData.push({
             monthIndex: i, year: currentYear, month: currentMonth, periodLabel: monthLabel,
             startCriaH, startCriaM, startLevanteTemprano, startLevanteMedio, startLevanteTardio, startCabras, startPadres, startTotal,
             partos, nacimientosH, nacimientosM,
             muertesCriaH, muertesCriaM, muertesLevanteTemprano, muertesLevanteMedio, muertesLevanteTardio, muertesCabras, muertesPadres, muertesTotales,
             ventasCabritos, ventasDescartes, ventasTotales,
             comprasVientres, comprasPadres, comprasTotales,
             promocionCriaH, promocionLevanteTemprano, promocionLevanteMedio, promocionLevanteTardio,
             endCriaH, endCriaM, endLevanteTemprano, endLevanteMedio, endLevanteTardio, endCabras, endPadres, endTotal,
             litrosLeche, 
             ingresosTotales,
             hembrasProduccion,
             ingresosLeche, 
         });
     } // Fin del bucle for

    const semestralData = aggregateMonthlyData<SemestralEvolutionStep>(monthlyData, 6, 'Semestral');
    const annualData = aggregateMonthlyData<AnnualEvolutionStep>(monthlyData, 12, 'Anual');

    return { monthlyData, semestralData, annualData };

  }, [params, horizonInYears]);

  return result;
};
// No hay export default