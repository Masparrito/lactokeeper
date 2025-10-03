import { useMemo } from 'react';
import { useData } from '../context/DataContext';
// No se necesita 'Event' porque el tipo se infiere del array 'events' del contexto

/**
 * Un hook personalizado para obtener todos los eventos de un animal específico,
 * ordenados cronológicamente del más reciente al más antiguo.
 * @param animalId - El ID del animal para el cual se quieren obtener los eventos.
 * @returns Un array con los eventos del animal.
 */
export const useEvents = (animalId: string | undefined) => {
    const { events } = useData();

    const animalEvents = useMemo(() => {
        if (!animalId) {
            return [];
        }
        const filtered = events.filter(event => event.animalId === animalId);
        const sorted = filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return sorted;
    }, [events, animalId]);

    return animalEvents;
};
