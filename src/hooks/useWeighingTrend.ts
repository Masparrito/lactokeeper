// src/hooks/useWeighingTrend.ts

import { useState, useEffect } from 'react';
import { db } from '../db/local';

export type Trend = 'up' | 'down' | 'stable' | 'single' | null;

// El hook ahora recibe todos los pesajes para ser más eficiente
export const useWeighingTrend = (animalId: string, allWeighings: any[]) => {
    const [trend, setTrend] = useState<Trend>(null);
    const [difference, setDifference] = useState<number>(0);
    const [isLongTrend, setIsLongTrend] = useState(false);
    const [lastTwoWeighings, setLastTwoWeighings] = useState<any[]>([]);

    useEffect(() => {
        const animalWeighings = allWeighings
            .filter(w => w.goatId === animalId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (animalWeighings.length < 2) {
            setTrend(animalWeighings.length === 1 ? 'single' : null);
            setLastTwoWeighings(animalWeighings);
            return;
        }

        const latest = animalWeighings[0].kg;
        const previous = animalWeighings[1].kg;
        const diff = latest - previous;
        const margin = 0.15; // El margen de 150g

        setDifference(diff);
        setLastTwoWeighings([animalWeighings[0], animalWeighings[1]]);

        let currentTrend: Trend = 'stable';
        if (diff > margin) currentTrend = 'up';
        if (diff < -margin) currentTrend = 'down';
        setTrend(currentTrend);

        if (animalWeighings.length >= 3) {
            const third = animalWeighings[2].kg;
            const previousDiff = previous - third;
            
            if ((diff > margin && previousDiff > margin) || (diff < -margin && previousDiff < -margin)) {
                setIsLongTrend(true);
            } else {
                setIsLongTrend(false);
            }
        } else {
            setIsLongTrend(false);
        }
    }, [animalId, allWeighings]);

    return { trend, difference, isLongTrend, lastTwoWeighings };
};