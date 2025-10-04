/**
 * Calcula los "Días en Leche" (DEL) para un pesaje específico.
 * El DEL es la diferencia en días entre la fecha del parto y la fecha del pesaje.
 * @param parturitionDate - La fecha del último parto del animal (en formato string 'YYYY-MM-DD').
 * @param weighDate - La fecha en que se realizó el pesaje (en formato string 'YYYY-MM-DD').
 * @returns El número de días transcurridos.
 */
export const calculateDEL = (parturitionDate: string, weighDate: string): number => {
    const pDate = new Date(parturitionDate);
    const wDate = new Date(weighDate);

    if (isNaN(pDate.getTime()) || isNaN(wDate.getTime())) return 0;

    const diffTime = wDate.getTime() - pDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

/**
 * Calcula un puntaje ponderado que ajusta la producción en Kg 
 * según los Días en Leche (DEL).
 * Recompensa la persistencia lechera (producción tardía) y penaliza ligeramente la producción temprana.
 * @param kg - La producción en kilogramos.
 * @param del - Los Días en Leche.
 * @returns El puntaje ponderado.
 */
export const calculateWeightedScore = (kg: number, del: number): number => {
  const idealPeakDay = 50; 
  const weightFactor = 1 + ((del - idealPeakDay) / (del + idealPeakDay));
  const weightedScore = kg * Math.max(0.5, weightFactor); 
  return parseFloat(weightedScore.toFixed(2));
};

/**
 * Tarea 1.1: Calcula la edad de un animal en días.
 * @param birthDate - La fecha de nacimiento del animal (en formato string 'YYYY-MM-DD').
 * @returns El número de días transcurridos, o -1 si la fecha no es válida.
 */
export const calculateAgeInDays = (birthDate: string): number => {
    if (!birthDate || birthDate === 'N/A') return -1;
    
    // Se añade 'T00:00:00' para asegurar la consistencia horaria a través de zonas
    const birth = new Date(birthDate + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliza la hora para evitar cálculos imprecisos

    if (isNaN(birth.getTime())) return -1;

    const diffTime = today.getTime() - birth.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
};

