// --- ESTE ES EL NUEVO ARCHIVO CENTRAL DE TIPOS ---

// El tipo para los módulos de la aplicación, ahora en un solo lugar.
export type AppModule = 'rebano' | 'lactokeeper' | 'kilos' | 'salud' | 'cents';

// El tipo para la navegación interna del módulo Rebaño
export type PageState = 
  | { name: 'lots-dashboard' } 
  | { name: 'lot-detail', lotName: string }
  | { name: 'sire-lot-detail', lotId: string }
  | { name: 'breeding-season-detail', seasonId: string }
  | { name: 'herd', locationFilter?: string }
  | { name: 'manage-lots' }
  | { name: 'management' } 
  | { name: 'rebano-profile', animalId: string }
  | { name: 'lactation-profile', animalId: string }
  | { name: 'growth-profile', animalId: string }
  | { name: 'add-animal' }
  | { name: 'ocr' }
  | { name: 'feeding-plan', lotName: string }
  | { name: 'batch-treatment', lotName: string }
  | { name: 'farm-calendar' }
  | { name: 'birthing-season-detail', seasonId: string };
