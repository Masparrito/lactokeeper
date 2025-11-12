// types/config.ts (Actualizado)

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
    pesoPrimerServicioKg: number;
    edadPrimerServicioMeses: number; 
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
    diasMetaDesteteFinal: number;
    pesoMinimoDesteteFinal: number;

    // --- Lógica de Categorías Zootécnicas ---
    categoriaCabritaEdadMaximaDias: number;
    categoriaCabritoEdadMaximaDias: number;
    categoriaCabritonaEdadMinimaDias: number;
    categoriaCabritonaEdadMaximaMeses: number; // <-- Ajustado
    categoriaCabraEdadMinimaMeses: number;     // <-- Ajustado
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
    edadParaAlertaVaciasMeses: 19, // (Esto es para ALERTA, no para el icono 'vacía')
    
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

    // Lógica de Categorías (AJUSTADO)
    categoriaCabritaEdadMaximaDias: 90,
    categoriaCabritoEdadMaximaDias: 90,
    categoriaCabritonaEdadMinimaDias: 91,
    categoriaCabritonaEdadMaximaMeses: 12, // <-- CORREGIDO a 12
    categoriaCabraEdadMinimaMeses: 12,     // <-- CORREGIDO a 12
    categoriaCabraRequiereParto: true,
    categoriaMachoLevanteEdadMinimaDias: 91,
    categoriaMachoLevanteEdadMaximaMeses: 12,
};