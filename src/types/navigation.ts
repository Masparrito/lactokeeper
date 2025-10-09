// src/types/navigation.ts

// Este archivo ahora contiene la definición centralizada para la navegación del módulo Rebaño.
// Cualquier componente que necesite saber sobre estas páginas, importará el tipo desde aquí.

export type PageState = 
  | { name: 'lots-dashboard' } 
  | { name: 'lot-detail', lotName: string }
  | { name: 'breeding-group-detail', groupId: string }
  | { name: 'herd', locationFilter?: string }
  | { name: 'manage-lots' }
  | { name: 'management' } 
  | { name: 'rebano-profile', animalId: string }
  | { name: 'lactation-profile', animalId: string }
  | { name: 'growth-profile', animalId: string }
  | { name: 'add-animal' }
  | { name: 'ocr' }
  | { name: 'feeding-plan', lotName: string }
  | { name: 'batch-treatment', lotName: string };