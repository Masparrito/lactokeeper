// src/pages/modules/kilos/KilosAnalysisPage.tsx

import React, { useState } from 'react';
import { useGdpAnalysis, GdpAnalyzedAnimal } from '../../../hooks/useGdpAnalysis';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { ChevronRight, TrendingUp, Sigma } from 'lucide-react';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
// --- CAMBIO CLAVE 1: Importamos la función para formatear la edad ---
import { formatAge } from '../../../utils/calculations';

// --- SUB-COMPONENTE DE FILA ACTUALIZADO ---
const AnimalRow = ({ animal, onSelect }: { animal: GdpAnalyzedAnimal, onSelect: (id: string) => void }) => {
    const classificationColor = {
        'Sobresaliente': 'bg-brand-green/80',
        'Promedio': 'bg-gray-500/80',
        'Pobre': 'bg-brand-red/80',
    };
    const formattedAge = formatAge(animal.birthDate); // Se calcula la edad formateada

    return (
        <button onClick={() => onSelect(animal.id)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-green transition-colors">
            <div>
                <p className="font-bold text-lg text-white">{animal.id}</p>
                {/* --- CAMBIO CLAVE 2: Se aplica la nueva norma --- */}
                <p className="text-sm text-zinc-400 mt-1">
                    {animal.sex} | {formattedAge} | Lote: {animal.location || 'Sin Asignar'}
                </p>
            </div>
            <div className="flex items-center gap-3">
                <p className="font-semibold text-white text-right">
                    {(animal.gdp * 1000).toFixed(0)}
                    <span className="text-sm text-zinc-400"> g/día</span>
                </p>
                {/* La clasificación ahora es una "píldora" de color para mayor impacto visual */}
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${classificationColor[animal.classification]}`}>
                    {animal.classification}
                </span>
                <ChevronRight className="text-zinc-600" />
            </div>
        </button>
    );
};

// --- COMPONENTE PRINCIPAL (sin cambios en la lógica, solo en el sub-componente) ---
interface KilosAnalysisPageProps {
    onSelectAnimal: (animalId: string) => void;
}

export default function KilosAnalysisPage({ onSelectAnimal }: KilosAnalysisPageProps) {
    const { classifiedAnimals, distribution, gaussChartData, meanGdp, stdDev } = useGdpAnalysis();
    const [filter, setFilter] = useState<'all' | 'Sobresaliente' | 'Promedio' | 'Pobre'>('all');

    const filteredAnimals = React.useMemo(() => {
        if (filter === 'all') return classifiedAnimals;
        return classifiedAnimals.filter(a => a.classification === filter);
    }, [classifiedAnimals, filter]);

    const handleBarClick = (data: any) => {
        if (data?.name) {
            const newFilter = data.name as 'Sobresaliente' | 'Promedio' | 'Pobre';
            setFilter(prev => prev === newFilter ? 'all' : newFilter);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4">
            <header className="text-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Análisis de GDP</h1>
                <p className="text-lg text-zinc-400">Ganancia Diaria de Peso</p>
            </header>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border">
                    <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><TrendingUp size={14} /><span>GDP Media</span></div>
                    <p className="text-2xl font-bold text-white">{(meanGdp * 1000).toFixed(0)} <span className="text-lg text-zinc-400">g/día</span></p>
                </div>
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border">
                    <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Sigma size={14} /><span>Desv. Estándar</span></div>
                    <p className="text-2xl font-bold text-white">{(stdDev * 1000).toFixed(0)} <span className="text-lg text-zinc-400">g/día</span></p>
                </div>
            </div>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="text-lg font-semibold text-white mb-4">Distribución del Crecimiento</h3>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                {distribution.map(entry => <Cell key={entry.name} fill={entry.fill} className={`${filter !== 'all' && filter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="text-lg font-semibold text-white mb-4">Campana de Gauss (g/día)</h3>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={gaussChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" fill="rgba(52, 199, 89, 0.6)" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-2 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 ml-1">
                    {filter === 'all' ? 'Todos los Animales' : `Animales (${filter})`} ({filteredAnimals.length})
                </h3>
                {filteredAnimals.length > 0 ? (
                    filteredAnimals.map(animal => (
                        <AnimalRow key={animal.id} animal={animal} onSelect={onSelectAnimal} />
                    ))
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-500">No hay animales que coincidan con los filtros.</p>
                    </div>
                )}
            </div>
        </div>
    );
}