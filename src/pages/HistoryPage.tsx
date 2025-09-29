// src/pages/HistoryPage.tsx

import { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Weighing } from '../db/local';
import { ChevronLeft, ChevronRight, CalendarIcon, BarChart2 } from 'lucide-react';
import { HistoryCalendarModal } from '../components/ui/HistoryCalendarModal';
import { BarChart, Bar, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useGaussAnalysis } from '../hooks/useGaussAnalysis';

interface HistoryPageProps {
    onSelectAnimal: (animalId: string) => void;
}

export default function HistoryPage({ onSelectAnimal }: HistoryPageProps) {
    const { animals, weighings, parturitions, isLoading } = useData();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);

    const { weighingsByDate, availableDates } = useMemo(() => {
        const groups: Record<string, Weighing[]> = {};
        weighings.forEach(weighing => {
            const date = weighing.date;
            if (!groups[date]) groups[date] = [];
            groups[date].push(weighing);
        });
        const dates = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
        return { weighingsByDate: groups, availableDates: dates };
    }, [weighings]);

    const [currentIndex, setCurrentIndex] = useState(0);
    
    const selectedDate = availableDates[currentIndex];
    const selectedWeighings = weighingsByDate[selectedDate] || [];
    
    const animalsWeighedOnDay = useMemo(() => {
        const animalIds = new Set(selectedWeighings.map(w => w.goatId));
        return animals.filter(a => animalIds.has(a.id));
    }, [selectedWeighings, animals]);

    const { distribution, mean, stdDev } = useGaussAnalysis(animalsWeighedOnDay, selectedWeighings, parturitions, false);

    const handleDateSelect = (date: Date) => {
        const dateString = date.toISOString().split('T')[0];
        const index = availableDates.indexOf(dateString);
        if (index !== -1) {
            setCurrentIndex(index);
        }
    };

    const goToPrevious = () => setCurrentIndex(prev => Math.min(prev + 1, availableDates.length - 1));
    const goToNext = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

    if (isLoading) {
        return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Cargando historial...</h1></div>;
    }

    return (
        <>
            <div className="w-full max-w-2xl mx-auto space-y-4">
                <header className="text-center pt-8 pb-4">
                    <h1 className="text-4xl font-bold tracking-tight text-white">Historial de Pesajes</h1>
                    <p className="text-xl text-zinc-400">Revisa la producción día a día</p>
                </header>
                
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border flex justify-between items-center">
                    <button onClick={goToPrevious} disabled={currentIndex >= availableDates.length - 1} className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30">
                        <ChevronLeft />
                    </button>
                    <div className="flex items-center space-x-4">
                        <div className="text-center">
                            <p className="text-lg font-semibold text-white">
                                {selectedDate ? new Date(selectedDate).toLocaleDateString('es-VE', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Sin Datos'}
                            </p>
                            <p className="text-sm text-zinc-400">{selectedWeighings.length} animales pesados</p>
                        </div>
                        <button onClick={() => setIsCalendarOpen(true)} className="p-2 rounded-full hover:bg-zinc-700/50">
                            <CalendarIcon />
                        </button>
                    </div>
                    {/* CORRECCIÓN: Se restaura el botón derecho de navegación */}
                    <button onClick={goToNext} disabled={currentIndex === 0} className="p-2 rounded-full hover:bg-zinc-700/50 disabled:opacity-30">
                        <ChevronRight />
                    </button>
                </div>

                {selectedWeighings.length > 0 && (
                     <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border animate-fade-in">
                        <div className="flex items-center space-x-2 border-b border-brand-border pb-2 mb-4">
                           <BarChart2 className="text-amber-400" size={18}/>
                           <h3 className="text-lg font-semibold text-white">Análisis del Día</h3>
                        </div>
                        <div className="w-full h-48">
                            <ResponsiveContainer>
                                <BarChart data={distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                                    <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                                    <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                                    <Tooltip cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                                    <Bar dataKey="count">
                                        {distribution.map((entry) => (
                                            <Cell key={entry.name} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                         <div className="text-center text-xs text-zinc-400 mt-2">
                            <span>μ = {mean.toFixed(2)} Kg</span> | <span>σ = {stdDev.toFixed(2)}</span>
                        </div>
                    </div>
                )}

                <div className="space-y-2">
                    {selectedWeighings.sort((a,b) => b.kg - a.kg).map((weighing, index) => (
                        <button key={`${weighing.goatId}-${index}`} onClick={() => onSelectAnimal(weighing.goatId)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-amber-400 transition-colors">
                            <div>
                                <p className="font-bold text-lg text-white">{weighing.goatId}</p>
                            </div>
                            <p className="font-semibold text-xl text-white">{weighing.kg.toFixed(2)} <span className="text-lg font-medium text-zinc-400">Kg</span></p>
                        </button>
                    ))}
                </div>
            </div>

            <HistoryCalendarModal 
                isOpen={isCalendarOpen}
                onClose={() => setIsCalendarOpen(false)}
                availableDates={availableDates.map(d => new Date(d))}
                onDateSelect={handleDateSelect}
            />
        </>
    );
}