// Snapshot de la evaluación Famacha del 27/06/2026 (Reporte de Evaluación Famacha,
// Finca Masparrito). Usado SOLO para el cotejo/balance con la base de GanaderoOS (lectura).
// 91 animales: Caney 1 (25), Caney 2 (23), Caney 3 (32), Maternidad (7), Reproductores (4).
// revCount = revisiones acumuladas (snapshot previo + esta evaluacion).

export interface FamachaInventoryItem {
  arete: string;
  lastScore: number | null;
  lastFecha: string | null;
  revCount: number;
}

export const FAMACHA_INVENTORY_SNAPSHOT: FamachaInventoryItem[] = [
  // --- Caney 1 ---
  { arete: "Q409", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q212", lastScore: 3, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "A354", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q449", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A233", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q120", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q446", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "N308", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A236", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "0015", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A326", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A453", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A451", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q328", lastScore: 3, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "A311", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q454", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q442", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q209", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q345", lastScore: 3, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "Q122", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A349", lastScore: 3, lastFecha: "2026-06-27", revCount: 2 },
  { arete: "Q346", lastScore: 3, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "Q201", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V605", lastScore: 3, lastFecha: "2026-06-27", revCount: 2 },
  { arete: "V603", lastScore: 2, lastFecha: "2026-06-27", revCount: 2 },
  // --- Caney 2 ---
  { arete: "V604", lastScore: 3, lastFecha: "2026-06-27", revCount: 2 },
  { arete: "V602", lastScore: 2, lastFecha: "2026-06-27", revCount: 2 },
  { arete: "V601", lastScore: 3, lastFecha: "2026-06-27", revCount: 2 },
  { arete: "Q228", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q220", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q435", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "311Q", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q348", lastScore: 3, lastFecha: "2026-06-27", revCount: 2 },
  { arete: "A303", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A413", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A325", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "N304", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A232", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A231", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "N320", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "1733", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "T047", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "924", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A338", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V541", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V555", lastScore: 1, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V551", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V543", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  // --- Caney 3 ---
  { arete: "V539", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V556", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "E532", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V552", lastScore: 1, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V546", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "E533", lastScore: 1, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V559", lastScore: 1, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V562", lastScore: 1, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V558", lastScore: 1, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V560", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q329", lastScore: 3, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "A324", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q115", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q203", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q219", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A402", lastScore: 1, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A432", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A426", lastScore: 2, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "A431", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q522", lastScore: 2, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A415", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q221", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V509", lastScore: 1, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A508", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "V507", lastScore: 1, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q226", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "711Q", lastScore: 4, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q013", lastScore: 5, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "R063", lastScore: 5, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "N306", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "A208", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  { arete: "Q343", lastScore: 3, lastFecha: "2026-06-27", revCount: 3 },
  // --- Maternidad ---
  { arete: "M609", lastScore: 1, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "M612", lastScore: 1, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "M613", lastScore: 1, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "M610", lastScore: 1, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "M607", lastScore: 1, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "M611", lastScore: 1, lastFecha: "2026-06-27", revCount: 1 },
  { arete: "M615", lastScore: 1, lastFecha: "2026-06-27", revCount: 1 },
  // --- Reproductores ---
  // En Famacha se anotan por nombre; aquí se mapean al ID del sistema para que
  // el cotejo los reconozca. Mapeo verificado contra el lote REPRODUCTORES.
  { arete: "A1055TE", lastScore: 2, lastFecha: "2026-06-27", revCount: 2 }, // Mercurio
  { arete: "AN01", lastScore: 1, lastFecha: "2026-06-27", revCount: 2 },    // Urano
  { arete: "L210", lastScore: 4, lastFecha: "2026-06-27", revCount: 2 },    // Quantum
  // Guanarito: NO aparece entre los reproductores activos del sistema (revisar).
  { arete: "Guanarito", lastScore: 2, lastFecha: "2026-06-27", revCount: 2 },
];
