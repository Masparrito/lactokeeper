// src/pages/modules/kilos/KilosAnalysisPage.tsx

import React, { useState, useMemo } from 'react';
import { useGdpAnalysis, GdpAnalyzedAnimal } from '../../../hooks/useGdpAnalysis'; 
// --- CAMBIO: Añadido LabelList a la importación de recharts ---
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, LabelList } from 'recharts';
import { ChevronRight, TrendingUp, Sigma, Search } from 'lucide-react';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
import { formatAge } from '../../../utils/calculations';
import { useSearch } from '../../../hooks/useSearch'; 

// --- SUB-COMPONENTE DE FILA ACTUALIZADO ---
const AnimalRow = ({ animal, onSelect }: { animal: GdpAnalyzedAnimal & { formattedAge: string }, onSelect: (id: string) => void }) => { 
    const classificationColor = {
        'Sobresaliente': 'bg-brand-green/80',
        'Promedio': 'bg-gray-500/80',
        'Pobre': 'bg-brand-red/80',
    };
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    return (
        <button onClick={() => onSelect(animal.id)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border flex justify-between items-center hover:border-brand-green transition-colors min-h-[80px]">
            <div className="min-w-0 pr-3">
                <p className="font-mono font-semibold text-base text-white truncate">{animal.id.toUpperCase()}</p>
                {formattedName && (
                  <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                )}
                <div className="text-xs text-zinc-500 mt-1 min-h-[1rem] truncate">
                    <span>{animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'N/A'}</span>
                </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className='text-right'>
                    <p className="font-semibold text-white text-base">
                        {/* animal.gdp is already in g/day */}
                        {animal.gdp ? `${animal.gdp.toFixed(0)}` : '--'}
                        <span className="text-sm text-zinc-400"> g/día</span>
                    </p>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full text-white ${classificationColor[animal.classification]}`}>
                        {animal.classification}
                    </span>
                </div>
                <ChevronRight className="text-zinc-600 w-5 h-5" />
            </div>
        </button>
    );
};
// --- FIN AnimalRow ---

// --- CustomBarLabel definido como componente funcional (Mantenido) ---
const CustomBarLabel = (props: any) => {
    const { x, y, width, value, total } = props;
    if (total === 0 || value === 0) return null;
    const percentage = ((value / total) * 100).toFixed(0);
    return (
        <text x={x + width / 2} y={y + 20} fill="#fff" textAnchor="middle" fontSize="12px" fontWeight="bold">
            {`${percentage}%`}
        </text>
    );
};
// --- FIN CustomBarLabel ---


interface KilosAnalysisPageProps {
    onSelectAnimal: (animalId: string) => void;
}


export default function KilosAnalysisPage({ onSelectAnimal }: KilosAnalysisPageProps) {
    const { classifiedAnimals: rawClassifiedAnimals, distribution, gaussChartData, meanGdp, stdDev } = useGdpAnalysis();
    
    // Añadir formattedAge
    const classifiedAnimals = useMemo(() => {
        return rawClassifiedAnimals.map(animal => ({
            ...animal,
            formattedAge: formatAge(animal.birthDate)
        }));
    }, [rawClassifiedAnimals]);
    
    // Hook de búsqueda
    const { searchTerm, setSearchTerm, filteredItems } = useSearch(classifiedAnimals, ['id', 'name']);

    const [filter, setFilter] = useState<'all' | 'Sobresaliente' | 'Promedio' | 'Pobre'>('all');

    const filteredAnimals = React.useMemo(() => {
        let list = searchTerm ? filteredItems : classifiedAnimals;
        if (filter === 'all') return list;
        return list.filter(a => a.classification === filter);
    }, [classifiedAnimals, filter, searchTerm, filteredItems]);

    const handleBarClick = (data: any) => {
        if (data?.payload?.name) { 
            const newFilter = data.payload.name as 'Sobresaliente' | 'Promedio' | 'Pobre';
            setFilter(prev => prev === newFilter ? 'all' : newFilter);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pb-12">
            <header className="text-center pt-4">
                <h1 className="text-3xl font-bold tracking-tight text-white">Análisis de GDP</h1>
                <p className="text-lg text-zinc-400">Ganancia Diaria de Peso</p>
            </header>
            
            {/* Barra de Búsqueda */}
            <div className="relative px-4">
                <Search className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none" />
                <input type="search" placeholder={`Buscar ID o Nombre en ${filteredAnimals.length} animales...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-brand-glass border border-brand-border rounded-xl pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-brand-orange"/>
            </div>


            <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border">
                    <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><TrendingUp size={14} /><span>GDP Media</span></div>
                    <p className="text-2xl font-bold text-white">{(meanGdp).toFixed(0)} <span className="text-lg text-zinc-400">g/día</span></p>
                </div>
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border">
                    <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Sigma size={14} /><span>Desv. Estándar</span></div>
                    <p className="text-2xl font-bold text-white">{(stdDev).toFixed(0)} <span className="text-lg text-zinc-400">g/día</span></p>
                </div>
            </div>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="text-lg font-semibold text-white mb-4">Distribución del Crecimiento</h3>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                {distribution.map(entry => <Cell key={entry.name} fill={entry.fill} className={`${filter !== 'all' && filter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />)}
                                {/* --- CAMBIO: Corregida llamada a LabelList --- */}
                                <LabelList dataKey="count" content={CustomBarLabel} /> 
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
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={40}/>
                            <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" fill="rgba(52, 199, 89, 0.6)" name="Nº Animales"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 <div className="text-center text-xs text-zinc-400 mt-2">
                    <span>μ = {(meanGdp).toFixed(0)} g/día</span> | <span>σ = {stdDev.toFixed(0)} g/día</span>
                </div>
            </div>

            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 ml-1">
                    {filter === 'all' ? 'Animales en Crecimiento' : `Animales (${filter})`} ({filteredAnimals.length})
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