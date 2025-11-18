// src/utils/pdfExporter.ts (Actualizado)

import jsPDF from 'jspdf';
import autoTable, { HAlignType, VAlignType, FontStyle } from 'jspdf-autotable';
// --- (NUEVO) Importar html2canvas y Animal ---
import html2canvas from 'html2canvas';
import { Animal } from '../db/local';
// ---
import { 
  AnnualEvolutionStep, 
  SemestralEvolutionStep 
} from '../hooks/useHerdEvolution'; // Ajusta esta ruta
import { 
  HerdEfficiencyKpis, 
  HerdDynamicsKpis,
  YearlyMilkKpis // V8.0: Importar este tipo
} from '../hooks/useReportAnalytics'; // Ajusta esta ruta
import { formatNumber, formatCurrency } from './formatters';
import { formatAnimalDisplay } from './formatting'; // <-- Importar esto

// ---------------------------------------------------------------------------
// --- V8.0: FUNCIONES DE AYUDA DE DISEÑO ---
// ---------------------------------------------------------------------------

const PAGE_MARGIN = 14;
const A4_WIDTH = 210;
const A4_HEIGHT = 297;
const CONTENT_WIDTH = A4_WIDTH - (PAGE_MARGIN * 2);

// Estilos de Título
const HEADING_COLOR = '#3b82f6'; // 'text-blue-500'
const SECTION_COLOR = '#1f2937'; // 'bg-gray-800'
const TEXT_COLOR_LIGHT = '#f3f4f6'; // 'text-gray-100'
const TEXT_COLOR_DARK = '#374151'; // 'text-gray-700'

/**
 * Añade la cabecera principal y el título de la página
 */
const addHeaderAndTitle = (doc: jsPDF, title: string, pageNumber: number) => {
  // --- Cabecera Principal ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(HEADING_COLOR);
  doc.text('GanaderoOS - Reporte de Simulación', PAGE_MARGIN, 20);
  
  // --- Título de Página ---
  doc.setFontSize(16);
  doc.setTextColor(TEXT_COLOR_DARK);
  doc.text(title, PAGE_MARGIN, 30);
  
  // --- Línea divisoria ---
  doc.setDrawColor(HEADING_COLOR);
  doc.setLineWidth(0.5);
  doc.line(PAGE_MARGIN, 33, A4_WIDTH - PAGE_MARGIN, 33);
  
  // --- Pie de Página ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#9ca3af'); // 'text-gray-400'
  const pageStr = `Página ${pageNumber}`;
  doc.text(pageStr, A4_WIDTH - PAGE_MARGIN, A4_HEIGHT - 10, { align: 'right' });
  doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, PAGE_MARGIN, A4_HEIGHT - 10);
};

/**
 * Crea una tabla de KPIs simple
 */
const createKpiTable = (doc: jsPDF, title: string, kpis: [string, string][], startY: number): number => {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold' as FontStyle);
  doc.setTextColor(TEXT_COLOR_DARK);
  doc.text(title, PAGE_MARGIN, startY);
  
  autoTable(doc, {
    startY: startY + 6,
    head: [['Indicador (KPI)', 'Valor (Real)']],
    body: kpis,
    theme: 'grid', // 'striped' o 'grid'
    headStyles: { 
      fillColor: SECTION_COLOR,
      textColor: TEXT_COLOR_LIGHT,
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 10,
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: '#f9fafb' // 'bg-gray-50'
    }
  });
  
  return (doc as any).lastAutoTable.finalY + 12; // Espacio después de la tabla
};

/**
 * V8.0: Crea la tabla de KPIs de Linealidad (múltiples años)
 */
const createLinearityKpiTable = (doc: jsPDF, kpis: YearlyMilkKpis[], startY: number): number => {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold' as FontStyle);
  doc.setTextColor(TEXT_COLOR_DARK);
  doc.text('KPIs de Linealidad por Año', PAGE_MARGIN, startY);

  const tableHead = [['Año', 'CV (%)', 'Prom. Mensual (L)', 'Mes Pico (L)', 'Mes Valle (L)']];
  const tableBody = kpis.map(kpi => [
    kpi.year,
    formatNumber(kpi.cv, 1),
    formatNumber(kpi.avgMonthly, 0),
    `${formatNumber(kpi.peakMonthValue, 0)} (${kpi.peakMonthLabel})`,
    `${formatNumber(kpi.valleyMonthValue, 0)} (${kpi.valleyMonthLabel})`,
  ]);

  autoTable(doc, {
    startY: startY + 6,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { 
      fillColor: SECTION_COLOR,
      textColor: TEXT_COLOR_LIGHT,
      fontStyle: 'bold',
      halign: 'center'
    },
    styles: { 
      fontSize: 10,
      cellPadding: 2.5,
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: '#f9fafb'
    },
    columnStyles: {
      3: { halign: 'left' },
      4: { halign: 'left' }
    }
  });

  return (doc as any).lastAutoTable.finalY + 12;
};


// ---------------------------------------------------------------------------
// --- V8.0: FUNCIÓN PRINCIPAL (REESCRITA) ---
// ---------------------------------------------------------------------------
export const exportDetailedReport = (
  annualData: AnnualEvolutionStep[],
  semestralData: SemestralEvolutionStep[],
  herdDynamics: HerdDynamicsKpis, // Ya no es 'null' (check en modal)
  herdEfficiency: HerdEfficiencyKpis, // Ya no es 'null'
  milkLinearityKpis: YearlyMilkKpis[], // NUEVO
  chartImage: string // NUEVO: La imagen en base64
) => {
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  let currentPage = 1;

  // ---------------------------------------------------------------------------
  // --- PÁGINA 1: KPIs de Dinámica y Eficiencia ---
  // ---------------------------------------------------------------------------
  addHeaderAndTitle(doc, 'Resumen de Desempeño del Rebaño', currentPage);
  let currentY = 45; // Posición Y inicial después del título

  // --- Tabla de KPIs de Dinámica ---
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
  currentY = createKpiTable(doc, '📊 KPIs de Dinámica del Rebaño', dynamicsKpis, currentY);

  // --- Tabla de KPIs de Eficiencia ---
  const efficiencyKpis: [string, string][] = [
    ['Total Litros (Horizonte)', `${formatNumber(herdEfficiency.totalLitrosHorizonte)} L`],
    ['Litros / Vientre / Año', `${formatNumber(herdEfficiency.litrosPorVientrePorAnio)} L/Vientre`],
    ['Total Días-Lactancia', `${formatNumber(herdEfficiency.totalDiasLactancia)} Días`],
    ['Litros / Día-Lactancia', `${formatNumber(herdEfficiency.litrosPorDiaLactancia, 2)} L/Día`],
  ];
  createKpiTable(doc, '📈 KPIs de Eficiencia Lechera', efficiencyKpis, currentY);


  // ---------------------------------------------------------------------------
  // --- PÁGINA 2: Gráfico y KPIs de Linealidad ---
  // ---------------------------------------------------------------------------
  doc.addPage();
  currentPage++;
  addHeaderAndTitle(doc, 'Análisis de Producción y Linealidad', currentPage);
  currentY = 45;

  // --- Insertar la Imagen del Gráfico ---
  try {
    const imgProps = doc.getImageProperties(chartImage);
    const imgWidth = CONTENT_WIDTH;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    
    doc.addImage(chartImage, 'PNG', PAGE_MARGIN, currentY, imgWidth, imgHeight);
    currentY += imgHeight + 12; // Posición Y después del gráfico
  } catch (error) {
    console.error("Error al añadir imagen al PDF:", error);
    doc.text("Error al renderizar el gráfico.", PAGE_MARGIN, currentY);
    currentY += 10;
  }
  
  // --- Insertar Tabla de KPIs de Linealidad ---
  createLinearityKpiTable(doc, milkLinearityKpis, currentY);


  // ---------------------------------------------------------------------------
  // --- PÁGINA 3+: Tabla Detallada (Landscape) ---
  // ---------------------------------------------------------------------------
  doc.addPage('a4', 'landscape');
  currentPage++;
  
  // --- Encabezado y Pie de página para MODO LANDSCAPE ---
  const addLandscapeHeader = (pageNumber: number) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(HEADING_COLOR);
    doc.text('📋 Tabla Detallada de Flujos y Stock', PAGE_MARGIN, 20);
    // Pie de página
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor('#9ca3af');
    doc.text(`Página ${pageNumber}`, A4_HEIGHT - PAGE_MARGIN, A4_WIDTH - 10, { align: 'right' });
    doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, PAGE_MARGIN, A4_WIDTH - 10);
  };
  
  addLandscapeHeader(currentPage);

  // --- Definir Encabezados de la Tabla ---
  const tableHead: any = [ 
    [
      { content: 'Periodo', rowSpan: 2, styles: { halign: 'center', valign: 'middle', minCellWidth: 25 } },
      { content: 'Población', colSpan: 3, styles: { halign: 'center' } },
      { content: 'Producción', colSpan: 3, styles: { halign: 'center' } },
      { content: 'Flujos: Entradas', colSpan: 3, styles: { halign: 'center' } },
      { content: 'Flujos: Salidas (Muertes)', colSpan: 4, styles: { halign: 'center' } },
      { content: 'Flujos: Salidas (Ventas)', colSpan: 2, styles: { halign: 'center' } },
      { content: 'Flujos: Internos (Promociones H)', colSpan: 4, styles: { halign: 'center' } },
      { content: 'Desglose Stock Final', colSpan: 7, styles: { halign: 'center' } },
    ],
    [
      'Inicio', 'Final', 'Cambio', // Población
      'Litros', 'Vientres (Fin)', 'Ingresos Leche', // Producción
      'Nacim. H', 'Nacim. M', 'Compras', // Entradas
      'Muertes C.H', 'Muertes C.M', 'Muertes Lev.', 'Muertes Adu.', // Muertes
      'Ventas C.M', 'Ventas Desc.', // Ventas
      'C→LT', 'LT→LM', 'LM→LTD', 'LTD→C', // Promociones
      'Fin C.H', 'Fin C.M', 'Fin LT', 'Fin LM', 'Fin LTD', 'Fin Cabras', 'Fin Padres', // Desglose
    ]
  ];

  // --- Definir Cuerpo de la Tabla ---
  const tableBody: any[] = []; 
  for (const year of annualData) {
    const muertesLevanteA = year.muertesLevanteTemprano + year.muertesLevanteMedio + year.muertesLevanteTardio;
    const muertesAdultasA = year.muertesCabras + year.muertesPadres;
    // Fila Anual (con estilo)
    tableBody.push([
      { content: year.periodLabel, styles: { fontStyle: 'bold', fillColor: '#e5e7eb', textColor: TEXT_COLOR_DARK } },
      formatNumber(year.startTotal), formatNumber(year.endTotal), formatNumber(year.netChange),
      formatNumber(year.litrosLeche, 0), formatNumber(year.kpiProductivasCount, 0), formatCurrency(year.ingresosTotales, '$', 0),
      formatNumber(year.nacimientosH), formatNumber(year.nacimientosM), formatNumber(year.comprasVientres),
      formatNumber(year.muertesCriaH), formatNumber(year.muertesCriaM), formatNumber(muertesLevanteA), formatNumber(muertesAdultasA),
      formatNumber(year.ventasCabritos), formatNumber(year.ventasDescartes),
      formatNumber(year.promocionCriaH), formatNumber(year.promocionLevanteTemprano), formatNumber(year.promocionLevanteMedio), formatNumber(year.promocionLevanteTardio),
      formatNumber(year.endCriaH), formatNumber(year.endCriaM), formatNumber(year.endLevanteTemprano), formatNumber(year.endLevanteMedio), formatNumber(year.endLevanteTardio), formatNumber(year.endCabras), formatNumber(year.endPadres),
    ]);
    
    // Filas Semestrales
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
  }

  // --- Generar la Tabla Detallada ---
  autoTable(doc, {
    startY: 30,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { 
      fillColor: SECTION_COLOR,
      textColor: TEXT_COLOR_LIGHT, 
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center' as HAlignType,
      valign: 'middle' as VAlignType,
    },
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      overflow: 'linebreak',
      halign: 'right' as HAlignType,
    },
    columnStyles: {
      0: { halign: 'left' as HAlignType }, // Periodo
      5: { halign: 'left' as HAlignType }, // Ingresos Leche
    },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) {
        addLandscapeHeader(currentPage + data.pageNumber - 1);
      }
    }
  });

  // --- Guardar el PDF ---
  doc.save(`Reporte_Simulacion_GanaderoOS_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ---------------------------------------------------------------------------
// --- (NUEVO) FUNCIÓN DE EXPORTACIÓN DE PEDIGRÍ ---
// ---------------------------------------------------------------------------
export const exportPedigreeToPDF = async (
  element: HTMLElement,
  animal: Animal
) => {
  // 1. Crear el Canvas desde el elemento HTML
  const canvas = await html2canvas(element, {
    scale: 2.5,
    backgroundColor: '#ffffff', // Fondo Blanco
    useCORS: true,
  });
  const imgData = canvas.toDataURL('image/png');

  // 2. Calcular dimensiones (A4 Landscape: 297 x 210 mm)
  const pdfWidth = 297;
  const pdfHeight = 210;
  const pdfMargin = 10;
  const contentWidth = pdfWidth - pdfMargin * 2;
  
  const imgProps = {
    width: canvas.width,
    height: canvas.height
  };
  const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

  // 3. Crear el documento PDF en horizontal
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // 4. Añadir Título y Cabecera de GanaderoOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(HEADING_COLOR); // Azul
  doc.text('GanaderoOS - Pedigrí de Animal', pdfMargin, pdfMargin + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(TEXT_COLOR_DARK); // Gris oscuro
  doc.text(`Animal: ${formatAnimalDisplay(animal)}`, pdfMargin, pdfMargin + 15);

  // 5. Añadir la imagen del pedigrí
  let startY = pdfMargin + 25;
  if (imgHeight < (pdfHeight - startY - pdfMargin)) {
      startY = (pdfHeight - imgHeight) / 2; // Centrar verticalmente
  }
  
  doc.addImage(imgData, 'PNG', pdfMargin, startY, contentWidth, imgHeight);

  // 6. Añadir Pie de Página
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#9ca3af'); // Gris claro
  const pageStr = `Página 1 de 1`;
  doc.text(pageStr, pdfWidth - pdfMargin, pdfHeight - 10, { align: 'right' });
  doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pdfMargin, pdfHeight - 10);

  // 7. Guardar el PDF
  doc.save(`Pedigri_${animal.id}_${new Date().toISOString().split('T')[0]}.pdf`);
};

// ---------------------------------------------------------------------------
// --- (NUEVO) FUNCIÓN DE EXPORTACIÓN DE GRÁFICO DE CRECIMIENTO ---
// ---------------------------------------------------------------------------
/**
 * Exporta un gráfico de crecimiento a un PDF A4 vertical.
 * @param element El elemento HTML que contiene el gráfico (el div del modal)
 * @param animal El animal raíz para el título del PDF
 */
export const exportGrowthChartToPDF = async (
  element: HTMLElement,
  animal: Animal
) => {
  // 1. Crear el Canvas desde el elemento HTML
  const canvas = await html2canvas(element, {
    scale: 2.5, // Mayor escala para mejor resolución
    // No se define 'backgroundColor' para que respete el fondo oscuro
    useCORS: true,
  });
  const imgData = canvas.toDataURL('image/png');

  // 2. Calcular dimensiones (A4 Portrait: 210 x 297 mm)
  const pdfWidth = 210;
  const pdfHeight = 297;
  const pdfMargin = 10;
  const contentWidth = pdfWidth - pdfMargin * 2;
  
  const imgProps = {
    width: canvas.width,
    height: canvas.height
  };
  const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

  // 3. Crear el documento PDF en vertical
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // 4. Añadir Título y Cabecera de GanaderoOS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(HEADING_COLOR); // Azul
  doc.text('GanaderoOS - Perfil de Crecimiento', pdfMargin, pdfMargin + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(TEXT_COLOR_DARK); // Gris oscuro
  doc.text(`Animal: ${formatAnimalDisplay(animal)}`, pdfMargin, pdfMargin + 15);

  // 5. Añadir la imagen del gráfico
  let startY = pdfMargin + 25;
  // Centrar verticalmente si cabe en la página
  if (imgHeight < (pdfHeight - startY - pdfMargin)) {
      startY = (pdfHeight - imgHeight) / 2;
  }
  
  doc.addImage(imgData, 'PNG', pdfMargin, startY, contentWidth, imgHeight);

  // 6. Añadir Pie de Página
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor('#9ca3af'); // Gris claro
  const pageStr = `Página 1 de 1`;
  doc.text(pageStr, pdfWidth - pdfMargin, pdfHeight - 10, { align: 'right' });
  doc.text(`Generado: ${new Date().toLocaleString('es-VE')}`, pdfMargin, pdfHeight - 10);

  // 7. Guardar el PDF
  doc.save(`CurvaCrecimiento_${animal.id}_${new Date().toISOString().split('T')[0]}.pdf`);
};