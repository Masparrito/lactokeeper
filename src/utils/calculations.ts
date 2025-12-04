import { BodyWeighing, Animal, Parturition, ServiceRecord, SireLot, BreedingSeason, Event as AppEvent } from '../db/local';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../hooks/useAnimalStatus';
import { AppConfig } from '../types/config'; 

// -------------------------------------------------------------------------
// --- CÁLCULOS DE TIEMPO Y EDAD ---
// -------------------------------------------------------------------------

export const calculateAgeInDays = (birthDate: string | undefined | null, comparisonDateStr?: string): number => {
    if (!birthDate || birthDate === 'N/A' || birthDate === '') return -1;
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
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

export const calculateAgeInMonths = (birthDate: string | undefined | null): number => {
    const ageInDays = calculateAgeInDays(birthDate);
    if (ageInDays < 0) return 0;
    return Math.floor(ageInDays / 30.4375);
};

export const formatAge = (birthDate: string | undefined | null): string => {
    const totalDays = calculateAgeInDays(birthDate);
    if (totalDays < 0) return 'N/A';
    if (totalDays <= 60) return `${totalDays} día${totalDays !== 1 ? 's' : ''}`;
    const totalMonths = Math.floor(totalDays / 30.4375);
    if (totalMonths < 12) {
        const remDays = Math.round(totalDays % 30.4375);
        return `${totalMonths} mes${totalMonths !== 1 ? 'es' : ''}${remDays > 0 ? ` y ${remDays} d` : ''}`;
    }
    const years = Math.floor(totalMonths / 12);
    const months = Math.round(totalMonths % 12);
    return `${years} año${years !== 1 ? 's' : ''}${months > 0 ? ` y ${months} m` : ''}`;
};

// -------------------------------------------------------------------------
// --- LÓGICA ZOOTÉCNICA (JUEZ SUPREMO) ---
// -------------------------------------------------------------------------

export const getAnimalZootecnicCategory = (
    animal: Animal, 
    parturitions: Parturition[],
    _appConfig?: AppConfig,
    allAnimals: Animal[] = [] 
): string => {
    
    const ageInMonths = calculateAgeInMonths(animal.birthDate);
    const animalId = animal.id.toUpperCase().trim();

    // Normalización de etiquetas
    const currentStageLabel = (animal.lifecycleStage || '').toString();
    const reproStatus = (animal.reproductiveStatus || '').toString();
    const location = (animal.location || '').toString().toLowerCase();

    // Detectar si está registrada como adulta manualmente (Cabra, Primípara, Multípara)
    // y asegurarnos de que NO sea "Cabrita" o "Cabritona"
    const isRegisteredAsAdultGoat = currentStageLabel.includes('Cabra') && 
                                   !currentStageLabel.includes('Cabrit') && 
                                   !currentStageLabel.includes('cabrit');

    if (animal.sex === 'Hembra') {
        
        // 1. EVIDENCIA PRODUCTIVA (PRIORIDAD ABSOLUTA)
        // Si está produciendo leche, ES UNA CABRA.
        if (
            reproStatus === 'En Ordeño' || 
            reproStatus === 'Lactante' || 
            reproStatus === 'Seca' || 
            location.includes('ordeño')
        ) {
            return 'Cabra';
        }

        // 2. EVIDENCIA DE MATERNIDAD
        // A. Partos registrados
        const hasParturitionRecord = parturitions.some(p => 
            p.goatId.toUpperCase().trim() === animalId && 
            ['Normal', 'Con Mortinatos', 'Aborto'].includes(p.parturitionOutcome || '')
        );
        // B. Hijos registrados (Madre biológica)
        const hasProgeny = allAnimals.some(kid => kid.motherId?.toUpperCase().trim() === animalId);

        if (hasParturitionRecord || hasProgeny) return 'Cabra';

        // 3. RESPETO A LA CARGA MANUAL
        if (isRegisteredAsAdultGoat) return 'Cabra';

        // 4. EVIDENCIA CRONOLÓGICA (EDAD)
        
        // A. Umbral de Adultez (> 20 meses) -> Cabra
        if (ageInMonths >= 20) return 'Cabra';

        // B. Umbral de Desarrollo (> 8 meses) -> Cabritona
        if (ageInMonths >= 8) {
            return 'Cabritona';
        }

        // 5. EVIDENCIA DE MANEJO (DESTETE)
        if (animal.weaningDate || animal.weaningWeight || currentStageLabel === 'Cabritona') {
            return 'Cabritona';
        }

        // 6. DEFECTO
        return 'Cabrita';

    } else { 
        // MACHOS
        const hasOffspring = allAnimals.some(kid => kid.fatherId?.toUpperCase().trim() === animalId);
        if (hasOffspring) return 'Reproductor';

        if (ageInMonths > 12) return 'Reproductor';
        if (currentStageLabel === 'Reproductor') return 'Reproductor';
        
        if (animal.weaningDate || currentStageLabel === 'Macho de Levante' || ageInMonths >= 8) {
            return 'Macho de Levante';
        }

        return 'Cabrito';
    }
};

export const isEligibleForBreeding = (animal: Animal, minAgeConfigMonths: number = 0): boolean => {
    if (animal.sex !== 'Hembra' || animal.status !== 'Activo') return false;
    const ageInMonths = calculateAgeInMonths(animal.birthDate);
    const effectiveMinAge = minAgeConfigMonths > 0 ? minAgeConfigMonths : 6;
    
    const currentStageLabel = (animal.lifecycleStage || '').toString();
    const isAdult = currentStageLabel.includes('Cabra') && !currentStageLabel.includes('Cabrit');

    if (ageInMonths === 0 && (isAdult || currentStageLabel === 'Cabritona')) return true;
    
    return ageInMonths >= effectiveMinAge;
};

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
    
    return Array.from(new Set(activeStatuses.map(s => s.key))).map(key => STATUS_DEFINITIONS[key as AnimalStatusKey]);
};

// --- HELPERS DE PESO Y PRODUCCIÓN ---

export const calculateDEL = (parturitionDate: string, weighDate: string): number => {
    const pDate = new Date(parturitionDate + 'T00:00:00Z');
    const wDate = new Date(weighDate + 'T00:00:00Z');
    if (isNaN(pDate.getTime()) || isNaN(wDate.getTime())) return 0;
    const diffTime = wDate.getTime() - pDate.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
};

export const calculateWeightedScore = (kg: number, del: number): number => {
 const idealPeakDay = 50; 
 const weightFactor = 1 + ((del - idealPeakDay) / (del + idealPeakDay));
 const weightedScore = kg * Math.max(0.5, weightFactor); 
 return parseFloat(weightedScore.toFixed(2));
};

export const calculateGDP = (
    birthDate: string | undefined,
    birthWeight: number | undefined, 
    weighings: BodyWeighing[]
): { overall: number | null, recent: number | null } => {
    let recent: number | null = null;
    if (weighings.length >= 2) {
        const sortedWeighings = [...weighings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const last = sortedWeighings[sortedWeighings.length - 1];
        const secondLast = sortedWeighings[sortedWeighings.length - 2];
        const daysBetween = (new Date(last.date).getTime() - new Date(secondLast.date).getTime()) / (1000 * 60 * 60 * 24);
        if (daysBetween > 0) {
            recent = (last.kg - secondLast.kg) / daysBetween;
        }
    }
    let overall: number | null = null;
    if (birthDate && birthDate !== 'N/A' && birthWeight && birthWeight > 0 && weighings.length > 0) {
        const sorted = [...weighings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestWeighing = sorted[0];
        const ageAtLastWeighing = calculateAgeInDays(birthDate, latestWeighing.date);
        if (ageAtLastWeighing > 0) {
            overall = (latestWeighing.kg - birthWeight) / ageAtLastWeighing;
        }
    }
    return { overall, recent };
};

export const getInterpolatedWeight = (weighings: BodyWeighing[], birthDate: string, targetAgeInDays: number): number | null => {
    const weighingsWithAge = weighings.map(w => ({
        age: (new Date(w.date).getTime() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24),
        kg: w.kg,
    })).sort((a, b) => a.age - b.age);

    if (weighingsWithAge.length < 1) return null;

    const closeMatch = weighingsWithAge.find(w => Math.abs(w.age - targetAgeInDays) <= 5);
    if (closeMatch) return closeMatch.kg;

    const before = weighingsWithAge.filter(w => w.age < targetAgeInDays).pop();
    const after = weighingsWithAge.find(w => w.age > targetAgeInDays);

    if (before && after) {
        const ageRange = after.age - before.age;
        if (ageRange === 0) return before.kg;
        const weightRange = after.kg - before.kg;
        const ageOffset = targetAgeInDays - before.age;
        const interpolatedWeight = before.kg + (ageOffset / ageRange) * weightRange;
        return parseFloat(interpolatedWeight.toFixed(2));
    }

    return null;
};

export const calculateGrowthScore = (
    currentWeight: number, 
    targetWeight: number,
    milestoneStatus?: { d90: string, d180: string, d270: string, service: string }
): number => {
    if (!targetWeight || targetWeight === 0) return 0;
    const ratio = currentWeight / targetWeight;
    let baseScore = Math.min(ratio * 100, 100);
    if (milestoneStatus) {
        if (milestoneStatus.d90 === 'missed') baseScore -= 10;
        if (milestoneStatus.d180 === 'missed') baseScore -= 10;
        if (milestoneStatus.d270 === 'missed') baseScore -= 10;
        if (milestoneStatus.service === 'missed') baseScore -= 20;
    }
    const finalScore = Math.max(baseScore, 0) / 10;
    return parseFloat(finalScore.toFixed(1));
};

export const calculateWeaningIndex = (animal: Animal): number | null => {
    if (!animal.weaningWeight || !animal.weaningDate || !animal.birthWeight || !animal.birthDate) return null;
    const ageAtWeaning = (new Date(animal.weaningDate).getTime() - new Date(animal.birthDate).getTime()) / (1000 * 60 * 60 * 24);
    if (ageAtWeaning <= 0) return null;
    const gdpToWeaning = (animal.weaningWeight - animal.birthWeight) / ageAtWeaning;
    const adjustedWeight = animal.birthWeight + (gdpToWeaning * 60); 
    return parseFloat(adjustedWeight.toFixed(2));
};

export const calculatePrecocityIndex = (animal: Animal, allWeighings: BodyWeighing[]): number | null => {
    const animalWeighings = allWeighings.filter(w => w.animalId === animal.id);
    if (animal.birthWeight && animal.birthDate) {
        const birthRecord: any = { date: animal.birthDate, kg: animal.birthWeight };
        animalWeighings.push(birthRecord);
    }
    return getInterpolatedWeight(animalWeighings, animal.birthDate, 210); 
};

export const calculateTargetWeightAtAge = (ageInDays: number, sex: 'Hembra' | 'Macho', appConfig: AppConfig): number => {
    const getNum = (key: keyof AppConfig, defaultVal: number): number => {
        const val = Number(appConfig[key]);
        return (isNaN(val) || val === 0) ? defaultVal : val;
    };

    const birthWeight = getNum('growthGoalBirthWeight', 3.5);
    const weaningWeight = (sex === 'Macho') ? getNum('growthGoalWeaningWeightMale', 16) : getNum('pesoMinimoDesteteFinal', 15);
    const d90Weight = (sex === 'Macho') ? getNum('growthGoal90dWeightMale', 22) : getNum('growthGoal90dWeight', 20);
    const d180Weight = (sex === 'Macho') ? getNum('growthGoal180dWeightMale', 30) : getNum('growthGoal180dWeight', 28);
    const d270Weight = getNum('growthGoal270dWeight', 34);
    const serviceWeight = getNum('pesoPrimerServicioKg', 38);
    
    const weaningDays = getNum('diasMetaDesteteFinal', 60);
    const serviceDays = Math.floor(getNum('edadPrimerServicioMeses', 10) * 30.44);

    const targetCurve = [
        { age: 0, weight: birthWeight },
        { age: weaningDays, weight: weaningWeight },
        { age: 90, weight: d90Weight },
        { age: 180, weight: d180Weight },
        { age: 270, weight: d270Weight },
        { age: serviceDays, weight: serviceWeight },
    ].sort((a, b) => a.age - b.age); 

    for (let i = 0; i < targetCurve.length - 1; i++) {
        const p1 = targetCurve[i];
        const p2 = targetCurve[i+1];
        if (ageInDays >= p1.age && ageInDays <= p2.age) {
            const range = p2.age - p1.age;
            const weightDiff = p2.weight - p1.weight;
            if (range === 0) return p2.weight;
            const progress = (ageInDays - p1.age) / range;
            return p1.weight + (progress * weightDiff);
        }
    }
    const lastPoint = targetCurve[targetCurve.length - 1];
    if (ageInDays > lastPoint.age) return lastPoint.weight;
    return birthWeight; 
};

// -------------------------------------------------------------------------
// --- HELPERS DE RAZAS ---
// -------------------------------------------------------------------------

const RAZAS_BASE = { 'A': 'Alpina', 'S': 'Saanen', 'AN': 'Anglo Nubian', 'AGC': 'Canaria', 'T': 'Toggenburger', 'C': 'Criolla' };

// Función exportada para uso en otros módulos
export const parseComposition = (composition: string | undefined): Map<string, number> => {
    const map = new Map<string, number>();
    if (!composition) return map;
    const regex = /(\d+(\.\d+)?)%?([A-Z]+)/g;
    let match;
    while ((match = regex.exec(composition.toUpperCase())) !== null) {
        const percentage = parseFloat(match[1]);
        const code = match[3];
        if (!isNaN(percentage) && Object.keys(RAZAS_BASE).includes(code)) {
            map.set(code, (map.get(code) || 0) + percentage);
        }
    }
    return map;
};

// Función exportada
export const formatComposition = (compositionMap: Map<string, number>): string => {
    if (compositionMap.size === 0) return '';
    const sorted = Array.from(compositionMap.entries()).filter(([, perc]) => perc > 0).sort((a, b) => b[1] - a[1]);
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
    
    // Fix TS18046
    const sorted = Array.from(map.entries()).sort((a: [string, number], b: [string, number]) => b[1] - a[1]);
    
    if(sorted.length === 0) return '';
    
    // Fix TS2488
    const firstEntry = sorted[0];
    const primaryCode = firstEntry[0];
    const primaryPerc = firstEntry[1];

    const PURE_THRESHOLD = 96.9; 
    
    // @ts-ignore
    const razaBase = RAZAS_BASE[primaryCode] || 'Mestiza';
    
    for (const [code, perc] of sorted) {
        if (perc >= PURE_THRESHOLD) {
            // @ts-ignore
            const razaPura = RAZAS_BASE[code];
            if (razaPura) return `${razaPura} Pura`;
        }
    }
    if (primaryPerc > 0 && razaBase !== 'Mestiza') return `Mestiza ${razaBase}`;
    return 'Mestiza'; 
};

// -------------------------------------------------------------------------
// --- ESTADOS DE CRECIMIENTO ---
// -------------------------------------------------------------------------

export interface GrowthStatus {
    isReadyForWeaning: boolean;
    isReadyForService: boolean;
    currentWeight: number;
    currentWeightDate: string;
    
    milestoneStatus: {
        weaning: 'met' | 'missed' | 'close' | 'pending';
        d90: 'met' | 'missed' | 'close' | 'pending';
        d180: 'met' | 'missed' | 'close' | 'pending';
        d270: 'met' | 'missed' | 'close' | 'pending';
        service: 'met' | 'missed' | 'close' | 'pending';
    };
}

const evaluateServiceTiming = (ageAtEvent: number, targetAge: number): 'met' | 'close' | 'missed' => {
    const diff = ageAtEvent - targetAge;
    if (diff <= 0) return 'met'; 
    if (diff <= -30) return 'met'; 
    if (diff > 0 && diff <= 30) return 'close'; 
    return 'missed'; 
};

const getMilestoneStatus = (
    actual: number | null, 
    target: number, 
    ageInDays: number, 
    targetDay: number, 
    toleranceGreen: number, 
    toleranceYellow: number 
): 'met' | 'missed' | 'close' | 'pending' => {
    
    if (actual === null) {
        if (ageInDays > targetDay + 30) return 'missed'; 
        return 'pending';
    }
    
    if (actual >= target - toleranceGreen) return 'met';
    if (actual >= target - toleranceYellow) return 'close';
    return 'missed';
};

export const getGrowthStatus = (
    animal: Animal, 
    weighings: BodyWeighing[], 
    appConfig: AppConfig,
    events: AppEvent[] = [] 
): GrowthStatus => {
    
    const ageInDays = calculateAgeInDays(animal.birthDate);
    if (ageInDays < 0) return { 
        isReadyForWeaning: false, 
        isReadyForService: false, 
        currentWeight: 0, 
        currentWeightDate: new Date().toISOString().split('T')[0],
        milestoneStatus: { weaning: 'pending', d90: 'pending', d180: 'pending', d270: 'pending', service: 'pending' }
    };

    const animalWeighings = weighings
        .filter(w => w.animalId === animal.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const allPointsForInterpolation = [...animalWeighings];
    if (animal.birthWeight && animal.birthDate && animal.birthDate !== 'N/A') {
        const hasBirthRecord = animalWeighings.some(w => w.date === animal.birthDate);
        if (!hasBirthRecord) {
            allPointsForInterpolation.unshift({
                id: 'birth',
                animalId: animal.id,
                date: animal.birthDate,
                kg: animal.birthWeight,
                userId: animal.userId || '',
                _synced: true
            });
        }
    }
    allPointsForInterpolation.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let currentWeight = animal.birthWeight || 0;
    let currentWeightDate = new Date().toISOString().split('T')[0];

    if (animalWeighings.length > 0) {
        const latest = animalWeighings[animalWeighings.length - 1]; 
        currentWeight = latest.kg;
        currentWeightDate = latest.date;
    }

    const getVal = (key: keyof AppConfig, def: number) => Number(appConfig[key]) || def;

    const weaningDays = getVal('diasMetaDesteteFinal', 60);
    const weaningKg = (animal.sex === 'Macho') ? getVal('growthGoalWeaningWeightMale', 16) : getVal('pesoMinimoDesteteFinal', 15);
    const isWeaningLate = ageInDays > (weaningDays + 10);
    const isHistoricalEntry = animalWeighings.length > 0 && animalWeighings[0].kg > 14;
    const isReadyForWeaning = !animal.weaningDate && animal.status === 'Activo' && !isHistoricalEntry && ageInDays >= weaningDays && currentWeight >= 9.5;

    const serviceTargetDays = Math.floor(getVal('edadPrimerServicioMeses', 11) * 30.44);
    const serviceTargetKg = getVal('pesoPrimerServicioKg', 30);
    const serviceEvent = events.find(e => e.animalId === animal.id && e.type === 'Peso de Monta');
    
    let serviceHitoStatus: 'met' | 'missed' | 'close' | 'pending' = 'pending';

    if (serviceEvent) {
        const ageAtEvent = calculateAgeInDays(animal.birthDate, serviceEvent.date);
        serviceHitoStatus = evaluateServiceTiming(ageAtEvent, serviceTargetDays);
    } else {
        const qualifierWeight = animalWeighings.find(w => w.kg >= serviceTargetKg);
        if (qualifierWeight) {
             const ageAtQualifier = calculateAgeInDays(animal.birthDate, qualifierWeight.date);
             serviceHitoStatus = evaluateServiceTiming(ageAtQualifier, serviceTargetDays);
             currentWeightDate = qualifierWeight.date; 
        } else {
            if (ageInDays > serviceTargetDays + 60) serviceHitoStatus = 'missed';
        }
    }

    const w90Target = (animal.sex === 'Macho') ? getVal('growthGoal90dWeightMale', 20) : getVal('growthGoal90dWeight', 20);
    const w180Target = (animal.sex === 'Macho') ? getVal('growthGoal180dWeightMale', 28) : getVal('growthGoal180dWeight', 28);
    const w270Target = getVal('growthGoal270dWeight', 34);

    const getWeightAt = (days: number) => getInterpolatedWeight(allPointsForInterpolation, animal.birthDate, days);

    const milestoneStatus = {
        weaning: animal.weaningWeight ? 'met' : (isWeaningLate ? 'close' : getMilestoneStatus(getWeightAt(weaningDays), weaningKg, ageInDays, weaningDays, 2.0, 3.0)),
        d90: getMilestoneStatus(getWeightAt(90), w90Target, ageInDays, 90, 0.5, 0.9),
        d180: getMilestoneStatus(getWeightAt(180), w180Target, ageInDays, 180, 0.5, 1.0),
        d270: getMilestoneStatus(getWeightAt(270), w270Target, ageInDays, 270, 0.5, 1.5),
        service: serviceHitoStatus 
    };

    const isReadyForService = 
        !serviceEvent &&
        animal.sex === 'Hembra' &&
        (animal.reproductiveStatus === 'Vacía' || animal.reproductiveStatus === 'No Aplica' || !animal.reproductiveStatus) &&
        ageInDays >= 300 &&    
        currentWeight >= serviceTargetKg;  

    return {
        isReadyForWeaning,
        isReadyForService,
        currentWeight,
        currentWeightDate,
        milestoneStatus
    };
};