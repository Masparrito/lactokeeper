// src/pages/Dashboard.tsx

import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, ReferenceLine, Tooltip, CartesianGrid } from 'recharts';
import { useData } from '../context/DataContext';
import { calculateDEL } from '../utils/calculations';
import { DropletIcon, GoatIcon, BarChartIcon } from '../components/ui/Icons';
import { CustomTooltip } from '../components/ui/CustomTooltip'; // IMPORTACIÓN CORREGIDA

// --- Props del Componente ---
// Definimos las props que el componente va a recibir.
interface DashboardProps {
  onSelectAnimal: (animalId: string) => void;
}

// --- Página del Dashboard (Nombre corregido y props añadidas) ---
export default function Dashboard({ onSelectAnimal }: DashboardProps) {
  const { goats, weighings, births, isLoading } = useData();

  const analytics = useMemo(() => {
    if (isLoading || !weighings.length || !goats.length) {
      return { 
        herdAverage: 0, activeGoats: 0, herdLactationCurve: [],
        gaussData: { distribution: [], mean: 0, stdDev: 0 }
      };
    }
    
    // --- Cálculos de Métricas y Curva (Optimizados) ---
    const totalProduction = weighings.reduce((sum, w) => sum + w.kg, 0);
    const herdAverage = totalProduction > 0 ? totalProduction / weighings.length : 0;
    const herdCurveData: { [key: number]: { totalKg: number, count: number } } = {};
    weighings.forEach(w => {
        const goatBirths = births.filter(b => b.goatId === w.goatId).sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime());
        if (!goatBirths.length) return;
        const latestBirth = goatBirths[0].parturitionDate;
        const del = calculateDEL(latestBirth, w.date);
        if (!herdCurveData[del]) herdCurveData[del] = { totalKg: 0, count: 0 };
        herdCurveData[del].totalKg += w.kg;
        herdCurveData[del].count++;
    });
    const herdLactationCurve = Object.entries(herdCurveData)
        .map(([del, data]) => ({ del: parseInt(del), kg: data.totalKg / data.count, name: "Promedio Rebaño" }))
        .sort((a, b) => a.del - b.del);

    // --- Cálculo para Campana de Gauss ---
    const goatAverages = goats.map(goat => {
        const goatWeighings = weighings.filter(w => w.goatId === goat.id);
        if (goatWeighings.length === 0) return null;
        const totalKg = goatWeighings.reduce((sum, w) => sum + w.kg, 0);
        return { avg: totalKg / goatWeighings.length };
    }).filter(Boolean) as { avg: number; }[];
    
    const mean = goatAverages.length > 0 ? goatAverages.reduce((sum, g) => sum + g.avg, 0) / goatAverages.length : 0;
    const stdDev = goatAverages.length > 0 ? Math.sqrt(goatAverages.reduce((sum, g) => sum + Math.pow(g.avg - mean, 2), 0) / goatAverages.length) : 0;
    const distribution = [];
    if(goatAverages.length > 0){
        const minProd = Math.floor(Math.min(...goatAverages.map(g => g.avg)) * 4) / 4;
        const maxProd = Math.ceil(Math.max(...goatAverages.map(g => g.avg)) * 4) / 4;
        for (let i = minProd; i <= maxProd; i += 0.25) {
            const rangeStart = i; const rangeEnd = i + 0.25;
            const count = goatAverages.filter(g => g.avg >= rangeStart && g.avg < rangeEnd).length;
            if (count > 0) {
              distribution.push({ range: `${rangeStart.toFixed(2)}`, count });
            }
        }
    }
    const gaussData = { distribution, mean, stdDev };
    
    return { herdAverage, activeGoats: goats.length, herdLactationCurve, gaussData };
  }, [goats, weighings, births, isLoading]);

  if (isLoading) {
    return <div className="text-center p-10"><h1 className="text-2xl text-brand-light-gray">Cargando datos del rebaño...</h1></div>;
  }

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <header className="text-center pt-8 pb-4">
        <h1 className="text-4xl font-bold tracking-tight text-white">Dashboard</h1>
        <p className="text-xl text-brand-medium-gray">Rebaño Masparrito</p>
      </header>

      {/* Tarjetas de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
            <div className="flex items-center space-x-2 text-brand-medium-gray font-semibold mb-2 text-xs uppercase tracking-wider"><DropletIcon /><span>Promedio</span></div>
            <p className="text-4xl font-bold tracking-tight text-white">{analytics.herdAverage.toFixed(2)} <span className="text-2xl font-medium text-brand-medium-gray">Kg</span></p>
          </div>
          {/* CAMBIO: Se envuelve en un botón y se añade el onClick */}
           <button 
             onClick={() => onSelectAnimal('R063')} // Navegación temporal al perfil de R063
             className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border text-left hover:border-brand-amber transition-colors"
           >
            <div className="flex items-center space-x-2 text-brand-medium-gray font-semibold mb-2 text-xs uppercase tracking-wider"><GoatIcon /><span>Animales</span></div>
            <p className="text-4xl font-bold tracking-tight text-white">{analytics.activeGoats}</p>
          </button>
      </div>

      {/* Gráfico de Curva de Lactancia */}
      <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
        <div className="flex items-center space-x-2 text-brand-medium-gray font-semibold border-b border-brand-border pb-2 mb-4 text-xs uppercase tracking-wider">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M20 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 20v4"/><path d="m7.8 16.2-2.9 2.9"/><path d="M4 12H0"/><path d="m7.8 7.8-2.9-2.9"/><circle cx="12" cy="12" r="4"/></svg>
          <span>Producción Promedio</span>
        </div>
        <div className="w-full h-48 -ml-4">
          <ResponsiveContainer><AreaChart data={analytics.herdLactationCurve}>
              <defs><linearGradient id="weatherGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F59E0B" stopOpacity={0.7}/><stop offset="60%" stopColor="#10B981" stopOpacity={0.2}/><stop offset="100%" stopColor="#3B82F6" stopOpacity={0.1}/></linearGradient></defs>
              <XAxis dataKey="del" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} stroke="rgba(255,255,255,0.3)" tickLine={false} axisLine={false} />
              <YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} stroke="rgba(255,255,255,0.3)" tickLine={false} axisLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']}/>
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="kg" stroke="#FBBF24" strokeWidth={2.5} fill="url(#weatherGradient)" />
          </AreaChart></ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico de Campana de Gauss */}
      <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
        <div className="flex items-center space-x-2 text-brand-medium-gray font-semibold border-b border-brand-border pb-2 mb-4 text-xs uppercase tracking-wider">
            <BarChartIcon /><span>Distribución del Rebaño</span>
        </div>
        <div className="w-full h-48 -ml-4">
            <ResponsiveContainer>
                <BarChart data={analytics.gaussData.distribution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                    <XAxis dataKey="range" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} stroke="rgba(255,255,255,0.3)" tickLine={false} axisLine={false} />
                    <YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} stroke="rgba(255,255,255,0.3)" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                    <Bar dataKey="count" fill="rgba(255, 255, 255, 0.4)" name="Nº de Cabras" />
                    <ReferenceLine x={analytics.gaussData.mean.toFixed(2)} stroke="#34d399" strokeWidth={2} label={{ value: `μ`, fill: '#34d399', position: 'insideTopLeft' }} />
                </BarChart>
            </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}