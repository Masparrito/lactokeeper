// src/hooks/useLactationHistory.ts
// Agrega las métricas de lactancia de TODO el rebaño (o solo activos) usando el
// motor único computeAnimalLactations. Devuelve rankings y medias ponderadas.

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { DEFAULT_CONFIG } from '../types/config';
import { computeAnimalLactations, AnimalLactationSummary } from '../utils/lactationMetrics';

export type HistoryScope = 'active' | 'all';

export interface LactationHistoryResult {
    summaries: AnimalLactationSummary[];   // solo animales con al menos 1 lactancia
    rankingGeneral: AnimalLactationSummary[];
    rankingPrimiparas: AnimalLactationSummary[];
    rankingMultiparas: AnimalLactationSummary[];
    avgLactationDays: number | null;       // media ponderada de días en lactancia
    avgDryDays: number | null;             // media ponderada de días secos
    avgOpenDays: number | null;            // media ponderada de días abiertos
    standardDays: number;                  // días objetivo de lactancia (config)
    count: number;
}

const mean = (arr: number[]): number | null =>
    arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

export const useLactationHistory = (scope: HistoryScope): LactationHistoryResult => {
    const { animals, parturitions, weighings, events, appConfig } = useData();

    return useMemo(() => {
        const config = appConfig || DEFAULT_CONFIG;

        let summaries = animals
            .filter(a => a.sex === 'Hembra')
            .map(a => computeAnimalLactations(a, parturitions, weighings, events, config))
            .filter(s => s.numLactations > 0); // "pasaron por LactoKeeper"

        if (scope === 'active') summaries = summaries.filter(s => s.isActive);

        const withProd = summaries.filter(s => s.bestStandardized > 0);
        const byProd = (a: AnimalLactationSummary, b: AnimalLactationSummary) => b.bestStandardized - a.bestStandardized;

        const rankingGeneral = [...withProd].sort(byProd);
        const rankingPrimiparas = withProd.filter(s => s.parity === 'Primípara').sort(byProd);
        const rankingMultiparas = withProd.filter(s => s.parity === 'Multípara').sort(byProd);

        // Medias ponderadas por lactancia (cada lactancia aporta por igual).
        const allLacts = summaries.flatMap(s => s.lactations);
        const durVals = allLacts.filter(l => l.durationDays > 0 && l.weighingsCount > 0).map(l => l.durationDays);
        const dryVals = allLacts.map(l => l.dryDays).filter((d): d is number => d != null);
        const openVals = summaries.map(s => s.avgOpenDays).filter((d): d is number => d != null);

        return {
            summaries: rankingGeneral,
            rankingGeneral,
            rankingPrimiparas,
            rankingMultiparas,
            avgLactationDays: mean(durVals),
            avgDryDays: mean(dryVals),
            avgOpenDays: mean(openVals),
            standardDays: config.diasLactanciaObjetivo > 0 ? config.diasLactanciaObjetivo : 300,
            count: summaries.length,
        };
    }, [animals, parturitions, weighings, events, appConfig, scope]);
};
