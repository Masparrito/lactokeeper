// /workspaces/lactokeeper/src/utils/pdfExporter.ts

import jsPDF from 'jspdf';
import autoTable, { HAlignType, VAlignType, FontStyle } from 'jspdf-autotable';
import { 
  AnnualEvolutionStep, 
  SemestralEvolutionStep 
} from '../hooks/useHerdEvolution'; // Ajusta esta ruta si es necesario
import { 
  HerdEfficiencyKpis, 
  HerdDynamicsKpis 
} from '../hooks/useReportAnalytics'; // Ajusta esta ruta si es necesario
import { formatNumber, formatCurrency } from './formatters'; // Importa los formatters

// --- Función de ayuda para formatear números ---
// (sin cambios)

// --- Función de ayuda para crear tablas de KPIs ---
const createKpiTable = (doc: jsPDF, title: string, kpis: [string, string][], startY: number): number => {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold' as FontStyle);
  doc.text(title, 14, startY);
  
  autoTable(doc, {
    startY: startY + 6,
    head: [['Indicador (KPI)', 'Valor (Real)']],
    body: kpis,
    theme: 'striped',
    headStyles: { fillColor: [41, 128, 185] }, // Azul
    styles: { fontSize: 10 },
  });
  
  // Devuelve la posición Y final de la tabla
  return (doc as any).lastAutoTable.finalY + 10;
};

// --- Función principal de Exportación ---
export const exportDetailedReport = (
  annualData: AnnualEvolutionStep[],
  semestralData: SemestralEvolutionStep[], // <-- CORREGIDO: Ahora se usa
  herdDynamics: HerdDynamicsKpis | null,
  herdEfficiency: HerdEfficiencyKpis | null
) => {
  if (!herdDynamics || !herdEfficiency) {
    alert("No hay datos de analítica para exportar.");
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait', // Página 1 en vertical
    unit: 'mm',
    format: 'a4',
  });

  // ---------------------------------------------------------------------------
  // --- PÁGINA 1: KPIs de Dinámica y Eficiencia ---
  // (sin cambios)
  // ---------------------------------------------------------------------------
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold' as FontStyle);
  doc.text('Reporte Detallado de Simulación', 105, 20, { align: 'center' });
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal' as FontStyle);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 105, 26, { align: 'center' });

  // --- Tabla de KPIs de Dinámica (3.3) ---
  const dynamicsKpis: [string, string][] = [
    ['Tasa Natalidad (Anual.)', `${formatNumber(herdDynamics.tasaNatalidadReal, 1)} %`],
    ['Tasa Prolificidad', `${formatNumber(herdDynamics.tasaProlificidadReal, 1)} %`],
    ['Tasa Reemplazo (Anual.)', `${formatNumber(herdDynamics.tasaReemplazoReal, 1)} %`],
    ['Tasa Descarte (Anual.)', `${formatNumber(herdDynamics.tasaDescarteReal, 1)} %`],
    ['% Mort. Crías (0-3m)', `${formatNumber(herdDynamics.mortalidadCriasReal, 1)} %`],
    ['% Mort. Levante (Anual.)', `${formatNumber(herdDynamics.mortalidadLevanteReal, 1)} %`],
    ['% Mort. Cabras (Anual.)', `${formatNumber(herdDynamics.mortalidadCabrasReal, 1)} %`],
    ['% Elim. Crías M (0-3m)', `${formatNumber(herdDynamics.tasaEliminacionCriasMReal, 1)} %`],
  ];
  let currentY = createKpiTable(doc, '📊 KPIs de Dinámica del Rebaño', dynamicsKpis, 40);

  // --- Tabla de KPIs de Eficiencia (3.2.3) ---
  const efficiencyKpis: [string, string][] = [
    ['Total Litros (Horizonte)', `${formatNumber(herdEfficiency.totalLitrosHorizonte)} L`],
    ['Litros / Vientre / Año', `${formatNumber(herdEfficiency.litrosPorVientrePorAnio)} L/Vientre`],
    ['Total Días-Lactancia', `${formatNumber(herdEfficiency.totalDiasLactancia)} Días`],
    ['Litros / Día-Lactancia', `${formatNumber(herdEfficiency.litrosPorDiaLactancia, 2)} L/Día`],
  ];
  createKpiTable(doc, '📈 KPIs de Eficiencia Lechera', efficiencyKpis, currentY);


  // ---------------------------------------------------------------------------
  // --- PÁGINA 2: Tabla Detallada (3.1) ---
  // ---------------------------------------------------------------------------
  doc.addPage('a4', 'landscape'); // Horizontal para la tabla ancha
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold' as FontStyle);
  doc.text('📋 Tabla Detallada de Flujos y Stock', 14, 20);

  // --- Definir Encabezados de la Tabla (CORREGIDO CON TIPOS) ---
  const tableHead: any = [ 
    // Fila 1 (Grupos)
    [
      { content: 'Periodo', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
      { content: 'Población', colSpan: 3, styles: { halign: 'center' } },
      { content: 'Producción', colSpan: 3, styles: { halign: 'center' } },
      { content: 'Flujos: Entradas', colSpan: 3, styles: { halign: 'center' } },
      { content: 'Flujos: Salidas (Muertes)', colSpan: 4, styles: { halign: 'center' } },
      { content: 'Flujos: Salidas (Ventas)', colSpan: 2, styles: { halign: 'center' } },
      { content: 'Flujos: Internos (Promociones H)', colSpan: 4, styles: { halign: 'center' } },
      { content: 'Desglose Stock Final', colSpan: 7, styles: { halign: 'center' } },
    ],
    // Fila 2 (Columnas)
    [
      'Inicio', 'Final', 'Cambio', // Población
      'Litros', 'Prom. Hembras', 'Ingresos Leche', // Producción
      'Nacim. H', 'Nacim. M', 'Compras', // Entradas
      'Muertes C.H', 'Muertes C.M', 'Muertes Lev.', 'Muertes Adu.', // Muertes
      'Ventas C.M', 'Ventas Desc.', // Ventas
      'C→LT', 'LT→LM', 'LM→LTD', 'LTD→C', // Promociones
      'Fin C.H', 'Fin C.M', 'Fin LT', 'Fin LM', 'Fin LTD', 'Fin Cabras', 'Fin Padres', // Desglose
    ]
  ];

  // --- Definir Cuerpo de la Tabla (CORREGIDO CON TIPOS y USO DE SEMESTRALDATA) ---
  const tableBody: any[] = []; 
  for (const year of annualData) {
    const muertesLevanteA = year.muertesLevanteTemprano + year.muertesLevanteMedio + year.muertesLevanteTardio;
    const muertesAdultasA = year.muertesCabras + year.muertesPadres;
    // Fila Anual
    tableBody.push([
      { content: year.periodLabel, styles: { fontStyle: 'bold', fillColor: '#f0f0f0', textColor: '#000' } },
      formatNumber(year.startTotal), formatNumber(year.endTotal), formatNumber(year.netChange),
      formatNumber(year.litrosLeche, 0), formatNumber(year.kpiProductivasCount, 0), formatCurrency(year.ingresosTotales, '$', 0),
      formatNumber(year.nacimientosH), formatNumber(year.nacimientosM), formatNumber(year.comprasVientres),
      formatNumber(year.muertesCriaH), formatNumber(year.muertesCriaM), formatNumber(muertesLevanteA), formatNumber(muertesAdultasA),
      formatNumber(year.ventasCabritos), formatNumber(year.ventasDescartes),
      formatNumber(year.promocionCriaH), formatNumber(year.promocionLevanteTemprano), formatNumber(year.promocionLevanteMedio), formatNumber(year.promocionLevanteTardio),
      formatNumber(year.endCriaH), formatNumber(year.endCriaM), formatNumber(year.endLevanteTemprano), formatNumber(year.endLevanteMedio), formatNumber(year.endLevanteTardio), formatNumber(year.endCabras), formatNumber(year.endPadres),
    ]);
    
    // --- CORRECCIÓN TS6133 ---
    // Filas Semestrales (Ahora se añaden al PDF)
    const relatedSemestres = semestralData.filter(s => s.year === year.year);
    for (const semestre of relatedSemestres) {
      const muertesLevanteS = semestre.muertesLevanteTemprano + semestre.muertesLevanteMedio + semestre.muertesLevanteTardio;
      const muertesAdultasS = semestre.muertesCabras + semestre.muertesPadres;
      tableBody.push([
        { content: `  ${semestre.periodLabel}`, styles: { fontStyle: 'normal' } },
        formatNumber(semestre.startTotal), formatNumber(semestre.endTotal), formatNumber(semestre.netChange),
        formatNumber(semestre.litrosLeche, 0), formatNumber(semestre.kpiProductivasCount, 0), formatCurrency(semestre.ingresosTotales, '$', 0),
        formatNumber(semestre.nacimientosH), formatNumber(semestre.nacimientosM), formatNumber(semestre.comprasVientres),
        formatNumber(semestre.muertesCriaH), formatNumber(semestre.muertesCriaM), formatNumber(muertesLevanteS), formatNumber(muertesAdultasS),
        formatNumber(semestre.ventasCabritos), formatNumber(semestre.ventasDescartes),
        formatNumber(semestre.promocionCriaH), formatNumber(semestre.promocionLevanteTemprano), formatNumber(semestre.promocionLevanteMedio), formatNumber(semestre.promocionLevanteTardio),
        formatNumber(semestre.endCriaH), formatNumber(semestre.endCriaM), formatNumber(semestre.endLevanteTemprano), formatNumber(semestre.endLevanteMedio), formatNumber(semestre.endLevanteTardio), formatNumber(semestre.endCabras), formatNumber(semestre.endPadres),
      ]);
    }
    // --- FIN CORRECCIÓN ---
  }

  // --- Generar la Tabla Detallada (CORREGIDO CON TIPOS) ---
  autoTable(doc, {
    startY: 30,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { 
      fillColor: [44, 62, 80], // Gris oscuro
      textColor: [255, 255, 255], 
      fontSize: 8,
      halign: 'center' as HAlignType,
      valign: 'middle' as VAlignType,
    },
    styles: {
      fontSize: 8,
      cellPadding: 1,
      overflow: 'linebreak',
      halign: 'right' as HAlignType,
    },
    columnStyles: {
      0: { halign: 'left' as HAlignType, minCellWidth: 25 }, // Corregido: minCellWidth
    },
    didDrawPage: (data) => {
      // Pie de página
      doc.setFontSize(10);
      doc.text(`Página ${data.pageNumber}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
    }
  });

  // --- Guardar el PDF ---
  doc.save(`Reporte_Simulacion_GanaderoOS_${new Date().toISOString().split('T')[0]}.pdf`);
};