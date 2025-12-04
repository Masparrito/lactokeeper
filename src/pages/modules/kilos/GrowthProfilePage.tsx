import React, { useMemo, useState } from 'react';
import { useData } from '../../../context/DataContext';
import { 
    calculateGDP, 
    getInterpolatedWeight, 
    calculateAgeInDays,
    getGrowthStatus,
    calculateGrowthScore,
    calculateTargetWeightAtAge
} from '../../../utils/calculations';
import { formatAnimalDisplay } from '../../../utils/formatting';
import {
    ArrowLeft, Scale, Calendar, CheckCircle, XCircle, MinusCircle, AlertCircle,
    BarChart2, Expand, Activity,
    ArrowUpRight, ArrowDownRight, FileQuestion
} from 'lucide-react';
import { Animal, BodyWeighing } from '../../../db/local';
import { AppConfig } from '../../../types/config';
import { GrowthChartModal } from '../../../components/modals/GrowthChartModal';
import { exportGrowthChartToPDF } from '../../../utils/pdfExporter';

interface GrowthProfilePageProps {
    animalId: string;
    onBack: () => void;
}

const MilestoneWidget = ({ label, target, actual, status, subLabel }: {
    label: string;
    target: string;
    actual: string;
    status: 'met' | 'missed' | 'close' | 'pending' | 'no-data';
    subLabel?: string;
}) => {
    const colors = {
        met: { text: 'text-brand-green', bg: 'bg-brand-green/10', border: 'border-brand-green/20', icon: CheckCircle },
        missed: { text: 'text-brand-red', bg: 'bg-brand-red/10', border: 'border-brand-red/20', icon: XCircle },
        close: { text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: AlertCircle },
        pending: { text: 'text-zinc-500', bg: 'bg-zinc-800/50', border: 'border-zinc-700/50', icon: MinusCircle },
        'no-data': { text: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700', icon: FileQuestion }
    };
    const style = colors[status] || colors.pending;
    const Icon = style.icon;
    const valueTextSize = actual.length > 8 ? 'text-lg' : 'text-xl';

    return (
        <div className={`flex flex-col justify-between p-3 rounded-xl border ${style.border} ${style.bg} backdrop-blur-md h-24 relative group transition-all`}>
            <div className="flex justify-between items-start">
                <span className="text-xs font-bold uppercase tracking-wider opacity-70 text-zinc-300">{label}</span>
                <Icon size={15} className={style.text} />
            </div>
            <div>
                <span className={`${valueTextSize} font-bold ${style.text} tracking-tight tabular-nums block truncate`}>{actual}</span>
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-zinc-500 font-medium">Meta: {target}</span>
                    {subLabel && <span className="text-[10px] text-zinc-400 bg-zinc-900/40 px-1.5 py-0.5 rounded text-right font-mono">{subLabel}</span>}
                </div>
            </div>
        </div>
    );
};

const ScoreBar = ({ label, value, total, colorClass }: any) => (
    <div className="py-1">
        <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
            <span className={`text-2xl font-bold ${colorClass} tabular-nums leading-none tracking-tight`}>
                {value.toFixed(1)} <span className="text-xs font-medium text-zinc-600 align-top ml-0.5">/ {total}</span>
            </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div className={`h-full rounded-full ${colorClass} transition-all duration-1000 ease-out shadow-[0_0_12px_currentColor] opacity-90`} style={{ width: `${Math.min(Math.max((value / total) * 100, 0), 100)}%`, backgroundColor: 'currentColor' }}></div>
        </div>
    </div>
);

const HeaderKpi = ({ label, value, unit, icon: Icon, highlight, subValue, isMain }: any) => (
    <div className="flex flex-col justify-between h-full py-1 px-1">
        <div className="flex items-center gap-1.5 mb-1 opacity-70">
            <Icon size={13} className="text-zinc-400" />
            <span className="text-[11px] uppercase text-zinc-400 font-bold tracking-widest">{label}</span>
        </div>
        <div className="flex flex-col">
             <div className="flex items-baseline gap-1">
                <span className={`${isMain ? 'text-4xl' : 'text-2xl'} font-bold ${highlight ? 'text-brand-green' : 'text-white'} tracking-tighter tabular-nums leading-none`}>
                    {value}
                </span>
                {unit && <span className={`text-xs font-medium text-zinc-500 ${isMain ? 'mb-1' : ''}`}>{unit}</span>}
            </div>
            <div className="mt-2 h-5 flex items-center">
                {subValue || <span className="opacity-0">-</span>}
            </div>
        </div>
    </div>
);

const GrowthIndexCard = ({ score, weightGap, targetWeight, currentWeight }: any) => {
    const getScoreColor = (s: number) => {
        if (s >= 9.0) return 'text-brand-green';
        if (s >= 7.0) return 'text-yellow-400';
        return 'text-brand-red';
    };
    const scoreColor = getScoreColor(score);
    const gapColor = weightGap >= -0.5 ? 'text-brand-green' : 'text-brand-red';
    const gapSign = weightGap > 0 ? '+' : '';

    return (
        <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-5 border border-brand-border/30 shadow-sm">
            <div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-3">
                <div className="p-1.5 bg-brand-blue/10 rounded-lg">
                    <Activity size={16} className="text-brand-blue" />
                </div>
                <h3 className="text-sm font-bold text-zinc-200">Desempeño vs. Meta</h3>
            </div>
            <div className="space-y-6">
                <ScoreBar label="Puntaje de Desarrollo" value={score} total={10} unit="Pts" colorClass={scoreColor} />
                <div className="grid grid-cols-2 gap-8 pt-2">
                    <div className="flex flex-col justify-end">
                        <p className="text-xs uppercase text-zinc-500 font-bold tracking-wider mb-1">Brecha Peso</p>
                        <div className="flex items-baseline gap-1">
                            <p className={`text-3xl font-bold ${gapColor} tabular-nums tracking-tight`}>
                                {gapSign}{weightGap.toFixed(1)}
                            </p>
                            <span className="text-sm text-zinc-500 font-medium">Kg</span>
                        </div>
                        <p className="text-xs text-zinc-500 mt-1">Diferencia vs Ideal</p>
                    </div>
                    <div className="flex flex-col gap-3 border-l border-white/5 pl-6">
                        <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide block mb-0.5">Meta Hoy</span>
                            <span className="font-mono font-medium text-sm text-zinc-300 block">
                                {targetWeight.toFixed(1)} <span className="text-xs text-zinc-500 font-sans">Kg</span>
                            </span>
                        </div>
                        <div>
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wide block mb-0.5">Peso Real</span>
                            <span className={`font-mono font-bold text-lg block leading-none ${gapColor}`}>
                                {currentWeight.toFixed(1)} <span className="text-xs text-zinc-500 font-sans">Kg</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default function GrowthProfilePage({ animalId, onBack }: GrowthProfilePageProps) {
    const { animals, bodyWeighings, appConfig, events } = useData();
    
    const [isChartModalOpen, setIsChartModalOpen] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    
    const animalData = useMemo(() => {
        const animal = animals.find((a: Animal) => a.id === animalId);
        if (!animal) return null;

        const weighings = bodyWeighings
            .filter((w: BodyWeighing) => w.animalId === animal.id)
            .sort((a: BodyWeighing, b: BodyWeighing) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const allWeighingPoints: BodyWeighing[] = [...weighings];
        if (animal.birthWeight && animal.birthDate) {
            allWeighingPoints.unshift({ 
                id: 'birth', 
                animalId: animal.id, 
                date: animal.birthDate, 
                kg: animal.birthWeight, 
                userId: animal.userId, 
                _synced: true 
            });
        }

        const gdp = calculateGDP(animal.birthDate, animal.birthWeight, weighings);
        const ageInDays = calculateAgeInDays(animal.birthDate);
        const latestWeight = weighings.length > 0 ? weighings[weighings.length - 1].kg : animal.birthWeight || 0;
        const lastW = weighings.length > 0 ? weighings[weighings.length - 1] : null;
        const secondLastW = weighings.length > 1 ? weighings[weighings.length - 2] : null;
        const lastDiff = lastW && secondLastW ? lastW.kg - secondLastW.kg : null;
        
        const birthDateObj = new Date(animal.birthDate + 'T00:00:00Z');
        const birthDateFormatted = !isNaN(birthDateObj.getTime()) 
            ? birthDateObj.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }) 
            : 'N/A';

        const getTarget = (key: keyof AppConfig, def: number) => Number(appConfig[key]) || def;
        
        const targets = {
            w90: { days: 90, kg: getTarget(animal.sex === 'Macho' ? 'growthGoal90dWeightMale' : 'growthGoal90dWeight', 20) },
            w180: { days: 180, kg: getTarget(animal.sex === 'Macho' ? 'growthGoal180dWeightMale' : 'growthGoal180dWeight', 28) },
            w270: { days: 270, kg: getTarget('growthGoal270dWeight', 34) },
            wean: { days: getTarget('diasMetaDesteteFinal', 60), kg: getTarget(animal.sex === 'Macho' ? 'growthGoalWeaningWeightMale' : 'pesoMinimoDesteteFinal', 15) },
            serv: { days: Math.floor(getTarget('edadPrimerServicioMeses', 10) * 30.44), kg: getTarget('pesoPrimerServicioKg', 38) }
        };

        const statusCheck = getGrowthStatus(animal, weighings, appConfig, events);
        const milestoneStatus = statusCheck.milestoneStatus;

        const getWeightAt = (days: number) => getInterpolatedWeight(allWeighingPoints, animal.birthDate, days);
        const formatW = (val: number | null) => val ? `${val.toFixed(1)} Kg` : '--';

        const milestones = {
            d90: { actual: formatW(getWeightAt(90)), target: `${targets.w90.kg} Kg`, status: milestoneStatus.d90 },
            d180: { actual: formatW(getWeightAt(180)), target: `${targets.w180.kg} Kg`, status: milestoneStatus.d180 },
            d270: { actual: formatW(getWeightAt(270)), target: `${targets.w270.kg} Kg`, status: milestoneStatus.d270 },
        };

        // --- LÓGICA DE SERVICIO ---
        const serviceEvent = events.find(e => e.animalId === animal.id && e.type === 'Peso de Monta');
        const historicalQualifier = allWeighingPoints.find(w => w.kg >= targets.serv.kg);
        
        let servStatus: any = milestoneStatus.service; 
        let servActual = '--';
        let servSubLabel = undefined;

        if (serviceEvent) {
            const daysAtEvent = calculateAgeInDays(animal.birthDate, serviceEvent.date);
            if (serviceEvent.metaWeight === -1) {
                servActual = 'Sin Dato';
                servSubLabel = 'Declarado';
                servStatus = 'no-data';
            } else {
                servActual = `${serviceEvent.metaWeight} Kg`;
                servSubLabel = `${daysAtEvent} días`;
            }
        } 
        else {
            if (historicalQualifier) {
                servActual = `${historicalQualifier.kg} Kg`;
                const daysAtQualifier = calculateAgeInDays(animal.birthDate, historicalQualifier.date);
                servSubLabel = `${daysAtQualifier} días`; 
            } else {
                servSubLabel = `Meta: ${targets.serv.days}d`;
            }
        }
        
        // --- DESTETE ---
        let weanSubLabel = undefined;
        if (animal.weaningDate) {
            const weanAge = calculateAgeInDays(animal.birthDate, animal.weaningDate);
            weanSubLabel = `${weanAge} días`; 
        } else {
            weanSubLabel = `Meta: ${targets.wean.days}d`; 
        }

        const specialMilestones = {
            wean: { 
                actual: animal.weaningWeight ? `${animal.weaningWeight} Kg` : '--', 
                sub: weanSubLabel, 
                status: milestoneStatus.weaning, 
                target: `${targets.wean.kg} Kg` 
            },
            serv: {
                actual: servActual, 
                sub: servSubLabel,
                status: servStatus, 
                target: `${targets.serv.kg} Kg`
            }
        };
        
        const metaCurve = [
            { age: 0, Meta: getTarget('growthGoalBirthWeight', 3.5) },
            { age: targets.wean.days, Meta: targets.wean.kg },
            { age: 90, Meta: targets.w90.kg },
            { age: 180, Meta: targets.w180.kg },
            { age: 270, Meta: targets.w270.kg },
            { age: targets.serv.days, Meta: targets.serv.kg },
        ];
        
        const allAges = new Set([...allWeighingPoints.map(d => calculateAgeInDays(animal.birthDate, d.date)), ...metaCurve.map(d => d.age)]);
        const combinedChartData = Array.from(allAges).sort((a, b) => a - b).map(age => {
            const realPoint = allWeighingPoints.find(w => Math.abs(calculateAgeInDays(animal.birthDate, w.date) - age) < 2);
            const metaVal = calculateTargetWeightAtAge(age, animal.sex, appConfig);
            return {
                age,
                [animal.id]: realPoint ? realPoint.kg : undefined,
                Meta: metaVal
            };
        });

        const targetWeightToday = calculateTargetWeightAtAge(ageInDays, animal.sex, appConfig);
        const score = calculateGrowthScore(latestWeight, targetWeightToday, milestoneStatus);
        const weightGap = parseFloat((latestWeight - targetWeightToday).toFixed(1));

        return { 
            animal, 
            gdp, 
            formattedAgeDays: `${ageInDays}`,
            latestWeight, 
            lastDiff, 
            milestones, 
            specialMilestones, 
            combinedChartData, 
            targets, 
            birthDateFormatted, 
            score, 
            weightGap, 
            targetWeightToday
        };
    }, [animalId, animals, bodyWeighings, appConfig, events]);

    const handleExportPDF = async (chartRef: React.RefObject<HTMLDivElement>) => {
        if (chartRef.current && animalData) {
            setIsExporting(true);
            try {
                await exportGrowthChartToPDF(chartRef.current, animalData.animal);
            } catch (e) { console.error(e); alert("Error al exportar"); } 
            finally { setIsExporting(false); }
        }
    };

    if (!animalData) return <div className="text-center p-10 text-zinc-400">Cargando perfil...</div>;

    const { animal, gdp, formattedAgeDays, latestWeight, lastDiff, milestones, specialMilestones, combinedChartData, targets, birthDateFormatted, score, weightGap, targetWeightToday } = animalData;
    const hasEnoughData = combinedChartData.length >= 2;

    return (
        <div className="w-full max-w-2xl mx-auto space-y-4 animate-fade-in pb-12 overflow-x-hidden px-4 pt-4">
            
            <div className="flex items-center justify-between mb-2">
                <button onClick={onBack} className="text-zinc-400 hover:text-white p-1 -ml-2 transition-colors"><ArrowLeft /></button>
                <h1 className="text-base font-bold text-white tracking-tight opacity-90">{formatAnimalDisplay(animal)}</h1>
                <div className="w-8" />
            </div>

            <div className="bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-800 shadow-xl grid grid-cols-[1.4fr_1fr_1fr] gap-px">
                <div className="bg-zinc-900 p-4 flex flex-col justify-center">
                    <HeaderKpi 
                        label="Peso Actual" 
                        value={latestWeight.toFixed(1)} 
                        unit="Kg" 
                        icon={Scale} 
                        highlight={lastDiff ? lastDiff > 0 : false}
                        isMain={true}
                        subValue={
                            lastDiff !== null && (
                                <div className={`flex items-center gap-1 text-xs font-bold ${lastDiff >= 0 ? 'text-brand-green' : 'text-brand-red'}`}>
                                    {lastDiff >= 0 ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                                    {Math.abs(lastDiff).toFixed(2)} 
                                </div>
                            )
                        }
                    />
                </div>
                <div className="bg-zinc-900 p-3 flex flex-col justify-center">
                    <HeaderKpi 
                        label="G.D.P." 
                        value={gdp.overall ? (gdp.overall * 1000).toFixed(0) : '--'} 
                        unit="g/d" 
                        icon={Activity} 
                        subValue={<span className="text-xs text-zinc-500 font-medium">Promedio Histórico</span>}
                    />
                </div>
                <div className="bg-zinc-900 p-3 flex flex-col justify-center">
                    <HeaderKpi 
                        label="Edad (Días)" 
                        value={formattedAgeDays} 
                        unit="días" 
                        icon={Calendar} 
                        subValue={
                            <div className="flex flex-col leading-tight">
                                <span className="text-xs text-zinc-500">{birthDateFormatted}</span>
                            </div>
                        }
                    />
                </div>
            </div>

            <GrowthIndexCard 
                score={score} 
                weightGap={weightGap}
                targetWeight={targetWeightToday}
                currentWeight={latestWeight}
            />

            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                     <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Hitos de Crecimiento</h3>
                     <button 
                        onClick={() => setIsChartModalOpen(true)}
                        disabled={!hasEnoughData}
                        className="text-xs text-brand-blue font-medium hover:underline flex items-center gap-1 disabled:opacity-50"
                     >
                        Ver Curva <BarChart2 size={12}/>
                     </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    <MilestoneWidget label="90 Días" target={`${targets.w90.kg} Kg`} actual={milestones.d90.actual} status={milestones.d90.status} />
                    <MilestoneWidget label="180 Días" target={`${targets.w180.kg} Kg`} actual={milestones.d180.actual} status={milestones.d180.status} />
                    <MilestoneWidget label="270 Días" target={`${targets.w270.kg} Kg`} actual={milestones.d270.actual} status={milestones.d270.status} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-1">
                    <MilestoneWidget label="Destete" target={`${targets.wean.kg} Kg`} actual={specialMilestones.wean.actual} status={specialMilestones.wean.status} subLabel={specialMilestones.wean.sub} />
                    <MilestoneWidget label="1er Servicio" target={`${targets.serv.kg} Kg`} actual={specialMilestones.serv.actual} status={specialMilestones.serv.status as any} subLabel={specialMilestones.serv.sub} />
                </div>
            </div>

             <button
                onClick={() => setIsChartModalOpen(true)}
                disabled={!hasEnoughData}
                className="w-full mt-4 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl p-3 flex items-center justify-center gap-2 transition-all text-zinc-400 hover:text-white text-sm font-medium"
            >
                <Expand size={14} />
                Abrir Gráfico Detallado
            </button>

            {hasEnoughData && (
                <GrowthChartModal
                    isOpen={isChartModalOpen}
                    onClose={() => setIsChartModalOpen(false)}
                    chartData={combinedChartData}
                    animal={animal}
                    onExportPDF={handleExportPDF}
                    isExporting={isExporting}
                />
            )}
        </div>
    );
}