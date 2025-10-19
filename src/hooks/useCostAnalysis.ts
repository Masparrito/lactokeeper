import { useMemo } from 'react';
import { useData } from '../context/DataContext';

export const useCostAnalysis = () => {
    const { healthEvents, products, animals } = useData();

    // Memoiza todos los cálculos para evitar recálculos innecesarios
    const analysis = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const recentEvents = healthEvents.filter(event => new Date(event.date) >= thirtyDaysAgo);

        // 1. Costo total en los últimos 30 días
        const totalCostLast30Days = recentEvents.reduce((acc, event) => acc + (event.calculatedCost || 0), 0);

        // 2. Costo promedio por animal activo
        const activeAnimalCount = animals.filter(a => a.status === 'Activo').length;
        const avgCostPerAnimal = activeAnimalCount > 0 ? totalCostLast30Days / activeAnimalCount : 0;
        
        // 3. Costos agrupados por mes (últimos 6 meses)
        const monthlyCosts: { name: string; total: number }[] = [];
        const monthMap: { [key: string]: number } = {};
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        healthEvents
            .filter(event => new Date(event.date) >= sixMonthsAgo)
            .forEach(event => {
                const monthKey = event.date.substring(0, 7); // "YYYY-MM"
                if (!monthMap[monthKey]) {
                    monthMap[monthKey] = 0;
                }
                monthMap[monthKey] += event.calculatedCost || 0;
            });
        
        Object.keys(monthMap).sort().forEach(key => {
            monthlyCosts.push({ name: key, total: parseFloat(monthMap[key].toFixed(2)) });
        });

        // 4. Costos agrupados por categoría/tipo de actividad
        const categoryMap: { [key: string]: number } = {};
        healthEvents.forEach(event => {
            const category = event.type || 'Sin Categoría';
            if (!categoryMap[category]) {
                categoryMap[category] = 0;
            }
            categoryMap[category] += event.calculatedCost || 0;
        });

        const costsByCategory = Object.keys(categoryMap).map(key => ({
            name: key,
            total: parseFloat(categoryMap[key].toFixed(2)),
        })).sort((a, b) => b.total - a.total);

        // 5. Top 5 animales con mayor costo
        const animalCostMap: { [key: string]: number } = {};
        healthEvents.forEach(event => {
            if (!animalCostMap[event.animalId]) {
                animalCostMap[event.animalId] = 0;
            }
            animalCostMap[event.animalId] += event.calculatedCost || 0;
        });
        
        const topCostAnimals = Object.keys(animalCostMap).map(animalId => ({
            animalId,
            total: animalCostMap[animalId],
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

        return {
            totalCostLast30Days,
            avgCostPerAnimal,
            monthlyCosts,
            costsByCategory,
            topCostAnimals
        };

    }, [healthEvents, products, animals]);

    return analysis;
};