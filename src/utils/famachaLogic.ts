// src/utils/famachaLogic.ts
// Lógica de negocio del módulo Famacha (funciones PURAS, sin acceso a red).
// Operan sobre las revisiones que ya están en memoria (cargadas vía Dexie),
// de modo que la UI puede calcular acción/índice al instante y offline.

import { FamachaRev, FamachaScore, FamachaAccion } from '../db/local';

// Pesos lineales para el índice de salud: F1=0 · F2=1 · F3=2 · F4=3 · F5=4
export const famachaPeso = (score: FamachaScore): number => score - 1;

/**
 * Revisión ANTERIOR de un animal: la de fecha máxima estrictamente menor a `fecha`.
 */
export const revisionAnterior = (
    revs: FamachaRev[],
    animalId: string,
    fecha: string
): FamachaRev | undefined => {
    return revs
        .filter(r => r.animalId === animalId && r.fecha < fecha)
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
};

/**
 * Acción sugerida al fijar el score (regla validada del prototipo):
 *   score <= 2            → "−"            (no dosis)
 *   score == 5            → "+ separar"    (dosis + apartar + veterinario)
 *   score 3 o 4:
 *      si la revisión ANTERIOR tenía score>=3 y su acción fue "+"/"+ separar"
 *                           → "="          (ya se trató y no mejoró: NO repetir)
 *      si no               → "+"           (dar dosis)
 */
export const calcularAccion = (
    revs: FamachaRev[],
    animalId: string,
    fecha: string,
    score: FamachaScore
): FamachaAccion => {
    if (score <= 2) return '−';
    if (score === 5) return '+ separar';
    const prev = revisionAnterior(revs, animalId, fecha);
    if (prev && prev.score >= 3 && (prev.accion === '+' || prev.accion === '+ separar')) {
        return '=';
    }
    return '+';
};

/**
 * Última revisión de cada animal (por fecha), como mapa animalId -> revisión.
 */
export const ultimaRevPorAnimal = (revs: FamachaRev[]): Map<string, FamachaRev> => {
    const map = new Map<string, FamachaRev>();
    for (const r of revs) {
        const actual = map.get(r.animalId);
        if (!actual || r.fecha > actual.fecha) map.set(r.animalId, r);
    }
    return map;
};

export type FamachaEstado = 'SANO' | 'VIGILAR' | 'ALERTA' | 'CRÍTICO' | 'SIN DATOS';

export interface IndiceInterpretacion {
    estado: FamachaEstado;
    accion: string;
    color: string; // tailwind/hex para la UI
}

export const interpretarIndice = (indice: number | null): IndiceInterpretacion => {
    if (indice === null) return { estado: 'SIN DATOS', accion: 'Aún no hay revisiones', color: '#71717a' };
    if (indice <= 0.8) return { estado: 'SANO', accion: 'Vigilancia habitual', color: '#34C759' };
    if (indice <= 1.5) return { estado: 'VIGILAR', accion: 'Acortar intervalo de revisión', color: '#FFD60A' };
    if (indice <= 2.5) return { estado: 'ALERTA', accion: 'Revisar manejo y desparasitación', color: '#FF9500' };
    return { estado: 'CRÍTICO', accion: 'Veterinario, revisar resistencia', color: '#FF3B30' };
};

export interface IndiceResultado {
    indice: number | null;
    puntaje: number;
    totalConRevision: number;
    interpretacion: IndiceInterpretacion;
    distribucion: Record<FamachaScore, number>; // conteo por score (última rev)
}

/**
 * Índice de salud Famacha de un conjunto de animales, usando la ÚLTIMA revisión
 * de cada uno. `animalIds` acota al lote/rebaño deseado (animales activos).
 */
export const calcularIndice = (revs: FamachaRev[], animalIds: string[]): IndiceResultado => {
    const ultimas = ultimaRevPorAnimal(revs);
    const distribucion: Record<FamachaScore, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let puntaje = 0;
    let total = 0;
    for (const id of animalIds) {
        const rev = ultimas.get(id);
        if (!rev) continue;
        total += 1;
        distribucion[rev.score] += 1;
        puntaje += famachaPeso(rev.score);
    }
    const indice = total > 0 ? puntaje / total : null;
    return {
        indice,
        puntaje,
        totalConRevision: total,
        interpretacion: interpretarIndice(indice),
        distribucion,
    };
};

/**
 * Alerta "tratado y no mejora" (spec §5): mirando las 3 revisiones más recientes
 * del animal, si al menos 2 recientes tienen score>=3 y alguna posterior a la
 * primera recibió dosis (+/+ separar) → evita re-desparasitar en automático.
 */
export const tratadoYNoMejora = (revs: FamachaRev[], animalId: string): boolean => {
    const recientes = revs
        .filter(r => r.animalId === animalId)
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1))
        .slice(0, 3);
    if (recientes.length < 2) return false;
    const conScoreAlto = recientes.filter(r => r.score >= 3).length;
    // recientes está en orden descendente; "posteriores a la primera" = las más
    // recientes excepto la más antigua de las 3.
    const tuvoDosisReciente = recientes
        .slice(0, recientes.length - 1)
        .some(r => r.dosis || r.accion === '+' || r.accion === '+ separar');
    return conScoreAlto >= 2 && tuvoDosisReciente;
};

export const MENSAJE_NO_MEJORA =
    'Lleva varias revisiones en Famacha 3+ habiendo sido tratado. NO repetir dosis ' +
    'automáticamente — revisar cojera, dientes, dentadura, otra enfermedad o ' +
    'tratamiento alterno. Consultar veterinario.';
