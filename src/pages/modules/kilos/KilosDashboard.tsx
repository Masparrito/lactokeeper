// src/pages/modules/kilos/KilosDashboardPage.tsx

import React, { useMemo, useState } from 'react';
import { useData } from '../../../context/DataContext';
// Utility functions for calculations and formatting
import { calculateAgeInDays, calculateGDP, formatAge, getAnimalZootecnicCategory, calculateGrowthScore } from '../../../utils/calculations';
import { formatAnimalDisplay } from '../../../utils/formatting';
// Icons
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react'; // Sigma removed as requested
// Recharts components
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
// UI Components
import { CustomTooltip } from '../../../components/ui/CustomTooltip';
// Custom Hooks type definition
import { GdpAnalyzedAnimal } from '../../../hooks/useGdpAnalysis'; // Keep type definition
// Database types
import { Animal, BodyWeighing } from '../../../db/local'; // Parturition IS needed for getAnimalZootecnicCategory

// --- SUB-COMPONENTES DE LA PÁGINA ---

// Define the specific classification types
type Classification = 'Sobresaliente' | 'Promedio' | 'Pobre';

// Icon to show GDP trend relative to average
const GDPTrendIcon = ({ gdp, averageGdp }: { gdp: number | null, averageGdp: number }) => {
    // Input gdp is kg/day for comparison consistency
    if (gdp === null || !averageGdp || averageGdp === 0) return null;
    const diff = gdp / averageGdp;
    if (diff > 1.1) return <TrendingUp size={18} className="text-brand-green" />;
    if (diff < 0.9) return <TrendingDown size={18} className="text-brand-red" />;
    return <Minus size={18} className="text-zinc-500" />;
};

// Component to display a row for each animal in the list
const AnimalRow = ({ animal, onSelect, averageGdp }: {
    animal: GdpAnalyzedAnimal & { formattedAge: string }, // Expecting the final type
    onSelect: (id: string) => void,
    averageGdp: number // Average GDP in kg/day
}) => {
    const classificationColor: Record<Classification, string> = {
        'Sobresaliente': 'text-brand-green',
        'Promedio': 'text-zinc-400',
        'Pobre': 'text-brand-red',
    };

    return (
        <button onClick={() => onSelect(animal.id)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-green transition-colors">
            <div>
                <p className="font-bold text-lg text-white">{formatAnimalDisplay(animal)}</p>
                <p className="text-sm text-zinc-400 mt-1">{animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="font-semibold text-white">
                        {/* animal.gdp is already in g/day */}
                        {animal.gdp ? `${animal.gdp.toFixed(0)}` : '--'}
                        <span className="text-sm text-zinc-400"> g/día</span>
                    </p>
                    <p className={`font-bold text-sm ${classificationColor[animal.classification]}`}>{animal.classification}</p>
                </div>
                {/* Pass gdp in kg/day for comparison */}
                <GDPTrendIcon gdp={animal.gdp ? animal.gdp / 1000 : null} averageGdp={averageGdp} />
                <ChevronRight className="text-zinc-600" />
            </div>
        </button>
    );
};

// --- COMPONENTE PRINCIPAL DEL DASHBOARD DE KILOS ---
export default function KilosDashboard({ onSelectAnimal }: { onSelectAnimal: (animalId: string) => void }) {
    const { animals, bodyWeighings, parturitions } = useData();
    const [filter, setFilter] = useState<Classification | 'all'>('all');

    // Memoized analysis of growth data
    const analysis = useMemo(() => {
        const animalsInGrowth = animals.filter((a: Animal) => {
            const category = getAnimalZootecnicCategory(a, parturitions); // Parturition needed here
            return ['Cabrita', 'Cabritona', 'Cabrito', 'Macho de Levante'].includes(category);
        });

        if (animalsInGrowth.length === 0) {
            return { analyzedAnimals: [], distribution: [], averageGdp: 0, gaussChartData: [], meanGdp: 0, stdDev: 0 };
        }

        let totalGdpKgDay = 0;
        let animalsWithGdpCount = 0;

        // Calculate intermediate data including score
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
                ...animal, // Spread original animal properties first
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

        // Sort based on score *before* mapping to the final structure
        const sortedIntermediate = intermediateAnalyzedData.sort((a, b) => b.score - a.score);

        // --- CORRECTION HERE ---
        // Map to the final structure, ensuring all required fields from GdpAnalyzedAnimal are present
        const finalAnalyzedAnimals: (GdpAnalyzedAnimal & { formattedAge: string })[] = sortedIntermediate.map(animal => {
            let classification: Classification = 'Promedio';
            if (animal.score > 0 && stdDevScore > 1) {
                if (animal.score < POOR_THRESHOLD_SCORE) classification = 'Pobre';
                else if (animal.score > EXCELLENT_THRESHOLD_SCORE) classification = 'Sobresaliente';
            }
            // Spread the original animal properties first, then add/override calculated ones
            return {
                 ...animal, // Includes all original Animal fields like status, lifecycleStage, etc.
                 gdp: animal.gdpKgDay * 1000, // Convert gdp to g/day and assign to 'gdp' field
                 ageInDays: animal.ageInDays,
                 classification: classification,
                 formattedAge: animal.formattedAge, // Already calculated
                 // score: animal.score // Remove score if not part of GdpAnalyzedAnimal
                 // gdpKgDay: animal.gdpKgDay // Remove if not part of GdpAnalyzedAnimal
            } as GdpAnalyzedAnimal & { formattedAge: string }; // Assert the final type
        });
        // --- END CORRECTION ---

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
            averageGdp: averageGdpKgDay,
            gaussChartData,
            meanGdp: meanGdpKgDay,
            stdDev: stdDevGDay
        };

    }, [animals, bodyWeighings, parturitions]);

     // Filter animals based on the selected classification filter
    const filteredAnimals = React.useMemo(() => {
        if (filter === 'all') return analysis.analyzedAnimals;
        return analysis.analyzedAnimals.filter(a => a.classification === filter);
    }, [analysis.analyzedAnimals, filter]);

    // Handler for clicking on a bar in the distribution chart
    const handleBarClick = (data: any) => {
        if (data?.payload?.name) {
            const newFilter = data.payload.name as Classification;
            setFilter(prev => prev === newFilter ? 'all' : newFilter);
        }
    };

    return (
        // Main container
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in px-4 pb-12">
            {/* KPI Card for Average GDP */}
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border mt-4">
                <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-2 text-xs uppercase tracking-wider"><TrendingUp /><span>GDP Promedio del Levante</span></div>
                <p className="text-4xl font-bold tracking-tight text-white">{(analysis.averageGdp * 1000).toFixed(0)} <span className="text-2xl font-medium text-zinc-400">g/día</span></p>
            </div>

            {/* Distribution Chart (Classification) */}
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

            {/* Gauss Chart (GDP Ranges) */}
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
                 {/* Display Mean and Std Dev in g/day */}
                 <div className="text-center text-xs text-zinc-400 mt-2">
                    <span>μ = {(analysis.meanGdp * 1000).toFixed(0)} g/día</span> | <span>σ = {analysis.stdDev.toFixed(0)} g/día</span>
                </div>
            </div>

            {/* List of Animals in Growth */}
            <div className="space-y-2 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 ml-1">
                    {filter === 'all' ? 'Todos los Animales' : `Animales (${filter})`} ({filteredAnimals.length})
                </h3>
                {filteredAnimals.length > 0 ? (
                    filteredAnimals.map(animal => (
                        <AnimalRow key={animal.id} animal={animal} onSelect={() => onSelectAnimal(animal.id)} averageGdp={analysis.averageGdp} /> // Pass average GDP in kg/day
                    ))
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-500">No hay animales que coincidan con los filtros.</p>
                    </div>
                )}
            </div>
        </div> // End main container
    );
}