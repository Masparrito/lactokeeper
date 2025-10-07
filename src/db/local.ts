import Dexie, { Table } from 'dexie';

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
  salePrice?: number;
  deathReason?: string;
  breedingFailures?: number;
}

export interface Father {
  id: string;
  name: string;
}

export interface Parturition {
  id: string;
  goatId: string;
  parturitionDate: string;
  sireId: string;
  offspringCount: number;
  parturitionType: 'Simple' | 'Doble' | 'Triple' | 'Cuádruple' | 'Quíntuple';
  status: 'activa' | 'en-secado' | 'seca' | 'finalizada';
  parturitionOutcome?: 'Normal' | 'Aborto' | 'Mortinato';
  dryingStartDate?: string;
}

export interface Weighing {
  id: string;
  goatId: string;
  date: string;
  kg: number;
}

export interface Lot {
    id: string;
    name: string;
}

export interface Origin {
    id: string;
    name: string;
}

export interface BreedingGroup {
    id: string;
    name: string;
    sireId: string;
    startDate: string;
    endDate: string;
    status: 'Activo' | 'Cerrado';
}

export interface ServiceRecord {
    id?: string;
    breedingGroupId: string;
    femaleId: string;
    serviceDate: string;
}

export interface Event {
    id?: string;
    animalId: string;
    date: string;
    type: EventType;
    details: string;
    notes?: string;
    lotName?: string;
}

export interface FeedingPlan {
    id?: string;
    lotName: string;
    details: string;
    startDate: string;
    endDate?: string;
}

export interface BodyWeighing {
    id?: string;
    animalId: string;
    date: string;
    kg: number;
}

export class LactoKeeperDB extends Dexie {
  animals!: Table<Animal>;
  fathers!: Table<Father>;
  parturitions!: Table<Parturition>;
  weighings!: Table<Weighing>; // Pesajes de leche
  lots!: Table<Lot>;
  origins!: Table<Origin>;
  breedingGroups!: Table<BreedingGroup>;
  serviceRecords!: Table<ServiceRecord>;
  events!: Table<Event>;
  feedingPlans!: Table<FeedingPlan>;
  bodyWeighings!: Table<BodyWeighing>;

  constructor() {
    super('LactoKeeperDB_v6'); 
    
    // Se incrementa la versión de la base de datos a 2 para registrar los nuevos cambios.
    this.version(2).stores({
      animals: '&id, createdAt, motherId, fatherId, status, lifecycleStage, location, isReference, reproductiveStatus, breedingGroupId',
      fathers: '&id',
      parturitions: '&id, goatId, sireId, status',
      weighings: '++id, goatId, date',
      lots: '&id, name',
      origins: '&id, name',
      breedingGroups: '&id, sireId, status',
      serviceRecords: '++id, breedingGroupId, femaleId, serviceDate',
      events: '++id, animalId, date, type, lotName', 
      feedingPlans: '++id, lotName',
      bodyWeighings: '++id, animalId, date',
    });
  }
}

export const db = new LactoKeeperDB();