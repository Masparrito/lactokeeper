// src/hooks/useComparativeData.ts

import { useState, useEffect } from 'react';
import { Animal, Parturition, Weighing } from '../db/local';
import { calculateDEL } from '../utils/calculations';

// Tipos (sin cambios)
export type ComparisonTargetType =
    | 'PRIMIPARAS_AVG'
    | 'MULTIPARAS_AVG'
    | 'HERD_AVG'
    | 'PEERS_AVG'
    | 'DAM'
    | 'PROGENY_AVG'
    | 'SPECIFIC_LACTATION';

export interface ComparisonRequest {
    type: ComparisonTargetType | null;
    animal: Animal | null;
    specificLactationIndex?: number;
    highlightedLactationDEL?: number;
}

export interface ComparisonResult {
    name: string;
    curve: { del: number; kg: number }[];
    averageRestInterval?: number | null;
}

// Helper para calcular la curva (sin cambios)
const calculateAverageCurve = (
    relevantWeighings: Weighing[],
    relevantParturitions: Parturition[],
    maxDel?: number
): { del: number; kg: number }[] => {
    const curveData: { [key: number]: { totalKg: number; count: number } } = {};
    relevantWeighings.forEach(w => {
        const birthForWeighing = relevantParturitions
            .filter(p => p.goatId === w.goatId && new Date(w.date) >= new Date(p.parturitionDate))
            .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
        if (!birthForWeighing) return;
        const del = calculateDEL(birthForWeighing.parturitionDate, w.date);
        if (maxDel !== undefined && del > maxDel) return;
        if (!curveData[del]) curveData[del] = { totalKg: 0, count: 0 };
        curveData[del].totalKg += w.kg;
        curveData[del].count++;
    });
    return Object.entries(curveData)
        .map(([del, data]) => ({ del: parseInt(del), kg: data.totalKg / data.count }))
        .sort((a, b) => a.del - b.del);
};

// Helper para calcular intervalo promedio (sin cambios)
const calculateAverageRestInterval = (
    targetAnimalIds: Set<string>,
    allParturitions: Parturition[]
): number | null => {
    let totalIntervalDays = 0;
    let intervalCount = 0;
    targetAnimalIds.forEach(animalId => {
        const animalParturitions = allParturitions
            .filter(p => p.goatId === animalId)
            .sort((a, b) => new Date(a.parturitionDate).getTime() - new Date(b.parturitionDate).getTime());
        for (let i = 1; i < animalParturitions.length; i++) {
            const currentParturition = animalParturitions[i];
            const previousParturition = animalParturitions[i - 1];
            if (previousParturition.dryingStartDate) {
                const dryingStart = new Date(previousParturition.dryingStartDate);
                const currentParturitionDate = new Date(currentParturition.parturitionDate);
                const diffTime = currentParturitionDate.getTime() - dryingStart.getTime();
                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays >= 0) {
                    totalIntervalDays += diffDays;
                    intervalCount++;
                }
            }
        }
    });
    return intervalCount === 0 ? null : totalIntervalDays / intervalCount;
};


// Hook actualizado
export const useComparativeData = (
    request: ComparisonRequest,
    allAnimals: Animal[],
    allParturitions: Parturition[],
    allWeighings: Weighing[]
) => {
    const [comparativeData, setComparativeData] = useState<ComparisonResult | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!request.type || !request.animal) {
            setComparativeData(null);
            setIsLoading(false);
            return;
        }

        const { type, animal, highlightedLactationDEL } = request;

        const calculateComparison = async () => {
            setIsLoading(true);
            setComparativeData(null);
            let result: ComparisonResult | null = null;

            try {
                if (type === 'PRIMIPARAS_AVG' || type === 'MULTIPARAS_AVG' || type === 'HERD_AVG') {
                    // Calculamos cuántos partos tiene cada animal
                    const parturitionCounts = allParturitions.reduce((acc, p) => {
                        acc[p.goatId] = (acc[p.goatId] || 0) + 1;
                        return acc;
                    }, {} as Record<string, number>);

                    // Filtramos los partos según el tipo de comparación
                    const targetParturitions = allParturitions.filter(p => {
                        const count = parturitionCounts[p.goatId] || 0;
                        if (type === 'PRIMIPARAS_AVG') return count === 1;
                        if (type === 'MULTIPARAS_AVG') return count > 1;
                        return true; // HERD_AVG incluye todos
                    });

                    // Obtenemos los IDs de los animales filtrados
                    // --- CORRECCIÓN: Forzar tipo Set<string> ---
                    const targetAnimalIds = new Set<string>(targetParturitions.map(p => p.goatId));
                    const targetWeighings = allWeighings.filter(w => targetAnimalIds.has(w.goatId));
                    const curve = calculateAverageCurve(targetWeighings, targetParturitions, highlightedLactationDEL);
                    const avgInterval = calculateAverageRestInterval(targetAnimalIds, allParturitions);
                    const name = type === 'PRIMIPARAS_AVG' ? 'Prom. Primíparas' : type === 'MULTIPARAS_AVG' ? 'Prom. Multíparas' : 'Prom. Rebaño';
                    result = { name, curve, averageRestInterval: avgInterval };

                } else if (type === 'PEERS_AVG') {
                    const animalBirthDate = new Date(animal.birthDate);
                    const animalBirthYear = animalBirthDate.getFullYear();
                    const animalSemester = Math.floor(animalBirthDate.getMonth() / 6);
                    const potentialPeerIds = new Set<string>( // --- CORRECCIÓN: Forzar tipo Set<string> ---
                        allAnimals
                            .filter(a => {
                                const peerBirthDate = new Date(a.birthDate);
                                return peerBirthDate.getFullYear() === animalBirthYear &&
                                       Math.floor(peerBirthDate.getMonth() / 6) === animalSemester &&
                                       a.id !== animal.id;
                            })
                            .map(a => a.id)
                    );
                    const peerIdsWithParturitions = new Set<string>( // --- CORRECCIÓN: Forzar tipo Set<string> ---
                         allParturitions
                             .filter(p => potentialPeerIds.has(p.goatId))
                             .map(p => p.goatId)
                    );
                    const peerParturitions = allParturitions.filter(p => peerIdsWithParturitions.has(p.goatId));
                    const peerWeighings = allWeighings.filter(w => peerIdsWithParturitions.has(w.goatId));
                    const curve = calculateAverageCurve(peerWeighings, peerParturitions, highlightedLactationDEL);
                    const avgInterval = calculateAverageRestInterval(peerIdsWithParturitions, allParturitions);
                    result = { name: `Prom. Pares (${animalBirthYear}-S${animalSemester + 1})`, curve, averageRestInterval: avgInterval };

                } else if (type === 'DAM') {
                    if (animal.motherId) {
                        const damParturitions = allParturitions.filter(p => p.goatId === animal.motherId);
                        const damWeighings = allWeighings.filter(w => w.goatId === animal.motherId);
                        const curve = calculateAverageCurve(damWeighings, damParturitions, highlightedLactationDEL);
                        const avgInterval = calculateAverageRestInterval(new Set([animal.motherId]), allParturitions);
                        result = { name: `Prom. Madre (${animal.motherId})`, curve, averageRestInterval: avgInterval };
                    } else {
                        result = { name: 'Madre (Desconocida)', curve: [], averageRestInterval: null };
                    }
                } else if (type === 'PROGENY_AVG') {
                    const daughterIds = new Set<string>( // --- CORRECCIÓN: Forzar tipo Set<string> ---
                        allAnimals.filter(a => a.motherId === animal.id && a.sex === 'Hembra').map(d => d.id)
                    );
                    const daughterParturitions = allParturitions.filter(p => daughterIds.has(p.goatId));
                    const daughterWeighings = allWeighings.filter(w => daughterIds.has(w.goatId));
                    const curve = calculateAverageCurve(daughterWeighings, daughterParturitions, highlightedLactationDEL);
                    const avgInterval = calculateAverageRestInterval(daughterIds, allParturitions);
                    result = { name: 'Prom. Hijas', curve, averageRestInterval: avgInterval };

                } else if (type === 'SPECIFIC_LACTATION' && request.specificLactationIndex !== undefined) {
                    const animalLactations = allParturitions
                        .filter(p => p.goatId === animal.id)
                        .sort((a, b) => new Date(a.parturitionDate).getTime() - new Date(b.parturitionDate).getTime());
                    
                    let specificInterval: number | null = null;
                    if (request.specificLactationIndex > 0 && request.specificLactationIndex < animalLactations.length) {
                         const previousParturition = animalLactations[request.specificLactationIndex - 1];
                         if(previousParturition.dryingStartDate) {
                             const dryingStart = new Date(previousParturition.dryingStartDate);
                             const currentParturitionDate = new Date(animalLactations[request.specificLactationIndex].parturitionDate);
                             const diffTime = currentParturitionDate.getTime() - dryingStart.getTime();
                             specificInterval = Math.round(diffTime / (1000 * 60 * 60 * 24));
                         }
                    }

                    if (request.specificLactationIndex < animalLactations.length) {
                        const targetParturition = animalLactations[request.specificLactationIndex];
                        // Determinar fecha de fin de la lactancia (siguiente parto o futuro lejano)
                        const nextParturitionDate = request.specificLactationIndex + 1 < animalLactations.length
                            ? new Date(animalLactations[request.specificLactationIndex + 1].parturitionDate)
                            : new Date(9999, 11, 31);

                        // --- CORRECCIÓN: Lógica de filter y map restaurada ---
                        const targetWeighings = allWeighings.filter(w => {
                            const weighDate = new Date(w.date);
                            return w.goatId === animal.id &&
                                   weighDate >= new Date(targetParturition.parturitionDate) &&
                                   weighDate < nextParturitionDate;
                        });

                        const curve = targetWeighings
                            .map(w => ({ del: calculateDEL(targetParturition.parturitionDate, w.date), kg: w.kg }))
                            .sort((a, b) => a.del - b.del);
                        // --- FIN CORRECCIÓN ---

                        const year = new Date(targetParturition.parturitionDate).getFullYear();
                        result = { name: `Lact. ${year} (#${request.specificLactationIndex + 1})`, curve, averageRestInterval: specificInterval };
                    } else {
                         result = { name: 'Lactancia no encontrada', curve: [], averageRestInterval: null };
                    }
                }

            } catch (error) {
                 console.error("Error calculating comparison data:", error);
                 result = { name: "Error", curve: [], averageRestInterval: null };
            } finally {
                setComparativeData(result);
                setIsLoading(false);
            }
        };

        calculateComparison();

    }, [request, allAnimals, allParturitions, allWeighings]);

    return { comparativeData, isLoading };
};