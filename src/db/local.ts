// src/db/local.ts

import Dexie, { Table } from 'dexie';

// --- TIPOS DE DATOS EXISTENTES (Sin cambios) ---
export type ReproductiveStatus = 'Vacía' | 'En Servicio' | 'Preñada' | 'Post-Parto' | 'No Aplica';
export type FemaleLifecycleStage = 'Cabrita' | 'Cabritona' | 'Cabra Primípara' | 'Cabra Multípara';
export type MaleLifecycleStage = 'Cabrito' | 'Cabriton' | 'Macho Cabrío';
export type EventType = 
    | 'Nacimiento' | 'Movimiento' | 'Cambio de Estado' 
    | 'Pesaje Lechero' | 'Pesaje Corporal' 
    | 'Servicio' | 'Tratamiento' | 'Diagnóstico';

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
  breedingGroupId?: string;
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
export interface Parturition { id: string; goatId: string; parturitionDate: string; sireId: string; offspringCount: number; parturitionType: 'Simple' | 'Doble' | 'Triple' | 'Cuádruple' | 'Quíntuple'; status: 'activa' | 'en-secado' | 'seca' | 'finalizada'; parturitionOutcome?: 'Normal' | 'Aborto' | 'Mortinato'; dryingStartDate?: string; }
export interface Weighing { id?: string; goatId: string; date: string; kg: number; }
export interface Lot { id: string; name: string; }
export interface Origin { id: string; name: string; }
export interface BreedingGroup { id: string; name: string; sireId: string; startDate: string; endDate: string; status: 'Activo' | 'Cerrado'; }
export interface ServiceRecord { id?: string; breedingGroupId: string; femaleId: string; serviceDate: string; }
export interface Event { id?: string; animalId: string; date: string; type: EventType; details: string; notes?: string; lotName?: string; }
export interface FeedingPlan { id?: string; lotName: string; details: string; startDate: string; endDate?: string; }
export interface BodyWeighing { id?: string; animalId: string; date: string; kg: number; }

// --- NUEVAS INTERFACES PARA EL MÓDULO DE SANIDAD ---

export interface Product {
  id?: string;
  name: string;
  presentation: string; // Ej: "Frasco 500ml"
  totalCost: number; // Costo total del envase
  totalVolume: number; // Volumen en ml o cantidad en unidades
  unit: 'ml' | 'g' | 'unidad'; // Unidad de medida
  dosagePer10Kg: number; // Dosis por cada 10kg de peso vivo
}

export interface HealthPlan {
  id?: string;
  name: string; // Ej: "Plan Sanitario Cabritonas (3-7 meses)"
  description: string;
  // Criterios para aplicar el plan automáticamente
  targetCriteria: {
    minAgeDays?: number;
    maxAgeDays?: number;
    categories?: (FemaleLifecycleStage | MaleLifecycleStage)[];
  };
}

export interface HealthPlanTask {
  id?: string;
  healthPlanId: string;
  name: string; // Ej: "1ra Desparasitación"
  type: 'Desparasitación' | 'Vacunación' | 'Vitaminas' | 'Minerales' | 'Control';
  productId: string; // ID del producto a usar
  // Disparador para la tarea
  trigger: {
    type: 'age' | 'fixed_date_period';
    days?: number; // Ej: Aplicar a los 90 días de edad
    week?: number; // Ej: Aplicar en la 3ra semana
    month?: number; // Ej: Aplicar en el mes de Febrero (2)
  };
}

export interface HealthEvent {
  id?: string;
  animalId: string;
  lotName?: string;
  date: string;
  taskId?: string; // Tarea del plan que originó este evento (opcional)
  type: HealthPlanTask['type'] | 'Tratamiento Específico';
  productUsed: string; // Nombre del producto
  doseApplied: number; // Dosis final aplicada
  unit: Product['unit'];
  calculatedCost: number; // Costo automático de la dosis
  notes?: string;
  executedBy?: string; // Quién aplicó el tratamiento
}


// --- CONSTANTES DE LA BASE DE DATOS ---
const DB_NAME = "LactoKeeperDB";
// --- CAMBIO CLAVE: Se incrementa la versión de la DB ---
const DB_VERSION = 2;


export class LactoKeeperDB extends Dexie {
  animals!: Table<Animal>;
  fathers!: Table<Father>;
  parturitions!: Table<Parturition>;
  weighings!: Table<Weighing>;
  lots!: Table<Lot>;
  origins!: Table<Origin>;
  breedingGroups!: Table<BreedingGroup>;
  serviceRecords!: Table<ServiceRecord>;
  events!: Table<Event>;
  feedingPlans!: Table<FeedingPlan>;
  bodyWeighings!: Table<BodyWeighing>;
  
  // --- NUEVAS TABLAS PARA EL MÓDULO DE SANIDAD ---
  products!: Table<Product>;
  healthPlans!: Table<HealthPlan>;
  healthPlanTasks!: Table<HealthPlanTask>;
  healthEvents!: Table<HealthEvent>;


  constructor() {
    super(DB_NAME);
    
    // Versión 1 (sin cambios)
    this.version(1).stores({
      animals: '&id, createdAt, status, isReference, location',
      fathers: '&id',
      parturitions: '++id, goatId, sireId, status',
      weighings: '++id, goatId, date',
      lots: '++id, &name',
      origins: '++id, &name',
      breedingGroups: '++id, sireId, status',
      serviceRecords: '++id, breedingGroupId, femaleId',
      events: '++id, animalId, date, type', 
      feedingPlans: '++id, lotName',
      bodyWeighings: '++id, animalId, date',
    });

    // --- CAMBIO CLAVE: Se añade la nueva versión con las tablas de sanidad ---
    this.version(DB_VERSION).stores({
      animals: '&id, createdAt, status, isReference, location',
      fathers: '&id',
      parturitions: '++id, goatId, sireId, status',
      weighings: '++id, goatId, date',
      lots: '++id, &name',
      origins: '++id, &name',
      breedingGroups: '++id, sireId, status',
      serviceRecords: '++id, breedingGroupId, femaleId',
      events: '++id, animalId, date, type', 
      feedingPlans: '++id, lotName',
      bodyWeighings: '++id, animalId, date',
      // Nuevas tablas
      products: '++id, &name',
      healthPlans: '++id, &name',
      healthPlanTasks: '++id, healthPlanId, productId',
      healthEvents: '++id, animalId, date, type, taskId'
    });
  }
}

// --- SINGLETON Y FUNCIÓN DE INICIALIZACIÓN ROBUSTA (sin cambios) ---
let dbInstance: LactoKeeperDB | null = null;

export const initDB = async (): Promise<LactoKeeperDB> => {
    if (dbInstance) {
        return dbInstance;
    }

    const db = new LactoKeeperDB();

    try {
        await db.open();
        console.log("Base de datos local abierta con éxito.");
        dbInstance = db;
        return db;
    } catch (error) {
        console.error("Error al abrir la base de datos local. Podría ser un problema de migración.", error);
        
        if (confirm("LactoKeeper ha sido actualizado y necesita reiniciar la base de datos local. Tus datos en la nube están a salvo. ¿Deseas continuar? La aplicación se recargará.")) {
            await Dexie.delete(DB_NAME);
            window.location.reload();
        } else {
            alert("La aplicación no puede continuar sin una base de datos funcional. Por favor, recarga la página e intenta de nuevo.");
        }
        
        return new Promise(() => {});
    }
};

export const getDB = (): LactoKeeperDB => {
    if (!dbInstance) {
        throw new Error("La base de datos no ha sido inicializada. Llama a initDB() primero.");
    }
    return dbInstance;
};