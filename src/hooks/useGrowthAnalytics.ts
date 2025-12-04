import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local'; 
import { 
    calculateAgeInDays, 
    getAnimalZootecnicCategory, 
    formatAge, 
    calculateTargetWeightAtAge 
} from '../utils/calculations';
// FIX TS6133: Eliminado import AppConfig no usado

export type TargetClassification = 'Superior' | 'En Meta' | 'Bajo Meta' | 'Alerta' | 'Sin Datos';
export type HerdClassification = 'Superior' | 'Promedio' | 'Inferior' | 'N/A';

// ... (Interfaces GrowthAnalyzedAnimal, CategoryPerformance, GrowthAnalytics se mantienen igual)
export interface GrowthAnalyzedAnimal extends Animal {
    formattedAge: string;
    ageInDays: number;
    currentWeight: number;
    gdp: number | null; 
    targetWeight: number;        
    targetDeviation: number;     
    weightGap: number;           
    targetClassification: TargetClassification;
    herdDeviation: number;
    herdClassification: HerdClassification;
    herdPercentile: number;
    hasEnoughData: boolean;
}

export interface CategoryPerformance {
    categoryName: string;
    animalCount: number;
    avgTargetDeviation: number;
    avgHerdDeviation: number;
    alertCount: number;
}

export interface GrowthAnalytics {
    animals: GrowthAnalyzedAnimal[];
    weaningCandidatesList: GrowthAnalyzedAnimal[];
    summaryStats: {
        total: number;
        analyzed: number;
        onTrack: number;
        alert: number;
        noData: number;
    };
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
}

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
        const kilosActiveAnimalIds = new Set(bodyWeighings.map(w => w.animalId));
        const growthCategories = ['Cabrita', 'Cabritona', 'Cabrito', 'Macho de Levante'];
        
        const animalsInGrowth = animals.filter((a: Animal) => {
            if (a.status !== 'Activo' || a.isReference) return false;
            const category = getAnimalZootecnicCategory(a, parturitions, appConfig);
            if (!growthCategories.includes(category)) return false;
            return kilosActiveAnimalIds.has(a.id);
        });

        const alertThreshold = Number(appConfig.growthAlertThreshold) || 0.85;
        let onTargetCount = 0;
        let belowTargetCount = 0;
        let alertCount = 0;
        let noDataCount = 0;
        
        const categoryMap = new Map<string, { totalTargetDeviation: number; totalHerdDeviation: number; count: number; alerts: number }>();
        const cohortMap = new Map<string, { totalWeight: number; count: number }>();

        // 2. Primer Pase
        const initialAnimalData = animalsInGrowth.map((animal) => {
            const ageInDays = calculateAgeInDays(animal.birthDate);
            const weighings = bodyWeighings.filter(w => w.animalId === animal.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const currentWeight = weighings[0].kg;
            const hasEnoughData = true; 
            const birthWeight = Number(animal.birthWeight || 0);
            const gdp = (ageInDays > 0 && currentWeight > birthWeight) ? (currentWeight - birthWeight) / ageInDays : null;
            
            const targetWeight = calculateTargetWeightAtAge(ageInDays, animal.sex, appConfig);
            const targetDeviation = (targetWeight > 0) ? (currentWeight / targetWeight) : 0;
            const weightGap = currentWeight - targetWeight;

            let classification: TargetClassification = 'Bajo Meta';
            if (targetDeviation >= 1.05) classification = 'Superior';
            else if (targetDeviation >= 0.95) classification = 'En Meta';
            else if (targetDeviation < alertThreshold) classification = 'Alerta';
            
            if (classification === 'Superior' || classification === 'En Meta') onTargetCount++;
            else if (classification === 'Alerta') alertCount++;
            else belowTargetCount++;

            const categoryName = getAnimalZootecnicCategory(animal, parturitions, appConfig);
            const catData = categoryMap.get(categoryName) || { totalTargetDeviation: 0, totalHerdDeviation: 0, count: 0, alerts: 0 };
            catData.totalTargetDeviation += targetDeviation;
            catData.count++;
            if (classification === 'Alerta') catData.alerts++;
            categoryMap.set(categoryName, catData);

            const cohort = getAgeCohort(ageInDays);
            const cohData = cohortMap.get(cohort) || { totalWeight: 0, count: 0 };
            cohData.totalWeight += currentWeight;
            cohData.count++;
            cohortMap.set(cohort, cohData);

            return { 
                animal, ageInDays, formattedAge: formatAge(animal.birthDate), 
                currentWeight, targetWeight, targetDeviation, weightGap, 
                targetClassification: classification, gdp, categoryName, cohort, hasEnoughData
            };
        });

        // 3. Promedios Cohorte
        const cohortAvgWeight = new Map<string, number>();
        cohortMap.forEach((data, cohort) => { cohortAvgWeight.set(cohort, data.count > 0 ? data.totalWeight / data.count : 0); });

        let aboveAvgCount = 0;
        let belowAvgCount = 0;
        let totalHerdDeviationSum = 0;
        const allTargetDeviations = initialAnimalData.map(a => a.targetDeviation).sort((a, b) => a - b);
        const totalAnalyzed = initialAnimalData.length;

        // 4. Segundo Pase
        const analyzedAnimals: GrowthAnalyzedAnimal[] = initialAnimalData.map(data => {
            const avgHerdWeight = cohortAvgWeight.get(data.cohort) || 0;
            const herdDeviation = (avgHerdWeight > 0 && data.currentWeight > 0) ? (data.currentWeight / avgHerdWeight) : 0;
            
            let herdClassification: HerdClassification = 'Promedio';
            if (herdDeviation >= 1.1) { herdClassification = 'Superior'; aboveAvgCount++; } 
            else if (herdDeviation <= 0.9) { herdClassification = 'Inferior'; belowAvgCount++; } 
            else { aboveAvgCount++; }
            
            totalHerdDeviationSum += herdDeviation;
            const rank = allTargetDeviations.findIndex(d => d === data.targetDeviation);
            const herdPercentile = totalAnalyzed > 0 ? (rank / totalAnalyzed) : 0;
            const catData = categoryMap.get(data.categoryName);
            if(catData) catData.totalHerdDeviation += herdDeviation;

            return {
                ...data.animal, formattedAge: data.formattedAge, ageInDays: data.ageInDays, currentWeight: data.currentWeight,
                gdp: data.gdp ? data.gdp * 1000 : null, targetWeight: data.targetWeight, targetDeviation: data.targetDeviation,
                weightGap: data.weightGap, targetClassification: data.targetClassification, herdDeviation, herdClassification,
                herdPercentile, hasEnoughData: data.hasEnoughData
            };
        }).sort((a, b) => a.targetDeviation - b.targetDeviation);

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
            avgDeviation: totalAnalyzed > 0 ? (totalHerdDeviationSum / totalAnalyzed) : 0,
        };
        const categoryPerformance: CategoryPerformance[] = Array.from(categoryMap.entries()).map(([categoryName, data]) => ({
            categoryName, animalCount: data.count,
            avgTargetDeviation: data.count > 0 ? data.totalTargetDeviation / data.count : 0,
            avgHerdDeviation: data.count > 0 ? data.totalHerdDeviation / data.count : 0,
            alertCount: data.alerts,
        })).sort((a, b) => a.avgTargetDeviation - b.avgTargetDeviation);
        const alertList = analyzedAnimals.filter(a => a.targetClassification === 'Alerta');

        // 6. Candidatos a Destete (FIX TS6133: Eliminada variable no usada)
        const metaEdadDestete = Number(appConfig.diasMetaDesteteFinal);
        const metaPesoDestete = Number(appConfig.pesoMinimoDesteteFinal);
        const pesoMinimoConTolerancia = metaPesoDestete - 0.2;

        const weaningCandidatesList = analyzedAnimals.filter(animal => {
            if (animal.weaningDate) return false; 
            if (animal.ageInDays > 365) return false; // Filtro de edad
            const meetsMinAge = animal.ageInDays >= metaEdadDestete; 
            const meetsMinWeight = animal.currentWeight >= pesoMinimoConTolerancia; 
            return meetsMinAge && meetsMinWeight; 
        }).sort((a, b) => b.ageInDays - a.ageInDays);

        const summaryStats = { total: animalsInGrowth.length, analyzed: totalAnalyzed, onTrack: onTargetCount, alert: alertCount, noData: noDataCount };

        return { animals: analyzedAnimals, targetKPIs, herdKPIs, categoryPerformance, alertList, weaningCandidatesList, summaryStats };
    }, [animals, bodyWeighings, parturitions, appConfig]);
};