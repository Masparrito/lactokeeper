// src/context/DataContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Animal, Weighing, Parturition, Father, Lot, Origin, BreedingSeason, SireLot, ServiceRecord, Event, FeedingPlan, EventType, BodyWeighing, Product, HealthPlan, HealthPlanTask, HealthEvent, initDB, getDB } from '../db/local';
import { db as firestoreDb } from '../firebaseConfig';
import { useAuth } from './AuthContext';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc, writeBatch, getDoc } from "firebase/firestore";

export type SyncStatus = 'idle' | 'syncing' | 'offline';

interface IDataContext {
  animals: Animal[];
  fathers: Father[];
  weighings: Weighing[];
  parturitions: Parturition[];
  lots: Lot[];
  origins: Origin[];
  breedingSeasons: BreedingSeason[];
  sireLots: SireLot[];
  serviceRecords: ServiceRecord[];
  events: Event[];
  feedingPlans: FeedingPlan[];
  bodyWeighings: BodyWeighing[];
  products: Product[];
  healthPlans: HealthPlan[];
  healthPlanTasks: HealthPlanTask[];
  healthEvents: HealthEvent[];
  isLoading: boolean;
  syncStatus: SyncStatus;
  addAnimal: (animalData: Omit<Animal, 'id'> & { id: string }) => Promise<void>;
  updateAnimal: (animalId: string, dataToUpdate: Partial<Animal>) => Promise<void>;
  deleteAnimalPermanently: (animalId: string) => Promise<void>;
  startDryingProcess: (parturitionId: string) => Promise<void>;
  setLactationAsDry: (parturitionId: string) => Promise<void>;
  addLot: (lotName: string) => Promise<void>;
  deleteLot: (lotId: string) => Promise<void>;
  addOrigin: (originName: string) => Promise<void>;
  deleteOrigin: (originId: string) => Promise<void>;
  addBreedingSeason: (seasonData: Omit<BreedingSeason, 'id'>) => Promise<string>;
  updateBreedingSeason: (seasonId: string, dataToUpdate: Partial<BreedingSeason>) => Promise<void>;
  deleteBreedingSeason: (seasonId: string) => Promise<void>;
  addSireLot: (lotData: Omit<SireLot, 'id'>) => Promise<string>;
  updateSireLot: (lotId: string, dataToUpdate: Partial<SireLot>) => Promise<void>;
  deleteSireLot: (lotId: string) => Promise<void>;
  addServiceRecord: (recordData: Omit<ServiceRecord, 'id'>) => Promise<void>;
  addFeedingPlan: (planData: Omit<FeedingPlan, 'id'>) => Promise<void>;
  addBatchEvent: (data: { lotName: string; date: string; type: EventType; details: string; }) => Promise<void>;
  addWeighing: (weighing: Omit<Weighing, 'id'>) => Promise<void>;
  addBodyWeighing: (weighing: Omit<BodyWeighing, 'id'>) => Promise<void>;
  addParturition: (data: any) => Promise<void>;
  fetchData: () => Promise<void>;
  addFather: (father: Omit<Father, 'id'>) => Promise<void>;
  addProduct: (productData: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (productId: string, dataToUpdate: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addHealthPlan: (planData: Omit<HealthPlan, 'id'>) => Promise<void>;
  updateHealthPlan: (planId: string, dataToUpdate: Partial<HealthPlan>) => Promise<void>;
  deleteHealthPlan: (planId: string) => Promise<void>;
  addHealthPlanTask: (taskData: Omit<HealthPlanTask, 'id'>) => Promise<void>;
  updateHealthPlanTask: (taskId: string, dataToUpdate: Partial<HealthPlanTask>) => Promise<void>;
  deleteHealthPlanTask: (taskId: string) => Promise<void>;
  addHealthEvent: (eventData: Omit<HealthEvent, 'id'>) => Promise<void>;
}

const DataContext = createContext<IDataContext>({
  animals: [], fathers: [], weighings: [], parturitions: [], lots: [], origins: [], breedingSeasons: [], sireLots: [], serviceRecords: [], events: [], feedingPlans: [], bodyWeighings: [], products: [], healthPlans: [], healthPlanTasks: [], healthEvents: [],
  isLoading: true,
  syncStatus: 'idle',
  addAnimal: async () => {}, updateAnimal: async () => {}, deleteAnimalPermanently: async () => {}, startDryingProcess: async () => {}, setLactationAsDry: async () => {}, addLot: async () => {}, deleteLot: async () => {}, addOrigin: async () => {}, deleteOrigin: async () => {},
  addBreedingSeason: async () => '', updateBreedingSeason: async () => {}, deleteBreedingSeason: async () => {}, addSireLot: async () => '', updateSireLot: async () => {}, deleteSireLot: async () => {}, addServiceRecord: async () => {}, addFeedingPlan: async () => {}, addBatchEvent: async () => {}, addWeighing: async () => {}, addBodyWeighing: async () => {},
  addParturition: async () => {}, fetchData: async () => {}, addFather: async () => {}, addProduct: async () => {}, updateProduct: async () => {}, deleteProduct: async () => {}, addHealthPlan: async () => {}, updateHealthPlan: async () => {}, deleteHealthPlan: async () => {},
  addHealthPlanTask: async () => {}, updateHealthPlanTask: async () => {}, deleteHealthPlanTask: async () => {}, addHealthEvent: async () => {},
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
  const [breedingSeasons, setBreedingSeasons] = useState<BreedingSeason[]>([]);
  const [sireLots, setSireLots] = useState<SireLot[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [feedingPlans, setFeedingPlans] = useState<FeedingPlan[]>([]);
  const [bodyWeighings, setBodyWeighings] = useState<BodyWeighing[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [healthPlans, setHealthPlans] = useState<HealthPlan[]>([]);
  const [healthPlanTasks, setHealthPlanTasks] = useState<HealthPlanTask[]>([]);
  const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'idle' : 'offline');
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDataFromLocalDb = useCallback(async () => {
    try {
      const localDb = getDB();
      const [animalsData, fathersData, weighingsData, partData, lotsData, originsData, breedingSeasonsData, sireLotsData, serviceRecordsData, eventsData, feedingPlansData, bodyWeighingsData, productsData, healthPlansData, healthPlanTasksData, healthEventsData] = await Promise.all([
        localDb.animals.toArray(), localDb.fathers.toArray(), localDb.weighings.toArray(),
        localDb.parturitions.toArray(), localDb.lots.toArray(), localDb.origins.toArray(),
        localDb.breedingSeasons.toArray(), localDb.sireLots.toArray(), localDb.serviceRecords.toArray(), 
        localDb.events.toArray(), localDb.feedingPlans.toArray(), localDb.bodyWeighings.toArray(), 
        localDb.products.toArray(), localDb.healthPlans.toArray(), localDb.healthPlanTasks.toArray(), 
        localDb.healthEvents.toArray(),
      ]);
      setAnimals(animalsData); setFathers(fathersData); setWeighings(weighingsData); setParturitions(partData);
      setLots(lotsData); setOrigins(originsData); setBreedingSeasons(breedingSeasonsData); setSireLots(sireLotsData); 
      setServiceRecords(serviceRecordsData); setEvents(eventsData); setFeedingPlans(feedingPlansData); 
      setBodyWeighings(bodyWeighingsData); setProducts(productsData); setHealthPlans(healthPlansData); 
      setHealthPlanTasks(healthPlanTasksData); setHealthEvents(healthEventsData);
    } catch (error) { console.error("Error al cargar datos locales:", error); } 
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    let unsubscribers: (() => void)[] = [];
    const handleOnline = () => setSyncStatus('idle');
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const setupSync = async () => {
        if (!currentUser) {
            setIsLoading(false);
            setAnimals([]); setFathers([]); setWeighings([]); setParturitions([]); setLots([]); setOrigins([]);
            setBreedingSeasons([]); setSireLots([]); setServiceRecords([]); setEvents([]); setFeedingPlans([]); 
            setBodyWeighings([]); setProducts([]); setHealthPlans([]); setHealthPlanTasks([]); setHealthEvents([]);
            return;
        }

        setIsLoading(true);
        try {
            const localDb = await initDB();
            await fetchDataFromLocalDb();
            const q = (collectionName: string) => query(collection(firestoreDb, collectionName), where("userId", "==", currentUser.uid));
            
            const syncCollection = (collectionName: string, table: any) => {
                const unsubscribe = onSnapshot(q(collectionName), async (snapshot) => {
                    if (snapshot.docChanges().length > 0) {
                        console.log(`[Sync] Recibidos ${snapshot.docChanges().length} cambios para '${collectionName}'. Actualizando DB local.`);
                        if (navigator.onLine) {
                            setSyncStatus('syncing');
                            if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                            syncTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
                        }
                    }
                    
                    const batch = [];
                    for (const change of snapshot.docChanges()) {
                        const docData = { ...change.doc.data(), id: change.doc.id };
                        if (change.type === "added" || change.type === "modified") batch.push(table.put(docData));
                        if (change.type === "removed") batch.push(table.delete(change.doc.id));
                    }
                    if (batch.length > 0) { await Promise.all(batch); fetchDataFromLocalDb(); }
                }, (error) => { if (error.code === 'permission-denied') return; console.error(`Error sincronizando ${collectionName}:`, error); });
                unsubscribers.push(unsubscribe);
            };

            syncCollection('animals', localDb.animals);
            syncCollection('fathers', localDb.fathers);
            syncCollection('parturitions', localDb.parturitions);
            syncCollection('weighings', localDb.weighings);
            syncCollection('lots', localDb.lots);
            syncCollection('origins', localDb.origins);
            syncCollection('breedingSeasons', localDb.breedingSeasons);
            syncCollection('sireLots', localDb.sireLots);
            syncCollection('serviceRecords', localDb.serviceRecords);
            syncCollection('events', localDb.events);
            syncCollection('feedingPlans', localDb.feedingPlans);
            syncCollection('bodyWeighings', localDb.bodyWeighings);
            syncCollection('products', localDb.products);
            syncCollection('healthPlans', localDb.healthPlans);
            syncCollection('healthPlanTasks', localDb.healthPlanTasks);
            syncCollection('healthEvents', localDb.healthEvents);
        } catch (error) { console.error("Fallo crítico en la inicialización de DataProvider:", error); }
    };
    setupSync();
    return () => { unsubscribers.forEach(unsub => unsub()); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
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
            if (dataToUpdate.status === 'Venta') { details = `Vendido por ${dataToUpdate.salePrice || 'precio no especificado'}. Comprador: ${dataToUpdate.saleBuyer || 'N/A'}. Fin: ${dataToUpdate.salePurpose || 'N/A'}.`; }
            if (dataToUpdate.status === 'Muerte') { details = `Muerte. Causa: ${dataToUpdate.deathReason || 'No especificada'}.`; }
            if (dataToUpdate.status === 'Descarte') { details = `Descarte. Causa: ${dataToUpdate.cullReason || 'No especificada'}. ${dataToUpdate.cullReasonDetails || ''}`; }
            await addEvent({ animalId, date: dataToUpdate.endDate || today, type: 'Cambio de Estado', details });
        }
        await updateDoc(animalRef, dataToUpdate);
    };
    const deleteAnimalPermanently = async (animalId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await deleteDoc(doc(firestoreDb, "animals", animalId)); };
    const startDryingProcess = async (parturitionId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await updateDoc(doc(firestoreDb, "parturitions", parturitionId), { status: 'en-secado', dryingStartDate: new Date().toISOString().split('T')[0], }); };
    const setLactationAsDry = async (parturitionId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await updateDoc(doc(firestoreDb, "parturitions", parturitionId), { status: 'seca', }); };
    const addLot = async (lotName: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "lots"), { name: lotName, userId: currentUser.uid }); };
    const deleteLot = async (lotId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await deleteDoc(doc(firestoreDb, "lots", lotId)); };
    const addOrigin = async (originName: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "origins"), { name: originName, userId: currentUser.uid }); };
    const deleteOrigin = async (originId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await deleteDoc(doc(firestoreDb, "origins", originId)); };
    const addWeighing = async (weighing: Omit<Weighing, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "weighings"), { ...weighing, userId: currentUser.uid }); };
    const addBodyWeighing = async (weighing: Omit<BodyWeighing, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "bodyWeighings"), { ...weighing, userId: currentUser.uid }); };
    const addFather = async (father: Omit<Father, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "fathers"), { ...father, userId: currentUser.uid }); };
    
    // --- FUNCIÓN ACTUALIZADA v4.0 ---
    const addParturition = async (data: any) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const batch = writeBatch(firestoreDb);
        const upperCaseMotherId = data.motherId.toUpperCase();
        
        // Determina el estado de la lactancia. Para abortos, depende de si se induce o no.
        const lactationStatus = (data.parturitionOutcome === 'Aborto' && !data.inducedLactation) 
            ? 'finalizada' 
            : 'activa';

        const parturitionRef = doc(collection(firestoreDb, "parturitions"));
        batch.set(parturitionRef, {
            goatId: upperCaseMotherId,
            parturitionDate: data.parturitionDate,
            sireId: data.sireId,
            offspringCount: data.offspringCount,
            parturitionType: data.parturitionType,
            parturitionOutcome: data.parturitionOutcome,
            status: lactationStatus,
            userId: currentUser.uid,
        });

        if (data.liveOffspring && data.liveOffspring.length > 0) {
            data.liveOffspring.forEach((kid: any) => {
                const upperCaseKidId = kid.id.toUpperCase();
                const animalRef = doc(firestoreDb, "animals", upperCaseKidId);
                const newAnimalData = {
                    id: upperCaseKidId,
                    sex: kid.sex,
                    status: 'Activo',
                    birthDate: data.parturitionDate,
                    motherId: upperCaseMotherId,
                    fatherId: data.sireId,
                    birthWeight: parseFloat(kid.birthWeight),
                    userId: currentUser.uid,
                    createdAt: Date.now(),
                };
                batch.set(animalRef, newAnimalData);
            });
        }
        
        await batch.commit();
    };

    const addServiceRecord = async (recordData: Omit<ServiceRecord, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "serviceRecords"), { ...recordData, userId: currentUser.uid }); };
    const addBatchEvent = async (data: { lotName: string; date: string; type: EventType; details: string; }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const animalsInLot = animals.filter(animal => animal.location === data.lotName);
        if (animalsInLot.length === 0) { console.warn(`No se encontraron animales en el lote "${data.lotName}" para registrar el evento.`); return; }
        const batch = writeBatch(firestoreDb);
        const eventsCollection = collection(firestoreDb, "events");
        animalsInLot.forEach(animal => { const eventRef = doc(eventsCollection); const newEvent: Omit<Event, 'id'> = { animalId: animal.id, date: data.date, type: data.type, details: data.details, lotName: data.lotName, notes: `Evento aplicado a todo el lote: ${data.lotName}` }; batch.set(eventRef, { ...newEvent, userId: currentUser.uid }); });
        await batch.commit();
    };
    const addFeedingPlan = async (planData: Omit<FeedingPlan, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "feedingPlans"), { ...planData, userId: currentUser.uid }); };
    const addProduct = async (productData: Omit<Product, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "products"), { ...productData, userId: currentUser.uid }); };
    const updateProduct = async (productId: string, dataToUpdate: Partial<Product>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await updateDoc(doc(firestoreDb, "products", productId), dataToUpdate); };
    const deleteProduct = async (productId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await deleteDoc(doc(firestoreDb, "products", productId)); };
    const addHealthPlan = async (planData: Omit<HealthPlan, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "healthPlans"), { ...planData, userId: currentUser.uid }); };
    const updateHealthPlan = async (planId: string, dataToUpdate: Partial<HealthPlan>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await updateDoc(doc(firestoreDb, "healthPlans", planId), dataToUpdate); };
    const deleteHealthPlan = async (planId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await deleteDoc(doc(firestoreDb, "healthPlans", planId)); };
    const addHealthPlanTask = async (taskData: Omit<HealthPlanTask, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "healthPlanTasks"), { ...taskData, userId: currentUser.uid }); };
    const updateHealthPlanTask = async (taskId: string, dataToUpdate: Partial<HealthPlanTask>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await updateDoc(doc(firestoreDb, "healthPlanTasks", taskId), dataToUpdate); };
    const deleteHealthPlanTask = async (taskId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await deleteDoc(doc(firestoreDb, "healthPlanTasks", taskId)); };
    const addHealthEvent = async (eventData: Omit<HealthEvent, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await addDoc(collection(firestoreDb, "healthEvents"), { ...eventData, userId: currentUser.uid }); };
    const addBreedingSeason = async (seasonData: Omit<BreedingSeason, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); const docRef = await addDoc(collection(firestoreDb, "breedingSeasons"), { ...seasonData, userId: currentUser.uid }); return docRef.id; };
    const updateBreedingSeason = async (seasonId: string, dataToUpdate: Partial<BreedingSeason>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await updateDoc(doc(firestoreDb, "breedingSeasons", seasonId), dataToUpdate); };
    const deleteBreedingSeason = async (seasonId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await deleteDoc(doc(firestoreDb, "breedingSeasons", seasonId)); };
    const addSireLot = async (lotData: Omit<SireLot, 'id'>) => { if (!currentUser) throw new Error("Usuario no autenticado"); const docRef = await addDoc(collection(firestoreDb, "sireLots"), { ...lotData, userId: currentUser.uid }); return docRef.id; };
    const updateSireLot = async (lotId: string, dataToUpdate: Partial<SireLot>) => { if (!currentUser) throw new Error("Usuario no autenticado"); await updateDoc(doc(firestoreDb, "sireLots", lotId), dataToUpdate); };
    const deleteSireLot = async (lotId: string) => { if (!currentUser) throw new Error("Usuario no autenticado"); await deleteDoc(doc(firestoreDb, "sireLots", lotId)); };

  return (
    <DataContext.Provider value={{ 
        animals, fathers, weighings, parturitions, lots, origins, breedingSeasons, sireLots, serviceRecords, events, feedingPlans, bodyWeighings, products, healthPlans, healthPlanTasks, healthEvents, isLoading, syncStatus,
        addAnimal, updateAnimal, deleteAnimalPermanently, startDryingProcess, setLactationAsDry, addLot, deleteLot, addOrigin, deleteOrigin,
        addBreedingSeason, updateBreedingSeason, deleteBreedingSeason, addSireLot, updateSireLot, deleteSireLot, addServiceRecord, 
        addFeedingPlan, addBatchEvent, addWeighing, addBodyWeighing, addParturition, fetchData: fetchDataFromLocalDb, addFather, 
        addProduct, updateProduct, deleteProduct, addHealthPlan, updateHealthPlan, deleteHealthPlan, 
        addHealthPlanTask, updateHealthPlanTask, deleteHealthPlanTask, addHealthEvent
      }}
    >
      {children}
    </DataContext.Provider>
  );
};