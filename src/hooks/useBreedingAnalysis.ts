import { useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { BreedingGroup } from '../db/local';

// Constantes para los cálculos, fáciles de ajustar en el futuro.
const GESTATION_DAYS = 152;
const CYCLE_MARGIN_DAYS = 21;
const ALERT_THRESHOLD_DAYS = GESTATION_DAYS + CYCLE_MARGIN_DAYS; // Total: 173 días

/**
 * Hook que analiza el estado de los lotes de monta para detectar alertas
 * y determinar cuándo un ciclo reproductivo ha concluido.
 */
export const useBreedingAnalysis = () => {
    const { breedingGroups, serviceRecords, parturitions, animals, updateAnimal } = useData();

    // Usamos useMemo para realizar el análisis solo cuando los datos relevantes cambian.
    const analysisResult = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalizamos la fecha para comparaciones precisas.

        const activeGroups = breedingGroups.filter(g => g.status === 'Activo');
        const concludedGroups: BreedingGroup[] = [];
        const groupsWithAlerts = new Set<string>();
        const femalesToFlag: { femaleId: string, groupId: string }[] = [];

        // 1. Analizar cada grupo de monta activo.
        for (const group of activeGroups) {
            const groupStartDate = new Date(group.startDate);
            const femalesInGroup = new Set(
                serviceRecords
                    .filter(sr => sr.breedingGroupId === group.id)
                    .map(sr => sr.femaleId)
            );

            if (femalesInGroup.size === 0) continue; // Si no hay servicios, no hay nada que analizar.

            let allFemalesHaveParturition = true;

            // 2. Revisar cada hembra con servicios en el lote.
            for (const femaleId of femalesInGroup) {
                // ¿Tiene esta hembra un parto registrado DESPUÉS del inicio de esta temporada de monta?
                const hasParturitionInCycle = parturitions.some(
                    p => p.goatId === femaleId && new Date(p.parturitionDate) >= groupStartDate
                );

                if (hasParturitionInCycle) {
                    continue; // Esta hembra ya parió, ciclo completo para ella.
                }

                // Si no ha parido, marcamos el lote como no concluido.
                allFemalesHaveParturition = false;

                // 3. Lógica de Alertas: Revisar si debería haber parido ya.
                const lastService = serviceRecords
                    .filter(sr => sr.femaleId === femaleId && sr.breedingGroupId === group.id)
                    .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0];
                
                if (lastService) {
                    const alertDate = new Date(lastService.serviceDate);
                    alertDate.setDate(alertDate.getDate() + ALERT_THRESHOLD_DAYS);

                    if (today > alertDate) {
                        // ¡ALERTA! Ha pasado el tiempo de gestación + margen y no hay parto.
                        groupsWithAlerts.add(group.id);
                        femalesToFlag.push({ femaleId, groupId: group.id });
                    }
                }
            }

            // Si todas las hembras con servicio ya parieron, el lote está concluido.
            if (allFemalesHaveParturition) {
                concludedGroups.push(group);
            }
        }

        return { concludedGroups, groupsWithAlerts, femalesToFlag };

    }, [breedingGroups, serviceRecords, parturitions]);

    // Side Effect: Usamos useEffect para ejecutar la actualización de los fallos reproductivos.
    // Esto se ejecuta solo si la lista de 'femalesToFlag' cambia.
    useEffect(() => {
        if (analysisResult.femalesToFlag.length > 0) {
            console.log("Detectadas hembras con posible fallo reproductivo:", analysisResult.femalesToFlag);
            
            // --- CÓDIGO CORREGIDO Y ACTIVADO ---
            // Este bloque ahora se ejecutará, actualizando el contador de fallos
            // en la base de datos para los animales detectados.
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
        concludedGroups: analysisResult.concludedGroups,
        groupsWithAlerts: analysisResult.groupsWithAlerts,
    };
};