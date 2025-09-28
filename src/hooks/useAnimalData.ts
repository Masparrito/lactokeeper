// src/hooks/useAnimalData.ts

import { useState, useEffect, useMemo } from 'react';
import { db, Weighing, Birth } from '../db/local';
import { calculateDEL } from '../utils/calculations';

// Definimos la estructura de una lactancia individual procesada
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
  const [births, setBirths] = useState<Birth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!animalId) return;
    const fetchDataForAnimal = async () => {
      setIsLoading(true);
      try {
        const [weighingData, birthData] = await Promise.all([
          db.weighings.where('goatId').equals(animalId).toArray(),
          db.births.where('goatId').equals(animalId).toArray(),
        ]);
        setWeighings(weighingData);
        // Ordenamos los partos desde el más antiguo al más reciente
        setBirths(birthData.sort((a, b) => new Date(a.parturitionDate).getTime() - new Date(b.parturitionDate).getTime()));
      } catch (error) {
        console.error(`Error al cargar datos para ${animalId}:`, error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDataForAnimal();
  }, [animalId]);

  const processedData = useMemo(() => {
    if (births.length === 0) return { allLactations: [], parturitionIntervals: [], lastWeighingDate: null };

    // Agrupamos los pesajes por cada ciclo de lactancia
    const allLactations: LactationCycle[] = births.map((birth, index) => {
      const startDate = new Date(birth.parturitionDate);
      // El ciclo termina en el siguiente parto, o si es el último, hoy.
      const endDate = index < births.length - 1 ? new Date(births[index + 1].parturitionDate) : new Date();

      const cycleWeighings = weighings.filter(w => {
        const weighDate = new Date(w.date);
        return weighDate >= startDate && weighDate < endDate;
      });

      const lactationCurve = cycleWeighings
        .map(w => ({ del: calculateDEL(birth.parturitionDate, w.date), kg: w.kg }))
        .sort((a, b) => a.del - b.del);

      const totalProduction = cycleWeighings.reduce((sum, w) => sum + w.kg, 0);
      const averageProduction = cycleWeighings.length > 0 ? totalProduction / cycleWeighings.length : 0;

      const peakProduction = lactationCurve.reduce((max, current) => (current.kg > max.kg ? current : max), { kg: 0, del: 0 });
      
      const lastWeighingInCycle = lactationCurve[lactationCurve.length - 1];
      const totalDays = lastWeighingInCycle ? lastWeighingInCycle.del : 0;

      return {
        parturitionDate: birth.parturitionDate,
        weighings: cycleWeighings,
        lactationCurve,
        averageProduction,
        peakProduction,
        totalDays,
      };
    });

    // Calculamos los intervalos entre partos
    const parturitionIntervals = births.slice(1).map((birth, index) => {
        const previousBirth = births[index];
        const diffTime = new Date(birth.parturitionDate).getTime() - new Date(previousBirth.parturitionDate).getTime();
        return {
            period: `${previousBirth.parturitionDate.substring(0,4)} - ${birth.parturitionDate.substring(0,4)}`,
            days: Math.round(diffTime / (1000 * 60 * 60 * 24))
        };
    });

    const lastWeighing = weighings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    return { allLactations, parturitionIntervals, lastWeighingDate: lastWeighing?.date || null };

  }, [weighings, births]);

  return { ...processedData, isLoading };
};