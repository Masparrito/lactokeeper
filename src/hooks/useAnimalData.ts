// src/hooks/useAnimalData.ts

import { useMemo } from 'react';
import { Weighing } from '../db/local';
import { calculateDEL } from '../utils/calculations';
import { useData } from '../context/DataContext';

export interface LactationCycle {
  parturitionDate: string;
  weighings: Weighing[];
  lactationCurve: { del: number; kg: number }[];
  averageProduction: number;
  peakProduction: { kg: number; del: number };
  totalDays: number;
}

// Deriva TODO en vivo desde el contexto (useData). Cualquier alta/edición/
// borrado de pesajes o partos se refleja al instante en el perfil de lactancia
// (antes se cargaba una sola vez desde Dexie y quedaba obsoleto).
export const useAnimalData = (animalId: string) => {
  const { weighings: allWeighings, parturitions: allParturitions, isLoading } = useData();

  const weighings = useMemo(
    () => allWeighings.filter(w => w.goatId === animalId),
    [allWeighings, animalId]
  );

  const parturitions = useMemo(
    () => allParturitions
      .filter(p => p.goatId === animalId)
      .sort((a, b) => new Date(a.parturitionDate).getTime() - new Date(b.parturitionDate).getTime()),
    [allParturitions, animalId]
  );

  const processedData = useMemo(() => {
    if (parturitions.length === 0) return { allLactations: [] as LactationCycle[], parturitionIntervals: [] as { period: string; days: number }[], lastWeighingDate: null as string | null };

    const allLactations: LactationCycle[] = parturitions.map((parturition, index) => {
      const startDate = new Date(parturition.parturitionDate);
      // Si es el último parto, la fecha final es "abierta" (incluye pesajes hasta hoy).
      const endDate = index < parturitions.length - 1
        ? new Date(parturitions[index + 1].parturitionDate)
        : new Date(9999, 11, 31);

      const cycleWeighings = weighings.filter(w => {
        const weighDate = new Date(w.date);
        return weighDate >= startDate && weighDate < endDate;
      });

      const lactationCurve = cycleWeighings
        .map(w => ({ del: calculateDEL(parturition.parturitionDate, w.date), kg: w.kg }))
        .sort((a, b) => a.del - b.del);

      const totalProduction = cycleWeighings.reduce((sum, w) => sum + w.kg, 0);
      const averageProduction = cycleWeighings.length > 0 ? totalProduction / cycleWeighings.length : 0;
      const peakProduction = lactationCurve.reduce((max, current) => (current.kg > max.kg ? current : max), { kg: 0, del: 0 });
      const lastWeighingInCycle = lactationCurve[lactationCurve.length - 1];
      const totalDays = lastWeighingInCycle ? lastWeighingInCycle.del : 0;

      return {
        parturitionDate: parturition.parturitionDate,
        weighings: cycleWeighings,
        lactationCurve,
        averageProduction,
        peakProduction,
        totalDays,
      };
    });

    const parturitionIntervals = parturitions.slice(1).map((parturition, index) => {
      const previousParturition = parturitions[index];
      const diffTime = new Date(parturition.parturitionDate).getTime() - new Date(previousParturition.parturitionDate).getTime();
      return {
        period: `${previousParturition.parturitionDate.substring(0, 4)} - ${parturition.parturitionDate.substring(0, 4)}`,
        days: Math.round(diffTime / (1000 * 60 * 60 * 24)),
      };
    });

    const lastWeighing = [...weighings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return { allLactations, parturitionIntervals, lastWeighingDate: lastWeighing?.date || null };
  }, [weighings, parturitions]);

  return { ...processedData, isLoading };
};
