import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db as localDb, Animal, Weighing, Parturition, Father, Lot, Origin, BreedingGroup, ServiceRecord, Event, FeedingPlan, EventType, BodyWeighing } from '../db/local';
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
  feedingPlans: FeedingPlan[];
  bodyWeighings: BodyWeighing[];
  isLoading: boolean;
  addAnimal: (animalData: Omit<Animal, 'id'> & { id: string }) => Promise<void>;
  updateAnimal: (animalId: string, dataToUpdate: Partial<Animal>) => Promise<void>;
  startDryingProcess: (parturitionId: string) => Promise<void>;
  setLactationAsDry: (parturitionId: string) => Promise<void>;
  addLot: (lotName: string) => Promise<void>;
  deleteLot: (lotId: string) => Promise<void>;
  addOrigin: (originName: string) => Promise<void>;
  deleteOrigin: (originId: string) => Promise<void>;
  addBreedingGroup: (groupData: Omit<BreedingGroup, 'id'>) => Promise<string>;
  updateBreedingGroup: (groupId: string, dataToUpdate: Partial<BreedingGroup>) => Promise<void>;
  deleteBreedingGroup: (groupId: string) => Promise<void>;
  addServiceRecord: (recordData: Omit<ServiceRecord, 'id'>) => Promise<void>;
  addFeedingPlan: (planData: Omit<FeedingPlan, 'id'>) => Promise<void>;
  addBatchEvent: (data: { lotName: string; date: string; type: EventType; details: string; }) => Promise<void>;
  addWeighing: (weighing: Omit<Weighing, 'id'>) => Promise<void>;
  addBodyWeighing: (weighing: Omit<BodyWeighing, 'id'>) => Promise<void>;
  addParturition: (data: any) => Promise<void>;
  fetchData: () => Promise<void>;
  addFather: (father: Omit<Father, 'id'>) => Promise<void>;
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
  feedingPlans: [],
  bodyWeighings: [],
  isLoading: true,
  addAnimal: async () => {},
  updateAnimal: async () => {},
  startDryingProcess: async () => {},
  setLactationAsDry: async () => {},
  addLot: async () => {},
  deleteLot: async () => {},
  addOrigin: async () => {},
  deleteOrigin: async () => {},
  addBreedingGroup: async () => '',
  updateBreedingGroup: async () => {},
  deleteBreedingGroup: async () => {},
  addServiceRecord: async () => {},
  addFeedingPlan: async () => {},
  addBatchEvent: async () => {},
  addWeighing: async () => {},
  addBodyWeighing: async () => {},
  addParturition: async () => {},
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
  const [lots, setLots] = useState<Lot[]>([]);
  const [origins, setOrigins] = useState<Origin[]>([]);
  const [breedingGroups, setBreedingGroups] = useState<BreedingGroup[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [feedingPlans, setFeedingPlans] = useState<FeedingPlan[]>([]);
  const [bodyWeighings, setBodyWeighings] = useState<BodyWeighing[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDataFromLocalDb = useCallback(async () => {
    try {
      const [animalsData, fathersData, weighingsData, partData, lotsData, originsData, breedingGroupsData, serviceRecordsData, eventsData, feedingPlansData, bodyWeighingsData] = await Promise.all([
        localDb.animals.toArray(),
        localDb.fathers.toArray(),
        localDb.weighings.toArray(),
        localDb.parturitions.toArray(),
        localDb.lots.toArray(),
        localDb.origins.toArray(),
        localDb.breedingGroups.toArray(),
        localDb.serviceRecords.toArray(),
        localDb.events.toArray(),
        localDb.feedingPlans.toArray(),
        localDb.bodyWeighings.toArray(),
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
      setFeedingPlans(feedingPlansData);
      setBodyWeighings(bodyWeighingsData);
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
            localDb.events.clear(), localDb.feedingPlans.clear(),
            localDb.bodyWeighings.clear(),
        ]).then(() => {
            setAnimals([]); setFathers([]); setWeighings([]); setParturitions([]); setLots([]); setOrigins([]); setBreedingGroups([]); setServiceRecords([]); setEvents([]); setFeedingPlans([]); setBodyWeighings([]);
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
                    let hasChanges = false;
                    for (const change of snapshot.docChanges()) {
                        hasChanges = true;
                        const docData = { ...change.doc.data(), id: change.doc.id };
                        if (change.type === "added" || change.type === "modified") {
                            await table.put(docData);
                        }
                        if (change.type === "removed") {
                            await table.delete(change.doc.id);
                        }
                    }
                    if (hasChanges) {
                        fetchDataFromLocalDb();
                    }
                }, (error) => {
                    if (error.code === 'permission-denied') return;
                    console.error(`Error sincronizando ${collectionName}:`, error);
                });
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
            syncCollection('feedingPlans', localDb.feedingPlans);
            syncCollection('bodyWeighings', localDb.bodyWeighings);
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
        const animalRef = doc(firestoreDb, "animals", animalData.id.toUpperCase());
        await setDoc(animalRef, { ...animalData, id: animalData.id.toUpperCase(), userId: currentUser.uid, createdAt: Date.now() });
    };

    const updateAnimal = async (animalId: string, dataToUpdate: Partial<Animal>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const animalRef = doc(firestoreDb, "animals", animalId);
        const animalDoc = await getDoc(animalRef);
        if (!animalDoc.exists()) { throw new Error("El animal no existe."); }
        const oldAnimalData = animalDoc.data() as Animal;
        const today = new Date().toISOString().split('T')[0];

        if (dataToUpdate.location !== undefined && dataToUpdate.location !== oldAnimalData.location) {
            await addEvent({ animalId, date: today, type: 'Movimiento', details: `Movido del lote '${oldAnimalData.location || 'N/A'}' al lote '${dataToUpdate.location || 'Sin Asignar'}'` });
        }
        if (dataToUpdate.status && dataToUpdate.status !== oldAnimalData.status) {
            let details = `Estado cambiado de '${oldAnimalData.status}' a '${dataToUpdate.status}'`;
            if (dataToUpdate.status === 'Venta' && dataToUpdate.salePrice) { details = `Vendido por $${dataToUpdate.salePrice}`; }
            if (dataToUpdate.status === 'Muerte' && dataToUpdate.deathReason) { details = `Muerte. Causa: ${dataToUpdate.deathReason}`; }
            await addEvent({ animalId, date: today, type: 'Cambio de Estado', details });
        }
        await updateDoc(animalRef, dataToUpdate);
    };

    const startDryingProcess = async (parturitionId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const parturitionRef = doc(firestoreDb, "parturitions", parturitionId);
        await updateDoc(parturitionRef, {
            status: 'en-secado',
            dryingStartDate: new Date().toISOString().split('T')[0],
        });
    };

    const setLactationAsDry = async (parturitionId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const parturitionRef = doc(firestoreDb, "parturitions", parturitionId);
        await updateDoc(parturitionRef, {
            status: 'seca',
        });
    };

    const addLot = async (lotName: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        await addDoc(collection(firestoreDb, "lots"), { name: lotName, userId: currentUser.uid });
    };

    const deleteLot = async (lotId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        await deleteDoc(doc(firestoreDb, "lots", lotId));
    };

    const addOrigin = async (originName: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        await addDoc(collection(firestoreDb, "origins"), { name: originName, userId: currentUser.uid });
    };

    const deleteOrigin = async (originId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        await deleteDoc(doc(firestoreDb, "origins", originId));
    };

    const addWeighing = async (weighing: Omit<Weighing, 'id'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        await addDoc(collection(firestoreDb, "weighings"), { ...weighing, userId: currentUser.uid });
    };
    
    const addBodyWeighing = async (weighing: Omit<BodyWeighing, 'id'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        await addDoc(collection(firestoreDb, "bodyWeighings"), { ...weighing, userId: currentUser.uid });
    };

    const addFather = async (father: Omit<Father, 'id'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        await addDoc(collection(firestoreDb, "fathers"), { ...father, userId: currentUser.uid });
    };
    
    const addParturition = async (data: any) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const batch = writeBatch(firestoreDb);
        const upperCaseMotherId = data.motherId.toUpperCase();
        const motherRef = doc(firestoreDb, "animals", upperCaseMotherId);
        batch.set(motherRef, { id: upperCaseMotherId, sex: 'Hembra', status: 'Activo', birthDate: 'N/A', userId: currentUser.uid }, { merge: true });
        const parturitionRef = doc(collection(firestoreDb, "parturitions"));
        batch.set(parturitionRef, { goatId: upperCaseMotherId, parturitionDate: data.parturitionDate, sireId: data.sireId, offspringCount: data.offspring.length, parturitionType: data.parturitionType, status: 'activa', userId: currentUser.uid });
        data.offspring.forEach((kid: any) => {
            const upperCaseKidId = kid.id.toUpperCase();
            const animalRef = doc(firestoreDb, "animals", upperCaseKidId);
            const newAnimalData = {
                id: upperCaseKidId,
                sex: kid.sex,
                status: kid.sex === 'Macho' ? 'Descartado' : 'Activo',
                birthDate: data.parturitionDate,
                motherId: upperCaseMotherId,
                fatherId: data.sireId,
                birthWeight: parseFloat(kid.birthWeight),
                userId: currentUser.uid,
                createdAt: Date.now()
            };
            batch.set(animalRef, newAnimalData, { merge: true });
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

    const deleteBreedingGroup = async (groupId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const groupRef = doc(firestoreDb, "breedingGroups", groupId);
        await deleteDoc(groupRef);
    };

    const addServiceRecord = async (recordData: Omit<ServiceRecord, 'id'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        await addDoc(collection(firestoreDb, "serviceRecords"), { ...recordData, userId: currentUser.uid });
    };

    const addBatchEvent = async (data: { lotName: string; date: string; type: EventType; details: string; }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const animalsInLot = animals.filter(animal => animal.location === data.lotName);
        if (animalsInLot.length === 0) {
            console.warn(`No se encontraron animales en el lote "${data.lotName}" para registrar el evento.`);
            return;
        }
        const batch = writeBatch(firestoreDb);
        const eventsCollection = collection(firestoreDb, "events");
        animalsInLot.forEach(animal => {
            const eventRef = doc(eventsCollection);
            const newEvent: Omit<Event, 'id'> = { animalId: animal.id, date: data.date, type: data.type, details: data.details, lotName: data.lotName, notes: `Evento aplicado a todo el lote: ${data.lotName}` };
            batch.set(eventRef, { ...newEvent, userId: currentUser.uid });
        });
        await batch.commit();
    };
    
    const addFeedingPlan = async (planData: Omit<FeedingPlan, 'id'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        await addDoc(collection(firestoreDb, "feedingPlans"), { ...planData, userId: currentUser.uid });
    };

  return (
    <DataContext.Provider value={{ 
        animals, fathers, weighings, parturitions, lots, origins, breedingGroups, serviceRecords, events, feedingPlans, bodyWeighings, isLoading, 
        addAnimal,
        updateAnimal,
        startDryingProcess,
        setLactationAsDry,
        addLot,
        deleteLot,
        addOrigin,
        deleteOrigin,
        addBreedingGroup,
        updateBreedingGroup,
        deleteBreedingGroup,
        addServiceRecord,
        addFeedingPlan,
        addBatchEvent,
        addWeighing,
        addBodyWeighing,
        addParturition,
        fetchData: fetchDataFromLocalDb,
        addFather
      }}
    >
      {children}
    </DataContext.Provider>
  );
};