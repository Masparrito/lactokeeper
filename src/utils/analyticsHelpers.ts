import { Animal, Parturition } from '../db/local'; // Ajusta la ruta si es necesario
// V8.0: Importar el tipo de dato mensual
import { MonthlyEvolutionStep } from '../hooks/useHerdEvolution'; // Ajusta la ruta

// Definición de las 5 categorías de edad del motor de simulación (V6.2)
export type SimulationAgeCategory = 'CriaH' | 'L.Temprano' | 'L.Medio' | 'L.Tardío' | 'Cabras' | 'Machos' | 'Otros';

// Constantes de edad (basadas en el motor V6.2)
const DIAS_MES = 30.44;
const CAT_CRIA_H_DIAS = 3 * DIAS_MES; // ~91 días (0-3m)
const CAT_L_TEMPRANO_DIAS = 6 * DIAS_MES; // ~182 días (3-6m)
const CAT_L_MEDIO_DIAS = 12 * DIAS_MES; // ~365 días (6-12m)
const CAT_L_TARDIO_DIAS = 18 * DIAS_MES; // ~547 días (12-18m)
// > 547 días es 'Cabras'

/**
 * Calcula la diferencia de días entre dos fechas (YYYY-MM-DD).
 * @param date1String (YYYY-MM-DD) - Fecha de inicio (ej. nacimiento)
 * @param date2String (YYYY-MM-DD) - Fecha final (ej. hoy)
 * @returns Número de días
 */
export const getDaysBetweenDates = (date1String: string, date2String: string): number => {
    try {
        // Usar T00:00:00Z para forzar UTC y evitar problemas de zona horaria
        const d1 = new Date(date1String + 'T00:00:00Z');
        const d2 = new Date(date2String + 'T00:00:00Z');
        
        // Validar fechas
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) {
            return 0;
        }

        const d1_utc = Date.UTC(d1.getUTCFullYear(), d1.getUTCMonth(), d1.getUTCDate());
        const d2_utc = Date.UTC(d2.getUTCFullYear(), d2.getUTCMonth(), d2.getUTCDate());
        
        const diff = Math.floor((d2_utc - d1_utc) / (1000 * 60 * 60 * 24));
        return diff;
    } catch (e) {
        console.error("Error en getDaysBetweenDates:", e);
        return 0;
    }
};

/**
 * Obtiene la categoría de edad para la SIMULACIÓN (5 categorías).
 * Esta es DIFERENTE de 'calculateLifecycleStage' (que es para visualización).
 * @param animal El objeto Animal (o parcial)
 * @param referenceDate La fecha de referencia (ej. "hoy" o la fecha de muerte/venta)
 * @returns La categoría del motor de simulación (V6.2).
 */
export const getSimulationAgeCategory = (
    animal: Pick<Animal, 'sex' | 'birthDate' | 'status'>, 
    referenceDate: string
): SimulationAgeCategory => {
    
    // Si el animal no está 'Activo', no debe contar en el stock inicial
    if (animal.status !== 'Activo') {
        return 'Otros';
    }

    if (!animal.birthDate || animal.birthDate === 'N/A') {
        // Si no hay fecha de nacimiento, se asigna a la categoría más madura
        return animal.sex === 'Hembra' ? 'Cabras' : 'Machos';
    }

    const ageInDays = getDaysBetweenDates(animal.birthDate, referenceDate);

    if (animal.sex === 'Macho') {
        // El motor V6.2 trata a los machos (Padres) como un grupo único
        return 'Machos';
    }
    
    // Lógica para Hembras
    if (ageInDays <= CAT_CRIA_H_DIAS) {
        return 'CriaH'; // 0-3m
    }
    if (ageInDays <= CAT_L_TEMPRANO_DIAS) {
        return 'L.Temprano'; // 3-6m
    }
    if (ageInDays <= CAT_L_MEDIO_DIAS) {
        return 'L.Medio'; // 6-12m
    }
    if (ageInDays <= CAT_L_TARDIO_DIAS) {
        return 'L.Tardío'; // 12-18m
    }
    
    return 'Cabras'; // >18m
};

/**
 * Encuentra la lactancia (parto) activa para un registro de pesaje.
 * @param weighDateStr (YYYY-MM-DD)
 * @param parturitions Lista de TODOS los partos del animal
 * @returns El parto correspondiente o null
 */
export const getActiveLactationForWeighing = (
    weighDateStr: string,
    parturitions: Parturition[]
): Parturition | null => {
    if (!parturitions || parturitions.length === 0) {
        return null;
    }
    
    const weighDate = new Date(weighDateStr + 'T00:00:00Z');
    if (isNaN(weighDate.getTime())) return null;

    const candidates = parturitions
        .filter(p => {
            const partDate = new Date(p.parturitionDate + 'T00:00:00Z');
            if (isNaN(partDate.getTime())) return false;
            return partDate <= weighDate && p.status !== 'finalizada'; 
        })
        .sort((a, b) => {
            const dateA = new Date(a.parturitionDate + 'T00:00:00Z').getTime();
            const dateB = new Date(b.parturitionDate + 'T00:00:00Z').getTime();
            return dateB - dateA;
        });
        
    return candidates[0] || null;
};

// ---------------------------------------------------------------------------
// --- V8.0: FUNCIONES ESTADÍSTICAS PARA EL OPTIMIZADOR ---
// ---------------------------------------------------------------------------

/**
 * Calcula la media (promedio) de un array de números.
 */
const getMean = (data: number[]): number => {
  if (!data || data.length === 0) return 0;
  const sum = data.reduce((acc, val) => acc + val, 0);
  return sum / data.length;
};

/**
 * Calcula la desviación estándar de un array de números.
 */
const getStdDeviation = (data: number[]): number => {
  if (!data || data.length < 2) return 0; // Se necesita al menos 2 puntos
  const mean = getMean(data);
  // Varianza muestral (n-1)
  const variance = data.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (data.length - 1);
  return Math.sqrt(variance);
};

/**
 * Calcula el Coeficiente de Variación (CV) para una simulación.
 * Esta es la métrica clave para la optimización de linealidad.
 * @param monthlyData Los resultados de una simulación
 * @param horizonInYears Horizonte de la simulación (para promediar)
 * @returns El CV promedio (ej. 25.4)
 */
export const calculateCV = (
    monthlyData: MonthlyEvolutionStep[], 
    horizonInYears: number
): number => {
    if (!monthlyData || monthlyData.length === 0) return 0;

    const cvsPerYear: number[] = [];
    
    // Calcular el CV para cada año por separado
    for (let i = 0; i < horizonInYears; i++) {
        const yearMonths = monthlyData.slice(i * 12, (i + 1) * 12);
        if (yearMonths.length === 0) continue;
        
        const monthlyProduction = yearMonths.map(m => m.litrosLeche);
        
        const avgMonthly = getMean(monthlyProduction);
        const stdDev = getStdDeviation(monthlyProduction);
        const cv = avgMonthly > 0 ? (stdDev / avgMonthly) * 100 : 0;
        
        cvsPerYear.push(cv);
    }

    // Devolver el CV promedio de todos los años
    return getMean(cvsPerYear);
};