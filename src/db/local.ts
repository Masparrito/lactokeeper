import Dexie, { Table } from 'dexie';

// --- TIPOS DE DATOS ---
export type ReproductiveStatus = 'Vacía' | 'En Servicio' | 'Preñada' | 'Post-Parto' | 'No Aplica';

export type FemaleLifecycleStage = 'Cabrita' | 'Cabritona' | 'Cabra Primípara' | 'Cabra Multípara' | 'Cabra';
export type MaleLifecycleStage = 'Cabrito' | 'Macho de Levante' | 'Reproductor';

// --- TIPO DE EVENTO ---
export type EventType = 
    | 'Registro' 
    | 'Nacimiento' 
    | 'Ingreso' 
    | 'Pesaje Corporal' 
    | 'Pesaje Lechero' 
    | 'Tratamiento' 
    | 'Movimiento' 
    | 'Destete' 
    | 'Hito de Crecimiento'
    | 'Actividad'
    | 'Cambio de Estado'
    | 'Servicio' 
    | 'Diagnóstico' 
    | 'Parto' 
    | 'Aborto'
    | 'Peso de Monta'
    | 'Inicio Lactancia'
    | 'Secado'
    | 'Baja de Rebaño'
    | 'Manejo'; // Agregado 'Manejo' para eventos generales (Luz, etc)

export const getEventCategory = (type: EventType): 'General' | 'Manejo' | 'Reproductivo' | 'Productivo' => {
    switch (type) {
        case 'Registro':
        case 'Nacimiento':
        case 'Ingreso':
        case 'Baja de Rebaño':
            return 'General';
        
        case 'Pesaje Corporal':
        case 'Pesaje Lechero':
        case 'Tratamiento':
        case 'Movimiento':
        case 'Destete':
        case 'Hito de Crecimiento':
        case 'Actividad':
        case 'Cambio de Estado':
        case 'Manejo': // Agregado
            return 'Manejo';

        case 'Servicio':
        case 'Diagnóstico':
        case 'Parto':
        case 'Aborto':
        case 'Peso de Monta':
            return 'Reproductivo';

        case 'Inicio Lactancia':
        case 'Secado':
            return 'Productivo';
            
        default:
            return 'General';
    }
};

type SyncedRecord = {
    _synced?: boolean;
}

export interface Animal extends SyncedRecord {
    id: string;
    name?: string;
    createdAt?: number;
    userId?: string;
    sex: 'Hembra' | 'Macho';
    status: 'Activo' | 'Venta' | 'Muerte' | 'Descarte' | string;
    birthDate: string;
    motherId?: string;
    fatherId?: string;
    birthWeight?: number;
    conceptionMethod?: string;
    lifecycleStage: FemaleLifecycleStage | MaleLifecycleStage | 'Indefinido';
    location: string;
    weaningDate?: string;
    weaningWeight?: number;
    isReference?: boolean;
    origin?: string;
    parturitionType?: string;
    breed?: string;
    racialComposition?: string;
    observations?: string;
    reproductiveStatus: ReproductiveStatus;
    sireLotId?: string;
    endDate?: string;
    salePrice?: number;
    saleBuyer?: string;
    salePurpose?: 'Cría' | 'Carne';
    deathReason?: string;
    cullReason?: 'Baja producción' | 'Bajo índice de crecimiento' | 'Inflamación articular' | 'Linfadenitis caseosa' | 'Sospecha de otras enfermedades' | string;
    cullReasonDetails?: string;
    breedingFailures?: number;
    lastWeighing?: { date: string, kg: number } | null;
}

export interface Father extends SyncedRecord {
    id: string;
    userId?: string;
    name: string;
}

export interface Parturition extends SyncedRecord {
    id: string;
    userId?: string;
    goatId: string;
    parturitionDate: string;
    sireId: string;
    offspringCount: number;
    parturitionType: 'Simple' | 'Doble' | 'Triple' | 'Cuádruple' | 'Quíntuple' | string; 
    status: 'activa' | 'en-secado' | 'seca' | 'finalizada';
    parturitionOutcome?: 'Normal' | 'Aborto' | 'Con Mortinatos';
    dryingStartDate?: string;
    liveOffspring?: { id: string, sex: 'Hembra' | 'Macho', birthWeight?: string | number }[];
}

export interface Weighing extends SyncedRecord {
    id: string;
    userId?: string;
    goatId: string;
    date: string;
    kg: number;
}

export interface Lot extends SyncedRecord {
    id: string;
    userId?: string;
    name: string;
    parentLotId?: string;
}

export interface Origin extends SyncedRecord {
    id: string;
    userId?: string;
    name: string;
}

export interface BreedingSeason extends SyncedRecord {
    id: string;
    userId?: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'Activo' | 'Cerrado';
    requiresLightTreatment: boolean;
    
    // --- CAMPOS NUEVOS PARA TRATAMIENTO DE LUZ ---
    lightTreatmentStartDate?: string;
    lightTreatmentDuration?: number;
    lightTreatmentStatus?: 'Pendiente' | 'En Curso' | 'Finalizado';
    lightTreatmentConfirmed?: boolean;
}

export interface SireLot extends SyncedRecord {
    id: string;
    userId?: string;
    seasonId: string;
    sireId: string;
}

export interface ServiceRecord extends SyncedRecord {
    id: string;
    userId?: string;
    sireLotId: string;
    femaleId: string;
    serviceDate: string;
}

export interface Event extends SyncedRecord {
    id: string;
    userId?: string;
    animalId: string;
    date: string; 
    type: EventType; 
    details: string;
    notes?: string;
    lotName?: string;
    metaWeight?: number; 
    metaOutcome?: string; 
    metaSire?: string; 
}

export interface FeedingPlan extends SyncedRecord {
    id: string;
    userId?: string;
    lotName: string;
    details: string;
    startDate: string;
    endDate?: string;
}

export interface BodyWeighing extends SyncedRecord {
    id: string;
    userId?: string;
    animalId: string;
    date: string;
    kg: number;
}

export type ProductCategory = 'Vitaminas' | 'Modificadores Orgánicos' | 'Desparasitantes' | 'Antibióticos' | 'Vacunas' | 'Pomadas Tópicas' | 'Analgésicos' | 'Hormonas' | 'Antiinflamatorios' | 'Otro';

export interface Product extends SyncedRecord {
    id: string;
    userId?: string;
    name: string;
    laboratory?: string;
    category?: ProductCategory;
    presentationValue?: number;
    presentationUnit?: 'ml' | 'L';
    price?: number;
    applicationType: 'Oral' | 'Inyectable';
    applicationRoute?: 'Intramuscular' | 'Subcutáneo';
    dosageType: 'per_kg' | 'fixed';
    dosageFixed?: number;
    dosagePerKg_ml?: number;
    dosagePerKg_kg?: number;
    withdrawalDaysMilk?: number;
    withdrawalDaysMeat?: number;
}

export type AdultSubgroup = 'Cabritonas' | 'Cabras' | 'Reproductores' | 'Machos de Levante';

export interface HealthPlan extends SyncedRecord {
    id: string;
    userId?: string;
    name: string;
    description?: string;
    targetGroup: 'Maternidad' | 'Adultos';
    maternityMode?: 'existing_seasons' | 'future_seasons';
    adultsSubgroup?: AdultSubgroup[];
    targetLots?: string[];
}

export interface PlanActivity extends SyncedRecord {
    id: string;
    userId?: string;
    healthPlanId: string;
    category: 'Tratamiento' | 'Control';
    name: string;
    productId?: string;
    complementaryProductId?: string;
    trigger: {
        type: 'age' | 'fixed_date_period' | 'birthing_season_event';
        days?: number[];
        week?: number;
        month?: number;
        offsetDays?: number;
    };
}

export interface HealthEvent extends SyncedRecord {
    id: string;
    userId?: string;
    animalId: string;
    lotName?: string;
    date: string;
    activityId?: string;
    type: string;
    productUsed?: string;
    doseApplied?: number;
    unit?: 'ml' | 'g' | 'unidad';
    calculatedCost?: number;
    notes?: string;
    executedBy?: string;
    famachaGrade?: 1 | 2 | 3 | 4 | 5;
    diasRetiroLeche?: number;
    diasRetiroCarne?: number;
}

// --- Definición de Tablas con Tipos ---
export interface GanaderoOSTables {
    animals: Table<Animal>;
    fathers: Table<Father>;
    parturitions: Table<Parturition>;
    weighings: Table<Weighing>;
    lots: Table<Lot>;
    origins: Table<Origin>;
    breedingSeasons: Table<BreedingSeason>;
    sireLots: Table<SireLot>;
    serviceRecords: Table<ServiceRecord>;
    events: Table<Event>;
    feedingPlans: Table<FeedingPlan>;
    bodyWeighings: Table<BodyWeighing>;
    products: Table<Product>;
    healthPlans: Table<HealthPlan>;
    planActivities: Table<PlanActivity>;
    healthEvents: Table<HealthEvent>;
}

const DB_NAME = "GanaderoOS_DB";
const DB_VERSION = 22; 

export class GanaderoOSDB extends Dexie implements GanaderoOSTables {
    animals!: Table<Animal>;
    fathers!: Table<Father>;
    parturitions!: Table<Parturition>;
    weighings!: Table<Weighing>;
    lots!: Table<Lot>;
    origins!: Table<Origin>;
    breedingSeasons!: Table<BreedingSeason>;
    sireLots!: Table<SireLot>;
    serviceRecords!: Table<ServiceRecord>;
    events!: Table<Event>;
    feedingPlans!: Table<FeedingPlan>;
    bodyWeighings!: Table<BodyWeighing>;
    products!: Table<Product>;
    healthPlans!: Table<HealthPlan>;
    planActivities!: Table<PlanActivity>;
    healthEvents!: Table<HealthEvent>;

    constructor() {
        super(DB_NAME);

        this.version(DB_VERSION).stores({
            animals: '&id, userId, status, location, motherId, fatherId, sireLotId, _synced',
            fathers: '&id, userId, _synced',
            parturitions: '&id, userId, goatId, sireId, status, _synced', 
            weighings: '&id, userId, goatId, date, _synced',
            lots: '&id, userId, &name, parentLotId, _synced',
            origins: '&id, userId, &name, _synced',
            breedingSeasons: '&id, userId, &name, status, _synced',
            sireLots: '&id, userId, seasonId, sireId, _synced',
            serviceRecords: '&id, userId, sireLotId, femaleId, _synced',
            events: '&id, userId, animalId, date, type, lotName, _synced',
            feedingPlans: '&id, userId, lotName, _synced',
            bodyWeighings: '&id, userId, animalId, date, _synced',
            products: '&id, userId, &name, category, _synced',
            healthPlans: '&id, userId, &name, targetGroup, _synced',
            planActivities: '&id, userId, healthPlanId, category, _synced',
            healthEvents: '&id, userId, animalId, date, activityId, _synced',
        });
    }
}

let dbInstance: GanaderoOSDB | null = null;
export const initDB = async (): Promise<GanaderoOSDB> => {
    if (dbInstance) return dbInstance;
    const db = new GanaderoOSDB();
    try {
        await db.open();
        console.log("Base de datos local abierta con éxito (v" + DB_VERSION + ").");
        dbInstance = db;
        return db;
    } catch (error: any) {
        console.error("Error al abrir la base de datos local.", error);
        if (error.name === 'VersionError') {
             console.log("Dexie intentará actualizar la estructura de la base de datos.");
        } else if (confirm("Error al iniciar la base de datos local. ¿Deseas forzar el reinicio? (Tus datos en la nube están seguros). La aplicación se recargará.")) {
            await Dexie.delete(DB_NAME);
            window.location.reload();
        } else {
            alert("La aplicación no puede continuar sin una base de datos funcional.");
        }
        return new Promise(() => {});
    }
};

export const getDB = (): GanaderoOSDB => {
    if (!dbInstance) throw new Error("La base de datos no ha sido inicializada. Llama a initDB() primero.");
    return dbInstance;
};