// src/utils/formatting.ts

import { Animal, Father } from '../db/local'; // Importa los tipos base

/**
 * Formatea la visualización del ID y Nombre de un animal o padre en toda la aplicación.
 *
 * Reglas aplicadas:
 * 1. El ID se muestra en MAYÚSCULAS.
 * 2. Si tiene nombre, el formato es "ID (NOMBRE)".
 * 3. Si el ID es generado (ej: REF-XXXXX) y NO tiene nombre, solo se muestra el ID generado.
 *
 * @param entity El objeto Animal, Father, o una estructura con { id, name? }.
 * @returns El string formateado (ej: "T047 (PRINCESA)" o "A109").
 */
export const formatAnimalDisplay = (entity: Animal | Father | { id: string, name?: string } | undefined | null): string => {
    if (!entity) return 'N/A';

    // 1. Obtener ID y Nombre de forma segura y en MAYÚSCULAS
    const rawId = entity.id;
    // Accedemos a 'name' de forma segura, ya que 'Father' lo tiene, y Animal/estructura parcial lo tienen opcionalmente.
    const rawName = (entity as any).name;

    const formattedId = rawId ? rawId.toUpperCase() : 'ID_DESCONOCIDO'; // Fallback por si acaso
    const formattedName = rawName ? String(rawName).toUpperCase().trim() : '';

    // 2. Si tiene un nombre válido, usar el formato ID (NOMBRE).
    if (formattedName.length > 0) {
        // Usa el ID completo (incluyendo REF- si lo tiene) + Nombre.
        return `${formattedId} (${formattedName})`;
    }

    // 3. Si no tiene nombre, mostrar solo el ID (ya en mayúsculas).
    return formattedId;
};