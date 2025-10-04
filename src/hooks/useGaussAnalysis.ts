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
    weighingId?: string;
    date: string;
}

export const useGaussAnalysis = (
    weighingsForDay: Weighing[], 
    allAnimals: Animal[],
    allWeighings: Weighing[],
    allParturitions: Parturition[], 
    isWeighted: boolean
) => {
    return useMemo(() => {
        if (!weighingsForDay.length || !allAnimals.length) {
            return { classifiedAnimals: [], distribution: [], mean: 0, stdDev: 0, weightedMean: 0 };
        }

        const initialAnalyzedAnimals = weighingsForDay.reduce((acc: Omit<AnalyzedAnimal, 'classification'>[], currentWeighing) => {
            const animal = allAnimals.find(a => a.id === currentWeighing.goatId);
            if (!animal) return acc;

            const parturitionForWeighing = allParturitions
                .filter(p => p.goatId === animal.id && new Date(p.parturitionDate) <= new Date(currentWeighing.date))
                .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];

            if (!parturitionForWeighing) return acc;

            const animalHistory = allWeighings.filter(w => w.goatId === animal.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            
            const del = calculateDEL(parturitionForWeighing.parturitionDate, currentWeighing.date);
            const score = isWeighted ? calculateWeightedScore(currentWeighing.kg, del) : currentWeighing.kg;

            let trend: Trend = 'single';
            const margin = 0.15;
            const currentIndexInHistory = animalHistory.findIndex(w => w.id === currentWeighing.id);

            if (currentIndexInHistory > 0) {
                const previousWeighing = animalHistory[currentIndexInHistory - 1];
                const diff = currentWeighing.kg - previousWeighing.kg;
                if (diff > margin) trend = 'up'; else if (diff < -margin) trend = 'down'; else trend = 'stable';
            }
            
            acc.push({ ...animal, latestWeighing: currentWeighing.kg, weighingId: currentWeighing.id, del, score, trend, date: currentWeighing.date });
            return acc;
        }, []);

        if (!initialAnalyzedAnimals.length) {
             return { classifiedAnimals: [], distribution: [], mean: 0, stdDev: 0, weightedMean: 0 };
        }

        const scoreToAnalyzeKey = isWeighted ? 'score' : 'latestWeighing';
        const analysisMean = initialAnalyzedAnimals.reduce((sum, a) => sum + a[scoreToAnalyzeKey], 0) / initialAnalyzedAnimals.length;
        const stdDev = Math.sqrt(initialAnalyzedAnimals.reduce((sum, a) => sum + Math.pow(a[scoreToAnalyzeKey] - analysisMean, 2), 0) / initialAnalyzedAnimals.length);

        const POOR_THRESHOLD = analysisMean - (0.4 * stdDev);
        const EXCELLENT_THRESHOLD = analysisMean + (0.4 * stdDev);
        
        const classifiedAnimals: AnalyzedAnimal[] = initialAnalyzedAnimals.map(animal => {
            const scoreToClassify = animal[scoreToAnalyzeKey];
            let classification: AnalyzedAnimal['classification'] = 'Promedio';
            
            if (stdDev > 0.1) {
                if (scoreToClassify < POOR_THRESHOLD) classification = 'Pobre';
                else if (scoreToClassify > EXCELLENT_THRESHOLD) classification = 'Sobresaliente';
            }
            
            return { ...animal, classification };
        });

        const distribution = [
            { name: 'Pobre', count: classifiedAnimals.filter(a => a.classification === 'Pobre').length, fill: '#FF3B30' }, // brand-red
            { name: 'Promedio', count: classifiedAnimals.filter(a => a.classification === 'Promedio').length, fill: '#6B7280' },
            { name: 'Sobresaliente', count: classifiedAnimals.filter(a => a.classification === 'Sobresaliente').length, fill: '#34C759' }, // brand-green
        ];
        
        const mean = initialAnalyzedAnimals.length > 0 ? initialAnalyzedAnimals.reduce((sum, a) => sum + a.latestWeighing, 0) / initialAnalyzedAnimals.length : 0;
        const weightedMean = initialAnalyzedAnimals.length > 0 ? initialAnalyzedAnimals.reduce((sum, a) => sum + a.score, 0) / initialAnalyzedAnimals.length : 0;

        return { classifiedAnimals, distribution, mean, stdDev, weightedMean };
    }, [weighingsForDay, allAnimals, allWeighings, allParturitions, isWeighted]);
};