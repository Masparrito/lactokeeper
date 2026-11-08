// Las 17 colecciones de GanaderoOS, tal como las guarda la app (src/db/local.ts).
// Cada documento lleva `userId` (dueño); la app lo filtra por él y lo baja a su
// base local (Dexie) con un listener en tiempo real. Lo que el conector escribe
// en Firestore aparece solo en la app.

const COLECCIONES = {
    animals: {
        nombre: "Animales",
        id: "Arete/ID en MAYÚSCULAS. Si una hembra y un macho comparten ID, el segundo lleva sufijo -H / -M.",
        requeridos: ["id", "sex", "birthDate", "status", "lifecycleStage", "reproductiveStatus"],
        campos: {
            id: "texto", name: "texto", sex: "'Hembra' | 'Macho'",
            status: "'Activo' | 'Venta' | 'Muerte' | 'Descarte'",
            birthDate: "AAAA-MM-DD ('N/A' si se desconoce)", motherId: "ID de la madre", fatherId: "ID del padre (animal o reproductor de 'fathers')",
            birthWeight: "kg", conceptionMethod: "texto", lifecycleStage: "Cabrita | Cabritona | Cabra | Cabra Primípara | Cabra Multípara | Cabrito | Macho de Levante | Reproductor",
            location: "nombre del lote ('' = sin asignar)", weaningDate: "AAAA-MM-DD", weaningWeight: "kg",
            isReference: "true = animal de referencia (no es del rebaño: padre externo, madre de compra, etc.)",
            origin: "nombre del origen", parturitionType: "tipo de parto en que nació", breed: "raza", racialComposition: "p. ej. '75% Saanen 25% Criollo'",
            observations: "texto", reproductiveStatus: "'Vacía' | 'En Servicio' | 'Servida' | 'Preñada' | 'Post-Parto' | 'No Aplica'",
            sireLotId: "lote de monta (sireLots) en que está", endDate: "fecha de baja", salePrice: "precio de venta", saleBuyer: "comprador",
            salePurpose: "'Cría' | 'Carne'", deathReason: "causa de muerte", cullReason: "motivo de descarte", cullReasonDetails: "texto",
            createdAt: "ms (lo pone el conector)",
        },
    },
    fathers: { nombre: "Reproductores externos (padres sin ficha de animal)", id: "ID en MAYÚSCULAS", requeridos: ["id", "name"], campos: { id: "texto", name: "texto" } },
    parturitions: {
        nombre: "Partos / lactancias", id: "uuid", requeridos: ["goatId", "parturitionDate", "sireId", "offspringCount", "parturitionType", "status"],
        campos: {
            goatId: "ID de la madre", parturitionDate: "AAAA-MM-DD", sireId: "ID del padre", offspringCount: "crías totales (vivas + muertas)",
            parturitionType: "'Simple' | 'Doble' | 'Triple' | 'Cuádruple' | 'Quíntuple'",
            status: "'activa' (en ordeño) | 'en-secado' | 'seca' | 'finalizada'",
            parturitionOutcome: "'Normal' | 'Aborto' | 'Con Mortinatos'", dryingStartDate: "AAAA-MM-DD (inicio o fecha del secado)",
            liveOffspring: "[{id, sex, birthWeight}]", provisional: "true = lactancia creada para cargar pesajes; falta el parto real",
        },
    },
    weighings: { nombre: "Pesajes de leche", id: "uuid", requeridos: ["goatId", "date", "kg"], campos: { goatId: "ID de la cabra", date: "AAAA-MM-DD", kg: "kg de leche del día" } },
    bodyWeighings: { nombre: "Pesajes corporales", id: "uuid", requeridos: ["animalId", "date", "kg"], campos: { animalId: "ID", date: "AAAA-MM-DD", kg: "kg de peso vivo" } },
    lots: { nombre: "Lotes físicos", id: "uuid", requeridos: ["name"], unico: "name", campos: { name: "nombre ÚNICO", parentLotId: "lote padre (sublote)" } },
    origins: { nombre: "Orígenes (procedencias)", id: "uuid", requeridos: ["name"], unico: "name", campos: { name: "nombre ÚNICO" } },
    breedingSeasons: {
        nombre: "Temporadas de monta", id: "uuid", requeridos: ["name", "startDate", "endDate", "status", "requiresLightTreatment"], unico: "name",
        campos: { name: "nombre ÚNICO", startDate: "AAAA-MM-DD", endDate: "AAAA-MM-DD", status: "'Activo' | 'Cerrado'", requiresLightTreatment: "bool",
            lightTreatmentStartDate: "AAAA-MM-DD", lightTreatmentDuration: "días", lightTreatmentStatus: "'Pendiente' | 'En Curso' | 'Finalizado'",
            lightTreatmentConfirmed: "bool", closedDate: "AAAA-MM-DD" },
    },
    sireLots: { nombre: "Lotes de monta (un semental por lote dentro de una temporada)", id: "uuid", requeridos: ["seasonId", "sireId"],
        campos: { seasonId: "temporada", sireId: "ID del semental", startDate: "AAAA-MM-DD", retiredDate: "AAAA-MM-DD (retirado)", replacedBySireId: "ID" } },
    serviceRecords: { nombre: "Servicios (montas vistas)", id: "uuid", requeridos: ["sireLotId", "femaleId", "serviceDate"],
        campos: { sireLotId: "lote de monta", femaleId: "ID de la hembra", serviceDate: "AAAA-MM-DD" } },
    events: {
        nombre: "Eventos (línea de tiempo de cada animal)", id: "uuid", requeridos: ["animalId", "date", "type", "details"],
        campos: { animalId: "ID", date: "AAAA-MM-DD", type: "Registro | Nacimiento | Ingreso | Pesaje Corporal | Pesaje Lechero | Tratamiento | Movimiento | Destete | Hito de Crecimiento | Actividad | Cambio de Estado | Servicio | Diagnóstico | Parto | Aborto | Peso de Monta | Inicio Lactancia | Secado | Baja de Rebaño | Famacha | Manejo",
            details: "texto", notes: "texto", lotName: "lote", metaWeight: "kg", metaOutcome: "texto", metaSire: "ID" },
    },
    feedingPlans: { nombre: "Planes de alimentación por lote", id: "uuid", requeridos: ["lotName", "details", "startDate"], campos: { lotName: "lote", details: "texto", startDate: "AAAA-MM-DD", endDate: "AAAA-MM-DD" } },
    products: {
        nombre: "Productos veterinarios", id: "uuid", requeridos: ["name", "applicationType", "dosageType"], unico: "name",
        campos: { name: "nombre ÚNICO", laboratory: "texto",
            category: "Vitaminas | Modificadores Orgánicos | Desparasitantes | Antibióticos | Vacunas | Pomadas Tópicas | Analgésicos | Hormonas | Antiinflamatorios | Otro",
            presentationValue: "número (p. ej. 500)", presentationUnit: "'ml' | 'L'", price: "precio de la presentación",
            applicationType: "'Oral' | 'Inyectable'", applicationRoute: "'Intramuscular' | 'Subcutáneo'", dosageType: "'per_kg' | 'fixed'",
            dosageFixed: "ml por animal", dosagePerKg_ml: "ml…", dosagePerKg_kg: "…por cada N kg", withdrawalDaysMilk: "días de retiro en leche", withdrawalDaysMeat: "días de retiro en carne" },
    },
    healthPlans: { nombre: "Planes sanitarios", id: "uuid", requeridos: ["name", "targetGroup"], unico: "name",
        campos: { name: "nombre ÚNICO", description: "texto", targetGroup: "'Maternidad' | 'Adultos'", maternityMode: "'existing_seasons' | 'future_seasons'",
            adultsSubgroup: "['Cabritonas','Cabras','Reproductores','Machos de Levante']", targetLots: "[nombres de lote]" } },
    planActivities: { nombre: "Actividades de un plan sanitario", id: "uuid", requeridos: ["healthPlanId", "category", "name", "trigger"],
        campos: { healthPlanId: "plan", category: "'Tratamiento' | 'Control'", name: "texto", productId: "producto", complementaryProductId: "producto",
            trigger: "{type:'age'|'fixed_date_period'|'birthing_season_event', days?:[n], week?, month?, offsetDays?}" } },
    healthEvents: {
        nombre: "Eventos sanitarios (tratamientos y controles aplicados)", id: "uuid", requeridos: ["animalId", "date", "type"],
        campos: { animalId: "ID", lotName: "lote", date: "AAAA-MM-DD", activityId: "actividad del plan", type: "texto (p. ej. 'Desparasitación')",
            productUsed: "id del producto", doseApplied: "dosis", unit: "'ml' | 'g' | 'unidad'", calculatedCost: "costo", notes: "texto",
            executedBy: "quién", famachaGrade: "1..5", diasRetiroLeche: "días", diasRetiroCarne: "días" },
    },
    famachaRevs: {
        nombre: "Revisiones FAMACHA", id: "`${animalId}_${fecha}` (una por animal y día)", requeridos: ["animalId", "arete", "fecha", "score", "accion", "dosis"],
        campos: { animalId: "ID", arete: "ID visible", fecha: "AAAA-MM-DD", score: "1..5", accion: "'−' | '+' | '=' | '+ separar'", dosis: "bool", producto: "texto", dispositivo: "texto" },
    },
};

const NOMBRES = Object.keys(COLECCIONES);

/** Campos con índice único (por nombre) en la base local de la app. Repetirlos
 * ROMPE la sincronización de la app para toda la colección, así que se impide. */
const UNICOS = Object.fromEntries(NOMBRES.filter(c => COLECCIONES[c].unico).map(c => [c, COLECCIONES[c].unico]));

/** Colecciones cuyo id es el arete (se normaliza a MAYÚSCULAS). */
const ID_ARETE = new Set(["animals", "fathers"]);

module.exports = { COLECCIONES, NOMBRES, UNICOS, ID_ARETE };
