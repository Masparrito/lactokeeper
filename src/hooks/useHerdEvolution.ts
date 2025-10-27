import { useMemo } from 'react';
import { AppConfig } from '../types/config';

export interface SimulationConfig extends AppConfig {
    initialCabras: number;
    initialCabritonas: number;
    initialCabritas: number;
    initialPadres: number;
    temporadasMontaPorAno: 1 | 2 | 3 | 4;
    duracionMontaDias: number;
    distribucionPartosPorcentaje: number;
    distribucionPartosDias: number;
    litrosPromedioPorAnimal: number;
    comprasVientresAnual: number;
}

export interface MonthlyPopulationState {
    monthIndex: number; year: number; monthInYear: number;
    startCabras: number; startCabritonas: number; startCabritas: number; startPadres: number; startTotal: number;
    endCabras: number; endCabritonas: number; endCabritas: number; endPadres: number; endTotal: number;
    nacimientosHembras: number; nacimientosMachos: number; hembrasEntrandoALactancia: number;
    muertesCrías: number; muertesLevante: number; muertesAdultas: number; descartesAdultas: number;
    // --- CORRECCIÓN: Añadidas propiedades faltantes ---
    ventasCabritos: number; // Número de cabritos machos vendidos
    comprasVientres: number; // Número de vientres comprados
    cabritasACabritonas: number; cabritonasACabras: number;
    ingresosVentaLeche: number; ingresosVentaCabritos: number; ingresosVentaDescartes: number; ingresosTotales: number;
    litrosLecheProducidos: number; hembrasEnProduccion: number;
}


export const useHerdEvolution = (simConfig: SimulationConfig | null, projectionYears: number): MonthlyPopulationState[] => {

    const projection = useMemo<MonthlyPopulationState[]>(() => {
        if (!simConfig) return [];

        const results: MonthlyPopulationState[] = [];
        const numMonths = projectionYears * 12;

        const MONTHS_IN_YEAR = 12;
        const DAYS_IN_MONTH = 30.44;
        const GESTATION_MONTHS = Math.ceil(simConfig.diasGestacion / DAYS_IN_MONTH);
        const LACTATION_MONTHS = Math.ceil(simConfig.diasLactanciaObjetivo / DAYS_IN_MONTH);
        const WEANING_MONTHS = 6;
        const ADULT_MONTHS = 12;

        const breedingStartMonths: number[] = [];
        const monthsBetweenSeasons = MONTHS_IN_YEAR / simConfig.temporadasMontaPorAno;
        for (let i = 0; i < simConfig.temporadasMontaPorAno; i++) {
            const startMonth = Math.round(1 + i * monthsBetweenSeasons);
            breedingStartMonths.push(startMonth > 12 ? startMonth - 12 : startMonth);
        }

        const firstPhaseMonths = Math.max(1, Math.ceil(simConfig.distribucionPartosDias / DAYS_IN_MONTH));
        const totalParturitionMonths = Math.max(firstPhaseMonths, Math.ceil(simConfig.duracionMontaDias / DAYS_IN_MONTH));
        const secondPhaseMonths = totalParturitionMonths - firstPhaseMonths;
        const firstPhaseRatio = simConfig.distribucionPartosPorcentaje / 100;
        const secondPhaseRatio = 1 - firstPhaseRatio;

        const monthlyMortalityCriasRate = (simConfig.mortalidadCrias / 100) / WEANING_MONTHS;
        const monthlyMortalityLevanteRate = (simConfig.mortalidadLevante / 100) / (ADULT_MONTHS - WEANING_MONTHS);
        const monthlyMortalityAdultasRate = (simConfig.mortalidadCabras / 100) / MONTHS_IN_YEAR;
        const monthlyReplacementRate = (simConfig.tasaReemplazo / 100) / MONTHS_IN_YEAR;
        const monthlyComprasVientres = simConfig.comprasVientresAnual / MONTHS_IN_YEAR;

        const AVG_CABRITO_WEIGHT_KG = 15.0;

        const initialTotal = simConfig.initialCabras + simConfig.initialCabritonas + simConfig.initialCabritas + simConfig.initialPadres;
        const initialState: MonthlyPopulationState = {
            monthIndex: 0, year: 0, monthInYear: 0,
            startCabras: simConfig.initialCabras, startCabritonas: simConfig.initialCabritonas, startCabritas: simConfig.initialCabritas, startPadres: simConfig.initialPadres,
            startTotal: initialTotal,
            endCabras: simConfig.initialCabras, endCabritonas: simConfig.initialCabritonas, endCabritas: simConfig.initialCabritas, endPadres: simConfig.initialPadres,
            endTotal: initialTotal,
            nacimientosHembras: 0, nacimientosMachos: 0, hembrasEntrandoALactancia: 0,
            muertesCrías: 0, muertesLevante: 0, muertesAdultas: 0, descartesAdultas: 0,
            ventasCabritos: 0, comprasVientres: 0, // Inicializar en 0
            cabritasACabritonas: 0, cabritonasACabras: 0,
            ingresosVentaLeche: 0, ingresosVentaCabritos: 0, ingresosVentaDescartes: 0, ingresosTotales: 0,
            litrosLecheProducidos: 0, hembrasEnProduccion: 0,
        };
        results.push(initialState);

        const parturitionQueue: { [monthIndex: number]: number } = {};

        for (let m = 1; m <= numMonths; m++) {
            const prevMonthState = results[m - 1];
            const currentYear = Math.floor((m - 1) / MONTHS_IN_YEAR) + 1;
            const currentMonthInYear = ((m - 1) % MONTHS_IN_YEAR) + 1;

            const currentState: MonthlyPopulationState = {
                monthIndex: m, year: currentYear, monthInYear: currentMonthInYear,
                startCabras: prevMonthState.endCabras, startCabritonas: prevMonthState.endCabritonas, startCabritas: prevMonthState.endCabritas, startPadres: prevMonthState.endPadres,
                startTotal: prevMonthState.endTotal,
                endCabras: 0, endCabritonas: 0, endCabritas: 0, endPadres: prevMonthState.endPadres, endTotal: 0,
                nacimientosHembras: 0, nacimientosMachos: 0, hembrasEntrandoALactancia: 0,
                muertesCrías: 0, muertesLevante: 0, muertesAdultas: 0, descartesAdultas: 0,
                ventasCabritos: 0, comprasVientres: 0, // Inicializar en 0
                cabritasACabritonas: 0, cabritonasACabras: 0,
                ingresosVentaLeche: 0, ingresosVentaCabritos: 0, ingresosVentaDescartes: 0, ingresosTotales: 0,
                litrosLecheProducidos: 0, hembrasEnProduccion: 0,
            };

            // --- 1. Eventos Reproductivos ---
            if (breedingStartMonths.includes(currentMonthInYear)) {
                const hembrasAptas = currentState.startCabras + currentState.startCabritonas;
                const hembrasMontadas = hembrasAptas * (simConfig.porcentajePrenez / 100);
                const parturitionTargetMonth = m + GESTATION_MONTHS;

                for (let offset = 0; offset < totalParturitionMonths; offset++) {
                    const targetMonth = parturitionTargetMonth + offset;
                    let portion = 0;
                    if (offset < firstPhaseMonths && firstPhaseMonths > 0) {
                        portion = (hembrasMontadas * firstPhaseRatio) / firstPhaseMonths;
                    } else if (secondPhaseMonths > 0) {
                        portion = (hembrasMontadas * secondPhaseRatio) / secondPhaseMonths;
                    }
                    portion = isNaN(portion) ? 0 : portion;
                    parturitionQueue[targetMonth] = (parturitionQueue[targetMonth] || 0) + portion;
                }
            }

            const hembrasPariendoEsteMes = Math.round(parturitionQueue[m] || 0);
            delete parturitionQueue[m];

            if (hembrasPariendoEsteMes > 0) {
                currentState.hembrasEntrandoALactancia = hembrasPariendoEsteMes;
                const totalNacimientos = hembrasPariendoEsteMes * (simConfig.porcentajeProlificidad / 100);
                currentState.nacimientosHembras = totalNacimientos * 0.5;
                currentState.nacimientosMachos = totalNacimientos * 0.5;
            }

            // --- 2. Crecimiento y Envejecimiento ---
            const getSurvivorsAtAge = (ageMonths: number): { cabritas: number, cabritonas: number } => {
                 const birthMonthIndex = m - ageMonths;
                 const sourceState = birthMonthIndex <= 0 ? initialState : results[birthMonthIndex];
                 if (!sourceState || ageMonths <= 0) return { cabritas: 0, cabritonas: 0 };

                 let survived = sourceState.nacimientosHembras;
                 for (let currentAge = 1; currentAge < ageMonths; currentAge++) {
                     const monthIndexToCheck = birthMonthIndex + currentAge;
                     if(monthIndexToCheck < m) {
                         if (currentAge <= WEANING_MONTHS) survived *= (1 - monthlyMortalityCriasRate);
                         else if (currentAge <= ADULT_MONTHS) survived *= (1 - monthlyMortalityLevanteRate);
                     }
                 }
                 survived = Math.round(survived);

                 if (ageMonths <= WEANING_MONTHS) return { cabritas: survived, cabritonas: 0 };
                 else if (ageMonths <= ADULT_MONTHS) return { cabritas: 0, cabritonas: survived };
                 else return { cabritas: 0, cabritonas: 0 };
            };

             const becomingCabritonasPop = getSurvivorsAtAge(WEANING_MONTHS + 1);
             currentState.cabritasACabritonas = becomingCabritonasPop.cabritas;

             const becomingCabrasPop = getSurvivorsAtAge(ADULT_MONTHS + 1);
             currentState.cabritonasACabras = becomingCabrasPop.cabritonas;

            // --- 3. Mortalidad y Descartes ---
            currentState.muertesCrías = currentState.startCabritas * monthlyMortalityCriasRate;
            currentState.muertesLevante = currentState.startCabritonas * monthlyMortalityLevanteRate;
            currentState.muertesAdultas = currentState.startCabras * monthlyMortalityAdultasRate;
            currentState.descartesAdultas = currentState.startCabras * monthlyReplacementRate;

            // --- 4. Calcular Población Final del Mes ---
            currentState.endCabritas = currentState.startCabritas + currentState.nacimientosHembras - currentState.muertesCrías - currentState.cabritasACabritonas;
            currentState.endCabritonas = currentState.startCabritonas - currentState.muertesLevante + currentState.cabritasACabritonas - currentState.cabritonasACabras + monthlyComprasVientres; // Añadir compras
            currentState.endCabras = currentState.startCabras - currentState.muertesAdultas - currentState.descartesAdultas + currentState.cabritonasACabras;

            currentState.endCabritas = Math.max(0, Math.round(currentState.endCabritas));
            currentState.endCabritonas = Math.max(0, Math.round(currentState.endCabritonas));
            currentState.endCabras = Math.max(0, Math.round(currentState.endCabras));
            currentState.endPadres = currentState.startPadres;
            currentState.endTotal = currentState.endCabras + currentState.endCabritonas + currentState.endCabritas + currentState.endPadres;

            // --- 5. Producción de Leche ---
            let totalHembrasEnLeche = 0;
            for (let lm = 0; lm < LACTATION_MONTHS; lm++) {
                const parturitionMonthIndex = m - lm;
                 if (parturitionMonthIndex >= 0 && parturitionMonthIndex < results.length) {
                    const monthState = results[parturitionMonthIndex];
                    let survivingMothers = monthState.hembrasEntrandoALactancia;
                     for (let sm=0; sm < lm; sm++){
                        survivingMothers *= (1 - monthlyMortalityAdultasRate);
                     }
                     totalHembrasEnLeche += survivingMothers;
                 }
            }
            currentState.hembrasEnProduccion = Math.round(totalHembrasEnLeche);
            currentState.litrosLecheProducidos = currentState.hembrasEnProduccion * simConfig.litrosPromedioPorAnimal * DAYS_IN_MONTH;
            currentState.ingresosVentaLeche = currentState.litrosLecheProducidos * simConfig.precioLecheLitro;

            // --- 6. Ventas (Cabritos y Descartes) ---
            const cabritosMachosSobrevivientes = currentState.nacimientosMachos * (1 - monthlyMortalityCriasRate);
            const cabritosParaVenta = cabritosMachosSobrevivientes * (simConfig.eliminacionCabritos / 100);
            // --- CORRECCIÓN: Asignar a la propiedad correcta ---
            currentState.ventasCabritos = Math.round(cabritosParaVenta);
            currentState.ingresosVentaCabritos = (cabritosParaVenta * AVG_CABRITO_WEIGHT_KG) * simConfig.precioVentaCabritoKg;
            currentState.ingresosVentaDescartes = currentState.descartesAdultas * simConfig.precioVentaDescarteAdulto;
            // --- CORRECCIÓN: Asignar a la propiedad correcta ---
            currentState.comprasVientres = Math.round(monthlyComprasVientres);

            // --- 7. Ingresos Totales ---
            currentState.ingresosTotales = currentState.ingresosVentaLeche + currentState.ingresosVentaCabritos + currentState.ingresosVentaDescartes;

            results.push(currentState);
        }

        return results;

    }, [simConfig, projectionYears]);

    return projection;
};