import { useMemo } from 'react';
import { Animal, BodyWeighing } from '../db/local';
import { formatAge } from '../utils/calculations';
import { AppConfig } from '../types/config';

export type SessionTrend = 'up' | 'down' | 'stable' | 'single';
export type GdpClassification = 'Sobresaliente' | 'Promedio' | 'Pobre' | 'N/A';

export interface GdpAnalyzedAnimal extends Animal {
    formattedAge: string;
    ageInDays: number; 
    currentWeight: number;
    previousWeight: number | null;
    gdp: number | null;
    trend: SessionTrend;
    classification: GdpClassification;
    weighingDate: string;
    isWeaningCandidate: boolean;
}

export interface GdpAnalysis {
    classifiedAnimals: GdpAnalyzedAnimal[];
    distribution: { name: 'Pobre' | 'Promedio' | 'Sobresaliente'; count: number; fill: string }[];
    gaussChartData: { name: string; count: number }[];
    meanGdp: number; 
    stdDev: number; 
    newAnimalIds: Set<string>;
    weaningCandidateCount: number;
}

const calculateDaysBetween = (date1: string, date2: string): number => {
    if (!date1 || date1 === 'N/A' || !date2 || date2 === 'N/A') return 0;
    const d1 = new Date(date1 + 'T00:00:00Z').getTime();
    const d2 = new Date(date2 + 'T00:00:00Z').getTime();
    return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
};

// Helper para chequear historial
const checkIfCandidateInPast = (
    animal: Animal, 
    allWeighings: BodyWeighing[], 
    currentWeighingDate: string,
    metaEdad: number,
    pesoMinimoConTolerancia: number
): boolean => {
    if (!animal.birthDate || animal.birthDate === 'N/A') return false;
    const currentDate = new Date(currentWeighingDate + 'T00:00:00Z').getTime();
    const pastWeighings = allWeighings.filter(w => w.animalId === animal.id && new Date(w.date + 'T00:00:00Z').getTime() < currentDate);
    if (pastWeighings.length === 0) return false;
    for (const pastWeighing of pastWeighings) {
        const ageAtPastWeighing = calculateDaysBetween(pastWeighing.date, animal.birthDate);
        const meetsMinAge = ageAtPastWeighing >= metaEdad;
        const meetsMinWeight = pastWeighing.kg >= pesoMinimoConTolerancia;
        if (meetsMinAge && meetsMinWeight) return true; 
    }
    return false;
};

export const useGdpAnalysis = (
    weighingsForDay: BodyWeighing[],
    allAnimals: Animal[],
    allWeighings: BodyWeighing[],
    appConfig: AppConfig 
): GdpAnalysis => {
    return useMemo(() => {
        const emptyDistribution: GdpAnalysis['distribution'] = [
            { name: 'Pobre', count: 0, fill: '#FF3B30' },
            { name: 'Promedio', count: 0, fill: '#6B7280' },
            { name: 'Sobresaliente', count: 0, fill: '#34C759' },
        ];
        
        const emptyReturn: GdpAnalysis = { 
            classifiedAnimals: [], distribution: emptyDistribution, gaussChartData: [], 
            meanGdp: 0, stdDev: 0, newAnimalIds: new Set<string>(), weaningCandidateCount: 0 
        };
        
        if (!weighingsForDay.length || !allAnimals.length) return emptyReturn;

        const animalMap = new Map(allAnimals.map(a => [a.id, a]));
        const newAnimalIds = new Set<string>();
        let weaningCandidateCount = 0; 
        
        const metaEdad = appConfig.diasMetaDesteteFinal; 
        const metaPeso = appConfig.pesoMinimoDesteteFinal; 
        const pesoMinimoConTolerancia = metaPeso - 0.1; 

        // 1. Calcular GDP
        const initialAnalyzedAnimals = weighingsForDay.reduce((acc: Omit<GdpAnalyzedAnimal, 'classification'>[], currentWeighing) => {
            const animal = animalMap.get(currentWeighing.animalId);
            if (!animal) return acc;

            const animalHistory = allWeighings.filter(w => w.animalId === animal.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            let trend: SessionTrend = 'single';
            let gdp: number | null = null;
            let previousWeight: number | null = null;
            const currentIndex = animalHistory.findIndex(w => w.id === currentWeighing.id);
            if (currentIndex !== -1 && currentIndex + 1 < animalHistory.length) {
                const previousWeighing = animalHistory[currentIndex + 1];
                const daysBetween = calculateDaysBetween(currentWeighing.date, previousWeighing.date);
                if (daysBetween > 0) {
                    const weightDiff_kg = currentWeighing.kg - previousWeighing.kg;
                    gdp = (weightDiff_kg / daysBetween) * 1000;
                    previousWeight = previousWeighing.kg;
                    const margin = 0.1;
                    if (weightDiff_kg > margin) trend = 'up';
                    else if (weightDiff_kg < -margin) trend = 'down';
                    else trend = 'stable';
                }
            } else { newAnimalIds.add(animal.id); }
            
            const ageAtWeighing = (animal.birthDate && animal.birthDate !== 'N/A') ? calculateDaysBetween(currentWeighing.date, animal.birthDate) : -1;
            
            // --- LÓGICA DE DESTETE ---
            let isWeaningCandidate = false;
            
            // CORRECCIÓN: Si el animal tenía más de 365 días al momento del pesaje, NO es candidato (es viejo)
            if (ageAtWeighing !== -1 && !animal.weaningDate && ageAtWeighing <= 365) { 
                const meetsMinAgeNow = ageAtWeighing >= metaEdad; 
                const meetsMinWeightNow = currentWeighing.kg >= pesoMinimoConTolerancia; 

                if (meetsMinAgeNow && meetsMinWeightNow) {
                    const wasCandidateInPast = checkIfCandidateInPast(animal, allWeighings, currentWeighing.date, metaEdad, pesoMinimoConTolerancia);
                    if (!wasCandidateInPast) {
                        isWeaningCandidate = true;
                        weaningCandidateCount++;
                    }
                }
            }

            acc.push({
                ...animal,
                formattedAge: formatAge(animal.birthDate),
                ageInDays: ageAtWeighing,
                currentWeight: currentWeighing.kg,
                previousWeight: previousWeight,
                gdp: gdp,
                trend: trend,
                weighingDate: currentWeighing.date,
                isWeaningCandidate 
            });
            return acc;
        }, []);

        // 2. Calcular stats
        const validAnimalsForAnalysis = initialAnalyzedAnimals.filter(a => a.gdp !== null);
        if (validAnimalsForAnalysis.length === 0) {
            const classifiedAnimals = initialAnalyzedAnimals.map(a => ({ ...a, classification: 'N/A' as const }));
            return { ...emptyReturn, classifiedAnimals, newAnimalIds, weaningCandidateCount };
        }

        const gdpValues = validAnimalsForAnalysis.map(a => a.gdp as number);
        const meanGdp = gdpValues.reduce((sum, val) => sum + val, 0) / gdpValues.length;
        const stdDev = Math.sqrt(gdpValues.reduce((sum, val) => sum + Math.pow(val - meanGdp, 2), 0) / gdpValues.length);

        const POOR_THRESHOLD = meanGdp - (0.4 * stdDev);
        const EXCELLENT_THRESHOLD = meanGdp + (0.4 * stdDev);

        const classifiedAnimals: GdpAnalyzedAnimal[] = initialAnalyzedAnimals.map(animal => {
            if (animal.gdp === null) {
                return { ...animal, classification: 'N/A' as const };
            }
            let classification: GdpClassification = 'Promedio';
            if (stdDev > (meanGdp * 0.1)) {
                if (animal.gdp < POOR_THRESHOLD) classification = 'Pobre';
                else if (animal.gdp > EXCELLENT_THRESHOLD) classification = 'Sobresaliente';
            }
            return { ...animal, classification };
        }).sort((a,b) => (b.gdp ?? -Infinity) - (a.gdp ?? -Infinity));

        const distribution: GdpAnalysis['distribution'] = [
            { name: 'Pobre', count: classifiedAnimals.filter(a => a.classification === 'Pobre').length, fill: '#FF3B30' },
            { name: 'Promedio', count: classifiedAnimals.filter(a => a.classification === 'Promedio').length, fill: '#6B7280' },
            { name: 'Sobresaliente', count: classifiedAnimals.filter(a => a.classification === 'Sobresaliente').length, fill: '#34C759' },
        ];

        const gaussChartData: { name: string, count: number }[] = [];
        if (gdpValues.length > 0) {
            const minGdp = Math.min(...gdpValues);
            const maxGdp = Math.max(...gdpValues);
            const step = Math.max(10, Math.ceil((maxGdp - minGdp) / 15)); 
            
            for (let i = Math.floor(minGdp / step) * step; i < maxGdp + step; i += step) {
                const rangeStart = i; 
                const rangeEnd = i + step;
                const count = classifiedAnimals.filter(a => a.gdp !== null && a.gdp >= rangeStart && a.gdp < rangeEnd).length;
                if (count > 0) gaussChartData.push({ name: `${rangeStart}`, count }); 
            }
        }

        return { classifiedAnimals, distribution, gaussChartData, meanGdp, stdDev, newAnimalIds, weaningCandidateCount };

    }, [weighingsForDay, allAnimals, allWeighings, appConfig]);
};