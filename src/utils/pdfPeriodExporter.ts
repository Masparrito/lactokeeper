import jsPDF from 'jspdf';
import autoTable, { FontStyle } from 'jspdf-autotable'; // <-- Corregido: HAlignType y VAlignType eliminados
import { 
  AnnualEvolutionStep, 
  SemestralEvolutionStep // <-- Advertencia TS6192 (Todo sin usar) - Corregido: Ahora se usa
} from '../hooks/useHerdEvolution'; // ¡Verifica esta ruta!

import { formatNumber } from './formatters'; // ¡Verifica esta ruta!

// -----------------------------------------------------------------------------
// --- 1. LÓGICA DE ANÁLISIS IA "GANAGENIUS" ---
// -----------------------------------------------------------------------------
type PeriodData = AnnualEvolutionStep | SemestralEvolutionStep;

const getGanaGeniusAnalysis = (data: PeriodData): string => {
  // 1. Calcular Vientres y Hembras Totales (con redondeo)
  const formatNum = (n: number) => Math.round(n);
  const startVientres = formatNum(data.startCabras) + formatNum(data.startLevanteTardio);
  const endVientres = formatNum(data.endCabras) + formatNum(data.endLevanteTardio);
  const netVientres = endVientres - startVientres;
  const growthVientres = startVientres > 0 ? (netVientres / startVientres) * 100 : 0;

  const startHembrasCrecimiento = formatNum(data.startCriaH) + formatNum(data.startLevanteTemprano) + formatNum(data.startLevanteMedio);
  const endHembrasCrecimiento = formatNum(data.endCriaH) + formatNum(data.endLevanteTemprano) + formatNum(data.endLevanteMedio);
  
  const startHembrasTotales = startVientres + startHembrasCrecimiento;
  const endHembrasTotales = endVientres + endHembrasCrecimiento;
  // --- Corregido TS6133: 'netHembras' ahora se usa ---
  const netHembras = endHembrasTotales - startHembrasTotales; 
  
  const totalNacimientos = formatNum(data.nacimientosH) + formatNum(data.nacimientosM);
  const totalMuertes = formatNum(data.muertesTotales);
  const totalVentas = formatNum(data.ventasTotales);
  const totalBajas = totalMuertes + totalVentas;

  // 2. Generar el texto del análisis
  let analysis = "";

  // A. Análisis de Crecimiento de Vientres
  if (netVientres > 0) {
    analysis += `El período fue POSITIVO, con un crecimiento de +${netVientres} vientres (+${growthVientres.toFixed(1)}%). `;
  } else {
    analysis += `Período de DECRECIMIENTO, con una pérdida de ${netVientres} vientres (${growthVientres.toFixed(1)}%). `;
  }
  analysis += `El rebaño de vientres pasó de ${startVientres} a ${endVientres} animales.\n\n`;

  // B. Análisis de Flujos (Nacimientos vs Bajas)
  analysis += `Este cambio fue el resultado de ${totalNacimientos} nacimientos, contrarrestados por ${totalBajas} bajas totales (${totalMuertes} muertes y ${totalVentas} ventas). `;
  if (totalNacimientos > totalBajas) {
    analysis += "Los nacimientos superaron exitosamente a las bajas, impulsando el crecimiento.\n";
  } else {
    analysis += "Las bajas superaron a los nacimientos, causando la reducción del rebaño.\n";
  }

  // C. Análisis de Crecimiento Futuro (Hembras en Crecimiento)
  const netHembrasCrecimiento = endHembrasCrecimiento - startHembrasCrecimiento;
  if (netHembrasCrecimiento > 0) {
    analysis += `RECOMENDACIÓN: El "pool" de hembras en crecimiento aumentó (+${netHembrasCrecimiento}), lo que augura un buen potencial de reemplazo y crecimiento futuro. (Total Hembras: ${netHembras > 0 ? '+' : ''}${netHembras})`;
  } else {
    analysis += `ALERTA: El "pool" de hembras en crecimiento se redujo (${netHembrasCrecimiento}), lo que podría comprometer el reemplazo y crecimiento en los próximos períodos. (Total Hembras: ${netHembras})`;
  }

  return analysis;
};

// --- Función de ayuda para crear tablas de KPIs ---
const createKpiTable = (doc: jsPDF, title: string, kpis: [string, string][], startY: number): number => {
  autoTable(doc, {
    startY: startY,
    head: [[title, 'Valor']],
    body: kpis,
    theme: 'striped',
    headStyles: { fillColor: [44, 62, 80] }, // Gris oscuro
    styles: { fontSize: 10 },
  });
  return (doc as any).lastAutoTable.finalY + 8; // Espacio después de la tabla
};

// -----------------------------------------------------------------------------
// --- 2. FUNCIÓN PRINCIPAL DE EXPORTACIÓN ---
// -----------------------------------------------------------------------------
export const exportPeriodReport = (
  data: PeriodData
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  
  // --- Título ---
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold' as FontStyle);
  doc.setTextColor(44, 62, 80); // Gris oscuro
  doc.text(`Reporte de Período: ${data.periodLabel}`, 105, 20, { align: 'center' });
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal' as FontStyle);
  doc.setTextColor(120, 120, 120);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 105, 27, { align: 'center' });


  // --- Sección 1: Análisis GanaGenius ---
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold' as FontStyle);
  doc.setTextColor(88, 86, 214); // Púrpura iOS
  doc.text("Análisis IA GanaGenius", 14, 45);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal' as FontStyle);
  doc.setTextColor(50, 50, 50);
  const analysisText = getGanaGeniusAnalysis(data);
  doc.splitTextToSize(analysisText, 182).forEach((line: string, index: number) => {
    doc.text(line, 14, 52 + (index * 5));
  });

  let currentY = 80; // Posición Y inicial después del texto (aumentada)

  // --- Sección 2: KPIs de Vientres y Hembras (CORREGIDOS TS2322) ---
  const kpiVientres: [string, string][] = [
    ['Vientres Iniciales', formatNumber(data.startCabras + data.startLevanteTardio)],
    ['Vientres Finales', formatNumber(data.endCabras + data.endLevanteTardio)],
    ['Crecimiento Vientres (Neto)', `${formatNumber((data.endCabras + data.endLevanteTardio) - (data.startCabras + data.startLevanteTardio))}`],
    ['Crecimiento Vientres (%)', formatNumber(data.growthRate, 1) + ' %'], // 'growthRate' ya está en data
  ];
  currentY = createKpiTable(doc, 'Resumen de Vientres Productivos', kpiVientres, currentY);

  const kpiHembras: [string, string][] = [
    ['H. en Crecimiento (Inicio)', formatNumber(data.startCriaH + data.startLevanteTemprano + data.startLevanteMedio)],
    ['H. en Crecimiento (Final)', formatNumber(data.endCriaH + data.endLevanteTemprano + data.endLevanteMedio)],
    ['Total Hembras (Inicio)', formatNumber(data.startCabras + data.startLevanteTardio + data.startCriaH + data.startLevanteTemprano + data.startLevanteMedio)],
    ['Total Hembras (Final)', formatNumber(data.endCabras + data.endLevanteTardio + data.endCriaH + data.endLevanteTemprano + data.endLevanteMedio)],
  ];
  currentY = createKpiTable(doc, 'Resumen de Hembras en Crecimiento', kpiHembras, currentY);

  // --- Sección 3: Flujos (Entradas y Salidas) (CORREGIDOS TS2322) ---
  doc.addPage(); // Nueva página para los flujos
  currentY = 20;

  const kpiFlujos: [string, string][] = [
    ['Nacimientos (Hembras)', formatNumber(data.nacimientosH)],
    ['Nacimientos (Machos)', formatNumber(data.nacimientosM)],
    ['Total Nacimientos', formatNumber(data.nacimientosH + data.nacimientosM)],
    ['Muertes Totales', formatNumber(data.muertesTotales)],
    ['Ventas Totales', formatNumber(data.ventasTotales)],
    ['Compras Totales', formatNumber(data.comprasTotales)],
  ];
  currentY = createKpiTable(doc, 'Flujos del Período', kpiFlujos, currentY);

  // --- Sección 4: Desglose de Bajas (CORREGIDOS TS2322) ---
  const kpiBajas: [string, string][] = [
    ['Muertes Crías H', formatNumber(data.muertesCriaH)],
    ['Muertes Crías M', formatNumber(data.muertesCriaM)],
    ['Muertes Levante', formatNumber(data.muertesLevanteTemprano + data.muertesLevanteMedio + data.muertesLevanteTardio)],
    ['Muertes Cabras', formatNumber(data.muertesCabras)],
    ['Muertes Padres', formatNumber(data.muertesPadres)],
    ['Ventas Crías M (Elim.)', formatNumber(data.ventasCabritos)],
    ['Ventas Cabras (Descarte)', formatNumber(data.ventasDescartes)],
  ];
  currentY = createKpiTable(doc, 'Desglose de Bajas', kpiBajas, currentY);
  
  // --- Sección 5: Desglose de Stock Final (CORREGIDOS TS2322) ---
  const kpiStock: [string, string][] = [
    ['Cabras (>18m)', formatNumber(data.endCabras)],
    ['L. Tardío (12-18m)', formatNumber(data.endLevanteTardio)],
    ['L. Medio (6-12m)', formatNumber(data.endLevanteMedio)],
    ['L. Temprano (3-6m)', formatNumber(data.endLevanteTemprano)],
    ['Crías H (0-3m)', formatNumber(data.endCriaH)],
    ['Crías M (0-3m)', formatNumber(data.endCriaM)],
    ['Padres (>12m)', formatNumber(data.endPadres)],
  ];
  currentY = createKpiTable(doc, 'Desglose de Stock (Final)', kpiStock, currentY);

  // --- Guardar el PDF ---
  doc.save(`Reporte_${data.periodLabel.replace(/ /g, '_')}.pdf`);
};