import { useMemo } from 'react';
import { useData } from '../context/DataContext'; // Ajusta la ruta
import { SimulationConfig } from './useHerdEvolution'; // Ajusta la ruta
import { 
    getSimulationAgeCategory, 
    getDaysBetweenDates,
    getActiveLactationForWeighing
} from '../utils/analyticsHelpers'; // Ajusta la ruta
import { Parturition } from '../db/local'; // Ajusta la ruta (CORREGIDO: Imports no usados eliminados)

// --- Copiado de EvolucionShell.tsx para usar como fallback ---
const defaultSimulationParams: Omit<SimulationConfig, 'initialCabras'|'initialLevanteTardio'|'initialLevanteMedio'|'initialLevanteTemprano'|'initialCriaH'|'initialCriaM'|'initialPadres'> = {
    comprasVientresAnual: 0,
    duracionMontaDias: 45,
    diasGestacion: 150,
    litrosPromedioPorAnimal: 1.8,
    litrosPicoPorAnimal: 2.6,
    diasLactanciaObjetivo: 305,
    porcentajePrenez: 90,
    porcentajeProlificidad: 120,
    mortalidadCrias: 5,
    mortalidadLevante: 3,
    mortalidadCabras: 3,
    tasaReemplazo: 20,
    eliminacionCabritos: 100,
    precioLecheLitro: 0.5,
    precioVentaCabritoKg: 3,
    precioVentaDescarteAdulto: 50,
    monedaSimbolo: "$",
};

/**
 * Hook V7.0: Calcula una SimulationConfig completa basada en el
 * desempeño histórico real de la finca.
 */
export const useRealtimeKpiCalculator = (): { realConfig: SimulationConfig | null; isLoading: boolean } => {
    
    const { 
        animals, 
        events, 
        parturitions, 
        serviceRecords, 
        weighings, // Pesajes lecheros
        appConfig, 
        isLoading: isDataLoading, 
        isLoadingConfig 
    } = useData();

    const isLoading = isDataLoading || isLoadingConfig;

    const realConfig = useMemo<SimulationConfig | null>(() => {
        if (isLoading || !animals || animals.length === 0) {
            return null;
        }

        const today = new Date().toISOString().split('T')[0];
        const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0];

        // ---------------------------------------------------------
        // 1. CÁLCULO DE POBLACIÓN INICIAL (V7.0)
        // ---------------------------------------------------------
        let initialCabras = 0;
        let initialLevanteTardio = 0;
        let initialLevanteMedio = 0;
        let initialLevanteTemprano = 0;
        let initialCriaH = 0;
        let initialCriaM = 0; // El motor V6.2 los separa
        let initialPadres = 0;

        const activeAnimals = animals.filter(a => a.status === 'Activo' && !a.isReference);

        activeAnimals.forEach(animal => {
            const category = getSimulationAgeCategory(animal, today);
            switch (category) {
                case 'CriaH':
                    // Asumimos 50/50 H/M para crías 0-3m si no hay datos de sexo
                    if (animal.sex === 'Hembra') initialCriaH++;
                    else if (animal.sex === 'Macho') initialCriaM++;
                    else initialCriaH += 0.5, initialCriaM += 0.5;
                    break;
                case 'L.Temprano': initialLevanteTemprano++; break;
                case 'L.Medio': initialLevanteMedio++; break;
                case 'L.Tardío': initialLevanteTardio++; break;
                case 'Cabras': initialCabras++; break;
                case 'Machos': initialPadres++; break;
                default: break; // 'Otros' no se cuentan
            }
        });
        
        // Redondear las crías y asegurar 1 padre
        initialCriaH = Math.round(initialCriaH);
        initialCriaM = Math.round(initialCriaM);
        initialPadres = Math.max(1, initialPadres);

        // ---------------------------------------------------------
        // 2. CÁLCULOS REPRODUCTIVOS (V7.0)
        // ---------------------------------------------------------
        
        // % Preñez: (Partos confirmados / Servicios) en el último año
        const servicesLastYear = serviceRecords.filter(s => s.serviceDate >= oneYearAgo);
        const parturitionsLastYear = parturitions.filter(p => p.parturitionDate >= oneYearAgo);
        
        // CORRECCIÓN: Usar '!' para asegurar a TS que el default no es undefined
        let realPorcentajePrenez = defaultSimulationParams.porcentajePrenez!;
        if (servicesLastYear.length > 5) { // Mínimo de 5 servicios para calcular
            const confirmedServices = servicesLastYear.filter(service => {
                // Un servicio se confirma si hay un parto ~5 meses (140-160 días) después
                return parturitionsLastYear.some(parto => 
                    parto.goatId === service.femaleId &&
                    getDaysBetweenDates(service.serviceDate, parto.parturitionDate) > 140 &&
                    getDaysBetweenDates(service.serviceDate, parto.parturitionDate) < 160
                );
            });
            realPorcentajePrenez = (confirmedServices.length / servicesLastYear.length) * 100;
        }

        // % Prolificidad: (Crías nacidas / Partos) en el último año
        // CORRECCIÓN: Usar '!' para asegurar a TS que el default no es undefined
        let realPorcentajeProlificidad = defaultSimulationParams.porcentajeProlificidad!;
        const partosNormalesLastYear = parturitionsLastYear.filter(p => p.parturitionOutcome === 'Normal' || p.parturitionOutcome === 'Con Mortinatos');
        
        if (partosNormalesLastYear.length > 3) { // Mínimo 3 partos para calcular
            const totalOffspring = partosNormalesLastYear.reduce((sum, p) => sum + (p.offspringCount || 0), 0);
            realPorcentajeProlificidad = (totalOffspring / partosNormalesLastYear.length) * 100;
        }

        // ---------------------------------------------------------
        // 3. CÁLCULO DE MORTALIDAD (V7.0)
        // ---------------------------------------------------------
        const deathEventsLastYear = events.filter(e => e.type === 'Cambio de Estado' && e.details.includes('Muerte') && e.date >= oneYearAgo);
        const animalsAtStartOfYear = animals.filter(a => (a.createdAt || 0) <= new Date(oneYearAgo).getTime());

        // --- Mortalidad Crías (0-3m) ---
        const nacimientosLastYear = events.filter(e => e.type === 'Nacimiento' && e.date >= oneYearAgo).length;
        const muertesCrias = deathEventsLastYear.filter(e => {
            const animal = animals.find(a => a.id === e.animalId);
            return animal && getSimulationAgeCategory(animal, e.date) === 'CriaH';
        }).length;
        // CORRECCIÓN: Usar '!' para asegurar a TS que el default no es undefined
        let realMortalidadCrias = defaultSimulationParams.mortalidadCrias!;
        if (nacimientosLastYear > 5) { // Mínimo 5 nacimientos
            realMortalidadCrias = (muertesCrias / nacimientosLastYear) * 100;
        }

        // --- Mortalidad Levante (3-18m) ---
        const muertesLevante = deathEventsLastYear.filter(e => {
            const animal = animals.find(a => a.id === e.animalId);
            return animal && ['L.Temprano', 'L.Medio', 'L.Tardío'].includes(getSimulationAgeCategory(animal, e.date));
        }).length;
        const avgPobLevante = animalsAtStartOfYear.filter(a => ['L.Temprano', 'L.Medio', 'L.Tardío'].includes(getSimulationAgeCategory(a, oneYearAgo))).length;
        // CORRECCIÓN: Usar '!' para asegurar a TS que el default no es undefined
        let realMortalidadLevante = defaultSimulationParams.mortalidadLevante!;
        if (avgPobLevante > 0) {
            realMortalidadLevante = (muertesLevante / avgPobLevante) * 100;
        }
        
        // --- Mortalidad Cabras (>18m) ---
        const muertesCabras = deathEventsLastYear.filter(e => {
            const animal = animals.find(a => a.id === e.animalId);
            return animal && getSimulationAgeCategory(animal, e.date) === 'Cabras';
        }).length;
        const avgPobCabras = animalsAtStartOfYear.filter(a => getSimulationAgeCategory(a, oneYearAgo) === 'Cabras').length;
        // CORRECCIÓN: Usar '!' para asegurar a TS que el default no es undefined
        let realMortalidadCabras = defaultSimulationParams.mortalidadCabras!;
        if (avgPobCabras > 0) {
            realMortalidadCabras = (muertesCabras / avgPobCabras) * 100;
        }


        // ---------------------------------------------------------
        // 4. CÁLCULO CURVA DE LECHE (V7.0 - La Joya)
        // ---------------------------------------------------------
        // (Usar weighings, parturitions)
        // CORRECCIÓN: Usar '!' para asegurar a TS que el default no es undefined
        let realLitrosPromedio = defaultSimulationParams.litrosPromedioPorAnimal!;
        let realLitrosPico = defaultSimulationParams.litrosPicoPorAnimal!;
        
        if (weighings.length > 20) { // Mínimo 20 pesajes en la BD
            const allParturitionsById = new Map<string, Parturition[]>();
            parturitions.forEach(p => {
                const parts = allParturitionsById.get(p.goatId) || [];
                parts.push(p);
                allParturitionsById.set(p.goatId, parts);
            });

            const lactationData: { daysInMilk: number, kg: number }[] = [];
            
            weighings.forEach(w => {
                const animalParturitions = allParturitionsById.get(w.goatId);
                if (!animalParturitions) return; // Sin partos, no podemos saber lactancia

                const activeLactation = getActiveLactationForWeighing(w.date, animalParturitions);
                if (!activeLactation) return; // Pesaje fuera de una lactancia válida

                const daysInMilk = getDaysBetweenDates(activeLactation.parturitionDate, w.date);
                
                // Limitar a una lactancia estándar (ej. 305 días)
                if (daysInMilk >= 0 && daysInMilk <= 305) {
                    lactationData.push({ daysInMilk, kg: w.kg });
                }
            });

            if (lactationData.length > 10) { // Mínimo 10 puntos de datos válidos
                // Promedio Real (L/día)
                const totalKg = lactationData.reduce((sum, data) => sum + data.kg, 0);
                realLitrosPromedio = totalKg / lactationData.length;

                // Pico Real (Agrupar por mes de lactancia)
                const monthlyGroups: { [month: number]: number[] } = {};
                lactationData.forEach(data => {
                    const month = Math.floor(data.daysInMilk / 30.44) + 1; // Mes 1, 2, 3...
                    if (!monthlyGroups[month]) monthlyGroups[month] = [];
                    monthlyGroups[month].push(data.kg);
                });
                
                const monthlyAverages = Object.values(monthlyGroups).map(group => {
                    const sum = group.reduce((s, val) => s + val, 0);
                    return sum / group.length;
                });

                realLitrosPico = Math.max(...monthlyAverages, realLitrosPromedio * 1.01); // El pico debe ser al menos el promedio
            }
        }

        // ---------------------------------------------------------
        // 5. CONSTRUIR EL OBJETO FINAL
        // ---------------------------------------------------------
        const config: SimulationConfig = {
            // Usar defaults de appConfig o los defaults globales
            ...defaultSimulationParams,
            ...(appConfig || {}), 

            // --- KPIs REALES (Población) ---
            initialCabras: Math.round(initialCabras),
            initialLevanteTardio: Math.round(initialLevanteTardio),
            initialLevanteMedio: Math.round(initialLevanteMedio),
            initialLevanteTemprano: Math.round(initialLevanteTemprano),
            initialCriaH: Math.round(initialCriaH),
            initialCriaM: Math.round(initialCriaM),
            initialPadres: Math.round(initialPadres),
            
            // --- KPIs REALES (Biológicos) ---
            // CORRECCIÓN: Usar las variables que ahora SÍ tienen un número
            porcentajePrenez: parseFloat(realPorcentajePrenez.toFixed(1)),
            porcentajeProlificidad: parseFloat(realPorcentajeProlificidad.toFixed(1)),
            mortalidadCrias: parseFloat(realMortalidadCrias.toFixed(1)),
            mortalidadLevante: parseFloat(realMortalidadLevante.toFixed(1)),
            mortalidadCabras: parseFloat(realMortalidadCabras.toFixed(1)),

            // --- KPIs REALES (Leche) ---
            litrosPromedioPorAnimal: parseFloat(realLitrosPromedio.toFixed(2)),
            litrosPicoPorAnimal: parseFloat(realLitrosPico.toFixed(2)),
            
            // Usar moneda de appConfig
            monedaSimbolo: appConfig?.monedaSimbolo ?? defaultSimulationParams.monedaSimbolo,
            
            // Forzar 'compras' a 0 para una proyección real
            comprasVientresAnual: 0, 
        };

        // CORRECCIÓN: Usar '?? 0' para la comparación segura
        if ((config.litrosPicoPorAnimal ?? 0) <= (config.litrosPromedioPorAnimal ?? 0)) {
            // CORRECCIÓN: Usar '?? 1.8' para el cálculo seguro
            config.litrosPicoPorAnimal = (config.litrosPromedioPorAnimal ?? 1.8) * 1.4; // Fallback al 140%
        }
        
        return config;

    }, [isLoading, animals, events, parturitions, serviceRecords, weighings, appConfig]);

    return { realConfig, isLoading };
};