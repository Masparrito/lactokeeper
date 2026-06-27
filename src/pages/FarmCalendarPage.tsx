// src/pages/FarmCalendarPage.tsx

import { useState, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { useBirthingForecast, BirthingSeasonForecast, BirthingForecastEvent } from '../hooks/useBirthingForecast';
import type { PageState } from '../types/navigation';
import { Baby, CheckCircle, Clock, ChevronRight, Calendar, List } from 'lucide-react';
import { es } from 'date-fns/locale';

// --- ESTILOS PARA EL CALENDARIO (theme-aware vía tokens c-*) ---
const css = `
  .rdp { --rdp-cell-size: 45px; --rdp-accent-color: rgb(var(--c-accent-sky)); --rdp-background-color: rgb(var(--c-surface-2)); --rdp-accent-color-dark: rgb(var(--c-accent-sky)); --rdp-background-color-dark: rgb(var(--c-surface-2)); --rdp-outline: 2px solid var(--rdp-accent-color); --rdp-border-radius: 12px; color: rgb(var(--c-text)); width: 100%; }
  .rdp-caption_label, .rdp-nav_button { color: rgb(var(--c-accent-sky)); }
  .rdp-head_cell { color: rgb(var(--c-text-faint)); font-size: 0.8em; }
  .rdp-day_selected { background-color: var(--rdp-accent-color); color: #fff; font-weight: bold; }
  .day-confirmed { position: relative; }
  .day-confirmed::after { content: ''; position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; background-color: rgb(var(--c-accent)); }
  .day-probable { position: relative; }
  .day-probable::after { content: ''; position: absolute; bottom: 6px; left: 50%; transform: translateX(-50%); width: 6px; height: 6px; border-radius: 50%; background-color: rgb(var(--c-accent-gold)); opacity: 0.9; }
`;

// --- MEJORA: Nuevo componente "Tarjeta de Temporada de Partos" ---
const SeasonForecastCard = ({ seasonForecast, onClick }: { seasonForecast: BirthingSeasonForecast, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-c-surface backdrop-blur-xl rounded-2xl p-4 border border-c-border hover:border-c-accent-sky transition-colors">
        <div className="flex justify-between items-start">
            <div>
                <p className="font-bold text-lg text-c-text">{seasonForecast.seasonName}</p>
                <p className="text-sm text-c-text-muted">
                    {seasonForecast.projectedStartDate?.toLocaleDateString('es-VE', { month: 'long', day: 'numeric' })} - {seasonForecast.projectedEndDate?.toLocaleDateString('es-VE', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
            </div>
            {/* KPI de Separación entre Temporadas */}
            {seasonForecast.daysSinceLastSeason !== null && seasonForecast.daysSinceLastSeason > 0 && (
                <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-xs text-c-text-faint">Separación</p>
                    <p className="font-semibold text-c-text">{seasonForecast.daysSinceLastSeason} días</p>
                </div>
            )}
        </div>
        <div className="mt-3 pt-3 border-t border-c-border-strong/50 flex justify-between items-center">
            <div className="flex items-center gap-4">
                <div className="text-center">
                    <p className="font-bold text-2xl text-c-text">{seasonForecast.totalEvents}</p>
                    <p className="text-xs text-c-text-muted">Partos</p>
                </div>
                <div className="text-left text-xs">
                    <p className="flex items-center gap-1 text-brand-green"><CheckCircle size={12}/> Confirmados: {seasonForecast.confirmedEvents}</p>
                    <p className="flex items-center gap-1 text-brand-amber"><Clock size={12}/> Probables: {seasonForecast.probableEvents}</p>
                </div>
            </div>
            <ChevronRight className="text-c-text-faint" />
        </div>
    </button>
);

const ForecastRow = ({ forecastItem, onClick }: { forecastItem: BirthingForecastEvent, onClick: () => void }) => (
    <button onClick={onClick} className="w-full text-left bg-c-surface-2 rounded-lg p-3 flex justify-between items-center hover:bg-c-surface-2 transition-colors">
        <div>
            <p className="font-bold text-c-text">{forecastItem.animal.id}</p>
            <p className="text-xs text-c-text-muted">Reproductor: {forecastItem.sireName}</p>
        </div>
        <div className={`flex items-center gap-2 text-sm font-semibold ${forecastItem.type === 'Confirmada' ? 'text-brand-green' : 'text-brand-amber'}`}>
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
                <h1 className="text-3xl font-bold tracking-tight text-c-text">Calendario de Partos</h1>
                <p className="text-lg text-c-text-muted">Proyecciones del Rebaño</p>
            </header>

            <div className="flex justify-center p-1 bg-c-surface-2 rounded-xl">
                <button onClick={() => setViewMode('cards')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${viewMode === 'cards' ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted'}`}><List size={16}/> Temporadas</button>
                <button onClick={() => setViewMode('calendar')} className={`w-1/2 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-colors ${viewMode === 'calendar' ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted'}`}><Calendar size={16}/> Calendario</button>
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
                        <div className="text-center py-10 bg-c-surface rounded-2xl flex flex-col items-center gap-2">
                            <Baby size={32} className="text-c-text-faint" />
                            <p className="text-c-text-muted">No hay temporadas de parto activas o proyectadas.</p>
                        </div>
                    )}
                </div>
            )}
            
            {viewMode === 'calendar' && (
                <>
                    <div className="bg-c-surface backdrop-blur-xl rounded-2xl p-2 border border-c-border">
                        <DayPicker mode="single" selected={selectedDay} onSelect={setSelectedDay} month={currentMonth} onMonthChange={setCurrentMonth} locale={es} modifiers={{ confirmed: modifiers.confirmed, probable: modifiers.probable }} modifiersClassNames={{ confirmed: 'day-confirmed', probable: 'day-probable' }} showOutsideDays />
                    </div>
                    
                    {selectedDay && (
                        <div className="space-y-3 pt-2">
                            <h3 className="text-lg font-semibold text-c-text">
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
                                <div className="text-center py-6 bg-c-surface rounded-2xl">
                                    <p className="text-c-text-faint">No hay partos proyectados para este día.</p>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}