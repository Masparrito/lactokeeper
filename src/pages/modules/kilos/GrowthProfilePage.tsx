// src/pages/modules/kilos/GrowthProfilePage.tsx

import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
// Utility functions for calculations and formatting
import { calculateGDP, formatAge, getInterpolatedWeight, calculateWeaningIndex, calculatePrecocityIndex } from '../../../utils/calculations';
import { formatAnimalDisplay } from '../../../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA
// Icons
import { ArrowLeft, Scale, TrendingUp, Calendar, Hash } from 'lucide-react';
import { GiPodium, GiFastForwardButton } from 'react-icons/gi'; // Specific icons for indices
// Recharts components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// Database types
import { Animal, BodyWeighing } from '../../../db/local'; // Import types

// --- SUB-COMPONENTES DE UI (KpiCard, CustomTooltip) ---

// KPI Card component
const KpiCard = ({ icon: Icon, label, value, unit, colorClass }: { icon: React.ElementType, label: string, value: string | number, unit?: string, colorClass?: string }) => (
    <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border ${colorClass || ''}`}>
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Icon size={14} /><span>{label}</span></div>
        <p className="text-2xl font-bold text-white">{value} <span className="text-lg text-zinc-400">{unit}</span></p>
    </div>
);

// Custom Tooltip for the chart
const CustomTooltip = ({ active, payload, label }: any) => {
    // Type check for safety
    if (active && payload && payload.length > 0 && typeof label === 'number') {
        return (
            <div className="bg-black/50 backdrop-blur-xl p-3 rounded-lg border border-brand-border text-white">
                <p className="label text-brand-light-gray text-sm">Edad: {label.toFixed(0)} días</p> {/* Format age */}
                {payload.map((p: any, index: number) => ( // Add index for key
                    <p key={`${p.name}-${index}`} style={{ color: p.color }} className="font-bold text-base">
                        {p.name}: {p.value.toFixed(2)} Kg
                    </p>
                ))}
            </div>
        );
    }
    return null;
};


// --- COMPONENTE PRINCIPAL ---
interface GrowthProfilePageProps {
  animalId: string; // ID of the animal to display
  onBack: () => void; // Function to navigate back
}

export default function GrowthProfilePage({ animalId, onBack }: GrowthProfilePageProps) {
    // Get data from context
    const { animals, bodyWeighings } = useData();

    // Memoize the calculation of animal data and derived metrics
    const animalData = useMemo(() => {
        const animal = animals.find((a: Animal) => a.id === animalId); // Find the animal
        if (!animal) return null; // Return null if animal not found

        // Get and sort weighings for this animal
        const weighings = bodyWeighings
            .filter((w: BodyWeighing) => w.animalId === animal.id)
            .sort((a: BodyWeighing, b: BodyWeighing) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate metrics using utility functions
        const gdp = calculateGDP(animal.birthWeight, weighings); // Calculate GDP
        const formattedAge = formatAge(animal.birthDate); // Format current age
        // Determine latest weight (from last weighing or birth weight)
        const latestWeight = weighings.length > 0 ? weighings[weighings.length - 1].kg : animal.birthWeight || 0;
        const weaningIndex = calculateWeaningIndex(animal); // Calculate Weaning Index (adjusted weight at 60d)
        const precocityIndex = calculatePrecocityIndex(animal, weighings); // Calculate Precocity Index (estimated weight at 7m/210d)

        // Prepare data for the growth curve chart
        const chartData = weighings.map(w => ({
            age: (new Date(w.date).getTime() - new Date(animal.birthDate + 'T00:00:00Z').getTime()) / (1000 * 60 * 60 * 24), // Calculate age in days for each weighing
            [animal.id]: w.kg, // Use animal ID as the data key for the line
        }));

        // Add birth weight as the starting point (age 0) if available
        if (animal.birthWeight) {
            chartData.unshift({ age: 0, [animal.id]: animal.birthWeight });
        }

        // Define age milestones for estimated weights
        const milestones = [60, 90, 180, 270]; // Days
        // Calculate interpolated weights at milestones
        const interpolatedWeights = milestones.map(days => ({
            days,
            weight: getInterpolatedWeight(weighings, animal.birthDate, days) // Use utility function
        }));

        // Return all calculated data
        return { animal, gdp, formattedAge, latestWeight, chartData, interpolatedWeights, weaningIndex, precocityIndex };
    }, [animalId, animals, bodyWeighings]); // Recalculate if dependencies change

    // Show message if animal data couldn't be found/calculated
    if (!animalData) {
        return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Animal no encontrado.</h1></div>;
    }

    // Destructure calculated data for easier access in JSX
    const { animal, gdp, formattedAge, latestWeight, chartData, interpolatedWeights, weaningIndex, precocityIndex } = animalData;

    // --- RENDERIZADO DE LA PÁGINA ---
    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in pb-12">
            {/* Cabecera */}
            <header className="flex items-center pt-8 pb-4 px-4 sticky top-0 bg-brand-dark/80 backdrop-blur-md z-10 border-b border-brand-border -mx-4 mb-4"> {/* Added sticky, bg, blur, border, margins */}
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                {/* --- USO DE formatAnimalDisplay --- */}
                <div className="text-center flex-grow">
                    <h1 className="text-3xl font-bold tracking-tight text-white">{formatAnimalDisplay(animal)}</h1>
                    <p className="text-lg text-zinc-400">Perfil de Crecimiento</p>
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </header>

            {/* KPIs Principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                <KpiCard icon={Scale} label="Peso Actual" value={latestWeight.toFixed(2)} unit="Kg" />
                <KpiCard icon={TrendingUp} label="GDP General" value={gdp.overall ? (gdp.overall * 1000).toFixed(0) : 'N/A'} unit="g/día" />
                <KpiCard icon={Calendar} label="Edad Actual" value={formattedAge} />
                <KpiCard icon={Hash} label="Nº Pesajes" value={chartData.length > 0 ? chartData.length - (animal.birthWeight ? 1 : 0) : 0} /> {/* Exclude birth weight from count */}
            </div>

            {/* KPIs de Índices (solo si existen) */}
            {(weaningIndex || precocityIndex) && (
                <div className="grid grid-cols-2 gap-4 px-4">
                    {weaningIndex && (
                        <KpiCard icon={GiPodium} label="Índice Destete (60d)" value={weaningIndex.toFixed(2)} unit="Kg" colorClass="border-amber-400/50"/>
                    )}
                    {/* Placeholder div if only one index exists, to maintain grid structure */}
                    {!weaningIndex && precocityIndex && <div />}
                    {precocityIndex && (
                        <KpiCard icon={GiFastForwardButton} label="Índice Precocidad (7m)" value={precocityIndex.toFixed(2)} unit="Kg" colorClass="border-amber-400/50"/>
                    )}
                </div>
            )}

            {/* Gráfico Curva de Crecimiento */}
            <div className="px-4">
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Curva de Crecimiento</h3>
                    {chartData.length > 1 ? ( // Only render chart if there's more than just birth weight
                        <div className="w-full h-64">
                            <ResponsiveContainer>
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} label={{ value: 'Edad (días)', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)'}} />
                                    <YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} label={{ value: 'Peso (Kg)', angle: -90, position: 'insideRight', fill: 'rgba(255,255,255,0.5)' }} domain={['dataMin - 2', 'dataMax + 2']}/> {/* Added domain */}
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="top" height={36}/>
                                    {/* Line uses animal.id as dataKey */}
                                    <Line type="monotone" dataKey={animal.id} name={formatAnimalDisplay(animal)} stroke="#34C759" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-center text-zinc-500 py-8">No hay suficientes pesajes para mostrar la curva.</p>
                    )}
                </div>
            </div>

            {/* Hitos de Crecimiento (Pesos Estimados) */}
            <div className="px-4">
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Hitos de Crecimiento (Pesos Estimados)</h3>
                    {/* Check if there are enough weighings for interpolation */}
                    {chartData.length > 1 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {interpolatedWeights.map(({days, weight}) => (
                                <div key={days} className="bg-black/20 p-3 rounded-lg text-center">
                                    <p className="text-sm text-zinc-400">Peso a los {days} días</p>
                                    <p className="text-xl font-bold text-white">{weight ? `${weight.toFixed(2)} Kg` : '---'}</p> {/* Show --- if interpolation failed */}
                                </div>
                            ))}
                        </div>
                    ) : (
                         <p className="text-center text-zinc-500 py-4">Se necesitan más pesajes para estimar los hitos.</p>
                    )}
                </div>
            </div>
        </div> // End main container
    );
}