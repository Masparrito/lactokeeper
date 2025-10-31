import { useMemo } from 'react';
import { MonthlyEvolutionStep } from './useHerdEvolution'; // CORREGIDO: Importar la interfaz correcta

/**
 * Representa un punto de datos en el gráfico de flujo de caja quincenal.
 */
export interface CashFlowDataPoint {
    name: string; // Ej: "Y1M1-Q1" (Año 1, Mes 1, Quincena 1)
    ingresoLeche: number;
}

/**
 * Hook para calcular el flujo de caja quincenal basado en la producción de leche MENSUAL.
 * @param monthlyProjectionData Los resultados mensuales del hook useHerdEvolution.
 */
export const useMilkCashFlow = (monthlyProjectionData: MonthlyEvolutionStep[]): { cashFlow: CashFlowDataPoint[] } => { // CORREGIDO: Usar el tipo correcto

    const cashFlow = useMemo<CashFlowDataPoint[]>(() => {
        const cashFlowData: CashFlowDataPoint[] = [];

        monthlyProjectionData.forEach(monthData => {
            // Ingreso total de leche en el mes
            const ingresoLecheMensual = monthData.ingresosLeche; // CORREGIDO: Usar la propiedad 'ingresosLeche'

            // Distribuir ese ingreso en 2 pagos quincenales
            const ingresoQuincenal = ingresoLecheMensual / 2;

            // Añadir las dos quincenas del mes
            cashFlowData.push({
                name: `Y${monthData.year}M${monthData.month}-Q1`, // CORREGIDO: Usar 'month' en lugar de 'monthInYear'
                ingresoLeche: parseFloat(ingresoQuincenal.toFixed(2)),
            });
            cashFlowData.push({
                name: `Y${monthData.year}M${monthData.month}-Q2`, // CORREGIDO: Usar 'month' en lugar de 'monthInYear'
                ingresoLeche: parseFloat(ingresoQuincenal.toFixed(2)),
            });
        });

        return cashFlowData;

    }, [monthlyProjectionData]);

    return { cashFlow };
};