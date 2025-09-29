// src/utils/calculations.ts

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
 * Recompensa la producción temprana y penaliza la producción tardía si es baja.
 * @param kg - La producción en kilogramos.
 * @param del - Los Días en Leche.
 * @returns El puntaje ponderado.
 */
export const calculateWeightedScore = (kg: number, del: number): number => {
  // Día considerado como el pico ideal de lactancia.
  const idealPeakDay = 50; 

  // Factor de ajuste: 
  // - Si DEL es bajo, el factor es > 1 (bonificación).
  // - Si DEL es alto, el factor es < 1 (penalización).
  // La fórmula está diseñada para ser suave y no castigar excesivamente.
  const weightFactor = 1 + ((idealPeakDay - del) / (idealPeakDay + del));

  const weightedScore = kg * Math.max(0, weightFactor); // Se asegura de que el puntaje no sea negativo.

  return parseFloat(weightedScore.toFixed(2));
};