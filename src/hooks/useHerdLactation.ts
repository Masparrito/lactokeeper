// src/hooks/useHerdLactation.ts
// Curva de lactancia del rebaño (modelo de Wood) + KPIs, sensible a la
// configuración de la finca (días de lactancia objetivo). Extraído del
// dashboard para poder reutilizarlo en las exportaciones (PDF/HTML/CSV).

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { calculateDEL } from '../utils/calculations';
import { Weighing } from '../db/local';

// --- Modelo de lactancia de Wood: y = a · t^b · e^(−c·t) ---
// Se ajusta por mínimos cuadrados linealizando ln(y) = ln(a) + b·ln(t) − c·t.
export interface WoodParams { a: number; b: number; c: number; }

function solve3(A: number[][], b: number[]): number[] | null {
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < 3; col++) {
        let piv = col;
        for (let r = col + 1; r < 3; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
        if (Math.abs(M[piv][col]) < 1e-12) return null;
        [M[col], M[piv]] = [M[piv], M[col]];
        for (let r = 0; r < 3; r++) {
            if (r === col) continue;
            const f = M[r][col] / M[col][col];
            for (let k = col; k < 4; k++) M[r][k] -= f * M[col][k];
        }
    }
    return [M[0][3] / M[0][0], M[1][3] / M[1][1], M[2][3] / M[2][2]];
}

export function fitWoodParams(points: { t: number; y: number }[]): WoodParams | null {
    const pts = points.filter(p => p.t >= 1 && p.y > 0 && isFinite(p.t) && isFinite(p.y));
    if (pts.length < 12) return null;
    const S = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const rhs = [0, 0, 0];
    for (const { t, y } of pts) {
        const x = [1, Math.log(t), t];
        const ly = Math.log(y);
        for (let i = 0; i < 3; i++) { rhs[i] += x[i] * ly; for (let j = 0; j < 3; j++) S[i][j] += x[i] * x[j]; }
    }
    const beta = solve3(S, rhs);
    if (!beta) return null;
    const a = Math.exp(beta[0]); const b = beta[1]; const c = -beta[2];
    if (!(a > 0) || !(b > 0) || !(c > 0)) return null; // sin pico => modelo no útil
    return { a, b, c };
}

export const evalWood = (p: WoodParams, t: number) => p.a * Math.pow(t, p.b) * Math.exp(-p.c * t);

function percentile(sorted: number[], q: number): number {
    if (!sorted.length) return 0;
    const idx = (sorted.length - 1) * q;
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export type LactationPeriod = '1m' | '3m' | '6m' | '12m' | 'all';

export interface HerdLactationPoint {
    del: number;
    mean: number | null;
    p25: number | null;
    p75: number | null;
    band: number | null;
    wood: number | null;
    n: number;
}

export interface HerdLactationKpis {
    peakDay: number;
    peakYield: number;
    persistence: number;
    projTotal: number;
}

export interface HerdLactationResult {
    chart: HerdLactationPoint[];
    kpis: HerdLactationKpis | null;
    woodParams: WoodParams | null;
    sampleSize: { weighings: number; animals: number };
    targetDays: number;
    displayMax: number;
    period: LactationPeriod;
}

const PERIOD_DAYS: Record<LactationPeriod, number | null> = {
    '1m': 30, '3m': 90, '6m': 182, '12m': 365, 'all': null,
};
const BIN = 10;

/**
 * Ajusta la curva de lactancia del rebaño para el período indicado.
 * `targetDays` (días de lactancia objetivo) proviene de la configuración de la
 * finca y controla la proyección total y el alcance del eje X.
 */
export function useHerdLactation(period: LactationPeriod): HerdLactationResult {
    const { animals, weighings, parturitions, appConfig, isLoading } = useData();
    const targetDays = Math.max(60, Math.round(appConfig?.diasLactanciaObjetivo ?? 305));

    return useMemo(() => {
        const empty: HerdLactationResult = {
            chart: [], kpis: null, woodParams: null,
            sampleSize: { weighings: 0, animals: 0 },
            targetDays, displayMax: Math.max(120, targetDays), period,
        };
        if (isLoading || !weighings.length || !animals.length) return empty;

        // Ventana de pesajes hacia atrás desde hoy.
        const days = PERIOD_DAYS[period];
        const cutoffMs = days ? Date.now() - days * 86400000 : null;
        const weighingsForChart = cutoffMs
            ? weighings.filter((w: Weighing) => new Date(w.date + 'T00:00:00').getTime() >= cutoffMs)
            : weighings;

        // Puntos (DEL, kg) para ajustar la curva de lactancia del rebaño.
        const delPoints: { t: number; y: number }[] = [];
        const curveAnimals = new Set<string>();
        weighingsForChart.forEach(w => {
            const parturitionForWeighing = parturitions
                .filter(p => p.goatId === w.goatId && new Date(w.date) >= new Date(p.parturitionDate))
                .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
            if (!parturitionForWeighing) return;
            const del = calculateDEL(parturitionForWeighing.parturitionDate, w.date);
            if (del >= 1 && w.kg > 0) { delPoints.push({ t: del, y: w.kg }); curveAnimals.add(w.goatId); }
        });
        const sampleSize = { weighings: delPoints.length, animals: curveAnimals.size };

        const woodParams = fitWoodParams(delPoints);
        const observedMax = delPoints.reduce((m, p) => Math.max(m, p.t), 0);
        // El eje llega al menos hasta la meta de lactancia (para ver la curva
        // completa y la línea de meta) y hasta el dato observado.
        const displayMax = Math.min(500, Math.max(120, observedMax, targetDays + 15));

        const chart: HerdLactationPoint[] = [];
        for (let start = 0; start < displayMax; start += BIN) {
            const center = start + BIN / 2;
            const ys = delPoints.filter(p => p.t >= start && p.t < start + BIN).map(p => p.y).sort((a, b) => a - b);
            const p25 = ys.length ? percentile(ys, 0.25) : null;
            const p75 = ys.length ? percentile(ys, 0.75) : null;
            chart.push({
                del: center,
                mean: ys.length ? +(ys.reduce((s, v) => s + v, 0) / ys.length).toFixed(2) : null,
                p25: p25 !== null ? +p25.toFixed(2) : null,
                p75: p75 !== null ? +p75.toFixed(2) : null,
                band: (p25 !== null && p75 !== null) ? +(p75 - p25).toFixed(2) : null,
                wood: woodParams ? +evalWood(woodParams, center).toFixed(2) : null,
                n: ys.length,
            });
        }

        let kpis: HerdLactationKpis | null = null;
        if (woodParams) {
            const peakDay = woodParams.b / woodParams.c;
            const peakYield = evalWood(woodParams, peakDay);
            let proj = 0;
            for (let t = 1; t <= targetDays; t++) proj += evalWood(woodParams, t);
            const post = evalWood(woodParams, peakDay + 100);
            if (peakDay > 0 && peakDay < 400 && peakYield > 0 && isFinite(proj)) {
                kpis = {
                    peakDay: Math.round(peakDay),
                    peakYield: +peakYield.toFixed(2),
                    persistence: Math.round((post / peakYield) * 100),
                    projTotal: Math.round(proj),
                };
            }
        }

        return { chart, kpis, woodParams, sampleSize, targetDays, displayMax, period };
    }, [animals, weighings, parturitions, isLoading, period, targetDays]);
}
