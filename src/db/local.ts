// src/db/local.ts

import Dexie, { Table } from 'dexie';

// --- TIPOS DE DATOS ---
export type ReproductiveStatus = 'Vacía' | 'En Servicio' | 'Preñada' | 'Post-Parto' | 'No Aplica';
export type FemaleLifecycleStage = 'Cabrita' | 'Cabritona' | 'Cabra Primípara' | 'Cabra Multípara';
export type MaleLifecycleStage = 'Cabrito' | 'Macho de Levante' | 'Macho Cabrío';
export type EventType = 'Nacimiento' | 'Movimiento' | 'Cambio de Estado' | 'Pesaje Lechero' | 'Pesaje Corporal' | 'Servicio' | 'Tratamiento' | 'Diagnóstico';

export interface Animal {
    id: string;
    createdAt?: number;
    sex: 'Hembra' | 'Macho';
    status: 'Activo' | 'Venta' | 'Muerte' | 'Descarte';
    birthDate: string;
    motherId?: string;
    fatherId?: string;
    birthWeight?: number;
    conceptionMethod?: string;
    lifecycleStage: FemaleLifecycleStage | MaleLifecycleStage;    
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

export interface Father { id: string; name: string; }

export interface Parturition { 
    id: string; 
    goatId: string; 
    parturitionDate: string; 
    sireId: string; 
    offspringCount: number; 
    parturitionType: 'Simple' | 'Doble' | 'Triple' | 'Cuádruple' | 'Quíntuple'; 
    status: 'activa' | 'en-secado' | 'seca' | 'finalizada'; 
    parturitionOutcome?: 'Normal' | 'Aborto' | 'Con Mortinatos';
    dryingStartDate?: string; 
}

export interface Weighing { id?: string; goatId: string; date: string; kg: number; }
export interface Lot { id: string; name: string; }
export interface Origin { id: string; name: string; }

export interface BreedingSeason {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'Activo' | 'Cerrado';
    requiresLightTreatment: boolean;
}

export interface SireLot {
    id: string;
    seasonId: string;
    sireId: string;
}

export interface ServiceRecord {
    id?: string;
    sireLotId: string;
    femaleId: string;
    serviceDate: string;
}

export interface Event { id?: string; animalId: string; date: string; type: EventType; details: string; notes?: string; lotName?: string; }
export interface FeedingPlan { id?: string; lotName: string; details: string; startDate: string; endDate?: string; }
export interface BodyWeighing { id?: string; animalId: string; date: string; kg: number; }
export interface Product { id?: string; name: string; presentation: string; totalCost: number; totalVolume: number; unit: 'ml' | 'g' | 'unidad'; dosagePer10Kg: number; }

export interface HealthPlan {
    id?: string;
    name: string;
    description: string;
    targetCriteria: {
        minAgeDays?: number;
        maxAgeDays?: number;
        categories?: (FemaleLifecycleStage | MaleLifecycleStage)[];
        targetStatus?: ReproductiveStatus[];
    };
}

export interface HealthPlanTask {
    id?: string;
    healthPlanId: string;
    name: string;
    type: 'Desparasitación' | 'Vacunación' | 'Vitaminas' | 'Minerales' | 'Control';
    productId: string;
    trigger: {
        type: 'age' | 'fixed_date_period' | 'birthing_season_event'; 
        days?: number;
        week?: number;
        month?: number;
        offsetDays?: number; 
    };
}

export interface HealthEvent { id?: string; animalId: string; lotName?: string; date: string; taskId?: string; type: HealthPlanTask['type'] | 'Tratamiento Específico'; productUsed: string; doseApplied: number; unit: Product['unit']; calculatedCost: number; notes?: string; executedBy?: string; }

const DB_NAME = "GanaderoOS_DB";
const DB_VERSION = 7;

export class GanaderoOSDB extends Dexie {
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
    healthPlanTasks!: Table<HealthPlanTask>;
    healthEvents!: Table<HealthEvent>;

    constructor() {
        super(DB_NAME);
        
        this.version(1).stores({
            animals: '&id, createdAt, status, isReference, location',
            fathers: '&id',
            parturitions: '++id, &goatId, sireId, status',
            weighings: '++id, goatId, date',
            lots: '++id, name',
            origins: '++id, name',
            breedingGroups: '++id, sireId, status',
            serviceRecords: '++id, breedingGroupId, femaleId',
            events: '++id, animalId, date, type',    
            feedingPlans: '++id, lotName',
            bodyWeighings: '++id, animalId, date',
        });

        this.version(2).stores({
            products: '++id, &name',
            healthPlans: '++id, &name',
            healthPlanTasks: '++id, healthPlanId, productId',
            healthEvents: '++id, animalId, date, type, taskId'
        });

        this.version(3).stores({
            animals: '&id, createdAt, status, isReference, location, sireLotId',
            breedingGroups: null,    
            breedingSeasons: '++id, &name, status',
            sireLots: '++id, seasonId, sireId',
            serviceRecords: '++id, sireLotId, femaleId'
        });

        this.version(4).stores({
            breedingSeasons: '&id, &name, status',
            sireLots: '&id, seasonId, sireId',
        });

        this.version(5).stores({
            healthPlanTasks: '++id, healthPlanId, productId',
        });

        this.version(6).stores({
            healthPlans: '++id, &name',
            healthPlanTasks: '++id, healthPlanId, productId',
        });

        this.version(DB_VERSION).stores({
            parturitions: '++id, &goatId, sireId, status, parturitionOutcome',
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
        console.error("Error al abrir la base de datos local. Podría ser un problema de migración.", error);
        if (confirm("GanaderoOS ha sido actualizado y necesita reiniciar la base de datos local. Tus datos en la nube están a salvo. ¿Deseas continuar? La aplicación se recargará.")) {
            await Dexie.delete(DB_NAME);
            window.location.reload();
        } else {
            alert("La aplicación no puede continuar sin una base de datos funcional. Por favor, recarga la página e intenta de nuevo.");
        }
        return new Promise(() => {});
    }
};

export const getDB = (): GanaderoOSDB => {
    if (!dbInstance) throw new Error("La base de datos no ha sido inicializada. Llama a initDB() primero.");
    return dbInstance;
};