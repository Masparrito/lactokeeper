// src/components/charts/StocksGrowthChart.tsx
// (CORREGIDO: Se elimina la importación de 'next/dynamic' que no aplica)

import React, { useMemo } from 'react';
import { Animal } from '../../db/local';
import { formatAnimalDisplay } from '../../utils/formatting';
// --- (CORREGIDO) Importar 'react-apexcharts' directamente ---
import Chart from 'react-apexcharts';

// Propiedades del componente
interface StocksGrowthChartProps {
    animal: Animal;
    chartData: any[]; // Datos de { age, [animal.id], Meta }
}

// --- Helper para convertir edad (días) a Timestamps ---
// ApexCharts necesita Timestamps (milisegundos) para el eje de tiempo
const addDaysToDate = (baseDateStr: string, days: number): number => {
    const date = new Date(baseDateStr + 'T00:00:00Z');
    date.setUTCDate(date.getUTCDate() + days);
    return date.getTime(); // Devolver milisegundos
};

export const StocksGrowthChart: React.FC<StocksGrowthChartProps> = ({ animal, chartData }) => {

    // 1. Formatear los datos para ApexCharts
    const [series, hasData] = useMemo(() => {
        if (!animal.birthDate || animal.birthDate === 'N/A') {
            return [[], false];
        }

        const animalData = chartData
            .map(d => [
                addDaysToDate(animal.birthDate, d.age), // Timestamp
                d[animal.id] // Valor
            ])
            .filter(d => d[1] !== undefined); // Eliminar puntos nulos

        const metaData = chartData
            .map(d => [
                addDaysToDate(animal.birthDate, d.age), // Timestamp
                d.Meta // Valor
            ])
            .filter(d => d[1] !== undefined); 

        const seriesData = [
            {
                name: formatAnimalDisplay(animal),
                data: animalData,
            },
            {
                name: 'Meta',
                data: metaData,
            }
        ];

        return [seriesData, animalData.length > 0];
    }, [chartData, animal.id, animal.birthDate, animal.name]);

    // 2. Configurar las opciones del gráfico
    const options: ApexCharts.ApexOptions = {
        chart: {
            type: 'line',
            height: '100%',
            background: 'transparent',
            // --- ¡LA MAGIA! Habilita el zoom y paneo ---
            zoom: {
                enabled: true,
                type: 'x', // Zoom solo en el eje X (tiempo)
            },
            toolbar: {
                show: true, // Muestra la barra de herramientas (zoom in/out, pan, reset)
                tools: {
                    download: false, // Ocultamos la descarga por defecto (usaremos PDF)
                    pan: true,
                    zoom: true,
                    zoomin: true,
                    zoomout: true,
                    reset: true,
                }
            },
        },
        // --- Tema Oscuro ---
        theme: {
            mode: 'dark',
        },
        // --- Colores y Estilos ---
        colors: ['#34C759', '#FF9500'], // Verde y Naranja iOS
        stroke: {
            curve: 'smooth',
            width: [3, 2], // 3px para animal, 2px para meta
            dashArray: [0, 5], // 0 (sólido) para animal, 5 (punteado) para meta
        },
        // --- Eje X (Tiempo) ---
        xaxis: {
            type: 'datetime',
            labels: {
                datetimeUTC: false, // Usar hora local
                format: 'dd MMM yy',
            },
            tooltip: {
                enabled: true,
            }
        },
        // --- Eje Y (Peso) ---
        yaxis: {
            title: {
                text: 'Peso (Kg)',
            },
            labels: {
                formatter: (val) => val.toFixed(1), // 1 decimal
            }
        },
        // --- Tooltip (Crosshair) ---
        tooltip: {
            x: {
                format: 'dd MMM yyyy', // Formato de fecha en el tooltip
            },
            y: {
                formatter: (val) => `${val.toFixed(1)} Kg`, // Añadir 'Kg'
            }
        },
        // --- Leyenda ---
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            offsetY: 10,
        },
        grid: {
            borderColor: 'rgba(255, 255, 255, 0.1)',
        }
    };

    if (!hasData) {
        return <div className="text-zinc-500 text-center p-8">Datos insuficientes para mostrar el gráfico.</div>
    }

    return (
        <div className="w-full h-full">
            <Chart
                options={options}
                series={series}
                type="line"
                height="100%"
                width="100%"
            />
        </div>
    );
};