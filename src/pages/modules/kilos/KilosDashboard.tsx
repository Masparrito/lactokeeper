import { useMemo } from 'react'; // Se elimina la importación innecesaria de 'React'
import { useData } from '../../../context/DataContext';
// --- CORRECCIÓN: Se añade la importación de 'calculateAgeInDays' ---
import { calculateGDP, calculateGrowthScore, formatAge, calculateAgeInDays } from '../../../utils/calculations';
import { ChevronRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import { CustomTooltip } from '../../../components/ui/CustomTooltip';

// --- SUB-COMPONENTES DE LA PÁGINA ---

const GDPTrendIcon = ({ gdp, averageGdp }: { gdp: number, averageGdp: number }) => {
    if (!gdp || !averageGdp || averageGdp === 0) return null;
    const diff = gdp / averageGdp;
    if (diff > 1.1) return <TrendingUp size={18} className="text-brand-green" />;
    if (diff < 0.9) return <TrendingDown size={18} className="text-brand-red" />;
    return <Minus size={18} className="text-zinc-500" />;
};

const AnimalRow = ({ animal, onSelect, averageGdp }: { animal: any, onSelect: (id: string) => void, averageGdp: number }) => {
    return (
        <button onClick={() => onSelect(animal.id)} className="w-full text-left bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border flex justify-between items-center hover:border-brand-green transition-colors">
            <div>
                <p className="font-bold text-lg text-white">{animal.id}</p>
                <p className="text-sm text-zinc-400 mt-1">{animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'N/A'}</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="text-right">
                    <p className="font-semibold text-white">{(animal.gdp.overall * 1000).toFixed(0)} <span className="text-sm text-zinc-400">g/día</span></p>
                    <p className={`font-bold text-sm ${animal.classification === 'Sobresaliente' ? 'text-brand-green' : animal.classification === 'Pobre' ? 'text-brand-red' : 'text-zinc-400'}`}>{animal.classification}</p>
                </div>
                <GDPTrendIcon gdp={animal.gdp.overall} averageGdp={averageGdp} />
                <ChevronRight className="text-zinc-600" />
            </div>
        </button>
    );
};

// --- COMPONENTE PRINCIPAL DEL DASHBOARD DE KILOS ---
export default function KilosDashboard({ onSelectAnimal }: { onSelectAnimal: (animalId: string) => void }) {
    const { animals, bodyWeighings } = useData();

    const analysis = useMemo(() => {
        const animalsInGrowth = animals.filter(a => 
            ['Cabrita', 'Cabritona', 'Cabrito', 'Macho de Levante'].includes(a.lifecycleStage)
        );

        if (animalsInGrowth.length === 0) {
            return { analyzedAnimals: [], distribution: [], averageGdp: 0 };
        }

        let totalGdp = 0;
        let animalsWithGdpCount = 0;

        const analyzedAnimals = animalsInGrowth.map(animal => {
            const weighings = bodyWeighings.filter(w => w.animalId === animal.id);
            const gdp = calculateGDP(animal.birthWeight, weighings);
            if(gdp.overall && gdp.overall > 0) {
                totalGdp += gdp.overall;
                animalsWithGdpCount++;
            }
            return {
                ...animal,
                formattedAge: formatAge(animal.birthDate),
                gdp,
            };
        });

        const averageGdp = animalsWithGdpCount > 0 ? totalGdp / animalsWithGdpCount : 0;

        const withScore = analyzedAnimals.map(animal => ({
            ...animal,
            score: animal.gdp.overall ? calculateGrowthScore(animal.gdp.overall, averageGdp, calculateAgeInDays(animal.birthDate)) : 0,
        }));

        const validScores = withScore.filter(a => a.score > 0).map(a => a.score);
        const mean = validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
        const stdDev = validScores.length > 0 ? Math.sqrt(validScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / validScores.length) : 0;

        const POOR_THRESHOLD = mean - (0.4 * stdDev);
        const EXCELLENT_THRESHOLD = mean + (0.4 * stdDev);
        
        const classified = withScore.map(animal => {
            let classification: 'Pobre' | 'Promedio' | 'Sobresaliente' = 'Promedio';
            if (animal.score > 0 && stdDev > 1) { 
                if (animal.score < POOR_THRESHOLD) classification = 'Pobre';
                else if (animal.score > EXCELLENT_THRESHOLD) classification = 'Sobresaliente';
            }
            return { ...animal, classification };
        });

        const distribution = [
            { name: 'Pobre', count: classified.filter(a => a.classification === 'Pobre').length, fill: '#FF3B30' },
            { name: 'Promedio', count: classified.filter(a => a.classification === 'Promedio').length, fill: '#6B7280' },
            { name: 'Sobresaliente', count: classified.filter(a => a.classification === 'Sobresaliente').length, fill: '#34C759' },
        ];

        return { analyzedAnimals: classified.sort((a,b) => b.score - a.score), distribution, averageGdp };

    }, [animals, bodyWeighings]);

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in">
            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <div className="flex items-center space-x-2 text-zinc-400 font-semibold mb-2 text-xs uppercase tracking-wider"><TrendingUp /><span>GDP Promedio del Levante</span></div>
                <p className="text-4xl font-bold tracking-tight text-white">{(analysis.averageGdp * 1000).toFixed(0)} <span className="text-2xl font-medium text-zinc-400">g/día</span></p>
            </div>

            <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                <h3 className="text-lg font-semibold text-white mb-4">Distribución del Crecimiento</h3>
                <div className="w-full h-48">
                    <ResponsiveContainer>
                        <BarChart data={analysis.distribution} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <YAxis orientation="left" tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }} />
                            <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255, 255, 255, 0.05)'}} />
                            <Bar dataKey="count" >{analysis.distribution.map(entry => <Cell key={entry.name} fill={entry.fill} />)}</Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="space-y-2 pt-4">
                <h3 className="text-lg font-semibold text-zinc-300 ml-1">Animales en Levante ({analysis.analyzedAnimals.length})</h3>
                {analysis.analyzedAnimals.length > 0 ? (
                    analysis.analyzedAnimals.map(animal => (
                        <AnimalRow key={animal.id} animal={animal} onSelect={() => onSelectAnimal(animal.id)} averageGdp={analysis.averageGdp} />
                    ))
                ) : (
                    <div className="text-center py-10 bg-brand-glass rounded-2xl">
                        <p className="text-zinc-500">No hay animales en fase de levante o no se han registrado pesajes.</p>
                    </div>
                )}
            </div>
        </div>
    );
}