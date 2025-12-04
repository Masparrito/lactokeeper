// src/utils/formatting.ts

import { Animal, Father } from '../db/local'; 

// --- NUEVA FUNCIÓN: Formato de Moneda ---
export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('es-VE', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(value);
};

// --- NUEVA FUNCIÓN: Limpiar ID (quita sufijos -M / -H) ---
// Úsala cuando necesites mostrar el ID puro en inputs o títulos
export const getCleanId = (id: string): string => {
    if (!id) return '';
    const upperId = id.toUpperCase().trim();
    // Si termina en guión + letra (ej: A109-M), cortamos los últimos 2 caracteres
    if (upperId.endsWith('-M') || upperId.endsWith('-H')) {
        return upperId.slice(0, -2);
    }
    return upperId;
};

/**
 * Formatea la visualización del ID y Nombre de un animal o padre en toda la aplicación.
 * AHORA SOPORTA IDs COMPUESTOS (limpia el sufijo visualmente).
 */
export const formatAnimalDisplay = (entity: (Partial<Animal> & { id: string, name?: string, isReference?: boolean }) | Father | undefined | null): string => {
    if (!entity) return 'N/A';

    // 1. Obtener ID, Nombre y estado de Referencia
    const rawId = entity.id;
    const rawName = (entity as any).name;
    const isRef = (entity as any).isReference;

    // 2. APLICAR LIMPIEZA DE ID AQUÍ (Para que A109-M se vea como A109)
    const formattedId = getCleanId(rawId || 'ID_DESCONOCIDO');
    
    const formattedName = rawName ? String(rawName).toUpperCase().trim() : '';

    // --- LÓGICA DE VISUALIZACIÓN ---

    // A. Si es Referencia autogenerada con nombre: Mostrar SOLO el nombre.
    if (isRef && formattedName.length > 0 && formattedId.startsWith('REF-')) {
        return formattedName; 
    }

    // B. Si tiene nombre: Mostrar "ID NOMBRE"
    if (formattedName.length > 0) {
        return `${formattedId} ${formattedName}`; 
    }
    
    // C. Si solo tiene ID: Mostrar ID limpio
    return formattedId; 
};