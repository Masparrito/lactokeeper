// src/pages/modules/kilos/GrowthProfilePage.tsx

import React, { useMemo } from 'react';
import { useData } from '../../../context/DataContext';
// --- CAMBIO CLAVE 1: Se importan las nuevas funciones de cálculo ---
import { calculateGDP, formatAge, getInterpolatedWeight, calculateWeaningIndex, calculatePrecocityIndex } from '../../../utils/calculations';
import { ArrowLeft, Scale, TrendingUp, Calendar, Hash } from 'lucide-react';
// --- CAMBIO CLAVE 2: Se importan íconos para los nuevos KPIs ---
import { GiPodium, GiFastForwardButton } from 'react-icons/gi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';


// --- SUB-COMPONENTES DE UI (KpiCard, CustomTooltip sin cambios) ---
const KpiCard = ({ icon: Icon, label, value, unit, colorClass }: { icon: React.ElementType, label: string, value: string | number, unit?: string, colorClass?: string }) => (
    <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border ${colorClass || ''}`}>
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Icon size={14} /><span>{label}</span></div>
        <p className="text-2xl font-bold text-white">{value} <span className="text-lg text-zinc-400">{unit}</span></p>
    </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-black/50 backdrop-blur-xl p-3 rounded-lg border border-brand-border text-white">
                <p className="label text-brand-light-gray text-sm">Edad: {label} días</p>
                {payload.map((p: any) => (
                    <p key={p.name} style={{ color: p.color }} className="font-bold text-base">
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
  animalId: string;
  onBack: () => void;
}

export default function GrowthProfilePage({ animalId, onBack }: GrowthProfilePageProps) {
    const { animals, bodyWeighings } = useData();

    const animalData = useMemo(() => {
        const animal = animals.find(a => a.id === animalId);
        if (!animal) return null;

        const weighings = bodyWeighings
            .filter(w => w.animalId === animal.id)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const gdp = calculateGDP(animal.birthWeight, weighings);
        const formattedAge = formatAge(animal.birthDate);
        const latestWeight = weighings.length > 0 ? weighings[weighings.length - 1].kg : animal.birthWeight || 0;
        
        // --- CAMBIO CLAVE 3: Se calculan los nuevos índices ---
        const weaningIndex = calculateWeaningIndex(animal);
        const precocityIndex = calculatePrecocityIndex(animal, weighings);
        
        const chartData = weighings.map(w => ({
            age: (new Date(w.date).getTime() - new Date(animal.birthDate).getTime()) / (1000 * 60 * 60 * 24),
            [animal.id]: w.kg,
        }));
        
        if (animal.birthWeight) {
            chartData.unshift({ age: 0, [animal.id]: animal.birthWeight });
        }

        const milestones = [60, 90, 180, 270];
        const interpolatedWeights = milestones.map(days => ({
            days,
            weight: getInterpolatedWeight(weighings, animal.birthDate, days)
        }));

        return { animal, gdp, formattedAge, latestWeight, chartData, interpolatedWeights, weaningIndex, precocityIndex };
    }, [animalId, animals, bodyWeighings]);

    if (!animalData) {
        return <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Animal no encontrado.</h1></div>;
    }

    const { animal, gdp, formattedAge, latestWeight, chartData, interpolatedWeights, weaningIndex, precocityIndex } = animalData;

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in pb-12">
            <header className="flex items-center pt-8 pb-4 px-4">
                <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                <div className="text-center flex-grow">
                    <h1 className="text-3xl font-bold tracking-tight text-white">{animal.id}</h1>
                    <p className="text-lg text-zinc-400">Perfil de Crecimiento</p>
                </div>
                <div className="w-8"></div>
            </header>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-4">
                <KpiCard icon={Scale} label="Peso Actual" value={latestWeight.toFixed(2)} unit="Kg" />
                <KpiCard icon={TrendingUp} label="GDP General" value={gdp.overall ? (gdp.overall * 1000).toFixed(0) : 'N/A'} unit="g/día" />
                <KpiCard icon={Calendar} label="Edad Actual" value={formattedAge} />
                <KpiCard icon={Hash} label="Nº Pesajes" value={chartData.length} />
            </div>

            {/* --- CAMBIO CLAVE 4: Se muestran los nuevos KPIs si están disponibles --- */}
            {(weaningIndex || precocityIndex) && (
                <div className="grid grid-cols-2 gap-4 px-4">
                    {weaningIndex && (
                        <KpiCard 
                            icon={GiPodium} 
                            label="Índice Destete (60d)" 
                            value={weaningIndex.toFixed(2)} 
                            unit="Kg" 
                            colorClass="border-amber-400/50"
                        />
                    )}
                    {precocityIndex && (
                        <KpiCard 
                            icon={GiFastForwardButton} 
                            label="Índice Precocidad (7m)" 
                            value={precocityIndex.toFixed(2)} 
                            unit="Kg" 
                            colorClass="border-amber-400/50"
                        />
                    )}
                </div>
            )}


            <div className="px-4">
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Curva de Crecimiento</h3>
                    <div className="w-full h-64">
                        <ResponsiveContainer>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="age" type="number" domain={['dataMin', 'dataMax']} tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} label={{ value: 'Edad (días)', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)'}} />
                                <YAxis orientation="right" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} label={{ value: 'Peso (Kg)', angle: -90, position: 'insideRight', fill: 'rgba(255,255,255,0.5)' }}/>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" height={36}/>
                                <Line type="monotone" dataKey={animal.id} stroke="#34C759" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
            
            <div className="px-4">
                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                    <h3 className="text-lg font-semibold text-white mb-4">Hitos de Crecimiento (Pesos Estimados)</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {interpolatedWeights.map(({days, weight}) => (
                            <div key={days} className="bg-black/20 p-3 rounded-lg text-center">
                                <p className="text-sm text-zinc-400">Peso a los {days} días</p>
                                <p className="text-xl font-bold text-white">{weight ? `${weight.toFixed(2)} Kg` : '---'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}