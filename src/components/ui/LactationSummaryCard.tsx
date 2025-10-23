// src/components/ui/LactationSummaryCard.tsx
import React from 'react';
import { ChevronRight, TrendingUp, Droplet, CalendarDays } from 'lucide-react';
import { LactationCycle } from '../../hooks/useAnimalData'; // Asegúrate que este hook exporte el tipo

interface LactationSummaryCardProps {
    lactationNumber: number; // e.g., 1, 2, 3...
    lactationData: LactationCycle;
    onClick: () => void; // Function to handle click/tap
}

export const LactationSummaryCard: React.FC<LactationSummaryCardProps> = ({
    lactationNumber,
    lactationData,
    onClick
}) => {
    const lactationYear = new Date(lactationData.parturitionDate + 'T00:00:00Z').getUTCFullYear();

    return (
        <button
            onClick={onClick}
            className="w-full text-left bg-black/20 rounded-2xl p-4 border border-zinc-700/80 hover:border-brand-blue/50 transition-colors group"
        >
            <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-lg text-white">
                    Lactancia #{lactationNumber} <span className="text-zinc-400 font-normal">({lactationYear})</span>
                </h4>
                <ChevronRight className="text-zinc-500 group-hover:text-brand-blue transition-colors" />
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                    <p className="text-xs text-zinc-400 flex items-center justify-center gap-1"><Droplet size={12}/>Promedio</p>
                    <p className="text-xl font-semibold text-white">{lactationData.averageProduction.toFixed(2)}<span className="text-sm font-normal text-zinc-400"> Kg</span></p>
                </div>
                <div>
                    <p className="text-xs text-zinc-400 flex items-center justify-center gap-1"><TrendingUp size={12}/>Pico</p>
                    <p className="text-xl font-semibold text-white">{lactationData.peakProduction.kg.toFixed(2)}<span className="text-sm font-normal text-zinc-400"> Kg</span></p>
                </div>
                <div>
                    <p className="text-xs text-zinc-400 flex items-center justify-center gap-1"><CalendarDays size={12}/>Duración</p>
                    <p className="text-xl font-semibold text-white">{lactationData.totalDays}<span className="text-sm font-normal text-zinc-400"> días</span></p>
                </div>
            </div>
        </button>
    );
};