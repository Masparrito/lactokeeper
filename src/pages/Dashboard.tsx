// src/pages/Dashboard.tsx

import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, ReferenceLine, Tooltip, CartesianGrid } from 'recharts';
import { useData } from '../context/DataContext';
import { calculateDEL } from '../utils/calculations';
import { DropletIcon, ActivitySquare, BarChartIcon, Info } from 'lucide-react';
import { CustomTooltip } from '../components/ui/CustomTooltip';
import { Modal } from '../components/ui/Modal';

interface DashboardProps {
  onNavigateToAnimals: (view: 'all' | 'milking') => void;
}

export default function Dashboard({ onNavigateToAnimals }: DashboardProps) {
  const { animals, weighings, parturitions, isLoading } = useData();
  const [chartView, setChartView] = useState<'current' | 'historical'>('current');
  const [isChartInfoModalOpen, setIsChartInfoModalOpen] = useState(false);
  const [isGaussInfoModalOpen, setIsGaussInfoModalOpen] = useState(false);

  const analytics = useMemo(() => {
    if (isLoading || !weighings.length || !animals.length) {
      return { 
        herdAverage: 0, activeGoats: 0, herdLactationCurve: [],
        gaussData: { distribution: [], mean: 0, stdDev: 0 }
      };
    }
    
    let weighingsForChart = weighings;
    if (chartView === 'current') {
        const milkingAnimalIds = new Set(
            parturitions
                .filter(p => p.status === 'activa')
                .map(p => p.goatId)
        );
        weighingsForChart = weighings.filter(w => milkingAnimalIds.has(w.goatId));
    }
    
    const herdCurveData: { [key: number]: { totalKg: number, count: number } } = {};
    weighingsForChart.forEach(w => {
        const parturitionForWeighing = parturitions
            .filter(p => p.goatId === w.goatId && new Date(w.date) >= new Date(p.parturitionDate))
            .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];

        if (!parturitionForWeighing) return;
        
        const del = calculateDEL(parturitionForWeighing.parturitionDate, w.date);
        if (!herdCurveData[del]) herdCurveData[del] = { totalKg: 0, count: 0 };
        herdCurveData[del].totalKg += w.kg;
        herdCurveData[del].count++;
    });

    const herdLactationCurve = Object.entries(herdCurveData)
        .map(([del, data]) => ({ del: parseInt(del), kg: data.totalKg / data.count, name: "Promedio Rebaño" }))
        .sort((a, b) => a.del - b.del);

    const animalAverages = animals.map(animal => {
        const animalWeighings = weighings.filter(w => w.goatId === animal.id);
        if (animalWeighings.length === 0) return null;
        const totalKg = animalWeighings.reduce((sum, w) => sum + w.kg, 0);
        return { avg: totalKg / animalWeighings.length };
    }).filter(Boolean) as { avg: number; }[];
    
    const mean = animalAverages.length > 0 ? animalAverages.reduce((sum, g) => sum + g.avg, 0) / animalAverages.length : 0;
    const stdDev = animalAverages.length > 0 ? Math.sqrt(animalAverages.reduce((sum, g) => sum + Math.pow(g.avg - mean, 2), 0) / animalAverages.length) : 0;
    
    const distribution = [];
    if(animalAverages.length > 0){
        const minProd = Math.floor(Math.min(...animalAverages.map(g => g.avg)) * 4) / 4;
        const maxProd = Math.ceil(Math.max(...animalAverages.map(g => g.avg)) * 4) / 4;
        for (let i = minProd; i <= maxProd; i += 0.25) {
            const rangeStart = i; const rangeEnd = i + 0.25;
            const count = animalAverages.filter(g => g.avg >= rangeStart && g.avg < rangeEnd).length;
            if (count > 0) {
              distribution.push({ range: `${rangeStart.toFixed(2)}`, count });
            }
        }
    }
    const gaussData = { distribution, mean, stdDev };
    const totalAverage = weighings.length > 0 ? weighings.reduce((sum,w) => sum + w.kg, 0) / weighings.length : 0;
    
    return { herdAverage: totalAverage, activeGoats: animals.length, herdLactationCurve, gaussData };
  }, [animals, weighings, parturitions, isLoading, chartView]);

  if (isLoading) {
    return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando datos del rebaño...</h1></div>;
  }

  return (
    <>
      <div className="w-full max-w-2xl mx-auto space-y-4">
        <header className="text-center pt-8 pb-4">
          <h1 className="text-4xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-xl text-zinc-400">Rebaño Masparrito</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
              <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-2 text-xs uppercase tracking-wider"><DropletIcon /><span>Promedio Global</span></div>
              <p className="text-4xl font-bold tracking-tight text-white">{analytics.herdAverage.toFixed(2)} <span className="text-2xl font-medium text-zinc-400">Kg</span></p>
            </div>
             <button 
               onClick={() => onNavigateToAnimals('milking')}
               className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border text-left hover:border-brand-amber transition-colors"
             >
              <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-2 text-xs uppercase tracking-wider"><ActivitySquare /><span>Animales Activos</span></div>
              <p className="text-4xl font-bold tracking-tight text-white">{analytics.activeGoats}</p>
            </button>
        </div>

        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
          <div className="flex justify-between items-center border-b border-brand-border pb-2 mb-4">
              <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M20 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 20v4"/><path d="m7.8 16.2-2.9 2.9"/><path d="M4 12H0"/><path d="m7.8 7.8-2.9-2.9"/><circle cx="12" cy="12" r="4"/></svg>
                  <span>Producción Promedio</span>
                  <button onClick={() => setIsChartInfoModalOpen(true)} className="text-zinc-500 hover:text-white transition-colors">
                      <Info size={14}/>
                  </button>
              </div>
              <div className="flex bg-zinc-900/80 rounded-lg p-0.5">
                  <button onClick={() => setChartView('current')} className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${chartView === 'current' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}>
                      Actual
                  </button>
                  <button onClick={() => setChartView('historical')} className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${chartView === 'historical' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}>
                      Histórico
                  </button>
              </div>
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

        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
            <div className="flex justify-between items-center border-b border-brand-border pb-2 mb-4">
                <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase tracking-wider">
                    <BarChartIcon />
                    <span>Distribución del Rebaño</span>
                    <button onClick={() => setIsGaussInfoModalOpen(true)} className="text-zinc-500 hover:text-white transition-colors">
                        <Info size={14}/>
                    </button>
                </div>
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

      <Modal 
        isOpen={isChartInfoModalOpen} 
        onClose={() => setIsChartInfoModalOpen(false)} 
        title="¿Qué Muestra este Gráfico?"
      >
        <div className="text-zinc-300 space-y-4 text-base">
            <p>
                Este gráfico representa la **curva de lactancia promedio** de tu rebaño, mostrando el rendimiento general a lo largo del ciclo productivo.
            </p>
            <div>
                <h4 className="font-semibold text-white mb-1">Eje X (Horizontal): Días en Leche (DEL)</h4>
                <p className="text-sm">
                    Muestra un punto específico en el ciclo de lactancia de un animal, contando los días desde su último parto. No representa fechas del calendario.
                </p>
            </div>
            <div>
                <h4 className="font-semibold text-white mb-1">Eje Y (Vertical): Producción Promedio (Kg)</h4>
                <p className="text-sm">
                    Para cada "Día en Leche", el gráfico calcula el promedio de **todos los pesajes** registrados a todos los animales cuando estaban en ese exacto día de su ciclo.
                </p>
            </div>
            <p className="pt-2 border-t border-zinc-700/80">
                Te permite responder visualmente a preguntas clave como: ¿Cuándo ocurre el pico de producción del rebaño? y ¿Qué tan persistente es la lactancia después del pico?
            </p>
        </div>
      </Modal>

      <Modal 
        isOpen={isGaussInfoModalOpen} 
        onClose={() => setIsGaussInfoModalOpen(false)} 
        title="¿Qué es la Distribución del Rebaño?"
      >
        <div className="text-zinc-300 space-y-4 text-base">
            <p>
                Este gráfico, conocido como Campana de Gauss o distribución normal, clasifica el rendimiento promedio de cada animal en el rebaño.
            </p>
            <div>
                <h4 className="font-semibold text-white mb-1">Media (μ)</h4>
                <p className="text-sm">
                    La línea verde marcada como **μ** representa el **promedio de producción de todo el rebaño**. Es el punto de referencia central.
                </p>
            </div>
            <div>
                <h4 className="font-semibold text-white mb-1">Las Barras</h4>
                <p className="text-sm">
                    Cada barra muestra cuántos animales caen dentro de un rango específico de producción. Una barra alta en el centro (cerca de μ) indica que la mayoría de tu rebaño tiene un rendimiento promedio y consistente.
                </p>
            </div>
            <p className="pt-2 border-t border-zinc-700/80">
                Esta herramienta es clave para identificar rápidamente a los animales de élite (extremo derecho) y a los que podrían necesitar atención (extremo izquierdo).
            </p>
        </div>
      </Modal>
    </>
  );
}