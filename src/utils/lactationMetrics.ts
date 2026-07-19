// src/utils/lactationMetrics.ts
// Motor ÚNICO de métricas de lactancia/producción. Función pura (sin React):
// alimenta la página Historial, los KPIs, el listado y (más adelante) los
// exportadores PDF/HTML/Excel. No duplicar esta lógica en otros archivos.

import { Animal, Parturition, Weighing, Event as AppEvent } from '../db/local';
import { AppConfig, DEFAULT_CONFIG } from '../types/config';
import { calculateDEL } from './calculations';

export interface LactationRecord {
    lactationNumber: number;          // 1, 2, 3...
    parturitionDate: string;
    status: Parturition['status'];
    weighingsCount: number;
    curve: { del: number; kg: number }[];
    weighings: { date: string; kg: number; del: number }[]; // pesajes con fecha (solo lectura)
    averageKg: number;                // promedio de los pesajes
    peakKg: number;
    peakDel: number;
    durationDays: number;             // días en lactancia (DEL)
    totalProduction: number;          // kg acumulados (área bajo la curva, trapecios)
    standardizedProduction: number;   // estandarizada a los días objetivo (estilo ADGA)
    dryDays: number | null;           // días secos ANTES de esta lactancia (secado previo -> este parto)
}

export interface AnimalLactationSummary {
    animalId: string;
    name?: string;
    isReference: boolean;
    isActive: boolean;
    lactations: LactationRecord[];
    numLactations: number;
    parity: 'Primípara' | 'Multípara' | '—';
    bestStandardized: number;         // mejor lactancia estandarizada
    avgStandardized: number;
    avgDuration: number;              // media de días en lactancia
    avgDryDays: number | null;        // media de días secos
    avgOpenDays: number | null;       // media de días abiertos (Vacía -> Preñada)
    totalMilkAllTime: number;         // suma de producción de todas sus lactancias
    lastParturitionDate: string | null;
}

const daysBetween = (a: string, b: string) =>
    Math.round((new Date(b + 'T00:00:00Z').getTime() - new Date(a + 'T00:00:00Z').getTime()) / 86400000);

// Área bajo la curva de lactancia (kg acumulados) por el método de trapecios,
// hasta `capDel` días. Es el equivalente práctico al Método de Intervalos de
// Prueba (TIM): integra los pesajes a lo largo de los días en leche.
function cumulativeProduction(curve: { del: number; kg: number }[], capDel: number): number {
    const pts = curve.filter(p => p.del <= capDel).sort((a, b) => a.del - b.del);
    if (pts.length === 0) return 0;
    let total = pts[0].kg * pts[0].del; // del parto (día 0) al primer pesaje
    for (let i = 1; i < pts.length; i++) {
        total += ((pts[i].kg + pts[i - 1].kg) / 2) * (pts[i].del - pts[i - 1].del);
    }
    // Estandarización: si la lactancia se proyecta más allá del último pesaje
    // (hasta capDel), se extiende plano con el último valor conocido.
    const last = pts[pts.length - 1];
    if (capDel > last.del) total += last.kg * (capDel - last.del);
    return total;
}

// Días abiertos = tiempo entre estar 'Vacía' y quedar 'Preñada'. Se deriva de
// los eventos 'Cambio de Estado' (que registran fecha + estado reproductivo).
function computeOpenDays(animalId: string, events: AppEvent[]): number | null {
    const evs = events
        .filter(e => e.animalId === animalId && e.type === 'Cambio de Estado' && typeof (e as any).details === 'string')
        .map(e => ({ date: e.date, det: (e as any).details as string }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const intervals: number[] = [];
    let openStart: string | null = null;
    for (const e of evs) {
        if (e.det.includes('Vacía')) openStart = e.date;
        else if (e.det.includes('Preñada') && openStart) {
            intervals.push(Math.max(0, daysBetween(openStart, e.date)));
            openStart = null;
        }
    }
    if (!intervals.length) return null;
    return intervals.reduce((a, b) => a + b, 0) / intervals.length;
}

export function computeAnimalLactations(
    animal: Animal,
    allParturitions: Parturition[],
    allWeighings: Weighing[],
    events: AppEvent[],
    config: AppConfig = DEFAULT_CONFIG
): AnimalLactationSummary {
    const standardDays = config.diasLactanciaObjetivo > 0 ? config.diasLactanciaObjetivo : 300;

    const parts = allParturitions
        .filter(p => p.goatId === animal.id)
        .sort((a, b) => new Date(a.parturitionDate).getTime() - new Date(b.parturitionDate).getTime());
    const weighings = allWeighings.filter(w => w.goatId === animal.id);

    const lactations: LactationRecord[] = parts.map((p, i) => {
        const start = new Date(p.parturitionDate);
        const end = i < parts.length - 1 ? new Date(parts[i + 1].parturitionDate) : new Date(9999, 11, 31);
        const cw = weighings.filter(w => {
            const d = new Date(w.date);
            return d >= start && d < end;
        });
        const wgs = cw
            .map(w => ({ date: w.date, kg: w.kg, del: calculateDEL(p.parturitionDate, w.date) }))
            .sort((a, b) => a.del - b.del);
        const curve = wgs.map(w => ({ del: w.del, kg: w.kg }));
        const avg = cw.length ? cw.reduce((s, w) => s + w.kg, 0) / cw.length : 0;
        const peak = curve.reduce((m, c) => (c.kg > m.kg ? c : m), { kg: 0, del: 0 });

        // Duración (días en lactancia): parto -> secado si existe; si no, parto ->
        // siguiente parto; si no, DEL del último pesaje.
        let duration = 0;
        if (p.dryingStartDate) duration = Math.max(0, daysBetween(p.parturitionDate, p.dryingStartDate));
        else if (i < parts.length - 1) duration = daysBetween(p.parturitionDate, parts[i + 1].parturitionDate);
        else duration = curve.length ? curve[curve.length - 1].del : 0;

        const cap = duration > 0 ? duration : (curve.length ? curve[curve.length - 1].del : 0);

        // Días secos antes de esta lactancia = secado del parto previo -> este parto.
        let dryDays: number | null = null;
        if (i > 0 && parts[i - 1].dryingStartDate) {
            dryDays = Math.max(0, daysBetween(parts[i - 1].dryingStartDate as string, p.parturitionDate));
        }

        return {
            lactationNumber: i + 1,
            parturitionDate: p.parturitionDate,
            status: p.status,
            weighingsCount: cw.length,
            curve,
            weighings: wgs,
            averageKg: avg,
            peakKg: peak.kg,
            peakDel: peak.del,
            durationDays: duration,
            totalProduction: cumulativeProduction(curve, cap),
            standardizedProduction: cumulativeProduction(curve, standardDays),
            dryDays,
        };
    });

    const productive = lactations.filter(l => l.weighingsCount > 0);
    const numLact = lactations.length;
    const parity: AnimalLactationSummary['parity'] =
        numLact === 0 ? '—' : numLact === 1 ? 'Primípara' : 'Multípara';
    const stds = productive.map(l => l.standardizedProduction);
    const dryVals = lactations.map(l => l.dryDays).filter((d): d is number => d != null);
    const durVals = productive.map(l => l.durationDays).filter(d => d > 0);

    return {
        animalId: animal.id,
        name: animal.name,
        isReference: !!animal.isReference,
        isActive: animal.status === 'Activo' && !animal.isReference,
        lactations,
        numLactations: numLact,
        parity,
        bestStandardized: stds.length ? Math.max(...stds) : 0,
        avgStandardized: stds.length ? stds.reduce((a, b) => a + b, 0) / stds.length : 0,
        avgDuration: durVals.length ? durVals.reduce((a, b) => a + b, 0) / durVals.length : 0,
        avgDryDays: dryVals.length ? dryVals.reduce((a, b) => a + b, 0) / dryVals.length : null,
        avgOpenDays: computeOpenDays(animal.id, events),
        totalMilkAllTime: productive.reduce((s, l) => s + l.totalProduction, 0),
        lastParturitionDate: parts.length ? parts[parts.length - 1].parturitionDate : null,
    };
}
