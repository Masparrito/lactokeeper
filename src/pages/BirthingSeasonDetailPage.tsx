// src/pages/BirthingSeasonDetailPage.tsx

import { useMemo } from 'react';
import { useBirthingForecast, BirthingForecastEvent } from '../hooks/useBirthingForecast';
import type { PageState } from '../types/navigation';
import { ArrowLeft, BarChart2, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

// Componente para una fila de la lista
const ForecastRow = ({ forecastItem, onClick }: { forecastItem: BirthingForecastEvent, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-black/20 rounded-lg p-3 flex justify-between items-center hover:bg-zinc-800/60 transition-colors">
        <div>
            <p className="font-bold text-white">{forecastItem.animal.id}</p>
            {/* --- CORRECCIÓN: Usar 'sireName' en lugar del ID --- */}
            <p className="text-xs text-zinc-400">Reproductor: {forecastItem.sireName}</p>
        </div>
        <div className="flex items-center gap-3">
             <div className={`flex items-center gap-2 text-sm font-semibold ${forecastItem.type === 'Confirmada' ? 'text-brand-green' : 'text-brand-orange'}`}>
                {forecastItem.type === 'Confirmada' ? <CheckCircle size={16} /> : <Clock size={16} />}
                <span>{forecastItem.type}</span>
            </div>
            <ChevronRight className="text-zinc-600" />
        </div>
    </button>
);

// --- MEJORA: Función para obtener el número y etiqueta de la semana del mes ---
const getWeekOfMonthLabel = (date: Date): string => {
    const startOfMonth = new Date(date.getUTCFullYear(), date.getUTCMonth(), 1);
    // El primer día de la semana (Lunes = 0)
    const dayOfWeek = startOfMonth.getUTCDay() === 0 ? 6 : startOfMonth.getUTCDay() - 1; 
    const day = date.getUTCDate();
    const weekNumber = Math.ceil((day + dayOfWeek) / 7);
    const month = date.toLocaleString('es-VE', { month: 'short', timeZone: 'UTC' });
    return `${month.charAt(0).toUpperCase() + month.slice(1)} - Sem ${weekNumber}`;
}

interface BirthingSeasonDetailPageProps {
    seasonId: string;
    onBack: () => void;
    navigateTo: (page: PageState) => void;
}

export default function BirthingSeasonDetailPage({ seasonId, onBack, navigateTo }: BirthingSeasonDetailPageProps) {
    const { forecastBySeason } = useBirthingForecast();

    const seasonForecast = useMemo(() => {
        return forecastBySeason.find(s => s.seasonId === seasonId);
    }, [forecastBySeason, seasonId]);

    // --- MEJORA: Lógica para el "Mapa de Calor Semanal" ---
    const weeklyChartData = useMemo(() => {
        if (!seasonForecast) return [];

        const weeks: Record<string, { count: number, startDate: Date }> = {};
        
        seasonForecast.events.forEach(event => {
            const date = event.dueDate;
            const key = getWeekOfMonthLabel(date);
            
            if (!weeks[key]) {
                const day = date.getUTCDate();
                const dayOfWeek = date.getUTCDay() === 0 ? 6 : date.getUTCDay() - 1;
                const firstDayOfWeek = new Date(date);
                firstDayOfWeek.setUTCDate(day - dayOfWeek);
                weeks[key] = { count: 0, startDate: firstDayOfWeek };
            }
            weeks[key].count++;
        });

        return Object.entries(weeks)
            .map(([name, data]) => ({ name, partos: data.count, startDate: data.startDate }))
            .sort((a,b) => a.startDate.getTime() - b.startDate.getTime());

    }, [seasonForecast]);

    if (!seasonForecast) {
        return (
            <div className="text-center p-10">
                <h1 className="text-2xl text-zinc-400">Temporada de Partos no encontrada.</h1>
                <button onClick={onBack} className="mt-4 text-brand-orange">Volver</button>
            </div>
        );
    }

    return (
        // --- CORRECCIÓN: Añadido pb-12 para evitar que el nav tape el último elemento ---
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pb-12">
            <header className="flex items-center pt-8 pb-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="text-center flex-grow">
                    <h1 className="text-3xl font-bold tracking-tight text-white">{seasonForecast.seasonName}</h1>
                    <p className="text-lg text-zinc-400">Detalle de Proyección de Partos</p>
                </div>
                <div className="w-8"></div>
            </header>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-white mb-4"><BarChart2 size={20}/> Proyección Semanal de Partos</h3>
                <div className="w-full h-56">
                    <ResponsiveContainer>
                        <BarChart data={weeklyChartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.1)'}} contentStyle={{ backgroundColor: 'rgba(44, 44, 46, 0.8)', border: '1px solid #444', borderRadius: '12px' }} />
                            <Bar dataKey="partos" name="Nº de Partos" fill="#007AFF" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-3 pt-4">
                <h3 className="text-lg font-semibold text-white">
                    Lista de Animales ({seasonForecast.totalEvents})
                </h3>
                <div className="space-y-2">
M                   {seasonForecast.events.map(item => (
                        <ForecastRow    
                            key={item.animal.id}    
                            forecastItem={item}    
                            onClick={() => navigateTo({ name: 'rebano-profile', animalId: item.animal.id })}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}