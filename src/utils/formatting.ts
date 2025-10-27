// src/utils/formatting.ts

import { Animal, Father } from '../db/local'; // Importa los tipos base

/**
 * Formatea la visualización del ID y Nombre de un animal o padre en toda la aplicación.
 *
 * Reglas de formato actualizadas:
 * 1. Si es Referencia, tiene nombre, y su ID es autogenerado (ej: "REF-123..."),
 * se muestra SÓLO el nombre. (Ej: "DRAGON SERSIA FRANCE")
 * 2. Si tiene un ID manual (no 'REF-') y un nombre, se muestra "ID NOMBRE". (Ej: "1422916 DROOPY...")
 * 3. Si solo tiene ID (manual o auto-generado) y no tiene nombre, se muestra SÓLO el ID. (Ej: "1422916" o "REF-176...")
 *
 * @param entity El objeto Animal, Father, o una estructura con { id, name?, isReference? }.
 * @returns El string formateado.
 */
export const formatAnimalDisplay = (entity: (Partial<Animal> & { id: string, name?: string, isReference?: boolean }) | Father | undefined | null): string => {
    if (!entity) return 'N/A';

    // 1. Obtener ID, Nombre y estado de Referencia
    const rawId = entity.id;
    const rawName = (entity as any).name;
    const isRef = (entity as any).isReference;

    const formattedId = rawId ? rawId.toUpperCase().trim() : 'ID_DESCONOCIDO';
    const formattedName = rawName ? String(rawName).toUpperCase().trim() : '';

    // --- LÓGICA DE VISUALIZACIÓN CORREGIDA ---

    // 1. Si es Referencia, tiene nombre, y el ID es autogenerado: Mostrar SOLO el nombre.
    if (isRef && formattedName.length > 0 && formattedId.startsWith('REF-')) {
        return formattedName; // Ej: "DRAGON SERSIA FRANCE"
    }

    // 2. Si tiene ID y Nombre (y no cumplió la condición 1): Mostrar ID NOMBRE (sin paréntesis)
    if (formattedName.length > 0) {
        return `${formattedId} ${formattedName}`; // Ej: "1422916 DROOPY IA DA CAPRIVAMA"
    }
    
    // 3. Si solo tiene ID (Activo o Referencia sin nombre): Mostrar SOLO ID
    return formattedId; // Ej: "1422916" o "REF-1761252437896"
};