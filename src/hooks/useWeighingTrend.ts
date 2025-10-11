// src/hooks/useWeighingTrend.ts

// --- LÍNEA CORREGIDA: Se eliminan useState y useEffect que ya no se utilizan ---
import { useMemo } from 'react';
import { Weighing } from '../db/local';

export type Trend = 'up' | 'down' | 'stable' | 'single' | null;

/**
 * Hook para calcular la tendencia de producción de un animal basándose en sus dos últimos pesajes registrados.
 * @param animalId El ID del animal a analizar.
 * @param allWeighings Un array con todos los pesajes de la base de datos.
 * @returns Un objeto con la tendencia ('up', 'down', 'stable'), la diferencia en Kg, si es una tendencia sostenida, y los dos últimos pesajes.
 */
export const useWeighingTrend = (animalId: string, allWeighings: Weighing[]) => {
    // Usamos useMemo para evitar recalcular esto en cada render, solo cuando los datos cambien.
    const trendAnalysis = useMemo(() => {
        if (!animalId || !allWeighings) {
            return { trend: null, difference: 0, isLongTrend: false, lastTwoWeighings: [] };
        }

        const animalWeighings = allWeighings
            .filter(w => w.goatId === animalId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (animalWeighings.length < 1) {
            return { trend: null, difference: 0, isLongTrend: false, lastTwoWeighings: [] };
        }
        
        if (animalWeighings.length === 1) {
            return { trend: 'single' as Trend, difference: 0, isLongTrend: false, lastTwoWeighings: [animalWeighings[0]] };
        }

        const latest = animalWeighings[0];
        const previous = animalWeighings[1];
        const diff = latest.kg - previous.kg;
        const margin = 0.15; // Margen de 150g para considerar un cambio estable.

        let currentTrend: Trend;
        if (diff > margin) {
            currentTrend = 'up';
        } else if (diff < -margin) {
            currentTrend = 'down';
        } else {
            currentTrend = 'stable';
        }
        
        let isLongTrend = false;
        if (animalWeighings.length >= 3) {
            const third = animalWeighings[2];
            const previousDiff = previous.kg - third.kg;
            
            // Comprueba si la tendencia ha sido consistente en los últimos 3 pesajes.
            const isConsistentUp = diff > margin && previousDiff > margin;
            const isConsistentDown = diff < -margin && previousDiff < -margin;

            if (isConsistentUp || isConsistentDown) {
                isLongTrend = true;
            }
        }

        return {
            trend: currentTrend,
            difference: diff,
            isLongTrend,
            lastTwoWeighings: [latest, previous]
        };

    }, [animalId, allWeighings]);

    return trendAnalysis;
};