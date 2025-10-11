// src/hooks/useBirthingForecast.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local';

const GESTATION_DAYS = 152;

export interface BirthingForecastEvent {
    animal: Animal;
    dueDate: Date;
    type: 'Confirmada' | 'Probable';
    sireId: string;
    sireName: string; // <-- Se añade el nombre
}

export interface BirthingSeasonForecast {
    seasonId: string;
    seasonName: string;
    projectedStartDate: Date | null;
    projectedEndDate: Date | null;
    totalEvents: number;
    confirmedEvents: number;
    probableEvents: number;
    daysSinceLastSeason: number | null;
    events: BirthingForecastEvent[];
}

export const useBirthingForecast = () => {
    const { animals, breedingSeasons, sireLots, serviceRecords, fathers } = useData(); // Se añade 'fathers'

    const forecastBySeason = useMemo(() => {
        // ... (La lógica interna no cambia, solo se añade 'sireName' al objeto)
        const allForecastEvents: (BirthingForecastEvent & { seasonId: string })[] = [];
        const activeSeasons = breedingSeasons.filter(s => s.status === 'Activo');

        for (const season of activeSeasons) {
            const lotsInSeason = sireLots.filter(sl => sl.seasonId === season.id);
            if (lotsInSeason.length === 0) continue;

            const lotIds = new Set(lotsInSeason.map(l => l.id));
            const femalesInSeason = animals.filter(a => a.sireLotId && lotIds.has(a.sireLotId));

            for (const female of femalesInSeason) {
                const lastService = serviceRecords
                    .filter(sr => sr.femaleId === female.id && sr.sireLotId === female.sireLotId && new Date(sr.serviceDate) >= new Date(season.startDate) && new Date(sr.serviceDate) <= new Date(season.endDate))
                    .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0];

                const lot = sireLots.find(l => l.id === female.sireLotId);
                if (!lot) continue;

                const sireName = fathers.find(f => f.id === lot.sireId)?.name || lot.sireId;

                if (lastService) {
                    const dueDate = new Date(lastService.serviceDate);
                    dueDate.setDate(dueDate.getDate() + GESTATION_DAYS);
                    allForecastEvents.push({ animal: female, dueDate, type: 'Confirmada', sireId: lot.sireId, sireName, seasonId: season.id });
                } else {
                    const probableServiceDay = 10;
                    const dueDate = new Date(season.startDate);
                    dueDate.setDate(dueDate.getDate() + probableServiceDay + GESTATION_DAYS);
                    allForecastEvents.push({ animal: female, dueDate, type: 'Probable', sireId: lot.sireId, sireName, seasonId: season.id });
                }
            }
        }
        // ... el resto de la lógica de agrupación y cálculo de KPIs no cambia.
        const groupedBySeason: Record<string, BirthingForecastEvent[]> = allForecastEvents.reduce((acc, event) => {
            const { seasonId } = event;
            if (!acc[seasonId]) acc[seasonId] = [];
            acc[seasonId].push(event);
            return acc;
        }, {} as Record<string, BirthingForecastEvent[]>);

        let seasonForecasts: BirthingSeasonForecast[] = Object.entries(groupedBySeason).map(([seasonId, events]) => {
            const season = breedingSeasons.find(s => s.id === seasonId)!;
            const dueDates = events.map(e => e.dueDate.getTime());
            const minDate = new Date(Math.min(...dueDates));
            const maxDate = new Date(Math.max(...dueDates));

            return {
                seasonId,
                seasonName: season.name,
                projectedStartDate: events.length > 0 ? minDate : null,
                projectedEndDate: events.length > 0 ? maxDate : null,
                events: events.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
                totalEvents: events.length,
                confirmedEvents: events.filter(e => e.type === 'Confirmada').length,
                probableEvents: events.filter(e => e.type === 'Probable').length,
                daysSinceLastSeason: null,
            };
        }).sort((a, b) => a.projectedStartDate!.getTime() - b.projectedStartDate!.getTime());

        if (seasonForecasts.length > 1) {
            for (let i = 1; i < seasonForecasts.length; i++) {
                const currentSeasonStart = seasonForecasts[i].projectedStartDate!;
                const lastSeasonEnd = seasonForecasts[i - 1].projectedEndDate!;
                const diffTime = currentSeasonStart.getTime() - lastSeasonEnd.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                seasonForecasts[i].daysSinceLastSeason = diffDays;
            }
        }
        return seasonForecasts;
    }, [animals, breedingSeasons, sireLots, serviceRecords, fathers]);

    return {
        forecastBySeason,
    };
};