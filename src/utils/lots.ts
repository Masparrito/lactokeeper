// src/utils/lots.ts
// Los lotes se identifican por NOMBRE (la `location` del animal es el nombre del
// lote). Para permitir el mismo nombre de corral en distintos lotes (ej. "Corral 1"
// en Caney 1 y en Caney 2) los sub-lotes se guardan namespaced con su lote padre
// ("Caney 2 · Corral 1"), garantizando unicidad global, pero se MUESTRAN con el
// nombre corto.
export const SUBLOT_SEP = ' · ';

export const composeSubLotName = (parentName: string, childName: string): string =>
    `${parentName.trim()}${SUBLOT_SEP}${childName.trim()}`;

// Nombre visible de un sub-lote: la parte después del separador.
export const subLotDisplayName = (fullName: string): string => {
    if (!fullName) return '';
    const i = fullName.indexOf(SUBLOT_SEP);
    return i >= 0 ? fullName.slice(i + SUBLOT_SEP.length) : fullName;
};

// Nombre del lote padre embebido en el nombre completo de un sub-lote (o '').
export const subLotParentName = (fullName: string): string => {
    if (!fullName) return '';
    const i = fullName.indexOf(SUBLOT_SEP);
    return i >= 0 ? fullName.slice(0, i) : '';
};
