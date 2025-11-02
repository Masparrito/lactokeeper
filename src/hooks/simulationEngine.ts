// --- ARCHIVO: src/hooks/simulationEngine.ts ---

// V8.0: El tipo 'SimulationConfig' ahora se importa desde 'useHerdEvolution'
import { SimulationConfig, MonthlyEvolutionStep } from './useHerdEvolution';

// -----------------------------------------------------------------------------
// INTERFACES INTERNAS DEL MOTOR
// -----------------------------------------------------------------------------

interface Cohort {
  id: number;
  size: number;
  monthEnd: number;
}

interface LactationCohort {
  id: number;
  deliveries: number;
  startMonth: number;
}

// -----------------------------------------------------------------------------
// FUNCIÓN DEL MOTOR DE SIMULACIÓN (V8.0: ACTUALIZADO)
// -----------------------------------------------------------------------------

/**
 * Ejecuta el motor de simulación de evolución del rebaño V6.2 (Modo V8.0).
 * Acepta un 'matingDistribution' opcional para optimizar la linealidad.
 *
 * @param params La configuración de la simulación.
 * @param horizonInYears El número de años a simular.
 * @returns Un array de MonthlyEvolutionStep con los resultados.
 */
export const runSimulationEngine = (
  params: SimulationConfig, 
  horizonInYears: number
): MonthlyEvolutionStep[] => {
  
  // --- 1. Inicializar Parámetros (safeParams V8.0) ---
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
      
      // --- V8.0: Nuevo parámetro para GanaGenius ---
      matingDistribution: params.matingDistribution, 
  };
  
  // --- 2. Preparar Tasas y Constantes ---
  const monthlyData: MonthlyEvolutionStep[] = [];
  const totalMonths = horizonInYears * 12;
  const diasPorMes = 30.44;
  
  let gestationCohorts: Cohort[] = [];
  let waitCohorts: Cohort[] = [];
  let lactationCohorts: LactationCohort[] = []; 
  let cohortCounter = 0;

  const mesesGestacion = Math.round(safeParams.diasGestacion / diasPorMes); 
  const mesesEspera = 6; 
  
  const mortCriaMes = safeParams.mortalidadCrias / 100 / 12;
  const mortLevanteMes = safeParams.mortalidadLevante / 100 / 12;
  const mortCabrasMes = safeParams.mortalidadCabras / 100 / 12;
  const reemplazoMes = safeParams.tasaReemplazo / 100 / 12;
  const comprasVientresMes = safeParams.comprasVientresAnual / 12;
  
  // --- V8.0: Guardar los meses de monta en un array para indexar ---
  const matingStartMonths = new Set<number>();
  const activeSeasonMonths = [ 
      params.mesInicioMonta1, 
      params.mesInicioMonta2, 
      params.mesInicioMonta3, 
      params.mesInicioMonta4 
  ]
      .filter((m): m is number => typeof m === 'number' && m > 0);
  
  activeSeasonMonths.forEach(month => matingStartMonths.add(month));
  
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

  // --- 4. Bucle Mensual (MOTOR V6.2) ---
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
      waitCohorts = waitCohorts.filter(cohort => cohort.monthEnd > i);
      
      const nacimientosTotales = partos * (safeParams.porcentajeProlificidad / 100);
      const nacimientosH = nacimientosTotales * 0.5;
      const nacimientosM = nacimientosTotales * 0.5;

      // 4.3: MONTAS (V8.0: MODIFICADO PARA DISTRIBUCIÓN)
      let newlyPregnant_Cabras = 0;
      let newlyPregnant_Cabritonas = 0;

      if (matingStartMonths.has(currentMonth)) {
          const totalGestantes = gestationCohorts.reduce((sum, c) => sum + c.size, 0);
          const totalEnEspera = waitCohorts.reduce((sum, c) => sum + c.size, 0);
          const cabrasAbiertas = Math.max(0, startCabras - totalGestantes - totalEnEspera);
          const cabritonasElegibles = Math.max(0, startLevanteTardio * (1 - mortLevanteMes));
          
          // --- V8.0: Lógica de Distribución de Montas ---
          const seasonIndex = activeSeasonMonths.indexOf(currentMonth);
          
          // Usar 100% (1.0) como default si no se provee 'matingDistribution'
          // Esto mantiene la compatibilidad V6.2 (servir a todas las abiertas)
          const distributionRatio = (seasonIndex !== -1 && safeParams.matingDistribution)
              ? (safeParams.matingDistribution[seasonIndex] ?? 100) / 100
              : 1.0;
              
          const cabrasParaMonta = cabrasAbiertas * distributionRatio;
          const cabritonasParaMonta = cabritonasElegibles * distributionRatio;
          // --- Fin V8.0 ---
          
          // V8.0: Modificado para usar el sub-grupo "Para Monta"
          newlyPregnant_Cabras = cabrasParaMonta * (safeParams.porcentajePrenez / 100);
          newlyPregnant_Cabritonas = cabritonasParaMonta * (safeParams.porcentajePrenez / 100);
          
          if (newlyPregnant_Cabras > 0) {
              gestationCohorts.push({ id: ++cohortCounter, size: newlyPregnant_Cabras, monthEnd: i + mesesGestacion });
          }
          if (newlyPregnant_Cabritonas > 0) {
              gestationCohorts.push({ id: ++cohortCounter, size: newlyPregnant_Cabritonas, monthEnd: i + mesesGestacion });
          }
      }

      // 4.4: MUERTES (V6.2)
      const muertesCriaH = (startCriaH + nacimientosH) * mortCriaMes; const muertesCriaM = (startCriaM + nacimientosM) * mortCriaMes; 
      const muertesLevanteTemprano = startLevanteTemprano * mortLevanteMes; const muertesLevanteMedio = startLevanteMedio * mortLevanteMes; 
      const muertesLevanteTardio = startLevanteTardio * mortLevanteMes; 
      const muertesPadres = startPadres * mortCabrasMes;
      const muertesCabras = startCabras * mortCabrasMes;
      const cabrasSobrevivientes_preVenta = startCabras - muertesCabras;
      const ventasDescartes = cabrasSobrevivientes_preVenta * reemplazoMes;
      const totalBajasCabras = muertesCabras + ventasDescartes;
      const bajaPropCabras = (startCabras > 0) ? (totalBajasCabras / startCabras) : 0;
      
      gestationCohorts.forEach(c => c.size *= (1 - bajaPropCabras));
      waitCohorts.forEach(c => c.size *= (1 - bajaPropCabras));
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

      // 4.7: POBLACIÓN FINAL (V6.0)
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

  return monthlyData;
};