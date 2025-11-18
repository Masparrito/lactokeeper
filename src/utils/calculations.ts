// src/utils/calculations.ts
// (CORREGIDO: Arregla el bug de '168 años' (Date.UTC) y aplica la lógica 'Nativo vs. Registrado')
// (CORREGIDO: Error de lógica en 'calculateGDP' (Overall))

import { BodyWeighing, Animal, Parturition, ServiceRecord, SireLot, BreedingSeason } from '../db/local';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';
import { AppConfig, DEFAULT_CONFIG } from '../types/config';

/**
 * Calcula la edad de un animal en días completados.
 */
export const calculateAgeInDays = (birthDate: string, comparisonDateStr?: string): number => {
    if (!birthDate || birthDate === 'N/A') return -1;
    
    const birth = new Date(birthDate + 'T00:00:00Z');
    
    let today: Date;
    if (comparisonDateStr) {
        // Usar la fecha de comparación (ej. para un pesaje)
        today = new Date(comparisonDateStr + 'T00:00:00Z');
    } else {
        // (ESTA ES LA CORRECCIÓN DEL BUG DE 168 AÑOS)
        // Usar la fecha de "hoy"
        const now = new Date();
        today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    }

    if (isNaN(birth.getTime()) || isNaN(today.getTime())) return -1;

    const diffTime = today.getTime() - birth.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

/**
 * Calcula la edad de un animal en MESES completados, usando la edad en días.
 */
export const calculateAgeInMonths = (birthDate: string): number => {
    const ageInDays = calculateAgeInDays(birthDate);
    if (ageInDays < 0) return 0;
    const avgDaysInMonth = 30.4375; 
    return Math.floor(ageInDays / avgDaysInMonth);
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
 */
export const getAnimalZootecnicCategory = (
    animal: Animal, 
    parturitions: Parturition[],
    appConfig: AppConfig // Mantenido para la lógica de Macho
): string => {
    
    const config = { ...DEFAULT_CONFIG, ...appConfig };

    // 1. Determinar si el animal es "Nativo" (nacido dentro de la app)
    // Un animal es nativo si su ID aparece en la lista de 'liveOffspring' de un parto
    const isNativo = parturitions.some(p => 
        p.liveOffspring && p.liveOffspring.some(kid => kid.id === animal.id)
    );

    if (animal.sex === 'Hembra') {
        const hasCalved = parturitions.some(p => p.goatId === animal.id);

        // --- (NUEVA LÓGICA HÍBRIDA: NATIVO vs. REGISTRADO) ---

        // REGLA A: Lógica para ANIMALES NATIVOS (basada en eventos)
        if (isNativo) {
            // A.1. Si ha parido -> Cabra
            if (hasCalved) {
                return 'Cabra';
            }
            // A.2. Si no ha parido, pero está destetada -> Cabritona
            if (animal.weaningDate) {
                return 'Cabritona';
            }
            // A.3. Si no ha parido y no está destetada -> Cabrita
            return 'Cabrita';
        
        } else {
        // REGLA B: Lógica para ANIMALES REGISTRADOS (importados)
            
            // B.1. Excepción: Si el usuario la registró como "Cabritona" pero
            // luego le registró un parto manual, se actualiza a "Cabra".
            if (hasCalved) {
                return 'Cabra';
            }
            
            // B.2. Devolver la categoría asignada al momento del registro.
            // (Soluciona "A451" y el bug de "65 Crías")
            return animal.lifecycleStage || 'Indefinido';
        }

    } else { 
        // Lógica de Macho (sigue basándose en edad, lo cual es correcto)
        
        const ageInDays = calculateAgeInDays(animal.birthDate);
        if (ageInDays < 0) {
             // Si no hay fecha, respetar la categoría manual
             return animal.lifecycleStage || 'Indefinido';
        }
        const ageInMonths = calculateAgeInMonths(animal.birthDate);

        // 1. Regla CABRITO: (0d a ej: 90d)
        if (ageInDays <= config.categoriaCabritoEdadMaximaDias) {
            return 'Cabrito';
        }
        // 2. Regla MACHO LEVANTE: (ej: 91d a 12m)
        if (ageInMonths <= config.categoriaMachoLevanteEdadMaximaMeses) {
            return 'Macho de Levante';
        }
        // 3. Regla REPRODUCTOR: (ej: > 12m)
        else { 
            return 'Reproductor';
        }
    }
};


// ... (Resto de las funciones 'calculateDEL', 'calculateWeightedScore', etc., sin cambios) ...
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
 * (CORREGIDO: Ahora acepta 'birthDate' y calcula 'overall' correctamente)
 */
export const calculateGDP = (
    birthDate: string | undefined,
    birthWeight: number | undefined, 
    weighings: BodyWeighing[]
): { overall: number | null, recent: number | null } => {
    
    // --- GDP Reciente (entre los dos últimos pesajes) ---
    let recent: number | null = null;
    if (weighings.length >= 2) {
        // Asegurarse de que están ordenados por fecha
        const sortedWeighings = [...weighings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const last = sortedWeighings[sortedWeighings.length - 1];
        const secondLast = sortedWeighings[sortedWeighings.length - 2];
        
        const daysBetween = (new Date(last.date).getTime() - new Date(secondLast.date).getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysBetween > 0) {
            recent = (last.kg - secondLast.kg) / daysBetween;
        }
    }
    
    // --- GDP General (Desde el nacimiento hasta el último pesaje) ---
    let overall: number | null = null;
    
    // Se necesita fecha de nacimiento, peso al nacer y al menos un pesaje
    if (birthDate && birthDate !== 'N/A' && birthWeight && birthWeight > 0 && weighings.length > 0) {
        
        // Encontrar el último pesaje (el array puede no venir ordenado)
        const latestWeighing = [...weighings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        // Calcular la edad del animal *en el día de ese último pesaje*
        const ageAtLastWeighing = calculateAgeInDays(birthDate, latestWeighing.date);
        
        if (ageAtLastWeighing > 0) {
            const totalGain = latestWeighing.kg - birthWeight;
            overall = totalGain / ageAtLastWeighing;
        }
    }
    
    // Devolver ambos valores (Nota: 'recent' se calcula en kg/día, 'overall' también)
    return { overall, recent };
};


/**
 * Estima el peso de un animal en una edad objetivo usando interpolación lineal.
 */
export const getInterpolatedWeight = (weighings: BodyWeighing[], birthDate: string, targetAgeInDays: number): number | null => {
    // (CORRECCIÓN IMPORTANTE) La función de interpolación debe incluir el peso al nacer como el punto '0'.
    
    const weighingsWithAge = weighings
        .map(w => ({
            age: (new Date(w.date).getTime() - new Date(birthDate + 'T00:00:00Z').getTime()) / (1000 * 60 * 60 * 24),
            kg: w.kg,
        }))
        .sort((a, b) => a.age - b.age);
    
    // El 'weighings' que entra aquí YA DEBE contener el peso al nacer.
    // La lógica en 'GrowthProfilePage.tsx' se asegura de esto.
    
    if (weighingsWithAge.length < 1) return null;

    // Buscar el punto exacto, anterior y siguiente
    const exactMatch = weighingsWithAge.find(w => w.age === targetAgeInDays);
    if (exactMatch) return exactMatch.kg;
    
    const before = weighingsWithAge.filter(w => w.age < targetAgeInDays).pop();
    const after = weighingsWithAge.find(w => w.age > targetAgeInDays);

    // Si tenemos un punto antes y uno después, interpolamos
    if (before && after) {
        if (before.age === after.age) return before.kg; // Evitar división por cero

        const ageRange = after.age - before.age;
        if (ageRange === 0) return before.kg;

        const weightRange = after.kg - before.kg;
        const ageOffset = targetAgeInDays - before.age;
        
        const interpolatedWeight = before.kg + (ageOffset / ageRange) * weightRange;
        
        return parseFloat(interpolatedWeight.toFixed(2));
    }
    
    // Si no hay un punto "después" (ej. 90 días, pero el animal tiene 80)
    // Devolvemos null porque no podemos predecir el futuro.
    return null;
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

// --- ÍNDICE DE DESTETE ---
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

// --- ÍNDICE DE PRECOCIDAD ---
export const calculatePrecocityIndex = (animal: Animal, allWeighings: BodyWeighing[]): number | null => {
    const animalWeighings = allWeighings.filter(w => w.animalId === animal.id);
    
    // (CORRECCIÓN) Asegurarse de que el peso al nacer se incluya para la interpolación
    if (animal.birthWeight && animal.birthDate) {
        animalWeighings.unshift({
            id: 'birth_weight_temp',
            animalId: animal.id,
            date: animal.birthDate,
            kg: animal.birthWeight,
            userId: animal.userId,
            _synced: true
        });
    }
    
    return getInterpolatedWeight(animalWeighings, animal.birthDate, 210); // 7 meses = 210 días
};

// --- FUNCIÓN EXISTENTE ---
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


// --- Lógica de Composición Racial RESTAURADA ---
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