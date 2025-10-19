// src/context/DataContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Animal, Weighing, Parturition, Father, Lot, Origin, BreedingSeason, SireLot, ServiceRecord, Event, EventType, BodyWeighing, Product, HealthPlan, PlanActivity, HealthEvent, initDB, getDB, FeedingPlan } from '../db/local';
import { db as firestoreDb } from '../firebaseConfig';
import { useAuth } from './AuthContext';
import { collection, query, where, onSnapshot, deleteDoc, doc, setDoc, writeBatch, Timestamp, serverTimestamp } from "firebase/firestore"; // getDocs eliminado
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
  addAnimal: (animalData: Omit<Animal, 'id'> & { id: string }) => Promise<void>;
  updateAnimal: (animalId: string, dataToUpdate: Partial<Animal>) => Promise<void>;
  deleteAnimalPermanently: (animalId: string) => Promise<void>;
  startDryingProcess: (parturitionId: string) => Promise<void>;
  setLactationAsDry: (parturitionId: string) => Promise<void>;
  addLot: (lotData: { name: string, parentLotId?: string }) => Promise<void>;
  deleteLot: (lotId: string) => Promise<void>;
  addOrigin: (originName: string) => Promise<void>;
  deleteOrigin: (originId: string) => Promise<void>;
  addBreedingSeason: (seasonData: Omit<BreedingSeason, 'id' | 'userId'>) => Promise<string>;
  updateBreedingSeason: (seasonId: string, dataToUpdate: Partial<BreedingSeason>) => Promise<void>;
  deleteBreedingSeason: (seasonId: string) => Promise<void>;
  addSireLot: (lotData: Omit<SireLot, 'id' | 'userId'>) => Promise<string>;
  updateSireLot: (lotId: string, dataToUpdate: Partial<SireLot>) => Promise<void>;
  deleteSireLot: (lotId: string) => Promise<void>;
  addServiceRecord: (recordData: Omit<ServiceRecord, 'id' | 'userId'>) => Promise<void>;
  addFeedingPlan: (planData: Omit<FeedingPlan, 'id' | 'userId'>) => Promise<void>;
  addBatchEvent: (data: { lotName: string; date: string; type: EventType; details: string; }) => Promise<void>;
  addWeighing: (weighing: Omit<Weighing, 'id' | 'userId'>) => Promise<void>;
  addBodyWeighing: (weighing: Omit<BodyWeighing, 'id' | 'userId'>) => Promise<void>;
  deleteWeighingSession: (date: string) => Promise<void>;
  addParturition: (data: any) => Promise<void>;
  fetchData: () => Promise<void>;
  addFather: (father: { id: string, name: string }) => Promise<void>;
  addProduct: (productData: Omit<Product, 'id' | 'userId'>) => Promise<void>;
  updateProduct: (productId: string, dataToUpdate: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  addHealthPlanWithActivities: (planData: Omit<HealthPlan, 'id' | 'userId'>, activities: Omit<PlanActivity, 'id' | 'healthPlanId' | 'userId'>[]) => Promise<void>;
  updateHealthPlan: (planId: string, dataToUpdate: Partial<HealthPlan>) => Promise<void>;
  deleteHealthPlan: (planId: string) => Promise<void>;
  addPlanActivity: (activityData: Omit<PlanActivity, 'id' | 'userId'>) => Promise<void>;
  updatePlanActivity: (activityId: string, dataToUpdate: Partial<PlanActivity>) => Promise<void>;
  deletePlanActivity: (activityId: string) => Promise<void>;
  addHealthEvent: (eventData: Omit<HealthEvent, 'id' | 'userId'>) => Promise<void>;
}


const DataContext = createContext<IDataContext>({} as IDataContext);

export const useData = () => useContext(DataContext);

// Helper de Sincronización
const syncToFirestore = async (collectionName: string, id: string, data: any) => {
    try {
        const dataToSync = { ...data, createdAt: data.createdAt || serverTimestamp() };
        await setDoc(doc(firestoreDb, collectionName, id), dataToSync, { merge: true });
    } catch (error) {
        console.error(`Firestore sync for ${collectionName} (${id}) failed (will retry automatically):`, error);
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
                setBodyWeighings([]); setProducts([]); setHealthPlans([]); setPlanActivities([]); setHealthEvents([]);
                return;
            }

            setIsLoading(true);
            try {
                const localDb = await initDB();
                await fetchDataFromLocalDb();
                const q = (collectionName: string) => query(collection(firestoreDb, collectionName), where("userId", "==", currentUser.uid));

                const syncCollection = (collectionName: string, table: any) => {
                    const unsubscribe = onSnapshot(q(collectionName), async (snapshot) => {
                        if (snapshot.metadata.hasPendingWrites) {
                            return;
                        }
                        if (snapshot.docChanges().length > 0) {
                            if (navigator.onLine) {
                                setSyncStatus('syncing');
                                if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                                syncTimeoutRef.current = setTimeout(() => setSyncStatus('idle'), 2000);
                            }
                        }

                        const changes = snapshot.docChanges().map(change => {
                            const docData: any = { id: change.doc.id, ...change.doc.data() };
                            if (docData.createdAt instanceof Timestamp) {
                                docData.createdAt = docData.createdAt.toMillis();
                            }
                            return { type: change.type, data: docData };
                        });
                        
                        if (changes.length > 0) {
                            try {
                                await localDb.transaction('rw', table, async () => {
                                    for (const change of changes) {
                                        if (change.type === "added" || change.type === "modified") {
                                            await table.put(change.data);
                                        } else if (change.type === "removed") {
                                            await table.delete(change.data.id);
                                        }
                                    }
                                });
                                await fetchDataFromLocalDb();
                            } catch (transactionError) {
                                console.error(`Dexie transaction error during sync for ${collectionName}:`, transactionError);
                            }
                        }
                    }, (error) => {
                        if (error.code === 'permission-denied') {
                            console.warn(`Permission denied for ${collectionName}. Logging out.`);
                            return;
                        }
                        console.error(`Firestore snapshot error for ${collectionName}:`, error);
                    });
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
                syncCollection('planActivities', localDb.planActivities);
                syncCollection('healthEvents', localDb.healthEvents);

            } catch (error) { console.error("Fallo crítico en la inicialización de DataProvider:", error); setIsLoading(false); }
        };
        setupSync();
        return () => { unsubscribers.forEach(unsub => unsub()); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
    }, [currentUser, fetchDataFromLocalDb]);

    // --- FUNCIONES DE ESCRITURA REFACTORIZADAS (LOCAL-FIRST) ---

    // --- NUEVA FUNCIÓN INTERNA PARA LOGGING DE EVENTOS ---
    const internalAddEvent = (eventData: Omit<Event, 'id' | 'userId'>) => {
        if (!currentUser) return;
        
        (async () => {
            try {
                const localDb = getDB();
                const newEvent: Event = { id: uuidv4(), ...eventData, userId: currentUser.uid };
                await localDb.events.put(newEvent);
                await syncToFirestore("events", newEvent.id, newEvent);
                setTimeout(fetchDataFromLocalDb, 500); 
            } catch (err) {
                console.error("Error en el registro de evento en segundo plano:", err);
            }
        })();
    };

    const addAnimal = async (animalData: Omit<Animal, 'id'> & { id: string }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newAnimal: Animal = { ...animalData, id: animalData.id.toUpperCase(), userId: currentUser.uid, createdAt: Date.now() };
        
        await localDb.animals.put(newAnimal);
        
        internalAddEvent({
            animalId: newAnimal.id,
            date: newAnimal.birthDate,
            type: 'Nacimiento',
            details: `Nacido con ${newAnimal.birthWeight || 'N/A'} Kg. Madre: ${newAnimal.motherId || 'N/A'}. Padre: ${newAnimal.fatherId || 'N/A'}.`,
            lotName: newAnimal.location
        });

        fetchDataFromLocalDb();
        syncToFirestore("animals", newAnimal.id, newAnimal);
    };

    const updateAnimal = async (animalId: string, dataToUpdate: Partial<Animal>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = animalId.toUpperCase();
        const today = new Date().toISOString().split('T')[0];

        const currentAnimal = await localDb.animals.get(upperId);
        if (!currentAnimal) throw new Error("Animal no encontrado para actualizar");

        await localDb.animals.update(upperId, dataToUpdate);

        if (dataToUpdate.location !== undefined && dataToUpdate.location !== currentAnimal.location) {
            internalAddEvent({
                animalId: upperId, date: today, type: 'Movimiento',
                details: `Movido de '${currentAnimal.location || 'Sin Asignar'}' a '${dataToUpdate.location || 'Sin Asignar'}'`,
                lotName: dataToUpdate.location || ''
            });
        }
        if (dataToUpdate.reproductiveStatus !== undefined && dataToUpdate.reproductiveStatus !== currentAnimal.reproductiveStatus) {
            internalAddEvent({
                animalId: upperId, date: today, type: 'Cambio de Estado',
                details: `Estado reproductivo: ${dataToUpdate.reproductiveStatus}`
            });
        }
        if (dataToUpdate.status !== undefined && dataToUpdate.status !== currentAnimal.status) {
             internalAddEvent({
                animalId: upperId, date: dataToUpdate.endDate || today, type: 'Cambio de Estado',
                details: `Animal dado de baja: ${dataToUpdate.status} ${dataToUpdate.cullReason ? `(${dataToUpdate.cullReason})` : ''}`
            });
        }
        if (dataToUpdate.weaningDate && !currentAnimal.weaningDate) {
            internalAddEvent({
                animalId: upperId, date: dataToUpdate.weaningDate, type: 'Cambio de Estado',
                details: `Destetado con ${dataToUpdate.weaningWeight || 'N/A'} Kg`
            });
        }
        
        fetchDataFromLocalDb();
        syncToFirestore("animals", upperId, dataToUpdate);
    };

    const deleteAnimalPermanently = async (animalId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = animalId.toUpperCase();
        await localDb.animals.delete(upperId);
        fetchDataFromLocalDb();
        deleteDoc(doc(firestoreDb, "animals", upperId)).catch(error => console.error("Firestore delete sync failed:", error));
    };

    const startDryingProcess = async (parturitionId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const parturition = await localDb.parturitions.get(parturitionId);
        if (!parturition) throw new Error("Parto no encontrado");

        const dataToUpdate = { status: 'en-secado' as const, dryingStartDate: new Date().toISOString().split('T')[0] };
        
        await localDb.parturitions.update(parturitionId, dataToUpdate);

        internalAddEvent({
            animalId: parturition.goatId,
            date: dataToUpdate.dryingStartDate,
            type: 'Cambio de Estado',
            details: `Inició proceso de secado (Lactancia de ${parturition.parturitionDate})`
        });
        
        fetchDataFromLocalDb();
        syncToFirestore("parturitions", parturitionId, dataToUpdate);
    };

    const setLactationAsDry = async (parturitionId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const parturition = await localDb.parturitions.get(parturitionId);
        if (!parturition) throw new Error("Parto no encontrado");
        
        const dataToUpdate = { status: 'seca' as const };
        
        await localDb.parturitions.update(parturitionId, dataToUpdate);

        internalAddEvent({
            animalId: parturition.goatId,
            date: new Date().toISOString().split('T')[0],
            type: 'Cambio de Estado',
            details: `Declarada Seca (Lactancia de ${parturition.parturitionDate})`
        });

        fetchDataFromLocalDb();
        syncToFirestore("parturitions", parturitionId, dataToUpdate);
    };

    const addLot = async (lotData: { name: string, parentLotId?: string }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const existingLot = await localDb.lots.where('name').equalsIgnoreCase(lotData.name).first();
        if (existingLot) throw new Error(`El lote '${lotData.name}' ya existe.`);
        const newLot: Lot = { 
            id: uuidv4(), 
            name: lotData.name, 
            parentLotId: lotData.parentLotId, 
            userId: currentUser.uid 
        };
        await localDb.lots.put(newLot);
        fetchDataFromLocalDb();
        syncToFirestore("lots", newLot.id, newLot);
    };

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
        deleteDoc(doc(firestoreDb, "lots", lotId)).catch(error => console.error("Firestore delete sync failed:", error));
    };

    const addOrigin = async (originName: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const existingOrigin = await localDb.origins.where('name').equalsIgnoreCase(originName).first();
        if (existingOrigin) throw new Error(`El origen '${originName}' ya existe.`);
        const newOrigin = { id: uuidv4(), name: originName, userId: currentUser.uid };
        await localDb.origins.put(newOrigin);
        fetchDataFromLocalDb();
        syncToFirestore("origins", newOrigin.id, newOrigin);
    };

    const deleteOrigin = async (originId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.origins.delete(originId);
        fetchDataFromLocalDb();
        deleteDoc(doc(firestoreDb, "origins", originId)).catch(error => console.error("Firestore delete sync failed:", error));
    };

    const addWeighing = async (weighing: Omit<Weighing, 'id' | 'userId'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newWeighing: Weighing = { id: uuidv4(), ...weighing, userId: currentUser.uid };
        
        const newEvent: Event = {
            id: uuidv4(),
            animalId: weighing.goatId,
            date: weighing.date,
            type: 'Pesaje Lechero',
            details: `Registro de ${weighing.kg} Kg`,
            userId: currentUser.uid
        };

        await localDb.transaction('rw', localDb.weighings, localDb.events, async () => {
            await localDb.weighings.put(newWeighing);
            await localDb.events.put(newEvent);
        });

        fetchDataFromLocalDb();
        
        syncToFirestore("weighings", newWeighing.id, newWeighing);
        syncToFirestore("events", newEvent.id, newEvent);
    };

    const addBodyWeighing = async (weighing: Omit<BodyWeighing, 'id' | 'userId'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newWeighing: BodyWeighing = { id: uuidv4(), ...weighing, userId: currentUser.uid };

        const newEvent: Event = {
            id: uuidv4(),
            animalId: weighing.animalId,
            date: weighing.date,
            type: 'Pesaje Corporal',
            details: `Registro de ${weighing.kg} Kg`,
            userId: currentUser.uid
        };
        
        await localDb.transaction('rw', localDb.bodyWeighings, localDb.events, async () => {
            await localDb.bodyWeighings.put(newWeighing);
            await localDb.events.put(newEvent);
        });

        fetchDataFromLocalDb();

        syncToFirestore("bodyWeighings", newWeighing.id, newWeighing);
        syncToFirestore("events", newEvent.id, newEvent);
    };

    const deleteWeighingSession = async (date: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const weighingsToDelete = await localDb.weighings.where({ date }).toArray();
        if (weighingsToDelete.length === 0) return;
        
        const idsToDelete = weighingsToDelete.map(w => w.id);
        const animalIds = weighingsToDelete.map(w => w.goatId);
        
        const eventsToDelete = await localDb.events
            .where('date').equals(date)
            .and(e => e.type === 'Pesaje Lechero' && animalIds.includes(e.animalId))
            .toArray();
        const eventIdsToDelete = eventsToDelete.map(e => e.id);

        await localDb.transaction('rw', localDb.weighings, localDb.events, async () => {
            await localDb.weighings.bulkDelete(idsToDelete);
            await localDb.events.bulkDelete(eventIdsToDelete);
        });
        
        await fetchDataFromLocalDb();

        const syncDeletion = async () => {
            const batch = writeBatch(firestoreDb);
            idsToDelete.forEach(id => batch.delete(doc(firestoreDb, "weighings", id)));
            eventIdsToDelete.forEach(id => batch.delete(doc(firestoreDb, "events", id)));
            await batch.commit();
        };
        syncDeletion().catch(error => console.error("Firestore sync for deleteWeighingSession failed:", error));
    };


    const addFather = async (father: { id: string, name: string }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = father.id.toUpperCase();
        const existingFather = await localDb.fathers.where('id').equalsIgnoreCase(upperId).first();
        if (existingFather) throw new Error(`El ID de padre '${upperId}' ya está en uso.`);
        const newFather: Father = { ...father, id: upperId, userId: currentUser.uid };
        await localDb.fathers.put(newFather);
        fetchDataFromLocalDb();
        syncToFirestore("fathers", newFather.id, newFather);
    };

    const addParturition = async (data: any) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperCaseMotherId = data.motherId.toUpperCase();
        const lactationStatus: Parturition['status'] = (data.parturitionOutcome === 'Aborto' && !data.inducedLactation) ? 'finalizada' : 'activa';
        const newParturitionId = uuidv4();

        const parturitionData: Parturition = {
            id: newParturitionId,
            goatId: upperCaseMotherId,
            parturitionDate: data.parturitionDate,
            sireId: data.sireId,
            offspringCount: data.offspringCount,
            parturitionType: data.parturitionType,
            parturitionOutcome: data.parturitionOutcome,
            status: lactationStatus,
            userId: currentUser.uid,
        };

        const newKidsData: Animal[] = (data.liveOffspring || []).map((kid: any) => ({
            id: kid.id.toUpperCase(), sex: kid.sex, status: 'Activo', birthDate: data.parturitionDate,
            motherId: upperCaseMotherId, fatherId: data.sireId, birthWeight: parseFloat(kid.birthWeight),
            userId: currentUser.uid, createdAt: Date.now(),
            lifecycleStage: kid.sex === 'Hembra' ? 'Cabrita' : 'Cabrito',
            location: '',
            reproductiveStatus: 'No Aplica',
        }));
        
        const eventType: EventType = data.parturitionOutcome === 'Aborto' ? 'Aborto' : 'Parto';
        const eventDetails = data.parturitionOutcome === 'Aborto'
            ? `Aborto registrado con Semental: ${data.sireId}. ${data.inducedLactation ? 'Se induce lactancia.' : ''}`
            : `Parto ${data.parturitionType} (${data.offspringCount} crías) con Semental: ${data.sireId}. Vivas: ${newKidsData.length}.`;
            
        const motherEvent: Event = {
            id: uuidv4(),
            animalId: upperCaseMotherId,
            date: data.parturitionDate,
            type: eventType,
            details: eventDetails,
            userId: currentUser.uid
        };

        const kidsEvents: Event[] = newKidsData.map(kid => ({
            id: uuidv4(),
            animalId: kid.id,
            date: kid.birthDate,
            type: 'Nacimiento',
            details: `Nacido con ${kid.birthWeight || 'N/A'} Kg. Madre: ${kid.motherId}. Padre: ${kid.fatherId}.`,
            userId: currentUser.uid
        }));

        await localDb.transaction('rw', localDb.parturitions, localDb.animals, localDb.events, async () => {
            await localDb.parturitions.put(parturitionData);
            await localDb.events.put(motherEvent);
            if (newKidsData.length > 0) {
                await localDb.animals.bulkPut(newKidsData);
                await localDb.events.bulkPut(kidsEvents);
            }
        });

        await fetchDataFromLocalDb();

        const sync = async () => {
            const batch = writeBatch(firestoreDb);
            batch.set(doc(firestoreDb, "parturitions", newParturitionId), parturitionData);
            batch.set(doc(firestoreDb, "events", motherEvent.id), motherEvent);
            newKidsData.forEach((kid: Animal) => batch.set(doc(firestoreDb, "animals", kid.id), kid));
            kidsEvents.forEach((event: Event) => batch.set(doc(firestoreDb, "events", event.id), event));
            await batch.commit();
        };
        sync().catch(error => console.error("Firestore sync for addParturition failed:", error));
    };


    const addServiceRecord = async (recordData: Omit<ServiceRecord, 'id' | 'userId'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newRecord: ServiceRecord = { id: uuidv4(), ...recordData, userId: currentUser.uid };
        
        const lot = await localDb.sireLots.get(newRecord.sireLotId);
        const sire = lot ? await localDb.fathers.get(lot.sireId) : null;

        const newEvent: Event = {
            id: uuidv4(),
            animalId: newRecord.femaleId,
            date: newRecord.serviceDate,
            type: 'Servicio',
            details: `Servicio registrado con Semental: ${sire?.name || newRecord.sireLotId}`,
            userId: currentUser.uid
        };

        await localDb.transaction('rw', localDb.serviceRecords, localDb.events, async () => {
            await localDb.serviceRecords.put(newRecord);
            await localDb.events.put(newEvent);
        });
        
        fetchDataFromLocalDb();

        syncToFirestore("serviceRecords", newRecord.id, newRecord);
        syncToFirestore("events", newEvent.id, newEvent);
    };

    const addBatchEvent = async (data: { lotName: string; date: string; type: EventType; details: string; }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const animalsInLot = await localDb.animals.where({ location: data.lotName }).toArray();
        if (animalsInLot.length === 0) return;

        const newEvents: Event[] = animalsInLot.map(animal => ({
            id: uuidv4(), animalId: animal.id, date: data.date, type: data.type,
            details: data.details, lotName: data.lotName, userId: currentUser.uid,
            notes: `Evento aplicado a todo el lote: ${data.lotName}`
        }));

        await localDb.events.bulkPut(newEvents);
        fetchDataFromLocalDb();

        const sync = async () => {
            const batch = writeBatch(firestoreDb);
            newEvents.forEach(event => batch.set(doc(firestoreDb, "events", event.id), event));
            await batch.commit();
        };
        sync().catch(error => console.error("Firestore sync for addBatchEvent failed:", error));
    };

    const addFeedingPlan = async (planData: Omit<FeedingPlan, 'id' | 'userId'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newPlan = { id: uuidv4(), ...planData, userId: currentUser.uid };
        await localDb.feedingPlans.put(newPlan);
        fetchDataFromLocalDb();
        syncToFirestore("feedingPlans", newPlan.id, newPlan);
    };

    const addBreedingSeason = async (seasonData: Omit<BreedingSeason, 'id' | 'userId'>): Promise<string> => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newSeason = { id: uuidv4(), ...seasonData, userId: currentUser.uid };
        await localDb.breedingSeasons.put(newSeason);
        fetchDataFromLocalDb();
        syncToFirestore("breedingSeasons", newSeason.id, newSeason);
        return newSeason.id;
    };

    const updateBreedingSeason = async (seasonId: string, dataToUpdate: Partial<BreedingSeason>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.breedingSeasons.update(seasonId, dataToUpdate);
        fetchDataFromLocalDb();
        syncToFirestore("breedingSeasons", seasonId, dataToUpdate);
    };

    const deleteBreedingSeason = async (seasonId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.breedingSeasons.delete(seasonId);
        fetchDataFromLocalDb();
        deleteDoc(doc(firestoreDb, "breedingSeasons", seasonId)).catch(error => console.error("Firestore delete sync failed:", error));
    };

    const addSireLot = async (lotData: Omit<SireLot, 'id' | 'userId'>): Promise<string> => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newLot = { id: uuidv4(), ...lotData, userId: currentUser.uid };
        await localDb.sireLots.put(newLot);
        fetchDataFromLocalDb();
        syncToFirestore("sireLots", newLot.id, newLot);
        return newLot.id;
    };

    const updateSireLot = async (lotId: string, dataToUpdate: Partial<SireLot>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.sireLots.update(lotId, dataToUpdate);
        fetchDataFromLocalDb();
        syncToFirestore("sireLots", lotId, dataToUpdate);
    };

    const deleteSireLot = async (lotId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.sireLots.delete(lotId);
        fetchDataFromLocalDb();
        deleteDoc(doc(firestoreDb, "sireLots", lotId)).catch(error => console.error("Firestore delete sync failed:", error));
    };

    const addProduct = async (productData: Omit<Product, 'id' | 'userId'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newProduct = { id: uuidv4(), ...productData, userId: currentUser.uid };
        await localDb.products.put(newProduct);
        fetchDataFromLocalDb();
        syncToFirestore("products", newProduct.id, newProduct);
    };

    const updateProduct = async (productId: string, dataToUpdate: Partial<Product>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.products.update(productId, dataToUpdate);
        fetchDataFromLocalDb();
        syncToFirestore("products", productId, dataToUpdate);
    };
 
    const deleteProduct = async (productId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.products.delete(productId);
        fetchDataFromLocalDb();
        deleteDoc(doc(firestoreDb, "products", productId)).catch(error => console.error("Firestore delete sync failed:", error));
    };
  
    const addHealthPlanWithActivities = async (planData: Omit<HealthPlan, 'id' | 'userId'>, activities: Omit<PlanActivity, 'id' | 'healthPlanId' | 'userId'>[]) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newPlan = { id: uuidv4(), ...planData, userId: currentUser.uid };
        const newActivities = activities.map(act => ({ id: uuidv4(), ...act, healthPlanId: newPlan.id, userId: currentUser.uid }));

        await localDb.transaction('rw', localDb.healthPlans, localDb.planActivities, async () => {
            await localDb.healthPlans.put(newPlan);
            await localDb.planActivities.bulkPut(newActivities);
        });
        fetchDataFromLocalDb();

        const sync = async () => {
            const batch = writeBatch(firestoreDb);
            batch.set(doc(firestoreDb, "healthPlans", newPlan.id), newPlan);
            newActivities.forEach(act => batch.set(doc(firestoreDb, "planActivities", act.id), act));
            await batch.commit();
        };
        sync().catch(error => console.error("Firestore sync for addHealthPlan failed:", error));
    };
    
    const updateHealthPlan = async (planId: string, dataToUpdate: Partial<HealthPlan>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.healthPlans.update(planId, dataToUpdate);
        fetchDataFromLocalDb();
        syncToFirestore("healthPlans", planId, dataToUpdate);
    };

    const deleteHealthPlan = async (planId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const activitiesToDelete = await localDb.planActivities.where({ healthPlanId: planId }).toArray();
        const activityIdsToDelete = activitiesToDelete.map(act => act.id);

        await localDb.transaction('rw', localDb.healthPlans, localDb.planActivities, async () => {
            await localDb.planActivities.bulkDelete(activityIdsToDelete);
            await localDb.healthPlans.delete(planId);
        });
        fetchDataFromLocalDb();
        
        const sync = async () => {
            const batch = writeBatch(firestoreDb);
            activityIdsToDelete.forEach(id => batch.delete(doc(firestoreDb, "planActivities", id)));
            batch.delete(doc(firestoreDb, "healthPlans", planId));
            await batch.commit();
        };
        sync().catch(error => console.error("Firestore sync for deleteHealthPlan failed:", error));  };

    const addPlanActivity = async (activityData: Omit<PlanActivity, 'id' | 'userId'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newActivity = { id: uuidv4(), ...activityData, userId: currentUser.uid };
        await localDb.planActivities.put(newActivity);
        fetchDataFromLocalDb();
        syncToFirestore("planActivities", newActivity.id, newActivity);
    };
  
    const updatePlanActivity = async (activityId: string, dataToUpdate: Partial<PlanActivity>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.planActivities.update(activityId, dataToUpdate);
      fetchDataFromLocalDb();
        syncToFirestore("planActivities", activityId, dataToUpdate);
    };

    const deletePlanActivity = async (activityId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.planActivities.delete(activityId);
        fetchDataFromLocalDb();
        deleteDoc(doc(firestoreDb, "planActivities", activityId)).catch(error => console.error("Firestore delete sync failed:", error));
    };

    const addHealthEvent = async (eventData: Omit<HealthEvent, 'id' | 'userId'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newEvent = { id: uuidv4(), ...eventData, userId: currentUser.uid };
        await localDb.healthEvents.put(newEvent);
        
        internalAddEvent({
            animalId: newEvent.animalId,
            date: newEvent.date,
            type: 'Tratamiento',
            details: `${newEvent.type}${newEvent.productUsed ? ` con ${products.find(p => p.id === newEvent.productUsed)?.name || 'producto'}` : ''}`,
            notes: newEvent.notes,
            lotName: newEvent.lotName
        });

        fetchDataFromLocalDb();
        syncToFirestore("healthEvents", newEvent.id, newEvent);
    };

  return (
    <DataContext.Provider value={{
        animals, fathers, weighings, parturitions, lots, origins, breedingSeasons, sireLots, serviceRecords, events, feedingPlans, bodyWeighings,
        products, healthPlans, planActivities, healthEvents,
        isLoading, syncStatus,
        addAnimal, updateAnimal, deleteAnimalPermanently, startDryingProcess, setLactationAsDry, addLot, deleteLot, addOrigin, deleteOrigin,
        addBreedingSeason, updateBreedingSeason, deleteBreedingSeason, addSireLot, updateSireLot, deleteSireLot, addServiceRecord,
        addFeedingPlan, addBatchEvent, addWeighing, addBodyWeighing, deleteWeighingSession, addParturition, fetchData: fetchDataFromLocalDb, addFather,
        addProduct, updateProduct, deleteProduct, addHealthPlanWithActivities, updateHealthPlan, deleteHealthPlan,
        addPlanActivity, updatePlanActivity, deletePlanActivity, addHealthEvent
      }}
    >
      {children}
    </DataContext.Provider>
  );
};