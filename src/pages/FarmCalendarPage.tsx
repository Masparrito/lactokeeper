// src/pages/FarmCalendarPage.tsx

import { useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useBirthingForecast, BirthingSeasonForecast, BirthingForecastEvent } from '../hooks/useBirthingForecast';
import type { PageState } from '../types/navigation';
import { Baby, CheckCircle, Clock, ChevronRight, Calendar, List } from 'lucide-react';
import { es } from 'date-fns/locale';

// --- ESTILOS PARA EL CALENDARIO (SIN CAMBIOS) ---
const css = `
  .rdp { --rdp-cell-size: 45px; --rdp-accent-color: #FF9500; --rdp-background-color: #2C2C2E; --rdp-accent-color-dark: #FF9500; --rdp-background-color-dark: #2C2C2E; --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-border-radius: 12px; color: #FFF; width: 100%; }
  .rdp-caption_label, .rdp-nav_button { color: #FF9500; }
  .rdp-head_cell { color: #8e8e93; font-size: 0.8em; }
  .rdp-day_selected { background-color: var(--rdp-accent-color); color: #000; font-weight: bold; }
  .day-confirmed { position: relative; }
  .day-confirmed::after { content: ''; position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; background-color: #34C759; }
  .day-probable { position: relative; }
  .day-probable::after { content: ''; position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; background-color: #FF9500; opacity: 0.7; }
`;

// --- MEJORA: Nuevo componente "Tarjeta de Temporada de Partos" ---
const SeasonForecastCard = ({ seasonForecast, onClick }: { seasonForecast: BirthingSeasonForecast, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border hover:border-brand-blue transition-colors">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-lg text-white">{seasonForecast.seasonName}</p>
                <p className="text-sm text-zinc-400">
                    {seasonForecast.projectedStartDate?.toLocaleDateString('es-VE', { month: 'long', day: 'numeric' })} - {seasonForecast.projectedEndDate?.toLocaleDateString('es-VE', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </div>
            {/* KPI de Separación entre Temporadas */}
            {seasonForecast.daysSinceLastSeason !== null && seasonForecast.daysSinceLastSeason > 0 && (
                <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-zinc-500">Separación</p>
                    <p className="font-semibold text-white">{seasonForecast.daysSinceLastSeason} días</p>
                </div>
            )}
        </div>
        <div className="mt-3 pt-3 border-t border-zinc-700/50 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="text-center">
                    <p className="font-bold text-2xl text-white">{seasonForecast.totalEvents}</p>
                    <p className="text-xs text-zinc-400">Partos</p>
                </div>
                <div className="text-left text-xs">
                    <p className="flex items-center gap-1 text-brand-green"><CheckCircle size={12}/> Confirmados: {seasonForecast.confirmedEvents}</p>
                    <p className="flex items-center gap-1 text-brand-orange"><Clock size={12}/> Probables: {seasonForecast.probableEvents}</p>
                </div>
            </div>
            <ChevronRight className="text-zinc-600" />
        </div>
    </button>
);

const ForecastRow = ({ forecastItem, onClick }: { forecastItem: BirthingForecastEvent, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-black/20 rounded-lg p-3 flex justify-between items-center hover:bg-zinc-800/60 transition-colors">
        <div>
            <p className="font-bold text-white">{forecastItem.animal.id}</p>
            <p className="text-xs text-zinc-400">Reproductor: {forecastItem.sireName}</p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-semibold ${forecastItem.type === 'Confirmada' ? 'text-brand-green' : 'text-brand-orange'}`}>
            {forecastItem.type === 'Confirmada' ? <CheckCircle size={16} /> : <Clock size={16} />}
            <span>{forecastItem.type}</span>
        </div>
    </button>
);


interface FarmCalendarPageProps {
    navigateTo: (page: PageState) => void;
}

export default function FarmCalendarPage({ navigateTo }: FarmCalendarPageProps) {
    const { forecastBySeason } = useBirthingForecast();
    const [viewMode, setViewMode] = useState<'cards' | 'calendar'>('cards');
    const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const allEvents = useMemo(() => forecastBySeason.flatMap(s => s.events), [forecastBySeason]);
    
    const modifiers = useMemo(() => ({
        confirmed: allEvents.filter(f => f.type === 'Confirmada').map(f => f.dueDate),
        probable: allEvents.filter(f => f.type === 'Probable').map(f => f.dueDate),
    }), [allEvents]);

    const forecastsForSelectedDay = useMemo(() => {
        if (!selectedDay) return [];
        return allEvents.filter(f =>    
            f.dueDate.getFullYear() === selectedDay.getFullYear() &&
            f.dueDate.getMonth() === selectedDay.getMonth() &&
            f.dueDate.getDate() === selectedDay.getDate()
        );
    }, [allEvents, selectedDay]);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4">
            <style>{css}</style>
            <header className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Calendario de Partos</h1>
                <p className="text-lg text-zinc-400">Proyecciones del Rebaño</p>
            </header>

            <div className="flex justify-center p-1 bg-zinc-800 rounded-xl">
                <button onClick={() => setViewMode('cards')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${viewMode === 'cards' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}><List size={16}/> Temporadas</button>
                <button onClick={() => setViewMode('calendar')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${viewMode === 'calendar' ? 'bg-zinc-600 text-white' : 'text-zinc-400'}`}><Calendar size={16}/> Calendario</button>
            </div>

            {viewMode === 'cards' && (
                <div className="space-y-3">
                    {forecastBySeason.length > 0 ? forecastBySeason.map(seasonForecast => (
                        <SeasonForecastCard    
                            key={seasonForecast.seasonId}    
                            seasonForecast={seasonForecast}    
                            onClick={() => navigateTo({ name: 'birthing-season-detail', seasonId: seasonForecast.seasonId })}
                        />
                    )) : (
                        <div className="text-center py-10 bg-brand-glass rounded-2xl flex flex-col items-center gap-2">
                            <Baby size={32} className="text-zinc-600" />
                            <p className="text-zinc-400">No hay temporadas de parto activas o proyectadas.</p>
                        </div>
                    )}
                </div>
            )}
            
            {viewMode === 'calendar' && (
                <>
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-2 border border-brand-border">
                        <DayPicker mode="single" selected={selectedDay} onSelect={setSelectedDay} month={currentMonth} onMonthChange={setCurrentMonth} locale={es} modifiers={{ confirmed: modifiers.confirmed, probable: modifiers.probable }} modifiersClassNames={{ confirmed: 'day-confirmed', probable: 'day-probable' }} showOutsideDays />
                    </div>
                    
                    {selectedDay && (
                        <div className="space-y-3 pt-2">
                            <h3 className="text-lg font-semibold text-white">
                                Proyecciones para el {selectedDay.toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </h3>
                            {forecastsForSelectedDay.length > 0 ? (
                                <div className="space-y-2">
                                    {forecastsForSelectedDay.map(item => (
                                        <ForecastRow    
                                            key={item.animal.id}    
                                            forecastItem={item}    
                                            onClick={() => navigateTo({ name: 'rebano-profile', animalId: item.animal.id })}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-6 bg-brand-glass rounded-2xl">
                                    <p className="text-zinc-500">No hay partos proyectados para este día.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}