// src/utils/calculations.ts (SIN CAMBIOS)

import { BodyWeighing, Animal, Parturition, ServiceRecord, SireLot, BreedingSeason } from '../db/local';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';
// (NUEVO) Importar AppConfig y el default
import { AppConfig, DEFAULT_CONFIG } from '../types/config';

/**
 * Calcula la edad de un animal en días completados.
 * (Acepta una segunda fecha opcional para calcular la edad en un punto específico)
 */
export const calculateAgeInDays = (birthDate: string, comparisonDateStr?: string): number => {
    if (!birthDate || birthDate === 'N/A') return -1;
    
    const birth = new Date(birthDate + 'T00:00:00Z');
    
    let today: Date;
    if (comparisonDateStr) {
        today = new Date(comparisonDateStr + 'T00:00:00Z');
    } else {
        const now = new Date();
        today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }

    if (isNaN(birth.getTime()) || isNaN(today.getTime())) return -1;

    const diffTime = today.getTime() - birth.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

// Helper de meses (movido aquí para ser central)
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


/**
 * Formatea la edad de un animal según las reglas especificadas.
 */
export const formatAge = (birthDate: string): string => {
    const totalDays = calculateAgeInDays(birthDate);

    if (totalDays < 0) return 'N/A';
    if (totalDays <= 60) {
        return `${totalDays} día${totalDays !== 1 ? 's' : ''}`;
    }

    const avgDaysInMonth = 30.4375;
    const totalMonths = Math.floor(totalDays / avgDaysInMonth);

    if (totalMonths < 12) {
        const remainingDays = Math.round(totalDays % avgDaysInMonth);
        return `${totalMonths} mes${totalMonths !== 1 ? 'es' : ''}${remainingDays > 0 ? ` y ${remainingDays} día${remainingDays !== 1 ? 's' : ''}` : ''}`;
    }

    const totalYears = Math.floor(totalMonths / 12);
    const remainingMonths = Math.round(totalMonths % 12);
    return `${totalYears} año${totalYears !== 1 ? 's' : ''}${remainingMonths > 0 ? ` y ${remainingMonths} mes${remainingMonths !== 1 ? 'es' : ''}` : ''}`;
};

/**
 * Determina el estado fisiológico (categoría zootécnica) de un animal.
 * ¡ESTA ES AHORA LA ÚNICA FUENTE DE VERDAD!
 */
export const getAnimalZootecnicCategory = (
    animal: Animal, 
    parturitions: Parturition[],
    appConfig: AppConfig // (NUEVO) Acepta la configuración
): string => {
    
    // Usar la config o el default
    const config = { ...DEFAULT_CONFIG, ...appConfig };

    const ageInDays = calculateAgeInDays(animal.birthDate);
    if (ageInDays < 0) return 'Indefinido';
    const ageInMonths = calculateAgeInMonths(animal.birthDate);

    if (animal.sex === 'Hembra') {
        const hasCalved = parturitions.some(p => p.goatId === animal.id);

        // REGLA 1 (Prioridad Máxima): Si ha parido, SIEMPRE es "Cabra".
        if (hasCalved) {
            return 'Cabra';
        }

        // REGLA 2: Si NO ha parido, clasificar por edad.
        
        // 2a. Cabrita (0d a ej: 90d)
        if (ageInDays <= config.categoriaCabritaEdadMaximaDias) {
            return 'Cabrita';
        }
        // 2b. Cabra (por edad, si la config lo permite)
        else if (ageInMonths > config.categoriaCabraEdadMinimaMeses && !config.categoriaCabraRequiereParto) {
            // Si es mayor de (ej) 12m Y la configuración NO requiere parto
            return 'Cabra';
        }
        // 2c. Cabritona (el resto)
        else {
            // Incluye:
            // 1. Hembras de (ej) 91d a 12m (sin parto).
            // 2. Hembras > 12m (sin parto) CUANDO el toggle "Requiere Parto" está ON.
            return 'Cabritona';
        }

    } else { // Macho
        
        // 1. Regla REPRODUCTOR:
        if (ageInMonths > config.categoriaMachoLevanteEdadMaximaMeses) {
            return 'Reproductor';
        }
        // 2. Regla MACHO LEVANTE:
        else if (ageInDays >= config.categoriaMachoLevanteEdadMinimaDias && ageInMonths <= config.categoriaMachoLevanteEdadMaximaMeses) {
            return 'Macho de Levante';
        }
        // 3. Regla CABRITO:
        else { 
            return 'Cabrito';
        }
    }
};


/**
 * Calcula los "Días en Leche" (DEL) para un pesaje específico.
 */
export const calculateDEL = (parturitionDate: string, weighDate: string): number => {
    const pDate = new Date(parturitionDate + 'T00:00:00Z');
    const wDate = new Date(weighDate + 'T00:00:00Z');
    if (isNaN(pDate.getTime()) || isNaN(wDate.getTime())) return 0;
    const diffTime = wDate.getTime() - pDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
};

/**
 * Calcula un puntaje ponderado para la producción de leche.
 */
export const calculateWeightedScore = (kg: number, del: number): number => {
 const idealPeakDay = 50; 
 const weightFactor = 1 + ((del - idealPeakDay) / (del + idealPeakDay));
 const weightedScore = kg * Math.max(0.5, weightFactor); 
 return parseFloat(weightedScore.toFixed(2));
};

/**
 * Calcula la Ganancia Diaria de Peso (GDP) de un animal.
 */
export const calculateGDP = (birthWeight: number | undefined, weighings: BodyWeighing[]): { overall: number | null, recent: number | null } => {
    if (weighings.length === 0) return { overall: null, recent: null };

    const sortedWeighings = [...weighings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestWeighing = sortedWeighings[sortedWeighings.length - 1];
    
    let overall: number | null = null;
    if (birthWeight && birthWeight > 0) {
        // (Lógica existente)
        const ageAtLastWeighing = calculateAgeInDays(latestWeighing.date);
        if (ageAtLastWeighing > 0) {
            overall = (latestWeighing.kg - birthWeight) / ageAtLastWeighing;
        }
    }
    
    let recent: number | null = null;
    if (sortedWeighings.length >= 2) {
        const last = latestWeighing;
        const secondLast = sortedWeighings[sortedWeighings.length - 2];
        const daysBetween = (new Date(last.date).getTime() - new Date(secondLast.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysBetween > 0) {
            recent = (last.kg - secondLast.kg) / daysBetween;
        }
    }
    
    return { overall, recent };
};

/**
 * Estima el peso de un animal en una edad objetivo usando interpolación lineal.
 */
export const getInterpolatedWeight = (weighings: BodyWeighing[], birthDate: string, targetAgeInDays: number): number | null => {
    const weighingsWithAge = weighings.map(w => ({
        age: (new Date(w.date).getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24),
        kg: w.kg,
    })).sort((a, b) => a.age - b.age);

    if (weighingsWithAge.length < 1) return null;

    const before = weighingsWithAge.filter(w => w.age <= targetAgeInDays).pop();
    const after = weighingsWithAge.find(w => w.age >= targetAgeInDays);

    if (before && before.age === targetAgeInDays) return before.kg;
    if (after && after.age === targetAgeInDays) return after.kg;

    if (!before || !after) return null;
    if (before.age === after.age) return before.kg;

    const ageRange = after.age - before.age;
    if (ageRange === 0) return before.kg;

    const weightRange = after.kg - before.kg;
    const ageOffset = targetAgeInDays - before.age;
    
    const interpolatedWeight = before.kg + (ageOffset / ageRange) * weightRange;
    
    return parseFloat(interpolatedWeight.toFixed(2));
};

/**
 * Calcula un índice de crecimiento ponderado que premia la precocidad.
 */
export const calculateGrowthScore = (individualGdp: number, averageGdp: number, ageInDays: number): number => {
    if (averageGdp === 0) return 100;
    const baseScore = (individualGdp / averageGdp) * 100;
    const ageFactor = 1 + ((180 - Math.min(ageInDays, 180)) / 180) * 0.1;
    return Math.round(baseScore * ageFactor);
};

// --- NUEVA FUNCIÓN: ÍNDICE DE DESTETE ---
export const calculateWeaningIndex = (animal: Animal): number | null => {
    if (!animal.weaningWeight || !animal.weaningDate || !animal.birthWeight || !animal.birthDate) {
        return null;
    }
    const ageAtWeaning = (new Date(animal.weaningDate).getTime() - new Date(animal.birthDate).getTime()) / (1000 * 60 * 60 * 24);
    if (ageAtWeaning <= 0) return null;

    const gdpToWeaning = (animal.weaningWeight - animal.birthWeight) / ageAtWeaning;
    const adjustedWeight = animal.birthWeight + (gdpToWeaning * 60); // Ajustado a 60 días
    return parseFloat(adjustedWeight.toFixed(2));
};

// --- NUEVA FUNCIÓN: ÍNDICE DE PRECOCIDAD ---
export const calculatePrecocityIndex = (animal: Animal, allWeighings: BodyWeighing[]): number | null => {
    const animalWeighings = allWeighings.filter(w => w.animalId === animal.id);
    return getInterpolatedWeight(animalWeighings, animal.birthDate, 210); // 7 meses = 210 días
};

// --- FUNCIÓN EXISTENTE ---
/**
 * Obtiene los objetos de estado activos para un animal específico.
 * ESTA FUNCIÓN ES OBSOLETA. La lógica real está en useAnimalStatus.ts
 */
export const getAnimalStatusObjects = (
    animal: Animal | undefined | null,
    allParturitions: Parturition[],
    allServiceRecords: ServiceRecord[],
    allSireLots: SireLot[],
    allBreedingSeasons: BreedingSeason[]
): (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] => {
    
    const activeStatuses: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] = [];
    if (!animal) return [];

    if (animal.sex === 'Hembra') {
        const lastParturition = allParturitions
            .filter(p => p.goatId === animal.id && p.status !== 'finalizada')
            .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];

        if (lastParturition) {
            if (lastParturition.status === 'activa') activeStatuses.push(STATUS_DEFINITIONS.MILKING);
            else if (lastParturition.status === 'en-secado') activeStatuses.push(STATUS_DEFINITIONS.DRYING_OFF);
            else if (lastParturition.status === 'seca') activeStatuses.push(STATUS_DEFINITIONS.DRY);
        }
    }

    if (animal.reproductiveStatus === 'Preñada') activeStatuses.push(STATUS_DEFINITIONS.PREGNANT);
    else if (animal.reproductiveStatus === 'En Servicio') {
        const hasServiceRecord = allServiceRecords.some(sr => sr.femaleId === animal.id && sr.sireLotId === animal.sireLotId);
        if (hasServiceRecord) activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE_CONFIRMED);
        else activeStatuses.push(STATUS_DEFINITIONS.IN_SERVICE);
    }
    else if (animal.reproductiveStatus === 'Vacía' || animal.reproductiveStatus === 'Post-Parto') {
         activeStatuses.push(STATUS_DEFINITIONS.EMPTY);
    }

    if (animal.sex === 'Macho') {
        const activeSeasons = allBreedingSeasons.filter(bs => bs.status === 'Activo');
        const activeSeasonIds = new Set(activeSeasons.map(s => s.id));
        const isActiveSire = allSireLots.some(sl => sl.sireId === animal.id && activeSeasonIds.has(sl.seasonId));
        if(isActiveSire) activeStatuses.push(STATUS_DEFINITIONS.SIRE_IN_SERVICE);
    }
    
    const uniqueKeys = Array.from(new Set(activeStatuses.map(s => s.key)));
    return uniqueKeys.map(key => STATUS_DEFINITIONS[key as AnimalStatusKey]);
};


// --- (INICIO CORRECCIÓN TS6133) ---
// Lógica de Composición Racial RESTAURADA

const RAZAS_BASE = {
    'A': 'Alpina',
    'S': 'Saanen',
    'AN': 'Anglo Nubian', 
    'AGC': 'Canaria',
    'T': 'Toggenburger',
    'C': 'Criolla',     
};

type BreedCode = keyof typeof RAZAS_BASE;

const parseComposition = (composition: string | undefined): Map<string, number> => {
    const map = new Map<string, number>();
    if (!composition) return map;

    const regex = /(\d+(\.\d+)?)%?([A-Z]+)/g;
    let match;
    
    while ((match = regex.exec(composition.toUpperCase())) !== null) {
        const percentage = parseFloat(match[1]);
        const code = match[3];
        const isValidCode = Object.keys(RAZAS_BASE).includes(code);

        if (!isNaN(percentage) && isValidCode) {
            map.set(code, (map.get(code) || 0) + percentage);
        }
    }
    return map;
};

const formatComposition = (compositionMap: Map<string, number>): string => {
    if (compositionMap.size === 0) return '';
    
    const sorted = Array.from(compositionMap.entries())
        .filter(([, perc]) => perc > 0)
        .sort((a, b) => b[1] - a[1]);

    return sorted.map(([code, perc]) => `${parseFloat(perc.toFixed(2))}%${code}`).join(' ');
};

export const calculateChildComposition = (motherComp: string | undefined, fatherComp: string | undefined): string => {
    const motherMap = parseComposition(motherComp);
    const fatherMap = parseComposition(fatherComp);

    const childMap = new Map<string, number>();
    const allCodes = new Set([...motherMap.keys(), ...fatherMap.keys()]);

    allCodes.forEach(code => {
        const motherPerc = motherMap.get(code) || 0;
        const fatherPerc = fatherMap.get(code) || 0;
        childMap.set(code, (motherPerc / 2) + (fatherPerc / 2));
    });

    return formatComposition(childMap);
};

export const calculateBreedFromComposition = (composition: string | undefined): string => {
    const map = parseComposition(composition);
    if (map.size === 0) return '';

    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    
    if(sorted.length === 0) return '';
    
    const [primaryCode, primaryPerc] = sorted[0];

    const PURE_THRESHOLD = 96.9; 

    const razaBase = RAZAS_BASE[primaryCode as BreedCode] || 'Mestiza';

    for (const [code, perc] of sorted) {
        if (perc >= PURE_THRESHOLD) {
            const razaPura = RAZAS_BASE[code as BreedCode];
            if (razaPura) return `${razaPura} Pura`;
        }
    }
    
    if (primaryPerc > 0 && razaBase !== 'Mestiza') {
        return `Mestiza ${razaBase}`;
    }

    return 'Mestiza'; // Fallback
};
// --- (FIN CORRECCIÓN TS6133) ---