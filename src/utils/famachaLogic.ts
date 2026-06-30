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

// --- Días entre dos fechas "YYYY-MM-DD" (helper local) ---
const diasEntre = (a: string, b: string): number => {
    if (!a || !b) return 0;
    return Math.round(Math.abs(new Date(a + 'T00:00:00Z').getTime() - new Date(b + 'T00:00:00Z').getTime()) / 86400000);
};

// --- TENDENCIA: ¿mejoró, empeoró o quedó igual respecto a la revisión anterior? ---
// En Famacha un score MENOR es mejor (1 = sano … 5 = anémico grave).
export type Tendencia = 'mejoro' | 'empeoro' | 'igual' | null;

/**
 * Compara un score (el actual o uno hipotético) con la revisión ANTERIOR del animal.
 * Devuelve null si no hay revisión previa con la cual comparar.
 */
export const tendenciaFamacha = (
    revs: FamachaRev[],
    animalId: string,
    fecha: string,
    score: FamachaScore
): Tendencia => {
    const prev = revisionAnterior(revs, animalId, fecha);
    if (!prev) return null;
    if (score < prev.score) return 'mejoro';
    if (score > prev.score) return 'empeoro';
    return 'igual';
};

// --- INFO DE DOSIFICACIÓN: control del intervalo y máximo de aplicaciones ---
// Regla de manejo: máximo 2 aplicaciones de desparasitante separadas 7 días.
// Esta función NO bloquea; informa para que el usuario decida en campo.
export type NivelDosis = 'ok' | 'warn' | 'block';

export interface InfoDosis {
    ultimaDosisFecha: string | null;   // fecha de la última dosis previa
    diasDesdeUltimaDosis: number | null;
    dosisEnVentana: number;            // # de dosis en los últimos 14 días (antes de `fecha`)
    nivel: NivelDosis;                 // ok = puede dosificar · warn = con cuidado · block = no aplicar
    mensaje: string;                   // recomendación legible
}

export const VENTANA_TRATAMIENTO_DIAS = 14; // ~2 aplicaciones separadas 7 días
export const INTERVALO_MIN_DIAS = 7;

export const infoDosificacion = (
    revs: FamachaRev[],
    animalId: string,
    fecha: string
): InfoDosis => {
    const dosisPrevias = revs
        .filter(r => r.animalId === animalId && r.dosis && r.fecha < fecha)
        .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));

    const ultima = dosisPrevias[0] || null;
    const dias = ultima ? diasEntre(fecha, ultima.fecha) : null;
    const dosisEnVentana = dosisPrevias.filter(r => diasEntre(fecha, r.fecha) <= VENTANA_TRATAMIENTO_DIAS).length;

    if (!ultima) {
        return { ultimaDosisFecha: null, diasDesdeUltimaDosis: null, dosisEnVentana: 0, nivel: 'ok', mensaje: 'Sin dosis previas registradas.' };
    }
    if (dosisEnVentana >= 2) {
        return {
            ultimaDosisFecha: ultima.fecha, diasDesdeUltimaDosis: dias, dosisEnVentana, nivel: 'block',
            mensaje: `Ya recibió ${dosisEnVentana} aplicaciones en ~2 semanas. No aplicar más; revisar manejo o consultar veterinario.`,
        };
    }
    if (dias !== null && dias < INTERVALO_MIN_DIAS) {
        return {
            ultimaDosisFecha: ultima.fecha, diasDesdeUltimaDosis: dias, dosisEnVentana, nivel: 'warn',
            mensaje: `Última dosis hace ${dias} día(s). Espera al menos 7 días entre aplicaciones.`,
        };
    }
    return {
        ultimaDosisFecha: ultima.fecha, diasDesdeUltimaDosis: dias, dosisEnVentana, nivel: 'ok',
        mensaje: `Última dosis hace ${dias} día(s). Puede repetirse si el cuadro lo amerita.`,
    };
};

/** Fecha de la jornada Famacha más reciente (cualquier animal). */
export const ultimaJornada = (revs: FamachaRev[]): string | null => {
    let max: string | null = null;
    for (const r of revs) if (!max || r.fecha > max) max = r.fecha;
    return max;
};

/** Penúltima jornada distinta a la última (para comparativas de índice). */
export const jornadaAnterior = (revs: FamachaRev[]): string | null => {
    const fechas = Array.from(new Set(revs.map(r => r.fecha))).sort((a, b) => (a < b ? 1 : -1));
    return fechas[1] || null;
};
