// src/hooks/useBreedingAnalysis.ts

import { useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
// --- CAMBIO CLAVE 1: Se importa 'BreedingSeason' y 'SireLot' ---
import { BreedingSeason } from '../db/local';

const GESTATION_DAYS = 152;
const CYCLE_MARGIN_DAYS = 21;
const ALERT_THRESHOLD_DAYS = GESTATION_DAYS + CYCLE_MARGIN_DAYS;

/**
 * Hook que analiza el estado de las temporadas de monta para detectar alertas
 * y determinar cuándo un ciclo reproductivo ha concluido.
 */
export const useBreedingAnalysis = () => {
    // --- CAMBIO CLAVE 2: Se obtienen las nuevas entidades del contexto ---
    const { breedingSeasons, sireLots, serviceRecords, parturitions, animals, updateAnimal } = useData();

    const analysisResult = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const activeSeasons = breedingSeasons.filter(s => s.status === 'Activo');
        const concludedSeasons: BreedingSeason[] = [];
        const seasonsWithAlerts = new Set<string>();
        const femalesToFlag: { femaleId: string }[] = [];

        for (const season of activeSeasons) {
            const seasonStartDate = new Date(season.startDate);
            
            // Encuentra todos los lotes de sementales de esta temporada
            const lotsInSeason = sireLots.filter(sl => sl.seasonId === season.id);
            if (lotsInSeason.length === 0) continue;

            // Encuentra todas las hembras con servicios registrados en cualquiera de esos lotes
            const lotIds = new Set(lotsInSeason.map(l => l.id));
            const femalesWithServices = new Set(
                serviceRecords
                    .filter(sr => lotIds.has(sr.sireLotId))
                    .map(sr => sr.femaleId)
            );
            
            if (femalesWithServices.size === 0) continue;

            let allFemalesHaveParturition = true;

            for (const femaleId of femalesWithServices) {
                const hasParturitionInCycle = parturitions.some(
                    p => p.goatId === femaleId && new Date(p.parturitionDate) >= seasonStartDate
                );

                if (hasParturitionInCycle) {
                    continue;
                }

                allFemalesHaveParturition = false;

                const lastService = serviceRecords
                    .filter(sr => sr.femaleId === femaleId && lotIds.has(sr.sireLotId))
                    .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0];
                
                if (lastService) {
                    const alertDate = new Date(lastService.serviceDate);
                    alertDate.setDate(alertDate.getDate() + ALERT_THRESHOLD_DAYS);

                    if (today > alertDate) {
                        seasonsWithAlerts.add(season.id);
                        femalesToFlag.push({ femaleId });
                    }
                }
            }

            if (allFemalesHaveParturition) {
                concludedSeasons.push(season);
            }
        }

        return { concludedSeasons, seasonsWithAlerts, femalesToFlag };

    }, [breedingSeasons, sireLots, serviceRecords, parturitions]);

    useEffect(() => {
        if (analysisResult.femalesToFlag.length > 0) {
            console.log("Detectadas hembras con posible fallo reproductivo:", analysisResult.femalesToFlag);
            
            (async () => {
                for (const { femaleId } of analysisResult.femalesToFlag) {
                    const animal = animals.find(a => a.id === femaleId);
                    if (animal) {
                        const currentFailures = animal.breedingFailures || 0;
                        console.log(`Incrementando fallo para ${femaleId}. Total anterior: ${currentFailures}. Nuevo total: ${currentFailures + 1}`);
                        await updateAnimal(femaleId, { breedingFailures: currentFailures + 1 });
                    }
                }
            })();
        }
    }, [analysisResult.femalesToFlag, animals, updateAnimal]);

    return {
        concludedGroups: analysisResult.concludedSeasons, // Se mantiene el nombre para compatibilidad
        groupsWithAlerts: analysisResult.seasonsWithAlerts, // Se mantiene el nombre
    };
};