// src/utils/famachaPdf.ts
// Exporta a PDF (offline) el último Famacha con comparativa respecto a la
// revisión anterior de cada animal. Pensado para verse fácil en el celular.
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FamachaRev, FamachaScore } from '../db/local';
import {
    ultimaJornada, jornadaAnterior, revisionAnterior, famachaPeso,
    interpretarIndice, tendenciaFamacha,
} from './famachaLogic';

const fmt = (f: string) => {
    try { return new Date(f + 'T00:00:00Z').toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }); }
    catch { return f; }
};

const tendSymbol = (t: ReturnType<typeof tendenciaFamacha>): string =>
    t === 'mejoro' ? 'Mejoro' : t === 'empeoro' ? 'Empeoro' : t === 'igual' ? 'Igual' : '-';

// Índice de un conjunto de revisiones (una jornada).
const indiceDeRevs = (revs: FamachaRev[]): number | null => {
    if (!revs.length) return null;
    const puntaje = revs.reduce((s, r) => s + famachaPeso(r.score), 0);
    return puntaje / revs.length;
};

const SCORE_FILL: Record<FamachaScore, [number, number, number]> = {
    1: [16, 122, 87], 2: [22, 130, 62], 3: [202, 138, 4], 4: [194, 90, 12], 5: [185, 28, 28],
};

export function exportFamachaPDF(famachaRevs: FamachaRev[]): boolean {
    const fechaUlt = ultimaJornada(famachaRevs);
    if (!fechaUlt) return false;

    const revsUlt = famachaRevs.filter(r => r.fecha === fechaUlt).sort((a, b) => b.score - a.score || a.arete.localeCompare(b.arete, undefined, { numeric: true }));
    const fechaPrev = jornadaAnterior(famachaRevs);
    const revsPrev = fechaPrev ? famachaRevs.filter(r => r.fecha === fechaPrev) : [];

    const indiceUlt = indiceDeRevs(revsUlt);
    const indicePrev = indiceDeRevs(revsPrev);
    const interp = interpretarIndice(indiceUlt);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const M = 14;

    // Encabezado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor('#e11d48');
    doc.text('Famacha — Último control', M, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor('#374151');
    doc.text(`Jornada: ${fmt(fechaUlt)}   ·   Animales revisados: ${revsUlt.length}`, M, 25);
    const dosificados = revsUlt.filter(r => r.dosis).length;
    doc.text(`Desparasitados en esta jornada: ${dosificados}`, M, 30);

    // Índice + comparativa
    let cmp = '';
    if (indiceUlt !== null && indicePrev !== null) {
        const delta = indiceUlt - indicePrev;
        const dir = delta < -0.001 ? 'mejoro' : delta > 0.001 ? 'empeoro' : 'igual';
        cmp = `   (jornada anterior ${fmt(fechaPrev!)}: ${indicePrev.toFixed(2)} — ${dir === 'mejoro' ? 'mejoro' : dir === 'empeoro' ? 'empeoro' : 'igual'} ${delta === 0 ? '' : Math.abs(delta).toFixed(2)})`;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(interp.color);
    doc.text(`Índice del rebaño: ${indiceUlt === null ? '—' : indiceUlt.toFixed(2)}  ·  ${interp.estado}`, M, 38);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#6b7280');
    if (cmp) doc.text(cmp.trim(), M, 43);

    // Tabla por animal con comparativa
    const body = revsUlt.map(r => {
        const prev = revisionAnterior(famachaRevs, r.animalId, r.fecha);
        const tend = tendenciaFamacha(famachaRevs, r.animalId, r.fecha, r.score);
        return [
            r.arete,
            String(r.score),
            prev ? String(prev.score) : '-',
            tendSymbol(tend),
            r.dosis ? (r.producto ? `Si: ${r.producto}` : 'Si') : 'No',
        ];
    });

    autoTable(doc, {
        startY: 48,
        head: [['Arete', 'Famacha', 'Anterior', 'Tendencia', 'Desparasitante']],
        body,
        margin: { left: M, right: M },
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'center' },
            2: { halign: 'center', textColor: '#6b7280' },
            3: { halign: 'center' },
        },
        didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
                const score = Number(data.cell.raw) as FamachaScore;
                if (SCORE_FILL[score]) {
                    data.cell.styles.fillColor = SCORE_FILL[score];
                    data.cell.styles.textColor = 255;
                    data.cell.styles.fontStyle = 'bold';
                }
            }
            if (data.section === 'body' && data.column.index === 3) {
                const v = String(data.cell.raw);
                if (v === 'Mejoro') data.cell.styles.textColor = '#059669';
                else if (v === 'Empeoro') data.cell.styles.textColor = '#dc2626';
                else if (v === 'Igual') data.cell.styles.textColor = '#d97706';
            }
        },
    });

    doc.setFontSize(8);
    doc.setTextColor('#9ca3af');
    doc.text('GanaderoOS · Famacha 1=sano … 5=anémico grave. Tendencia vs. revisión anterior del animal.', M, doc.internal.pageSize.getHeight() - 8);

    doc.save(`famacha_${fechaUlt}.pdf`);
    return true;
}
