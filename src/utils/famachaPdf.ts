// src/utils/famachaPdf.ts
// PDF (offline) de EVOLUCIÓN Famacha: matriz animal × últimas 5 jornadas.
// Cada columna es una fecha; cada celda el Famacha (coloreado) con una marca
// naranja si en esa revisión se desparasitó. Pensado para verse fácil.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FamachaRev, FamachaScore } from '../db/local';
import { famachaPeso, interpretarIndice } from './famachaLogic';

const fmtLong = (f: string) => {
    try { return new Date(f + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    catch { return f; }
};
const fmtCol = (f: string) => {
    try { return new Date(f + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit', year: '2-digit', timeZone: 'UTC' }); }
    catch { return f; }
};

const indiceDeRevs = (revs: FamachaRev[]): number | null =>
    revs.length ? revs.reduce((s, r) => s + famachaPeso(r.score), 0) / revs.length : null;

const SCORE_FILL: Record<FamachaScore, [number, number, number]> = {
    1: [16, 122, 87], 2: [22, 130, 62], 3: [202, 138, 4], 4: [194, 90, 12], 5: [185, 28, 28],
};

const N_JORNADAS = 5; // última + 4 atrás

export function exportFamachaPDF(famachaRevs: FamachaRev[]): boolean {
    if (!famachaRevs.length) return false;

    // Últimas N jornadas (fechas), en orden cronológico (antigua → reciente).
    const fechas = Array.from(new Set(famachaRevs.map(r => r.fecha))).sort((a, b) => (a < b ? -1 : 1));
    const cols = fechas.slice(-N_JORNADAS);
    if (cols.length === 0) return false;
    const fechaUlt = cols[cols.length - 1];
    const fechaPrev = cols.length > 1 ? cols[cols.length - 2] : null;

    // Índice de la última jornada y comparativa con la anterior.
    const revsUlt = famachaRevs.filter(r => r.fecha === fechaUlt);
    const indiceUlt = indiceDeRevs(revsUlt);
    const indicePrev = fechaPrev ? indiceDeRevs(famachaRevs.filter(r => r.fecha === fechaPrev)) : null;
    const interp = interpretarIndice(indiceUlt);

    // Índice rápido (animalId+fecha) -> rev, y aretes.
    const byKey = new Map<string, FamachaRev>();
    const areteByAnimal = new Map<string, string>();
    for (const r of famachaRevs) {
        byKey.set(`${r.animalId}|${r.fecha}`, r);
        areteByAnimal.set(r.animalId, r.arete);
    }

    // Animales que aparecen en alguna de las columnas mostradas.
    const animalIds = Array.from(new Set(famachaRevs.filter(r => cols.includes(r.fecha)).map(r => r.animalId)));

    // Ordenar por el score de la última jornada (más severo primero), luego arete.
    animalIds.sort((a, b) => {
        const sa = byKey.get(`${a}|${fechaUlt}`)?.score ?? -1;
        const sb = byKey.get(`${b}|${fechaUlt}`)?.score ?? -1;
        if (sb !== sa) return sb - sa;
        return (areteByAnimal.get(a) || '').localeCompare(areteByAnimal.get(b) || '', undefined, { numeric: true });
    });

    // Matrices de score y dosis para pintar/marcar celdas.
    const scoreMatrix: (FamachaScore | null)[][] = [];
    const doseMatrix: boolean[][] = [];
    const body = animalIds.map(id => {
        const scoreRow: (FamachaScore | null)[] = [];
        const doseRow: boolean[] = [];
        const cells = cols.map(f => {
            const rev = byKey.get(`${id}|${f}`);
            scoreRow.push(rev ? rev.score : null);
            doseRow.push(!!rev?.dosis);
            return rev ? String(rev.score) : '·';
        });
        scoreMatrix.push(scoreRow);
        doseMatrix.push(doseRow);
        return [areteByAnimal.get(id) || id, ...cells];
    });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const M = 14;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#e11d48');
    doc.text('Famacha — Evolución', M, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#374151');
    doc.text(`Últimas ${cols.length} jornada(s) · Última: ${fmtLong(fechaUlt)} (${revsUlt.length} revisados, ${revsUlt.filter(r => r.dosis).length} desparasitados)`, M, 25);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(interp.color);
    let idxLine = `Índice última jornada: ${indiceUlt === null ? '—' : indiceUlt.toFixed(2)} · ${interp.estado}`;
    if (indiceUlt !== null && indicePrev !== null) {
        const delta = indiceUlt - indicePrev;
        idxLine += `   (anterior ${indicePrev.toFixed(2)} · ${delta < -0.001 ? 'mejoró' : delta > 0.001 ? 'empeoró' : 'igual'})`;
    }
    doc.text(idxLine, M, 32);

    autoTable(doc, {
        startY: 38,
        head: [['Arete', ...cols.map(fmtCol)]],
        body,
        margin: { left: M, right: M },
        styles: { fontSize: 9, cellPadding: 2, halign: 'center' },
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        columnStyles: { 0: { fontStyle: 'bold', halign: 'left' } },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index >= 1) {
                const score = scoreMatrix[data.row.index]?.[data.column.index - 1];
                if (score && SCORE_FILL[score]) {
                    data.cell.styles.fillColor = SCORE_FILL[score];
                    data.cell.styles.textColor = 255;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        },
        didDrawCell: (data) => {
            // Marca naranja (triángulo esquina) = se desparasitó en esa revisión.
            if (data.section === 'body' && data.column.index >= 1) {
                const dosed = doseMatrix[data.row.index]?.[data.column.index - 1];
                if (dosed) {
                    const { x, y, width } = data.cell;
                    doc.setFillColor(234, 88, 12);
                    doc.triangle(x + width - 4.2, y + 0.6, x + width - 0.6, y + 0.6, x + width - 0.6, y + 4.2, 'F');
                }
            }
        },
    });

    const endY = (doc as any).lastAutoTable?.finalY || 38;
    doc.setFontSize(8);
    doc.setTextColor('#6b7280');
    doc.text('Famacha 1=sano … 5=anémico grave. Color = grado. ▲ naranja = se desparasitó. "·" = sin revisión esa fecha.', M, Math.min(endY + 6, doc.internal.pageSize.getHeight() - 8));

    doc.save(`famacha_evolucion_${fechaUlt}.pdf`);
    return true;
}
