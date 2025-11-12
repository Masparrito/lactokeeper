// src/context/DataContext.tsx (100% Completo y Corregido)

import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Table } from 'dexie';
// (CORREGIDO) Importar 'FeedingPlan' y 'initDB'
import { Animal, Weighing, Parturition, Father, Lot, Origin, BreedingSeason, SireLot, ServiceRecord, Event, EventType, BodyWeighing, Product, HealthPlan, PlanActivity, HealthEvent, initDB, getDB, FeedingPlan, GanaderoOSTables } from '../db/local';
import { db as firestoreDb } from '../firebaseConfig';
import { useAuth } from './AuthContext';
// (CORREGIDO) Importar todas las funciones de firestore necesarias
import { collection, query, where, onSnapshot, deleteDoc, doc, setDoc, writeBatch, Timestamp, serverTimestamp, deleteField } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

import { AppConfig, DEFAULT_CONFIG } from '../types/config';

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
  
  appConfig: AppConfig;
  isLoadingConfig: boolean;

  // --- Estado y Funciones ---
  isLoading: boolean;
  syncStatus: SyncStatus;
  addAnimal: (animalData: Omit<Animal, 'id' | '_synced' | 'userId' | 'createdAt'> & { id?: string }) => Promise<void>;
  updateAnimal: (animalId: string, dataToUpdate: Partial<Animal>) => Promise<void>;
  deleteAnimalPermanently: (animalId: string) => Promise<void>;
  startDryingProcess: (parturitionId: string) => Promise<void>;
  setLactationAsDry: (parturitionId: string) => Promise<void>;
  addLot: (lotData: { name: string, parentLotId?: string }) => Promise<void>;
  
  updateLot: (lotId: string, dataToUpdate: Partial<Lot>) => Promise<void>;
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
  
  updateAppConfig: (config: AppConfig) => Promise<void>;
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
    // Estados de Datos
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
    
    // Estados de Control
    const [isLoading, setIsLoading] = useState(true);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'idle' : 'offline');

    // Estados de Configuración
    const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const syncQueueRef = useRef<(() => Promise<void>)[]>([]);
    const isSyncingRef = useRef(false);

    const processSyncQueue = useCallback(async () => {
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
    }, []);

    const enqueueSync = useCallback((operation: () => Promise<void>) => {
        syncQueueRef.current.push(operation);
        if (!isSyncingRef.current) { processSyncQueue(); }
    }, [processSyncQueue]);

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
            setIsLoading(false);
        }
    }, []);

    // --- useEffect (Hook de Sincronización Principal) ---
    useEffect(() => {
        let unsubscribers: (() => void)[] = [];
        const handleOnline = () => { setSyncStatus('idle'); processSyncQueue(); };
        const handleOffline = () => setSyncStatus('offline');
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        const setupSync = async () => {
            if (!currentUser) {
                setIsLoading(false);
                setIsLoadingConfig(false);
                setAnimals([]); setFathers([]); setWeighings([]); setParturitions([]); setLots([]); setOrigins([]);
                setBreedingSeasons([]); setSireLots([]); setServiceRecords([]); setEvents([]); setFeedingPlans([]);
                setBodyWeighings([]); setProducts([]); setHealthPlans([]); setPlanActivities([]); setHealthEvents([]);
                setAppConfig(DEFAULT_CONFIG);
                return;
            }
            setIsLoading(true);
            setIsLoadingConfig(true);
            try {
                const localDb = await initDB();
                await fetchDataFromLocalDb(); // Carga inicial

                // --- LÓGICA DE CONFIGURACIÓN ---
                const configRef = doc(firestoreDb, 'configuracion', currentUser.uid);
                const unsubConfig = onSnapshot(configRef, (docSnap) => {
                    if (docSnap.exists()) {
                        setAppConfig(prev => ({ ...DEFAULT_CONFIG, ...prev, ...docSnap.data() }));
                    } else {
                        setAppConfig(DEFAULT_CONFIG);
                        setDoc(configRef, DEFAULT_CONFIG).catch(err => console.error("Failed to set default config", err));
                    }
                    setIsLoadingConfig(false);
                }, (error) => {
                    console.error("Error fetching config:", error);
                    setIsLoadingConfig(false);
                });
                unsubscribers.push(unsubConfig);
                
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
                            if (navigator.onLine) { 
                                setSyncStatus('syncing'); 
                                if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); 
                                syncTimeoutRef.current = setTimeout(() => { if (syncQueueRef.current.length === 0 && !isSyncingRef.current) setSyncStatus('idle'); }, 2000); 
                            }
                            try {
                                await localDb.transaction('rw', table, async () => {
                                    for (const change of changes) {
                                        change.data._synced = true;
                                        if (change.type === "added" || change.type === "modified") await table.put(change.data);
                                        else if (change.type === "removed") await table.delete(change.data.id);
                                    }
                                });
                                await fetchDataFromLocalDb();
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

            } catch (error) { 
                console.error("Fallo crítico en la inicialización:", error); 
                setIsLoading(false); 
                setIsLoadingConfig(false);
            }
        };
        setupSync();
        return () => { unsubscribers.forEach(unsub => unsub()); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
    }, [currentUser?.uid, fetchDataFromLocalDb, processSyncQueue]); // Dependencias estables

    // --- FUNCIONES DE ESCRITURA (Local-First con Enqueue) ---

    const internalAddEvent = useCallback((eventData: Omit<Event, 'id' | 'userId' | '_synced'>) => {
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
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addAnimal = useCallback(async (animalData: Omit<Animal, 'id' | '_synced' | 'userId' | 'createdAt'> & { id?: string }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const animalId = (animalData.id ? animalData.id : `REF-${Date.now()}`).toUpperCase();
        
        const newAnimal: any = {
            ...animalData,
            id: animalId,
            userId: currentUser.uid,
            createdAt: Date.now(),
            _synced: false
         };
        await localDb.animals.put(newAnimal as Animal);
        
        let birthDateDetail = '';
        if (newAnimal.birthDate && newAnimal.birthDate !== 'N/A') {
            try {
                birthDateDetail = ` F.N.: ${new Date(newAnimal.birthDate + 'T00:00:00Z').toLocaleDateString('es-VE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}`;
            } catch (e) { birthDateDetail = ` F.N.: ${newAnimal.birthDate}.`; }
        } else { birthDateDetail = ' F.N. desconocida.'; }
        
        const registrationType = newAnimal.isReference ? 'Animal de Referencia' : 'Animal (Activo)';
        internalAddEvent({
            animalId: newAnimal.id,
            date: new Date(newAnimal.createdAt!).toISOString().split('T')[0],
            // (CORREGIDO) Este tipo debe ser 'Registro'
            type: 'Registro', 
            details: `${registrationType} registrado en el sistema.${birthDateDetail}`,
            lotName: newAnimal.location
        });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("animals", newAnimal.id, newAnimal));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const updateAnimal = useCallback(async (animalId: string, dataToUpdate: Partial<Animal>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = animalId.toUpperCase();
        const today = new Date().toISOString().split('T')[0];
        const currentAnimal = await localDb.animals.get(upperId);
        if (!currentAnimal) throw new Error("Animal no encontrado para actualizar");

        // (Lógica de lifecycleStage sin cambios)
        if (dataToUpdate.birthDate && dataToUpdate.birthDate !== 'N/A' && !dataToUpdate.lifecycleStage) {
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
                    return 'Cabra'; // Simplificado
                } else {
                    if (ageInDays <= 60) return 'Cabrito';
                    if (ageInDays <= 365) return 'Macho de Levante';
                    return 'Reproductor'; // Simplificado
                }
            };
            dataToUpdate.lifecycleStage = calculateLifecycleStage(dataToUpdate.birthDate, currentAnimal.sex) as any;
        } else if ((dataToUpdate.birthDate === 'N/A' || dataToUpdate.birthDate === '') && !dataToUpdate.lifecycleStage) {
             delete dataToUpdate.lifecycleStage;
             dataToUpdate.birthDate = 'N/A';
        }

        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.animals.update(upperId, dataWithSyncFlag);

        // (Lógica de eventos por actualización)
        if (dataToUpdate.location !== undefined && dataToUpdate.location !== currentAnimal.location) internalAddEvent({ animalId: upperId, date: today, type: 'Movimiento', details: `Movido de '${currentAnimal.location || 'Sin Asignar'}' a '${dataToUpdate.location || 'Sin Asignar'}'`, lotName: dataToUpdate.location || '' });
        if (dataToUpdate.reproductiveStatus !== undefined && dataToUpdate.reproductiveStatus !== currentAnimal.reproductiveStatus) internalAddEvent({ animalId: upperId, date: today, type: 'Cambio de Estado', details: `Estado reproductivo: ${dataToUpdate.reproductiveStatus}` });
        if (dataToUpdate.status !== undefined && dataToUpdate.status !== currentAnimal.status) internalAddEvent({ animalId: upperId, date: dataToUpdate.endDate || today, type: 'Cambio de Estado', details: `Animal dado de baja: ${dataToUpdate.status} ${dataToUpdate.cullReason ? `(${dataToUpdate.cullReason})` : ''}` });
        
        // --- (INICIO CORRECCIÓN TS2322) ---
        // El tipo "Destete" no es un EventType válido. "Cambio de Estado" sí lo es.
        if (dataToUpdate.weaningDate && !currentAnimal.weaningDate) {
            internalAddEvent({ 
                animalId: upperId, 
                date: dataToUpdate.weaningDate, 
                type: 'Cambio de Estado', // Corregido
                details: `Destetado con ${dataToUpdate.weaningWeight || 'N/A'} Kg` 
            });
        }
        // --- (FIN CORRECCIÓN TS2322) ---

        fetchDataFromLocalDb();
        const updatedAnimal = await localDb.animals.get(upperId);
        if (updatedAnimal) enqueueSync(() => syncToFirestore("animals", upperId, updatedAnimal));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const deleteAnimalPermanently = useCallback(async (animalId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = animalId.toUpperCase();
        await localDb.animals.delete(upperId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "animals", upperId)).catch(error => console.error("Firestore delete sync failed:", error)));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const startDryingProcess = useCallback(async (parturitionId: string) => {
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
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const setLactationAsDry = useCallback(async (parturitionId: string) => {
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
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const addLot = useCallback(async (lotData: { name: string, parentLotId?: string }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const existingLot = await localDb.lots.where('name').equalsIgnoreCase(lotData.name).first();
        if (existingLot) throw new Error(`El lote '${lotData.name}' ya existe.`);
        const newLot: Lot = { id: uuidv4(), name: lotData.name, parentLotId: lotData.parentLotId, userId: currentUser.uid, _synced: false };
        await localDb.lots.put(newLot);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("lots", newLot.id, newLot));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const updateLot = useCallback(async (lotId: string, dataToUpdate: Partial<Lot>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        if (!dataToUpdate.name) throw new Error("El nombre es requerido para actualizar");

        const localDb = getDB();
        const newName = dataToUpdate.name;
        const currentLot = await localDb.lots.get(lotId);
        if (!currentLot) throw new Error("Lote no encontrado");
        
        const oldName = currentLot.name;
        if (oldName === newName) return; 

        const existingLot = await localDb.lots.where('name').equalsIgnoreCase(newName).first();
        if (existingLot && existingLot.id !== lotId) {
            throw new Error(`El nombre de lote '${newName}' ya existe.`);
        }
        
        let animalsToUpdateIds: string[] = [];

        await localDb.transaction('rw', localDb.lots, localDb.animals, async () => {
            await localDb.lots.update(lotId, { ...dataToUpdate, _synced: false });
            
            const animalsToUpdate = await localDb.animals.where({ location: oldName }).toArray();
            animalsToUpdateIds = animalsToUpdate.map(a => a.id);
            
            if (animalsToUpdateIds.length > 0) {
                await localDb.animals.where({ location: oldName }).modify({ location: newName, _synced: false });
            }
        });

        fetchDataFromLocalDb();

        const updatedLot = await localDb.lots.get(lotId);
        if (updatedLot) {
            enqueueSync(() => syncToFirestore("lots", lotId, updatedLot));
        }
        
        if (animalsToUpdateIds.length > 0) {
            const updatedAnimals = await localDb.animals.bulkGet(animalsToUpdateIds);
            for (const animal of updatedAnimals) {
                if (animal) {
                    enqueueSync(() => syncToFirestore("animals", animal.id, animal));
                }
            }
        }
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);


    const deleteLot = useCallback(async (lotId: string) => {
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
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addOrigin = useCallback(async (originName: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const existingOrigin = await localDb.origins.where('name').equalsIgnoreCase(originName).first();
        if (existingOrigin) throw new Error(`El origen '${originName}' ya existe.`);
        const newOrigin: Origin = { id: uuidv4(), name: originName, userId: currentUser.uid, _synced: false };
        await localDb.origins.put(newOrigin);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("origins", newOrigin.id, newOrigin));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const deleteOrigin = useCallback(async (originId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.origins.delete(originId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "origins", originId)).catch(error => console.error("Firestore delete sync failed:", error)));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addWeighing = useCallback(async (weighing: Omit<Weighing, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newWeighing: Weighing = { id: uuidv4(), ...weighing, userId: currentUser.uid, _synced: false };
        await localDb.weighings.put(newWeighing);
        internalAddEvent({ animalId: weighing.goatId, date: weighing.date, type: 'Pesaje Lechero', details: `Registro de ${weighing.kg} Kg` });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("weighings", newWeighing.id, newWeighing));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const addBodyWeighing = useCallback(async (weighing: Omit<BodyWeighing, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newWeighing: BodyWeighing = { id: uuidv4(), ...weighing, userId: currentUser.uid, _synced: false };
        await localDb.bodyWeighings.put(newWeighing);
        internalAddEvent({ animalId: weighing.animalId, date: weighing.date, type: 'Pesaje Corporal', details: `Registro de ${weighing.kg} Kg` });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("bodyWeighings", newWeighing.id, newWeighing));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const deleteWeighingSession = useCallback(async (date: string) => {
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
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addFather = useCallback(async (father: { id: string, name: string }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = father.id.toUpperCase();
        const existingFather = await localDb.fathers.where('id').equalsIgnoreCase(upperId).first();
        if (existingFather) throw new Error(`El ID de padre '${upperId}' ya está en uso.`);
        const newFather: Father = { ...father, id: upperId, userId: currentUser.uid, _synced: false };
        await localDb.fathers.put(newFather);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("fathers", newFather.id, newFather));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addParturition = useCallback(async (data: any) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperCaseMotherId = data.motherId.toUpperCase();
        const lactationStatus: Parturition['status'] = (data.parturitionOutcome === 'Aborto' && !data.inducedLactation) ? 'finalizada' : 'activa';
        const newParturitionId = uuidv4();
        const parturitionData: Parturition = { id: newParturitionId, goatId: upperCaseMotherId, parturitionDate: data.parturitionDate, sireId: data.sireId, offspringCount: data.offspringCount, parturitionType: data.parturitionType, parturitionOutcome: data.parturitionOutcome, status: lactationStatus, userId: currentUser.uid, _synced: false, dryingStartDate: data.inducedLactation && data.parturitionOutcome === 'Aborto' ? data.parturitionDate : undefined, liveOffspring: data.liveOffspring ? data.liveOffspring.map((kid: any) => ({ id: kid.id?.toUpperCase(), sex: kid.sex, birthWeight: kid.birthWeight })) : undefined };
        const newKidsData: Animal[] = (data.liveOffspring || []).map((kid: any) => ({ id: kid.id.toUpperCase(), sex: kid.sex, status: 'Activo', birthDate: data.parturitionDate, motherId: upperCaseMotherId, fatherId: data.sireId, birthWeight: parseFloat(kid.birthWeight) || undefined, userId: currentUser.uid, createdAt: Date.now(), lifecycleStage: kid.sex === 'Hembra' ? 'Cabrita' : 'Cabrito', location: '', reproductiveStatus: 'No Aplica', isReference: false, _synced: false, }));
        
        await localDb.transaction('rw', localDb.parturitions, localDb.animals, localDb.events, async () => {
            await localDb.parturitions.put(parturitionData);

            // --- (INICIO CORRECCIÓN TS2322) ---
            let eventType: EventType;
            let eventDetails = `Parto ${data.parturitionType} (${data.offspringCount} crías) con Semental: ${data.sireId}. Vivas: ${newKidsData.length}.`;
            
            if (data.parturitionOutcome === 'Aborto') {
                eventType = 'Aborto'; 
                eventDetails = `Aborto registrado con Semental: ${data.sireId}. ${data.inducedLactation ? 'Se induce lactancia.' : ''}`;
            } else if (data.parturitionOutcome === 'Con Mortinatos') {
                const stillCount = data.offspringCount - newKidsData.length;
                if (newKidsData.length === 0) {
                    eventType = 'Aborto'; // Mapeado a 'Aborto'
                    eventDetails = `Mortinato completo (${stillCount} crías). Padre: ${data.sireId}.`;
                } else {
                    eventType = 'Parto'; // Mapeado a 'Parto'
                    eventDetails = `Padre: ${data.sireId}. Crías: ${newKidsData.length} vivas, ${stillCount} mortinatos.`;
                }
            } else {
                 eventType = 'Parto'; // Default
            }
            internalAddEvent({ animalId: upperCaseMotherId, date: data.parturitionDate, type: eventType, details: eventDetails });
            // --- (FIN CORRECCIÓN TS2322) ---

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
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const addServiceRecord = useCallback(async (recordData: Omit<ServiceRecord, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newRecord: ServiceRecord = { id: uuidv4(), ...recordData, userId: currentUser.uid, _synced: false };
        await localDb.serviceRecords.put(newRecord);
        const lot = await localDb.sireLots.get(newRecord.sireLotId);
        const sire = lot ? (await localDb.fathers.get(lot.sireId) || await localDb.animals.get(lot.sireId)) : null;
        
        // --- (INICIO CORRECCIÓN TS2322) ---
        // "Servicio Visto" no es un EventType. Se usa "Servicio".
        internalAddEvent({ 
            animalId: newRecord.femaleId, 
            date: newRecord.serviceDate, 
            type: 'Servicio', // Corregido
            details: `Servicio registrado con Semental: ${sire?.name || sire?.id || lot?.sireId || 'Desconocido'}`, 
        });
        // --- (FIN CORRECCIÓN TS2322) ---
        
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("serviceRecords", newRecord.id, newRecord));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const addBatchEvent = useCallback(async (data: { lotName: string; date: string; type: EventType; details: string; }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const animalsInLot = await localDb.animals.where({ location: data.lotName }).toArray();
        if (animalsInLot.length === 0) return;
        const newEvents: Event[] = animalsInLot.map(animal => ({ id: uuidv4(), animalId: animal.id, date: data.date, type: data.type, details: data.details, lotName: data.lotName, userId: currentUser.uid, notes: `Evento aplicado a todo el lote: ${data.lotName}`, _synced: false }));
        await localDb.events.bulkPut(newEvents);
        fetchDataFromLocalDb();
        const sync = async () => { const batch = writeBatch(firestoreDb); newEvents.forEach(event => batch.set(doc(firestoreDb, "events", event.id), event)); await batch.commit(); };
        enqueueSync(sync);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addFeedingPlan = useCallback(async (planData: Omit<FeedingPlan, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newPlan: FeedingPlan = { id: uuidv4(), ...planData, userId: currentUser.uid, _synced: false };
        await localDb.feedingPlans.put(newPlan);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("feedingPlans", newPlan.id, newPlan));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addBreedingSeason = useCallback(async (seasonData: Omit<BreedingSeason, 'id' | 'userId' | '_synced'>): Promise<string> => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newSeason: BreedingSeason = { id: uuidv4(), ...seasonData, userId: currentUser.uid, _synced: false };
        await localDb.breedingSeasons.put(newSeason);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("breedingSeasons", newSeason.id, newSeason));
        return newSeason.id;
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const updateBreedingSeason = useCallback(async (seasonId: string, dataToUpdate: Partial<BreedingSeason>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.breedingSeasons.update(seasonId, dataWithSyncFlag);
        fetchDataFromLocalDb();
        const updatedSeason = await localDb.breedingSeasons.get(seasonId);
        if (updatedSeason) enqueueSync(() => syncToFirestore("breedingSeasons", seasonId, updatedSeason));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const deleteBreedingSeason = useCallback(async (seasonId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();

        const lotsToDelete = await localDb.sireLots.where({ seasonId: seasonId }).toArray();
        const lotIdsToDelete = lotsToDelete.map(lot => lot.id);
        
        let animalIdsToUpdate: string[] = [];

        await localDb.transaction('rw', localDb.breedingSeasons, localDb.sireLots, localDb.animals, async () => {
            if (lotIdsToDelete.length > 0) {
                const animalsToUpdate = await localDb.animals.where('sireLotId').anyOf(lotIdsToDelete).toArray();
                animalIdsToUpdate = animalsToUpdate.map(a => a.id);
                
                if (animalIdsToUpdate.length > 0) {
                    await localDb.animals.bulkUpdate(animalIdsToUpdate.map(id => ({
                        key: id,
                        changes: {
                            sireLotId: undefined,
                            reproductiveStatus: 'Vacía',
                            _synced: false
                        }
                    })));
                }
            }
            
            await localDb.breedingSeasons.delete(seasonId);
            
            if (lotIdsToDelete.length > 0) {
                await localDb.sireLots.bulkDelete(lotIdsToDelete);
            }
        });

        fetchDataFromLocalDb();

        enqueueSync(() => deleteDoc(doc(firestoreDb, "breedingSeasons", seasonId)));
        
        lotIdsToDelete.forEach(lotId => {
            enqueueSync(() => deleteDoc(doc(firestoreDb, "sireLots", lotId)));
        });

        if (animalIdsToUpdate.length > 0) {
            const updatedAnimals = await localDb.animals.bulkGet(animalIdsToUpdate);
            for (const animal of updatedAnimals) {
                if (animal) {
                    // (CORREGIDO) Enviar a Firestore la orden de eliminar el campo
                    const firestoreUpdateData = { ...animal, sireLotId: deleteField() };
                    enqueueSync(() => syncToFirestore("animals", animal.id, firestoreUpdateData));
                }
            }
        }
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);


    const addSireLot = useCallback(async (lotData: Omit<SireLot, 'id' | 'userId' | '_synced'>): Promise<string> => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newLot: SireLot = { id: uuidv4(), ...lotData, userId: currentUser.uid, _synced: false };
        await localDb.sireLots.put(newLot);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("sireLots", newLot.id, newLot));
        return newLot.id;
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const updateSireLot = useCallback(async (lotId: string, dataToUpdate: Partial<SireLot>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.sireLots.update(lotId, dataWithSyncFlag);
        fetchDataFromLocalDb();
         const updatedLot = await localDb.sireLots.get(lotId);
        if (updatedLot) enqueueSync(() => syncToFirestore("sireLots", lotId, updatedLot));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const deleteSireLot = useCallback(async (lotId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.sireLots.delete(lotId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "sireLots", lotId)).catch(error => console.error("Firestore delete sync failed:", error)));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    // --- (Resto de funciones: addProduct, healthplans, etc.) ---
    const addProduct = useCallback(async (productData: Omit<Product, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newProduct: Product = { id: uuidv4(), ...productData, userId: currentUser.uid, _synced: false };
        await localDb.products.put(newProduct);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("products", newProduct.id, newProduct));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const updateProduct = useCallback(async (productId: string, dataToUpdate: Partial<Product>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.products.update(productId, dataWithSyncFlag);
        fetchDataFromLocalDb();
        const updatedProduct = await localDb.products.get(productId);
        if(updatedProduct) enqueueSync(() => syncToFirestore("products", productId, updatedProduct));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const deleteProduct = useCallback(async (productId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.products.delete(productId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "products", productId)).catch(error => console.error("Firestore delete sync failed:", error)));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addHealthPlanWithActivities = useCallback(async (planData: Omit<HealthPlan, 'id' | 'userId' | '_synced'>, activities: Omit<PlanActivity, 'id' | 'healthPlanId' | 'userId' | '_synced'>[]) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newPlan: HealthPlan = { id: uuidv4(), ...planData, userId: currentUser.uid, _synced: false };
        const newActivities: PlanActivity[] = activities.map(act => ({ id: uuidv4(), ...act, healthPlanId: newPlan.id, userId: currentUser.uid, _synced: false }));
        await localDb.transaction('rw', localDb.healthPlans, localDb.planActivities, async () => { await localDb.healthPlans.put(newPlan); await localDb.planActivities.bulkPut(newActivities); });
        fetchDataFromLocalDb();
        const sync = async () => { const batch = writeBatch(firestoreDb); batch.set(doc(firestoreDb, "healthPlans", newPlan.id), newPlan); newActivities.forEach(act => batch.set(doc(firestoreDb, "planActivities", act.id), act)); await batch.commit(); };
        enqueueSync(sync);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const updateHealthPlan = useCallback(async (planId: string, dataToUpdate: Partial<HealthPlan>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.healthPlans.update(planId, dataWithSyncFlag);
        fetchDataFromLocalDb();
        const updatedPlan = await localDb.healthPlans.get(planId);
        if(updatedPlan) enqueueSync(() => syncToFirestore("healthPlans", planId, updatedPlan));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const deleteHealthPlan = useCallback(async (planId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const activitiesToDelete = await localDb.planActivities.where({ healthPlanId: planId }).toArray();
        const activityIdsToDelete = activitiesToDelete.map(act => act.id);
        await localDb.transaction('rw', localDb.healthPlans, localDb.planActivities, async () => { await localDb.planActivities.bulkDelete(activityIdsToDelete); await localDb.healthPlans.delete(planId); });
        fetchDataFromLocalDb();
        const sync = async () => { const batch = writeBatch(firestoreDb); activityIdsToDelete.forEach(id => batch.delete(doc(firestoreDb, "planActivities", id))); batch.delete(doc(firestoreDb, "healthPlans", planId)); await batch.commit(); };
        enqueueSync(sync);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addPlanActivity = useCallback(async (activityData: Omit<PlanActivity, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newActivity: PlanActivity = { id: uuidv4(), ...activityData, userId: currentUser.uid, _synced: false };
        await localDb.planActivities.put(newActivity);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("planActivities", newActivity.id, newActivity));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const updatePlanActivity = useCallback(async (activityId: string, dataToUpdate: Partial<PlanActivity>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.planActivities.update(activityId, dataWithSyncFlag);
        fetchDataFromLocalDb();
        const updatedActivity = await localDb.planActivities.get(activityId);
        if(updatedActivity) enqueueSync(() => syncToFirestore("planActivities", activityId, updatedActivity));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const deletePlanActivity = useCallback(async (activityId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.planActivities.delete(activityId);
        fetchDataFromLocalDb();
        enqueueSync(() => deleteDoc(doc(firestoreDb, "planActivities", activityId)).catch(error => console.error("Firestore delete sync failed:", error)));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addHealthEvent = useCallback(async (eventData: Omit<HealthEvent, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newEvent: HealthEvent = { id: uuidv4(), ...eventData, userId: currentUser.uid, _synced: false };
        await localDb.healthEvents.put(newEvent);
        internalAddEvent({ animalId: newEvent.animalId, date: newEvent.date, type: 'Tratamiento', details: `${newEvent.type}${newEvent.productUsed ? ` con ${products.find(p => p.id === newEvent.productUsed)?.name || 'producto'}` : ''}`, notes: newEvent.notes, lotName: newEvent.lotName });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("healthEvents", newEvent.id, newEvent));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent, products]);


    const updateAppConfig = useCallback(async (config: AppConfig) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        setSyncStatus('syncing');
        try {
            const configRef = doc(firestoreDb, 'configuracion', currentUser.uid);
            await setDoc(configRef, config, { merge: true });
            setSyncStatus('idle'); 
        } catch (error) {
            console.error("Error al guardar configuración:", error);
            setSyncStatus('idle');
            throw error;
        }
    }, [currentUser]);
    
    // (CORREGIDO) useMemo y contextValue restaurados
    const contextValue = useMemo(() => ({
        animals, fathers, weighings, parturitions, lots, origins, breedingSeasons, sireLots, serviceRecords, events, feedingPlans, bodyWeighings,
        products, healthPlans, planActivities, healthEvents,
        appConfig,
        isLoadingConfig,
        isLoading, syncStatus,
        fetchData: fetchDataFromLocalDb,
        addAnimal, updateAnimal, deleteAnimalPermanently, startDryingProcess, setLactationAsDry, addLot, 
        updateLot, // (NUEVO)
        deleteLot, 
        addOrigin, deleteOrigin,
        addBreedingSeason, updateBreedingSeason, 
        deleteBreedingSeason, // (NUEVO)
        addSireLot, updateSireLot, deleteSireLot, addServiceRecord,
        addFeedingPlan, addBatchEvent, addWeighing, addBodyWeighing, deleteWeighingSession, addParturition, addFather,
        addProduct, updateProduct, deleteProduct, addHealthPlanWithActivities, updateHealthPlan, deleteHealthPlan,
        addPlanActivity, updatePlanActivity, deletePlanActivity, addHealthEvent,
        updateAppConfig
    }), [
        animals, fathers, weighings, parturitions, lots, origins, breedingSeasons, sireLots, serviceRecords, events, feedingPlans, bodyWeighings,
        products, healthPlans, planActivities, healthEvents,
        appConfig, isLoadingConfig, isLoading, syncStatus,
        fetchDataFromLocalDb,
        addAnimal, updateAnimal, deleteAnimalPermanently, startDryingProcess, setLactationAsDry, addLot, 
        updateLot, // (NUEVO)
        deleteLot, 
        addOrigin, deleteOrigin,
        addBreedingSeason, updateBreedingSeason, 
        deleteBreedingSeason, // (NUEVO)
        addSireLot, updateSireLot, deleteSireLot, addServiceRecord,
        addFeedingPlan, addBatchEvent, addWeighing, addBodyWeighing, deleteWeighingSession, addParturition, addFather,
        addProduct, updateProduct, deleteProduct, addHealthPlanWithActivities, updateHealthPlan, deleteHealthPlan,
        addPlanActivity, updatePlanActivity, deletePlanActivity, addHealthEvent,
        updateAppConfig
    ]);

  return (
    <DataContext.Provider value={contextValue}>
        {children}
    </DataContext.Provider>
  );
};