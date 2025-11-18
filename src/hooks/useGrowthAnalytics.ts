// src/hooks/useGrowthAnalytics.ts
// (ACTUALIZADO: Añade la lógica de 'weaningCandidatesList' al análisis)

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { AppConfig } from '../types/config'; 
import { Animal } from '../db/local'; 
import { calculateAgeInDays, getAnimalZootecnicCategory, formatAge } from '../utils/calculations';

// --- Tipos de Clasificación EXPORTADOS ---
export type HerdClassification = 'Superior' | 'Promedio' | 'Inferior' | 'N/A';
export type TargetClassification = 'Superior' | 'En Meta' | 'Bajo Meta' | 'Alerta';

// --- 'GrowthAnalyzedAnimal' (Sin Cambios) ---
export interface GrowthAnalyzedAnimal extends Animal {
    formattedAge: string;
    ageInDays: number;
    currentWeight: number;
    gdp: number | null; // GDP General (kg/día)
    
    // --- Índices vs. "Metas" ---
    targetWeight: number; 
    targetDeviation: number; 
    targetClassification: TargetClassification;

    // --- Índices vs. "Realidad" ---
    avgHerdWeight: number; 
    herdDeviation: number; 
    herdClassification: HerdClassification;
    herdPercentile: number;
}

// --- 'CategoryPerformance' (Sin Cambios) ---
export interface CategoryPerformance {
    categoryName: string;
    animalCount: number;
    avgTargetDeviation: number;
    avgHerdDeviation: number;
    alertCount: number;
}

// --- (CORREGIDO) 'GrowthAnalytics' ahora incluye la lista de destete ---
export interface GrowthAnalytics {
    animals: GrowthAnalyzedAnimal[];
    
    targetKPIs: { 
        totalAnimals: number;
        onTargetPct: number;
        belowTargetPct: number;
        alertPct: number;
    };
    
    herdKPIs: { 
        totalAnimals: number;
        aboveAvgPct: number;
        belowAvgPct: number;
        avgDeviation: number; 
    };

    categoryPerformance: CategoryPerformance[]; 
    alertList: GrowthAnalyzedAnimal[];
    
    // --- (NUEVO) Lista de Alerta de Destete ---
    weaningCandidatesList: GrowthAnalyzedAnimal[];
}

// --- Helper para la Curva Meta (Sin Cambios) ---
const getTargetWeight = (ageInDays: number, sex: 'Hembra' | 'Macho', appConfig: AppConfig) => {
    const birthWeight = appConfig.growthGoalBirthWeight || 3.5;
    const weaningWeight = (sex === 'Macho' && appConfig.growthGoalWeaningWeightMale) ? appConfig.growthGoalWeaningWeightMale : (appConfig.pesoMinimoDesteteFinal || 15);
    const d90Weight = (sex === 'Macho' && appConfig.growthGoal90dWeightMale) ? appConfig.growthGoal90dWeightMale : (appConfig.growthGoal90dWeight || 20);
    const d180Weight = (sex === 'Macho' && appConfig.growthGoal180dWeightMale) ? appConfig.growthGoal180dWeightMale : (appConfig.growthGoal180dWeight || 28);
    
    const targetCurve = [
        { age: 0, weight: birthWeight },
        { age: appConfig.diasMetaDesteteFinal || 60, weight: weaningWeight },
        { age: 90, weight: d90Weight },
        { age: 180, weight: d180Weight },
        { age: 270, weight: appConfig.growthGoal270dWeight || 34 },
        { age: (appConfig.edadPrimerServicioMeses || 10) * 30.44, weight: appConfig.pesoPrimerServicioKg || 38 },
    ];

    const [prevPoint, nextPoint] = (() => {
        for (let i = 0; i < targetCurve.length - 1; i++) {
            if (ageInDays >= targetCurve[i].age && ageInDays <= targetCurve[i+1].age) {
                return [targetCurve[i], targetCurve[i+1]];
            }
        }
        if (ageInDays > targetCurve[targetCurve.length - 1].age) {
            return [targetCurve[targetCurve.length - 2], targetCurve[targetCurve.length - 1]];
        }
        return [targetCurve[0], targetCurve[1]];
    })();

    const ageRange = nextPoint.age - prevPoint.age;
    const weightRange = nextPoint.weight - prevPoint.weight;
    
    if (ageRange === 0) return prevPoint.weight; 
    
    const daysPastPrev = ageInDays - prevPoint.age;
    const interpolatedWeight = prevPoint.weight + (daysPastPrev / ageRange) * weightRange;
    
    return interpolatedWeight;
};

// --- Helper para agrupar por edad (Cohorte) (Sin Cambios) ---
const getAgeCohort = (ageInDays: number): string => {
    if (ageInDays <= 60) return '0-60d';
    if (ageInDays <= 90) return '61-90d';
    if (ageInDays <= 180) return '91-180d';
    if (ageInDays <= 270) return '181-270d';
    return '270d+';
};

export const useGrowthAnalytics = (): GrowthAnalytics => {
    const { animals, bodyWeighings, parturitions, appConfig } = useData();

    return useMemo(() => {
        // 1. Filtrar animales en levante
        const growthCategories = ['Cabrita', 'Cabritona', 'Cabrito', 'Macho de Levante'];
        const animalsInGrowth = animals.filter((a: Animal) => {
            if (a.status !== 'Activo' || a.isReference) return false;
            const category = getAnimalZootecnicCategory(a, parturitions, appConfig);
            return growthCategories.includes(category);
        });

        const alertThreshold = appConfig.growthAlertThreshold || 0.85;

        let onTargetCount = 0;
        let belowTargetCount = 0;
        let alertCount = 0;
        let aboveAvgCount = 0;
        let belowAvgCount = 0;
        let totalHerdDeviation = 0;
        
        const categoryMap = new Map<string, { totalTargetDeviation: number; totalHerdDeviation: number; count: number; alerts: number }>();
        const cohortMap = new Map<string, { totalWeight: number; count: number }>();

        // 2. Primer Pase: Calcular datos básicos y agrupar
        const initialAnimalData = animalsInGrowth.map((animal) => {
            const ageInDays = calculateAgeInDays(animal.birthDate);
            const weighings = bodyWeighings
                .filter(w => w.animalId === animal.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const currentWeight = weighings.length > 0 ? weighings[0].kg : (animal.birthWeight || 0);

            const gdp = (ageInDays > 0 && animal.birthWeight && currentWeight > animal.birthWeight)
                ? (currentWeight - animal.birthWeight) / ageInDays
                : null;
            
            const targetWeight = getTargetWeight(ageInDays, animal.sex, appConfig);
            const targetDeviation = (targetWeight > 0 && currentWeight > 0) ? (currentWeight / targetWeight) : 0;

            const categoryName = getAnimalZootecnicCategory(animal, parturitions, appConfig);
            const categoryData = categoryMap.get(categoryName) || { totalTargetDeviation: 0, totalHerdDeviation: 0, count: 0, alerts: 0 };
            categoryData.totalTargetDeviation += targetDeviation;
            categoryData.count++;
            categoryMap.set(categoryName, categoryData);

            const cohort = getAgeCohort(ageInDays);
            const cohortData = cohortMap.get(cohort) || { totalWeight: 0, count: 0 };
            cohortData.totalWeight += currentWeight;
            cohortData.count++;
            cohortMap.set(cohort, cohortData);

            return { animal, ageInDays, formattedAge: formatAge(animal.birthDate), currentWeight, targetWeight, targetDeviation, gdp, cohort, categoryName };
        });

        // Calcular promedios de peso real por cohorte
        const cohortAvgWeight = new Map<string, number>();
        cohortMap.forEach((data, cohort) => {
            cohortAvgWeight.set(cohort, data.count > 0 ? data.totalWeight / data.count : 0);
        });

        const allTargetDeviations = initialAnimalData.map(a => a.targetDeviation).sort((a, b) => a - b);
        const totalAnalyzed = allTargetDeviations.length;

        // 3. Segundo Pase: Calcular Índices y Clasificación
        const analyzedAnimals: GrowthAnalyzedAnimal[] = initialAnimalData.map(data => {
            const { animal, ageInDays, formattedAge, currentWeight, targetWeight, targetDeviation, gdp, cohort, categoryName } = data;

            const avgHerdWeight = cohortAvgWeight.get(cohort) || 0;
            const herdDeviation = (avgHerdWeight > 0 && currentWeight > 0) ? (currentWeight / avgHerdWeight) : 0;
            totalHerdDeviation += herdDeviation;

            const rank = allTargetDeviations.findIndex(d => d === targetDeviation);
            const herdPercentile = totalAnalyzed > 0 ? (rank / totalAnalyzed) : 0;

            let targetClassification: TargetClassification = 'Bajo Meta';
            if (targetDeviation >= 1.0) {
                targetClassification = 'En Meta';
                onTargetCount++;
            } else if (targetDeviation >= 0.9) {
                targetClassification = 'Bajo Meta';
                belowTargetCount++;
            } else if (targetDeviation < alertThreshold) {
                targetClassification = 'Alerta';
                alertCount++;
                const categoryData = categoryMap.get(categoryName);
                if (categoryData) categoryData.alerts++;
            } else {
                targetClassification = 'Bajo Meta';
                belowTargetCount++;
            }
            if (animal.sex === 'Macho' && targetDeviation > 1.1) {
                 targetClassification = 'Superior';
            }
            
            let herdClassification: HerdClassification = 'Promedio';
            if (herdDeviation > 1.1) {
                herdClassification = 'Superior';
                aboveAvgCount++;
            } else if (herdDeviation < 0.9) {
                herdClassification = 'Inferior';
                belowAvgCount++;
            } else {
                aboveAvgCount++;
            }
            
            const categoryData = categoryMap.get(categoryName);
            if(categoryData) categoryData.totalHerdDeviation += herdDeviation;

            return {
                ...animal,
                formattedAge,
                ageInDays,
                currentWeight,
                gdp: gdp ? gdp * 1000 : null,
                
                targetWeight,
                targetDeviation,
                targetClassification,

                avgHerdWeight,
                herdDeviation,
                herdClassification,
                herdPercentile,
            };
        }).sort((a, b) => a.targetDeviation - b.targetDeviation);

        // 4. Finalizar KPIs Globales
        const targetKPIs = {
            totalAnimals: totalAnalyzed,
            onTargetPct: totalAnalyzed > 0 ? (onTargetCount / totalAnalyzed) * 100 : 0,
            belowTargetPct: totalAnalyzed > 0 ? (belowTargetCount / totalAnalyzed) * 100 : 0,
            alertPct: totalAnalyzed > 0 ? (alertCount / totalAnalyzed) * 100 : 0,
        };
        
        const herdKPIs = {
            totalAnimals: totalAnalyzed,
            aboveAvgPct: totalAnalyzed > 0 ? (aboveAvgCount / totalAnalyzed) * 100 : 0,
            belowAvgPct: totalAnalyzed > 0 ? (belowAvgCount / totalAnalyzed) * 100 : 0,
            avgDeviation: totalAnalyzed > 0 ? (totalHerdDeviation / totalAnalyzed) : 0,
        };

        // 5. Finalizar KPIs de Categoría
        const categoryPerformance: CategoryPerformance[] = Array.from(categoryMap.entries()).map(([categoryName, data]) => ({
            categoryName,
            animalCount: data.count,
            avgTargetDeviation: data.count > 0 ? data.totalTargetDeviation / data.count : 0,
            avgHerdDeviation: data.count > 0 ? data.totalHerdDeviation / data.count : 0,
            alertCount: data.alerts,
        })).sort((a, b) => a.avgTargetDeviation - b.avgTargetDeviation);

        // 6. Crear Lista de Alertas (Existente)
        const alertList = analyzedAnimals.filter(a => a.targetClassification === 'Alerta');

        // --- (NUEVO) 7. Crear Lista de Candidatos a Destete ---
        const metaEdadDestete = appConfig.diasMetaDesteteFinal;
        const metaPesoDestete = appConfig.pesoMinimoDesteteFinal;
        const diasTolerancia = appConfig.diasToleranciaDestete || 10; // Fallback de 10 días
        const edadMaximaDestete = metaEdadDestete + diasTolerancia;
        const pesoMinimoConTolerancia = metaPesoDestete - 0.2; // 200g tolerance

        const weaningCandidatesList = analyzedAnimals.filter(animal => {
            // Solo chequear animales que AÚN no están destetados
            if (animal.weaningDate) return false; // Condición 1

            const meetsMinAge = animal.ageInDays >= metaEdadDestete; // Condición 2
            const meetsMinWeight = animal.currentWeight >= pesoMinimoConTolerancia; // Condición 3
            const isInToleranceWindow = animal.ageInDays <= edadMaximaDestete; // Condición 4
            
            return meetsMinAge && meetsMinWeight && isInToleranceWindow;
        }).sort((a, b) => b.ageInDays - a.ageInDays); // Mostrar los más viejos (más urgentes) primero

        // --- Fin de la nueva lógica ---

        return { 
            animals: analyzedAnimals, 
            targetKPIs, 
            herdKPIs, 
            categoryPerformance, 
            alertList, 
            weaningCandidatesList // <-- (NUEVO)
        };

    }, [animals, bodyWeighings, parturitions, appConfig]);
};