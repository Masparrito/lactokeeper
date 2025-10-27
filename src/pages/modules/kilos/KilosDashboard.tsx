// src/pages/modules/kilos/KilosDashboard.tsx

import React, { useMemo, useState } from 'react';
import { useData } from '../../../context/DataContext';
// Utility functions for calculations and formatting
import { calculateAgeInDays, calculateGDP, formatAge, getAnimalZootecnicCategory, calculateGrowthScore } from '../../../utils/calculations';
// Icons
import { ChevronRight, TrendingUp, Minus, Sigma } from 'lucide-react';
// Recharts components
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
// UI Components
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
// Custom Hooks type definition
import { GdpAnalyzedAnimal } from '../../../hooks/useGdpAnalysis';
// Database types
import { Animal, BodyWeighing } from '../../../db/local'; // Parturition IS needed

// --- SUB-COMPONENTES DE LA PÁGINA ---

// Define the specific classification types
type Classification = 'Sobresaliente' | 'Promedio' | 'Pobre';

// Icon to show GDP trend relative to average
const GDPTrendIcon = ({ gdp, averageGdp }: { gdp: number | null, averageGdp: number }) => {
    if (gdp === null || !averageGdp || averageGdp === 0) return null;
    const diff = gdp / averageGdp;
    if (diff > 1.1) return <TrendingUp size={18} className="text-brand-green" />;
    if (diff < 0.9) return <TrendingUp size={18} className="text-brand-red rotate-180" />; // Usar TrendingUp y rotarlo para Down
    return <Minus size={18} className="text-zinc-500" />;
};

// --- AnimalRow (Estilo estándar ya aplicado) ---
const AnimalRow = ({ animal, onSelect, averageGdp }: {
    animal: GdpAnalyzedAnimal & { formattedAge: string },
    onSelect: (id: string) => void,
    averageGdp: number
}) => {
    const classificationColor: Record<Classification, string> = {
        'Sobresaliente': 'text-brand-green',
        'Promedio': 'text-zinc-400',
        'Pobre': 'text-brand-red',
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
                <div className="text-right">
                    <p className="font-semibold text-white text-base">
                        {animal.gdp ? `${animal.gdp.toFixed(0)}` : '--'}
                        <span className="text-sm text-zinc-400"> g/día</span>
                    </p>
                    <p className={`font-bold text-xs ${classificationColor[animal.classification]}`}>{animal.classification}</p>
                </div>
                <GDPTrendIcon gdp={animal.gdp ? animal.gdp / 1000 : null} averageGdp={averageGdp} />
                <ChevronRight className="text-zinc-600 w-5 h-5" />
            </div>
        </button>
    );
};
// --- FIN AnimalRow ---

// --- COMPONENTE PRINCIPAL DEL DASHBOARD DE KILOS ---
export default function KilosDashboard({ onSelectAnimal }: { onSelectAnimal: (animalId: string) => void }) {
    const { animals, bodyWeighings, parturitions } = useData();
    const [filter, setFilter] = useState<Classification | 'all'>('all');

    // Memoized analysis of growth data
    const analysis = useMemo(() => {
        // --- INICIO DE LA CORRECCIÓN DE LÓGICA DE FILTRADO ---
        const animalsInGrowth = animals.filter((a: Animal) => {
            // Filtro 1: Debe estar Activo
            if (a.status !== 'Activo') return false;
            
            // Filtro 2: NO debe ser de Referencia
            if (a.isReference) return false;
            
            // Filtro 3: NO debe estar asignado a un lote de monta
            if (a.sireLotId) return false;

            // Filtro 4: Debe estar en las categorías zootécnicas correctas
            const category = getAnimalZootecnicCategory(a, parturitions);
            return ['Cabrita', 'Cabritona', 'Cabrito', 'Macho de Levante'].includes(category);
        });
        // --- FIN DE LA CORRECCIÓN DE LÓGICA DE FILTRADO ---

        if (animalsInGrowth.length === 0) {
            return { analyzedAnimals: [], distribution: [], averageGdp: 0, gaussChartData: [], meanGdp: 0, stdDev: 0 };
        }

        let totalGdpKgDay = 0;
        let animalsWithGdpCount = 0;

        const intermediateAnalyzedData = animalsInGrowth.map((animal: Animal) => {
            const weighings = bodyWeighings.filter((w: BodyWeighing) => w.animalId === animal.id);
            const gdpDetails = calculateGDP(animal.birthWeight, weighings);
            const overallGdpKgDay = gdpDetails.overall ?? 0;
            const ageInDays = calculateAgeInDays(animal.birthDate);

            if(overallGdpKgDay > 0) {
                totalGdpKgDay += overallGdpKgDay;
                animalsWithGdpCount++;
            }
            const averageGdpKgDayForScore = animalsWithGdpCount > 0 ? totalGdpKgDay / animalsWithGdpCount : 0;
            const score = overallGdpKgDay > 0 ? calculateGrowthScore(overallGdpKgDay, averageGdpKgDayForScore, ageInDays) : 0;

            return {
                ...animal,
                formattedAge: formatAge(animal.birthDate),
                ageInDays: ageInDays,
                gdpKgDay: overallGdpKgDay,
                score: score,
            };
        });

        const averageGdpKgDay = animalsWithGdpCount > 0 ? totalGdpKgDay / animalsWithGdpCount : 0;
        const meanGdpKgDay = averageGdpKgDay;

        const validScores = intermediateAnalyzedData.filter(a => a.score > 0).map(a => a.score);
        const meanScore = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
        const stdDevScore = validScores.length > 0 ? Math.sqrt(validScores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / validScores.length) : 0;

        const POOR_THRESHOLD_SCORE = meanScore - (0.4 * stdDevScore);
        const EXCELLENT_THRESHOLD_SCORE = meanScore + (0.4 * stdDevScore);

        const sortedIntermediate = intermediateAnalyzedData.sort((a, b) => b.score - a.score);

        const finalAnalyzedAnimals: (GdpAnalyzedAnimal & { formattedAge: string })[] = sortedIntermediate.map(animal => {
            let classification: Classification = 'Promedio';
            if (animal.score > 0 && stdDevScore > 1) {
                if (animal.score < POOR_THRESHOLD_SCORE) classification = 'Pobre';
                else if (animal.score > EXCELLENT_THRESHOLD_SCORE) classification = 'Sobresaliente';
            }
            return {
                 ...animal,
                 gdp: animal.gdpKgDay * 1000, // g/día
                 ageInDays: animal.ageInDays,
                 classification: classification,
                 formattedAge: animal.formattedAge,
            } as GdpAnalyzedAnimal & { formattedAge: string };
        });

        const distribution = [
            { name: 'Pobre', count: finalAnalyzedAnimals.filter(a => a.classification === 'Pobre').length, fill: '#FF3B30' },
            { name: 'Promedio', count: finalAnalyzedAnimals.filter(a => a.classification === 'Promedio').length, fill: '#6B7280' },
            { name: 'Sobresaliente', count: finalAnalyzedAnimals.filter(a => a.classification === 'Sobresaliente').length, fill: '#34C759' },
        ];

        const gdpValuesGDay = finalAnalyzedAnimals.map(a => a.gdp).filter(gdp => gdp > 0);
        const gaussChartData = [];
        let stdDevGDay = 0;
        if (gdpValuesGDay.length > 0) {
            const minGdp = Math.min(...gdpValuesGDay);
            const maxGdp = Math.max(...gdpValuesGDay);
            const step = Math.max(10, Math.ceil((maxGdp - minGdp) / 15));

            for (let i = Math.floor(minGdp / step) * step; i < maxGdp; i += step) {
                const rangeStart = i; const rangeEnd = i + step;
                const count = finalAnalyzedAnimals.filter(a => a.gdp >= rangeStart && a.gdp < rangeEnd).length;
                if (count > 0) { gaussChartData.push({ name: `${rangeStart}-${rangeEnd}`, count }); }
            }
             const meanGdpGDay = meanGdpKgDay * 1000;
             stdDevGDay = gdpValuesGDay.length > 0 ? Math.sqrt(gdpValuesGDay.reduce((sum, gdp) => sum + Math.pow(gdp - meanGdpGDay, 2), 0) / gdpValuesGDay.length) : 0;
        }

        return {
            analyzedAnimals: finalAnalyzedAnimals,
            distribution,
            averageGdp: averageGdpKgDay, // kg/día
            gaussChartData,
            meanGdp: meanGdpKgDay * 1000, // g/día
            stdDev: stdDevGDay // g/día
        };

    }, [animals, bodyWeighings, parturitions]);

    const filteredAnimals = React.useMemo(() => {
        if (filter === 'all') return analysis.analyzedAnimals;
        return analysis.analyzedAnimals.filter(a => a.classification === filter);
    }, [analysis.analyzedAnimals, filter]);

    const handleBarClick = (data: any) => {
        if (data?.payload?.name) {
            const newFilter = data.payload.name as Classification;
            setFilter(prev => prev === newFilter ? 'all' : newFilter);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pb-12">
            <header className="text-center pt-4">
                <h1 className="text-3xl font-bold tracking-tight text-white">Análisis de GDP</h1>
                <p className="text-lg text-zinc-400">Ganancia Diaria de Peso</p>
            </header>

            <div className="grid grid-cols-2 gap-4">
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border">
                    <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><TrendingUp size={14} /><span>GDP Media</span></div>
                    <p className="text-2xl font-bold text-white">{(analysis.meanGdp).toFixed(0)} <span className="text-lg text-zinc-400">g/día</span></p>
                </div>
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border">
                    <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Sigma size={14} /><span>Desv. Estándar</span></div>
                    <p className="text-2xl font-bold text-white">{(analysis.stdDev).toFixed(0)} <span className="text-lg text-zinc-400">g/día</span></p>
                </div>
            </div>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="text-lg font-semibold text-white mb-4">Distribución del Crecimiento</h3>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={analysis.distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} allowDecimals={false}/>
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" onClick={handleBarClick} cursor="pointer">
                                {analysis.distribution.map(entry => <Cell key={entry.name} fill={entry.fill} className={`${filter !== 'all' && filter !== entry.name ? 'opacity-30' : 'opacity-100'} transition-opacity`} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="text-lg font-semibold text-white mb-4">Campana de Gauss (g/día)</h3>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={analysis.gaussChartData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} interval={0} angle={-30} textAnchor="end" height={40}/>
                            <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} allowDecimals={false} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" fill="rgba(52, 199, 89, 0.6)" name="Nº Animales"/>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                 <div className="text-center text-xs text-zinc-400 mt-2">
                    <span>μ = {(analysis.meanGdp).toFixed(0)} g/día</span> | <span>σ = {analysis.stdDev.toFixed(0)} g/día</span>
                </div>
            </div>

            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 ml-1">
                    {filter === 'all' ? 'Animales en Crecimiento' : `Animales (${filter})`} ({filteredAnimals.length})
                </h3>
                {filteredAnimals.length > 0 ? (
                    filteredAnimals.map(animal => (
                        <AnimalRow key={animal.id} animal={animal} onSelect={onSelectAnimal} averageGdp={analysis.averageGdp} />
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