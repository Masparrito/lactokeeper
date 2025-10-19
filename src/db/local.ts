// src/db/local.ts

import Dexie, { Table } from 'dexie';

// --- TIPOS DE DATOS ---
export type ReproductiveStatus = 'Vacía' | 'En Servicio' | 'Preñada' | 'Post-Parto' | 'No Aplica';
export type FemaleLifecycleStage = 'Cabrita' | 'Cabritona' | 'Cabra Primípara' | 'Cabra Multípara';
export type MaleLifecycleStage = 'Cabrito' | 'Macho de Levante' | 'Macho Cabrío';
// --- TIPO DE EVENTO ACTUALIZADO ---
export type EventType = 'Nacimiento' | 'Movimiento' | 'Cambio de Estado' | 'Pesaje Lechero' | 'Pesaje Corporal' | 'Servicio' | 'Tratamiento' | 'Diagnóstico' | 'Parto' | 'Aborto';

export interface Animal {
    id: string;
    createdAt?: number;
    userId?: string;
    sex: 'Hembra' | 'Macho';
    status: 'Activo' | 'Venta' | 'Muerte' | 'Descarte';
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
    race?: string;
    racialComposition?: string;
    observations?: string;
    reproductiveStatus: ReproductiveStatus;
    sireLotId?: string;
    endDate?: string;
    salePrice?: number;
    saleBuyer?: string;
    salePurpose?: 'Cría' | 'Carne';
    deathReason?: string;
    cullReason?: 'Baja producción' | 'Bajo índice de crecimiento' | 'Inflamación articular' | 'Linfadenitis caseosa' | 'Sospecha de otras enfermedades';
    cullReasonDetails?: string;
    breedingFailures?: number;
}

export interface Father {
    id: string;
    userId?: string;
    name: string;
}

export interface Parturition {
    id: string;
    userId?: string;
    goatId: string;
    parturitionDate: string;
    sireId: string;
    offspringCount: number;
    parturitionType: 'Simple' | 'Doble' | 'Triple' | 'Cuádruple' | 'Quíntuple';
    status: 'activa' | 'en-secado' | 'seca' | 'finalizada';
    parturitionOutcome?: 'Normal' | 'Aborto' | 'Con Mortinatos';
    dryingStartDate?: string;
}

export interface Weighing {
    id: string;
    userId?: string;
    goatId: string;
    date: string;
    kg: number;
}

export interface Lot {
    id: string;
    userId?: string;
    name: string;
    parentLotId?: string; // <-- CAMPO AÑADIDO PARA SUB-LOTES
}

export interface Origin {
    id: string;
    userId?: string;
    name: string;
}

export interface BreedingSeason {
    id: string;
    userId?: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'Activo' | 'Cerrado';
    requiresLightTreatment: boolean;
}

export interface SireLot {
    id: string;
    userId?: string;
    seasonId: string;
    sireId: string;
}

export interface ServiceRecord {
    id: string;
    userId?: string;
    sireLotId: string;
    femaleId: string;
    serviceDate: string;
}

export interface Event {
    id: string;
    userId?: string;
    animalId: string;
    date: string;
    type: EventType;
    details: string;
    notes?: string;
    lotName?: string;
}

export interface FeedingPlan {
    id: string;
    userId?: string;
    lotName: string;
    details: string;
    startDate: string;
    endDate?: string;
}

export interface BodyWeighing {
    id: string;
    userId?: string;
    animalId: string;
    date: string;
    kg: number;
}

export type ProductCategory = 'Vitaminas' | 'Modificadores Orgánicos' | 'Desparasitantes' | 'Antibióticos' | 'Vacunas' | 'Pomadas Tópicas' | 'Analgésicos' | 'Hormonas' | 'Antiinflamatorios' | 'Otro';

export interface Product {
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
}

export type AdultSubgroup = 'Cabritonas' | 'Cabras' | 'Reproductores' | 'Machos de Levante';

export interface HealthPlan {
    id: string;
    userId?: string;
    name: string;
    description?: string;
    targetGroup: 'Maternidad' | 'Adultos';
    maternityMode?: 'existing_seasons' | 'future_seasons';
    adultsSubgroup?: AdultSubgroup[];
    targetLots?: string[];
}

export interface PlanActivity {
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

export interface HealthEvent {
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
}

const DB_NAME = "GanaderoOS_DB";
const DB_VERSION = 19;

export class GanaderoOSDB extends Dexie {
    animals!: Table<Animal>;
    fathers!: Table<Father>;
    parturitions!: Table<Parturition>;
    weighings!: Table<Weighing>;
    lots!: Table<Lot>; // Esta tabla ahora soporta sub-lotes
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
            animals: '&id, userId, status, location, motherId, fatherId, sireLotId',
            fathers: '&id, userId',
            parturitions: '&id, userId, goatId, status',
            weighings: '&id, userId, goatId, date',
            lots: '&id, userId, &name, parentLotId', // <-- ÍNDICE AÑADIDO
            origins: '&id, userId, &name',
            breedingSeasons: '&id, userId, &name, status',
            sireLots: '&id, userId, seasonId, sireId',
            serviceRecords: '&id, userId, sireLotId, femaleId',
            events: '&id, userId, animalId, date, type, lotName',
            feedingPlans: '&id, userId, lotName',
            bodyWeighings: '&id, userId, animalId, date',
            products: '&id, userId, &name, category',
            healthPlans: '&id, userId, &name, targetGroup',
            planActivities: '&id, userId, healthPlanId, category',
            healthEvents: '&id, userId, animalId, date, activityId',
        });
    }
}

let dbInstance: GanaderoOSDB | null = null;
export const initDB = async (): Promise<GanaderoOSDB> => {
    if (dbInstance) return dbInstance;
    const db = new GanaderoOSDB();
    try {
        await db.open();
        console.log("Base de datos local abierta con éxito.");
        dbInstance = db;
        return db;
    } catch (error) {
        console.error("Error al abrir la base de datos local.", error);
        if (confirm("GanaderoOS necesita actualizar la base de datos local. Tus datos en la nube están a salvo. ¿Deseas continuar? La aplicación se recargará.")) {
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