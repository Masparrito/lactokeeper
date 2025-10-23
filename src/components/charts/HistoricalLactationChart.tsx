// src/components/charts/HistoricalLactationChart.tsx
import React, { useMemo, useState } from 'react';
import {
    ResponsiveContainer,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    AreaChart,
    Area,
} from 'recharts';
import { LactationCycle } from '../../hooks/useAnimalData';
import { ComparisonResult } from '../../hooks/useComparativeData';

interface HistoricalLactationChartProps {
    lactationsData: LactationCycle[];
    comparisonData?: ComparisonResult | null; 
    highlightedLactationDate: string | null; 
    onLactationClick: (parturitionDate: string | null) => void;
}

// Paleta de colores para lactancias individuales (sin cambios)
const LACTATION_COLORS = [
    { stroke: '#FF9500', fill: 'url(#gradient0)' }, // Naranja
    { stroke: '#34C759', fill: 'url(#gradient1)' }, // Verde
    { stroke: '#007AFF', fill: 'url(#gradient2)' }, // Azul
    { stroke: '#AF52DE', fill: 'url(#gradient3)' }, // Púrpura
    { stroke: '#FF3B30', fill: 'url(#gradient4)' }, // Rojo
    { stroke: '#5AC8FA', fill: 'url(#gradient5)' }, // Azul claro
    { stroke: '#FFCC00', fill: 'url(#gradient6)' }, // Amarillo
];

// --- CORRECCIÓN CLAVE: Nuevo color vibrante para la comparación ---
const COMPARISON_VIBRANT_COLOR = '#007AFF'; // Un azul más fuerte para destacar
const COMPARISON_DEFAULT_GRADIENT_ID = 'comparisonGradient';

// Tooltip (sin cambios)
const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/70 backdrop-blur-md p-3 rounded-lg border border-zinc-700 text-white shadow-xl">
                <p className="label text-zinc-400 text-sm font-medium mb-1">DEL: {label}</p>
                {payload.map((entry: any) => (
                    <p key={entry.name} style={{ color: entry.stroke || entry.payload?.stroke }} className="font-semibold text-base flex justify-between items-center gap-4">
                        <span>{entry.name}:</span>
                        <span>{typeof entry.value === 'number' ? `${entry.value.toFixed(2)} Kg` : 'N/A'}</span>
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


export const HistoricalLactationChart: React.FC<HistoricalLactationChartProps> = ({
    lactationsData,
    comparisonData,
    highlightedLactationDate,
    onLactationClick
}) => {
    const [hoveredLegendKey, setHoveredLegendKey] = useState<string | null>(null);

    const displayedLactations = useMemo(() => {
        if (!lactationsData) return [];
        return lactationsData.slice(-LACTATION_COLORS.length).reverse();
    }, [lactationsData]);

    const lactationNameMap = useMemo(() => {
        return new Map(displayedLactations.map(lact => {
            const lactationYear = new Date(lact.parturitionDate).getFullYear();
            const name = `Lact. ${lactationYear}`;
            return [name, lact.parturitionDate];
        }));
    }, [displayedLactations]);

    const formatLegendLabel = (value: string, entry: any) => {
        const parturitionDate = lactationNameMap.get(value);
        const isHighlightedByZoom = isZoomActive && highlightedLactationDate === parturitionDate;
        const isHovered = hoveredLegendKey === value;
        const isComparisonLine = entry.dataKey === 'kg' && comparisonData && value === comparisonData.name;

        let opacity = 1.0;
        if (isComparisonLine) { // La línea de comparación siempre es muy visible
            opacity = 1.0; // Opacidad máxima para comparación
        } else if (isZoomActive) {
            opacity = isHighlightedByZoom ? 1 : 0.7; // Líneas de fondo más visibles
        } else if (hoveredLegendKey) {
            opacity = isHovered ? 1 : 0.7;
        }
        
        return <span style={{ color: entry.color, opacity: opacity, transition: 'opacity 0.2s ease' }}>{value}</span>;
    };


    const allDataPoints = useMemo(() => {
        if (!displayedLactations) return [];
        let points = displayedLactations.flatMap(l => l.lactationCurve);
        if (comparisonData?.curve) {
            points = points.concat(comparisonData.curve);
        }
        return points;
    }, [displayedLactations, comparisonData]);

    const maxDel = useMemo(() => {
        if (!allDataPoints || allDataPoints.length === 0) return 305;
        return Math.max(...allDataPoints.map(p => p.del), 0);
    }, [allDataPoints]);
    
    const maxKg = useMemo(() => {
        if (!allDataPoints || allDataPoints.length === 0) return 5;
        return Math.max(...allDataPoints.map(p => p.kg), 0);
    }, [allDataPoints]);

    const isZoomActive = highlightedLactationDate !== null; 

    // --- CORRECCIÓN: Usar el nuevo color vibrante para la comparación ---
    const comparisonStroke = COMPARISON_VIBRANT_COLOR;
    const comparisonFill = `url(#${COMPARISON_DEFAULT_GRADIENT_ID})`;
    
    if (!displayedLactations) {
        return <div className="text-center p-8 text-zinc-500">Cargando datos...</div>;
    }
    if (displayedLactations.length === 0) {
        return <div className="text-center p-8 text-zinc-500">No hay datos históricos de lactancia para mostrar.</div>;
    }

    return (
        <div className="w-full h-72">
            <ResponsiveContainer>
                <AreaChart 
                    margin={{ top: 5, right: 15, left: -25, bottom: 5 }}
                    onClick={(e: any) => {
                        if (!e || !e.activePayload || e.activePayload.length === 0) {
                            onLactationClick(null); 
                        }
                    }}
                >
                    <defs>
                        {LACTATION_COLORS.map((color, index) => (
                            <linearGradient key={`grad-${index}`} id={`gradient${index}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color.stroke} stopOpacity={0.7}/> 
                                <stop offset="95%" stopColor={color.stroke} stopOpacity={0.15}/>
                            </linearGradient>
                        ))}
                        {/* --- CORRECCIÓN: Gradiente de comparación con color vibrante y más intensidad --- */}
                        <linearGradient id={COMPARISON_DEFAULT_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor={COMPARISON_VIBRANT_COLOR} stopOpacity={0.6}/> {/* Más opaco */}
                             <stop offset="95%" stopColor={COMPARISON_VIBRANT_COLOR} stopOpacity={0.1}/> {/* Se difumina menos */}
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" vertical={false} />
                    <XAxis dataKey="del" type="number" domain={[0, maxDel > 0 ? maxDel : 305]} tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 10 }} stroke="rgba(255, 255, 255, 0.2)" axisLine={false} tickLine={false} name="DEL" />
                    <YAxis orientation="right" tick={{ fill: 'rgba(255, 255, 255, 0.5)', fontSize: 10 }} stroke="rgba(255, 255, 255, 0.2)" axisLine={false} tickLine={false} domain={[0, maxKg > 0 ? Math.ceil(maxKg + 0.5) : 5]} unit="Kg" width={35} />
                    <Tooltip content={<CustomTooltipContent />} cursor={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 1.5 }} />
                    <Legend
                        verticalAlign="top"
                        height={36}
                        iconType="plainline"
                        wrapperStyle={{fontSize: '12px', paddingBottom: '10px'}}
                        formatter={formatLegendLabel}
                        onMouseEnter={(e) => setHoveredLegendKey(e.value)}
                        onMouseLeave={() => setHoveredLegendKey(null)}
                    />

                    {displayedLactations.map((lactation, index) => {
                        const color = LACTATION_COLORS[index % LACTATION_COLORS.length];
                        const lactationYear = new Date(lactation.parturitionDate).getFullYear();
                        const name = `Lact. ${lactationYear}`;
                        
                        const isHighlightedByZoom = highlightedLactationDate === lactation.parturitionDate;
                        const isHighlightedByHover = hoveredLegendKey === name;
                        const isHighlighted = isHighlightedByZoom || isHighlightedByHover;

                        // --- Opacidades (WeatherGraph style) ---
                        // Si hay zoom, la resaltada es 1, las demás 0.7
                        // Si hay hover, la resaltada es 1, las demás 0.9 (menos tenues que en zoom)
                        const opacity = isZoomActive ? (isHighlightedByZoom ? 1 : 0.7) : (isHighlightedByHover ? 1 : 0.9);
                        const strokeWidth = isHighlighted ? 3.5 : 2.5; 
                        const fillOpacity = isZoomActive ? (isHighlightedByZoom ? 0.7 : 0.3) : (isHighlightedByHover ? 0.8 : 0.7);

                        return (
                            <React.Fragment key={lactation.parturitionDate}>
                                <Area
                                    type="monotone"
                                    data={lactation.lactationCurve}
                                    dataKey="kg"
                                    name={name}
                                    stroke="none"
                                    fill={color.fill}
                                    fillOpacity={fillOpacity}
                                    activeDot={false}
                                    style={{ transition: 'opacity 0.2s ease, fill-opacity 0.2s ease' }}
                                />
                                <Line
                                    type="monotone"
                                    data={lactation.lactationCurve}
                                    dataKey="kg"
                                    name={name}
                                    stroke={color.stroke}
                                    strokeWidth={strokeWidth}
                                    dot={false}
                                    activeDot={{ r: 5, strokeWidth: 0 }}
                                    strokeOpacity={opacity}
                                    style={{ transition: 'opacity 0.2s ease, stroke-width 0.2s ease' }}
                                    onClick={() => {
                                        onLactationClick(lactation.parturitionDate);
                                    }}
                                    cursor="pointer"
                                />
                            </React.Fragment>
                        );
                    })}

                    {/* Renderizar Comparación (AHORA CON COLOR VIBRANTE Y MÁS VISIBLE) */}
                    {comparisonData && comparisonData.curve.length > 0 && (
                         <React.Fragment>
                             <Area
                                 type="monotone"
                                 data={comparisonData.curve}
                                 dataKey="kg"
                                 name={comparisonData.name}
                                 stroke="none"
                                 fill={comparisonFill}
                                 // Opacidad del área de comparación, siempre visible
                                 fillOpacity={isZoomActive ? 0.4 : 0.6} // Más opaca que antes
                                 style={{ transition: 'opacity 0.2s ease' }}
                             />
                             <Line
                                 type="monotone"
                                 data={comparisonData.curve}
                                 dataKey="kg"
                                 name={comparisonData.name}
                                 stroke={comparisonStroke} // Color vibrante
                                 strokeWidth={2.5} // Ligeramente más gruesa
                                 strokeDasharray="4 4"
                                 dot={false}
                                 activeDot={{ r: 5, strokeWidth: 0 }}
                                 strokeOpacity={1} // Siempre opaca
                                 style={{ transition: 'opacity 0.2s ease' }}
                             />
                         </React.Fragment>
                    )}

                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};