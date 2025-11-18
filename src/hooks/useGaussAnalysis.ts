// src/hooks/useGaussAnalysis.ts

import { useMemo } from 'react';
import { Animal, Parturition, Weighing } from '../db/local';
import { calculateDEL, calculateWeightedScore } from '../utils/calculations';
import { Trend } from './useWeighingTrend';

export interface AnalyzedAnimal extends Animal {
    latestWeighing: number;
    del: number;
    score: number;
    // --- CORRECCIÓN: 'N/A' añadido para animales sin parto ---
    classification: 'Sobresaliente' | 'Promedio' | 'Pobre' | 'N/A';
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

            // --- ****************************************** ---
            // --- *** INICIO DE LA SECCIÓN CORREGIDA *** ---
            // --- ****************************************** ---

            // Se busca el parto ACTIVO más reciente anterior a la fecha del pesaje.
            // Esto incluye partos normales Y abortos con inducción ('status: activa').
            // Excluye partos secos, finalizados o abortos sin inducción.
            const parturitionForWeighing = allParturitions
                .filter(p => 
                    p.goatId === animal.id && 
                    (p.status === 'activa' || p.status === 'en-secado') && // <-- ¡ESTE ES EL FILTRO CLAVE!
                    new Date(p.parturitionDate) <= new Date(currentWeighing.date)
                )
                .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];

            // --- ****************************************** ---
            // --- *** FIN DE LA SECCIÓN CORREGIDA *** ---
            // --- ****************************************** ---

            // Asignamos valores por defecto si no hay parto (animal "huérfano").
            // Esto permite que el animal "huérfano" aparezca en la lista para ser filtrado.
            const del = parturitionForWeighing 
                ? calculateDEL(parturitionForWeighing.parturitionDate, currentWeighing.date)
                : 0; // Los huérfanos tienen DEL 0

            const score = (isWeighted && parturitionForWeighing) // Solo ponderar si hay parto
                ? calculateWeightedScore(currentWeighing.kg, del)
                : currentWeighing.kg; // Los huérfanos usan su peso real como score
            
            // --- LÓGICA DE TENDENCIA (Sin cambios) ---
            const animalHistory = allWeighings
                .filter(w => w.goatId === animal.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            let trend: Trend = 'single';
            const currentIndexInHistory = animalHistory.findIndex(w => w.date === currentWeighing.date);

            if (currentIndexInHistory !== -1 && currentIndexInHistory + 1 < animalHistory.length) {
                const previousWeighing = animalHistory[currentIndexInHistory + 1];
                const diff = currentWeighing.kg - previousWeighing.kg;
                const margin = 0.15; // 150g de margen
                if (diff > margin) trend = 'up';
                else if (diff < -margin) trend = 'down';
                else trend = 'stable';
            }
            
            acc.push({ ...animal, latestWeighing: currentWeighing.kg, weighingId: currentWeighing.id, del, score, trend, date: currentWeighing.date });
            return acc;
        }, []);

        if (!initialAnalyzedAnimals.length) {
             return { classifiedAnimals: [], distribution: [], mean: 0, stdDev: 0, weightedMean: 0 };
        }

        // --- LÓGICA DE ANÁLISIS (Sin cambios, ya es correcta) ---
        // El análisis de Gauss (media, stdDev) SÓLO debe correr sobre animales válidos (con DEL).
        // Los "huérfanos" (del: 0) no deben distorsionar la campana.
        const validAnimalsForAnalysis = initialAnalyzedAnimals.filter(a => a.del > 0);

        const scoreToAnalyzeKey = isWeighted ? 'score' : 'latestWeighing';
        
        // Calcular la media y stdDev SOLO de los animales válidos
        const analysisMean = validAnimalsForAnalysis.length > 0
            ? validAnimalsForAnalysis.reduce((sum, a) => sum + a[scoreToAnalyzeKey], 0) / validAnimalsForAnalysis.length
            : 0;
            
        const stdDev = validAnimalsForAnalysis.length > 0
            ? Math.sqrt(validAnimalsForAnalysis.reduce((sum, a) => sum + Math.pow(a[scoreToAnalyzeKey] - analysisMean, 2), 0) / validAnimalsForAnalysis.length)
            : 0;

        const POOR_THRESHOLD = analysisMean - (0.4 * stdDev);
        const EXCELLENT_THRESHOLD = analysisMean + (0.4 * stdDev);
        
        const classifiedAnimals: AnalyzedAnimal[] = initialAnalyzedAnimals.map(animal => {
            // Asignar 'N/A' a los huérfanos
            if (animal.del === 0) {
                return { ...animal, classification: 'N/A' };
            }

            const scoreToClassify = animal[scoreToAnalyzeKey];
            let classification: AnalyzedAnimal['classification'] = 'Promedio';
            
            if (stdDev > 0.1) {
                if (scoreToClassify < POOR_THRESHOLD) classification = 'Pobre';
                else if (scoreToClassify > EXCELLENT_THRESHOLD) classification = 'Sobresaliente';
            }
            
            return { ...animal, classification };
        });

        const distribution = [
            { name: 'Pobre', count: classifiedAnimals.filter(a => a.classification === 'Pobre').length, fill: '#FF3B30' },
            { name: 'Promedio', count: classifiedAnimals.filter(a => a.classification === 'Promedio').length, fill: '#6B7280' },
            { name: 'Sobresaliente', count: classifiedAnimals.filter(a => a.classification === 'Sobresaliente').length, fill: '#34C759' },
        ];
        
        // Las medias de la página de análisis deben reflejar SÓLO los animales válidos.
        const mean = validAnimalsForAnalysis.length > 0 ? validAnimalsForAnalysis.reduce((sum, a) => sum + a.latestWeighing, 0) / validAnimalsForAnalysis.length : 0;
        const weightedMean = validAnimalsForAnalysis.length > 0 ? validAnimalsForAnalysis.reduce((sum, a) => sum + a.score, 0) / validAnimalsForAnalysis.length : 0;

        // Devolvemos TODOS los animales clasificados (incluyendo los 'N/A')
        return { classifiedAnimals, distribution, mean, stdDev, weightedMean };
    }, [weighingsForDay, allAnimals, allWeighings, allParturitions, isWeighted]);
};