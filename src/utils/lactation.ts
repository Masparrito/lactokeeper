// src/utils/lactation.ts
// Detección de "lactancias abiertas sin secar": un parto cuya lactancia quedó
// 'activa' PERO existe un parto POSTERIOR del mismo animal. Es la anomalía que
// ocurre cuando se carga un parto nuevo sin haber declarado seca la lactancia
// anterior. Lógica pura (sin acceso a la base de datos), reutilizable en el
// perfil de lactancia, los indicadores del animal y las alertas.

import type { Parturition } from '../db/local';

const ms = (d: string) => new Date(d + 'T00:00:00').getTime();

/** ¿Este parto es una lactancia 'activa' que quedó atrás de un parto más nuevo? */
export function isStaleOpenLactation(parturition: Parturition, sameGoatParturitions: Parturition[]): boolean {
    if (parturition.status !== 'activa') return false;
    const t = ms(parturition.parturitionDate);
    return sameGoatParturitions.some(p =>
        p.id !== parturition.id &&
        p.goatId === parturition.goatId &&
        ms(p.parturitionDate) > t
    );
}

/** Partos con lactancia abierta sin secar para un animal (más antiguos primero). */
export function getStaleOpenLactations(goatId: string, parturitions: Parturition[]): Parturition[] {
    const forGoat = parturitions.filter(p => p.goatId === goatId);
    return forGoat
        .filter(p => isStaleOpenLactation(p, forGoat))
        .sort((a, b) => ms(a.parturitionDate) - ms(b.parturitionDate));
}

/** ¿El animal tiene al menos una lactancia abierta sin secar? */
export function hasStaleOpenLactation(goatId: string, parturitions: Parturition[]): boolean {
    const forGoat = parturitions.filter(p => p.goatId === goatId);
    return forGoat.some(p => isStaleOpenLactation(p, forGoat));
}

/** Fecha del siguiente parto del mismo animal tras uno dado (o null si no hay). */
export function nextParturitionDate(parturition: Parturition, parturitions: Parturition[]): string | null {
    const t = ms(parturition.parturitionDate);
    const later = parturitions
        .filter(p => p.goatId === parturition.goatId && ms(p.parturitionDate) > t)
        .sort((a, b) => ms(a.parturitionDate) - ms(b.parturitionDate));
    return later[0]?.parturitionDate ?? null;
}
