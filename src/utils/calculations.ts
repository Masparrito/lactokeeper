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
 * --- CORREGIDO ---
 * Recompensa la persistencia lechera (producción tardía) y penaliza ligeramente la producción temprana.
 * @param kg - La producción en kilogramos.
 * @param del - Los Días en Leche.
 * @returns El puntaje ponderado.
 */
export const calculateWeightedScore = (kg: number, del: number): number => {
  // Día considerado como el pico ideal de lactancia.
  const idealPeakDay = 50; 

  // --- FÓRMULA CORREGIDA ---
  // El factor ahora es > 1 para DEL altos y < 1 para DEL bajos.
  // Recompensa la producción que se mantiene alta lejos del pico de lactancia.
  const weightFactor = 1 + ((del - idealPeakDay) / (del + idealPeakDay));

  // Se asegura un factor mínimo (0.5) para no penalizar en exceso la producción muy temprana.
  const weightedScore = kg * Math.max(0.5, weightFactor); 

  return parseFloat(weightedScore.toFixed(2));
};