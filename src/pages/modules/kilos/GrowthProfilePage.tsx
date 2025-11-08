import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
// Utility functions for calculations and formatting
import { calculateGDP, formatAge, getInterpolatedWeight, calculateWeaningIndex, calculatePrecocityIndex } from '../../../utils/calculations';
import { formatAnimalDisplay } from '../../../utils/formatting';
// Icons
import { ArrowLeft, Scale, TrendingUp, Calendar, Hash, Check } from 'lucide-react';
import { GiPodium, GiFastForwardButton } from 'react-icons/gi'; // Specific icons for indices
// Recharts components
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
// Database types
import { Animal, BodyWeighing } from '../../../db/local'; // Import types
// Import CustomTooltip
import { CustomTooltip } from '../../../components/ui/CustomTooltip';

// --- SUB-COMPONENTES DE UI (KpiCard) ---

// KPI Card component
const KpiCard = ({ icon: Icon, label, value, unit, colorClass }: { icon: React.ElementType, label: string, value: string | number, unit?: string, colorClass?: string }) => (
    <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border ${colorClass || ''}`}>
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Icon size={14} /><span>{label}</span></div>
        <p className="text-2xl font-bold text-white">{value} <span className="text-lg text-zinc-400">{unit}</span></p>
    </div>
);

// --- COMPONENTE PRINCIPAL ---
interface GrowthProfilePageProps {
  animalId: string; // ID of the animal to display
  onBack: () => void; // Function to navigate back
}

export default function GrowthProfilePage({ animalId, onBack }: GrowthProfilePageProps) {
    // Get data from context
    const { animals, bodyWeighings, appConfig } = useData();

    // Memoize the calculation of animal data and derived metrics
    const animalData = useMemo(() => {
        const animal = animals.find((a: Animal) => a.id === animalId); // Find the animal
        if (!animal) return null; // Return null if animal not found

        const weighings = bodyWeighings
            .filter((w: BodyWeighing) => w.animalId === animal.id)
            .sort((a: BodyWeighing, b: BodyWeighing) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate metrics using utility functions
        const gdp = calculateGDP(animal.birthWeight, weighings); // Calculate GDP
        const formattedAge = formatAge(animal.birthDate); // Format current age
        const latestWeight = weighings.length > 0 ? weighings[weighings.length - 1].kg : animal.birthWeight || 0;
        const weaningIndex = calculateWeaningIndex(animal); // Calculate Weaning Index (adjusted weight at 60d)
        const precocityIndex = calculatePrecocityIndex(animal, weighings); // Calculate Precocity Index (estimated weight at 7m/210d)

        const chartData = weighings.map(w => ({
            age: (new Date(w.date).getTime() - new Date(animal.birthDate + 'T00:00:00Z').getTime()) / (1000 * 60 * 60 * 24), // Calculate age in days for each weighing
            [animal.id]: w.kg, // Use animal ID as the data key for the line
        }));

        if (animal.birthWeight) {
            chartData.unshift({ age: 0, [animal.id]: animal.birthWeight });
        }

        const milestones = [60, 90, 180, 270]; // Days
        const interpolatedWeights = milestones.map(days => ({
            days,
            weight: getInterpolatedWeight(weighings, animal.birthDate, days) // Use utility function
        }));

        return { animal, gdp, formattedAge, latestWeight, chartData, interpolatedWeights, weaningIndex, precocityIndex };
    }, [animalId, animals, bodyWeighings]); // Recalculate if dependencies change

    if (!animalData) {
        return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Animal no encontrado.</h1></div>;
    }

    const { animal, gdp, formattedAge, latestWeight, chartData, interpolatedWeights, weaningIndex, precocityIndex } = animalData;

    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in pb-12">
            {/* --- CABECERA ACTUALIZADA --- */}
            <header className="flex items-center pt-8 pb-4 px-4 sticky top-0 bg-brand-dark/80 backdrop-blur-md z-10 border-b border-brand-border -mx-4 mb-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                <div className="text-center flex-grow min-w-0">
                    <h1 className="text-3xl font-mono font-bold tracking-tight text-white truncate">{animal.id.toUpperCase()}</h1>
                    {formattedName && (
                        <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                    )}
                    <p className="text-lg text-zinc-400 mt-1">Perfil de Crecimiento</p>
                </div>
                <div className="w-8"></div> {/* Spacer */}
            </header>
            {/* --- FIN CABECERA --- */}


            {/* KPIs Principales */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                <KpiCard icon={Scale} label="Peso Actual" value={latestWeight.toFixed(2)} unit="Kg" />
                <KpiCard icon={TrendingUp} label="GDP General" value={gdp.overall ? (gdp.overall * 1000).toFixed(0) : 'N/A'} unit="g/día" />
                <KpiCard icon={Calendar} label="Edad Actual" value={formattedAge} />
                <KpiCard icon={Hash} label="Nº Pesajes" value={chartData.length > 0 ? chartData.length - (animal.birthWeight ? 1 : 0) : 0} />
            </div>

            {/* KPIs de Índices */}
            {(weaningIndex || precocityIndex) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 px-4">
                    {weaningIndex && (
                        <KpiCard icon={GiPodium} label="Índice Destete (60d)" value={weaningIndex.toFixed(2)} unit="Kg" colorClass="border-amber-400/50"/>
                    )}
                    
                    {/* --- (INICIO) CORRECCIÓN DE ERROR --- */}
                    {/* Se usa 'pesoMinimoDesteteFinal' en lugar de 'pesoMinimoDesteteKg' */}
                    <KpiCard 
                        icon={Check} 
                        label="Meta Destete (Config)" 
                        value={appConfig.pesoMinimoDesteteFinal.toFixed(2)} 
                        unit="Kg" 
                        colorClass="border-blue-400/50"
                    />
                    {/* --- (FIN) CORRECCIÓN DE ERROR --- */}
                    
                    {precocityIndex && (
                        <KpiCard icon={GiFastForwardButton} label="Índice Precocidad (7m)" value={precocityIndex.toFixed(2)} unit="Kg" colorClass="border-amber-400/50"/>
                    )}
                </div>
            )}

            {/* Gráfico Curva de Crecimiento */}
            <div className="px-4">
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Curva de Crecimiento</h3>
                    {chartData.length > 1 ? (
                        <div className="w-full h-64">
                            <ResponsiveContainer>
                                <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} label={{ value: 'Edad (días)', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)'}} />
                                    <YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} label={{ value: 'Peso (Kg)', angle: -90, position: 'insideRight', fill: 'rgba(255,255,255,0.5)' }} domain={['dataMin - 2', 'dataMax + 2']}/>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend verticalAlign="top" height={36}/>
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
                    {chartData.length > 1 ? (
                        <div className="grid grid-cols-2 gap-4">
                            {interpolatedWeights.map(({days, weight}) => (
                                <div key={days} className="bg-black/20 p-3 rounded-lg text-center">
                                    <p className="text-sm text-zinc-400">Peso a los {days} días</p>
                                    <p className="text-xl font-bold text-white">{weight ? `${weight.toFixed(2)} Kg` : '---'}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <p className="text-center text-zinc-500 py-4">Se necesitan más pesajes para estimar los hitos.</p>
                    )}
                </div>
            </div>
        </div>
    );
}