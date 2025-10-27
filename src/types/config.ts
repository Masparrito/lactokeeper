/**
 * Define la estructura de todos los parámetros configurables de la finca.
 * Estos valores se almacenarán en un único documento en Firestore (/configuracion/{userId})
 * y se distribuirán a toda la app a través de DataContext.
 */
export interface AppConfig {
    // --- E. Configuración General ---
    nombreFinca: string;
    theme: 'light' | 'dark';

    // --- A. Parámetros Biológicos (Reproductivos y Crecimiento) ---
    porcentajePrenez: number;
    porcentajeProlificidad: number;
    mortalidadCrias: number; // 0-3 meses
    mortalidadLevante: number; // 3-12 meses
    mortalidadCabras: number; // Adultas
    tasaReemplazo: number; // Descarte anual de adultas
    eliminacionCabritos: number; // Venta/Descarte de machos jóvenes

    // --- B. Parámetros de Manejo (Generales) ---
    pesoPrimerServicioKg: number;
    edadDesteteDias: number;
    pesoDesteteMetaKg: number;
    diasGestacion: number;
    diasLactanciaObjetivo: number;
    diasSecadoObjetivo: number;
    diasConfirmarPrenez: number;
    diasPreParto: number;

    // --- C. Parámetros Sanitarios (StockCare) ---
    diasAlertaAtraso: number; // Días para marcar una tarea como "Atrasada"
    diasRetiroLecheDefault: number;
    diasRetiroCarneDefault: number;

    // --- D. Parámetros Económicos (Cents) ---
    monedaSimbolo: string;
    costoSacoAlimento: number;
    pesoSacoAlimentoKg: number;
    precioLecheLitro: number;
    precioVentaCabritoKg: number;
    precioVentaDescarteAdulto: number;
}

/**
 * Valores por defecto realistas para una finca nueva, antes de que el usuario
 * configure sus propios parámetros.
 */
export const DEFAULT_CONFIG: AppConfig = {
    // E. Configuración General
    nombreFinca: "Mi Finca",
    theme: 'dark',

    // A. Parámetros Biológicos
    porcentajePrenez: 90,
    porcentajeProlificidad: 120,
    mortalidadCrias: 8,
    mortalidadLevante: 3,
    mortalidadCabras: 5,
    tasaReemplazo: 20,
    eliminacionCabritos: 100,

    // B. Parámetros de Manejo
    pesoPrimerServicioKg: 30,
    edadDesteteDias: 90,
    pesoDesteteMetaKg: 15,
    diasGestacion: 150,
    diasLactanciaObjetivo: 305,
    diasSecadoObjetivo: 60,
    diasConfirmarPrenez: 60,
    diasPreParto: 15,

    // C. Parámetros Sanitarios
    diasAlertaAtraso: 7,
    diasRetiroLecheDefault: 7,
    diasRetiroCarneDefault: 30,

    // D. Parámetros Económicos
    monedaSimbolo: "$",
    costoSacoAlimento: 25,
    pesoSacoAlimentoKg: 40,
    precioLecheLitro: 0.8,
    precioVentaCabritoKg: 3.5,
    precioVentaDescarteAdulto: 50,
};
