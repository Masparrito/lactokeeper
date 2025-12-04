import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local';
import { Baby, Heart, HeartHandshake, CircleOff, Wind, Archive, Waypoints } from 'lucide-react';
import { GiUdder } from 'react-icons/gi';
import { DEFAULT_CONFIG } from '../types/config';

// Definición centralizada de iconos y colores
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

// Función local para cálculo de edad en meses (para no depender de imports circulares)
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

        // --- 1. Lógica de Machos ---
        if (animal.sex === 'Macho') {
            const activeSeasons = breedingSeasons.filter(s => s.status === 'Activo');
            const activeSeasonIds = new Set(activeSeasons.map(s => s.id));
            const isActiveSire = sireLots.some(sl => sl.sireId === animal.id && activeSeasonIds.has(sl.seasonId));
            
            if (isActiveSire) {
                activeStatuses.push(STATUS_DEFINITIONS.SIRE_IN_SERVICE);
            }
            return activeStatuses; // Los machos no tienen otros estados
        }

        // --- 2. Lógica de Hembras (RECONSTRUIDA) ---
        
        // A. Buscar el último parto para determinar estado productivo
        const animalParturitions = parturitions
            .filter(p => p.goatId === animal.id)
            .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime());
            
        const lastParturition = animalParturitions[0];
        const hasCalved = animalParturitions.length > 0;

        // B. Estado de Lactancia (Productivo)
        if (lastParturition) {
            if (lastParturition.status === 'activa') activeStatuses.push(STATUS_DEFINITIONS.MILKING);
            else if (lastParturition.status === 'en-secado') activeStatuses.push(STATUS_DEFINITIONS.DRYING_OFF);
            else if (lastParturition.status === 'seca') activeStatuses.push(STATUS_DEFINITIONS.DRY);
        }

        // C. Determinación de "Vientre" (Aptitud Reproductiva)
        // Un animal es vientre si ya parió O si tiene la edad mínima configurada.
        const config = appConfig || DEFAULT_CONFIG;
        const ageInMonths = calculateAgeInMonths(animal.birthDate);
        
        // Usamos 6 meses como fallback de seguridad si no hay config
        const minVientreAge = config.edadMinimaVientreMeses > 0 ? config.edadMinimaVientreMeses : 6;
        
        // Si es Cabra (ya parió) es Vientre. Si es Cabritona vieja (>6m), es Vientre.
        const isVientre = hasCalved || (ageInMonths >= minVientreAge);

        // D. Estado Reproductivo (Gestación/Servicio)
        let isPregnantOrConfirmed = false;
        let isJustInService = false;

        if (animal.reproductiveStatus === 'Preñada') {
            activeStatuses.push(STATUS_DEFINITIONS.PREGNANT);
            isPregnantOrConfirmed = true;

        } else if (animal.reproductiveStatus === 'En Servicio') {
            // Verificamos si tiene un registro de monta específico
            const hasServiceRecord = serviceRecords.some(sr => sr.femaleId === animal.id && sr.sireLotId === animal.sireLotId);
            
            if (hasServiceRecord) {
                activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE_CONFIRMED);
                isPregnantOrConfirmed = true; // Lo tratamos como "comprometido"
            } else {
                activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE);
                isJustInService = true;
            }
        }
        
        // E. Lógica de "Vacía" (CORREGIDA)
        // Solo mostramos "Vacía" si es un Vientre apto que NO está preñada ni en servicio.
        if (isVientre && !isPregnantOrConfirmed && !isJustInService) {
            activeStatuses.push(STATUS_DEFINITIONS.EMPTY);
        }
        
        // F. Limpieza y Retorno
        // Eliminamos duplicados por si acaso
        const uniqueKeys = Array.from(new Set(activeStatuses.map(s => s.key)));
        return uniqueKeys.map(key => STATUS_DEFINITIONS[key as AnimalStatusKey]).filter(Boolean);

    }, [animal, parturitions, serviceRecords, breedingSeasons, sireLots, appConfig]);

    return statuses;
};