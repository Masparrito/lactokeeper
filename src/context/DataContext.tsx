import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, Goat, Weighing, Birth } from '../db/local';

// 1. AÑADIMOS la función 'addWeighing' a la "caja de herramientas" del contexto.
interface IDataContext {
  goats: Goat[];
  weighings: Weighing[];
  births: Birth[];
  isLoading: boolean;
  addWeighing: (weighing: { goatId: string; kg: number }) => Promise<void>;
}

// 2. AÑADIMOS un valor por defecto para que TypeScript esté conforme.
const DataContext = createContext<IDataContext>({
  goats: [],
  weighings: [],
  births: [],
  isLoading: true,
  addWeighing: async () => {}, // Función vacía como placeholder
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [goats, setGoats] = useState<Goat[]>([]);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [births, setBirths] = useState<Birth[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const goatCount = await db.goats.count();
    if (goatCount === 0) {
      console.log("Poblando base de datos con datos de prueba...");
      await db.goats.bulkAdd([ { id: 'R063', lactationCount: 2, motherId: 'A100' }, { id: 'A338', lactationCount: 1 }, { id: 'A351', lactationCount: 3, motherId: 'A100' }, { id: 'B112', lactationCount: 4 }, ]);
      await db.births.bulkAdd([ { goatId: 'R063', parturitionDate: '2025-02-15' }, { goatId: 'A338', parturitionDate: '2025-03-01' }, { goatId: 'A351', parturitionDate: '2025-02-20' }, { goatId: 'B112', parturitionDate: '2025-01-10' }, ]);
      const weighingsData: Weighing[] = [];
      (await db.births.toArray()).forEach(birth => {
        const startDate = new Date(birth.parturitionDate);
        for (let i = 0; i < 150; i += 10) { 
            const weighDate = new Date(startDate);
            weighDate.setDate(startDate.getDate() + i);
            if (weighDate > new Date()) break;
            const baseProd = birth.goatId.startsWith('R') ? 3.5 : 2.8;
            const peakDay = 45;
            const persistence = 0.98;
            let kg = i <= peakDay ? 1.5 + (baseProd - 1.5) * (i / peakDay) : baseProd * Math.pow(persistence, (i - peakDay)/10);
            kg += (Math.random() - 0.5) * 0.4;
            weighingsData.push({ goatId: birth.goatId, date: weighDate.toISOString().split('T')[0], kg: parseFloat(Math.max(0.5, kg).toFixed(2)) });
        }
      });
      await db.weighings.bulkAdd(weighingsData);
    }
    
    setIsLoading(true);
    try {
      const [goatsData, weighingsData, birthsData] = await Promise.all([ db.goats.toArray(), db.weighings.toArray(), db.births.toArray() ]);
      setGoats(goatsData);
      setWeighings(weighingsData);
      setBirths(birthsData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // 3. CREAMOS la lógica real de la función 'addWeighing'
  const addWeighing = async (weighing: { goatId: string; kg: number }) => {
    const existingGoat = await db.goats.get(weighing.goatId);
    if (!existingGoat) {
        await db.goats.add({ id: weighing.goatId, lactationCount: 1 });
    }
    await db.weighings.add({
        ...weighing,
        date: new Date().toISOString().split('T')[0]
    });
    await fetchData();
  };

  // 4. ENTREGAMOS la nueva función al resto de la aplicación
  return (
    <DataContext.Provider value={{ goats, weighings, births, isLoading, addWeighing }}>
      {children}
    </DataContext.Provider>
  );
};