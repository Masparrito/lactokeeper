// src/utils/famachaPdf.ts
// PDF (offline) de EVOLUCIÓN Famacha: matriz animal × últimas 5 jornadas.
// Cada columna es una fecha; cada celda muestra el Famacha (chip de color), la
// flecha de tendencia (verde sube / roja baja / ámbar igual) y una jeringa si en
// esa revisión se desparasitó. Igual que en la app.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FamachaRev, FamachaScore } from '../db/local';
import { famachaPeso, interpretarIndice, tendenciaFamacha, Tendencia } from './famachaLogic';

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

const N_JORNADAS = 5;

// --- Dibujo vectorial de la flecha de tendencia (mm) ---
const drawArrow = (doc: jsPDF, cx: number, cy: number, tend: Tendencia) => {
    if (!tend) return;
    const col: [number, number, number] = tend === 'mejoro' ? [5, 150, 105] : tend === 'empeoro' ? [220, 38, 38] : [217, 119, 6];
    doc.setDrawColor(col[0], col[1], col[2]);
    doc.setLineWidth(0.5);
    const h = 1.7;
    if (tend === 'igual') {
        doc.line(cx - h, cy, cx + h, cy);
        doc.line(cx + h, cy, cx + h - 0.9, cy - 0.9);
        doc.line(cx + h, cy, cx + h - 0.9, cy + 0.9);
    } else {
        const up = tend === 'mejoro';
        const yTip = up ? cy - h : cy + h;
        const yTail = up ? cy + h : cy - h;
        doc.line(cx, yTail, cx, yTip);
        const dy = up ? 0.9 : -0.9;
        doc.line(cx, yTip, cx - 0.9, yTip + dy);
        doc.line(cx, yTip, cx + 0.9, yTip + dy);
    }
};

// --- Dibujo vectorial de una jeringa (mm), naranja ---
const drawSyringe = (doc: jsPDF, x: number, cy: number) => {
    doc.setDrawColor(234, 88, 12);
    doc.setFillColor(234, 88, 12);
    doc.setLineWidth(0.4);
    doc.roundedRect(x, cy - 1.1, 3.6, 2.2, 0.4, 0.4, 'S'); // cilindro
    doc.line(x - 1.4, cy, x, cy);          // émbolo
    doc.line(x + 3.6, cy, x + 5.4, cy);    // aguja
    doc.line(x + 1.2, cy - 1.1, x + 1.2, cy + 1.1); // graduación
    doc.line(x + 2.4, cy - 1.1, x + 2.4, cy + 1.1);
};

export function exportFamachaPDF(famachaRevs: FamachaRev[]): boolean {
    if (!famachaRevs.length) return false;

    const fechas = Array.from(new Set(famachaRevs.map(r => r.fecha))).sort((a, b) => (a < b ? -1 : 1));
    const cols = fechas.slice(-N_JORNADAS);
    if (cols.length === 0) return false;
    const fechaUlt = cols[cols.length - 1];
    const fechaPrev = cols.length > 1 ? cols[cols.length - 2] : null;

    const revsUlt = famachaRevs.filter(r => r.fecha === fechaUlt);
    const indiceUlt = indiceDeRevs(revsUlt);
    const indicePrev = fechaPrev ? indiceDeRevs(famachaRevs.filter(r => r.fecha === fechaPrev)) : null;
    const interp = interpretarIndice(indiceUlt);

    const byKey = new Map<string, FamachaRev>();
    const areteByAnimal = new Map<string, string>();
    for (const r of famachaRevs) {
        byKey.set(`${r.animalId}|${r.fecha}`, r);
        areteByAnimal.set(r.animalId, r.arete);
    }

    const animalIds = Array.from(new Set(famachaRevs.filter(r => cols.includes(r.fecha)).map(r => r.animalId)));
    animalIds.sort((a, b) => {
        const sa = byKey.get(`${a}|${fechaUlt}`)?.score ?? -1;
        const sb = byKey.get(`${b}|${fechaUlt}`)?.score ?? -1;
        if (sb !== sa) return sb - sa;
        return (areteByAnimal.get(a) || '').localeCompare(areteByAnimal.get(b) || '', undefined, { numeric: true });
    });

    // Matrices para dibujar celdas.
    const scoreMatrix: (FamachaScore | null)[][] = [];
    const doseMatrix: boolean[][] = [];
    const trendMatrix: Tendencia[][] = [];
    const body = animalIds.map(id => {
        const sRow: (FamachaScore | null)[] = [];
        const dRow: boolean[] = [];
        const tRow: Tendencia[] = [];
        cols.forEach(f => {
            const rev = byKey.get(`${id}|${f}`);
            sRow.push(rev ? rev.score : null);
            dRow.push(!!rev?.dosis);
            tRow.push(rev ? tendenciaFamacha(famachaRevs, id, f, rev.score) : null);
        });
        scoreMatrix.push(sRow);
        doseMatrix.push(dRow);
        trendMatrix.push(tRow);
        return [areteByAnimal.get(id) || id, '', '', '', ''].slice(0, cols.length + 1);
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
        styles: { fontSize: 9, cellPadding: 2, halign: 'center', minCellHeight: 9 },
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        columnStyles: {
            0: { fontStyle: 'bold', halign: 'left' },
            1: { minCellWidth: 26 }, 2: { minCellWidth: 26 }, 3: { minCellWidth: 26 }, 4: { minCellWidth: 26 }, 5: { minCellWidth: 26 },
        },
        didDrawCell: (data) => {
            if (data.section !== 'body' || data.column.index < 1) return;
            const rowI = data.row.index, colI = data.column.index - 1;
            const score = scoreMatrix[rowI]?.[colI];
            const { x, y, height } = data.cell;
            const cy = y + height / 2;
            if (!score) {
                doc.setTextColor('#9ca3af'); doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                doc.text('·', x + 6, cy + 1);
                return;
            }
            // Chip de score (color) con número blanco.
            const [r, g, b] = SCORE_FILL[score];
            const sq = 6, sx = x + 2, sy = cy - sq / 2;
            doc.setFillColor(r, g, b);
            doc.roundedRect(sx, sy, sq, sq, 1.2, 1.2, 'F');
            doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
            doc.text(String(score), sx + sq / 2, cy + 1.4, { align: 'center' });
            // Flecha de tendencia.
            drawArrow(doc, sx + sq + 3, cy, trendMatrix[rowI]?.[colI] ?? null);
            // Jeringa si se desparasitó.
            if (doseMatrix[rowI]?.[colI]) drawSyringe(doc, sx + sq + 7, cy);
        },
    });

    const endY = (doc as any).lastAutoTable?.finalY || 38;
    doc.setFontSize(8);
    doc.setTextColor('#6b7280');
    doc.text('Famacha 1=sano … 5=anémico grave. Flecha: verde=mejoró, roja=empeoró, ámbar=igual (vs. revisión anterior). Jeringa = se desparasitó.', M, Math.min(endY + 6, doc.internal.pageSize.getHeight() - 8));

    doc.save(`famacha_evolucion_${fechaUlt}.pdf`);
    return true;
}
