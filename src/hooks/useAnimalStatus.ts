// src/hooks/useAnimalStatus.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local';
import { Baby, Heart, HeartHandshake, CircleOff, Wind, Archive, Waypoints } from 'lucide-react';
// --- CORRECCIÓN: Se usa el nombre singular 'GiUdder' ---
import { GiUdder } from 'react-icons/gi';

// Definimos los posibles estados y sus propiedades visuales
export const STATUS_DEFINITIONS = {
    // Reproductivos
    PREGNANT: { key: 'PREGNANT', Icon: Baby, color: 'text-pink-400', label: 'Preñada' },
    IN_SERVICE_CONFIRMED: { key: 'IN_SERVICE_CONFIRMED', Icon: HeartHandshake, color: 'text-pink-500', label: 'Servicio Visto' },
    IN_SERVICE: { key: 'IN_SERVICE', Icon: Heart, color: 'text-red-400', label: 'En Monta' },
    EMPTY: { key: 'EMPTY', Icon: CircleOff, color: 'text-zinc-500', label: 'Vacía' },
    SIRE_IN_SERVICE: { key: 'SIRE_IN_SERVICE', Icon: Waypoints, color: 'text-blue-400', label: 'Reproductor Activo' },
    
    // Productivos
    // --- CORRECCIÓN: Se usa el componente 'GiUdder' ---
    MILKING: { key: 'MILKING', Icon: GiUdder, color: 'text-blue-300', label: 'En Ordeño' },
    DRYING_OFF: { key: 'DRYING_OFF', Icon: Wind, color: 'text-yellow-400', label: 'Secando' },
    DRY: { key: 'DRY', Icon: Archive, color: 'text-zinc-400', label: 'Seca' },
};

export type AnimalStatusKey = keyof typeof STATUS_DEFINITIONS;

/**
 * Hook para calcular los estados reproductivos y productivos de un animal.
 * @param animal El objeto del animal a analizar.
 * @returns Un array con los objetos de estado activos para ese animal.
 */
export const useAnimalStatus = (animal: Animal) => {
    const { parturitions, serviceRecords, breedingGroups } = useData();

    const statuses = useMemo(() => {
        const activeStatuses: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] = [];

        if (!animal) return [];

        // --- LÓGICA DE ESTADO PRODUCTIVO (SOLO HEMBRAS) ---
        if (animal.sex === 'Hembra') {
            const lastParturition = parturitions
                .filter(p => p.goatId === animal.id && p.status !== 'finalizada')
                .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];

            if (lastParturition) {
                if (lastParturition.status === 'activa') {
                    activeStatuses.push(STATUS_DEFINITIONS.MILKING);
                } else if (lastParturition.status === 'en-secado') {
                    activeStatuses.push(STATUS_DEFINITIONS.DRYING_OFF);
                } else if (lastParturition.status === 'seca') {
                    activeStatuses.push(STATUS_DEFINITIONS.DRY);
                }
            }
        }

        // --- LÓGICA DE ESTADO REPRODUCTIVO ---
        if (animal.reproductiveStatus === 'Preñada') {
            activeStatuses.push(STATUS_DEFINITIONS.PREGNANT);
        } 
        else if (animal.reproductiveStatus === 'En Servicio') {
            const hasServiceRecord = serviceRecords.some(sr => sr.femaleId === animal.id && sr.breedingGroupId === animal.breedingGroupId);
            
            if (hasServiceRecord) {
                activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE_CONFIRMED);
            } else {
                activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE);
            }
        }
        else if (animal.reproductiveStatus === 'Vacía' || animal.reproductiveStatus === 'Post-Parto') {
             activeStatuses.push(STATUS_DEFINITIONS.EMPTY);
        }

        // Para Machos
        if (animal.sex === 'Macho') {
            const isActiveSire = breedingGroups.some(bg => bg.sireId === animal.id && bg.status === 'Activo');
            if (isActiveSire) {
                activeStatuses.push(STATUS_DEFINITIONS.SIRE_IN_SERVICE);
            }
        }

        return activeStatuses;

    }, [animal, parturitions, serviceRecords, breedingGroups]);

    return statuses;
};