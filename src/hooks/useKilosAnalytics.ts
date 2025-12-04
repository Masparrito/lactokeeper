import { useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { 
    calculateAgeInDays, 
    getInterpolatedWeight, 
    getAnimalZootecnicCategory,
    calculateGDP,
    calculateTargetWeightAtAge
} from '../utils/calculations';

export type KilosFilterType = 'ACTUAL' | 'GLOBAL' | 'ANUAL' | 'COHORTE';
export type CohortType = 'A' | 'B' | 'C' | 'D'; 
export type SubFilterType = 'TODOS' | 'CRIAS' | 'CABRITONAS';

export interface KilosKPIs {
    avgDaysToWeaning: number;
    avgDaysToService: number;
    avgWeight90d: number;
    avgWeight180d: number;
    avgWeight270d: number;
    avgGDP: number;
    totalAnimals: number;
    // Nuevo KPI
    approachingServiceCount: number;
}

export interface KilosTargets {
    weaningDays: number;
    serviceDays: number;
    serviceWeight: number; // Nuevo: Peso meta para cálculo de proyección
    gdp: number; 
    w90: number;
    w180: number;
    w270: number;
}

export interface AnimalRowData {
    id: string;
    name: string;
    gdp: number;
    currentWeight: number;
    weaningWeight: number | null;
    w90: number | null;
    w180: number | null;
    w270: number | null;
    score: number;
    classification: 'Superior' | 'En Meta' | 'Bajo Meta' | 'Alerta' | 'Sin Datos';
    category: string;
    // Nuevo: Proyección
    daysToServiceGoal?: number; 
}

export interface KilosChartDataPoint {
    day: number;
    meta: number;
    valueA: number | null;
}

export const useKilosAnalytics = () => {
    const { animals, bodyWeighings, parturitions, events, appConfig } = useData();

    // --- ESTADOS DEL FILTRO ---
    const [filterType, setFilterType] = useState<KilosFilterType>('ACTUAL');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedCohort, setSelectedCohort] = useState<CohortType>('A');
    const [subFilter, setSubFilter] = useState<SubFilterType>('TODOS');

    const analytics = useMemo(() => {
        
        // 1. OBTENCIÓN DE METAS
        const getVal = (key: string, def: number) => Number(appConfig[key as keyof typeof appConfig]) || def;
        
        const targets: KilosTargets = {
            weaningDays: getVal('diasMetaDesteteFinal', 60),
            serviceDays: Math.floor(getVal('edadPrimerServicioMeses', 10) * 30.44), 
            serviceWeight: getVal('pesoPrimerServicioKg', 30),
            gdp: 150, 
            w90: getVal('growthGoal90dWeight', 20),
            w180: getVal('growthGoal180dWeight', 28),
            w270: getVal('growthGoal270dWeight', 34),
        };

        const alertThreshold = getVal('growthAlertThreshold', 0.85);

        // 2. FILTRADO INICIAL
        let filteredAnimals = animals.filter(a => !a.isReference); 

        if (filterType === 'ACTUAL') {
            const serviceEventIds = new Set(events.filter(e => e.type === 'Peso de Monta').map(e => e.animalId));
            
            filteredAnimals = filteredAnimals.filter(a => 
                a.status === 'Activo' && 
                !serviceEventIds.has(a.id) &&
                !['Preñada', 'En Servicio'].includes(a.reproductiveStatus || '') &&
                a.lifecycleStage !== 'Cabra' && 
                a.lifecycleStage !== 'Reproductor'
            );

            if (subFilter !== 'TODOS') {
                filteredAnimals = filteredAnimals.filter(a => {
                    const cat = getAnimalZootecnicCategory(a, parturitions, appConfig);
                    if (subFilter === 'CRIAS') return ['Cabrita', 'Cabrito'].includes(cat);
                    if (subFilter === 'CABRITONAS') return ['Cabritona', 'Macho de Levante'].includes(cat);
                    return true;
                });
            }

        } else {
            // Histórico
            filteredAnimals = animals; 
            if (filterType === 'ANUAL' || filterType === 'COHORTE') {
                filteredAnimals = filteredAnimals.filter(a => {
                    if (!a.birthDate || a.birthDate === 'N/A') return false;
                    const bDate = new Date(a.birthDate + 'T00:00:00Z');
                    return bDate.getFullYear() === selectedYear;
                });
            }
            if (filterType === 'COHORTE') {
                filteredAnimals = filteredAnimals.filter(a => {
                    if (!a.birthDate || a.birthDate === 'N/A') return false;
                    const bDate = new Date(a.birthDate + 'T00:00:00Z');
                    const month = bDate.getMonth(); 
                    const quarter = Math.floor(month / 3); 
                    const cohortLetter = ['A', 'B', 'C', 'D'][quarter];
                    return cohortLetter === selectedCohort;
                });
            }
        }

        // 3. PROCESAMIENTO
        const processedRows: AnimalRowData[] = [];
        const approachingServiceList: AnimalRowData[] = []; // Lista para el modal
        
        const kpiAccumulator = {
            weaningDaysSum: 0, weaningCount: 0,
            serviceDaysSum: 0, serviceCount: 0,
            w90Sum: 0, w90Count: 0,
            w180Sum: 0, w180Count: 0,
            w270Sum: 0, w270Count: 0,
            gdpSum: 0, gdpCount: 0
        };

        const weighingsMap = new Map<string, any[]>();
        filteredAnimals.forEach(a => {
            const w = bodyWeighings
                .filter(bw => bw.animalId === a.id)
                .sort((x, y) => new Date(x.date).getTime() - new Date(y.date).getTime());
            if (a.birthWeight && a.birthDate) {
                w.unshift({ id: 'birth', animalId: a.id, date: a.birthDate, kg: a.birthWeight, userId: '', _synced: true });
            }
            weighingsMap.set(a.id, w);
        });

        filteredAnimals.forEach(animal => {
            const allPoints = weighingsMap.get(animal.id) || [];
            
            // Cálculos básicos
            const gdpData = calculateGDP(animal.birthDate, animal.birthWeight, allPoints.filter(p => p.id !== 'birth')); 
            const gdpVal = gdpData.overall ? gdpData.overall * 1000 : 0; 
            
            // Peso Actual
            let currentWeight = animal.birthWeight || 0;
            if (allPoints.length > 0) {
                // El último punto del array ordenado por fecha
                currentWeight = allPoints[allPoints.length - 1].kg;
            }

            // --- LÓGICA PROYECCIÓN DE SERVICIO ---
            // Solo para hembras, si no han llegado al peso, pero tienen GDP positiva
            let daysToServiceGoal = undefined;
            if (animal.sex === 'Hembra' && currentWeight < targets.serviceWeight && gdpVal > 0) {
                const remainingKg = targets.serviceWeight - currentWeight;
                const gdpKg = gdpVal / 1000;
                const daysNeeded = remainingKg / gdpKg;
                
                // Si faltan 30 días o menos, es candidato "Próximo"
                if (daysNeeded <= 30) {
                    daysToServiceGoal = Math.ceil(daysNeeded);
                }
            }

            const w90 = getInterpolatedWeight(allPoints, animal.birthDate || '', 90);
            const w180 = getInterpolatedWeight(allPoints, animal.birthDate || '', 180);
            const w270 = getInterpolatedWeight(allPoints, animal.birthDate || '', 270);
            
            // --- ACUMULADORES KPI ---
            if (animal.weaningDate && animal.birthDate) {
                const days = calculateAgeInDays(animal.birthDate, animal.weaningDate);
                if (days >= 30 && days <= 120) { 
                    kpiAccumulator.weaningDaysSum += days; 
                    kpiAccumulator.weaningCount++; 
                }
            }

            const serviceEvent = events.find(e => e.animalId === animal.id && e.type === 'Peso de Monta');
            if (serviceEvent && animal.birthDate) {
                const days = calculateAgeInDays(animal.birthDate, serviceEvent.date);
                if (days >= 150 && days <= 900) { 
                    kpiAccumulator.serviceDaysSum += days; 
                    kpiAccumulator.serviceCount++; 
                }
            }

            if (w90 !== null && w90 > 0) { kpiAccumulator.w90Sum += w90; kpiAccumulator.w90Count++; }
            if (w180 !== null && w180 > 0) { kpiAccumulator.w180Sum += w180; kpiAccumulator.w180Count++; }
            if (w270 !== null && w270 > 0) { kpiAccumulator.w270Sum += w270; kpiAccumulator.w270Count++; }
            if (gdpVal > 0) { kpiAccumulator.gdpSum += gdpVal; kpiAccumulator.gdpCount++; }

            // Score Simplificado (sin usar getGrowthStatus completo por rendimiento)
            const ageInDays = calculateAgeInDays(animal.birthDate);
            const targetWeightToday = calculateTargetWeightAtAge(ageInDays, animal.sex, appConfig);
            const targetDeviation = (targetWeightToday > 0) ? (currentWeight / targetWeightToday) : 0;
            
            let classification: AnimalRowData['classification'] = 'Bajo Meta';
            if (targetDeviation >= 1.05) classification = 'Superior';
            else if (targetDeviation >= 0.95) classification = 'En Meta';
            else if (targetDeviation < alertThreshold) classification = 'Alerta';
            if (ageInDays < 0 || allPoints.length <= 1) classification = 'Sin Datos'; // Solo nacimiento

            const rowData: AnimalRowData = {
                id: animal.id,
                name: animal.name || '',
                gdp: gdpVal,
                currentWeight,
                weaningWeight: animal.weaningWeight || null,
                w90, w180, w270,
                score: Math.min(targetDeviation * 10, 10), // Score simple 0-10
                classification,
                category: getAnimalZootecnicCategory(animal, parturitions, appConfig),
                daysToServiceGoal
            };

            processedRows.push(rowData);

            // Si tiene proyección válida, agregar a la lista de "Próximos"
            if (daysToServiceGoal !== undefined) {
                approachingServiceList.push(rowData);
            }
        });

        const kpis: KilosKPIs = {
            avgDaysToWeaning: kpiAccumulator.weaningCount ? kpiAccumulator.weaningDaysSum / kpiAccumulator.weaningCount : 0,
            avgDaysToService: kpiAccumulator.serviceCount ? kpiAccumulator.serviceDaysSum / kpiAccumulator.serviceCount : 0,
            avgWeight90d: kpiAccumulator.w90Count ? kpiAccumulator.w90Sum / kpiAccumulator.w90Count : 0,
            avgWeight180d: kpiAccumulator.w180Count ? kpiAccumulator.w180Sum / kpiAccumulator.w180Count : 0,
            avgWeight270d: kpiAccumulator.w270Count ? kpiAccumulator.w270Sum / kpiAccumulator.w270Count : 0,
            avgGDP: kpiAccumulator.gdpCount ? kpiAccumulator.gdpSum / kpiAccumulator.gdpCount : 0,
            totalAnimals: filteredAnimals.length,
            approachingServiceCount: approachingServiceList.length
        };

        const chartData: KilosChartDataPoint[] = [];
        for (let d = 0; d <= 450; d += 30) {
            const meta = calculateTargetWeightAtAge(d, 'Hembra', appConfig);
            let sumWeight = 0;
            let countWeight = 0;
            filteredAnimals.forEach(a => {
                const points = weighingsMap.get(a.id);
                if (points && a.birthDate) {
                    const w = getInterpolatedWeight(points, a.birthDate, d);
                    if (w !== null) { sumWeight += w; countWeight++; }
                }
            });
            chartData.push({
                day: d,
                meta: parseFloat(meta.toFixed(1)),
                valueA: countWeight > 0 ? parseFloat((sumWeight / countWeight).toFixed(1)) : null
            });
        }

        return {
            kpis,
            targets,
            rows: processedRows,
            approachingServiceList, // <--- EXPORTADO
            chartData,
            rawAnimals: filteredAnimals,
            filterType // Exportamos el tipo de filtro para la UI
        };

    }, [animals, bodyWeighings, events, parturitions, filterType, selectedYear, selectedCohort, subFilter, appConfig]);

    return { ...analytics, filterState: { filterType, selectedYear, selectedCohort, subFilter }, setters: { setFilterType, setSelectedYear, setSelectedCohort, setSubFilter } };
};