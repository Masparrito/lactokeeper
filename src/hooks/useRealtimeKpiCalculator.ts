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
                    if (animal.sex === 'Hembra') initialCriaH++;
                    else if (animal.sex === 'Macho') initialCriaM++;
                    else initialCriaH += 0.5, initialCriaM += 0.5;
                    break;
                case 'L.Temprano': initialLevanteTemprano++; break;
                case 'L.Medio': initialLevanteMedio++; break;
                case 'L.Tardío': initialLevanteTardio++; break;
                case 'Cabras': initialCabras++; break;
                case 'Machos': initialPadres++; break;
                default: break; 
            }
        });
        
        initialCriaH = Math.round(initialCriaH);
        initialCriaM = Math.round(initialCriaM);
        initialPadres = Math.max(1, initialPadres);

        // ---------------------------------------------------------
        // 2. CÁLCULOS REPRODUCTIVOS (V7.0)
        // ---------------------------------------------------------
        
        const servicesLastYear = serviceRecords.filter(s => s.serviceDate >= oneYearAgo);
        const parturitionsLastYear = parturitions.filter(p => p.parturitionDate >= oneYearAgo);
        
        let realPorcentajePrenez = defaultSimulationParams.porcentajePrenez!;
        if (servicesLastYear.length > 5) { 
            const confirmedServices = servicesLastYear.filter(service => {
                return parturitionsLastYear.some(parto => 
                    parto.goatId === service.femaleId &&
                    getDaysBetweenDates(service.serviceDate, parto.parturitionDate) > 140 &&
                    getDaysBetweenDates(service.serviceDate, parto.parturitionDate) < 160
                );
            });
            realPorcentajePrenez = (confirmedServices.length / servicesLastYear.length) * 100;
        }

        let realPorcentajeProlificidad = defaultSimulationParams.porcentajeProlificidad!;
        const partosNormalesLastYear = parturitionsLastYear.filter(p => p.parturitionOutcome === 'Normal' || p.parturitionOutcome === 'Con Mortinatos');
        
        if (partosNormalesLastYear.length > 3) { 
            const totalOffspring = partosNormalesLastYear.reduce((sum, p) => sum + (p.offspringCount || 0), 0);
            realPorcentajeProlificidad = (totalOffspring / partosNormalesLastYear.length) * 100;
        }

        // ---------------------------------------------------------
        // 3. CÁLCULO DE MORTALIDAD (V7.0)
        // ---------------------------------------------------------
        const deathEventsLastYear = events.filter(e => e.type === 'Cambio de Estado' && e.details.includes('Muerte') && e.date >= oneYearAgo);
        const animalsAtStartOfYear = animals.filter(a => (a.createdAt || 0) <= new Date(oneYearAgo).getTime());

        const nacimientosLastYear = events.filter(e => e.type === 'Nacimiento' && e.date >= oneYearAgo).length;
        const muertesCrias = deathEventsLastYear.filter(e => {
            const animal = animals.find(a => a.id === e.animalId);
            return animal && getSimulationAgeCategory(animal, e.date) === 'CriaH';
        }).length;
        let realMortalidadCrias = defaultSimulationParams.mortalidadCrias!;
        if (nacimientosLastYear > 5) { 
            realMortalidadCrias = (muertesCrias / nacimientosLastYear) * 100;
        }

        const muertesLevante = deathEventsLastYear.filter(e => {
            const animal = animals.find(a => a.id === e.animalId);
            return animal && ['L.Temprano', 'L.Medio', 'L.Tardío'].includes(getSimulationAgeCategory(animal, e.date));
        }).length;
        const avgPobLevante = animalsAtStartOfYear.filter(a => ['L.Temprano', 'L.Medio', 'L.Tardío'].includes(getSimulationAgeCategory(a, oneYearAgo))).length;
        let realMortalidadLevante = defaultSimulationParams.mortalidadLevante!;
        if (avgPobLevante > 0) {
            realMortalidadLevante = (muertesLevante / avgPobLevante) * 100;
        }
        
        const muertesCabras = deathEventsLastYear.filter(e => {
            const animal = animals.find(a => a.id === e.animalId);
            return animal && getSimulationAgeCategory(animal, e.date) === 'Cabras';
        }).length;
        const avgPobCabras = animalsAtStartOfYear.filter(a => getSimulationAgeCategory(a, oneYearAgo) === 'Cabras').length;
        let realMortalidadCabras = defaultSimulationParams.mortalidadCabras!;
        if (avgPobCabras > 0) {
            realMortalidadCabras = (muertesCabras / avgPobCabras) * 100;
        }


        // ---------------------------------------------------------
        // 4. CÁLCULO CURVA DE LECHE (V7.0)
        // ---------------------------------------------------------
        let realLitrosPromedio = defaultSimulationParams.litrosPromedioPorAnimal!;
        let realLitrosPico = defaultSimulationParams.litrosPicoPorAnimal!;
        
        if (weighings.length > 20) { 
            const allParturitionsById = new Map<string, Parturition[]>();
            parturitions.forEach(p => {
                const parts = allParturitionsById.get(p.goatId) || [];
                parts.push(p);
                allParturitionsById.set(p.goatId, parts);
            });

            const lactationData: { daysInMilk: number, kg: number }[] = [];
            
            weighings.forEach(w => {
                const animalParturitions = allParturitionsById.get(w.goatId);
                if (!animalParturitions) return; 

                const activeLactation = getActiveLactationForWeighing(w.date, animalParturitions);
                if (!activeLactation) return; 

                const daysInMilk = getDaysBetweenDates(activeLactation.parturitionDate, w.date);
                
                if (daysInMilk >= 0 && daysInMilk <= 305) {
                    lactationData.push({ daysInMilk, kg: w.kg });
                }
            });

            if (lactationData.length > 10) { 
                const totalKg = lactationData.reduce((sum, data) => sum + data.kg, 0);
                realLitrosPromedio = totalKg / lactationData.length;

                const monthlyGroups: { [month: number]: number[] } = {};
                lactationData.forEach(data => {
                    const month = Math.floor(data.daysInMilk / 30.44) + 1; 
                    if (!monthlyGroups[month]) monthlyGroups[month] = [];
                    monthlyGroups[month].push(data.kg);
                });
                
                const monthlyAverages = Object.values(monthlyGroups).map(group => {
                    const sum = group.reduce((s, val) => s + val, 0);
                    return sum / group.length;
                });

                realLitrosPico = Math.max(...monthlyAverages, realLitrosPromedio * 1.01); 
            }
        }

        // ---------------------------------------------------------
        // 5. CONSTRUIR EL OBJETO FINAL
        // ---------------------------------------------------------
        const config: SimulationConfig = {
            // Usar defaults de appConfig o los defaults globales
            ...defaultSimulationParams,
            // (CORRECCIÓN) Usamos los valores de appConfig (que ahora solo son de manejo)
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
            porcentajePrenez: parseFloat(realPorcentajePrenez.toFixed(1)),
            porcentajeProlificidad: parseFloat(realPorcentajeProlificidad.toFixed(1)),
            mortalidadCrias: parseFloat(realMortalidadCrias.toFixed(1)),
            mortalidadLevante: parseFloat(realMortalidadLevante.toFixed(1)),
            mortalidadCabras: parseFloat(realMortalidadCabras.toFixed(1)),

            // --- KPIs REALES (Leche) ---
            litrosPromedioPorAnimal: parseFloat(realLitrosPromedio.toFixed(2)),
            litrosPicoPorAnimal: parseFloat(realLitrosPico.toFixed(2)),
            
            // --- (INICIO) CORRECCIÓN DE ERROR ---
            // 'monedaSimbolo' ya no está en appConfig, usamos el default local.
            monedaSimbolo: defaultSimulationParams.monedaSimbolo,
            // --- (FIN) CORRECCIÓN DE ERROR ---
            
            comprasVientresAnual: 0, 
        };

        if ((config.litrosPicoPorAnimal ?? 0) <= (config.litrosPromedioPorAnimal ?? 0)) {
            config.litrosPicoPorAnimal = (config.litrosPromedioPorAnimal ?? 1.8) * 1.4; 
        }
        
        return config;

    }, [isLoading, animals, events, parturitions, serviceRecords, weighings, appConfig]);

    return { realConfig, isLoading };
};