import React from 'react';
import {
    ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis,
    CartesianGrid, Tooltip
} from 'recharts';
import { useKilosAnalytics } from '../../../hooks/useKilosAnalytics';
import { Users } from 'lucide-react';

interface KilosChartViewProps {
    analytics: ReturnType<typeof useKilosAnalytics>;
    onPointClick: (day: number) => void;
}

export const KilosChartView: React.FC<KilosChartViewProps> = ({ analytics, onPointClick }) => {
    const { chartData, kpis } = analytics;

    // Handler para capturar el click en el gráfico
    const handleClick = (state: any) => {
        if (state && state.activeLabel !== undefined) {
            onPointClick(Number(state.activeLabel));
        }
    };

    if (!chartData || chartData.length === 0) {
        return (
            <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                No hay datos suficientes para graficar.
            </div>
        );
    }

    return (
        <div className="h-full w-full pb-20 bg-black relative">
            
            {/* Indicador de Población en el Gráfico (Overlay) */}
            <div className="absolute top-4 right-4 z-10 bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm pointer-events-none">
                <Users size={10} className="text-zinc-400" />
                <span className="text-[10px] font-mono font-bold text-zinc-300">
                    N = {kpis.totalAnimals}
                </span>
            </div>

            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart 
                    data={chartData} 
                    onClick={handleClick} 
                    margin={{ top: 20, right: 0, left: -20, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    
                    <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="#1f1f22" 
                        vertical={false} 
                    />
                    
                    <XAxis 
                        dataKey="day" 
                        type="number" 
                        tick={{fontSize: 10, fill: '#52525b'}} 
                        tickFormatter={(d) => `${d}d`} 
                        axisLine={false} 
                        tickLine={false} 
                        domain={[0, 'dataMax']} 
                        interval="preserveStartEnd"
                    />
                    
                    <YAxis 
                        tick={{fontSize: 10, fill: '#52525b'}} 
                        axisLine={false} 
                        tickLine={false} 
                        domain={[0, 'auto']} 
                    />
                    
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: '#18181b', 
                            borderColor: '#27272a', 
                            borderRadius: '12px', 
                            color: '#fff',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'
                        }}
                        itemStyle={{ fontSize: '12px', fontFamily: 'monospace' }}
                        labelFormatter={(label) => `Edad: ${label} días`}
                        formatter={(value: number, name: string) => [
                            `${value} kg`, 
                            name === 'valueA' ? 'Promedio Real' : 'Meta Ideal'
                        ]}
                        cursor={{ stroke: '#52525b', strokeWidth: 1, strokeDasharray: '4 4' }}
                    />
                    
                    {/* Línea de Meta (Punteada) */}
                    <Line 
                        type="monotone" 
                        dataKey="meta" 
                        stroke="#3f3f46" 
                        strokeWidth={1} 
                        strokeDasharray="4 4" 
                        dot={false} 
                        activeDot={false} 
                        name="meta"
                    />
                    
                    {/* Área de Datos Reales (Azul Stocks) */}
                    <Area 
                        type="monotone" 
                        dataKey="valueA" 
                        stroke="#3b82f6" 
                        strokeWidth={2} 
                        fill="url(#colorMain)" 
                        dot={false} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }} 
                        name="valueA"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};