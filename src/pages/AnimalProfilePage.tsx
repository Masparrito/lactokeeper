import { useState, useMemo } from 'react';
import { XAxis, YAxis, ResponsiveContainer, Tooltip, BarChart, Bar, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { useAnimalData } from '../hooks/useAnimalData';
import { useComparativeData, ComparisonType } from '../hooks/useComparativeData';
import { ArrowLeft, Droplet, TrendingUp, CalendarDays, Repeat, CalendarCheck2, Wind, Archive } from 'lucide-react';
import { CustomTooltip } from '../components/ui/CustomTooltip';
import { Modal } from '../components/ui/Modal';
import { useData } from '../context/DataContext';
import { calculateDEL } from '../utils/calculations'; // Importación necesaria

// --- Tooltip Inteligente para los Gráficos de los Modales ---
const ModalChartTooltip = ({ active, payload, label, context }: { active?: boolean, payload?: any[], label?: string, context: 'peak' | 'del' | 'interval' | 'average' }) => {
    if (active && payload && payload.length) {
        let title = '';
        let valueText = '';
        switch (context) {
            case 'average': title = `Lactancia del ${label}`; valueText = `Promedio: ${payload[0].value.toFixed(2)} Kg`; break;
            case 'peak': title = `Lactancia del ${label}`; valueText = `Pico: ${payload[0].value.toFixed(2)} Kg`; break;
            case 'del': title = `Lactancia del ${label}`; valueText = `Duración: ${payload[0].value} días`; break;
            case 'interval': title = `Período ${label}`; valueText = `Intervalo: ${payload[0].value} días`; break;
        }
        return (
            <div className="bg-black/60 backdrop-blur-xl p-3 rounded-lg border border-zinc-700 text-white">
                <p className="label text-zinc-400 text-sm font-medium">{title}</p>
                <p className="font-semibold text-base">{valueText}</p>
            </div>
        );
    }
    return null;
};

interface AnimalProfilePageProps {
  animalId: string;
  onBack: () => void;
}

export default function AnimalProfilePage({ animalId, onBack }: AnimalProfilePageProps) {
  const { animals, parturitions, weighings, startDryingProcess, setLactationAsDry } = useData();
  const { allLactations, parturitionIntervals, lastWeighingDate, isLoading } = useAnimalData(animalId);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [activeComparison, setActiveComparison] = useState<ComparisonType | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  
  const { comparativeCurve, isLoading: isComparativeLoading } = useComparativeData(
    activeComparison, animals, parturitions, weighings
  );

  const currentLactationData = useMemo(() => {
    if (allLactations.length === 0) return null;
    const lastLactationCycle = allLactations[allLactations.length - 1];
    const correspondingParturition = parturitions.find(p => p.parturitionDate === lastLactationCycle.parturitionDate && p.goatId === animalId);
    // CORRECCIÓN: Incluimos el firestoreId en nuestro objeto de datos
    return { ...lastLactationCycle, id: correspondingParturition?.id, firestoreId: correspondingParturition?.firestoreId, status: correspondingParturition?.status };
  }, [allLactations, parturitions, animalId]);

  // --- CORRECCIÓN: Lógica para el DEL en tiempo real ---
  const currentDEL = useMemo(() => {
    if (!currentLactationData) return 'N/A';
    // Se calcula desde la fecha del parto hasta la fecha actual.
    return calculateDEL(currentLactationData.parturitionDate, new Date().toISOString().split('T')[0]);
  }, [currentLactationData]);

  const chartData = useMemo(() => ({
    average: allLactations.map(l => ({ name: new Date(l.parturitionDate).getFullYear().toString(), value: l.averageProduction })),
    peak: allLactations.map(l => ({ name: new Date(l.parturitionDate).getFullYear().toString(), value: l.peakProduction.kg })),
    del: allLactations.map(l => ({ name: new Date(l.parturitionDate).getFullYear().toString(), value: l.totalDays })),
    interval: parturitionIntervals.map(i => ({ name: i.period, value: i.days }))
  }), [allLactations, parturitionIntervals]);

  if (isLoading) {
    return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando perfil de {animalId}...</h1></div>;
  }
  
  const currentLactation = allLactations.length > 0 ? allLactations[allLactations.length - 1] : null;
  const latestInterval = parturitionIntervals.length > 0 ? parturitionIntervals[parturitionIntervals.length - 1].days : 0;
  const isCurrentAnimalPrimipara = allLactations.length === 1;

  const handleCompareToggle = () => {
    const newIsComparing = !isComparing;
    setIsComparing(newIsComparing);
    if (!newIsComparing) {
      setActiveComparison(null);
    }
  };

  const handleComparisonSelect = (type: ComparisonType) => {
    setActiveComparison(prev => (prev === type ? null : type));
  };

  return (
    <>
      <div className="w-full max-w-4xl mx-auto space-y-4 animate-fade-in">
        <header className="flex items-center pt-8 pb-4">
          <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
          <div className="text-center flex-grow">
            <h1 className="text-4xl font-bold tracking-tight text-white">{animalId}</h1>
            <p className="text-xl text-zinc-400">Perfil de Lactancia</p>
          </div>
          <div className="w-8"></div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <button onClick={() => setActiveModal('average')} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left hover:border-brand-amber transition-colors">
              <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><Droplet size={14} /><span>Promedio</span></div>
              <p className="text-2xl font-bold text-white">{currentLactation?.averageProduction.toFixed(2) || 'N/A'} <span className="text-lg text-zinc-400">Kg</span></p>
            </button>
            <button onClick={() => setActiveModal('peak')} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left hover:border-brand-amber transition-colors">
              <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><TrendingUp size={14} /><span>Pico Prod.</span></div>
              <p className="text-2xl font-bold text-white">{currentLactation?.peakProduction.kg.toFixed(2) || 'N/A'} <span className="text-lg text-zinc-400">Kg</span></p>
            </button>
            <button onClick={() => setActiveModal('del')} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left hover:border-brand-amber transition-colors">
              <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><CalendarDays size={14} /><span>DEL</span></div>
              <p className="text-2xl font-bold text-white">{currentDEL}</p>
            </button>
             <button onClick={() => setActiveModal('interval')} className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left hover:border-brand-amber transition-colors">
              <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><Repeat size={14} /><span>Int. Partos</span></div>
              <p className="text-2xl font-bold text-white">{latestInterval} <span className="text-lg text-zinc-400">días</span></p>
            </button>
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-left">
              <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-1 text-xs uppercase"><CalendarCheck2 size={14} /><span>Últ. Pesaje</span></div>
              <p className="text-xl font-bold text-white">{lastWeighingDate ? new Date(lastWeighingDate).toLocaleDateString() : 'N/A'}</p>
            </div>
        </div>

        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border relative">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center border-b border-brand-border pb-2 mb-4 gap-2">
              <h3 className="text-zinc-400 font-semibold text-xs uppercase">Curva de Lactancia Actual (Parto: {currentLactation?.parturitionDate || 'N/A'})</h3>
              <div className="flex items-center space-x-2 self-end sm:self-center">
                  <span className="text-xs font-semibold text-zinc-300">Comparar:</span>
                  <button onClick={handleCompareToggle} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isComparing ? 'bg-amber-500' : 'bg-zinc-700'}`}>
                      <span aria-hidden="true" className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isComparing ? 'translate-x-5' : 'translate-x-0'}`}/>
                  </button>
                  {isComparing && (
                      <div className="flex items-center space-x-2 animate-fade-in">
                          <button onClick={() => handleComparisonSelect('PRIMIPARAS_HISTORICAL')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeComparison === 'PRIMIPARAS_HISTORICAL' ? 'bg-amber-500 text-black font-semibold' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50'} ${isCurrentAnimalPrimipara ? 'ring-2 ring-amber-400' : ''}`}>vs Primíparas</button>
                          <button onClick={() => handleComparisonSelect('MULTIPARAS_HISTORICAL')} className={`px-2 py-1 text-xs rounded-md transition-colors ${activeComparison === 'MULTIPARAS_HISTORICAL' ? 'bg-amber-500 text-black font-semibold' : 'bg-zinc-700/50 text-zinc-300 hover:bg-zinc-600/50'} ${!isCurrentAnimalPrimipara ? 'ring-2 ring-amber-400' : ''}`}>vs Multíparas</button>
                      </div>
                  )}
              </div>
          </div>
          <div className="w-full h-56 -ml-4">
            <ResponsiveContainer>
              <LineChart margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="del" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                  <YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} iconType="plainline"/>
                  <Line type="monotone" data={currentLactation?.lactationCurve} dataKey="kg" name={animalId} stroke="#FBBF24" strokeWidth={2.5} dot={false} />
                  {activeComparison && !isComparativeLoading && (<Line type="monotone" data={comparativeCurve} dataKey="kg" name="Promedio del Grupo" stroke="#34d399" strokeWidth={2} strokeDasharray="5 5" dot={false} />)}
              </LineChart>
            </ResponsiveContainer>
            {isComparativeLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-xl text-white">Calculando comparación...</div>}
          </div>
        </div>

        {/* --- SECCIÓN DE GESTIÓN DE LACTANCIA CORREGIDA --- */}
        {currentLactationData?.firestoreId && (
          <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
            <h3 className="text-zinc-400 font-semibold text-xs uppercase mb-3">Gestión de Lactancia Actual</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              {/* CORRECCIÓN: Usamos currentLactationData.firestoreId */}
              {currentLactationData.status === 'activa' && (<button onClick={() => startDryingProcess(currentLactationData.firestoreId!)} className="w-full flex items-center justify-center space-x-2 bg-blue-600/80 hover:bg-blue-500/80 text-white font-semibold py-3 px-4 rounded-xl transition-colors"><Wind size={20} /><span>Iniciar Proceso de Secado</span></button>)}
              {/* CORRECCIÓN: Usamos currentLactationData.firestoreId */}
              {currentLactationData.status === 'en-secado' && (<button onClick={() => setLactationAsDry(currentLactationData.firestoreId!)} className="w-full flex items-center justify-center space-x-2 bg-gray-600/80 hover:bg-gray-500/80 text-white font-semibold py-3 px-4 rounded-xl transition-colors"><Archive size={20} /><span>Declarar Lactancia como Seca</span></button>)}
              {currentLactationData.status === 'seca' && (<div className="w-full text-center p-3 bg-black/20 rounded-xl"><p className="font-semibold text-green-400">Esta lactancia ha finalizado.</p></div>)}
            </div>
            {currentLactationData.status === 'en-secado' && (<p className="text-center text-xs text-zinc-400 mt-2">El animal está en su período de secado.</p>)}
          </div>
        )}
      </div>
      
      <Modal isOpen={activeModal === 'average'} onClose={() => setActiveModal(null)} title="Historial de Promedios">
        <div className="space-y-6">
            <div className="w-full h-48 -ml-4"><ResponsiveContainer><BarChart data={chartData.average} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                <defs><linearGradient id="modalBarGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FBBF24" stopOpacity={0.8}/><stop offset="100%" stopColor="#FBBF24" stopOpacity={0.2}/></linearGradient></defs>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="transparent" tickLine={false} /><YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="transparent" tickLine={false} width={40} /><Tooltip content={<ModalChartTooltip context="average" />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} /><Bar dataKey="value" radius={[4, 4, 0, 0]} fill="url(#modalBarGradient)" /></BarChart></ResponsiveContainer></div>
            <div><h4 className="text-sm font-semibold text-zinc-400 mb-2">Detalles por Lactancia</h4><ul className="space-y-1">{allLactations.slice().reverse().map(lact => (<li key={lact.parturitionDate} className="flex justify-between items-center p-2 rounded-md hover:bg-white/5"><span className="text-base font-medium text-zinc-200">Parto del {lact.parturitionDate}</span><span className="text-base font-semibold text-white">{lact.averageProduction.toFixed(2)} Kg</span></li>))}</ul></div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'peak'} onClose={() => setActiveModal(null)} title="Historial de Picos de Producción">
        <div className="space-y-6">
            <div className="w-full h-48 -ml-4"><ResponsiveContainer><BarChart data={chartData.peak} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                <defs><linearGradient id="modalBarGradientPeak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10B981" stopOpacity={0.8}/><stop offset="100%" stopColor="#10B981" stopOpacity={0.2}/></linearGradient></defs>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="transparent" tickLine={false} /><YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="transparent" tickLine={false} width={40} /><Tooltip content={<ModalChartTooltip context="peak" />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} /><Bar dataKey="value" radius={[4, 4, 0, 0]} fill="url(#modalBarGradientPeak)" /></BarChart></ResponsiveContainer></div>
            <div><h4 className="text-sm font-semibold text-zinc-400 mb-2">Detalles por Lactancia</h4><ul className="space-y-1">{allLactations.slice().reverse().map(lact => (<li key={lact.parturitionDate} className="flex justify-between items-center p-2 rounded-md hover:bg-white/5"><span className="text-base font-medium text-zinc-200">Parto del {lact.parturitionDate}</span><span className="text-base font-semibold text-white">{lact.peakProduction.kg.toFixed(2)} Kg <span className="font-normal text-zinc-400">(Día {lact.peakProduction.del})</span></span></li>))}</ul></div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'del'} onClose={() => setActiveModal(null)} title="Historial de Duración de Lactancias">
        <div className="space-y-6">
            <div className="w-full h-48 -ml-4"><ResponsiveContainer><BarChart data={chartData.del} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                <defs><linearGradient id="modalBarGradientDel" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3B82F6" stopOpacity={0.8}/><stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2}/></linearGradient></defs>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="transparent" tickLine={false} /><YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="transparent" tickLine={false} width={40} /><Tooltip content={<ModalChartTooltip context="del" />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} /><Bar dataKey="value" radius={[4, 4, 0, 0]} fill="url(#modalBarGradientDel)" /></BarChart></ResponsiveContainer></div>
            <div><h4 className="text-sm font-semibold text-zinc-400 mb-2">Detalles por Lactancia</h4><ul className="space-y-1">{allLactations.slice().reverse().map(lact => (<li key={lact.parturitionDate} className="flex justify-between items-center p-2 rounded-md hover:bg-white/5"><span className="text-base font-medium text-zinc-200">Parto del {lact.parturitionDate}</span><span className="text-base font-semibold text-white">{lact.totalDays} días</span></li>))}</ul></div>
        </div>
      </Modal>

      <Modal isOpen={activeModal === 'interval'} onClose={() => setActiveModal(null)} title="Historial de Intervalos entre Partos">
        <div className="space-y-6">
            <div className="w-full h-48 -ml-4"><ResponsiveContainer><BarChart data={chartData.interval} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                 <defs><linearGradient id="modalBarGradientInt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.8}/><stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.2}/></linearGradient></defs>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="transparent" tickLine={false} /><YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }} stroke="transparent" tickLine={false} width={40} /><Tooltip content={<ModalChartTooltip context="interval" />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} /><Bar dataKey="value" radius={[4, 4, 0, 0]} fill="url(#modalBarGradientInt)" /></BarChart></ResponsiveContainer></div>
            <div><h4 className="text-sm font-semibold text-zinc-400 mb-2">Detalles de Intervalos</h4><ul className="space-y-1">{parturitionIntervals.slice().reverse().map(interval => (<li key={interval.period} className="flex justify-between items-center p-2 rounded-md hover:bg-white/5"><span className="text-base font-medium text-zinc-200">Período {interval.period}</span><span className="text-base font-semibold text-white">{interval.days} días</span></li>))}</ul></div>
        </div>
      </Modal>
    </>
  );
}