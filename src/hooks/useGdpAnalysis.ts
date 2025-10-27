// src/hooks/useGdpAnalysis.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local';
// --- CAMBIO: Importar getAnimalZootecnicCategory ---
import { calculateAgeInDays, calculateGDP, getAnimalZootecnicCategory } from '../utils/calculations';

// Definimos la estructura de un animal analizado para GDP
export interface GdpAnalyzedAnimal extends Animal {
    gdp: number;
    ageInDays: number;
    classification: 'Sobresaliente' | 'Promedio' | 'Pobre';
}

export const useGdpAnalysis = () => {
    const { animals, bodyWeighings, parturitions } = useData();

    const analysis = useMemo(() => {
        // --- INICIO DE LA CORRECCIÓN DE LÓGICA DE FILTRADO ---
        
        // 1. Filtrar animales que están en la etapa de crecimiento relevante
        const animalsInGrowth = animals.filter(a => {
            // Filtro 1: Debe estar Activo
            if (a.status !== 'Activo') return false;
            
            // Filtro 2: NO debe ser de Referencia
            if (a.isReference) return false;
            
            // Filtro 3: NO debe estar asignado a un lote de monta
            if (a.sireLotId) return false;

            // Filtro 4: Debe estar en las categorías zootécnicas correctas
            const category = getAnimalZootecnicCategory(a, parturitions);
            return ['Cabrita', 'Cabritona', 'Cabrito', 'Macho de Levante'].includes(category);
        });
        // --- FIN DE LA CORRECCIÓN DE LÓGICA DE FILTRADO ---


        // 2. Calcular GDP para cada animal (sin cambios)
        const animalsWithGdp = animalsInGrowth.map(animal => {
            const weighings = bodyWeighings.filter(w => w.animalId === animal.id);
            const gdpData = calculateGDP(animal.birthWeight, weighings);
            return {
                ...animal,
                gdp: gdpData.overall, // gdp en kg/día
                ageInDays: calculateAgeInDays(animal.birthDate),
            };
        }).filter(a => a.gdp !== null && a.gdp > 0) as (Animal & { gdp: number, ageInDays: number })[];
        
        if (animalsWithGdp.length < 2) {
            return {
                classifiedAnimals: [],
                distribution: [],
                gaussChartData: [],
                meanGdp: 0, // media en kg/día
                stdDev: 0,
            };
        }

        // 3. Calcular estadísticas (media y desviación estándar) (sin cambios)
        const totalGdp = animalsWithGdp.reduce((sum, a) => sum + a.gdp, 0);
        const meanGdp = totalGdp / animalsWithGdp.length; // media en kg/día
        const stdDev = Math.sqrt(
            animalsWithGdp.reduce((sum, a) => sum + Math.pow(a.gdp - meanGdp, 2), 0) / animalsWithGdp.length
        );

        // 4. Clasificar animales (sin cambios)
        const POOR_THRESHOLD = meanGdp - (0.4 * stdDev);
        const EXCELLENT_THRESHOLD = meanGdp + (0.4 * stdDev);

        const classifiedAnimals: GdpAnalyzedAnimal[] = animalsWithGdp.map(animal => {
            let classification: GdpAnalyzedAnimal['classification'] = 'Promedio';
            if (stdDev > 0.005) { // Evitar clasificación si no hay varianza
                if (animal.gdp < POOR_THRESHOLD) classification = 'Pobre';
                else if (animal.gdp > EXCELLENT_THRESHOLD) classification = 'Sobresaliente';
            }
            return { 
                ...animal, 
                classification,
                gdp: animal.gdp * 1000 // Convertir a g/día para mostrar en la UI
            };
        });

        // 5. Preparar datos para los gráficos (sin cambios)
        const distribution = [
            { name: 'Pobre', count: classifiedAnimals.filter(a => a.classification === 'Pobre').length, fill: '#FF3B30' },
            { name: 'Promedio', count: classifiedAnimals.filter(a => a.classification === 'Promedio').length, fill: '#6B7280' },
            { name: 'Sobresaliente', count: classifiedAnimals.filter(a => a.classification === 'Sobresaliente').length, fill: '#34C759' },
        ];

        // Crear "bins" para la Campana de Gauss (ahora en g/día)
        const gdpValuesGDay = classifiedAnimals.map(a => a.gdp); // Ya están en g/día
        const minGdp = Math.min(...gdpValuesGDay);
        const maxGdp = Math.max(...gdpValuesGDay);
        const binCount = 10;
        const binSize = (maxGdp - minGdp) / binCount;
        
        const gaussChartData = Array.from({ length: binCount }, (_, i) => {
            const rangeStart = minGdp + i * binSize;
            const rangeEnd = rangeStart + binSize;
            const count = classifiedAnimals.filter(a => a.gdp >= rangeStart && a.gdp < rangeEnd).length;
            return {
                name: `${rangeStart.toFixed(0)}`, // g/día
                count,
            };
        });

        return {
            classifiedAnimals: classifiedAnimals.sort((a, b) => b.gdp - a.gdp), // Ordenado por g/día
            distribution,
            gaussChartData,
            meanGdp: meanGdp, // Retornar media en kg/día (para cálculos)
            stdDev: stdDev, // Retornar stdDev en kg/día (para cálculos)
        };

    }, [animals, bodyWeighings, parturitions]);

    return analysis;
};