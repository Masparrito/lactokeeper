import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db as localDb, Animal, Weighing, Parturition, Father, Lot, Origin, BreedingGroup, ServiceRecord, Event } from '../db/local';
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
    setDoc,
    writeBatch,
    getDoc
} from "firebase/firestore";

interface IDataContext {
  animals: Animal[];
  fathers: Father[];
  weighings: Weighing[];
  parturitions: Parturition[];
  lots: Lot[];
  origins: Origin[];
  breedingGroups: BreedingGroup[];
  serviceRecords: ServiceRecord[];
  events: Event[];
  isLoading: boolean;
  addAnimal: (animalData: Omit<Animal, 'id'> & { id: string }) => Promise<void>;
  updateAnimal: (animalId: string, dataToUpdate: Partial<Animal>) => Promise<void>;
  addLot: (lotName: string) => Promise<void>;
  deleteLot: (lotId: string) => Promise<void>;
  addOrigin: (originName: string) => Promise<void>;
  deleteOrigin: (originId: string) => Promise<void>;
  addBreedingGroup: (groupData: Omit<BreedingGroup, 'id'>) => Promise<string>;
  updateBreedingGroup: (groupId: string, dataToUpdate: Partial<BreedingGroup>) => Promise<void>;
  addServiceRecord: (recordData: Omit<ServiceRecord, 'id'>) => Promise<void>;
  addWeighing: (weighing: Omit<Weighing, 'id'>) => Promise<void>;
  addParturition: (data: any) => Promise<void>;
  fetchData: () => Promise<void>;
  addFather: (father: Omit<Father, 'id'>) => Promise<void>;
  startDryingProcess: (parturitionId: string) => Promise<void>;
  setLactationAsDry: (parturitionId: string) => Promise<void>;
}

const DataContext = createContext<IDataContext>({
  animals: [],
  fathers: [],
  weighings: [],
  parturitions: [],
  lots: [],
  origins: [],
  breedingGroups: [],
  serviceRecords: [],
  events: [],
  isLoading: true,
  addAnimal: async () => {},
  updateAnimal: async () => {},
  addLot: async () => {},
  deleteLot: async () => {},
  addOrigin: async () => {},
  deleteOrigin: async () => {},
  addBreedingGroup: async () => '',
  updateBreedingGroup: async () => {},
  addServiceRecord: async () => {},
  addWeighing: async () => {},
  addParturition: async () => {},
  fetchData: async () => {},
  addFather: async () => {},
  startDryingProcess: async () => {},
  setLactationAsDry: async () => {},
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [fathers, setFathers] = useState<Father[]>([]);
  const [weighings, setWeighings] = useState<Weighing[]>([]);
  const [parturitions, setParturitions] = useState<Parturition[]>([]);
  const [lots, setLots] = useState<Lot[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [breedingGroups, setBreedingGroups] = useState<BreedingGroup[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDataFromLocalDb = useCallback(async () => {
    try {
      const [animalsData, fathersData, weighingsData, partData, lotsData, originsData, breedingGroupsData, serviceRecordsData, eventsData] = await Promise.all([
        localDb.animals.toArray(),
        localDb.fathers.toArray(),
        localDb.weighings.toArray(),
        localDb.parturitions.toArray(),
        localDb.lots.toArray(),
        localDb.origins.toArray(),
        localDb.breedingGroups.toArray(),
        localDb.serviceRecords.toArray(),
        localDb.events.toArray(),
      ]);
      setAnimals(animalsData);
      setFathers(fathersData);
      setWeighings(weighingsData);
      setParturitions(partData);
      setLots(lotsData);
      setOrigins(originsData);
      setBreedingGroups(breedingGroupsData);
      setServiceRecords(serviceRecordsData);
      setEvents(eventsData);
    } catch (error) { console.error("Error al cargar datos locales:", error); } 
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    if (!currentUser) {
        setIsLoading(false);
        Promise.all([
            localDb.animals.clear(), localDb.fathers.clear(),
            localDb.weighings.clear(), localDb.parturitions.clear(),
            localDb.lots.clear(), localDb.origins.clear(),
            localDb.breedingGroups.clear(), localDb.serviceRecords.clear(),
            localDb.events.clear(),
        ]).then(() => {
            setAnimals([]); setFathers([]); setWeighings([]); setParturitions([]); setLots([]); setOrigins([]); setBreedingGroups([]); setServiceRecords([]); setEvents([]);
        });
        return;
    }

    let unsubscribers: (() => void)[] = [];
    const setupSync = async () => {
        try {
            if (!localDb.isOpen()) { await localDb.open(); }
            const q = (collectionName: string) => query(collection(firestoreDb, collectionName), where("userId", "==", currentUser.uid));
            const syncCollection = (collectionName: string, table: any) => {
                const unsubscribe = onSnapshot(q(collectionName), async (snapshot) => {
                    const firestoreData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    await table.bulkPut(firestoreData);
                    fetchDataFromLocalDb();
                }, (error) => console.error(`Error sincronizando ${collectionName}:`, error));
                unsubscribers.push(unsubscribe);
            };

            syncCollection('animals', localDb.animals);
            syncCollection('fathers', localDb.fathers);
            syncCollection('parturitions', localDb.parturitions);
            syncCollection('weighings', localDb.weighings);
            syncCollection('lots', localDb.lots);
            syncCollection('origins', localDb.origins);
            syncCollection('breedingGroups', localDb.breedingGroups);
            syncCollection('serviceRecords', localDb.serviceRecords);
            syncCollection('events', localDb.events);

        } catch (error) { console.error("Fallo al abrir o sincronizar la base de datos local:", error); }
    };
    setupSync();
    return () => { unsubscribers.forEach(unsub => unsub()); };
  }, [currentUser, fetchDataFromLocalDb]);

  const addEvent = async (eventData: Omit<Event, 'id'>) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    await addDoc(collection(firestoreDb, "events"), { ...eventData, userId: currentUser.uid });
  };

  const addAnimal = async (animalData: Omit<Animal, 'id'> & { id: string }) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const animalRef = doc(firestoreDb, "animals", animalData.id);
    await setDoc(animalRef, { ...animalData, userId: currentUser.uid });
  };
  
  const updateAnimal = async (animalId: string, dataToUpdate: Partial<Animal>) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const animalRef = doc(firestoreDb, "animals", animalId);
    const animalDoc = await getDoc(animalRef);
    if (!animalDoc.exists()) {
        throw new Error("El animal no existe.");
    }
    const oldAnimalData = animalDoc.data() as Animal;
    const today = new Date().toISOString().split('T')[0];

    if (dataToUpdate.location && dataToUpdate.location !== oldAnimalData.location) {
        await addEvent({
            animalId,
            date: today,
            type: 'Movimiento',
            details: `Movido del lote '${oldAnimalData.location || 'N/A'}' al lote '${dataToUpdate.location}'`
        });
    }

    if (dataToUpdate.status && dataToUpdate.status !== oldAnimalData.status) {
        let details = `Estado cambiado de '${oldAnimalData.status}' a '${dataToUpdate.status}'`;
        if (dataToUpdate.status === 'Venta' && dataToUpdate.salePrice) {
            details = `Vendido por $${dataToUpdate.salePrice}`;
        }
        if (dataToUpdate.status === 'Muerte' && dataToUpdate.deathReason) {
            details = `Muerte. Causa: ${dataToUpdate.deathReason}`;
        }
        await addEvent({
            animalId,
            date: today,
            type: 'Cambio de Estado',
            details
        });
    }

    await updateDoc(animalRef, dataToUpdate);
  };

  const addLot = async (lotName: string) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const lotId = lotName.toUpperCase().replace(/\s+/g, '_');
    const lotRef = doc(firestoreDb, "lots", lotId);
    await setDoc(lotRef, { name: lotName, userId: currentUser.uid });
  };
  
  const deleteLot = async (lotId: string) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const lotRef = doc(firestoreDb, "lots", lotId);
    await deleteDoc(lotRef);
  };

  const addOrigin = async (originName: string) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const originId = originName.toUpperCase().replace(/\s+/g, '_');
    const originRef = doc(firestoreDb, "origins", originId);
    await setDoc(originRef, { name: originName, userId: currentUser.uid });
  };

  const deleteOrigin = async (originId: string) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const originRef = doc(firestoreDb, "origins", originId);
    await deleteDoc(originRef);
  };

  const addOperation = async (collectionName: string, data: object) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    await addDoc(collection(firestoreDb, collectionName), { ...data, userId: currentUser.uid });
  };
  
  const addWeighing = async (weighing: Omit<Weighing, 'id'>) => addOperation("weighings", weighing);
  const addFather = async (father: Omit<Father, 'id'>) => addOperation("fathers", father);

  const addParturition = async (data: any) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    
    const batch = writeBatch(firestoreDb);
    const upperCaseMotherId = data.motherId.toUpperCase();

    const motherRef = doc(firestoreDb, "animals", upperCaseMotherId);
    batch.set(motherRef, {
        id: upperCaseMotherId,
        sex: 'Hembra',
        status: 'Activo',
        birthDate: 'N/A',
        userId: currentUser.uid,
    }, { merge: true });

    const parturitionRef = doc(collection(firestoreDb, "parturitions"));
    batch.set(parturitionRef, {
        goatId: upperCaseMotherId, 
        parturitionDate: data.parturitionDate, 
        sireId: data.sireId,
        offspringCount: data.offspring.length, 
        parturitionType: data.parturitionType,
        status: 'activa', 
        userId: currentUser.uid,
    });

    data.offspring.forEach((kid: any) => {
        const upperCaseKidId = kid.id.toUpperCase();
        const animalRef = doc(firestoreDb, "animals", upperCaseKidId);
        batch.set(animalRef, {
            id: upperCaseKidId, 
            sex: kid.sex, 
            status: kid.sex === 'Macho' ? 'Descartado' : 'Activo',
            birthDate: data.parturitionDate, 
            motherId: upperCaseMotherId, 
            fatherId: data.sireId,
            birthWeight: parseFloat(kid.birthWeight), 
            userId: currentUser.uid,
        }, { merge: true });
    });

    await batch.commit();
  };

  const addBreedingGroup = async (groupData: Omit<BreedingGroup, 'id'>) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const docRef = await addDoc(collection(firestoreDb, "breedingGroups"), { ...groupData, userId: currentUser.uid });
    return docRef.id;
  };

  const updateBreedingGroup = async (groupId: string, dataToUpdate: Partial<BreedingGroup>) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const groupRef = doc(firestoreDb, "breedingGroups", groupId);
    await updateDoc(groupRef, dataToUpdate);
  };

  const addServiceRecord = async (recordData: Omit<ServiceRecord, 'id'>) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    await addDoc(collection(firestoreDb, "serviceRecords"), { ...recordData, userId: currentUser.uid });
  };

  const startDryingProcess = async (parturitionId: string) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const parturitionRef = doc(firestoreDb, "parturitions", parturitionId);
    await updateDoc(parturitionRef, {
        status: 'en-secado',
        dryingStartDate: new Date().toISOString().split('T')[0]
    });
  };

  const setLactationAsDry = async (parturitionId: string) => {
    if (!currentUser) throw new Error("Usuario no autenticado");
    const parturitionRef = doc(firestoreDb, "parturitions", parturitionId);
    await updateDoc(parturitionRef, {
        status: 'seca'
    });
  };

  return (
    <DataContext.Provider value={{ 
        animals, fathers, weighings, parturitions, lots, origins, breedingGroups, serviceRecords, events, isLoading, 
        addAnimal,
        updateAnimal,
        addLot,
        deleteLot,
        addOrigin,
        deleteOrigin,
        addBreedingGroup,
        updateBreedingGroup,
        addServiceRecord,
        addWeighing,
        addParturition,
        fetchData: fetchDataFromLocalDb,
        addFather,
        startDryingProcess,
        setLactationAsDry,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

