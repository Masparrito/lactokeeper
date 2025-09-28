import Dexie, { Table } from 'dexie';

// Define la "forma" o estructura de nuestros datos.
export interface Goat {
  id: string; // Clave primaria (ej: 'R063')
  lactationCount: number;
  motherId?: string;
}
export interface Weighing {
  id?: number; // Clave autoincremental
  goatId: string;
  date: string;
  kg: number;
}
export interface Birth {
    id?: number; // Clave autoincremental
    goatId: string;
    parturitionDate: string;
}

export class LactoKeeperDB extends Dexie {
  goats!: Table<Goat>;
  weighings!: Table<Weighing>;
  births!: Table<Birth>;

  constructor() {
    super('LactoKeeperDB_Weather'); // Nuevo nombre para evitar conflictos
    this.version(1).stores({
      goats: '&id',
      weighings: '++id, goatId, date',
      births: '++id, goatId'
    });
  }
}

export const db = new LactoKeeperDB();

