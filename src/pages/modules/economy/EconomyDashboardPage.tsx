// src/pages/modules/economy/EconomyDashboardPage.tsx

import React from 'react';
import { useEconomicAnalysis, AnimalProfitability } from '../../../hooks/useEconomicAnalysis';
import { ArrowUp, ArrowDown, DollarSign, Droplets, TrendingUp, BarChart4 } from 'lucide-react';
import { BarChart, Bar, ResponsiveContainer, XAxis, Tooltip, Cell } from 'recharts';

// Sub-componente para tarjetas de KPI
const KpiCard = ({ title, value, unit, icon: Icon, colorClass }: { title: string, value: string, unit?: string, icon: React.ElementType, colorClass?: string }) => (
    <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border ${colorClass || ''}`}>
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase">
            <Icon size={14} />
            <span>{title}</span>
        </div>
        <p className="text-3xl font-bold text-white mt-1">{value} <span className="text-xl text-zinc-400">{unit}</span></p>
    </div>
);

// Sub-componente para la fila de cada animal en el ranking
const AnimalProfitabilityRow = ({ animalData }: { animalData: AnimalProfitability }) => {
    const isProfitable = animalData.netProfit >= 0;

    return (
        <div className="w-full text-left bg-black/20 rounded-xl p-4 border border-zinc-700/80 flex justify-between items-center">
            <div>
                <p className="font-bold text-xl text-white">{animalData.animalId}</p>
                <div className="flex items-center gap-4 text-xs text-zinc-400 mt-1">
                    <span>Ingresos: ${animalData.totalRevenue.toFixed(2)}</span>
                    <span>Costos: ${animalData.totalCosts.toFixed(2)}</span>
                </div>
            </div>
            <div className={`text-right font-bold text-2xl ${isProfitable ? 'text-brand-green' : 'text-brand-red'}`}>
                {isProfitable ? '+' : ''}${animalData.netProfit.toFixed(2)}
            </div>
        </div>
    );
};

// Tooltip personalizado para el gráfico
const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: any[] }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/60 backdrop-blur-md p-2 rounded-lg border border-zinc-700 text-white text-sm">
                <p className="font-bold">{payload[0].payload.animalId}</p>
                <p style={{ color: payload[0].fill }}>
                    Rentabilidad: ${payload[0].value.toFixed(2)}
                </p>
            </div>
        );
    }
    return null;
};


export default function EconomyDashboardPage() {
    const { 
        animalsByProfitability,
        totalFarmRevenue,
        totalFarmCosts,
        totalFarmNetProfit,
        averageCostPerLiter,
        assumedMilkPrice
    } = useEconomicAnalysis();

    const top5Profitable = animalsByProfitability.slice(0, 5);
    const bottom5Profitable = animalsByProfitability.slice(-5).reverse();

    if (animalsByProfitability.length === 0) {
        return (
            <div className="text-center py-10 bg-brand-glass rounded-2xl mx-4 flex flex-col items-center gap-4">
                <DollarSign size={48} className="text-zinc-600" />
                <p className="text-zinc-400 font-semibold text-lg">No hay datos suficientes</p>
                <p className="text-zinc-500 text-sm max-w-xs">
                    Registra pesajes lecheros y eventos de salud con costos para empezar a ver el análisis económico.
                </p>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-2xl mx-auto space-y-6 animate-fade-in px-4">
            <header className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Análisis Económico</h1>
                <p className="text-lg text-zinc-400">Rentabilidad de la Finca</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KpiCard title="Ingresos Totales (Leche)" value={`$${totalFarmRevenue.toFixed(2)}`} icon={ArrowUp} colorClass="border-green-500/30" />
                <KpiCard title="Costos Totales (Sanidad)" value={`$${totalFarmCosts.toFixed(2)}`} icon={ArrowDown} colorClass="border-red-500/30" />
            </div>

            <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border ${totalFarmNetProfit >= 0 ? 'border-green-500/50' : 'border-red-500/50'}`}>
                <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase">
                    <DollarSign size={14} />
                    <span>Rentabilidad Neta (Ingresos - Costos)</span>
                </div>
                <p className={`text-5xl font-bold mt-1 ${totalFarmNetProfit >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                    {totalFarmNetProfit >= 0 ? '+' : ''}${totalFarmNetProfit.toFixed(2)}
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KpiCard title="Costo / Litro de Leche" value={`$${averageCostPerLiter.toFixed(3)}`} icon={Droplets} />
                <KpiCard title="Precio Leche (Asumido)" value={`$${assumedMilkPrice.toFixed(2)}`} unit="/Kg" icon={TrendingUp} />
            </div>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4"><BarChart4 size={20}/> Distribución de Rentabilidad</h3>
                <div className="w-full h-56">
                    <ResponsiveContainer>
                        <BarChart data={animalsByProfitability} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
                            <XAxis dataKey="animalId" tick={false} axisLine={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
                            <Bar dataKey="netProfit">
                                {animalsByProfitability.map((entry: AnimalProfitability) => (
                                    <Cell key={entry.animalId} fill={entry.netProfit >= 0 ? '#34C759' : '#FF3B30'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-xl font-semibold text-zinc-300">Ranking de Rentabilidad</h3>
                <div className="space-y-2">
                    <h4 className="font-semibold text-brand-green flex items-center gap-2"><ArrowUp size={18}/> Top 5 Animales Más Rentables</h4>
                    {top5Profitable.map((animalData: AnimalProfitability) => (
                        <AnimalProfitabilityRow key={animalData.animalId} animalData={animalData} />
                    ))}
                </div>
                <div className="space-y-2 pt-4">
                    <h4 className="font-semibold text-brand-red flex items-center gap-2"><ArrowDown size={18}/> Top 5 Animales Menos Rentables</h4>
                    {bottom5Profitable.map((animalData: AnimalProfitability) => (
                        <AnimalProfitabilityRow key={animalData.animalId} animalData={animalData} />
                    ))}
                </div>
            </div>
        </div>
    );
}