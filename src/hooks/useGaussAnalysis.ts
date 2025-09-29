// src/hooks/useGaussAnalysis.ts

import { useMemo } from 'react';
import { Animal, Parturition, Weighing } from '../db/local';
import { calculateDEL, calculateWeightedScore } from '../utils/calculations';
import { Trend } from './useWeighingTrend';

export interface AnalyzedAnimal extends Animal {
    latestWeighing: number;
    del: number;
    score: number;
    classification: 'Sobresaliente' | 'Promedio' | 'Pobre';
    trend: Trend;
}

export const useGaussAnalysis = (
    milkingAnimals: Animal[], 
    allWeighings: Weighing[], 
    activeParturitions: Parturition[],
    isWeighted: boolean
) => {
    return useMemo(() => {
        if (!milkingAnimals.length || !allWeighings.length) {
            return { classifiedAnimals: [], distribution: [], mean: 0, stdDev: 0, weightedMean: 0 };
        }

        // CORRECCIÓN 1: Se define el tipo del array intermedio para guiar a TypeScript
        const analyzedAnimals: Omit<AnalyzedAnimal, 'classification'>[] = milkingAnimals.map(animal => {
            const history = allWeighings
                .filter(w => w.goatId === animal.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const latestWeighing = history[0];
            const parturition = activeParturitions.find(p => p.goatId === animal.id);

            if (!latestWeighing || !parturition) {
                return { ...animal, latestWeighing: 0, del: 0, score: 0, trend: null };
            }

            const del = calculateDEL(parturition.parturitionDate, latestWeighing.date);
            const score = isWeighted 
                ? calculateWeightedScore(latestWeighing.kg, del) 
                : latestWeighing.kg;

            let trend: Trend = 'single';
            const margin = 0.15;
            if (history.length >= 2) {
                const diff = history[0].kg - history[1].kg;
                if (diff > margin) trend = 'up';
                else if (diff < -margin) trend = 'down';
                else trend = 'stable';
            }
            
            return { ...animal, latestWeighing: latestWeighing.kg, del, score, trend };
        }).filter((animal): animal is Omit<AnalyzedAnimal, 'classification'> => animal !== null);

        if (!analyzedAnimals.length) {
             return { classifiedAnimals: [], distribution: [], mean: 0, stdDev: 0, weightedMean: 0 };
        }

        const mean = analyzedAnimals.reduce((sum, a) => sum + a.latestWeighing, 0) / analyzedAnimals.length;
        const weightedMean = analyzedAnimals.reduce((sum, a) => sum + a.score, 0) / analyzedAnimals.length;
        
        const scoreToAnalyzeKey = isWeighted ? 'score' : 'latestWeighing';
        const analysisMean = analyzedAnimals.reduce((sum, a) => sum + a[scoreToAnalyzeKey], 0) / analyzedAnimals.length;
        const stdDev = Math.sqrt(analyzedAnimals.reduce((sum, a) => sum + Math.pow(a[scoreToAnalyzeKey] - analysisMean, 2), 0) / analyzedAnimals.length);

        const POOR_THRESHOLD = analysisMean - (0.4 * stdDev);
        const EXCELLENT_THRESHOLD = analysisMean + (0.4 * stdDev);
        
        // CORRECCIÓN 2: Se construye el objeto final 'classifiedAnimals' con el tipo correcto
        const classifiedAnimals: AnalyzedAnimal[] = analyzedAnimals.map(animal => {
            const scoreToClassify = animal[scoreToAnalyzeKey];
            let classification: AnalyzedAnimal['classification'] = 'Promedio';
            
            if (scoreToClassify < POOR_THRESHOLD) classification = 'Pobre';
            else if (scoreToClassify > EXCELLENT_THRESHOLD) classification = 'Sobresaliente';
            
            return { ...animal, classification };
        });

        const distribution = [
            { name: 'Pobre', count: classifiedAnimals.filter(a => a.classification === 'Pobre').length, fill: '#EF4444' },
            { name: 'Promedio', count: classifiedAnimals.filter(a => a.classification === 'Promedio').length, fill: '#6B7280' },
            { name: 'Sobresaliente', count: classifiedAnimals.filter(a => a.classification === 'Sobresaliente').length, fill: '#22C55E' },
        ];
        
        return { classifiedAnimals, distribution, mean, stdDev, weightedMean };
    }, [milkingAnimals, allWeighings, activeParturitions, isWeighted]);
};