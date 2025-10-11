// src/hooks/useAnimalStatus.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local';
import { Baby, Heart, HeartHandshake, CircleOff, Wind, Archive, Waypoints } from 'lucide-react';
import { GiUdder } from 'react-icons/gi';

export const STATUS_DEFINITIONS = {
    PREGNANT: { key: 'PREGNANT', Icon: Baby, color: 'text-pink-400', label: 'Preñada' },
    IN_SERVICE_CONFIRMED: { key: 'IN_SERVICE_CONFIRMED', Icon: HeartHandshake, color: 'text-pink-500', label: 'Servicio Visto' },
    IN_SERVICE: { key: 'IN_SERVICE', Icon: Heart, color: 'text-red-400', label: 'En Monta' },
    EMPTY: { key: 'EMPTY', Icon: CircleOff, color: 'text-zinc-500', label: 'Vacía' },
    SIRE_IN_SERVICE: { key: 'SIRE_IN_SERVICE', Icon: Waypoints, color: 'text-blue-400', label: 'Reproductor Activo' },
    MILKING: { key: 'MILKING', Icon: GiUdder, color: 'text-blue-300', label: 'En Ordeño' },
    DRYING_OFF: { key: 'DRYING_OFF', Icon: Wind, color: 'text-yellow-400', label: 'Secando' },
    DRY: { key: 'DRY', Icon: Archive, color: 'text-zinc-400', label: 'Seca' },
};

export type AnimalStatusKey = keyof typeof STATUS_DEFINITIONS;

export const useAnimalStatus = (animal: Animal) => {
    // --- CAMBIO CLAVE 1: Se obtienen las nuevas entidades del contexto ---
    const { parturitions, serviceRecords, breedingSeasons, sireLots } = useData();

    const statuses = useMemo(() => {
        const activeStatuses: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] = [];

        if (!animal) return [];

        if (animal.sex === 'Hembra') {
            const lastParturition = parturitions
                .filter(p => p.goatId === animal.id && p.status !== 'finalizada')
                .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];

            if (lastParturition) {
                if (lastParturition.status === 'activa') activeStatuses.push(STATUS_DEFINITIONS.MILKING);
                else if (lastParturition.status === 'en-secado') activeStatuses.push(STATUS_DEFINITIONS.DRYING_OFF);
                else if (lastParturition.status === 'seca') activeStatuses.push(STATUS_DEFINITIONS.DRY);
            }
        }

        if (animal.reproductiveStatus === 'Preñada') {
            activeStatuses.push(STATUS_DEFINITIONS.PREGNANT);
        } 
        else if (animal.reproductiveStatus === 'En Servicio') {
            // --- CAMBIO CLAVE 2: Se usa la nueva propiedad 'sireLotId' ---
            const hasServiceRecord = serviceRecords.some(sr => sr.femaleId === animal.id && sr.sireLotId === animal.sireLotId);
            
            if (hasServiceRecord) activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE_CONFIRMED);
            else activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE);
        }
        else if (animal.reproductiveStatus === 'Vacía' || animal.reproductiveStatus === 'Post-Parto') {
             activeStatuses.push(STATUS_DEFINITIONS.EMPTY);
        }

        if (animal.sex === 'Macho') {
            // --- CAMBIO CLAVE 3: La lógica para 'Reproductor Activo' ahora es más compleja pero correcta ---
            const activeSeasons = breedingSeasons.filter(s => s.status === 'Activo');
            const activeSeasonIds = new Set(activeSeasons.map(s => s.id));
            const isActiveSire = sireLots.some(sl => sl.sireId === animal.id && activeSeasonIds.has(sl.seasonId));
            
            if (isActiveSire) {
                activeStatuses.push(STATUS_DEFINITIONS.SIRE_IN_SERVICE);
            }
        }

        return activeStatuses;

    }, [animal, parturitions, serviceRecords, breedingSeasons, sireLots]);

    return statuses;
};