// src/utils/reproduction.ts
// Lógica pura del ciclo reproductivo al DESVINCULAR una hembra de un lote de
// monta (temporada cerrada / retiro). No toca la base de datos: solo calcula el
// estado reproductivo correcto a partir de servicios y partos.

import type { Animal, ServiceRecord, Parturition } from '../db/local';

export interface ReleaseInput {
    animal: Animal;
    services: ServiceRecord[];      // servicios (servicio visto) de esta hembra
    parturitions: Parturition[];    // partos de esta hembra
    diasGestacion: number;          // umbral de "presunta preñez" (config, ~150)
    nowMs: number;
}

const toMs = (d: string) => new Date(d + (d.length <= 10 ? 'T00:00:00' : '')).getTime();

/**
 * Estado reproductivo correcto de una hembra que se desvincula de una monta:
 *  - Servicio visto, sin parto posterior y < diasGestacion  => 'Servida' (gestando).
 *    (Si ya estaba 'Preñada' confirmada, se conserva 'Preñada'.)
 *  - Ya parió tras el servicio, nunca se le vio servicio, o
 *    pasaron >= diasGestacion sin parto                      => 'Vacía' (libre).
 * Siempre devuelve `sireLotId: undefined` (deja de estar "en monta").
 */
export function computeReleasedReproState(input: ReleaseInput): Pick<Animal, 'sireLotId' | 'reproductiveStatus'> {
    const { animal, services, parturitions, diasGestacion, nowMs } = input;
    const last = [...services].sort((a, b) => toMs(b.serviceDate) - toMs(a.serviceDate))[0];
    const partoAfterService = !!last && parturitions.some(p => toMs(p.parturitionDate) >= toMs(last.serviceDate));
    const daysSince = last ? (nowMs - toMs(last.serviceDate)) / 86400000 : Infinity;
    const gestando = !!last && !partoAfterService && daysSince < diasGestacion;

    const reproductiveStatus: Animal['reproductiveStatus'] = gestando
        ? (animal.reproductiveStatus === 'Preñada' ? 'Preñada' : 'Servida')
        : 'Vacía';
    return { sireLotId: undefined, reproductiveStatus };
}

/**
 * ¿Una hembra 'Servida' (presunta preñada) YA VENCIÓ su ventana de gestación
 * sin haber parido? En ese caso debe volver a 'Vacía'.
 */
export function isPresumedPregnancyExpired(
    services: ServiceRecord[],
    parturitions: Parturition[],
    diasGestacion: number,
    nowMs: number,
): boolean {
    const last = [...services].sort((a, b) => toMs(b.serviceDate) - toMs(a.serviceDate))[0];
    if (!last) return false;
    const partoAfter = parturitions.some(p => toMs(p.parturitionDate) >= toMs(last.serviceDate));
    if (partoAfter) return false;
    return (nowMs - toMs(last.serviceDate)) / 86400000 >= diasGestacion;
}
