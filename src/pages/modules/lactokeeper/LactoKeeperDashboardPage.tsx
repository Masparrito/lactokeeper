// src/pages/modules/lactokeeper/LactoKeeperDashboardPage.tsx (CORREGIDO - Flujo de importación ELIMINADO)

import { useState, useMemo } from 'react'; // (CORREGIDO) React sí se usa
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, BarChart, Bar, ReferenceLine, Tooltip, CartesianGrid } from 'recharts';
import { useData } from '../../../context/DataContext';
import { calculateDEL } from '../../../utils/calculations';
// (CORREGIDO) Eliminados Plus, Camera, FilePen
import { Droplet, ActivitySquare, BarChart as BarChartIconLucide, Info } from 'lucide-react';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
import { Modal } from '../../../components/ui/Modal';
// (CORREGIDO) Eliminadas importaciones de flujo
import { Weighing } from '../../../db/local';

interface LactoKeeperDashboardProps {
  onNavigateToAnalysis: () => void;
}

export default function LactoKeeperDashboardPage({ onNavigateToAnalysis }: LactoKeeperDashboardProps) {
  const { animals, weighings, parturitions, isLoading } = useData();
  const [chartView, setChartView] = useState<'current' | 'historical'>('current');
  const [isChartInfoModalOpen, setIsChartInfoModalOpen] = useState(false);
  const [isGaussInfoModalOpen, setIsGaussInfoModalOpen] = useState(false);

  // --- (CORREGIDO) Estados del flujo de importación ELIMINADOS ---

  const analytics = useMemo(() => {
    // ... (Lógica de 'analytics' sin cambios) ...
    if (isLoading || !weighings.length || !animals.length) {
      return {  
        herdAverage: 0, activeGoats: 0, herdLactationCurve: [],
        gaussData: { distribution: [], mean: 0, stdDev: 0 }
      };
    }
    let animalsInLastWeighing = 0;
    if (weighings.length > 0) {
        const latestDate = weighings.reduce((max, w) => w.date > max ? w.date : max, weighings[0].date);
        animalsInLastWeighing = new Set(weighings.filter(w => w.date === latestDate).map(w => w.goatId)).size;
    }
    let weighingsForChart = weighings;
    if (chartView === 'current') {
        const milkingAnimalIds = new Set(
            parturitions.filter(p => p.status === 'activa').map(p => p.goatId)
        );
        weighingsForChart = weighings.filter((w: Weighing) => milkingAnimalIds.has(w.goatId));
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
    return { herdAverage: totalAverage, activeGoats: animalsInLastWeighing, herdLactationCurve, gaussData };
  }, [animals, weighings, parturitions, isLoading, chartView]);

  // --- (CORREGIDO) Handlers del flujo de importación ELIMINADOS ---

  if (isLoading) {
    return <div className="text-center p-10"><h1 className="text-2xl text-c-text-muted">Cargando datos del rebaño...</h1></div>;
  }

  return (
    <>
        {/* --- (CORREGIDO) Botón Flotante ELIMINADO --- */}

        {/* (CORREGIDO) Padding inferior 'pb-24' ELIMINADO */}
        <div className="w-full max-w-2xl mx-auto space-y-4 px-4"> 
            <header className="text-center pt-4 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-c-text">Dashboard de Producción</h1>
                <p className="text-md text-c-text-muted">Análisis General de LactoKeeper</p>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-c-surface rounded-2xl p-4 border border-c-border shadow-sm">
                    <div className="flex items-center space-x-2 text-c-text-muted font-semibold mb-2 text-xs uppercase tracking-wider">
                        <Droplet size={14} className="text-c-accent-sky" />
                        <span>Promedio Global</span>
                    </div>
                    <p className="text-4xl font-bold tracking-tight text-c-accent-gold">{analytics.herdAverage.toFixed(2)} <span className="text-2xl font-medium text-c-text-faint">Kg</span></p>
                </div>
                 <button
                   onClick={onNavigateToAnalysis}
                   className="bg-c-surface rounded-2xl p-4 border border-c-border shadow-sm text-left hover:border-c-accent-sky transition-colors active:scale-[0.99]"
                 >
                    <div className="flex items-center space-x-2 text-c-text-muted font-semibold mb-2 text-xs uppercase tracking-wider"><ActivitySquare size={14} className="text-c-accent-sky" /><span>Animales en Ordeño</span></div>
                    <p className="text-4xl font-bold tracking-tight text-c-text">{analytics.activeGoats}</p>
                </button>
            </div>

            {/* ... (Resto de los gráficos de Curva de Lactancia y Distribución SIN CAMBIOS) ... */}
            <div className="bg-c-surface rounded-2xl p-4 border border-c-border shadow-sm">
                <div className="flex justify-between items-center border-b border-c-border pb-2 mb-4">
                    <div className="flex items-center space-x-2 text-c-text-muted font-semibold text-xs uppercase tracking-wider">
                        <BarChartIconLucide size={16}/>
                        <span>Curva de Lactancia</span>
                        <button onClick={() => setIsChartInfoModalOpen(true)} className="text-c-text-faint hover:text-c-text transition-colors">
                            <Info size={14}/>
                        </button>
                    </div>
                    <div className="flex bg-c-surface-2 rounded-lg p-0.5">
                        <button onClick={() => setChartView('current')} className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${chartView === 'current' ? 'bg-c-accent-sky text-white shadow-sm' : 'text-c-text-muted hover:text-c-text'}`}>
                            Actual
                        </button>
                        <button onClick={() => setChartView('historical')} className={`px-2 py-0.5 text-xs font-semibold rounded-md transition-colors ${chartView === 'historical' ? 'bg-c-accent-sky text-white shadow-sm' : 'text-c-text-muted hover:text-c-text'}`}>
                            Histórico
                        </button>
                    </div>
                </div>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <AreaChart data={analytics.herdLactationCurve} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                            <defs><linearGradient id="lactationGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1E6FAD" stopOpacity={0.45}/><stop offset="85%" stopColor="#1E6FAD" stopOpacity={0.04}/></linearGradient></defs>
                            <XAxis dataKey="del" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" tickLine={false} axisLine={false} />
                            <YAxis orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" tickLine={false} axisLine={false} domain={['dataMin - 0.5', 'dataMax + 0.5']} width={30} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="kg" stroke="#1E6FAD" strokeWidth={2.5} fill="url(#lactationGradient)" />
                    </AreaChart></ResponsiveContainer>
                </div>
            </div>
            <div className="bg-c-surface rounded-2xl p-4 border border-c-border shadow-sm">
                <div className="flex justify-between items-center border-b border-c-border pb-2 mb-4">
                    <div className="flex items-center space-x-2 text-c-text-muted font-semibold text-xs uppercase tracking-wider">
                        <BarChartIconLucide size={16}/>
                        <span>Distribución del Rebaño</span>
                        <button onClick={() => setIsGaussInfoModalOpen(true)} className="text-c-text-faint hover:text-c-text transition-colors">
                            <Info size={14}/>
                        </button>
                    </div>
                </div>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={analytics.gaussData.distribution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="range" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" tickLine={false} axisLine={false} />
                            <YAxis orientation="right" tick={{ fill: '#64748b', fontSize: 12 }} stroke="#cbd5e1" tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(30, 111, 173, 0.06)'}} />
                            <Bar dataKey="count" fill="rgba(30, 111, 173, 0.45)" name="Nº de Cabras" radius={[4, 4, 0, 0]} />
                            <ReferenceLine x={analytics.gaussData.mean.toFixed(2)} stroke="#2F843C" strokeWidth={2} label={{ value: `μ`, fill: '#2F843C', position: 'insideTopLeft' }} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* --- (CORREGIDO) Flujo de Modales de Importación ELIMINADO --- */}

        {/* ... (Modales de Info de Gráficos SIN CAMBIOS) ... */}
        <Modal    
            isOpen={isChartInfoModalOpen}    
            onClose={() => setIsChartInfoModalOpen(false)}    
            title="¿Qué es la Curva de Lactancia del Rebaño?"
        >
            <div className="text-c-text-muted space-y-4 text-base">
                <p>Este gráfico revela la **"personalidad productiva"** de tu rebaño. No es un promedio simple, sino una línea de tiempo del rendimiento promedio.</p>
                <div>
                    <h4 className="font-semibold text-c-text mb-1">¿Cómo se Calcula?</h4>
                    <p className="text-sm">Para cada "Día en Leche" (DEL) en el eje horizontal, el sistema agrupa los pesajes de **todos los animales** que han pasado por ese día de su ciclo y calcula el promedio.</p>
                    <p className="text-sm mt-2 bg-c-surface-2 p-2 rounded-md"><strong>Ejemplo:</strong> El punto en "DEL 50" es el promedio de todos los pesajes que se hicieron a cualquier animal cuando estaba exactamente en su día 50 de lactancia.</p>
                </div>
                <p className="pt-2 border-t border-c-border">Te permite responder visualmente a preguntas clave como: ¿Cuándo ocurre el pico de producción del rebaño? y ¿Qué tan persistente es la lactancia después del pico?</p>
            </div>
        </Modal>

        <Modal    
            isOpen={isGaussInfoModalOpen}    
            onClose={() => setIsGaussInfoModalOpen(false)}    
            title="¿Qué es la Distribución del Rebaño?"
        >
            <div className="text-c-text-muted space-y-4 text-base">
                <p>Este gráfico, conocido como Campana de Gauss o distribución normal, clasifica el rendimiento promedio de cada animal en el rebaño.</p>
                <div>
                    <h4 className="font-semibold text-c-text mb-1">Media (μ)</h4>
                    <p className="text-sm">La línea verde marcada como **μ** representa el **promedio de producción de todo el rebaño**. Es el punto de referencia central.</p>
                </div>
                <div>
                    <h4 className="font-semibold text-c-text mb-1">Las Barras</h4>
                    <p className="text-sm">Cada barra muestra cuántos animales caen dentro de un rango específico de producción. Una barra alta en el centro (cerca de μ) indica que la mayoría de tu rebaño tiene un rendimiento promedio y consistente.</p>
                </div>
                <p className="pt-2 border-t border-c-border">Esta herramienta es clave para identificar rápidamente a los animales de élite (extremo derecho) y a los que podrían necesitar atención (extremo izquierdo).</p>
            </div>
        </Modal>
    </>
  );
}