// src/pages/modules/health/CostAnalysisPage.tsx

import React from 'react'; // React importado
import { useCostAnalysis } from '../../../hooks/useCostAnalysis';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { DollarSign, BarChart2, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
// --- CAMBIO: Importar formatAnimalDisplay (aunque no se use, para futura referencia si se añade nombre) ---

// Tarjeta reutilizable para Indicadores Clave de Rendimiento (KPI)
const KpiCard = ({ title, value, unit, icon: Icon }: { title: string, value: string, unit?: string, icon: React.ElementType }) => (
    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase">
            <Icon size={14} />
            <span>{title}</span>
        </div>
        <p className="text-3xl font-bold text-white mt-1">{value} <span className="text-xl text-zinc-400">{unit}</span></p>
    </div>
);

// Colores para el gráfico de torta
const COLORS = ['#34C759', '#FF9500', '#007AFF', '#AF52DE', '#FF3B30', '#5E5CE6', '#5AC8FA', '#FFCC00'];

export default function CostAnalysisPage() {
    const { totalCostLast30Days, avgCostPerAnimal, monthlyCosts, costsByCategory, topCostAnimals } = useCostAnalysis();

    const formatMonth = (tickItem: string) => {
        const date = new Date(tickItem + '-02T00:00:00Z'); // '-02' para evitar problemas de zona horaria
        return date.toLocaleString('es-VE', { month: 'short', year: '2-digit' });
    };
    
    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pb-12"> {/* Added pb-12 */}
            <header className="text-center pt-4"> {/* Added pt-4 */}
                <h1 className="text-3xl font-bold tracking-tight text-white">Análisis de Costos</h1>
                <p className="text-lg text-zinc-400">Módulo StockCare</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KpiCard 
                    title="Costo (Últimos 30 días)"
                    value={`$${totalCostLast30Days.toFixed(2)}`}
                    icon={DollarSign}
                />
                <KpiCard 
                    title="Costo Prom./Animal (30d)"
                    value={`$${avgCostPerAnimal.toFixed(2)}`}
                    icon={TrendingUp}
                />
            </div>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4"><BarChart2 size={20}/> Costo Mensual (Últimos 6m)</h3>
                <div className="w-full h-56">
                    <ResponsiveContainer>
                        <BarChart data={monthlyCosts} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <XAxis dataKey="name" tickFormatter={formatMonth} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <YAxis tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} unit="$" />
                            <Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} contentStyle={{ backgroundColor: 'rgba(44, 44, 46, 0.8)', border: '1px solid #444', borderRadius: '12px' }} formatter={(value: number) => `$${value.toFixed(2)}`} />
                            <Bar dataKey="total" name="Costo Total" fill="#2dd4bf" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4"><PieChartIcon size={20}/> Costos por Categoría</h3>
                    <div className="w-full h-48">
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie data={costsByCategory} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={60} fill="#8884d8">
                                    {costsByCategory.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(44, 44, 46, 0.8)', border: '1px solid #444', borderRadius: '12px' }} formatter={(value: number) => `$${value.toFixed(2)}`}/>
                                <Legend iconSize={10} wrapperStyle={{fontSize: '12px', color: '#a1a1aa'}}/>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Top 5 Animales (Costo Total)</h3>
                    <div className="space-y-2">
                        {topCostAnimals.length > 0 ? topCostAnimals.map((animal, index) => (
                            <div key={animal.animalId} className="flex justify-between items-center text-sm bg-black/20 p-2 rounded-md">
                                {/* --- CAMBIO: Aplicado font-mono y text-base al ID --- */}
                                <span className="font-mono font-semibold text-base text-white">
                                    {index + 1}. {animal.animalId}
                                </span>
                                <span className="font-bold text-teal-300">${animal.total.toFixed(2)}</span>
                            </div>
                        )) : <p className="text-sm text-zinc-500 text-center pt-8">No hay datos suficientes.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
}