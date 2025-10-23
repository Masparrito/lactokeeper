// src/components/ui/ComparativeMetricsDisplay.tsx
import React, { useMemo } from 'react';
import { LactationCycle } from '../../hooks/useAnimalData';
import { ComparisonResult } from '../../hooks/useComparativeData';
import { Parturition } from '../../db/local';
// Importar iconos de tendencia
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface ComparativeMetricsProps {
    lactationA: LactationCycle; // La lactancia resaltada/actual
    comparisonB: ComparisonResult | null; 
    allParturitions: Parturition[];
    animalId: string;
}

// --- CORRECCIÓN: Helper 'formatMetric' simplificado ---
// Solo formatea el número y la unidad, sin signos.
const formatMetric = (value: number | undefined | null, decimals = 2, unit = 'Kg') => {
    if (value === undefined || value === null || isNaN(value)) return 'N/A';
    return `${value.toFixed(decimals)} ${unit}`;
};

// Helper para calcular intervalo de descanso (devuelve número o null)
const getDryingInterval = (
    lactation: LactationCycle,
    animalId: string,
    allParturitions: Parturition[]
): number | null => {
    const currentParturition = allParturitions.find(
        p => p.goatId === animalId && p.parturitionDate === lactation.parturitionDate
    );
    if (!currentParturition) return null;
    const previousParturition = allParturitions
        .filter(p => p.goatId === animalId && new Date(p.parturitionDate) < new Date(currentParturition.parturitionDate))
        .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];
    if (!previousParturition || !previousParturition.dryingStartDate) return null;
    const diffTime = new Date(currentParturition.parturitionDate).getTime() - new Date(previousParturition.dryingStartDate).getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

// --- NUEVO: Componente de Fila de Métrica rediseñado ---
interface MetricRowProps {
    label: string;
    valueA: number | null | undefined;
    valueB: number | null | undefined;
    unit: string;
    decimals?: number;
    invertColors?: boolean; // Para métricas donde "menos es mejor" (ej. Días Seca)
}

const MetricRow: React.FC<MetricRowProps> = ({ label, valueA, valueB, unit, decimals = 2, invertColors = false }) => {
    const hasDataA = valueA !== null && valueA !== undefined;
    const hasDataB = valueB !== null && valueB !== undefined;
    const hasBothData = hasDataA && hasDataB;

    let diff: number | null = null;
    let diffString: string = "N/A";
    let colorClass = 'text-zinc-400';
    let Icon = Minus;

    if (hasBothData) {
        diff = valueA! - valueB!; // Sabemos que no son null
        if (Math.abs(diff) < 0.01) { // Considerar 0
             diff = 0;
        }

        const sign = diff > 0 ? '+' : ''; // Añadir signo solo al diff
        diffString = `${sign}${diff.toFixed(decimals)} ${unit}`;
        
        if (diff > 0) {
            colorClass = invertColors ? 'text-brand-red' : 'text-brand-green';
            Icon = ArrowUp;
        } else if (diff < 0) {
            colorClass = invertColors ? 'text-brand-green' : 'text-brand-red';
            Icon = ArrowDown;
        }
    }

    return (
        <div className="py-3 border-b border-zinc-700/50 flex justify-between items-center">
            {/* Izquierda: Label */}
            <span className="text-sm font-medium text-zinc-400">{label}</span>
            
            {/* Derecha: Valores */}
            <div className="flex flex-col items-end">
                {/* Valor A (Principal) */}
                <span className="text-lg font-semibold text-white">
                    {formatMetric(valueA, decimals, unit)} 
                </span>

                {/* Valor B (Diferencia + Absoluto) */}
                {hasBothData ? (
                    <span className={`text-sm font-medium flex items-center ${colorClass}`}>
                        <Icon size={16} className="mr-0.5" />
                        {diffString}
                        <span className="text-zinc-500 ml-2 text-xs font-normal">(vs {formatMetric(valueB, decimals, unit)})</span>
                    </span>
                ) : (
                    <span className="text-sm font-medium text-zinc-500">
                        vs {formatMetric(valueB, decimals, unit)}
                    </span>
                )}
            </div>
        </div>
    );
};


// --- Componente Principal Actualizado ---
export const ComparativeMetricsDisplay: React.FC<ComparativeMetricsProps> = ({
    lactationA,
    comparisonB,
    allParturitions,
    animalId
}) => {
    // Calcular métricas para la comparación
    const comparisonAvg = comparisonB?.curve.length
        ? (comparisonB.curve.reduce((sum: number, p: { kg: number }) => sum + p.kg, 0) / comparisonB.curve.length)
        : null;
    const comparisonPeak = comparisonB?.curve.length
        ? comparisonB.curve.reduce((max: { kg: number, del: number }, p: { kg: number, del: number }) => p.kg > max.kg ? p : max, { kg: 0, del: 0 })
        : null;
    const comparisonDel = comparisonB?.curve.length
        ? comparisonB.curve[comparisonB.curve.length - 1].del
        : null;

    // Calcular intervalo de descanso para Lactancia A
    const intervalA = useMemo(() =>
        getDryingInterval(lactationA, animalId, allParturitions),
        [lactationA, animalId, allParturitions]
    );
    
    // Tomar intervalo B del hook
    const intervalB = comparisonB?.averageRestInterval;

    const lactationAName = `Lact. ${new Date(lactationA.parturitionDate).getFullYear()}`;

    return (
        <div className="mt-4 pt-4 border-t border-brand-border/50 text-white animate-fade-in">
            {/* Cabecera estilo Stocks */}
            <div className="flex justify-between items-center mb-2 px-1">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">Métrica</span>
                <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-white uppercase tracking-wide">{lactationAName}</span>
                    <span className="text-xs font-light text-zinc-400">vs {comparisonB?.name || '...'}</span>
                </div>
            </div>

            {/* Lista de Métricas */}
            <div className="space-y-1">
                <MetricRow
                    label="Promedio"
                    valueA={lactationA.averageProduction}
                    valueB={comparisonAvg}
                    unit="Kg"
                    decimals={2}
                />
                <MetricRow
                    label="Pico"
                    valueA={lactationA.peakProduction.kg}
                    valueB={comparisonPeak?.kg}
                    unit="Kg"
                    decimals={2}
                />
                <MetricRow
                    label="Duración (DEL)"
                    valueA={lactationA.totalDays}
                    valueB={comparisonDel}
                    unit="días"
                    decimals={0}
                />
                <MetricRow
                    label="Descanso Previo"
                    valueA={intervalA}
                    valueB={intervalB}
                    unit="días"
                    decimals={0}
                    invertColors={true} // Menos días es mejor
                />
            </div>
        </div>
    );
};