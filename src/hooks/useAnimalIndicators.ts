// src/hooks/useAnimalIndicators.ts (Corregido)

import { useMemo } from 'react';
import { Animal, Parturition } from '../db/local';
// (NUEVO) Importar la función de categoría centralizada
import { getAnimalZootecnicCategory } from '../utils/calculations';
// (NUEVO) Importar useData para acceder a appConfig
import { useData } from '../context/DataContext';

// --- Interfaces de Resultado ---

export interface AnimalIndicators {
    numPartos: number | string;
    edadPrimerParto: string;
    iepPromedio: string;
    delPromedio: string;
    pevPromedio: string;
    needsManualData: boolean;
}

interface UseAnimalIndicatorsResult {
    indicators: AnimalIndicators;
    loading: boolean;
}

// --- Funciones de Ayuda (Sin cambios) ---

/**
 * Calcula la diferencia de días entre dos fechas ISO (YYYY-MM-DD).
 */
const daysBetween = (dateStr1: string, dateStr2: string): number => {
    const date1 = new Date(dateStr1 + 'T00:00:00Z');
    const date2 = new Date(dateStr2 + 'T00:00:00Z');
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Formatea una cantidad de días en años y meses.
 */
const formatDaysToYearsMonths = (totalDays: number): string => {
    if (totalDays <= 0) return "N/A";
    const years = Math.floor(totalDays / 365.25);
    const months = Math.floor((totalDays % 365.25) / 30.44);
    
    let parts = [];
    if (years > 0) parts.push(`${years} ${years > 1 ? 'años' : 'año'}`);
    if (months > 0) parts.push(`${months} ${months > 1 ? 'meses' : 'mes'}`);
    
    return parts.length > 0 ? parts.join(', ') : `${Math.round(totalDays)} días`;
};

// --- Hook Principal ---

export const useAnimalIndicators = (
    animal: Animal | null | undefined,
    allParturitions: Parturition[]
): UseAnimalIndicatorsResult => {

    // (NUEVO) Obtener appConfig
    const { appConfig } = useData();

    const indicators = useMemo((): AnimalIndicators => {
        if (!animal || animal.sex !== 'Hembra') {
            return {
                numPartos: 'N/A',
                edadPrimerParto: 'N/A',
                iepPromedio: 'N/A',
                delPromedio: 'N/A',
                pevPromedio: 'N/A',
                needsManualData: false,
            };
        }

        // 1. Obtener y ordenar partos registrados en la app
        const appParturitions = allParturitions
            .filter(p => p.goatId === animal.id)
            .sort((a, b) => new Date(a.parturitionDate).getTime() - new Date(b.parturitionDate).getTime());

        // 2. Calcular Nº Partos
        const priorPartos = (animal as any).priorParturitions || 0;
        const totalPartos = priorPartos + appParturitions.length;
        
        // --- (INICIO CORRECCIÓN) ---
        // 3. Determinar si se necesita input manual
        
        // (CORREGIDO) Llamar a la función centralizada pasando appConfig
        const zootecnicCategory = getAnimalZootecnicCategory(animal, allParturitions, appConfig);
        
        // La lógica 'needsManualData' (Punto 4) sigue siendo la misma:
        // Se necesita data manual si es "Cabra" (según la lógica unificada),
        // no tiene partos previos manuales Y no tiene partos en la app.
        const needsManualData = 
            (zootecnicCategory === 'Cabra') &&
            priorPartos === 0 && 
            appParturitions.length === 0;
        // --- (FIN CORRECCIÓN) ---
        
        // 4. Calcular Edad 1er Parto
        let edadPrimerParto = "N/A";
        const manualFirstParturitionDate = (animal as any).manualFirstParturitionDate;

        if (animal.birthDate && animal.birthDate !== 'N/A') {
            if (manualFirstParturitionDate) {
                // Prioridad 1: Usar la fecha manual si existe
                const daysToFirstParturition = daysBetween(animal.birthDate, manualFirstParturitionDate);
                edadPrimerParto = formatDaysToYearsMonths(daysToFirstParturition);
            } else if (appParturitions.length > 0) {
                // Prioridad 2: Usar la fecha del primer parto en la app
                const daysToFirstParturition = daysBetween(animal.birthDate, appParturitions[0].parturitionDate);
                edadPrimerParto = formatDaysToYearsMonths(daysToFirstParturition);
            } else if (totalPartos > 0) {
                // Caso: Tiene 'priorPartos' pero no fecha manual
                edadPrimerParto = "Dato Manual";
            }
        }

        // 5. Calcular IEP (Intervalo Entre Partos)
        let iepPromedio = "N/A";
        if (appParturitions.length >= 2) {
            let iepSum = 0;
            for (let i = 1; i < appParturitions.length; i++) {
                iepSum += daysBetween(appParturitions[i - 1].parturitionDate, appParturitions[i].parturitionDate);
            }
            const avg = iepSum / (appParturitions.length - 1);
            iepPromedio = `${avg.toFixed(0)} días`;
        }

        // 6. Calcular DEL (Días en Leche) Promedio
        let delPromedio = "N/A";
        const finalizedLactations = appParturitions.filter(p => p.status === 'finalizada' && p.dryingStartDate);
        
        if (finalizedLactations.length > 0) {
            let delSum = 0;
            for (const lac of finalizedLactations) {
                if (lac.dryingStartDate) {
                    delSum += daysBetween(lac.parturitionDate, lac.dryingStartDate);
                }
            }
            const avg = delSum / finalizedLactations.length;
            delPromedio = `${avg.toFixed(0)} días`;
        }

        // 7. Calcular PEV (Período Seco) Promedio
        let pevPromedio = "N/A";
        if (appParturitions.length >= 2) {
            let pevSum = 0;
            let pevCount = 0;
            for (let i = 1; i < appParturitions.length; i++) {
                const prevLactation = appParturitions[i - 1];
                const currentLactation = appParturitions[i];
                
                if (prevLactation.dryingStartDate) {
                    pevSum += daysBetween(prevLactation.dryingStartDate, currentLactation.parturitionDate);
                    pevCount++;
                }
            }
            if (pevCount > 0) {
                const avg = pevSum / pevCount;
                pevPromedio = `${avg.toFixed(0)} días`;
            }
        }
        
        return {
            numPartos: totalPartos > 0 ? totalPartos : "N/A",
            edadPrimerParto,
            iepPromedio,
            delPromedio,
            pevPromedio,
            needsManualData,
        };

    }, [animal, allParturitions, appConfig]); // (NUEVO) appConfig es una dependencia

    return {
        indicators,
        loading: false
    };
};