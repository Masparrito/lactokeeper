// src/hooks/useGdpAnalysis.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local';
import { calculateAgeInDays, calculateGDP } from '../utils/calculations';

// Definimos la estructura de un animal analizado para GDP
export interface GdpAnalyzedAnimal extends Animal {
    gdp: number;
    ageInDays: number;
    classification: 'Sobresaliente' | 'Promedio' | 'Pobre';
}

export const useGdpAnalysis = () => {
    const { animals, bodyWeighings, parturitions } = useData();

    const analysis = useMemo(() => {
        // 1. Filtrar animales en etapa de crecimiento
        const animalsInGrowth = animals.filter(a => {
            const age = calculateAgeInDays(a.birthDate);
            // Consideramos animales en crecimiento hasta los 12 meses (aprox 365 días)
            return age > 0 && age <= 365 && !a.isReference;
        });

        // 2. Calcular GDP para cada animal
        const animalsWithGdp = animalsInGrowth.map(animal => {
            const weighings = bodyWeighings.filter(w => w.animalId === animal.id);
            const gdpData = calculateGDP(animal.birthWeight, weighings);
            return {
                ...animal,
                gdp: gdpData.overall,
                ageInDays: calculateAgeInDays(animal.birthDate),
            };
        }).filter(a => a.gdp !== null && a.gdp > 0) as (Animal & { gdp: number, ageInDays: number })[];
        
        if (animalsWithGdp.length < 2) {
            return {
                classifiedAnimals: [],
                distribution: [],
                gaussChartData: [],
                meanGdp: 0,
                stdDev: 0,
            };
        }

        // 3. Calcular estadísticas (media y desviación estándar)
        const totalGdp = animalsWithGdp.reduce((sum, a) => sum + a.gdp, 0);
        const meanGdp = totalGdp / animalsWithGdp.length;
        const stdDev = Math.sqrt(
            animalsWithGdp.reduce((sum, a) => sum + Math.pow(a.gdp - meanGdp, 2), 0) / animalsWithGdp.length
        );

        // 4. Clasificar animales
        const POOR_THRESHOLD = meanGdp - (0.4 * stdDev);
        const EXCELLENT_THRESHOLD = meanGdp + (0.4 * stdDev);

        const classifiedAnimals: GdpAnalyzedAnimal[] = animalsWithGdp.map(animal => {
            let classification: GdpAnalyzedAnimal['classification'] = 'Promedio';
            if (stdDev > 0.005) { // Evitar clasificación si no hay varianza
                if (animal.gdp < POOR_THRESHOLD) classification = 'Pobre';
                else if (animal.gdp > EXCELLENT_THRESHOLD) classification = 'Sobresaliente';
            }
            return { ...animal, classification };
        });

        // 5. Preparar datos para los gráficos
        const distribution = [
            { name: 'Pobre', count: classifiedAnimals.filter(a => a.classification === 'Pobre').length, fill: '#FF3B30' },
            { name: 'Promedio', count: classifiedAnimals.filter(a => a.classification === 'Promedio').length, fill: '#6B7280' },
            { name: 'Sobresaliente', count: classifiedAnimals.filter(a => a.classification === 'Sobresaliente').length, fill: '#34C759' },
        ];

        // Crear "bins" para la Campana de Gauss
        const gdpValues = classifiedAnimals.map(a => a.gdp);
        const minGdp = Math.min(...gdpValues);
        const maxGdp = Math.max(...gdpValues);
        const binCount = 10;
        const binSize = (maxGdp - minGdp) / binCount;
        
        const gaussChartData = Array.from({ length: binCount }, (_, i) => {
            const rangeStart = minGdp + i * binSize;
            const rangeEnd = rangeStart + binSize;
            const count = classifiedAnimals.filter(a => a.gdp >= rangeStart && a.gdp < rangeEnd).length;
            return {
                name: `${(rangeStart * 1000).toFixed(0)}`, // g/día
                count,
            };
        });

        return {
            classifiedAnimals: classifiedAnimals.sort((a, b) => b.gdp - a.gdp),
            distribution,
            gaussChartData,
            meanGdp,
            stdDev,
        };

    }, [animals, bodyWeighings, parturitions]);

    return analysis;
};