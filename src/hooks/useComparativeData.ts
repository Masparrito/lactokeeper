// src/hooks/useComparativeData.ts

import { useState, useEffect } from 'react';
import { Animal, Parturition, Weighing } from '../db/local'; // Se añaden los tipos
import { calculateDEL } from '../utils/calculations';

export type ComparisonType = 
  | 'PRIMIPARAS_HISTORICAL' 
  | 'MULTIPARAS_HISTORICAL';

// CORRECCIÓN: El hook ahora recibe los datos como argumentos en lugar de buscarlos él mismo.
export const useComparativeData = (
  comparisonType: ComparisonType | null,
  allAnimals: Animal[],
  allParturitions: Parturition[],
  allWeighings: Weighing[]
) => {
  const [comparativeCurve, setComparativeCurve] = useState<{ del: number; kg: number }[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!comparisonType || !allAnimals.length) {
      setComparativeCurve([]);
      return;
    }

    const calculateComparativeCurve = () => {
      setIsLoading(true);
      
      let peerGoatIds: string[] = [];

      if (comparisonType === 'PRIMIPARAS_HISTORICAL') {
        const birthCounts = allParturitions.reduce((acc, birth) => {
          acc[birth.goatId] = (acc[birth.goatId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        peerGoatIds = allAnimals
          .filter(animal => birthCounts[animal.id] === 1)
          .map(animal => animal.id);

      } else if (comparisonType === 'MULTIPARAS_HISTORICAL') {
         const birthCounts = allParturitions.reduce((acc, birth) => {
          acc[birth.goatId] = (acc[birth.goatId] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        peerGoatIds = allAnimals
          .filter(animal => birthCounts[animal.id] > 1)
          .map(animal => animal.id);
      }

      const peerWeighings = allWeighings.filter(w => peerGoatIds.includes(w.goatId));
      
      const herdCurveData: { [key: number]: { totalKg: number, count: number } } = {};
      peerWeighings.forEach(w => {
          const birthForWeighing = allParturitions
              .filter(p => p.goatId === w.goatId && new Date(w.date) >= new Date(p.parturitionDate))
              .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime())[0];

          if (!birthForWeighing) return;
          
          const del = calculateDEL(birthForWeighing.parturitionDate, w.date);
          if (!herdCurveData[del]) herdCurveData[del] = { totalKg: 0, count: 0 };
          herdCurveData[del].totalKg += w.kg;
          herdCurveData[del].count++;
      });
      
      const finalCurve = Object.entries(herdCurveData)
          .map(([del, data]) => ({ del: parseInt(del), kg: data.totalKg / data.count }))
          .sort((a, b) => a.del - b.del);

      setComparativeCurve(finalCurve);
      setIsLoading(false);
    };

    calculateComparativeCurve();
  }, [comparisonType, allAnimals, allParturitions, allWeighings]);

  return { comparativeCurve, isLoading };
};