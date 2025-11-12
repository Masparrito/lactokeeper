// src/hooks/useAnimalStatus.ts (CORREGIDO Y REFINADO)

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local';
import { Baby, Heart, HeartHandshake, CircleOff, Wind, Archive, Waypoints } from 'lucide-react';
import { GiUdder } from 'react-icons/gi';
import { DEFAULT_CONFIG } from '../types/config';
// (ELIMINADO) No necesitamos 'getAnimalZootecnicCategory' aquí
// (ELIMINADO) No necesitamos 'calculateAgeInDays' aquí

export const STATUS_DEFINITIONS = {
    PREGNANT: { key: 'PREGNANT', Icon: Baby, color: 'text-pink-400', label: 'Preñada' },
    IN_SERVICE_CONFIRMED: { key: 'IN_SERVICE_CONFIRMED', Icon: HeartHandshake, color: 'text-pink-500', label: 'Servicio Visto' },
    IN_SERVICE: { key: 'IN_SERVICE', Icon: Heart, color: 'text-red-400', label: 'En Monta' },
    EMPTY: { key: 'EMPTY', Icon: CircleOff, color: 'text-white', label: 'Vacía' },
    SIRE_IN_SERVICE: { key: 'SIRE_IN_SERVICE', Icon: Waypoints, color: 'text-blue-400', label: 'Reproductor Activo' },
    MILKING: { key: 'MILKING', Icon: GiUdder, color: 'text-blue-300', label: 'En Ordeño' },
    DRYING_OFF: { key: 'DRYING_OFF', Icon: Wind, color: 'text-yellow-400', label: 'Secando' },
    DRY: { key: 'DRY', Icon: Archive, color: 'text-zinc-400', label: 'Seca' },
};

export type AnimalStatusKey = keyof typeof STATUS_DEFINITIONS;

const calculateAgeInMonths = (birthDate: string): number => {
    if (!birthDate || birthDate === 'N/A') return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    if (isNaN(birth.getTime())) return 0;
    let months = (today.getFullYear() - birth.getFullYear()) * 12;
    months -= birth.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
};

export const useAnimalStatus = (animal: Animal) => {
    const { parturitions, serviceRecords, breedingSeasons, sireLots, appConfig } = useData();

    const statuses = useMemo(() => {
        const activeStatuses: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] = [];

        if (!animal) return [];

        // --- Lógica de Machos (Sin cambios) ---
        if (animal.sex === 'Macho') {
            const activeSeasons = breedingSeasons.filter(s => s.status === 'Activo');
            const activeSeasonIds = new Set(activeSeasons.map(s => s.id));
            const isActiveSire = sireLots.some(sl => sl.sireId === animal.id && activeSeasonIds.has(sl.seasonId));
            
            if (isActiveSire) {
                activeStatuses.push(STATUS_DEFINITIONS.SIRE_IN_SERVICE);
            }
            return activeStatuses; // Salir
        }

        // --- Lógica de Hembras (RECONSTRUIDA) ---
        
        const animalParturitions = parturitions
            .filter(p => p.goatId === animal.id)
            .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime());
            
        const lastParturition = animalParturitions[0];
        const hasCalved = animalParturitions.length > 0;

        // 1. ESTADO DE LACTANCIA (Prioridad 1)
        if (lastParturition) {
            if (lastParturition.status === 'activa') activeStatuses.push(STATUS_DEFINITIONS.MILKING);
            else if (lastParturition.status === 'en-secado') activeStatuses.push(STATUS_DEFINITIONS.DRYING_OFF);
            else if (lastParturition.status === 'seca') activeStatuses.push(STATUS_DEFINITIONS.DRY);
        }

        // 2. LÓGICA DE "VIENTRE" (Prioridad 2)
        const config = appConfig || DEFAULT_CONFIG;
        const ageInMonths = calculateAgeInMonths(animal.birthDate);

        let minVientreAge = config.edadMinimaVientreMeses;
        if (!minVientreAge || minVientreAge < 6) {
            minVientreAge = DEFAULT_CONFIG.edadMinimaVientreMeses; // 10
        }
        
        const isVientre = hasCalved || (ageInMonths >= minVientreAge);

        // 3. ESTADO REPRODUCTIVO (Prioridad 3)
        let isPregnantOrConfirmed = false;
        let isJustInService = false; // <-- (NUEVO)

        if (animal.reproductiveStatus === 'Preñada') {
            activeStatuses.push(STATUS_DEFINITIONS.PREGNANT);
            isPregnantOrConfirmed = true;

        } else if (animal.reproductiveStatus === 'En Servicio') {
            const hasServiceRecord = serviceRecords.some(sr => sr.femaleId === animal.id && sr.sireLotId === animal.sireLotId);
            
            if (hasServiceRecord) {
                activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE_CONFIRMED);
                isPregnantOrConfirmed = true;
            } else {
                activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE);
                isJustInService = true; // <-- (NUEVO)
            }
        }
        
        // 4. LÓGICA DE "VACÍA" (Prioridad 4 - CORREGIDA)
        
        // Un animal es "Vacía" SI:
        // 1. Es un "Vientre" (respeta los 10 meses)
        // 2. Y NO está Preñada o Confirmada
        // 3. Y NO está "En Servicio" (evita mostrar 2 íconos: Corazón y Vacía)
        
        if (isVientre && !isPregnantOrConfirmed && !isJustInService) {
            
            // Si cumple, se añade "Vacía".
            // Esto permite que "En Ordeño" (añadido en Paso 1)
            // y "Vacía" (añadido aquí) co-existan perfectamente.
            activeStatuses.push(STATUS_DEFINITIONS.EMPTY);
        }
        // Si no es Vientre (ej. 8 meses), esta condición es 'false' y no se añade el icono.
        
        
        // 5. ELIMINAR EL PASO "LIMPIEZA FINAL"
        // (El bloque 'hasReproStatus' se elimina, ya no es necesario)

        const uniqueKeys = Array.from(new Set(activeStatuses.map(s => s.key)));
        return uniqueKeys.map(key => STATUS_DEFINITIONS[key as AnimalStatusKey]).filter(Boolean);

    }, [animal, parturitions, serviceRecords, breedingSeasons, sireLots, appConfig]);

    return statuses;
};