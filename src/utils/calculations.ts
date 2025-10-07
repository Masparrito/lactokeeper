import { Animal, Parturition, BodyWeighing } from '../db/local';

/**
 * Calcula la edad de un animal en días completados.
 * Es una función interna robusta para ser usada por otras funciones.
 * @param birthDate La fecha de nacimiento del animal ('YYYY-MM-DD').
 * @returns El número de días de vida, o -1 si la fecha no es válida.
 */
export const calculateAgeInDays = (birthDate: string): number => {
    if (!birthDate || birthDate === 'N/A') return -1;
    
    const birth = new Date(birthDate + 'T00:00:00Z'); // Forzar UTC para consistencia
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    if (isNaN(birth.getTime())) return -1;

    const diffTime = todayUTC.getTime() - birth.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

/**
 * Formatea la edad de un animal según las reglas especificadas.
 * @param birthDate La fecha de nacimiento del animal ('YYYY-MM-DD').
 * @returns Un string con la edad formateada (ej: "45 días", "3 meses y 10 días", "2 años y 5 meses").
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
export const getAnimalZootecnicCategory = (animal: Animal, parturitions: Parturition[]): string => {
    const ageInDays = calculateAgeInDays(animal.birthDate);
    if (ageInDays < 0) return 'Indefinido';

    if (animal.sex === 'Hembra') {
        if (animal.weaningDate || ageInDays > 60) {
            const hasParturitions = parturitions.some(p => p.goatId === animal.id);
            if (hasParturitions) return 'Cabra';
            return 'Cabritona';
        }
        return 'Cabrita';
    } else { // Macho
        if (ageInDays >= 365) return 'Macho Cabrío';
        if (animal.weaningDate || ageInDays > 60) {
            return 'Macho de Levante';
        }
        return 'Cabrito';
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


// ==================================================
// --- NUEVAS FUNCIONES PARA EL MÓDULO "KILOS" ---
// ==================================================

/**
 * Calcula la Ganancia Diaria de Peso (GDP) de un animal.
 * @param birthWeight Peso al nacer del animal.
 * @param weighings Array de todos los pesajes corporales del animal, ordenados por fecha.
 * @returns Un objeto con la GDP general y la GDP reciente (entre los dos últimos pesajes).
 */
export const calculateGDP = (birthWeight: number | undefined, weighings: BodyWeighing[]): { overall: number | null, recent: number | null } => {
    if (weighings.length === 0) return { overall: null, recent: null };

    const sortedWeighings = [...weighings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latestWeighing = sortedWeighings[sortedWeighings.length - 1];
    
    let overall: number | null = null;
    if (birthWeight && birthWeight > 0) {
        const ageInDays = calculateAgeInDays(sortedWeighings[0].date); // Asumimos que el primer pesaje es el de nacimiento
        if (ageInDays > 0) {
            overall = (latestWeighing.kg - birthWeight) / ageInDays;
        }
    }
    
    let recent: number | null = null;
    if (sortedWeighings.length >= 2) {
        const last = latestWeighing;
        const secondLast = sortedWeighings[sortedWeighings.length - 2];
        const daysBetween = calculateAgeInDays(secondLast.date) - calculateAgeInDays(last.date);
        if (daysBetween > 0) {
            recent = (last.kg - secondLast.kg) / daysBetween;
        }
    }
    
    return { overall, recent };
};

/**
 * Estima el peso de un animal en una edad objetivo usando interpolación lineal.
 * Resuelve el problema de la "proximidad".
 * @param weighings Array de pesajes corporales del animal, ordenados por fecha.
 * @param birthDate Fecha de nacimiento del animal.
 * @param targetAgeInDays Edad objetivo en días (ej: 60, 90, 180).
 * @returns El peso estimado en Kg, o null si no se puede calcular.
 */
export const getInterpolatedWeight = (weighings: BodyWeighing[], birthDate: string, targetAgeInDays: number): number | null => {
    if (weighings.length < 2) return null;

    const weighingsWithAge = weighings.map(w => ({
        age: calculateAgeInDays(birthDate),
        kg: w.kg,
    })).sort((a, b) => a.age - b.age);

    const before = weighingsWithAge.filter(w => w.age <= targetAgeInDays).pop();
    const after = weighingsWithAge.find(w => w.age >= targetAgeInDays);

    if (!before || !after) return null; // No hay suficientes datos para interpolar
    if (before.age === after.age) return before.kg; // Coincidencia exacta

    const ageRange = after.age - before.age;
    if (ageRange === 0) return before.kg;

    const weightRange = after.kg - before.kg;
    const ageOffset = targetAgeInDays - before.age;
    
    const interpolatedWeight = before.kg + (ageOffset / ageRange) * weightRange;
    
    return parseFloat(interpolatedWeight.toFixed(2));
};

/**
 * Calcula un índice de crecimiento ponderado que premia la precocidad.
 * Compara la GDP de un animal con la media del grupo en un periodo.
 * @param individualGdp La Ganancia Diaria de Peso del animal.
 * @param averageGdp La Ganancia Diaria de Peso promedio del grupo de comparación.
 * @param ageInDays La edad actual del animal.
 * @returns Un puntaje (ej: 110 = 10% por encima del promedio). Un puntaje más alto es mejor.
 */
export const calculateGrowthScore = (individualGdp: number, averageGdp: number, ageInDays: number): number => {
    if (averageGdp === 0) return 100; // Evitar división por cero

    const baseScore = (individualGdp / averageGdp) * 100;
    
    // Pequeño bonus por precocidad: un animal más joven con la misma GDP relativa obtiene un mejor puntaje.
    const ageFactor = 1 + ((180 - Math.min(ageInDays, 180)) / 180) * 0.1; // Bonus de hasta el 10% para los más jóvenes

    return Math.round(baseScore * ageFactor);
};