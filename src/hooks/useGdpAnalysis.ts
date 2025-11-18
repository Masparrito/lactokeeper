// src/hooks/useGdpAnalysis.ts
// (ACTUALIZADO: Implementa Regla #4 de "no mostrar si ya fue candidato en el pasado")

import { useMemo } from 'react';
import { Animal, BodyWeighing } from '../db/local';
import { formatAge } from '../utils/calculations';
import { AppConfig } from '../types/config';

export type SessionTrend = 'up' | 'down' | 'stable' | 'single';
export type GdpClassification = 'Sobresaliente' | 'Promedio' | 'Pobre' | 'N/A';

export interface GdpAnalyzedAnimal extends Animal {
    formattedAge: string;
    ageInDays: number; // Edad en el momento del pesaje
    currentWeight: number;
    previousWeight: number | null;
    gdp: number | null; // g/día (calculado entre esta sesión y la anterior)
    trend: SessionTrend;
    classification: GdpClassification;
    weighingDate: string;
    isWeaningCandidate: boolean;
}

export interface GdpAnalysis {
    classifiedAnimals: GdpAnalyzedAnimal[];
    distribution: { name: 'Pobre' | 'Promedio' | 'Sobresaliente'; count: number; fill: string }[];
    gaussChartData: { name: string; count: number }[];
    meanGdp: number; // g/día
    stdDev: number; // g/día
    newAnimalIds: Set<string>;
    weaningCandidateCount: number;
}

const calculateDaysBetween = (date1: string, date2: string): number => {
    if (!date1 || date1 === 'N/A' || !date2 || date2 === 'N/A') return 0;
    const d1 = new Date(date1 + 'T00:00:00Z').getTime();
    const d2 = new Date(date2 + 'T00:00:00Z').getTime();
    return Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
};

// --- (RESTAURADO) Helper para chequear el historial de destete (Tu Regla #4) ---
const checkIfCandidateInPast = (
    animal: Animal, 
    allWeighings: BodyWeighing[], 
    currentWeighingDate: string,
    metaEdad: number,
    pesoMinimoConTolerancia: number
): boolean => {
    
    if (!animal.birthDate || animal.birthDate === 'N/A') return false;
    
    const currentDate = new Date(currentWeighingDate + 'T00:00:00Z').getTime();
    
    // 1. Obtener todos los pesajes ANTERIORES a este
    const pastWeighings = allWeighings.filter(w => 
        w.animalId === animal.id && 
        new Date(w.date + 'T00:00:00Z').getTime() < currentDate
    );

    if (pastWeighings.length === 0) return false;

    // 2. Revisar si CUALQUIERA de ellos cumplió las condiciones
    for (const pastWeighing of pastWeighings) {
        const ageAtPastWeighing = calculateDaysBetween(pastWeighing.date, animal.birthDate);
        
        const meetsMinAge = ageAtPastWeighing >= metaEdad;
        const meetsMinWeight = pastWeighing.kg >= pesoMinimoConTolerancia;

        if (meetsMinAge && meetsMinWeight) {
            // Encontró un pesaje pasado donde ya era candidato
            return true; 
        }
    }
    
    // No fue candidato en ningún pesaje anterior
    return false;
};
// --- Fin del Helper ---


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
            classifiedAnimals: [], 
            distribution: emptyDistribution, 
            gaussChartData: [], 
            meanGdp: 0, 
            stdDev: 0, 
            newAnimalIds: new Set<string>(),
            weaningCandidateCount: 0 
        };
        
        if (!weighingsForDay.length || !allAnimals.length) {
            return emptyReturn;
        }

        const animalMap = new Map(allAnimals.map(a => [a.id, a]));
        const newAnimalIds = new Set<string>();
        let weaningCandidateCount = 0; 
        
        // Definir las metas una sola vez
        const metaEdad = appConfig.diasMetaDesteteFinal; // 52
        const metaPeso = appConfig.pesoMinimoDesteteFinal; // 9.5
        const pesoMinimoConTolerancia = metaPeso - 0.1; // 9.4 Kg (Tolerancia 100g)

        // 1. Calcular GDP de la sesión y tendencia para cada animal
        const initialAnalyzedAnimals = weighingsForDay.reduce((acc: Omit<GdpAnalyzedAnimal, 'classification'>[], currentWeighing) => {
            const animal = animalMap.get(currentWeighing.animalId);
            if (!animal) return acc;

            // (Cálculo de GDP - Sin cambios)
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
            
            const ageAtWeighing = (animal.birthDate && animal.birthDate !== 'N/A') 
                ? calculateDaysBetween(currentWeighing.date, animal.birthDate) 
                : -1;
            
            // --- (LÓGICA DE DESTETE CON REGLA #4) ---
            let isWeaningCandidate = false;
            
            if (ageAtWeighing !== -1 && !animal.weaningDate) { // Regla 1
                // Paso 1: ¿Califica *Hoy*?
                const meetsMinAgeNow = ageAtWeighing >= metaEdad; // Regla 2
                const meetsMinWeightNow = currentWeighing.kg >= pesoMinimoConTolerancia; // Regla 3

                if (meetsMinAgeNow && meetsMinWeightNow) {
                    // Paso 2: Si califica hoy, ¿Calificó *Antes*?
                    const wasCandidateInPast = checkIfCandidateInPast( // Regla 4
                        animal, 
                        allWeighings, 
                        currentWeighing.date, 
                        metaEdad, 
                        pesoMinimoConTolerancia
                    );

                    // Paso 3: Decisión Final
                    if (!wasCandidateInPast) {
                        isWeaningCandidate = true;
                        weaningCandidateCount++;
                    }
                }
            }
            // --- Fin Lógica de Destete ---

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

        // 2. Calcular estadísticas
        const validAnimalsForAnalysis = initialAnalyzedAnimals.filter(a => a.gdp !== null);
        if (validAnimalsForAnalysis.length === 0) {
            const classifiedAnimals = initialAnalyzedAnimals.map(a => ({ ...a, classification: 'N/A' as const }));
            return { ...emptyReturn, classifiedAnimals, newAnimalIds, weaningCandidateCount };
        }

        const gdpValues = validAnimalsForAnalysis.map(a => a.gdp as number);
        const meanGdp = gdpValues.reduce((sum, val) => sum + val, 0) / gdpValues.length;
        const stdDev = Math.sqrt(gdpValues.reduce((sum, val) => sum + Math.pow(val - meanGdp, 2), 0) / gdpValues.length);

        // 3. Clasificar animales
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

        // 4. Crear datos de gráficos
        const distribution: GdpAnalysis['distribution'] = [
            { name: 'Pobre', count: classifiedAnimals.filter(a => a.classification === 'Pobre').length, fill: '#FF3B30' },
            { name: 'Promedio', count: classifiedAnimals.filter(a => a.classification === 'Promedio').length, fill: '#6B7280' },
            { name: 'Sobresaliente', count: classifiedAnimals.filter(a => a.classification === 'Sobresaliente').length, fill: '#34C759' },
        ];

        // Campana de Gauss
        const gaussChartData: { name: string, count: number }[] = [];
        if (gdpValues.length > 0) {
            const minGdp = Math.min(...gdpValues);
            const maxGdp = Math.max(...gdpValues);
            const step = Math.max(10, Math.ceil((maxGdp - minGdp) / 15)); 
            
            for (let i = Math.floor(minGdp / step) * step; i < maxGdp + step; i += step) {
                const rangeStart = i; 
                const rangeEnd = i + step;
                const count = classifiedAnimals.filter(a => a.gdp !== null && a.gdp >= rangeStart && a.gdp < rangeEnd).length;
                if (count > 0) { 
                    gaussChartData.push({ name: `${rangeStart}`, count }); 
                }
            }
        }

        return { 
            classifiedAnimals, 
            distribution, 
            gaussChartData, 
            meanGdp, 
            stdDev, 
            newAnimalIds, 
            weaningCandidateCount
        };

    }, [weighingsForDay, allAnimals, allWeighings, appConfig]);
};