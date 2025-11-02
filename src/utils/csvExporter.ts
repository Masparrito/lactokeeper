import { MonthlyEvolutionStep } from '../hooks/useHerdEvolution'; // Asegúrate que la ruta sea correcta

// -----------------------------------------------------------------------------
// --- DEFINICIÓN DE COLUMNAS PARA EL CSV ---
// -----------------------------------------------------------------------------
// Seleccionamos las columnas más relevantes del reporte mensual para el CSV
const CSV_COLUMNS: { key: keyof MonthlyEvolutionStep; label: string }[] = [
    { key: 'year', label: 'Año' },
    { key: 'month', label: 'Mes' },
    { key: 'periodLabel', label: 'Periodo' },
    { key: 'startTotal', label: 'Stock Total (Inicio)' },
    { key: 'endTotal', label: 'Stock Total (Final)' },
    { key: 'partos', label: 'N° Partos' },
    { key: 'nacimientosH', label: 'Nacidos H' },
    { key: 'nacimientosM', label: 'Nacidos M' },
    { key: 'muertesTotales', label: 'Muertes Totales' },
    { key: 'ventasTotales', label: 'Ventas Totales' },
    { key: 'comprasTotales', label: 'Compras Totales' },
    { key: 'litrosLeche', label: 'Litros Leche (Mes)' },
    { key: 'hembrasProduccion', label: 'Hembras en Producción' },
    { key: 'ingresosLeche', label: 'Ingresos Leche' },
    { key: 'ingresosTotales', label: 'Ingresos Totales (Mes)' },
    { key: 'endCriaH', label: 'Final Cría H (0-3m)' },
    { key: 'endLevanteTemprano', label: 'Final L. Temprano (3-6m)' },
    { key: 'endLevanteMedio', label: 'Final L. Medio (6-12m)' },
    { key: 'endLevanteTardio', label: 'Final L. Tardío (12-18m)' },
    { key: 'endCabras', label: 'Final Cabras (>18m)' },
    { key: 'endPadres', label: 'Final Padres' },
];

/**
 * Función auxiliar para escapar valores para CSV.
 * Si un valor contiene comas, comillas dobles o saltos de línea,
 * se envuelve en comillas dobles y se escapan las comillas internas.
 * @param value El valor a escapar.
 */
const escapeCSV = (value: any): string => {
    if (value === null || value === undefined) {
        return '""'; // Valor vacío
    }
    
    let stringValue = String(value);
    
    // Comprobar si necesita ser escapado
    if (stringValue.match(/("|,|\n)/)) {
        // 1. Reemplazar comillas dobles internas (") por dobles-comillas ("")
        stringValue = stringValue.replace(/"/g, '""');
        // 2. Envolver todo el valor en comillas dobles
        stringValue = `"${stringValue}"`;
    }
    
    return stringValue;
};

/**
 * Exporta los datos mensuales detallados de la simulación a un archivo CSV.
 * @param monthlyData El array de MonthlyEvolutionStep.
 * @param fileName El nombre del archivo (ej. "simulacion_detallada.csv").
 */
export const exportMonthlyDataToCSV = (
    monthlyData: MonthlyEvolutionStep[], 
    fileName: string = 'simulacion_mensual_detallada.csv'
) => {
    if (!monthlyData || monthlyData.length === 0) {
        console.warn("No hay datos para exportar a CSV.");
        alert("No hay datos mensuales para exportar.");
        return;
    }

    try {
        // 1. Crear la fila de cabeceras
        const headerRow = CSV_COLUMNS.map(col => escapeCSV(col.label)).join(',');

        // 2. Crear las filas de datos
        const dataRows = monthlyData.map(row => {
            return CSV_COLUMNS.map(col => {
                const value = row[col.key];
                
                // Formateo simple para números
                if (typeof value === 'number') {
                    // Usar punto decimal, sin comas de miles para CSV
                    if (['litrosLeche', 'ingresosLeche', 'ingresosTotales'].includes(col.key)) {
                        return value.toFixed(2); 
                    }
                    return String(Math.round(value)); // Redondear enteros
                }
                
                // Escapar strings
                return escapeCSV(value);
            }).join(',');
        });

        // 3. Unir todo el contenido
        const csvContent = [headerRow, ...dataRows].join('\n');

        // 4. Crear el Blob
        // Añadir BOM (Byte Order Mark) para que Excel (especialmente en Windows)
        // reconozca los caracteres UTF-8 (como acentos) correctamente.
        const bom = '\uFEFF';
        const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

        // 5. Crear y simular el clic en un enlace de descarga
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // 7. Limpiar la URL del objeto blob
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Error al exportar a CSV:", error);
        alert("Ocurrió un error al intentar generar el archivo CSV.");
    }
};