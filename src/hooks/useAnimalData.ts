// src/hooks/useAnimalData.ts

import { useState, useEffect, useMemo } from 'react';
// CORRECCIÓN: Se actualizan los nombres de las tablas y los tipos importados
import { db, Weighing, Parturition } from '../db/local';
import { calculateDEL } from '../utils/calculations';

export interface LactationCycle {
  parturitionDate: string;
  weighings: Weighing[];
  lactationCurve: { del: number; kg: number }[];
  averageProduction: number;
  peakProduction: { kg: number; del: number };
  totalDays: number;
}

export const useAnimalData = (animalId: string) => {
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  // CORRECCIÓN: Se cambia 'births' por 'parturitions'
  const [parturitions, setParturitions] = useState<Parturition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!animalId) return;
    const fetchDataForAnimal = async () => {
      setIsLoading(true);
      try {
        // CORRECCIÓN: Se consulta 'db.weighings' y 'db.parturitions'
        const [weighingData, parturitionData] = await Promise.all([
          db.weighings.where('goatId').equals(animalId).toArray(),
          db.parturitions.where('goatId').equals(animalId).toArray(),
        ]);
        setWeighings(weighingData);
        // Ordenamos los partos desde el más antiguo al más reciente
        setParturitions(parturitionData.sort((a, b) => new Date(a.parturitionDate).getTime() - new Date(b.parturitionDate).getTime()));
      } catch (error) {
        console.error(`Error al cargar datos para ${animalId}:`, error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDataForAnimal();
  }, [animalId]);

  const processedData = useMemo(() => {
    // CORRECCIÓN: Se cambia 'births' por 'parturitions' en toda la lógica
    if (parturitions.length === 0) return { allLactations: [], parturitionIntervals: [], lastWeighingDate: null };

    const allLactations: LactationCycle[] = parturitions.map((parturition, index) => {
      const startDate = new Date(parturition.parturitionDate);
      const endDate = index < parturitions.length - 1 ? new Date(parturitions[index + 1].parturitionDate) : new Date();
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
            period: `${previousParturition.parturitionDate.substring(0,4)} - ${parturition.parturitionDate.substring(0,4)}`,
            days: Math.round(diffTime / (1000 * 60 * 60 * 24))
        };
    });

    const lastWeighing = weighings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return { allLactations, parturitionIntervals, lastWeighingDate: lastWeighing?.date || null };

  }, [weighings, parturitions]);

  return { ...processedData, isLoading };
};