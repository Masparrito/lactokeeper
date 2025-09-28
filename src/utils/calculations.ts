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

    // Se valida que las fechas sean correctas para evitar errores.
    if (isNaN(pDate.getTime()) || isNaN(wDate.getTime())) return 0;

    const diffTime = wDate.getTime() - pDate.getTime();

    // Se convierte la diferencia de milisegundos a días.
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Si un pesaje es anterior a la fecha de parto, se considera DEL 0.
    return Math.max(0, diffDays);
};
