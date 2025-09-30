// src/hooks/useHistoricalAnalysis.ts

import { useMemo } from 'react';
import { Weighing } from '../db/local';

export interface PeriodStats {
    periodLabel: string;
    periodId: string;
    totalKg: number;
    averageKg: number;
    weighingCount: number;
    animalCount: number;
    weighingEvents: number;
    weighings: Weighing[];
    avgKgChange?: number;
    animalCountChange?: number;
    newAnimalsWeighings: Weighing[];
    previousAnimalCount?: number;
    exitingAnimalCount?: number; // <-- NUEVO
}

export const useHistoricalAnalysis = (weighings: Weighing[]) => {
    const historicalData = useMemo(() => {
        if (weighings.length === 0) {
            return { monthlyData: [] };
        }

        const monthlyGroups = weighings.reduce((acc, weighing) => {
            const monthKey = weighing.date.substring(0, 7);
            if (!acc[monthKey]) acc[monthKey] = [];
            acc[monthKey].push(weighing);
            return acc;
        }, {} as Record<string, Weighing[]>);

        let monthlyData: PeriodStats[] = Object.entries(monthlyGroups).map(([monthId, group]) => {
            const date = new Date(`${monthId}-02T12:00:00Z`);
            const monthName = date.toLocaleString('es-VE', { month: 'long', timeZone: 'UTC' });
            const year = date.getUTCFullYear();
            const weighingCount = group.length;
            const totalKg = group.reduce((sum, w) => sum + w.kg, 0);

            return {
                periodLabel: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
                periodId: monthId,
                totalKg,
                averageKg: weighingCount > 0 ? totalKg / weighingCount : 0,
                weighingCount,
                animalCount: new Set(group.map(w => w.goatId)).size,
                weighingEvents: new Set(group.map(w => w.date)).size,
                weighings: group,
                newAnimalsWeighings: [],
            };
        }).sort((a, b) => b.periodId.localeCompare(a.periodId));

        monthlyData = monthlyData.map((month, index, arr) => {
            const previousMonth = arr[index + 1];
            if (previousMonth) {
                const avgKgChange = previousMonth.averageKg ? ((month.averageKg - previousMonth.averageKg) / previousMonth.averageKg) * 100 : undefined;
                const animalCountChange = previousMonth.animalCount ? ((month.animalCount - previousMonth.animalCount) / previousMonth.animalCount) * 100 : undefined;

                const previousMonthAnimalIds = new Set(previousMonth.weighings.map(w => w.goatId));
                const currentMonthAnimalIds = new Set(month.weighings.map(w => w.goatId));
                
                const newAnimalIds = new Set([...currentMonthAnimalIds].filter(id => !previousMonthAnimalIds.has(id)));
                const newAnimalsWeighings = month.weighings.filter(w => newAnimalIds.has(w.goatId));
                
                // --- NUEVO CÁLCULO: Animales que salieron ---
                const exitingAnimalCount = [...previousMonthAnimalIds].filter(id => !currentMonthAnimalIds.has(id)).length;

                return { ...month, avgKgChange, animalCountChange, newAnimalsWeighings, previousAnimalCount: previousMonth.animalCount, exitingAnimalCount };
            }
            return { ...month, newAnimalsWeighings: month.weighings, previousAnimalCount: 0, exitingAnimalCount: 0 };
        });
        
        return { monthlyData, quarterlyData: [], yearlyData: [] };
    }, [weighings]);

    return historicalData;
};