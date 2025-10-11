// src/hooks/useCostAnalysis.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';

export const useCostAnalysis = () => {
    const { healthEvents, animals } = useData();

    const analysis = useMemo(() => {
        if (healthEvents.length === 0) {
            return {
                totalCostLast30Days: 0,
                avgCostPerAnimal: 0,
                monthlyCosts: [],
                costsByCategory: [],
                topCostAnimals: [],
            };
        }

        const today = new Date();
        const thirtyDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30);

        // 1. Calcular costos en los últimos 30 días
        const recentEvents = healthEvents.filter(event => new Date(event.date) >= thirtyDaysAgo);
        const totalCostLast30Days = recentEvents.reduce((sum, event) => sum + event.calculatedCost, 0);

        // 2. Calcular costo promedio por animal (histórico)
        const activeAnimalCount = animals.filter(a => a.status === 'Activo').length;
        const totalHistoricalCost = healthEvents.reduce((sum, event) => sum + event.calculatedCost, 0);
        const avgCostPerAnimal = activeAnimalCount > 0 ? totalHistoricalCost / activeAnimalCount : 0;

        // 3. Agrupar costos por mes
        const monthlyGroups = healthEvents.reduce((acc, event) => {
            const monthKey = event.date.substring(0, 7); // "YYYY-MM"
            if (!acc[monthKey]) {
                acc[monthKey] = 0;
            }
            acc[monthKey] += event.calculatedCost;
            return acc;
        }, {} as Record<string, number>);

        const monthlyCosts = Object.entries(monthlyGroups).map(([month, total]) => ({
            name: month, // Formatearemos esto en el gráfico
            total,
        })).sort((a, b) => a.name.localeCompare(b.name));

        // 4. Agrupar costos por categoría de tratamiento
        const categoryGroups = healthEvents.reduce((acc, event) => {
            const type = event.type;
            if (!acc[type]) {
                acc[type] = 0;
            }
            acc[type] += event.calculatedCost;
            return acc;
        }, {} as Record<string, number>);

        const costsByCategory = Object.entries(categoryGroups).map(([name, total]) => ({
            name,
            total,
        })).sort((a, b) => b.total - a.total);

        // 5. Encontrar los 5 animales con mayor costo
        const animalCostGroups = healthEvents.reduce((acc, event) => {
            const id = event.animalId;
            if (!acc[id]) {
                acc[id] = 0;
            }
            acc[id] += event.calculatedCost;
            return acc;
        }, {} as Record<string, number>);

        const topCostAnimals = Object.entries(animalCostGroups)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([animalId, total]) => ({
                animalId,
                total,
            }));

        return {
            totalCostLast30Days,
            avgCostPerAnimal,
            monthlyCosts,
            costsByCategory,
            topCostAnimals,
        };

    }, [healthEvents, animals]);

    return analysis;
};