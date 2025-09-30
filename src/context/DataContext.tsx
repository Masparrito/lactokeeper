// src/context/DataContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, Animal, Weighing, Parturition, Father } from '../db/local';

interface IDataContext {
  animals: Animal[];
  fathers: Father[];
  weighings: Weighing[];
  parturitions: Parturition[];
  isLoading: boolean;
  addWeighing: (weighing: Weighing) => Promise<number | undefined>;
  addParturition: (data: any) => Promise<void>;
  updateWeighing: (id: number, newKg: number) => Promise<void>;
  deleteWeighing: (id: number) => Promise<void>;
  startDryingProcess: (parturitionId: number) => Promise<void>;
  setLactationAsDry: (parturitionId: number) => Promise<void>;
  fetchData: () => Promise<void>;
  addFather: (father: Father) => Promise<string | number>;
}

const DataContext = createContext<IDataContext>({
  animals: [],
  fathers: [],
  weighings: [],
  parturitions: [],
  isLoading: true,
  addWeighing: async () => undefined,
  addParturition: async () => {},
  updateWeighing: async () => {},
  deleteWeighing: async () => {},
  startDryingProcess: async () => {},
  setLactationAsDry: async () => {},
  fetchData: async () => {},
  addFather: async () => '',
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [fathers, setFathers] = useState<Father[]>([]);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [parturitions, setParturitions] = useState<Parturition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const animalCount = await db.animals.count();
    if (animalCount === 0) {
      console.log("Poblando BD con datos corregidos del PDF y foto...");

      const weighingData1 = [
        { id: 'R063', kg: 1.6, parto: '2025-03-09' }, { id: 'A338', kg: 1.4, parto: '2025-07-09' },
        { id: 'A236', kg: 2.1, parto: '2025-08-13' }, { id: 'A354', kg: 1.4, parto: '2025-08-06' },
        { id: 'Q220', kg: 1.1, parto: '2025-03-07' }, { id: 'A351', kg: 0.7, parto: '2025-07-06' },
        { id: '924', kg: 1.6, parto: '2025-02-05' }, { id: 'Q212', kg: 1.7, parto: '2025-07-06' },
        { id: 'N308', kg: 1.3, parto: '2025-02-17' }, { id: 'N320', kg: 0.9, parto: '2025-03-14' },
        { id: 'A233', kg: 1.9, parto: '2025-07-17' }, { id: 'A410', kg: 1.2, parto: '2025-07-06' },
        { id: 'A350', kg: 1.4, parto: '2025-07-11' }, { id: 'A231', kg: 1.6, parto: '2025-03-18' },
        { id: '711Q', kg: 1.5, parto: '2025-07-13' }, { id: 'Q211', kg: 1.6, parto: '2025-07-06' },
        { id: 'A326', kg: 1.8, parto: '2025-08-13' }, { id: 'A230', kg: 0.9, parto: '2025-07-19' },
        { id: 'Q226', kg: 1.4, parto: '2025-06-22' }, { id: 'Q209', kg: 1.2, parto: '2025-07-17' },
        { id: '1733', kg: 1.3, parto: '2025-03-12' }, { id: 'Q227', kg: 1.2, parto: '2025-07-28' },
        { id: 'Q409', kg: 1.1, parto: '2025-07-09' }, { id: 'A208', kg: 1.5, parto: '2025-03-10' },
        { id: 'Q222', kg: 2.2, parto: '2025-07-05' }, { id: 'T301', kg: 0.5, parto: '2025-07-14' },
        { id: 'Q352', kg: 0.8, parto: '2025-07-25' }, { id: 'Q213', kg: 1.9, parto: '2025-07-08' },
        { id: 'T047', kg: 1.6, parto: '2025-03-17' }, { id: 'Q328', kg: 1.2, parto: '2025-07-16' },
        { id: 'Q224', kg: 1.7, parto: '2025-07-18' }, { id: 'A413', kg: 1.6, parto: '2025-08-14' },
        { id: 'DD15', kg: 2.3, parto: '2025-08-12' }, { id: 'N304', kg: 1.3, parto: '2025-03-09' },
        { id: 'N312', kg: 1.0, parto: '2025-03-23' }, { id: 'A303', kg: 0.8, parto: '2025-04-04' },
        { id: 'Q115', kg: 1.1, parto: '2025-03-06' }, { id: 'E025', kg: 0.7, parto: '2025-08-10' },
        { id: 'Q348', kg: 1.1, parto: '2025-04-05' }, { id: 'N313', kg: 1.1, parto: '2025-03-08' },
        { id: 'Q201', kg: 1.4, parto: '2025-03-06' }, { id: 'Q122', kg: 0.9, parto: '2025-03-06' },
        { id: 'A337', kg: 1.0, parto: '2025-03-21' }, { id: 'Q343', kg: 0.7, parto: '2025-03-11' },
        { id: 'Q228', kg: 1.1, parto: '2025-03-18' }, { id: '13', kg: 0.7, parto: '2025-03-16' },
        { id: 'Q120', kg: 0.6, parto: '2025-03-17' }, { id: 'A311', kg: 0.6, parto: '2025-03-17' },
        { id: 'A346', kg: 0.7, parto: '2025-03-14' }, { id: 'Q345', kg: 1.2, parto: '2025-03-11' },
        { id: '311Q', kg: 0.5, parto: '2025-07-05' }, { id: 'A232', kg: 1.5, parto: '2025-03-18' }
      ];
      
      const weighingData2 = [
        { id: 'A338', kg: 1.4 }, { id: 'Q318', kg: 1.1 }, { id: 'A331', kg: 1.3 }, { id: 'A309', kg: 1.2 },
        { id: 'R063', kg: 2.0 }, { id: 'A303', kg: 1.0 }, { id: 'A231', kg: 1.5 }, { id: 'N308', kg: 1.4 },
        { id: 'A233', kg: 1.4 }, { id: 'N320', kg: 1.1 }, { id: '711Q', kg: 1.3 }, { id: 'Q227', kg: 1.3 },
        { id: 'Q222', kg: 2.1 }, { id: 'Q212', kg: 1.6 }, { id: 'A220', kg: 0.9 }, { id: 'Q226', kg: 1.5 },
        { id: 'N313', kg: 1.2 }, { id: '1733', kg: 1.5 }, { id: 'Q220', kg: 1.4 }, { id: 'C025', kg: 0.8 },
        { id: 'Q211', kg: 1.5 }, { id: 'A236', kg: 2.2 }, { id: 'Q115', kg: 1.4 }, { id: 'Q409', kg: 1.0 },
        { id: 'Q209', kg: 1.5 }, { id: 'Q213', kg: 1.8 }, { id: 'A326', kg: 1.6 }, { id: 'Q224', kg: 1.4 },
        { id: 'T047', kg: 1.8 }, { id: '924', kg: 1.8 }, { id: 'A208', kg: 1.5 }, { id: 'A413', kg: 1.5 },
        { id: 'Q328', kg: 1.1 }, { id: 'DD15', kg: 2.4 }, { id: 'A350', kg: 1.2 }, { id: 'T301', kg: 0.5 },
        { id: 'A311', kg: 0.6 }, { id: 'Q352', kg: 0.9 }, { id: 'Q410', kg: 0.6 }, { id: 'Q343', kg: 1.1 },
        { id: 'A352', kg: 0.7 }, { id: 'Q120', kg: 1.2 }, { id: '177', kg: 0.8 }, { id: 'Q228', kg: 1.1 },
        { id: 'Q345', kg: 1.0 }, { id: '311Q', kg: 1.0 }, { id: 'A232', kg: 1.6 }, { id: 'A346', kg: 1.1 }, { id: '0013', kg: 0.6 }
      ];
      
      const allAnimalsMap = new Map<string, any>();
      weighingData1.forEach(d => allAnimalsMap.set(d.id, { kg1: d.kg, parto: d.parto }));
      weighingData2.forEach(d => {
          const existing = allAnimalsMap.get(d.id) || {};
          allAnimalsMap.set(d.id, { ...existing, kg2: d.kg });
      });

      const seedAnimals: Animal[] = [];
      const seedParturitions: Parturition[] = [];
      const seedWeighings: Weighing[] = [];

      allAnimalsMap.forEach((data, id) => {
          const birthDate = new Date(data.parto || '2023-01-01');
          birthDate.setFullYear(birthDate.getFullYear() - 2);
          
          seedAnimals.push({
              id: id, sex: 'Hembra', status: 'Activo', birthDate: birthDate.toISOString().split('T')[0],
          });

          if (data.parto) {
              seedParturitions.push({
                  goatId: id, parturitionDate: data.parto, sireId: 'P001', offspringCount: 1, parturitionType: 'Simple', status: 'activa',
              });
          }
          if (data.kg1) seedWeighings.push({ goatId: id, date: '2025-08-28', kg: data.kg1 });
          if (data.kg2) seedWeighings.push({ goatId: id, date: '2025-09-18', kg: data.kg2 });
      });

      await db.fathers.bulkPut([{ id: 'P001', name: 'Desconocido' }]);
      await db.animals.bulkPut(seedAnimals);
      await db.parturitions.bulkPut(seedParturitions);
      await db.weighings.bulkPut(seedWeighings);
    }
    
    setIsLoading(true);
    try {
      const [animalsData, fathersData, weighingsData, partData] = await Promise.all([
        db.animals.toArray(),
        db.fathers.toArray(),
        db.weighings.toArray(),
        db.parturitions.toArray(),
      ]);
      setAnimals(animalsData);
      setFathers(fathersData);
      setWeighings(weighingsData);
      setParturitions(partData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addWeighing = async (weighing: Weighing) => {
    const newId = await db.weighings.add(weighing);
    // fetchData() will be called from the component to ensure all data is fresh after bulk adds
    return newId;
  };

  const updateWeighing = async (id: number, newKg: number) => {
    await db.weighings.update(id, { kg: newKg });
    await fetchData();
  };

  const deleteWeighing = async (id: number) => {
    await db.weighings.delete(id);
    await fetchData();
  };

  const addParturition = async (data: any) => {
    await db.transaction('rw', db.parturitions, db.animals, async () => {
      const parturitionId = await db.parturitions.add({
        goatId: data.motherId,
        parturitionDate: data.parturitionDate,
        sireId: data.sireId,
        offspringCount: data.offspring.length,
        parturitionType: data.parturitionType,
        status: 'activa',
      });

      const newOffspring: Animal[] = data.offspring.map((kid: any) => ({
        id: kid.id,
        sex: kid.sex,
        status: kid.sex === 'Macho' ? 'Descartado' : 'Activo',
        birthDate: data.parturitionDate,
        motherId: data.motherId,
        fatherId: data.sireId,
        birthWeight: parseFloat(kid.birthWeight),
        parturitionId: parturitionId,
      }));
      await db.animals.bulkPut(newOffspring);
    });
    await fetchData();
  };
  
  const addFather = async (father: Father) => {
    const newId = await db.fathers.add(father);
    await fetchData();
    return newId;
  };

  const startDryingProcess = async (parturitionId: number) => {
    await db.parturitions.update(parturitionId, {
      status: 'en-secado',
      dryingStartDate: new Date().toISOString().split('T')[0],
    });
    await fetchData();
  };

  const setLactationAsDry = async (parturitionId: number) => {
    await db.parturitions.update(parturitionId, {
      status: 'seca',
    });
    await fetchData();
  };

  return (
    <DataContext.Provider value={{ 
        animals, 
        fathers, 
        weighings, 
        parturitions, 
        isLoading, 
        addWeighing, 
        addParturition, 
        updateWeighing, 
        deleteWeighing,
        startDryingProcess,
        setLactationAsDry,
        fetchData,
        addFather
      }}
    >
      {children}
    </DataContext.Provider>
  );
};