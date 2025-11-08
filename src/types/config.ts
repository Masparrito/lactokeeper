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
    diasConfirmarPrenez: number; // Alerta para confirmar preñez (eco/palpación)
    diasPreParto: number; // Alerta para mover a lote de pre-parto

    // --- Parámetros de Manejo (Productivo y Secado) ---
    diasLactanciaObjetivo: number; // (Alerta Vacías) Días máx de lactancia si está vacía
    // (NUEVO) Alerta 1 de Secado: Días ANTES del parto para INICIAR secado
    diasAlertaInicioSecado: number;
    // (NUEVO) Alerta 2 de Secado: Días ANTES del parto en que DEBE ESTAR seca
    diasMetaSecadoCompleto: number; 

    // --- Parámetros de Manejo (Crecimiento y Destete) ---
    // (NUEVO) Alerta 1 de Destete: Edad y peso para la PRIMERA revisión
    diasAlertaPesarDestete: number;
    pesoMinimoPesarDestete: number;
    // (NUEVO) Alerta 2 de Destete: Edad y peso para el destete FINAL
    diasMetaDesteteFinal: number;
    pesoMinimoDesteteFinal: number;
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

    // Productivo y Secado
    diasLactanciaObjetivo: 300, // (Tu valor)
    diasAlertaInicioSecado: 75, // (Tu valor)
    diasMetaSecadoCompleto: 60, // (Tu valor)

    // Crecimiento y Destete
    diasAlertaPesarDestete: 45, // (Tu valor)
    pesoMinimoPesarDestete: 9.0, // (Tu valor)
    diasMetaDesteteFinal: 52, // (Tu valor)
    pesoMinimoDesteteFinal: 9.5, // (Tu valor)
};