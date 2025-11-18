// src/types/config.ts 
// (ACTUALIZADO: Añade 'diasToleranciaDestete' para la Regla #4)

/**
 * Define la estructura de todos los parámetros configurables de la finca.
 * Estos valores se almacenarán en un único documento en Firestore (/configuracion/{userId})
 * y se distribuirán a toda la app a través de DataContext.
 */
export interface AppConfig {
    // --- Configuración General ---
    nombreFinca: string;
    theme: 'light' | 'dark';

    // --- Parámetros de Manejo (Reproductivo) ---
    pesoPrimerServicioKg: number; // <-- HITO 1er SERVICIO (EXISTENTE)
    edadPrimerServicioMeses: number; // <-- HITO 1er SERVICIO (EXISTENTE)
    diasGestacion: number;
    diasConfirmarPrenez: number;
    diasPreParto: number; 
    edadParaAlertaVaciasMeses: number; 

    // --- Lógica de Vientres ---
    edadMinimaVientreMeses: number;

    // --- Parámetros de Manejo (Productivo y Secado) ---
    diasLactanciaObjetivo: number; 
    diasAlertaInicioSecado: number;
    diasMetaSecadoCompleto: number; 

    // --- Parámetros de Manejo (Crecimiento y Destete) ---
    diasAlertaPesarDestete: number;
    pesoMinimoPesarDestete: number;
    diasMetaDesteteFinal: number; // <-- HITO DESTETE (EXISTENTE)
    pesoMinimoDesteteFinal: number; // <-- HITO DESTETE (EXISTENTE)
    diasToleranciaDestete: number; // <-- (NUEVO) Para la "Ventana de Destete" (Regla #4)

    // --- (CORREGIDO) Hitos de Crecimiento Intermedios ---
    growthGoalBirthWeight: number; // Peso meta al nacer
    growthGoal90dWeight: number; // Peso meta 90d (hembra)
    growthGoal180dWeight: number; // Peso meta 180d (hembra)
    growthGoal270dWeight: number; // Peso meta 270d (hembra)
    
    // (CORREGIDO) Opcional para Machos
    growthGoalWeaningWeightMale: number; // <-- ESTE CAMPO FALTABA
    growthGoal90dWeightMale: number;
    growthGoal180dWeightMale: number;
    
    // (NUEVO) % de alerta
    growthAlertThreshold: number; // p.ej. 0.85 (para 15% por debajo de la meta)

    // --- Lógica de Categorías Zootécnicas ---
    categoriaCabritaEdadMaximaDias: number;
    categoriaCabritoEdadMaximaDias: number;
    categoriaCabritonaEdadMinimaDias: number;
    categoriaCabritonaEdadMaximaMeses: number;
    categoriaCabraEdadMinimaMeses: number;
    categoriaCabraRequiereParto: boolean;
    categoriaMachoLevanteEdadMinimaDias: number;
    categoriaMachoLevanteEdadMaximaMeses: number;
}

/**
 * Valores por defecto realistas para una finca nueva, antes de que el usuario
 * configure sus propios parámetros.
 */
export const DEFAULT_CONFIG: AppConfig = {
    // General
    nombreFinca: "Mi Finca",
    theme: 'dark',

    // Reproductivo
    pesoPrimerServicioKg: 30,
    edadPrimerServicioMeses: 11, 
    diasGestacion: 150,
    diasConfirmarPrenez: 60,
    diasPreParto: 15,
    edadParaAlertaVaciasMeses: 19,
    
    // Lógica de Vientres
    edadMinimaVientreMeses: 10,

    // Productivo y Secado
    diasLactanciaObjetivo: 300, 
    diasAlertaInicioSecado: 75, 
    diasMetaSecadoCompleto: 60, 

    // Crecimiento y Destete
    diasAlertaPesarDestete: 45,
    pesoMinimoPesarDestete: 9.0,
    diasMetaDesteteFinal: 52, 
    pesoMinimoDesteteFinal: 9.5, 
    diasToleranciaDestete: 8, // <-- (NUEVO) Valor por defecto de 8 días

    // (CORREGIDO) Hitos de Crecimiento Intermedios
    growthGoalBirthWeight: 3.5,
    growthGoal90dWeight: 20,
    growthGoal180dWeight: 28,
    growthGoal270dWeight: 34,
    
    // (CORREGIDO) Metas Machos
    growthGoalWeaningWeightMale: 16, // <-- ESTE CAMPO FALTABA
    growthGoal90dWeightMale: 22,
    growthGoal180dWeightMale: 30,
    
    // (NUEVO) Alerta si está por debajo del 85% de la meta
    growthAlertThreshold: 0.85,

    // Lógica de Categorías
    categoriaCabritaEdadMaximaDias: 90,
    categoriaCabritoEdadMaximaDias: 90,
    categoriaCabritonaEdadMinimaDias: 91,
    categoriaCabritonaEdadMaximaMeses: 12,
    categoriaCabraEdadMinimaMeses: 12,
    categoriaCabraRequiereParto: true,
    categoriaMachoLevanteEdadMinimaDias: 91,
    categoriaMachoLevanteEdadMaximaMeses: 12,
};