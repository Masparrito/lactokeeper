// src/context/DataContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Table } from 'dexie';
import { Animal, Weighing, Parturition, Father, Lot, Origin, BreedingSeason, SireLot, ServiceRecord, Event, EventType, BodyWeighing, Product, HealthPlan, PlanActivity, HealthEvent, initDB, getDB, FeedingPlan, GanaderoOSTables } from '../db/local';
import { db as firestoreDb } from '../firebaseConfig';
import { useAuth } from './AuthContext';
import { collection, query, where, onSnapshot, deleteDoc, doc, setDoc, writeBatch, Timestamp, serverTimestamp } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

export type SyncStatus = 'idle' | 'syncing' | 'offline';

interface IDataContext {
  // --- Datos ---
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
  planActivities: PlanActivity[];
  healthEvents: HealthEvent[];
  // --- Estado y Funciones ---
  isLoading: boolean;
  syncStatus: SyncStatus;
  addAnimal: (animalData: Omit<Animal, 'id' | '_synced' | 'userId' | 'createdAt'> & { id?: string }) => Promise<void>;
  updateAnimal: (animalId: string, dataToUpdate: Partial<Animal>) => Promise<void>;
  deleteAnimalPermanently: (animalId: string) => Promise<void>;
  startDryingProcess: (parturitionId: string) => Promise<void>;
  setLactationAsDry: (parturitionId: string) => Promise<void>;
  addLot: (lotData: { name: string, parentLotId?: string }) => Promise<void>;
  deleteLot: (lotId: string) => Promise<void>;
  addOrigin: (originName: string) => Promise<void>;
  deleteOrigin: (originId: string) => Promise<void>;
  addBreedingSeason: (seasonData: Omit<BreedingSeason, 'id' | 'userId' | '_synced'>) => Promise<string>;
  updateBreedingSeason: (seasonId: string, dataToUpdate: Partial<BreedingSeason>) => Promise<void>;
  deleteBreedingSeason: (seasonId: string) => Promise<void>;
  addSireLot: (lotData: Omit<SireLot, 'id' | 'userId' | '_synced'>) => Promise<string>;
  updateSireLot: (lotId: string, dataToUpdate: Partial<SireLot>) => Promise<void>;
  deleteSireLot: (lotId: string) => Promise<void>;
  addServiceRecord: (recordData: Omit<ServiceRecord, 'id' | 'userId' | '_synced'>) => Promise<void>;
  addFeedingPlan: (planData: Omit<FeedingPlan, 'id' | 'userId' | '_synced'>) => Promise<void>;
  addBatchEvent: (data: { lotName: string; date: string; type: EventType; details: string; }) => Promise<void>;
  addWeighing: (weighing: Omit<Weighing, 'id' | 'userId' | '_synced'>) => Promise<void>;
  addBodyWeighing: (weighing: Omit<BodyWeighing, 'id' | 'userId' | '_synced'>) => Promise<void>;
  deleteWeighingSession: (date: string) => Promise<void>;
  addParturition: (data: any) => Promise<void>;
  fetchData: () => Promise<void>;
  addFather: (father: { id: string, name: string }) => Promise<void>;
  addProduct: (productData: Omit<Product, 'id' | 'userId' | '_synced'>) => Promise<void>;
  updateProduct: (productId: string, dataToUpdate: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addHealthPlanWithActivities: (planData: Omit<HealthPlan, 'id' | 'userId' | '_synced'>, activities: Omit<PlanActivity, 'id' | 'healthPlanId' | 'userId' | '_synced'>[]) => Promise<void>;
  updateHealthPlan: (planId: string, dataToUpdate: Partial<HealthPlan>) => Promise<void>;
  deleteHealthPlan: (planId: string) => Promise<void>;
  addPlanActivity: (activityData: Omit<PlanActivity, 'id' | 'userId' | '_synced'>) => Promise<void>;
  updatePlanActivity: (activityId: string, dataToUpdate: Partial<PlanActivity>) => Promise<void>;
  deletePlanActivity: (activityId: string) => Promise<void>;
  addHealthEvent: (eventData: Omit<HealthEvent, 'id' | 'userId' | '_synced'>) => Promise<void>;
}


const DataContext = createContext<IDataContext>({} as IDataContext);

export const useData = () => useContext(DataContext);

// Helper de Sincronización
const syncToFirestore = async (collectionName: string, id: string, data: any) => {
    try {
        const cleanData = Object.entries(data).reduce((acc, [key, value]) => {
            if (value !== undefined && key !== '_synced') {
                (acc as any)[key] = value;
            }
            return acc;
        }, {});

        const table = getDB()[collectionName as keyof GanaderoOSTables] as Table<any, any>;
        const existingDoc = await table.get(id);
        const needsTimestamp = !existingDoc || !(existingDoc as any).createdAt || data.createdAt === serverTimestamp();

        const dataToSync: Record<string, any> = { ...cleanData };
        if (needsTimestamp && !(cleanData as any).createdAt) {
            dataToSync.createdAt = serverTimestamp();
        } else if ((cleanData as any).createdAt === null || (cleanData as any).createdAt === undefined) {
             delete dataToSync.createdAt;
        }

        await setDoc(doc(firestoreDb, collectionName, id), dataToSync, { merge: true });
        await table.update(id, { _synced: true });

    } catch (error) {
        console.error(`Firestore sync for ${collectionName} (${id}) failed:`, error);
        const table = getDB()[collectionName as keyof GanaderoOSTables] as Table<any, any>;
        try {
            await table.update(id, { _synced: false });
        } catch (localUpdateError) {
             console.error(`Failed to update sync status locally for ${collectionName} (${id}):`, localUpdateError);
        }
    }
};

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
    const [planActivities, setPlanActivities] = useState<PlanActivity[]>([]);
    const [healthEvents, setHealthEvents] = useState<HealthEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'idle' : 'offline');
    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const syncQueueRef = useRef<(() => Promise<void>)[]>([]);
    const isSyncingRef = useRef(false);

    // --- processSyncQueue y enqueueSync ---
    const processSyncQueue = async () => {
        if (isSyncingRef.current || syncQueueRef.current.length === 0 || !navigator.onLine) {
            if (syncQueueRef.current.length === 0 && !isSyncingRef.current) { setSyncStatus('idle'); }
            return;
        }
        isSyncingRef.current = true;
        setSyncStatus('syncing');
        const syncOperation = syncQueueRef.current.shift();
        if (syncOperation) {
            try { await syncOperation(); } catch (error) { console.error("Sync Queue: Error processing item:", error); }
        }
        isSyncingRef.current = false;
        if (syncQueueRef.current.length > 0) {
            setTimeout(processSyncQueue, 100);
        } else {
             setSyncStatus('idle');
             if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
             syncTimeoutRef.current = setTimeout(() => { if (syncQueueRef.current.length === 0 && !isSyncingRef.current) setSyncStatus('idle'); }, 2000);
        }
    };
    const enqueueSync = (operation: () => Promise<void>) => {
        syncQueueRef.current.push(operation);
        if (!isSyncingRef.current) { processSyncQueue(); }
    };


    // --- CORRECCIÓN DEL BUCLE INFINITO ---
    const fetchDataFromLocalDb = useCallback(async () => {
        try {
            const localDb = getDB();
            const [animalsData, fathersData, weighingsData, partData, lotsData, originsData, breedingSeasonsData, sireLotsData, serviceRecordsData, eventsData, feedingPlansData, bodyWeighingsData, productsData, healthPlansData, planActivitiesData, healthEventsData] = await Promise.all([
                localDb.animals.toArray(), localDb.fathers.toArray(), localDb.weighings.toArray(),
                localDb.parturitions.toArray(), localDb.lots.toArray(), localDb.origins.toArray(),
                localDb.breedingSeasons.toArray(), localDb.sireLots.toArray(), localDb.serviceRecords.toArray(),
                localDb.events.toArray(), localDb.feedingPlans.toArray(), localDb.bodyWeighings.toArray(),
                localDb.products.toArray(), localDb.healthPlans.toArray(), localDb.planActivities.toArray(),
                localDb.healthEvents.toArray(),
            ]);
            setAnimals(animalsData); setFathers(fathersData); setWeighings(weighingsData); setParturitions(partData);
            setLots(lotsData); setOrigins(originsData); setBreedingSeasons(breedingSeasonsData); setSireLots(sireLotsData);
            setServiceRecords(serviceRecordsData); setEvents(eventsData); setFeedingPlans(feedingPlansData);
            setBodyWeighings(bodyWeighingsData);
            setProducts(productsData); setHealthPlans(healthPlansData);
            setPlanActivities(planActivitiesData); setHealthEvents(healthEventsData);
        } catch (error) { console.error("Error al cargar datos locales:", error); }
        finally {
            // --- CORRECCIÓN 1: Simplemente setear a false ---
            // La lógica de "isLoading" (ponerlo en true) se maneja en setupSync
            setIsLoading(false);
        }
    // --- CORRECCIÓN 2: Eliminar 'isLoading' del array de dependencias ---
    }, []);

    useEffect(() => {
        let unsubscribers: (() => void)[] = [];
        const handleOnline = () => { setSyncStatus('idle'); processSyncQueue(); };
        const handleOffline = () => setSyncStatus('offline');
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const setupSync = async () => {
            if (!currentUser) {
                setIsLoading(false);
                setAnimals([]); setFathers([]); setWeighings([]); setParturitions([]); setLots([]); setOrigins([]);
                setBreedingSeasons([]); setSireLots([]); setServiceRecords([]); setEvents([]); setFeedingPlans([]);
                setBodyWeighings([]); setProducts([]); setHealthPlans([]); setPlanActivities([]); setHealthEvents([]);
                return;
            }
            setIsLoading(true); // Poner en carga
            try {
                const localDb = await initDB();
                await fetchDataFromLocalDb(); // Cargar datos locales (esto pondrá isLoading(false))
                
                // Configurar listeners de Firestore
                const q = (collectionName: string) => query(collection(firestoreDb, collectionName), where("userId", "==", currentUser.uid));
                const syncCollection = (collectionName: keyof GanaderoOSTables, table: Table<any, any>) => {
                    const unsubscribe = onSnapshot(q(collectionName), async (snapshot) => {
                        if (snapshot.metadata.hasPendingWrites) return;
                        const changes = snapshot.docChanges().map(change => {
                            const docData: any = { id: change.doc.id, ...change.doc.data() };
                            Object.keys(docData).forEach(key => { if (docData[key] instanceof Timestamp) { docData[key] = docData[key].toMillis(); } });
                            return { type: change.type, data: docData };
                        });

                        if (changes.length > 0) {
                            if (navigator.onLine && syncStatus !== 'syncing') { setSyncStatus('syncing'); if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); syncTimeoutRef.current = setTimeout(() => { if (syncQueueRef.current.length === 0 && !isSyncingRef.current) setSyncStatus('idle'); }, 2000); }
                            try {
                                await localDb.transaction('rw', table, async () => {
                                    for (const change of changes) {
                                        change.data._synced = true;
                                        if (change.type === "added" || change.type === "modified") await table.put(change.data);
                                        else if (change.type === "removed") await table.delete(change.data.id);
                                    }
                                });
                                await fetchDataFromLocalDb(); // Recargar datos después de la transacción
                            } catch (transactionError) { console.error(`Dexie transaction error during sync for ${collectionName}:`, transactionError); }
                        }
                    }, (error) => { if (error.code === 'permission-denied') console.warn(`Permission denied for ${collectionName}.`); else console.error(`Firestore snapshot error for ${collectionName}:`, error); });
                    unsubscribers.push(unsubscribe);
                };

                // Sincronizar todas las colecciones
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
                syncCollection('planActivities', localDb.planActivities);
                syncCollection('healthEvents', localDb.healthEvents);

            } catch (error) { console.error("Fallo crítico en la inicialización:", error); setIsLoading(false); }
        };
        setupSync();
        return () => { unsubscribers.forEach(unsub => unsub()); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
    // --- CORRECCIÓN 3: 'fetchDataFromLocalDb' es estable y puede estar en la dependencia ---
    }, [currentUser, fetchDataFromLocalDb]); // <-- El array de dependencias está bien así

    // --- FUNCIONES DE ESCRITURA (Local-First con Enqueue) ---

    // internalAddEvent
    const internalAddEvent = (eventData: Omit<Event, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) return;
        (async () => {
            try {
                const localDb = getDB();
                const newEvent: Event = { id: uuidv4(), ...eventData, userId: currentUser.uid, _synced: false };
                await localDb.events.put(newEvent);
                enqueueSync(() => syncToFirestore("events", newEvent.id, newEvent));
                setTimeout(fetchDataFromLocalDb, 50);
            } catch (err) { console.error("Error en registro de evento local:", err); }
        })();
    };

    // addAnimal (CON LÓGICA DE EVENTO CORREGIDA)
    const addAnimal = async (animalData: Omit<Animal, 'id' | '_synced' | 'userId' | 'createdAt'> & { id?: string }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const animalId = (animalData.id ? animalData.id : `REF-${Date.now()}`).toUpperCase();
        const newAnimal: Animal = {
            ...animalData,
            id: animalId,
            userId: currentUser.uid,
            createdAt: Date.now(),
            _synced: false
         };

        await localDb.animals.put(newAnimal);

        // --- LÓGICA DE EVENTO INICIAL CORREGIDA ---
        if (newAnimal.birthDate && newAnimal.birthDate !== 'N/A') {
             internalAddEvent({
                animalId: newAnimal.id,
                date: newAnimal.birthDate,
                type: 'Nacimiento',
                details: `Nacido con ${newAnimal.birthWeight || 'N/A'} Kg. Madre: ${newAnimal.motherId || 'N/A'}. Padre: ${newAnimal.fatherId || 'N/A'}.`,
                lotName: newAnimal.location
            });
        } else {
             internalAddEvent({
                 animalId: newAnimal.id,
                 date: new Date(newAnimal.createdAt!).toISOString().split('T')[0],
                 type: 'Registro',
                 details: `Animal ${newAnimal.isReference ? 'de Referencia ' : ''}registrado. Datos de nacimiento no especificados.`,
                 lotName: newAnimal.location
            });
        }
        // --- FIN DE LÓGICA CORREGIDA ---

        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("animals", newAnimal.id, newAnimal));
    };

    // updateAnimal
    const updateAnimal = async (animalId: string, dataToUpdate: Partial<Animal>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = animalId.toUpperCase();
        const today = new Date().toISOString().split('T')[0];
        const currentAnimal = await localDb.animals.get(upperId);
        if (!currentAnimal) throw new Error("Animal no encontrado para actualizar");

        if (dataToUpdate.birthDate && dataToUpdate.birthDate !== 'N/A' && !dataToUpdate.lifecycleStage) {
            dataToUpdate.lifecycleStage = calculateLifecycleStage(dataToUpdate.birthDate, currentAnimal.sex) as any;
        } else if ((dataToUpdate.birthDate === 'N/A' || dataToUpdate.birthDate === '') && !dataToUpdate.lifecycleStage) {
             delete dataToUpdate.lifecycleStage;
             dataToUpdate.birthDate = 'N/A';
        }

        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.animals.update(upperId, dataWithSyncFlag);

        // Logging de eventos
        if (dataToUpdate.location !== undefined && dataToUpdate.location !== currentAnimal.location) internalAddEvent({ animalId: upperId, date: today, type: 'Movimiento', details: `Movido de '${currentAnimal.location || 'Sin Asignar'}' a '${dataToUpdate.location || 'Sin Asignar'}'`, lotName: dataToUpdate.location || '' });
        if (dataToUpdate.reproductiveStatus !== undefined && dataToUpdate.reproductiveStatus !== currentAnimal.reproductiveStatus) internalAddEvent({ animalId: upperId, date: today, type: 'Cambio de Estado', details: `Estado reproductivo: ${dataToUpdate.reproductiveStatus}` });
        if (dataToUpdate.status !== undefined && dataToUpdate.status !== currentAnimal.status) internalAddEvent({ animalId: upperId, date: dataToUpdate.endDate || today, type: 'Cambio de Estado', details: `Animal dado de baja: ${dataToUpdate.status} ${dataToUpdate.cullReason ? `(${dataToUpdate.cullReason})` : ''}` });
        if (dataToUpdate.weaningDate && !currentAnimal.weaningDate) internalAddEvent({ animalId: upperId, date: dataToUpdate.weaningDate, type: 'Cambio de Estado', details: `Destetado con ${dataToUpdate.weaningWeight || 'N/A'} Kg` });

        fetchDataFromLocalDb();
        const updatedAnimal = await localDb.animals.get(upperId);
        if (updatedAnimal) enqueueSync(() => syncToFirestore("animals", upperId, updatedAnimal));
    };

    // deleteAnimalPermanently
    const deleteAnimalPermanently = async (animalId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = animalId.toUpperCase();
        await localDb.animals.delete(upperId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "animals", upperId)).catch(error => console.error("Firestore delete sync failed:", error)));
    };

    // startDryingProcess
    const startDryingProcess = async (parturitionId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const parturition = await localDb.parturitions.get(parturitionId);
        if (!parturition) throw new Error("Parto no encontrado");
        const dataToUpdate = { status: 'en-secado' as const, dryingStartDate: new Date().toISOString().split('T')[0], _synced: false };
        await localDb.parturitions.update(parturitionId, dataToUpdate);
        internalAddEvent({ animalId: parturition.goatId, date: dataToUpdate.dryingStartDate, type: 'Cambio de Estado', details: `Inició proceso de secado (Lactancia de ${parturition.parturitionDate})` });
        fetchDataFromLocalDb();
        const updatedParturition = await localDb.parturitions.get(parturitionId);
        if (updatedParturition) enqueueSync(() => syncToFirestore("parturitions", parturitionId, updatedParturition));
    };

    // setLactationAsDry
    const setLactationAsDry = async (parturitionId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const parturition = await localDb.parturitions.get(parturitionId);
        if (!parturition) throw new Error("Parto no encontrado");
        const dataToUpdate = { status: 'seca' as const, _synced: false };
        await localDb.parturitions.update(parturitionId, dataToUpdate);
        internalAddEvent({ animalId: parturition.goatId, date: new Date().toISOString().split('T')[0], type: 'Cambio de Estado', details: `Declarada Seca (Lactancia de ${parturition.parturitionDate})` });
        fetchDataFromLocalDb();
        const updatedParturition = await localDb.parturitions.get(parturitionId);
        if (updatedParturition) enqueueSync(() => syncToFirestore("parturitions", parturitionId, updatedParturition));
    };

    // addLot
    const addLot = async (lotData: { name: string, parentLotId?: string }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const existingLot = await localDb.lots.where('name').equalsIgnoreCase(lotData.name).first();
        if (existingLot) throw new Error(`El lote '${lotData.name}' ya existe.`);
        const newLot: Lot = { id: uuidv4(), name: lotData.name, parentLotId: lotData.parentLotId, userId: currentUser.uid, _synced: false };
        await localDb.lots.put(newLot);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("lots", newLot.id, newLot));
    };

    // deleteLot
    const deleteLot = async (lotId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const lot = await localDb.lots.get(lotId);
        if (lot) {
            const animalsInLot = await localDb.animals.where({ location: lot.name }).count();
            if (animalsInLot > 0) throw new Error("No se puede eliminar un lote con animales asignados.");
            const subLots = await localDb.lots.where({ parentLotId: lotId }).count();
            if (subLots > 0) throw new Error("No se puede eliminar un lote que contiene sub-lotes.");
        }
        await localDb.lots.delete(lotId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "lots", lotId)).catch(error => console.error("Firestore delete sync failed:", error)));
    };

    // addOrigin
    const addOrigin = async (originName: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const existingOrigin = await localDb.origins.where('name').equalsIgnoreCase(originName).first();
        if (existingOrigin) throw new Error(`El origen '${originName}' ya existe.`);
        const newOrigin: Origin = { id: uuidv4(), name: originName, userId: currentUser.uid, _synced: false };
        await localDb.origins.put(newOrigin);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("origins", newOrigin.id, newOrigin));
    };

    // deleteOrigin
    const deleteOrigin = async (originId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.origins.delete(originId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "origins", originId)).catch(error => console.error("Firestore delete sync failed:", error)));
    };

    // addWeighing
    const addWeighing = async (weighing: Omit<Weighing, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newWeighing: Weighing = { id: uuidv4(), ...weighing, userId: currentUser.uid, _synced: false };
        await localDb.weighings.put(newWeighing);
        internalAddEvent({ animalId: weighing.goatId, date: weighing.date, type: 'Pesaje Lechero', details: `Registro de ${weighing.kg} Kg` });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("weighings", newWeighing.id, newWeighing));
    };

    // addBodyWeighing
    const addBodyWeighing = async (weighing: Omit<BodyWeighing, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newWeighing: BodyWeighing = { id: uuidv4(), ...weighing, userId: currentUser.uid, _synced: false };
        await localDb.bodyWeighings.put(newWeighing);
        internalAddEvent({ animalId: weighing.animalId, date: weighing.date, type: 'Pesaje Corporal', details: `Registro de ${weighing.kg} Kg` });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("bodyWeighings", newWeighing.id, newWeighing));
    };

    // deleteWeighingSession
    const deleteWeighingSession = async (date: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const weighingsToDelete = await localDb.weighings.where({ date }).toArray();
        if (weighingsToDelete.length === 0) return;
        const idsToDelete = weighingsToDelete.map(w => w.id);
        const animalIds = weighingsToDelete.map(w => w.goatId);
        const eventsToDelete = await localDb.events.where('date').equals(date).and(e => e.type === 'Pesaje Lechero' && animalIds.includes(e.animalId)).toArray();
        const eventIdsToDelete = eventsToDelete.map(e => e.id);
        await localDb.transaction('rw', localDb.weighings, localDb.events, async () => { await localDb.weighings.bulkDelete(idsToDelete); await localDb.events.bulkDelete(eventIdsToDelete); });
        await fetchDataFromLocalDb();
        const syncDeletion = async () => { const batch = writeBatch(firestoreDb); idsToDelete.forEach(id => batch.delete(doc(firestoreDb, "weighings", id))); eventIdsToDelete.forEach(id => batch.delete(doc(firestoreDb, "events", id))); await batch.commit(); };
        enqueueSync(syncDeletion);
    };

    // addFather
    const addFather = async (father: { id: string, name: string }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = father.id.toUpperCase();
        const existingFather = await localDb.fathers.where('id').equalsIgnoreCase(upperId).first();
        if (existingFather) throw new Error(`El ID de padre '${upperId}' ya está en uso.`);
        const newFather: Father = { ...father, id: upperId, userId: currentUser.uid, _synced: false };
        await localDb.fathers.put(newFather);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("fathers", newFather.id, newFather));
    };

    // addParturition
    const addParturition = async (data: any) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperCaseMotherId = data.motherId.toUpperCase();
        const lactationStatus: Parturition['status'] = (data.parturitionOutcome === 'Aborto' && !data.inducedLactation) ? 'finalizada' : 'activa';
        const newParturitionId = uuidv4();
        const parturitionData: Parturition = { id: newParturitionId, goatId: upperCaseMotherId, parturitionDate: data.parturitionDate, sireId: data.sireId, offspringCount: data.offspringCount, parturitionType: data.parturitionType, parturitionOutcome: data.parturitionOutcome, status: lactationStatus, userId: currentUser.uid, _synced: false, dryingStartDate: data.inducedLactation && data.parturitionOutcome === 'Aborto' ? data.parturitionDate : undefined, liveOffspring: data.liveOffspring ? data.liveOffspring.map((kid: any) => ({ id: kid.id?.toUpperCase(), sex: kid.sex, birthWeight: kid.birthWeight })) : undefined };
        const newKidsData: Animal[] = (data.liveOffspring || []).map((kid: any) => ({ id: kid.id.toUpperCase(), sex: kid.sex, status: 'Activo', birthDate: data.parturitionDate, motherId: upperCaseMotherId, fatherId: data.sireId, birthWeight: parseFloat(kid.birthWeight) || undefined, userId: currentUser.uid, createdAt: Date.now(), lifecycleStage: kid.sex === 'Hembra' ? 'Cabrita' : 'Cabrito', location: '', reproductiveStatus: 'No Aplica', isReference: false, _synced: false, }));
        
        await localDb.transaction('rw', localDb.parturitions, localDb.animals, localDb.events, async () => {
            await localDb.parturitions.put(parturitionData);
            internalAddEvent({ animalId: upperCaseMotherId, date: data.parturitionDate, type: data.parturitionOutcome === 'Aborto' ? 'Aborto' : 'Parto', details: data.parturitionOutcome === 'Aborto' ? `Aborto registrado con Semental: ${data.sireId}. ${data.inducedLactation ? 'Se induce lactancia.' : ''}` : `Parto ${data.parturitionType} (${data.offspringCount} crías) con Semental: ${data.sireId}. Vivas: ${newKidsData.length}.`, });
            if (newKidsData.length > 0) {
                await localDb.animals.bulkPut(newKidsData);
                newKidsData.forEach(kid => {
                     internalAddEvent({ animalId: kid.id, date: kid.birthDate, type: 'Nacimiento', details: `Nacido con ${kid.birthWeight || 'N/A'} Kg. Madre: ${kid.motherId}. Padre: ${kid.fatherId}.` });
                });
            }
        });
        await fetchDataFromLocalDb();
        const sync = async () => { const batch = writeBatch(firestoreDb); batch.set(doc(firestoreDb, "parturitions", newParturitionId), parturitionData); newKidsData.forEach((kid: Animal) => batch.set(doc(firestoreDb, "animals", kid.id), kid)); await batch.commit(); };
        enqueueSync(sync);
    };

    // addServiceRecord
    const addServiceRecord = async (recordData: Omit<ServiceRecord, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newRecord: ServiceRecord = { id: uuidv4(), ...recordData, userId: currentUser.uid, _synced: false };
        await localDb.serviceRecords.put(newRecord);
        const lot = await localDb.sireLots.get(newRecord.sireLotId);
        const sire = lot ? (await localDb.fathers.get(lot.sireId) || await localDb.animals.get(lot.sireId)) : null;
        internalAddEvent({ animalId: newRecord.femaleId, date: newRecord.serviceDate, type: 'Servicio', details: `Servicio registrado con Semental: ${sire?.name || sire?.id || lot?.sireId || 'Desconocido'}`, });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("serviceRecords", newRecord.id, newRecord));
    };

    // addBatchEvent
    const addBatchEvent = async (data: { lotName: string; date: string; type: EventType; details: string; }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const animalsInLot = await localDb.animals.where({ location: data.lotName }).toArray();
        if (animalsInLot.length === 0) return;
        const newEvents: Event[] = animalsInLot.map(animal => ({ id: uuidv4(), animalId: animal.id, date: data.date, type: data.type, details: data.details, lotName: data.lotName, userId: currentUser.uid, notes: `Evento aplicado a todo el lote: ${data.lotName}`, _synced: false }));
        await localDb.events.bulkPut(newEvents);
        fetchDataFromLocalDb();
        const sync = async () => { const batch = writeBatch(firestoreDb); newEvents.forEach(event => batch.set(doc(firestoreDb, "events", event.id), event)); await batch.commit(); };
        enqueueSync(sync);
    };

    // addFeedingPlan
    const addFeedingPlan = async (planData: Omit<FeedingPlan, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newPlan: FeedingPlan = { id: uuidv4(), ...planData, userId: currentUser.uid, _synced: false };
        await localDb.feedingPlans.put(newPlan);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("feedingPlans", newPlan.id, newPlan));
    };

    // addBreedingSeason
    const addBreedingSeason = async (seasonData: Omit<BreedingSeason, 'id' | 'userId' | '_synced'>): Promise<string> => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newSeason: BreedingSeason = { id: uuidv4(), ...seasonData, userId: currentUser.uid, _synced: false };
        await localDb.breedingSeasons.put(newSeason);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("breedingSeasons", newSeason.id, newSeason));
        return newSeason.id;
    };

    // updateBreedingSeason
    const updateBreedingSeason = async (seasonId: string, dataToUpdate: Partial<BreedingSeason>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.breedingSeasons.update(seasonId, dataWithSyncFlag);
        fetchDataFromLocalDb();
        const updatedSeason = await localDb.breedingSeasons.get(seasonId);
        if (updatedSeason) enqueueSync(() => syncToFirestore("breedingSeasons", seasonId, updatedSeason));
    };

    // deleteBreedingSeason
    const deleteBreedingSeason = async (seasonId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.breedingSeasons.delete(seasonId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "breedingSeasons", seasonId)).catch(error => console.error("Firestore delete sync failed:", error)));
    };

    // addSireLot
    const addSireLot = async (lotData: Omit<SireLot, 'id' | 'userId' | '_synced'>): Promise<string> => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newLot: SireLot = { id: uuidv4(), ...lotData, userId: currentUser.uid, _synced: false };
        await localDb.sireLots.put(newLot);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("sireLots", newLot.id, newLot));
        return newLot.id;
    };

    // updateSireLot
    const updateSireLot = async (lotId: string, dataToUpdate: Partial<SireLot>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.sireLots.update(lotId, dataWithSyncFlag);
        fetchDataFromLocalDb();
         const updatedLot = await localDb.sireLots.get(lotId);
        if (updatedLot) enqueueSync(() => syncToFirestore("sireLots", lotId, updatedLot));
    };

    // deleteSireLot
    const deleteSireLot = async (lotId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.sireLots.delete(lotId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "sireLots", lotId)).catch(error => console.error("Firestore delete sync failed:", error)));
    };

    // addProduct
    const addProduct = async (productData: Omit<Product, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newProduct: Product = { id: uuidv4(), ...productData, userId: currentUser.uid, _synced: false };
        await localDb.products.put(newProduct);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("products", newProduct.id, newProduct));
    };

    // updateProduct
    const updateProduct = async (productId: string, dataToUpdate: Partial<Product>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.products.update(productId, dataWithSyncFlag);
        fetchDataFromLocalDb();
        const updatedProduct = await localDb.products.get(productId);
        if(updatedProduct) enqueueSync(() => syncToFirestore("products", productId, updatedProduct));
    };

    // deleteProduct
    const deleteProduct = async (productId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.products.delete(productId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "products", productId)).catch(error => console.error("Firestore delete sync failed:", error)));
    };

    // addHealthPlanWithActivities
    const addHealthPlanWithActivities = async (planData: Omit<HealthPlan, 'id' | 'userId' | '_synced'>, activities: Omit<PlanActivity, 'id' | 'healthPlanId' | 'userId' | '_synced'>[]) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newPlan: HealthPlan = { id: uuidv4(), ...planData, userId: currentUser.uid, _synced: false };
        const newActivities: PlanActivity[] = activities.map(act => ({ id: uuidv4(), ...act, healthPlanId: newPlan.id, userId: currentUser.uid, _synced: false }));
        await localDb.transaction('rw', localDb.healthPlans, localDb.planActivities, async () => { await localDb.healthPlans.put(newPlan); await localDb.planActivities.bulkPut(newActivities); });
        fetchDataFromLocalDb();
        const sync = async () => { const batch = writeBatch(firestoreDb); batch.set(doc(firestoreDb, "healthPlans", newPlan.id), newPlan); newActivities.forEach(act => batch.set(doc(firestoreDb, "planActivities", act.id), act)); await batch.commit(); };
        enqueueSync(sync);
    };

    // updateHealthPlan
    const updateHealthPlan = async (planId: string, dataToUpdate: Partial<HealthPlan>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.healthPlans.update(planId, dataWithSyncFlag);
        fetchDataFromLocalDb();
        const updatedPlan = await localDb.healthPlans.get(planId);
        if(updatedPlan) enqueueSync(() => syncToFirestore("healthPlans", planId, updatedPlan));
    };

    // deleteHealthPlan
    const deleteHealthPlan = async (planId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const activitiesToDelete = await localDb.planActivities.where({ healthPlanId: planId }).toArray();
        const activityIdsToDelete = activitiesToDelete.map(act => act.id);
        await localDb.transaction('rw', localDb.healthPlans, localDb.planActivities, async () => { await localDb.planActivities.bulkDelete(activityIdsToDelete); await localDb.healthPlans.delete(planId); });
        fetchDataFromLocalDb();
        const sync = async () => { const batch = writeBatch(firestoreDb); activityIdsToDelete.forEach(id => batch.delete(doc(firestoreDb, "planActivities", id))); batch.delete(doc(firestoreDb, "healthPlans", planId)); await batch.commit(); };
        enqueueSync(sync);
    };

    // addPlanActivity
    const addPlanActivity = async (activityData: Omit<PlanActivity, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newActivity: PlanActivity = { id: uuidv4(), ...activityData, userId: currentUser.uid, _synced: false };
        await localDb.planActivities.put(newActivity);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("planActivities", newActivity.id, newActivity));
    };

    // updatePlanActivity
    const updatePlanActivity = async (activityId: string, dataToUpdate: Partial<PlanActivity>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };

        await localDb.planActivities.update(activityId, dataWithSyncFlag);
        fetchDataFromLocalDb();
        const updatedActivity = await localDb.planActivities.get(activityId);
        if(updatedActivity) enqueueSync(() => syncToFirestore("planActivities", activityId, updatedActivity));
    };

    // deletePlanActivity
    const deletePlanActivity = async (activityId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");

        const localDb = getDB();
        await localDb.planActivities.delete(activityId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "planActivities", activityId)).catch(error => console.error("Firestore delete sync failed:", error)));
    };

    // addHealthEvent
    const addHealthEvent = async (eventData: Omit<HealthEvent, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newEvent: HealthEvent = { id: uuidv4(), ...eventData, userId: currentUser.uid, _synced: false };
        await localDb.healthEvents.put(newEvent);
        // Crear evento general asociado
        internalAddEvent({ animalId: newEvent.animalId, date: newEvent.date, type: 'Tratamiento', details: `${newEvent.type}${newEvent.productUsed ? ` con ${products.find(p => p.id === newEvent.productUsed)?.name || 'producto'}` : ''}`, notes: newEvent.notes, lotName: newEvent.lotName });
JSON.stringify
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("healthEvents", newEvent.id, newEvent));
    };

  // --- Context Value Provider ---
  return (
    <DataContext.Provider value={{
        // Datos
        animals, fathers, weighings, parturitions, lots, origins, breedingSeasons, sireLots, serviceRecords, events, feedingPlans, bodyWeighings,
        products, healthPlans, planActivities, healthEvents,
        // Estado
        isLoading, syncStatus,
        // Funciones CRUD
        addAnimal, updateAnimal, deleteAnimalPermanently, startDryingProcess, setLactationAsDry, addLot, deleteLot, addOrigin, deleteOrigin,
        addBreedingSeason, updateBreedingSeason, deleteBreedingSeason, addSireLot, updateSireLot, deleteSireLot, addServiceRecord,
        addFeedingPlan, addBatchEvent, addWeighing, addBodyWeighing, deleteWeighingSession, addParturition, fetchData: fetchDataFromLocalDb, addFather,
        addProduct, updateProduct, deleteProduct, addHealthPlanWithActivities, updateHealthPlan, deleteHealthPlan,
        addPlanActivity, updatePlanActivity, deletePlanActivity, addHealthEvent
    }}>
      {children}
    </DataContext.Provider>
  );
};

// --- calculateLifecycleStage Helper ---
const calculateLifecycleStage = (birthDate: string, sex: 'Hembra' | 'Macho'): string => {
    if (!birthDate || birthDate === 'N/A' || !sex) return 'Indefinido';
    const today = new Date();
    const birth = new Date(birthDate + 'T00:00:00Z');
    if (isNaN(birth.getTime())) return 'Indefinido';
    const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const birthUTC = Date.UTC(birth.getUTCFullYear(), birth.getUTCMonth(), birth.getUTCDate());
    const ageInDays = Math.floor((todayUTC - birthUTC) / (1000 * 60 * 60 * 24));

    if (sex === 'Hembra') {
        if (ageInDays <= 60) return 'Cabrita';
        if (ageInDays <= 365) return 'Cabritona';
        return 'Cabra Adulta';
    } else { // Macho
        if (ageInDays <= 60) return 'Cabrito';
        if (ageInDays <= 365) return 'Macho de Levante';
        return 'Macho Cabrío';
    }
};