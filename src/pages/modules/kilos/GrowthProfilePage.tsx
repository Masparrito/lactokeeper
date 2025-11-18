// src/pages/modules/kilos/GrowthProfilePage.tsx
// (CORREGIDO: Eliminada la importación 'formatAnimalDisplay' no usada)

import React, { useMemo, useState } from 'react';
import { useData } from '../../../context/DataContext';
import { useGrowthAnalytics } from '../../../hooks/useGrowthAnalytics';
import { calculateGDP, formatAge, getInterpolatedWeight, calculateAgeInDays } from '../../../utils/calculations';
// --- (CORREGIDO) 'formatAnimalDisplay' eliminado de esta línea ---
import { Animal, BodyWeighing } from '../../../db/local';
import {
    ArrowLeft, Scale, TrendingUp, Calendar, CheckCircle, XCircle, MinusCircle, TrendingDown, Clock,
    BarChart2 
} from 'lucide-react';
import { AppConfig } from '../../../types/config';
import { GrowthChartModal } from '../../../components/modals/GrowthChartModal';
import { exportGrowthChartToPDF } from '../../../utils/pdfExporter';


// --- SUB-COMPONENTES DE UI ---
// (Omitidos por brevedad - Sin cambios)
const KpiCard = ({ icon: Icon, label, value, unit }: { icon: React.ElementType, label: string, value: string | number, unit?: string }) => (
    <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border`}>
        <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase"><Icon size={14} /><span>{label}</span></div>
        <p className="text-2xl font-bold text-white mt-1">{value} <span className="text-lg text-zinc-400">{unit}</span></p>
    </div>
);
const LastWeighingCard = ({ date, diff, trend }: { date: string | null, diff: number | null, trend: 'up' | 'down' | 'same' }) => {
    const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : MinusCircle;
    const color = trend === 'up' ? 'text-brand-green' : trend === 'down' ? 'text-brand-red' : 'text-zinc-500';
    if (!date || diff === null) {
        return (
            <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border text-center`}>
                <div className="flex items-center space-x-2 text-zinc-400 font-semibold text-xs uppercase justify-center"><Clock size={14} /><span>Último Pesaje</span></div>
                <p className="text-lg font-bold text-zinc-500 mt-2">Sin pesajes previos</p>
            </div>
        );
    }
    return (
        <div className={`bg-brand-glass backdrop-blur-xl rounded-2xl p-3 border border-brand-border`}>
            <div className="flex items-center justify-between space-x-2 text-zinc-400 font-semibold text-xs uppercase">
                <div className="flex items-center space-x-2"><Clock size={14} /><span>Último Pesaje</span></div>
                <span className="font-normal">{new Date(date + 'T00:00:00Z').toLocaleDateString()}</span>
            </div>
            <div className={`flex items-center space-x-2 mt-1 ${color}`}>
                <Icon size={28} className="flex-shrink-0" />
                <p className="text-3xl font-bold">
                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} <span className="text-xl">Kg</span>
                </p>
                <span className="text-sm text-zinc-400 font-normal">(vs. anterior)</span>
            </div>
        </div>
    );
};
const AgeMilestoneCard = ({ label, target, actual, status }: {
    label: string;
    target: number;
    actual: number | null;
    status: 'met' | 'missed' | 'pending';
}) => {
    const Icon = status === 'met' ? CheckCircle : status === 'missed' ? XCircle : MinusCircle;
    const color = status === 'met' ? 'text-brand-green' : status === 'missed' ? 'text-brand-red' : 'text-zinc-500';
    const bgColor = status === 'met' ? 'bg-green-900/40 border-green-500/50' : status === 'missed' ? 'bg-red-900/40 border-red-500/50' : 'bg-black/20 border-zinc-700';
    return (
        <div className={`rounded-lg p-3 ${bgColor} border`}>
            <div className="flex justify-between items-center">
                <span className="font-semibold text-white">{label}</span>
                <Icon className={color} size={18} />
            </div>
            <div className="flex justify-between items-baseline mt-1">
                <span className="text-xs text-zinc-400">Meta: {target.toFixed(1)} Kg</span>
                <span className={`font-bold text-xl ${color}`}>
                    {actual ? actual.toFixed(1) : '--'} Kg
                </span>
            </div>
        </div>
    );
};
const WeightMilestoneCard = ({ label, targetWeight, targetDays, actualAge, actualWeight, status }: {
    label: string;
    targetWeight: number;
    targetDays: number;
    actualAge: number | null;
    actualWeight?: number | null; 
    status: 'met' | 'missed' | 'pending';
}) => {
    const Icon = status === 'met' ? CheckCircle : status === 'missed' ? XCircle : MinusCircle;
    const color = status === 'met' ? 'text-brand-green' : status === 'missed' ? 'text-brand-red' : 'text-zinc-500';
    const bgColor = status === 'met' ? 'bg-green-900/40 border-green-500/50' : status === 'missed' ? 'bg-red-900/40 border-red-500/50' : 'bg-black/20 border-zinc-700';
    return (
        <div className={`rounded-lg p-3 ${bgColor} border`}>
            <div className="flex justify-between items-center">
                <span className="font-semibold text-white">{label}</span>
                <Icon className={color} size={18} />
            </div>
            <div className="flex justify-between items-baseline mt-1">
                <span className="text-xs text-zinc-400">
                    Meta: {targetWeight.toFixed(1)} Kg en {targetDays.toFixed(0)} Días
                </span>
                <div className="text-right">
                    {actualWeight && (
                        <span className={`font-bold text-xl ${color}`}>
                            {actualWeight.toFixed(1)} Kg
                        </span>
                    )}
                    <span className={`font-bold text-xl ${color} ${actualWeight ? 'block text-base' : ''}`}>
                        {actualAge ? `${actualAge.toFixed(0)} Días` : '--'}
                    </span>
                </div>
            </div>
        </div>
    );
};
const ScoreBar = ({ label, value, total, unit, colorClass }: {
    label: string;
    value: number;
    total: number;
    unit: string;
    colorClass: string;
}) => {
    const percentage = (value / total) * 100;
    return (
        <div>
            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                <span className={`text-lg font-bold ${colorClass}`}>
                    {value.toFixed(1)} <span className="text-sm font-normal text-zinc-400">/ {total} {unit}</span>
                </span>
            </div>
            <div className="w-full bg-black/30 rounded-full h-3 border border-zinc-700">
                <div
                    className={`h-3 rounded-full ${colorClass} transition-all duration-500`}
                    style={{ width: `${Math.min(Math.max(percentage, 0), 100)}%`, background: colorClass.startsWith('text-') ? 'currentColor' : colorClass }}
                ></div>
            </div>
        </div>
    );
};
const DeviationBar = ({ label, value, colorClass }: {
    label: string;
    value: number;
    colorClass: string;
}) => {
    const percentage = Math.abs(value * 100);
    const isPositive = value >= 0;
    const labelText = `${isPositive ? '+' : ''}${(value * 100).toFixed(0)}%`;
    return (
        <div>
            <div className="flex justify-between items-baseline mb-1.5">
                <span className="text-sm font-medium text-zinc-300">{label}</span>
                <span className={`text-2xl font-bold ${colorClass}`}>
                    {labelText}
                </span>
            </div>
            <div className="w-full h-3 flex items-center">
                <div className="flex-1 flex justify-end bg-brand-red/30 rounded-l-full border-y border-l border-red-800/50">
                    {!isPositive && (
                        <div 
                            className="h-3 bg-brand-red rounded-l-full"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                    )}
                </div>
                <div className="w-0.5 h-3 bg-zinc-500" />
                <div className="flex-1 flex justify-start bg-brand-green/30 rounded-r-full border-y border-r border-green-800/50">
                    {isPositive && (
                        <div 
                            className="h-3 bg-brand-green rounded-r-full"
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                    )}
                </div>
            </div>
            <p className="text-xs text-zinc-500 text-center mt-1">0% (Promedio Cohorte)</p>
        </div>
    );
};
const GrowthIndexCard = ({ deviation, cohortDeviation, herdPercentile }: {
    deviation: number;
    cohortDeviation: number;
    herdPercentile: number;
}) => {
    
    const getScoreStyle = (value: number, total: number) => {
        const ratio = value / total;
        if (ratio >= 0.9) return 'text-brand-green';
        if (ratio >= 0.75) return 'text-yellow-400';
        return 'text-brand-red';
    };
    const getDeviationStyle = (dev: number) => {
        if (dev >= 1.05) return 'text-brand-green';
        if (dev >= 0.95) return 'text-zinc-300';
        if (dev >= 0.8) return 'text-yellow-400';
        return 'text-brand-red';
    };
    const metaScore = (deviation * 10);
    const metaColor = getScoreStyle(metaScore, 10);
    const percentileScore = (herdPercentile * 100);
    const percentileColor = getScoreStyle(percentileScore, 100);
    const cohortValue = cohortDeviation - 1.0;
    const cohortColor = getDeviationStyle(cohortDeviation);
    return (
        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
            <h3 className="text-lg font-semibold text-white mb-4">Índice de Crecimiento</h3>
            <div className="space-y-6">
                <ScoreBar
                    label="Cumplimiento vs. Meta"
                    value={metaScore}
                    total={10}
                    unit="Puntos"
                    colorClass={metaColor}
                />
                <ScoreBar
                    label="Percentil vs. Rebaño"
                    value={percentileScore}
                    total={100}
                    unit="Percentil"
                    colorClass={percentileColor}
                />
                <DeviationBar 
                    label="Rendimiento vs. Cohorte"
                    value={cohortValue}
                    colorClass={cohortColor}
                />
            </div>
        </div>
    );
};


// --- COMPONENTE PRINCIPAL ---
interface GrowthProfilePageProps {
  animalId: string;
  onBack: () => void;
}

export default function GrowthProfilePage({ animalId, onBack }: GrowthProfilePageProps) {
    const { animals, bodyWeighings, appConfig } = useData();
    
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const { animals: analyzedAnimals } = useGrowthAnalytics();
    const analyzedAnimal = useMemo(() => {
        return analyzedAnimals.find((a: { id: string }) => a.id === animalId);
    }, [animalId, analyzedAnimals]);


    const animalData = useMemo(() => {
        const animal = animals.find((a: Animal) => a.id === animalId);
        if (!animal) return null;

        const weighings = bodyWeighings
            .filter((w: BodyWeighing) => w.animalId === animal.id)
            .sort((a: BodyWeighing, b: BodyWeighing) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const allWeighingPoints: BodyWeighing[] = [...weighings];
        if (animal.birthWeight && animal.birthDate) {
            allWeighingPoints.unshift({
                id: 'birth_weight', 
                animalId: animal.id,
                date: animal.birthDate, 
                kg: animal.birthWeight, 
                userId: animal.userId,
                _synced: true 
            });
        }

        const gdp = calculateGDP(animal.birthDate, animal.birthWeight, weighings);
        
        const formattedAge = formatAge(animal.birthDate);
        const ageInDays = calculateAgeInDays(animal.birthDate);
        const latestWeight = weighings.length > 0 ? weighings[weighings.length - 1].kg : animal.birthWeight || 0;

        const lastW = weighings.length > 0 ? weighings[weighings.length - 1] : null;
        const secondLastW = weighings.length > 1 ? weighings[weighings.length - 2] : null;
        const baselineWeight = secondLastW ? secondLastW.kg : (animal.birthWeight || null);
        const lastWeighingDiff = lastW && baselineWeight !== null ? lastW.kg - baselineWeight : null;
        const lastWeighingDate = lastW ? lastW.date : null;
        const lastWeighingTrend: 'up' | 'down' | 'same' = (lastWeighingDiff || 0) > 0.1 ? 'up' : (lastWeighingDiff || 0) < -0.1 ? 'down' : 'same';
        const lastWeighingInfo = { date: lastWeighingDate, diff: lastWeighingDiff, trend: lastWeighingTrend };


        const getAgeAtWeight = (targetWeight: number): number | null => {
            if (!allWeighingPoints || allWeighingPoints.length < 1) return null;
            
            const allPoints = allWeighingPoints.map(w => ({ date: w.date, kg: w.kg }));
            
            for (let i = 0; i < allPoints.length - 1; i++) {
                const p1 = allPoints[i];
                const p2 = allPoints[i+1];

                if (!p1.kg || !p2.kg) continue;
                
                if (p1.kg <= targetWeight && p2.kg >= targetWeight) {
                    const weightRange = p2.kg - p1.kg;
                    if (weightRange === 0) continue; 
                    
                    const weightDiff = targetWeight - p1.kg;
                    const percentOfRange = weightDiff / weightRange;
                    
                    const d1 = new Date(p1.date + 'T00:00:00Z').getTime();
                    const d2 = new Date(p2.date + 'T00:00:00Z').getTime();
                    const timeRange = d2 - d1;
                    
                    const interpolatedTime = d1 + (timeRange * percentOfRange);
                    const birthTime = new Date(animal.birthDate + 'T00:00:00Z').getTime();
                    
                    const ageInDaysAtWeight = (interpolatedTime - birthTime) / (1000 * 60 * 60 * 24);
                    return ageInDaysAtWeight;
                }
            }
            return null;
        };

        const getTarget = (key: keyof AppConfig, defaultVal: number): number => {
            const configValue = Number(appConfig[key]);
            return isNaN(configValue) ? defaultVal : configValue;
        };
        
        const targetWeaningWeight = (animal.sex === 'Macho' && appConfig.growthGoalWeaningWeightMale) 
            ? getTarget('growthGoalWeaningWeightMale', 16) 
            : getTarget('pesoMinimoDesteteFinal', 15);
        const targetWeaningDays = getTarget('diasMetaDesteteFinal', 60);
        
        const target90d = (animal.sex === 'Macho' && appConfig.growthGoal90dWeightMale) 
            ? getTarget('growthGoal90dWeightMale', 22) 
            : getTarget('growthGoal90dWeight', 20);
        
        const target180d = (animal.sex === 'Macho' && appConfig.growthGoal180dWeightMale) 
            ? getTarget('growthGoal180dWeightMale', 30) 
            : getTarget('growthGoal180dWeight', 28);
        
        const target270d = getTarget('growthGoal270dWeight', 34);

        const targetServiceWeight = getTarget('pesoPrimerServicioKg', 38);
        const targetServiceDays = getTarget('edadPrimerServicioMeses', 10) * 30.44;
        
        const targetBirth = getTarget('growthGoalBirthWeight', 3.5);

        const ageMilestoneData = [
            { label: 'Peso a 90 Días', days: 90, target: target90d },
            { label: 'Peso a 180 Días', days: 180, target: target180d },
            { label: 'Peso a 270 Días', days: 270, target: target270d },
        ].map(milestone => {
            const actual = getInterpolatedWeight(allWeighingPoints, animal.birthDate, milestone.days);
            
            let status: 'met' | 'missed' | 'pending' = 'pending';
            if (actual) {
                status = actual >= milestone.target ? 'met' : 'missed';
            } else if (ageInDays > milestone.days) {
                status = 'missed';
            }
            return { ...milestone, actual, status };
        });

        const actualWeaningAge = animal.weaningDate ? calculateAgeInDays(animal.birthDate, animal.weaningDate) : null;
        const actualWeaningWeight = animal.weaningWeight || null;
        let statusWeaning: 'met' | 'missed' | 'pending' = 'pending';
        
        if (actualWeaningAge && actualWeaningWeight) {
            statusWeaning = (actualWeaningAge <= targetWeaningDays && actualWeaningWeight >= targetWeaningWeight) ? 'met' : 'missed';
        } else if (ageInDays > targetWeaningDays + 30) {
            statusWeaning = 'missed';
        }

        const desteteHito = {
            label: 'Meta Destete',
            targetWeight: targetWeaningWeight,
            targetDays: targetWeaningDays,
            actualAge: actualWeaningAge,
            actualWeight: actualWeaningWeight,
            status: statusWeaning
        };
        
        const actualServiceAge = getAgeAtWeight(targetServiceWeight);
        let statusService: 'met' | 'missed' | 'pending' = 'pending';

        if (actualServiceAge) {
            statusService = actualServiceAge <= targetServiceDays ? 'met' : 'missed';
        } else if (latestWeight > targetServiceWeight) {
            statusService = 'missed';
        } else if (ageInDays > targetServiceDays + 30) {
            statusService = 'missed';
        }

        const servicioHito = {
            label: 'Meta 1er Servicio',
            targetWeight: targetServiceWeight,
            targetDays: targetServiceDays,
            actualAge: actualServiceAge,
            actualWeight: null,
            status: statusService
        };

        const weightMilestoneData = [desteteHito, servicioHito];


        // Lógica de Gráfico
        const realChartData = weighings.map((w: BodyWeighing) => ({
            age: Math.max(0, (new Date(w.date).getTime() - new Date(animal.birthDate + 'T00:00:00Z').getTime()) / (1000 * 60 * 60 * 24)),
            [animal.id]: w.kg,
        }));
        if (animal.birthWeight) {
            realChartData.unshift({ age: 0, [animal.id]: animal.birthWeight });
        }
        
        const targetCurve = [
            { age: 0, Meta: targetBirth },
            { age: targetWeaningDays, Meta: targetWeaningWeight },
            { age: 90, Meta: target90d },
            { age: 180, Meta: target180d },
            { age: 270, Meta: target270d },
            { age: targetServiceDays, Meta: targetServiceWeight },
        ];
        
        const allAges = new Set([
            ...realChartData.map((d: { age: number }) => d.age), 
            ...targetCurve.map((d: { age: number }) => d.age)
        ]);
        
        const combinedChartData = Array.from(allAges).sort((a: number, b: number) => a - b).map(age => {
            const realPoint = realChartData.find((p: { age: number }) => p.age === age);
            const targetPoint = targetCurve.find((p: { age: number }) => p.age === age);
            return {
                age: age,
                [animal.id]: realPoint ? realPoint[animal.id] : undefined,
                Meta: targetPoint ? targetPoint.Meta : undefined,
            };
        });
        
        targetCurve.forEach(point => {
            const existing = combinedChartData.find((p: { age: number }) => p.age === point.age);
            if (existing && existing.Meta === undefined) {
                existing.Meta = point.Meta;
            }
        });

        return { animal, gdp, formattedAge, latestWeight, chartData: combinedChartData, ageMilestoneData, weightMilestoneData, lastWeighingInfo };
    }, [animalId, animals, bodyWeighings, appConfig]);

    const handleExportPDF = async (chartRef: React.RefObject<HTMLDivElement>) => {
        if (!chartRef.current || !animalData) {
            alert("Error: No se pudo encontrar el gráfico para exportar.");
            return;
        }
        setIsExporting(true);
        try {
            await exportGrowthChartToPDF(chartRef.current, animalData.animal);
        } catch (error) {
            console.error("Error al exportar PDF:", error);
            alert("Ocurrió un error al generar el PDF.");
        } finally {
            setIsExporting(false);
        }
    };


    if (!animalData || !analyzedAnimal) {
        return (
            <div className="w-full max-w-2xl mx-auto">
                 <header className="flex items-center pt-8 pb-4 px-4 sticky top-0 bg-brand-dark/80 backdrop-blur-md z-10 border-b border-brand-border -mx-4 mb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                </header>
                <div className="text-center p-10"><h1 className="text-2xl text-zinc-400">Animal no encontrado o sin datos de crecimiento.</h1></div>
            </div>
        );
    }

    const { animal, gdp, formattedAge, latestWeight, chartData, ageMilestoneData, weightMilestoneData, lastWeighingInfo } = animalData;
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';
    const hasEnoughData = chartData.filter(d => d[animal.id] !== undefined).length >= 2;

    return (
        <>
            <div className="w-full mx-auto space-y-4 animate-fade-in pb-12 overflow-x-hidden">
                <header className="flex items-center pt-8 pb-4 px-4 sticky top-0 bg-brand-dark/80 backdrop-blur-md z-10 border-b border-brand-border -mx-4 mb-4">
                    <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors"><ArrowLeft size={24} /></button>
                    <div className="text-center flex-grow min-w-0">
                        <h1 className="text-3xl font-mono font-bold tracking-tight text-white truncate">{animal.id.toUpperCase()}</h1>
                        {formattedName && (
                            <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                        )}
                        <p className="text-lg text-zinc-400 mt-1">Perfil de Crecimiento</p>
                    </div>
                    <div className="w-8"></div>
                </header>

                {/* 1. KPIs Principales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-4 max-w-3xl mx-auto">
                    <div className="md:col-span-3">
                        <LastWeighingCard 
                            date={lastWeighingInfo.date}
                            diff={lastWeighingInfo.diff}
                            trend={lastWeighingInfo.trend}
                        />
                    </div>
                    <KpiCard icon={Scale} label="Peso Actual" value={latestWeight.toFixed(2)} unit="Kg" />
                    <KpiCard icon={Calendar} label="Edad Actual" value={formattedAge} />
                    <KpiCard icon={TrendingUp} label="GDP General" value={gdp.overall ? (gdp.overall * 1000).toFixed(0) : 'N/A'} unit="g/día" />
                </div>

                {/* 2. Índice de Crecimiento */}
                <div className="px-4 max-w-3xl mx-auto">
                    <GrowthIndexCard 
                        deviation={analyzedAnimal.targetDeviation}
                        cohortDeviation={analyzedAnimal.herdDeviation}
                        herdPercentile={analyzedAnimal.herdPercentile}
                    />
                </div>

                {/* 3. Hitos */}
                <div className="px-4 max-w-3xl mx-auto">
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                        <h3 className="text-lg font-semibold text-white mb-4">Hitos de Crecimiento (Peso Ajustado a Edad)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {ageMilestoneData.map(milestone => (
                                <AgeMilestoneCard 
                                    key={milestone.label}
                                    label={milestone.label}
                                    target={milestone.target}
                                    actual={milestone.actual}
                                    status={milestone.status}
                                />
                            ))}
                        </div>
                    </div>
                </div>
                
                <div className="px-4 max-w-3xl mx-auto">
                    <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-4 border border-brand-border">
                        <h3 className="text-lg font-semibold text-white mb-4">Hitos de Madurez (Edad Ajustada a Peso)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {weightMilestoneData.map(milestone => (
                                <WeightMilestoneCard
                                    key={milestone.label}
                                    label={milestone.label}
                                    targetWeight={milestone.targetWeight}
                                    targetDays={milestone.targetDays}
                                    actualAge={milestone.actualAge}
                                    actualWeight={milestone.actualWeight}
                                    status={milestone.status}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* 4. Botón del Gráfico */}
                <div className="px-4 max-w-3xl mx-auto">
                    <button
                        onClick={() => setIsChartModalOpen(true)}
                        disabled={!hasEnoughData}
                        className="w-full bg-brand-glass hover:border-brand-orange border border-brand-border rounded-2xl p-4 text-center text-brand-orange font-semibold transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:border-brand-border disabled:text-zinc-500"
                    >
                        <BarChart2 size={20} />
                        <span>Ver Curva de Crecimiento</span>
                    </button>
                    {!hasEnoughData && (
                        <p className="text-center text-zinc-500 text-xs mt-2">Se necesitan al menos 2 pesajes (incluyendo el de nacimiento) para mostrar la curva.</p>
                    )}
                </div>
            </div>

            {/* Renderizar el Modal (Solo si hay datos) */}
            {animalData && hasEnoughData && (
                <GrowthChartModal
                    isOpen={isChartModalOpen}
                    onClose={() => setIsChartModalOpen(false)}
                    chartData={chartData}
                    animal={animal}
                    onExportPDF={handleExportPDF}
                    isExporting={isExporting}
                />
            )}
        </>
    );
}