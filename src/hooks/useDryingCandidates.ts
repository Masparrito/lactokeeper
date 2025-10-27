import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { calculateDEL } from '../utils/calculations';

/**
 * Hook que identifica animales candidatos para el secado basado en múltiples criterios:
 * 1. Días en Leche (DEL) cercanos al objetivo definido en la configuración.
 * 2. Animales preñados con 4 pesajes consecutivos a la baja.
 * 3. Animales cuyo proceso de secado ya ha sido iniciado ('en-secado').
 * @returns Un array de IDs de animales que cumplen alguna de las condiciones.
 */
export const useDryingCandidates = (): string[] => {
    // --- CAMBIO: Se obtiene appConfig de useData ---
    const { animals, parturitions, weighings, appConfig } = useData();

    const candidates = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const candidatesSet = new Set<string>();

        // --- CAMBIO: Se usan valores de appConfig ---
        // Se crea una ventana de 30 días (entre 35 y 5 días antes de la meta)
        const dryingWindowStart = appConfig.diasLactanciaObjetivo - 35;
        const dryingWindowEnd = appConfig.diasLactanciaObjetivo - 5;
        
        // 1. Condición por Días en Leche (DEL)
        parturitions.forEach(p => {
            if (p.status === 'activa') {
                const del = calculateDEL(p.parturitionDate, today);
                // --- CAMBIO: Lógica actualizada ---
                if (del >= dryingWindowStart && del <= dryingWindowEnd) {
                    candidatesSet.add(p.goatId);
                }
            }
        });

        // 2. Condición por Tendencia a la Baja y Preñez (Sin cambios)
        const pregnantAnimals = animals.filter(a => a.reproductiveStatus === 'Preñada' && !a.isReference);

        pregnantAnimals.forEach(animal => {
            const animalWeighings = weighings
                .filter(w => w.goatId === animal.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Más reciente primero

            if (animalWeighings.length >= 4) {
                // Verificar 4 pesajes consecutivos a la baja (estrictamente menor)
                const w1 = animalWeighings[0].kg; // Más reciente
                const w2 = animalWeighings[1].kg;
                const w3 = animalWeighings[2].kg;
                const w4 = animalWeighings[3].kg;

                if (w1 < w2 && w2 < w3 && w3 < w4) {
                    candidatesSet.add(animal.id);
                }
            }
        });

        // 3. Condición por Proceso de Secado Iniciado (Sin cambios)
        parturitions.forEach(p => {
            if (p.status === 'en-secado') {
                candidatesSet.add(p.goatId);
            }
        });

        return Array.from(candidatesSet);

    }, [animals, parturitions, weighings, appConfig.diasLactanciaObjetivo]); // --- CAMBIO: appConfig añadido a dependencias

    return candidates;
};