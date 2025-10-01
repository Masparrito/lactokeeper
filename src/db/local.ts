import Dexie, { Table } from 'dexie';

export interface Animal {
  id: string; 
  sex: 'Hembra' | 'Macho';
  status: 'Activo' | 'Vendido' | 'Descartado' | 'Muerto';
  birthDate: string;
  motherId?: string;
  fatherId?: string;
  birthWeight?: number;
  parturitionId?: number;
}

// CORRECCIÓN: Renombramos 'Sire' a 'Father'
export interface Father {
  id: string;
  name: string;
}

export interface Parturition {
  id?: number;
  firestoreId: string; // <-- LÍNEA CORREGIDA
  goatId: string;
  parturitionDate: string;
  sireId: string; // Mantenemos sireId como referencia interna, pero en la UI será "Padre"
  offspringCount: number;
  parturitionType: 'Simple' | 'Doble' | 'Triple' | 'Cuádruple' | 'Quíntuple';
  status: 'activa' | 'en-secado' | 'seca';
  dryingStartDate?: string;
}

export interface Weighing {
  id?: number;
  goatId: string;
  date: string;
  kg: number;
}

export class LactoKeeperDB extends Dexie {
  animals!: Table<Animal>;
  // CORRECCIÓN: Renombramos 'sires' a 'fathers'
  fathers!: Table<Father>;
  parturitions!: Table<Parturition>;
  weighings!: Table<Weighing>;

  constructor() {
    super('LactoKeeperDB_v2'); 
    this.version(1).stores({
      animals: '&id, motherId, fatherId, parturitionId, status',
      // CORRECCIÓN: Renombramos la tabla
      fathers: '&id',
      parturitions: '++id, goatId, sireId, status, firestoreId', // <-- Añadimos firestoreId aquí también
      weighings: '++id, goatId, date',
    });
  }
}

export const db = new LactoKeeperDB();