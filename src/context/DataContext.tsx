// src/context/DataContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db as localDb, Animal, Weighing, Parturition, Father } from '../db/local';
import { db as firestoreDb } from '../firebaseConfig';
import { useAuth } from './AuthContext';
import { 
    collection, 
    query, 
    where, 
    onSnapshot, 
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    writeBatch
} from "firebase/firestore";

interface IDataContext {
  animals: Animal[];
  fathers: Father[];
  weighings: Weighing[];
  parturitions: Parturition[];
  isLoading: boolean;
  addWeighing: (weighing: Omit<Weighing, 'id' | 'firestoreId'>) => Promise<void>;
  addParturition: (data: any) => Promise<void>;
  updateWeighing: (firestoreId: string, newKg: number) => Promise<void>;
  deleteWeighing: (firestoreId: string) => Promise<void>;
  startDryingProcess: (firestoreId: string) => Promise<void>;
  setLactationAsDry: (firestoreId: string) => Promise<void>;
  fetchData: () => Promise<void>;
  addFather: (father: Omit<Father, 'id' | 'firestoreId'>) => Promise<void>;
}

const DataContext = createContext<IDataContext>({
  animals: [],
  fathers: [],
  weighings: [],
  parturitions: [],
  isLoading: true,
  addWeighing: async () => {},
  addParturition: async () => {},
  updateWeighing: async () => {},
  deleteWeighing: async () => {},
  startDryingProcess: async () => {},
  setLactationAsDry: async () => {},
  fetchData: async () => {},
  addFather: async () => {},
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [fathers, setFathers] = useState<Father[]>([]);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [parturitions, setParturitions] = useState<Parturition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDataFromLocalDb = useCallback(async () => {
    // No establecemos isLoading aquí para evitar parpadeos en cada sincronización
    try {
      const [animalsData, fathersData, weighingsData, partData] = await Promise.all([
        localDb.animals.toArray(),
        localDb.fathers.toArray(),
        localDb.weighings.toArray(),
        localDb.parturitions.toArray(),
      ]);
      setAnimals(animalsData);
      setFathers(fathersData);
      setWeighings(weighingsData);
      setParturitions(partData);
    } catch (error) { console.error("Error al cargar datos locales:", error); } 
    finally { setIsLoading(false); } // Solo establecemos isLoading a false al final
  }, []);

  useEffect(() => {
    if (!currentUser) {
        setIsLoading(false);
        Promise.all([
            localDb.animals.clear(), localDb.fathers.clear(),
            localDb.weighings.clear(), localDb.parturitions.clear(),
        ]).then(() => {
            setAnimals([]); setFathers([]); setWeighings([]); setParturitions([]);
        });
        return;
    }

    // --- LÓGICA DE SINCRONIZACIÓN CORREGIDA Y EXPLÍCITA ---
    const q = (collectionName: string) => query(collection(firestoreDb, collectionName), where("userId", "==", currentUser.uid));

    const syncCollection = (collectionName: string, table: any) => {
        return onSnapshot(q(collectionName), async (snapshot) => {
            const firestoreData = snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id }));
            await table.bulkPut(firestoreData);
            fetchDataFromLocalDb(); // Actualiza el estado de React desde Dexie
        }, (error) => console.error(`Error sincronizando ${collectionName}:`, error));
    };

    const unsubAnimals = syncCollection('animals', localDb.animals);
    const unsubFathers = syncCollection('fathers', localDb.fathers);
    const unsubParturitions = syncCollection('parturitions', localDb.parturitions);
    const unsubWeighings = syncCollection('weighings', localDb.weighings);

    // Devolvemos una función de limpieza que cancela todas las suscripciones
    return () => {
        unsubAnimals();
        unsubFathers();
        unsubParturitions();
        unsubWeighings();
    };
  }, [currentUser, fetchDataFromLocalDb]);

  const addOperation = async (collectionName: string, data: object) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    await addDoc(collection(firestoreDb, collectionName), { ...data, userId: currentUser.uid });
  };
  
  const addWeighing = async (weighing: Omit<Weighing, 'id' | 'firestoreId'>) => addOperation("weighings", weighing);
  const addFather = async (father: Omit<Father, 'id' | 'firestoreId'>) => addOperation("fathers", father);

  const addParturition = async (data: any) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const batch = writeBatch(firestoreDb);
    const parturitionRef = doc(collection(firestoreDb, "parturitions"));
    batch.set(parturitionRef, {
        goatId: data.motherId, parturitionDate: data.parturitionDate, sireId: data.sireId,
        offspringCount: data.offspring.length, parturitionType: data.parturitionType,
        status: 'activa', userId: currentUser.uid,
    });
    data.offspring.forEach((kid: any) => {
        const animalRef = doc(collection(firestoreDb, "animals"));
        batch.set(animalRef, {
            id: kid.id, sex: kid.sex, status: kid.sex === 'Macho' ? 'Descartado' : 'Activo',
            birthDate: data.parturitionDate, motherId: data.motherId, fatherId: data.sireId,
            birthWeight: parseFloat(kid.birthWeight), userId: currentUser.uid,
        });
    });
    await batch.commit();
  };

  const updateDocOperation = async (collectionName: string, firestoreId: string, data: object) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const docRef = doc(firestoreDb, collectionName, firestoreId);
    await updateDoc(docRef, data);
  };
  
  const deleteDocOperation = async (collectionName: string, firestoreId: string) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const docRef = doc(firestoreDb, collectionName, firestoreId);
    await deleteDoc(docRef);
  };

  const updateWeighing = async (firestoreId: string, newKg: number) => updateDocOperation("weighings", firestoreId, { kg: newKg });
  const deleteWeighing = async (firestoreId: string) => deleteDocOperation("weighings", firestoreId);
  const startDryingProcess = async (firestoreId: string) => updateDocOperation("parturitions", firestoreId, { status: 'en-secado', dryingStartDate: new Date().toISOString().split('T')[0] });
  const setLactationAsDry = async (firestoreId: string) => updateDocOperation("parturitions", firestoreId, { status: 'seca' });

  return (
    <DataContext.Provider value={{ 
        animals, fathers, weighings, parturitions, isLoading, 
        addWeighing, addParturition, updateWeighing, deleteWeighing,
        startDryingProcess, setLactationAsDry,
        fetchData: fetchDataFromLocalDb,
        addFather
      }}
    >
      {children}
    </DataContext.Provider>
  );
};