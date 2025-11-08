// src/types/navigation.ts (Corregido)

// El tipo para los módulos de la aplicación, ahora en un solo lugar.
// --- CAMBIO: Añadido 'evolucion' ---
export type AppModule = 'rebano' | 'lactokeeper' | 'kilos' | 'salud' | 'cents' | 'evolucion';

// El tipo para la navegación interna del módulo Rebaño
export type PageState = 
  | { name: 'lots-dashboard' } 
  | { name: 'lot-detail', lotName: string }
  | { name: 'sire-lot-detail', lotId: string }
  | { name: 'breeding-season-detail', seasonId: string }
  // --- (CORRECCIÓN) Añadida la prop kpiFilter con todos los tipos ---
  | { name: 'herd', locationFilter?: string, kpiFilter?: 'all' | 'females' | 'vientres' | 'Cabra' | 'Cabritona' | 'Crias' | 'Reproductor' }
  | { name: 'manage-lots' }
  | { name: 'management' } 
  // --- ACTUALIZACIÓN v4.0 ---
  // Se añade la propiedad opcional 'openAction' para permitir abrir el perfil
  // directamente en una acción específica desde el menú swipe.
  | { name: 'rebano-profile', animalId: string, openAction?: 'move' | 'decommission' }
  | { name: 'lactation-profile', animalId: string }
  | { name: 'growth-profile', animalId: string }
  | { name: 'add-animal' }
  | { name: 'ocr' }
  | { name: 'feeding-plan', lotName: string }
  | { name: 'batch-treatment', lotName: string }
  | { name: 'farm-calendar' }
  | { name: 'birthing-season-detail', seasonId: string }
  // --- CAMBIO: Añadida la nueva página de Configuración ---
  | { name: 'configuracion' };