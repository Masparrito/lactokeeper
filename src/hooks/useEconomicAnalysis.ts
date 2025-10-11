// src/hooks/useEconomicAnalysis.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';

// --- CONFIGURACIÓN INICIAL ---
// TODO: Mover esto a una configuración de la app en el futuro.
const PRICE_PER_KG_MILK = 0.50; // Precio de venta por Kg de leche en USD

export interface AnimalProfitability {
    animalId: string;
    totalRevenue: number;
    totalCosts: number;
    netProfit: number;
    costPerLiter: number | null;
    totalKgProduced: number;
    lactationDays: number;
}

export const useEconomicAnalysis = () => {
    const { animals, healthEvents, weighings, parturitions } = useData();

    const analysis = useMemo(() => {
        const activeAnimals = animals.filter(a => a.status === 'Activo' && a.sex === 'Hembra');
        
        const profitabilityData: AnimalProfitability[] = activeAnimals.map(animal => {
            // 1. Calcular Costos Totales por Animal
            const totalCosts = healthEvents
                .filter(e => e.animalId === animal.id)
                .reduce((sum, event) => sum + event.calculatedCost, 0);

            // 2. Calcular Ingresos Totales por Leche y Datos de Lactancia
            const animalWeighings = weighings.filter(w => w.goatId === animal.id);
            const totalKgProduced = animalWeighings.reduce((sum, w) => sum + w.kg, 0);
            const totalRevenue = totalKgProduced * PRICE_PER_KG_MILK;

            // 3. Calcular Costo por Litro
            let costPerLiter: number | null = null;
            let lactationDays = 0;
            const animalParturitions = parturitions.filter(p => p.goatId === animal.id);

            if (totalKgProduced > 0 && animalParturitions.length > 0) {
                // Sumar los días de todas las lactancias registradas
                lactationDays = animalParturitions.reduce((totalDays, p) => {
                    const lactWeighings = animalWeighings.filter(w => new Date(w.date) >= new Date(p.parturitionDate));
                    if (lactWeighings.length === 0) return totalDays;

                    const firstDay = new Date(p.parturitionDate);
                    const lastDay = new Date(lactWeighings.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date);
                    const days = (lastDay.getTime() - firstDay.getTime()) / (1000 * 60 * 60 * 24);
                    return totalDays + days;
                }, 0);

                // Asumimos que los costos son por la vida del animal hasta la fecha.
                // Podríamos refinar esto para costos durante la lactancia.
                const totalCostDuringLactation = totalCosts; // Simplificación para V1
                costPerLiter = totalCostDuringLactation / totalKgProduced;
            }

            // 4. Calcular Rentabilidad Neta
            const netProfit = totalRevenue - totalCosts;

            return {
                animalId: animal.id,
                totalRevenue,
                totalCosts,
                netProfit,
                costPerLiter,
                totalKgProduced,
                lactationDays
            };
        });

        // Ordenar por la más rentable
        const sortedByProfit = [...profitabilityData].sort((a, b) => b.netProfit - a.netProfit);

        // Calcular Totales y Promedios de la Finca
        const totalFarmRevenue = sortedByProfit.reduce((sum, a) => sum + a.totalRevenue, 0);
        const totalFarmCosts = sortedByProfit.reduce((sum, a) => sum + a.totalCosts, 0);
        const totalFarmNetProfit = totalFarmRevenue - totalFarmCosts;
        
        const validCostsPerLiter = sortedByProfit.filter(a => a.costPerLiter !== null && a.costPerLiter > 0).map(a => a.costPerLiter as number);
        const averageCostPerLiter = validCostsPerLiter.length > 0 
            ? validCostsPerLiter.reduce((sum, val) => sum + val, 0) / validCostsPerLiter.length
            : 0;

        return {
            animalsByProfitability: sortedByProfit,
            totalFarmRevenue,
            totalFarmCosts,
            totalFarmNetProfit,
            averageCostPerLiter,
            assumedMilkPrice: PRICE_PER_KG_MILK,
        };

    }, [animals, healthEvents, weighings, parturitions]);

    return analysis;
};