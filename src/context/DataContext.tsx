import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Table } from 'dexie';
import { Animal, Weighing, Parturition, Father, Lot, Origin, BreedingSeason, SireLot, ServiceRecord, Event, EventType, BodyWeighing, Product, HealthPlan, PlanActivity, HealthEvent, FeedingPlan, FamachaRev, initDB, getDB, GanaderoOSTables } from '../db/local';
import { db as firestoreDb } from '../firebaseConfig';
import { useAuth } from './AuthContext';
import { collection, query, where, onSnapshot, doc, setDoc, writeBatch, Timestamp, serverTimestamp } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { calculateAgeInMonths } from '../utils/calculations';
import { computeReleasedReproState, isPresumedPregnancyExpired, isSeasonOver } from '../utils/reproduction';

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
  famachaRevs: FamachaRev[];

  appConfig: AppConfig;
  isLoadingConfig: boolean;

  // --- Estado y Funciones ---
  isLoading: boolean;
  syncStatus: SyncStatus;
  pendingSyncCount: number;        // cambios locales aún sin subir (incluye borrados)
  syncFailures: SyncFailure[];     // cambios que Firestore rechazó (diagnóstico)
  lastSyncAt: number | null;       // timestamp de la última subida exitosa
  syncNow: () => Promise<void>;    // forzar sincronización ahora
  addAnimal: (animalData: Omit<Animal, 'id' | '_synced' | 'userId' | 'createdAt'> & { id?: string }) => Promise<void>;
  updateAnimal: (animalId: string, dataToUpdate: Partial<Animal>, eventDate?: string) => Promise<void>;
  bulkUpdateAnimals: (updates: { id: string; changes: Partial<Animal> }[]) => Promise<void>;
  deleteAnimalPermanently: (animalId: string) => Promise<void>;
  changeAnimalId: (oldId: string, newId: string) => Promise<void>;
  startDryingProcess: (parturitionId: string) => Promise<void>;
  setLactationAsDry: (parturitionId: string, date?: string) => Promise<void>;
  revertLactationDrying: (parturitionId: string) => Promise<void>;
  addLot: (lotData: { name: string, parentLotId?: string }) => Promise<void>;
  
  updateLot: (lotId: string, dataToUpdate: Partial<Lot>) => Promise<void>;
  deleteLot: (lotId: string) => Promise<void>;

  addOrigin: (originName: string) => Promise<void>;
  deleteOrigin: (originId: string) => Promise<void>;
  addBreedingSeason: (seasonData: Omit<BreedingSeason, 'id' | 'userId' | '_synced'>) => Promise<string>;
  updateBreedingSeason: (seasonId: string, dataToUpdate: Partial<BreedingSeason>) => Promise<void>;
  closeBreedingSeason: (seasonId: string, closedDate: string) => Promise<void>;
  normalizeReproductiveState: (opts?: { aggressive?: boolean; diagnostic?: boolean }) => Promise<{ released: number; report: string[] }>;

  deleteBreedingSeason: (seasonId: string) => Promise<void>;

  addSireLot: (lotData: Omit<SireLot, 'id' | 'userId' | '_synced'>) => Promise<string>;
  updateSireLot: (lotId: string, dataToUpdate: Partial<SireLot>) => Promise<void>;
  deleteSireLot: (lotId: string) => Promise<void>;
  retireSire: (lotId: string, date?: string) => Promise<void>;
  swapSire: (lotId: string, newSireId: string, date?: string) => Promise<string>;
  addServiceRecord: (recordData: Omit<ServiceRecord, 'id' | 'userId' | '_synced'>) => Promise<void>;
  addFeedingPlan: (planData: Omit<FeedingPlan, 'id' | 'userId' | '_synced'>) => Promise<void>;
  addBatchEvent: (data: { lotName: string; date: string; type: EventType; details: string; }) => Promise<void>;
  
  addEvent: (eventData: Omit<Event, 'id' | 'userId' | '_synced'>) => void; 

  addWeighing: (weighing: Omit<Weighing, 'id' | 'userId' | '_synced'>) => Promise<string>;
  addBodyWeighing: (weighing: Omit<BodyWeighing, 'id' | 'userId' | '_synced'>) => Promise<string>;
  deleteWeighing: (id: string) => Promise<void>;
  deleteBodyWeighing: (id: string) => Promise<void>;
  deleteWeighingSession: (date: string) => Promise<void>;
  deleteBodyWeighingSession: (date: string) => Promise<void>;
  addParturition: (data: any) => Promise<void>;
  deleteParturition: (id: string) => Promise<void>;
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
  addFamachaRev: (revData: Omit<FamachaRev, 'id' | 'userId' | '_synced'>) => Promise<{ revId: string }>;
  deleteFamachaRev: (revId: string) => Promise<void>;

  deleteEvent: (eventId: string) => Promise<void>;
  deleteServiceRecord: (id: string) => Promise<void>;
  updateEventNotes: (eventId: string, notes: string) => Promise<void>;

  updateAppConfig: (config: AppConfig) => Promise<void>;
}

const DataContext = createContext<IDataContext>({} as IDataContext);

export const useData = () => useContext(DataContext);

// --- DIAGNÓSTICO / AUTOREPARACIÓN DE SINCRONIZACIÓN ---
// Estado compartido a nivel de módulo que el provider puebla. Permite a los
// helpers de sincronización (definidos fuera del componente) conocer el uid
// actual y reportar el resultado de cada escritura sin tocar los ~30 sitios
// que encolan syncToFirestore.
export interface SyncFailure { collection: string; id: string; error: string; attempts: number; }
const syncRuntime: {
    uid: string | null;
    onResult: ((r: { collection: string; id: string; ok: boolean; error?: string }) => void) | null;
} = { uid: null, onResult: null };

// Sanitiza recursivamente un valor para Firestore. Firestore RECHAZA (abortando
// toda la escritura o el batch completo) cualquier `undefined`, número no finito
// (NaN/Infinity), función o símbolo — incluso anidado dentro de objetos/arrays.
// La limpieza superficial anterior dejaba pasar valores anidados inválidos, y un
// solo registro "envenenado" quedaba `_synced:false` para siempre. Este saneo
// profundo elimina esos valores conservando el resto de la data intacta.
const sanitizeForFirestore = (value: any): any => {
    if (value === null) return null;
    if (value instanceof Timestamp || value instanceof Date) return value;
    if (Array.isArray(value)) {
        // Firestore no admite `undefined` dentro de arrays: se sustituye por null
        // para preservar posiciones (los objetos internos se sanean en profundidad).
        return value.map(v => {
            const sv = sanitizeForFirestore(v);
            return sv === undefined ? null : sv;
        });
    }
    if (typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) {
            if (k === '_synced') continue; // flag local, nunca se sube
            const sv = sanitizeForFirestore(v);
            if (sv === undefined) continue; // descarta undefined y no-finitos anidados
            out[k] = sv;
        }
        return out;
    }
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value === 'function' || typeof value === 'symbol') return undefined;
    return value;
};

// Ruta de documento válida para Firestore: segmentos no vacíos y sin '/'.
// Un tombstone con ruta inválida jamás podría escribirse y bloquearía el batch
// de borrados indefinidamente, por eso se detecta y descarta.
const isValidFirestorePath = (collectionName?: string, docId?: string): boolean => {
    const ok = (s?: string) => typeof s === 'string' && s.trim().length > 0 && !s.includes('/');
    return ok(collectionName) && ok(docId);
};

// Helper de Sincronización
const syncToFirestore = async (collectionName: string, id: string, data: any) => {
    const table = getDB()[collectionName as keyof GanaderoOSTables] as Table<any, any>;
    try {
        const cleanData = sanitizeForFirestore(data) as Record<string, any>;

        // Autoreparación: TODO registro del usuario debe llevar su `userId`. Sin él,
        // las reglas de seguridad de Firestore rechazan la escritura y el registro
        // queda atascado para siempre. Se rellena con el uid actual (modelo de un
        // solo usuario por cuenta, así que es seguro y correcto).
        let backfilledUserId = false;
        if (!cleanData.userId && syncRuntime.uid) {
            cleanData.userId = syncRuntime.uid;
            backfilledUserId = true;
        }

        const existingDoc = await table.get(id);
        const needsTimestamp = !existingDoc || !(existingDoc as any).createdAt;

        const dataToSync: Record<string, any> = { ...cleanData };
        // Un createdAt null/undefined no debe escribirse tal cual: se completa con el
        // sello del servidor cuando falta, o se omite si ya existe en el documento.
        if (dataToSync.createdAt === null || dataToSync.createdAt === undefined) {
            delete dataToSync.createdAt;
            if (needsTimestamp) dataToSync.createdAt = serverTimestamp();
        }

        await setDoc(doc(firestoreDb, collectionName, id), dataToSync, { merge: true });
        const patch: Record<string, any> = { _synced: true };
        if (backfilledUserId) patch.userId = syncRuntime.uid; // persiste la reparación en Dexie
        await table.update(id, patch);
        syncRuntime.onResult?.({ collection: collectionName, id, ok: true });

    } catch (error: any) {
        const msg = error?.code ? `${error.code}: ${error.message || ''}`.trim() : (error?.message || String(error));
        console.error(`Firestore sync for ${collectionName} (${id}) failed:`, error);
        try {
            await table.update(id, { _synced: false });
        } catch (localUpdateError) {
             console.error(`Failed to update sync status locally for ${collectionName} (${id}):`, localUpdateError);
        }
        syncRuntime.onResult?.({ collection: collectionName, id, ok: false, error: msg });
    }
};

// Colecciones sincronizables (la clave de tabla en Dexie = nombre de colección en Firestore).
// Se usa para el "barrido" de registros pendientes (offline-first durable).
const SYNCABLE_COLLECTIONS: (keyof GanaderoOSTables)[] = [
    'animals', 'fathers', 'parturitions', 'weighings', 'lots', 'origins',
    'breedingSeasons', 'sireLots', 'serviceRecords', 'events', 'feedingPlans',
    'bodyWeighings', 'products', 'healthPlans', 'planActivities', 'healthEvents', 'famachaRevs',
];

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
    const [famachaRevs, setFamachaRevs] = useState<FamachaRev[]>([]);

    // Estados de Control
    const [isLoading, setIsLoading] = useState(true);
    // Guard de concurrencia: evita solapar ejecuciones de la normalización.
    const isNormalizingReproRef = useRef(false);
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(navigator.onLine ? 'idle' : 'offline');
    const [pendingDeletionsCount, setPendingDeletionsCount] = useState(0);
    const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
        const s = localStorage.getItem('ganaderoOS_lastSyncAt');
        return s ? Number(s) : null;
    });

    // Estados de Configuración
    const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
    const [isLoadingConfig, setIsLoadingConfig] = useState(true);

    // Diagnóstico de sincronización: registros/borrados que Firestore rechazó.
    // Permite mostrar al usuario QUÉ cambio no se pudo guardar y POR QUÉ, en vez
    // de un contador de "pendientes" que nunca baja sin explicación.
    const [syncFailures, setSyncFailures] = useState<SyncFailure[]>([]);
    const stuckRef = useRef<Map<string, SyncFailure>>(new Map());

    const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const syncQueueRef = useRef<(() => Promise<void>)[]>([]);
    const isSyncingRef = useRef(false);
    const deletionAttemptsRef = useRef<Map<string, number>>(new Map());

    // Anota el resultado de intentar subir un registro/borrado. Éxito → se olvida;
    // fallo → se recuerda con su error para diagnóstico en la UI.
    const recordSyncOutcome = useCallback((collectionName: string, id: string, ok: boolean, error?: string) => {
        const key = `${collectionName}:${id}`;
        const map = stuckRef.current;
        if (ok) {
            if (map.has(key)) { map.delete(key); setSyncFailures(Array.from(map.values())); }
        } else {
            const prev = map.get(key);
            map.set(key, { collection: collectionName, id, error: error || 'error desconocido', attempts: (prev?.attempts || 0) + 1 });
            setSyncFailures(Array.from(map.values()));
        }
    }, []);

    // Conecta los helpers de módulo (syncToFirestore) con el estado del provider.
    useEffect(() => {
        syncRuntime.uid = currentUser?.uid ?? null;
        syncRuntime.onResult = (r) => recordSyncOutcome(r.collection, r.id, r.ok, r.error);
        return () => { syncRuntime.onResult = null; };
    }, [currentUser?.uid, recordSyncOutcome]);

    const cleanForBatch = useCallback((data: any) => {
        const cleanData = sanitizeForFirestore(data) as Record<string, any>;
        // Autoreparación de userId (ver syncToFirestore): sin él las reglas rechazan el batch.
        if (!cleanData.userId && syncRuntime.uid) cleanData.userId = syncRuntime.uid;
        if (cleanData.createdAt === undefined || cleanData.createdAt === null) {
            cleanData.createdAt = serverTimestamp();
        }
        return cleanData;
    }, []);


    const processSyncQueue = useCallback(async () => {
        if (isSyncingRef.current || syncQueueRef.current.length === 0 || !navigator.onLine) {
            if (syncQueueRef.current.length === 0 && !isSyncingRef.current) { setSyncStatus('idle'); }
            return;
        }
        isSyncingRef.current = true;
        setSyncStatus('syncing');
        const syncOperation = syncQueueRef.current.shift();
        if (syncOperation) {
            try { 
                await syncOperation(); 
            } catch (error) { 
                console.error("Sync Queue: Error processing item (batch fallido):", error); 
            }
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
            const [animalsData, fathersData, weighingsData, partData, lotsData, originsData, breedingSeasonsData, sireLotsData, serviceRecordsData, eventsData, feedingPlansData, bodyWeighingsData, productsData, healthPlansData, planActivitiesData, healthEventsData, famachaRevsData] = await Promise.all([
                localDb.animals.toArray(), localDb.fathers.toArray(), localDb.weighings.toArray(),
                localDb.parturitions.toArray(), localDb.lots.toArray(), localDb.origins.toArray(),
                localDb.breedingSeasons.toArray(), localDb.sireLots.toArray(), localDb.serviceRecords.toArray(),
                localDb.events.toArray(), localDb.feedingPlans.toArray(), localDb.bodyWeighings.toArray(),
                localDb.products.toArray(), localDb.healthPlans.toArray(), localDb.planActivities.toArray(),
                localDb.healthEvents.toArray(), localDb.famachaRevs.toArray(),
            ]);
            setAnimals(animalsData); setFathers(fathersData); setWeighings(weighingsData); setParturitions(partData);
            setLots(lotsData); setOrigins(originsData); setBreedingSeasons(breedingSeasonsData); setSireLots(sireLotsData);
            setServiceRecords(serviceRecordsData); setEvents(eventsData); setFeedingPlans(feedingPlansData);
            setBodyWeighings(bodyWeighingsData);
            setProducts(productsData); setHealthPlans(healthPlansData);
            setPlanActivities(planActivitiesData); setHealthEvents(healthEventsData);
            setFamachaRevs(famachaRevsData);
            try { setPendingDeletionsCount(await localDb.pendingDeletions.count()); } catch { /* ignore */ }
        } catch (error) { console.error("Error al cargar datos locales:", error); }
        finally {
            setIsLoading(false);
        }
    }, []);

    // --- BARRIDO DE PENDIENTES (Cola persistente offline-first) ---
    // El flag '_synced: false' en Dexie ES la cola durable: sobrevive recargas y cierres.
    // Esta función re-encola TODO lo que se cargó offline para subirlo al recuperar conexión.
    const syncPendingRecords = useCallback(async () => {
        if (!currentUser || !navigator.onLine) return;
        try {
            const localDb = getDB();
            let totalPending = 0;
            for (const collectionName of SYNCABLE_COLLECTIONS) {
                const table = localDb[collectionName] as Table<any, any>;
                // Nota: '_synced' es booleano (no indexable de forma fiable en IndexedDB),
                // por eso se usa filter() en lugar de where().equals().
                const pending = await table.filter(r => r._synced === false).toArray();
                if (pending.length === 0) continue;
                totalPending += pending.length;
                for (const record of pending) {
                    if (record && record.id) {
                        enqueueSync(() => syncToFirestore(collectionName as string, record.id, record));
                    }
                }
            }
            if (totalPending > 0) {
                console.log(`[Sync] Re-encolados ${totalPending} registro(s) pendiente(s) de subida (cargados offline).`);
            }
        } catch (error) {
            console.error("[Sync] Error en el barrido de registros pendientes:", error);
        }
    }, [currentUser, enqueueSync]);

    // --- BORRADOS DURABLES (tombstones) ---
    // Propaga a Firestore los borrados registrados en la tabla 'pendingDeletions'.
    // Garantiza que un borrado hecho offline no se pierda al recargar la app
    // (de lo contrario el documento "reviviría" desde la nube en el próximo snapshot).
    const syncPendingDeletions = useCallback(async () => {
        if (!currentUser || !navigator.onLine) return;
        try {
            const localDb = getDB();
            const tombstones = await localDb.pendingDeletions.toArray();
            if (tombstones.length === 0) { setPendingDeletionsCount(0); return; }

            // 1) Descarta tombstones con ruta inválida (colección/doc vacíos o con '/').
            //    Nunca podrían escribirse y bloquearían todo el batch indefinidamente.
            const malformed = tombstones.filter(t => !isValidFirestorePath(t.collection, t.docId));
            if (malformed.length) {
                await localDb.pendingDeletions.bulkDelete(malformed.map(t => t.key));
                malformed.forEach(t => deletionAttemptsRef.current.delete(t.key));
                console.warn(`[Sync] Descartados ${malformed.length} borrado(s) con ruta inválida.`);
            }
            const valid = tombstones.filter(t => isValidFirestorePath(t.collection, t.docId));
            if (valid.length === 0) { setPendingDeletionsCount(await localDb.pendingDeletions.count()); return; }

            const CHUNK = 400; // Firestore admite hasta 500 operaciones por batch
            for (let i = 0; i < valid.length; i += CHUNK) {
                const slice = valid.slice(i, i + CHUNK);
                try {
                    const batch = writeBatch(firestoreDb);
                    slice.forEach(t => batch.delete(doc(firestoreDb, t.collection, t.docId)));
                    await batch.commit();
                    await localDb.pendingDeletions.bulkDelete(slice.map(t => t.key));
                    slice.forEach(t => {
                        deletionAttemptsRef.current.delete(t.key);
                        recordSyncOutcome(`borrado:${t.collection}`, t.docId, true);
                    });
                } catch (batchErr) {
                    // AISLAMIENTO: un borrado "envenenado" no debe tumbar todo el batch.
                    // Se reintenta cada tombstone por separado para que los sanos avancen.
                    for (const t of slice) {
                        try {
                            const b = writeBatch(firestoreDb);
                            b.delete(doc(firestoreDb, t.collection, t.docId));
                            await b.commit();
                            await localDb.pendingDeletions.delete(t.key);
                            deletionAttemptsRef.current.delete(t.key);
                            recordSyncOutcome(`borrado:${t.collection}`, t.docId, true);
                        } catch (oneErr: any) {
                            const attempts = (deletionAttemptsRef.current.get(t.key) || 0) + 1;
                            deletionAttemptsRef.current.set(t.key, attempts);
                            const code = oneErr?.code;
                            const msg = code ? `${code}` : (oneErr?.message || 'error');
                            // Solo se descarta un tombstone cuya ruta es intrínsecamente
                            // imposible de escribir (invalid-argument). NUNCA por
                            // 'permission-denied': eso es un borrado LEGÍTIMO que las
                            // reglas rechazan; descartarlo perdería la intención del
                            // usuario y el documento "reviviría" desde la nube. Se deja
                            // pendiente y visible hasta que se corrija el permiso.
                            if (attempts >= 5 && code === 'invalid-argument') {
                                await localDb.pendingDeletions.delete(t.key);
                                deletionAttemptsRef.current.delete(t.key);
                                recordSyncOutcome(`borrado:${t.collection}`, t.docId, true);
                                console.warn(`[Sync] Borrado descartado tras ${attempts} intentos (${msg}): ${t.collection}/${t.docId}`);
                            } else {
                                recordSyncOutcome(`borrado:${t.collection}`, t.docId, false, msg);
                            }
                        }
                    }
                }
            }
            setPendingDeletionsCount(await localDb.pendingDeletions.count());
        } catch (error) {
            console.error("[Sync] Error al sincronizar borrados pendientes:", error);
        }
    }, [currentUser, recordSyncOutcome]);

    // Registra borrados como tombstones (durables en Dexie) e intenta propagarlos ya.
    const recordDeletions = useCallback(async (deletions: { collection: string; id: string }[]) => {
        if (deletions.length === 0) return;
        const localDb = getDB();
        const tombstones = deletions.map(d => ({
            key: `${d.collection}:${d.id}`,
            collection: d.collection,
            docId: d.id,
            deletedAt: Date.now(),
            userId: currentUser?.uid,
        }));
        await localDb.pendingDeletions.bulkPut(tombstones);
        try { setPendingDeletionsCount(await localDb.pendingDeletions.count()); } catch { /* ignore */ }
        syncPendingDeletions(); // intento inmediato (no-op si está offline)
    }, [currentUser, syncPendingDeletions]);

    // Conteo de cambios locales pendientes de subir (registros + borrados).
    const pendingSyncCount = useMemo(() => {
        const arrays: any[][] = [animals, fathers, weighings, parturitions, lots, origins, breedingSeasons, sireLots, serviceRecords, events, feedingPlans, bodyWeighings, products, healthPlans, planActivities, healthEvents, famachaRevs];
        let n = 0;
        for (const arr of arrays) for (const r of arr) if (r && r._synced === false) n++;
        return n + pendingDeletionsCount;
    }, [animals, fathers, weighings, parturitions, lots, origins, breedingSeasons, sireLots, serviceRecords, events, feedingPlans, bodyWeighings, products, healthPlans, planActivities, healthEvents, famachaRevs, pendingDeletionsCount]);

    // Fuerza una sincronización inmediata (barrido de pendientes + borrados + cola).
    // Actúa además como PASA DE REPARACIÓN: al re-encolar cada pendiente, el
    // syncToFirestore mejorado rellena el userId faltante y sanea en profundidad,
    // curando los registros que Firestore rechazaba. Se limpia el diagnóstico
    // previo para reflejar el estado real tras este intento.
    const syncNow = useCallback(async () => {
        if (!navigator.onLine) { setSyncStatus('offline'); return; }
        stuckRef.current.clear();
        setSyncFailures([]);
        setSyncStatus('syncing');
        await syncPendingRecords();
        await syncPendingDeletions();
        try { setPendingDeletionsCount(await getDB().pendingDeletions.count()); } catch { /* ignore */ }
        processSyncQueue();
    }, [syncPendingRecords, syncPendingDeletions, processSyncQueue]);

    // Marca la última sincronización exitosa cuando la cola pasa de 'syncing' a 'idle'.
    const prevSyncStatusRef = useRef<SyncStatus>(syncStatus);
    useEffect(() => {
        if (prevSyncStatusRef.current === 'syncing' && syncStatus === 'idle') {
            const ts = Date.now();
            setLastSyncAt(ts);
            try { localStorage.setItem('ganaderoOS_lastSyncAt', String(ts)); } catch { /* ignore */ }
            // Refrescar la data en memoria para que los flags _synced (y el contador
            // de pendientes) reflejen lo recién subido.
            fetchDataFromLocalDb();
        }
        prevSyncStatusRef.current = syncStatus;
    }, [syncStatus, fetchDataFromLocalDb]);

    // --- useEffect (Hook de Sincronización Principal) ---
    useEffect(() => {
        let unsubscribers: (() => void)[] = [];
        // Al reconectar: barrer pendientes (lo cargado offline) + borrados + cola en memoria.
        const handleOnline = () => { setSyncStatus('idle'); syncPendingRecords(); syncPendingDeletions(); processSyncQueue(); };
        const handleOffline = () => setSyncStatus('offline');
        // Al volver la app al primer plano (móvil de campo): reintentar si hay conexión.
        const handleVisibility = () => { if (document.visibilityState === 'visible' && navigator.onLine) { syncPendingRecords(); syncPendingDeletions(); } };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        document.addEventListener('visibilitychange', handleVisibility);

        const setupSync = async () => {
            if (!currentUser) {
                setIsLoading(false);
                setIsLoadingConfig(false);
                setAnimals([]); setFathers([]); setWeighings([]); setParturitions([]); setLots([]); setOrigins([]);
                setBreedingSeasons([]); setSireLots([]); setServiceRecords([]); setEvents([]); setFeedingPlans([]);
                setBodyWeighings([]); setProducts([]); setHealthPlans([]); setPlanActivities([]); setHealthEvents([]);
                setFamachaRevs([]);
                setAppConfig(DEFAULT_CONFIG);
                return;
            }
            setIsLoading(true);
            setIsLoadingConfig(true);
            try {
                const localDb = await initDB();
                await fetchDataFromLocalDb();

                // Barrido inicial: sube cualquier registro/borrado que quedó pendiente de
                // una sesión anterior (la app pudo cerrarse offline antes de propagar).
                syncPendingRecords();
                syncPendingDeletions();

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
                syncCollection('famachaRevs', localDb.famachaRevs);

            } catch (error) {
                console.error("Fallo crítico en la inicialización:", error); 
                setIsLoading(false); 
                setIsLoadingConfig(false);
            }
        };
        setupSync();
        return () => { unsubscribers.forEach(unsub => unsub()); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); document.removeEventListener('visibilitychange', handleVisibility); if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current); };
    }, [currentUser?.uid, fetchDataFromLocalDb, processSyncQueue, syncPendingRecords, syncPendingDeletions]);

    // --- FUNCIONES DE ESCRITURA ---

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
        
        // 1. Preparación del ID
        let finalId = (animalData.id ? animalData.id : `REF-${Date.now()}`).toUpperCase().trim();
        const sex = animalData.sex;

        // 2. Lógica de Colisión de IDs (Para soportar Mismos IDs con diferente sexo)
        // Solo verificamos si NO es un ID autogenerado (REF-)
        if (!finalId.startsWith('REF-')) {
            const existingExact = await localDb.animals.get(finalId);
            
            if (existingExact) {
                if (existingExact.sex === sex) {
                    // Mismo ID y Mismo Sexo = ERROR (Duplicado real)
                    throw new Error(`El ID '${finalId}' ya está registrado para un animal del mismo sexo (${sex}).`);
                } else {
                    // Mismo ID pero Diferente Sexo = COLISIÓN PERMITIDA
                    // Agregamos sufijo al NUEVO animal para guardarlo sin borrar el anterior
                    const suffix = sex === 'Macho' ? '-M' : '-H';
                    finalId = `${finalId}${suffix}`;
                }
            } else {
                // El ID exacto "A109" no existe. 
                // Pero verifiquemos si existe la variante con sufijo del MISMO sexo (ej: "A109-M")
                // para evitar tener "A109-M" y luego intentar guardar "A109" (Macho) como si fuera nuevo.
                const suffix = sex === 'Macho' ? '-M' : '-H';
                const existingSuffixed = await localDb.animals.get(`${finalId}${suffix}`);
                
                if (existingSuffixed) {
                     throw new Error(`El ID '${finalId}' ya está registrado (variante ${suffix}).`);
                }
                // Si no hay conflicto, guardamos con el ID limpio.
            }
        }
        
        const newAnimal: any = {
            ...animalData,
            id: finalId, // Usamos el ID validado/modificado
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
            type: 'Registro', 
            details: `${registrationType} registrado en el sistema.${birthDateDetail}`,
            lotName: newAnimal.location
        });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("animals", newAnimal.id, newAnimal));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const updateAnimal = useCallback(async (animalId: string, dataToUpdate: Partial<Animal>, eventDate?: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = animalId.toUpperCase();
        const today = new Date().toISOString().split('T')[0];
        const evDate = eventDate || today; // fecha real del evento (p. ej. diagnóstico de preñez)
        
        const currentAnimal = await localDb.animals.get(upperId);
        if (!currentAnimal) throw new Error("Animal no encontrado para actualizar");

        // Saneamiento de datos de entrada
        const safeBirthDate: string = (dataToUpdate.birthDate !== undefined ? dataToUpdate.birthDate : currentAnimal.birthDate) || '';
        const nextSex = dataToUpdate.sex !== undefined ? dataToUpdate.sex : currentAnimal.sex;
        const hasWeaningData = !!((dataToUpdate.weaningDate || currentAnimal.weaningDate) || (dataToUpdate.weaningWeight || currentAnimal.weaningWeight));
        const currentLifecycleStage = currentAnimal.lifecycleStage;

        const parturitionCount = await localDb.parturitions
            .where('goatId').equals(upperId)
            .filter(p => ['Normal', 'Con Mortinatos', 'Aborto'].includes(p.parturitionOutcome || ''))
            .count();
            
        const isProvenMother = parturitionCount > 0;

        const recalculateStage = (): typeof currentAnimal.lifecycleStage => {
            if (dataToUpdate.lifecycleStage) return dataToUpdate.lifecycleStage;

            if (nextSex === 'Hembra') {
                if (isProvenMother) return 'Cabra';
                if (currentLifecycleStage === 'Cabra') return 'Cabra';
                if (currentLifecycleStage === 'Cabritona') return 'Cabritona';
                if (hasWeaningData) return 'Cabritona';
                return 'Cabrita';
            } else {
                if (currentLifecycleStage === 'Reproductor') return 'Reproductor';
                const ageMonths = calculateAgeInMonths(safeBirthDate);
                if (ageMonths > 12) return 'Reproductor';
                if (hasWeaningData) return 'Macho de Levante';
                return 'Cabrito';
            }
        };

        const newStage = recalculateStage();
        if (newStage !== currentLifecycleStage) {
            dataToUpdate.lifecycleStage = newStage;
        }

        const dataWithSyncFlag = { ...dataToUpdate, _synced: false };
        await localDb.animals.update(upperId, dataWithSyncFlag);

        if (dataToUpdate.location !== undefined && dataToUpdate.location !== currentAnimal.location) internalAddEvent({ animalId: upperId, date: today, type: 'Movimiento', details: `Movido de '${currentAnimal.location || 'Sin Asignar'}' a '${dataToUpdate.location || 'Sin Asignar'}'`, lotName: dataToUpdate.location || '' });
        if (dataToUpdate.reproductiveStatus !== undefined && dataToUpdate.reproductiveStatus !== currentAnimal.reproductiveStatus) internalAddEvent({ animalId: upperId, date: evDate, type: 'Cambio de Estado', details: `Estado reproductivo: ${dataToUpdate.reproductiveStatus}` });
        if (dataToUpdate.status !== undefined && dataToUpdate.status !== currentAnimal.status) internalAddEvent({ animalId: upperId, date: dataToUpdate.endDate || today, type: 'Cambio de Estado', details: `Animal dado de baja: ${dataToUpdate.status} ${dataToUpdate.cullReason ? `(${dataToUpdate.cullReason})` : ''}` });
        
        fetchDataFromLocalDb();
        const updatedAnimal = await localDb.animals.get(upperId);
        if (updatedAnimal) enqueueSync(() => syncToFirestore("animals", upperId, updatedAnimal));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    // Actualización MASIVA y eficiente de animales (p. ej. saneamiento de categorías).
    // A diferencia de llamar updateAnimal N veces, hace UNA sola transacción local,
    // UN solo refresco y encola la sincronización en lote. Evita la "tormenta" de
    // recargas/escrituras que satura la app con rebaños grandes.
    const bulkUpdateAnimals = useCallback(async (updates: { id: string; changes: Partial<Animal> }[]) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        if (!updates || updates.length === 0) return;
        const localDb = getDB();
        const updatedIds: string[] = [];

        await localDb.transaction('rw', localDb.animals, async () => {
            for (const u of updates) {
                const upperId = u.id.toUpperCase();
                const existing = await localDb.animals.get(upperId);
                if (!existing) continue; // nunca se borra ni se crea, solo se actualiza lo existente
                await localDb.animals.update(upperId, { ...u.changes, _synced: false });
                updatedIds.push(upperId);
            }
        });

        // UN solo refresco de la UI tras aplicar todo
        await fetchDataFromLocalDb();

        // Sincronización en lote (la cola + el barrido garantizan la subida durable)
        const updatedAnimals = await localDb.animals.bulkGet(updatedIds);
        for (const animal of updatedAnimals) {
            if (animal) enqueueSync(() => syncToFirestore("animals", animal.id, animal));
        }
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const deleteAnimalPermanently = useCallback(async (animalId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const upperId = animalId.toUpperCase();
        await localDb.animals.delete(upperId);
        fetchDataFromLocalDb();
        await recordDeletions([{ collection: "animals", id: upperId }]);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    // Cambia el ID (clave primaria) de un animal y reescribe TODAS las referencias
    // en las demás colecciones. Operación delicada: solo debe invocarse cuando el
    // usuario ha desactivado la protección de ID en Configuración. Es transaccional
    // en local; la sincronización sube el nuevo registro, las referencias y un
    // tombstone para el ID viejo.
    const changeAnimalId = useCallback(async (oldId: string, newId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const from = oldId.toUpperCase().trim();
        const to = newId.toUpperCase().trim();
        if (!to) throw new Error("El nuevo ID no puede estar vacío.");
        if (from === to) return;

        const existingTarget = await localDb.animals.get(to);
        if (existingTarget) throw new Error(`El ID "${to}" ya está en uso por otro animal.`);
        const source = await localDb.animals.get(from);
        if (!source) throw new Error(`No se encontró el animal "${from}".`);

        // IDs de registros tocados por tabla, para sincronizar después.
        const touched: Record<string, string[]> = {
            animals: [], parturitions: [], weighings: [], bodyWeighings: [],
            events: [], serviceRecords: [], healthEvents: [], sireLots: [],
        };

        await localDb.transaction('rw',
            [localDb.animals, localDb.parturitions, localDb.weighings, localDb.bodyWeighings,
             localDb.events, localDb.serviceRecords, localDb.healthEvents, localDb.sireLots],
            async () => {
                // 1. Crear el nuevo registro del animal con la nueva clave.
                const moved: Animal = { ...source, id: to, _synced: false };
                await localDb.animals.put(moved);

                // 2. Reescribir referencias en otros animales (madre/padre).
                const asParent = await localDb.animals
                    .filter(a => a.motherId === from || a.fatherId === from).toArray();
                for (const a of asParent) {
                    const changes: Partial<Animal> = { _synced: false };
                    if (a.motherId === from) changes.motherId = to;
                    if (a.fatherId === from) changes.fatherId = to;
                    await localDb.animals.update(a.id, changes);
                    touched.animals.push(a.id);
                }

                // 3. Reescribir referencias en el resto de colecciones.
                const parts = await localDb.parturitions
                    .filter(p => p.goatId === from || p.sireId === from).toArray();
                for (const p of parts) {
                    const changes: any = { _synced: false };
                    if (p.goatId === from) changes.goatId = to;
                    if (p.sireId === from) changes.sireId = to;
                    await localDb.parturitions.update(p.id, changes);
                    touched.parturitions.push(p.id);
                }

                const weighs = await localDb.weighings.where('goatId').equals(from).toArray();
                for (const w of weighs) { await localDb.weighings.update(w.id, { goatId: to, _synced: false }); touched.weighings.push(w.id); }

                const bweighs = await localDb.bodyWeighings.where('animalId').equals(from).toArray();
                for (const b of bweighs) { await localDb.bodyWeighings.update(b.id, { animalId: to, _synced: false }); touched.bodyWeighings.push(b.id); }

                const evs = await localDb.events.where('animalId').equals(from).toArray();
                for (const e of evs) { await localDb.events.update(e.id, { animalId: to, _synced: false }); touched.events.push(e.id); }

                const srs = await localDb.serviceRecords.where('femaleId').equals(from).toArray();
                for (const s of srs) { await localDb.serviceRecords.update(s.id, { femaleId: to, _synced: false }); touched.serviceRecords.push(s.id); }

                const hevs = await localDb.healthEvents.where('animalId').equals(from).toArray();
                for (const h of hevs) { await localDb.healthEvents.update(h.id, { animalId: to, _synced: false }); touched.healthEvents.push(h.id); }

                const slots = await localDb.sireLots.filter(sl => sl.sireId === from).toArray();
                for (const sl of slots) { await localDb.sireLots.update(sl.id, { sireId: to, _synced: false }); touched.sireLots.push(sl.id); }

                // 4. Borrar el registro viejo del animal.
                await localDb.animals.delete(from);
            }
        );

        await fetchDataFromLocalDb();

        // 5. Sincronizar: nuevo animal + todas las referencias tocadas + tombstone del viejo.
        const movedAnimal = await localDb.animals.get(to);
        if (movedAnimal) enqueueSync(() => syncToFirestore("animals", to, movedAnimal));

        const syncTable = async (tableName: string, table: any, ids: string[]) => {
            if (!ids.length) return;
            const recs = await table.bulkGet(ids);
            for (const r of recs) if (r) enqueueSync(() => syncToFirestore(tableName, r.id, r));
        };
        await syncTable("animals", localDb.animals, touched.animals);
        await syncTable("parturitions", localDb.parturitions, touched.parturitions);
        await syncTable("weighings", localDb.weighings, touched.weighings);
        await syncTable("bodyWeighings", localDb.bodyWeighings, touched.bodyWeighings);
        await syncTable("events", localDb.events, touched.events);
        await syncTable("serviceRecords", localDb.serviceRecords, touched.serviceRecords);
        await syncTable("healthEvents", localDb.healthEvents, touched.healthEvents);
        await syncTable("sireLots", localDb.sireLots, touched.sireLots);

        await recordDeletions([{ collection: "animals", id: from }]);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, recordDeletions]);

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

    const setLactationAsDry = useCallback(async (parturitionId: string, date?: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const parturition = await localDb.parturitions.get(parturitionId);
        if (!parturition) throw new Error("Parto no encontrado");
        const dryDate = date || new Date().toISOString().split('T')[0];
        // El secado se representa por status='seca' + dryingStartDate (fecha real).
        // El evento "Secado" de la línea de tiempo se deriva del parto (useEvents),
        // por eso NO creamos un evento aparte (evita duplicados).
        await localDb.parturitions.update(parturitionId, { status: 'seca' as const, dryingStartDate: dryDate, _synced: false });
        fetchDataFromLocalDb();
        const updatedParturition = await localDb.parturitions.get(parturitionId);
        if (updatedParturition) enqueueSync(() => syncToFirestore("parturitions", parturitionId, updatedParturition));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    // Elimina/revierte un secado: la lactancia vuelve a estar activa. Limpia
    // también eventos legados "Declarada Seca" (Cambio de Estado) si existieran.
    const revertLactationDrying = useCallback(async (parturitionId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const parturition = await localDb.parturitions.get(parturitionId);
        if (!parturition) return;
        const evs = await localDb.events.where('animalId').equals(parturition.goatId)
            .and(e => e.type === 'Cambio de Estado' && typeof e.details === 'string' && (e.details.startsWith('Declarada Seca') || e.details.startsWith('Inició proceso de secado')))
            .toArray();
        const evIds = evs.map(e => e.id);
        await localDb.transaction('rw', localDb.parturitions, localDb.events, async () => {
            await localDb.parturitions.where('id').equals(parturitionId).modify(p => { p.status = 'activa'; delete (p as any).dryingStartDate; p._synced = false; });
            if (evIds.length) await localDb.events.bulkDelete(evIds);
        });
        fetchDataFromLocalDb();
        const updated = await localDb.parturitions.get(parturitionId);
        if (updated) enqueueSync(() => syncToFirestore("parturitions", parturitionId, updated));
        if (evIds.length) await recordDeletions(evIds.map(id => ({ collection: "events", id })));
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, recordDeletions]);

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
            // Solo los animales ACTIVOS (no de baja) cuentan como "asignados". Un
            // animal vendido/muerto conserva su location histórica pero no debe
            // impedir borrar un lote que está vacío en la práctica.
            const animalsInLot = await localDb.animals.where({ location: lot.name }).filter(a => !a.isReference).count();
            if (animalsInLot > 0) throw new Error("No se puede eliminar un lote con animales asignados.");
            const subLots = await localDb.lots.where({ parentLotId: lotId }).count();
            if (subLots > 0) throw new Error("No se puede eliminar un lote que contiene sub-lotes.");
        }
        await localDb.lots.delete(lotId);
        fetchDataFromLocalDb();
        await recordDeletions([{ collection: "lots", id: lotId }]);
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
        await recordDeletions([{ collection: "origins", id: originId }]);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addWeighing = useCallback(async (weighing: Omit<Weighing, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newWeighing: Weighing = { id: uuidv4(), ...weighing, userId: currentUser.uid, _synced: false };
        await localDb.weighings.put(newWeighing);
        internalAddEvent({ animalId: weighing.goatId, date: weighing.date, type: 'Pesaje Lechero', details: `Registro de ${weighing.kg} Kg` });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("weighings", newWeighing.id, newWeighing));
        return newWeighing.id;
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    const addBodyWeighing = useCallback(async (weighing: Omit<BodyWeighing, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newWeighing: BodyWeighing = { id: uuidv4(), ...weighing, userId: currentUser.uid, _synced: false };
        await localDb.bodyWeighings.put(newWeighing);
        internalAddEvent({ animalId: weighing.animalId, date: weighing.date, type: 'Pesaje Corporal', details: `Registro de ${weighing.kg} Kg` });
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("bodyWeighings", newWeighing.id, newWeighing));
        return newWeighing.id;
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent]);

    // Borrado de UN pesaje (para "Deshacer"). Elimina el registro y su evento asociado.
    const deleteWeighing = useCallback(async (id: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const w = await localDb.weighings.get(id);
        if (!w) return;
        const evs = await localDb.events
            .where('date').equals(w.date)
            .and(e => e.type === 'Pesaje Lechero' && e.animalId === w.goatId && e.details === `Registro de ${w.kg} Kg`)
            .toArray();
        const evIds = evs.map(e => e.id);
        await localDb.transaction('rw', localDb.weighings, localDb.events, async () => {
            await localDb.weighings.delete(id);
            if (evIds.length) await localDb.events.bulkDelete(evIds);
        });
        await fetchDataFromLocalDb();
        await recordDeletions([{ collection: "weighings", id }, ...evIds.map(eid => ({ collection: "events", id: eid }))]);
    }, [currentUser, recordDeletions, fetchDataFromLocalDb]);

    const deleteBodyWeighing = useCallback(async (id: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const w = await localDb.bodyWeighings.get(id);
        if (!w) return;
        const evs = await localDb.events
            .where('date').equals(w.date)
            .and(e => e.type === 'Pesaje Corporal' && e.animalId === w.animalId && e.details === `Registro de ${w.kg} Kg`)
            .toArray();
        const evIds = evs.map(e => e.id);
        await localDb.transaction('rw', localDb.bodyWeighings, localDb.events, async () => {
            await localDb.bodyWeighings.delete(id);
            if (evIds.length) await localDb.events.bulkDelete(evIds);
        });
        await fetchDataFromLocalDb();
        await recordDeletions([{ collection: "bodyWeighings", id }, ...evIds.map(eid => ({ collection: "events", id: eid }))]);
    }, [currentUser, recordDeletions, fetchDataFromLocalDb]);

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
        await recordDeletions([
            ...idsToDelete.map(id => ({ collection: "weighings", id })),
            ...eventIdsToDelete.map(id => ({ collection: "events", id })),
        ]);
    }, [currentUser, recordDeletions, fetchDataFromLocalDb]);

    const deleteBodyWeighingSession = useCallback(async (date: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const weighingsToDelete = await localDb.bodyWeighings.where({ date }).toArray();
        if (weighingsToDelete.length === 0) return;
        const idsToDelete = weighingsToDelete.map(w => w.id);
        const animalIds = weighingsToDelete.map(w => w.animalId);
        const eventsToDelete = await localDb.events
            .where('date').equals(date)
            .and(e => e.type === 'Pesaje Corporal' && animalIds.includes(e.animalId))
            .toArray();
        const eventIdsToDelete = eventsToDelete.map(e => e.id);
        await localDb.transaction('rw', localDb.bodyWeighings, localDb.events, async () => {
            await localDb.bodyWeighings.bulkDelete(idsToDelete);
            await localDb.events.bulkDelete(eventIdsToDelete);
        });
        await fetchDataFromLocalDb();
        await recordDeletions([
            ...idsToDelete.map(id => ({ collection: "bodyWeighings", id })),
            ...eventIdsToDelete.map(id => ({ collection: "events", id })),
        ]);
    }, [currentUser, recordDeletions, fetchDataFromLocalDb]);

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
        // El modal envía la madre como `goatId`; aceptamos también `motherId` por compatibilidad.
        const rawMotherId = data.goatId ?? data.motherId;
        if (!rawMotherId) throw new Error("Falta el ID de la madre para registrar el parto.");
        const upperCaseMotherId = String(rawMotherId).toUpperCase();
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
            _synced: false, 
            dryingStartDate: data.inducedLactation && data.parturitionOutcome === 'Aborto' ? data.parturitionDate : undefined,
            liveOffspring: data.liveOffspring ? data.liveOffspring.map((kid: any) => ({ id: kid.id?.toUpperCase(), sex: kid.sex, birthWeight: kid.birthWeight })) : undefined,
            provisional: data.provisional || undefined,
        };
        
        const newKidsData: Animal[] = (data.liveOffspring || []).map((kid: any) => ({ 
            id: kid.id.toUpperCase(), 
            sex: kid.sex, 
            status: 'Activo', 
            birthDate: data.parturitionDate, 
            motherId: upperCaseMotherId, 
            fatherId: data.sireId, 
            birthWeight: parseFloat(kid.birthWeight) || undefined, 
            userId: currentUser.uid, 
            createdAt: Date.now(), 
            lifecycleStage: kid.sex === 'Hembra' ? 'Cabrita' : 'Cabrito', 
            location: '', 
            reproductiveStatus: 'No Aplica', 
            isReference: false, 
            _synced: false, 
        }));
        
        await localDb.transaction('rw', localDb.parturitions, localDb.animals, localDb.events, async () => {
            await localDb.parturitions.put(parturitionData);

            const mother = await localDb.animals.get(upperCaseMotherId);
            if (mother) {
                // Al declarar un parto, la madre deja de estar "en monta": se
                // desvincula del lote (sireLotId) y pasa a Post-Parto. Un parto
                // provisional (solo fecha) también libera el vínculo.
                const motherChanges: Partial<Animal> = { _synced: false };
                if (mother.lifecycleStage !== 'Cabra') motherChanges.lifecycleStage = 'Cabra';
                if (mother.sireLotId) motherChanges.sireLotId = null;
                if (mother.reproductiveStatus !== 'Post-Parto') motherChanges.reproductiveStatus = 'Post-Parto';
                await localDb.animals.update(upperCaseMotherId, motherChanges);
            }

            // Un parto provisional (solo fecha, para crear la lactancia) NO genera
            // evento de "Parto" — se registra cuando el usuario complete el parto.
            if (!data.provisional) {
                let eventType: EventType;
                let eventDetails = `Parto ${data.parturitionType} (${data.offspringCount} crías) con Semental: ${data.sireId}. Vivas: ${newKidsData.length}.`;

                if (data.parturitionOutcome === 'Aborto') {
                    eventType = 'Aborto';
                    eventDetails = `Aborto registrado con Semental: ${data.sireId}. ${data.inducedLactation ? 'Se induce lactancia.' : ''}`;
                } else if (data.parturitionOutcome === 'Con Mortinatos') {
                    const stillCount = data.offspringCount - newKidsData.length;
                    if (newKidsData.length === 0) {
                        eventType = 'Aborto';
                        eventDetails = `Mortinato completo (${stillCount} crías). Padre: ${data.sireId}.`;
                    } else {
                        eventType = 'Parto';
                        eventDetails = `Padre: ${data.sireId}. Crías: ${newKidsData.length} vivas, ${stillCount} mortinatos.`;
                    }
                } else {
                    eventType = 'Parto';
                }
                internalAddEvent({ animalId: upperCaseMotherId, date: data.parturitionDate, type: eventType, details: eventDetails });
            }

            if (newKidsData.length > 0) {
                await localDb.animals.bulkPut(newKidsData);
                newKidsData.forEach(kid => {
                     internalAddEvent({ animalId: kid.id, date: kid.birthDate, type: 'Nacimiento', details: `Nacido con ${kid.birthWeight || 'N/A'} Kg. Madre: ${kid.motherId}. Padre: ${kid.fatherId}.` });
                });
            }
        });
        
        await fetchDataFromLocalDb();
        
        const sync = async () => {
            const batch = writeBatch(firestoreDb);
            batch.set(doc(firestoreDb, "parturitions", newParturitionId), cleanForBatch(parturitionData));
            newKidsData.forEach((kid: Animal) => batch.set(doc(firestoreDb, "animals", kid.id), cleanForBatch(kid)));

            const updatedMother = await localDb.animals.get(upperCaseMotherId);
            const motherNeedsSync = !!(updatedMother && updatedMother._synced === false);
            if (updatedMother && motherNeedsSync) {
                 batch.set(doc(firestoreDb, "animals", updatedMother.id), cleanForBatch(updatedMother));
            }

            try {
                await batch.commit();
                // Marca local inmediata: no depender solo del eco del snapshot
                // (en móvil el eco puede perderse al ir a segundo plano y el
                // registro quedaría atascado en '_synced:false').
                await localDb.parturitions.update(newParturitionId, { _synced: true });
                if (newKidsData.length) await localDb.animals.bulkUpdate(newKidsData.map((k: Animal) => ({ key: k.id, changes: { _synced: true } })));
                if (updatedMother && motherNeedsSync) await localDb.animals.update(updatedMother.id, { _synced: true });
                await fetchDataFromLocalDb();
            } catch (err: any) {
                const msg = err?.code ? `${err.code}` : (err?.message || 'batch error');
                recordSyncOutcome('parturitions', newParturitionId, false, msg);
                throw err;
            }
        };
        enqueueSync(sync);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent, cleanForBatch, recordSyncOutcome]);

    // Elimina un parto (usado para reemplazar un parto provisional al completar
    // los datos reales). Borra el registro y su evento Parto/Aborto asociado.
    // NOTA: no elimina crías (un provisional no tiene crías); para partos reales
    // con crías, esas quedan intactas.
    const deleteParturition = useCallback(async (id: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const part = await localDb.parturitions.get(id);
        if (!part) return;
        const evs = await localDb.events.where('date').equals(part.parturitionDate)
            .and(e => (e.type === 'Parto' || e.type === 'Aborto') && e.animalId === part.goatId).toArray();
        const evIds = evs.map(e => e.id);
        await localDb.transaction('rw', localDb.parturitions, localDb.events, async () => {
            await localDb.parturitions.delete(id);
            if (evIds.length) await localDb.events.bulkDelete(evIds);
        });
        await fetchDataFromLocalDb();
        await recordDeletions([{ collection: "parturitions", id }, ...evIds.map(eid => ({ collection: "events", id: eid }))]);
    }, [currentUser, fetchDataFromLocalDb, recordDeletions]);

    // --- FUNCIÓN addServiceRecord ACTUALIZADA Y MEJORADA ---
    const addServiceRecord = useCallback(async (recordData: Omit<ServiceRecord, 'id' | 'userId' | '_synced'>) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        
        // 1. Crear el registro del servicio
        const newRecord: ServiceRecord = { id: uuidv4(), ...recordData, userId: currentUser.uid, _synced: false };
        
        // 2. Obtener información del Semental para el detalle
        const lot = await localDb.sireLots.get(newRecord.sireLotId);
        const sire = lot ? (await localDb.fathers.get(lot.sireId) || await localDb.animals.get(lot.sireId)) : null;
        const sireName = sire?.name || sire?.id || lot?.sireId || 'Desconocido';

        // 3. Calcular Fecha Estimada de Parto (gestación configurable; default 150 días caprino)
        const gestationDays = appConfig?.diasGestacion ?? 150;
        const serviceDateObj = new Date(newRecord.serviceDate);
        const estimatedParturitionDate = new Date(serviceDateObj);
        estimatedParturitionDate.setDate(serviceDateObj.getDate() + gestationDays);
        const estimatedDateStr = estimatedParturitionDate.toISOString().split('T')[0];

        // 4. Verificar servicios previos (Para el contador x2, x3 en el ciclo actual)
        // Buscamos servicios posteriores al último parto registrado
        const lastParturitions = await localDb.parturitions
            .where('goatId').equals(newRecord.femaleId)
            .toArray();
        
        // Ordenamos en memoria para obtener el último
        lastParturitions.sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime());
        const cutoffDate = lastParturitions.length > 0 ? lastParturitions[0].parturitionDate : '2000-01-01';

        const allServices = await localDb.serviceRecords.where('femaleId').equals(newRecord.femaleId).toArray();
        const currentCycleServices = allServices.filter(r => r.serviceDate > cutoffDate);
        
        const serviceNumber = currentCycleServices.length + 1; // 1er servicio, 2do, etc.

        await localDb.transaction('rw', localDb.serviceRecords, localDb.animals, localDb.events, async () => {
            // A. Guardar Servicio
            await localDb.serviceRecords.put(newRecord);
            
            // B. Actualizar Animal (Estado a "Servida")
            await localDb.animals.update(newRecord.femaleId, {
                reproductiveStatus: 'Servida',
                _synced: false
            });

            // C. Registrar Evento Histórico Detallado
            internalAddEvent({ 
                animalId: newRecord.femaleId, 
                date: newRecord.serviceDate, 
                type: 'Servicio',
                details: `Servicio #${serviceNumber} (Visto) con ${sireName}. Parto est.: ${estimatedDateStr}`,
                lotName: `Servicio #${serviceNumber}` 
            });
        });
        
        fetchDataFromLocalDb();
        
        // Sincronizar Registro y Actualización del Animal
        enqueueSync(() => syncToFirestore("serviceRecords", newRecord.id, newRecord));
        const updatedAnimal = await localDb.animals.get(newRecord.femaleId);
        if (updatedAnimal) enqueueSync(() => syncToFirestore("animals", newRecord.femaleId, updatedAnimal));

    }, [currentUser, enqueueSync, fetchDataFromLocalDb, internalAddEvent, appConfig?.diasGestacion]);

    // Elimina un servicio (para corregir errores desde Actividades Recientes).
    // Borra el registro + su evento, y revierte el estado reproductivo a "Vacía"
    // si era el único servicio del ciclo y la hembra seguía como "Servida".
    const deleteServiceRecord = useCallback(async (id: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const rec = await localDb.serviceRecords.get(id);
        if (!rec) return;

        // Evento 'Servicio' asociado (mismo animal y fecha).
        const evs = await localDb.events
            .where('date').equals(rec.serviceDate)
            .and(e => e.type === 'Servicio' && e.animalId === rec.femaleId)
            .toArray();
        const evIds = evs.map(e => e.id);

        // ¿Quedan otros servicios en el ciclo actual (tras el último parto)?
        const parts = await localDb.parturitions.where('goatId').equals(rec.femaleId).toArray();
        parts.sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime());
        const cutoff = parts.length > 0 ? parts[0].parturitionDate : '2000-01-01';
        const remaining = (await localDb.serviceRecords.where('femaleId').equals(rec.femaleId).toArray())
            .filter(s => s.id !== id && s.serviceDate > cutoff);

        const female = await localDb.animals.get(rec.femaleId);
        const revertStatus = remaining.length === 0 && female?.reproductiveStatus === 'Servida';

        await localDb.transaction('rw', localDb.serviceRecords, localDb.events, localDb.animals, async () => {
            await localDb.serviceRecords.delete(id);
            if (evIds.length) await localDb.events.bulkDelete(evIds);
            if (revertStatus) await localDb.animals.update(rec.femaleId, { reproductiveStatus: 'Vacía', _synced: false });
        });

        await fetchDataFromLocalDb();
        if (revertStatus) {
            const updated = await localDb.animals.get(rec.femaleId);
            if (updated) enqueueSync(() => syncToFirestore("animals", rec.femaleId, updated));
        }
        await recordDeletions([{ collection: "serviceRecords", id }, ...evIds.map(eid => ({ collection: "events", id: eid }))]);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, recordDeletions]);

    const addBatchEvent = useCallback(async (data: { lotName: string; date: string; type: EventType; details: string; }) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const animalsInLot = await localDb.animals.where({ location: data.lotName }).toArray();
        if (animalsInLot.length === 0) return;
        const newEvents: Event[] = animalsInLot.map(animal => ({ id: uuidv4(), animalId: animal.id, date: data.date, type: data.type, details: data.details, lotName: data.lotName, userId: currentUser.uid, notes: `Evento aplicado a todo el lote: ${data.lotName}`, _synced: false }));
        await localDb.events.bulkPut(newEvents);
        fetchDataFromLocalDb();
        
        const sync = async () => {
            const batch = writeBatch(firestoreDb);
            newEvents.forEach(event => batch.set(doc(firestoreDb, "events", event.id), cleanForBatch(event)));
            await batch.commit();
            await localDb.events.bulkUpdate(newEvents.map(e => ({ key: e.id, changes: { _synced: true } })));
            await fetchDataFromLocalDb();
        };
        enqueueSync(sync);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, cleanForBatch]);

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

    // Cierra/finaliza una temporada LIBERANDO a sus hembras. A diferencia de un
    // updateBreedingSeason genérico, aquí retiramos los lotes activos y, por cada
    // hembra miembro, aplicamos la lógica reproductiva: las servidas dentro de la
    // ventana de gestación quedan "gestando" (Servida), las que ya parieron o
    // vencieron los ~150 días quedan Vacías, y todas se desvinculan del lote.
    const closeBreedingSeason = useCallback(async (seasonId: string, closedDate: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const dias = appConfig?.diasGestacion ?? 150;
        const nowMs = Date.now();

        const lots = await localDb.sireLots.where({ seasonId }).toArray();
        const lotIds = lots.map(l => l.id);
        const members = lotIds.length ? await localDb.animals.where('sireLotId').anyOf(lotIds).toArray() : [];
        const memberIds = members.map(m => m.id);

        const services = memberIds.length ? await localDb.serviceRecords.where('femaleId').anyOf(memberIds).toArray() : [];
        const parts = memberIds.length ? await localDb.parturitions.where('goatId').anyOf(memberIds).toArray() : [];
        const svcByFemale = new Map<string, ServiceRecord[]>();
        services.forEach(sr => { const arr = svcByFemale.get(sr.femaleId) || []; arr.push(sr); svcByFemale.set(sr.femaleId, arr); });
        const partByGoat = new Map<string, Parturition[]>();
        parts.forEach(p => { const arr = partByGoat.get(p.goatId) || []; arr.push(p); partByGoat.set(p.goatId, arr); });

        await localDb.transaction('rw', localDb.breedingSeasons, localDb.sireLots, localDb.animals, async () => {
            await localDb.breedingSeasons.update(seasonId, { status: 'Cerrado', closedDate, _synced: false });
            for (const l of lots) {
                if (!l.retiredDate) await localDb.sireLots.update(l.id, { retiredDate: closedDate, _synced: false });
            }
            for (const m of members) {
                const target = computeReleasedReproState({
                    animal: m, services: svcByFemale.get(m.id) || [], parturitions: partByGoat.get(m.id) || [],
                    diasGestacion: dias, nowMs,
                });
                await localDb.animals.update(m.id, { sireLotId: null, reproductiveStatus: target.reproductiveStatus, _synced: false });
            }
        });

        fetchDataFromLocalDb();

        const updatedSeason = await localDb.breedingSeasons.get(seasonId);
        if (updatedSeason) enqueueSync(() => syncToFirestore("breedingSeasons", seasonId, updatedSeason));
        for (const l of lots) {
            const sl = await localDb.sireLots.get(l.id);
            if (sl) enqueueSync(() => syncToFirestore("sireLots", l.id, sl));
        }
        for (const m of members) {
            const ua = await localDb.animals.get(m.id);
            if (ua) enqueueSync(() => syncToFirestore("animals", m.id, ua));
        }
    }, [currentUser, appConfig, enqueueSync, fetchDataFromLocalDb]);

    // Normalización idempotente del estado reproductivo (auto-reparación). Corre
    // una vez tras cargar los datos y arregla:
    //  1) Hembras aún vinculadas a lotes de temporadas CERRADAS (o lotes huérfanos)
    //     => se desvinculan y se recalcula su estado (gestando / Vacía).
    //  2) Hembras 'Servida' ya desvinculadas cuya presunta preñez venció (>=150 d
    //     sin parto) => vuelven a 'Vacía'.
    // Solo escribe cuando hay un cambio real; nunca borra servicios ni partos.
    const normalizeReproductiveState = useCallback(async (opts?: { aggressive?: boolean; diagnostic?: boolean }): Promise<{ released: number; report: string[] }> => {
        const aggressive = !!opts?.aggressive;
        const wantReport = !!opts?.diagnostic;
        // El guard evita que la AUTO-reparación se solape consigo misma. El botón
        // manual (aggressive) siempre procede, para no dar un falso "0" si la
        // auto-reparación estuviera en curso.
        if (!currentUser) return { released: 0, report: [] };
        if (isNormalizingReproRef.current && !aggressive) return { released: 0, report: [] };
        isNormalizingReproRef.current = true;
        try {
            const localDb = getDB();
            const [allAnimals, allLots, allSeasons, allServices, allParts] = await Promise.all([
                localDb.animals.toArray(), localDb.sireLots.toArray(), localDb.breedingSeasons.toArray(),
                localDb.serviceRecords.toArray(), localDb.parturitions.toArray(),
            ]);
            const lotById = new Map(allLots.map(l => [l.id, l]));
            const seasonById = new Map(allSeasons.map(s => [s.id, s]));
            const svcByFemale = new Map<string, ServiceRecord[]>();
            allServices.forEach(sr => { const arr = svcByFemale.get(sr.femaleId) || []; arr.push(sr); svcByFemale.set(sr.femaleId, arr); });
            const partByGoat = new Map<string, Parturition[]>();
            allParts.forEach(p => { const arr = partByGoat.get(p.goatId) || []; arr.push(p); partByGoat.set(p.goatId, arr); });
            const dias = appConfig?.diasGestacion ?? 150;
            const nowMs = Date.now();

            const updates: { id: string; reproductiveStatus: Animal['reproductiveStatus']; clearSire: boolean }[] = [];
            const report: string[] = [];
            let withLink = 0;

            for (const a of allAnimals) {
                if (a.isReference) continue;
                if (a.sireLotId) {
                    withLink++;
                    const lot = lotById.get(a.sireLotId);
                    const season = lot ? seasonById.get(lot.seasonId) : undefined;
                    const over = season ? isSeasonOver(season, nowMs) : false;
                    // Seguro (auto): solo si la temporada existe y terminó.
                    // Agresivo (botón manual, datos completos): también lotes huérfanos
                    // o temporadas inexistentes (contexto de monta roto/inexistente);
                    // solo se respeta a las hembras de una temporada ACTIVA vigente.
                    const shouldRelease = aggressive ? (!lot || !season || over) : (!!season && over);
                    if (shouldRelease) {
                        const target = computeReleasedReproState({
                            animal: a, services: svcByFemale.get(a.id) || [], parturitions: partByGoat.get(a.id) || [],
                            diasGestacion: dias, nowMs,
                        });
                        updates.push({ id: a.id, reproductiveStatus: target.reproductiveStatus, clearSire: true });
                    }
                    if (wantReport && report.length < 25) {
                        report.push(`${a.id}: lote ${lot ? '✓' : '✗ORFANO'} · temp ${season ? season.name.slice(0, 12) + '/' + season.status : '✗NINGUNA'} · fin ${season?.endDate || '-'} · terminada:${over ? 'SÍ' : 'NO'} → ${shouldRelease ? 'LIBERA' : 'mantiene'}`);
                    }
                } else if (a.reproductiveStatus === 'Servida') {
                    if (isPresumedPregnancyExpired(svcByFemale.get(a.id) || [], partByGoat.get(a.id) || [], dias, nowMs)) {
                        updates.push({ id: a.id, reproductiveStatus: 'Vacía', clearSire: false });
                    }
                }
            }

            if (wantReport) report.unshift(`Hembras con vínculo de monta: ${withLink}. A liberar: ${updates.filter(u => u.clearSire).length}.`);

            if (!updates.length) return { released: 0, report };

            for (const u of updates) {
                const changes: any = { reproductiveStatus: u.reproductiveStatus, _synced: false };
                if (u.clearSire) changes.sireLotId = null;
                await localDb.animals.update(u.id, changes);
            }
            await fetchDataFromLocalDb();

            for (const u of updates) {
                const ua = await localDb.animals.get(u.id);
                if (!ua) continue;
                enqueueSync(() => syncToFirestore("animals", u.id, ua));
            }
            return { released: updates.filter(u => u.clearSire).length, report };
        } finally {
            isNormalizingReproRef.current = false;
        }
    }, [currentUser, appConfig, enqueueSync, fetchDataFromLocalDb]);

    // Auto-reparación: corre cuando los datos ya están cargados. Depende de los
    // TAMAÑOS de las tablas para volver a intentarlo a medida que llegan de la
    // nube (clave en sesiones nuevas / navegación privada, donde la base local
    // arranca vacía). Es idempotente y segura, así que reintentar no hace daño.
    useEffect(() => {
        if (isLoading || !currentUser || animals.length === 0) return;
        normalizeReproductiveState().catch(e => console.error('normalizeReproductiveState:', e));
    }, [isLoading, currentUser, animals.length, sireLots.length, breedingSeasons.length, normalizeReproductiveState]);

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
                            sireLotId: null,
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

        await recordDeletions([
            { collection: "breedingSeasons", id: seasonId },
            ...lotIdsToDelete.map(lotId => ({ collection: "sireLots", id: lotId })),
        ]);

        if (animalIdsToUpdate.length > 0) {
            const updatedAnimals = await localDb.animals.bulkGet(animalIdsToUpdate);
            for (const animal of updatedAnimals) {
                if (animal) {
                    enqueueSync(() => syncToFirestore("animals", animal.id, animal));
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
        await recordDeletions([{ collection: "sireLots", id: lotId }]);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    // Retira un macho de la temporada CONSERVANDO el histórico: marca el lote
    // como retirado (no lo borra) y libera solo a las hembras NO servidas por él.
    // Las hembras ya servidas mantienen su vínculo para conservar la atribución.
    const retireSire = useCallback(async (lotId: string, date?: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const lot = await localDb.sireLots.get(lotId);
        if (!lot) return;
        const retiredDate = date || new Date().toISOString().split('T')[0];

        const assigned = await localDb.animals.where('sireLotId').equals(lotId).toArray();
        const served = new Set((await localDb.serviceRecords.where('sireLotId').equals(lotId).toArray()).map(sr => sr.femaleId));
        const toFree = assigned.filter(a => !served.has(a.id));

        await localDb.sireLots.update(lotId, { retiredDate, _synced: false });
        for (const a of toFree) {
            await localDb.animals.update(a.id, { sireLotId: null, reproductiveStatus: 'Vacía', _synced: false });
        }
        fetchDataFromLocalDb();

        const savedLot = await localDb.sireLots.get(lotId);
        if (savedLot) enqueueSync(() => syncToFirestore("sireLots", lotId, savedLot));
        for (const a of toFree) {
            const ua = await localDb.animals.get(a.id);
            if (ua) enqueueSync(() => syncToFirestore("animals", a.id, ua));
        }
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    // Intercambia el macho de un lote por otro CONSERVANDO el histórico:
    // retira el lote saliente (apuntando a su reemplazo), crea un lote nuevo para
    // el macho entrante y traslada a él solo las hembras NO servidas. Las hembras
    // ya servidas quedan atribuidas al macho saliente (marca visual en su perfil).
    const swapSire = useCallback(async (lotId: string, newSireId: string, date?: string): Promise<string> => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const oldLot = await localDb.sireLots.get(lotId);
        if (!oldLot) throw new Error("Lote no encontrado");
        const swapDate = date || new Date().toISOString().split('T')[0];

        const seasonLots = await localDb.sireLots.where('seasonId').equals(oldLot.seasonId).toArray();
        if (seasonLots.some(l => l.sireId === newSireId && !l.retiredDate)) {
            throw new Error("Ese macho ya está activo en esta temporada.");
        }

        const newLot: SireLot = {
            id: uuidv4(), seasonId: oldLot.seasonId, sireId: newSireId,
            startDate: swapDate, userId: currentUser.uid, _synced: false,
        };
        await localDb.sireLots.put(newLot);
        await localDb.sireLots.update(lotId, { retiredDate: swapDate, replacedBySireId: newSireId, _synced: false });

        const assigned = await localDb.animals.where('sireLotId').equals(lotId).toArray();
        const served = new Set((await localDb.serviceRecords.where('sireLotId').equals(lotId).toArray()).map(sr => sr.femaleId));
        const toMove = assigned.filter(a => !served.has(a.id));
        for (const a of toMove) {
            await localDb.animals.update(a.id, { sireLotId: newLot.id, _synced: false });
        }
        fetchDataFromLocalDb();

        const savedNew = await localDb.sireLots.get(newLot.id);
        if (savedNew) enqueueSync(() => syncToFirestore("sireLots", newLot.id, savedNew));
        const savedOld = await localDb.sireLots.get(lotId);
        if (savedOld) enqueueSync(() => syncToFirestore("sireLots", lotId, savedOld));
        for (const a of toMove) {
            const ua = await localDb.animals.get(a.id);
            if (ua) enqueueSync(() => syncToFirestore("animals", a.id, ua));
        }
        return newLot.id;
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

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
        await recordDeletions([{ collection: "products", id: productId }]);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const addHealthPlanWithActivities = useCallback(async (planData: Omit<HealthPlan, 'id' | 'userId' | '_synced'>, activities: Omit<PlanActivity, 'id' | 'healthPlanId' | 'userId' | '_synced'>[]) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const newPlan: HealthPlan = { id: uuidv4(), ...planData, userId: currentUser.uid, _synced: false };
        const newActivities: PlanActivity[] = activities.map(act => ({ id: uuidv4(), ...act, healthPlanId: newPlan.id, userId: currentUser.uid, _synced: false }));
        await localDb.transaction('rw', localDb.healthPlans, localDb.planActivities, async () => { await localDb.healthPlans.put(newPlan); await localDb.planActivities.bulkPut(newActivities); });
        fetchDataFromLocalDb();
        
        const sync = async () => {
            const batch = writeBatch(firestoreDb);
            batch.set(doc(firestoreDb, "healthPlans", newPlan.id), cleanForBatch(newPlan));
            newActivities.forEach(act => batch.set(doc(firestoreDb, "planActivities", act.id), cleanForBatch(act)));
            await batch.commit();
            await localDb.healthPlans.update(newPlan.id, { _synced: true });
            if (newActivities.length) await localDb.planActivities.bulkUpdate(newActivities.map(a => ({ key: a.id, changes: { _synced: true } })));
            await fetchDataFromLocalDb();
        };
        enqueueSync(sync);
    }, [currentUser, enqueueSync, fetchDataFromLocalDb, cleanForBatch]);

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
        await recordDeletions([
            ...activityIdsToDelete.map(id => ({ collection: "planActivities", id })),
            { collection: "healthPlans", id: planId },
        ]);
    }, [currentUser, recordDeletions, fetchDataFromLocalDb]);

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
        await recordDeletions([{ collection: "planActivities", id: activityId }]);
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

    // Registrar revisión Famacha. NÚCLEO ANTI-PÉRDIDA: el id es DETERMINISTA
    // (`animalId_fecha`), así que put() actúa como upsert: re-revisar el mismo
    // animal el mismo día (incluso desde otro teléfono) actualiza la misma
    // revisión en vez de duplicarla. La acción sugerida la calcula el llamador
    // (función pura sobre las revisiones en memoria) y se guarda como registro.
    const addFamachaRev = useCallback(async (revData: Omit<FamachaRev, 'id' | 'userId' | '_synced'>): Promise<{ revId: string }> => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        const revId = `${revData.animalId}_${revData.fecha}`;
        const newRev: FamachaRev = {
            ...revData,
            id: revId,
            producto: revData.dosis ? (revData.producto || '') : '',
            userId: currentUser.uid,
            createdAt: Date.now(),
            _synced: false,
        };
        await localDb.famachaRevs.put(newRev);
        fetchDataFromLocalDb();
        enqueueSync(() => syncToFirestore("famachaRevs", revId, newRev));
        return { revId };
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

    const deleteFamachaRev = useCallback(async (revId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        const localDb = getDB();
        await localDb.famachaRevs.delete(revId);
        await fetchDataFromLocalDb();
        await recordDeletions([{ collection: "famachaRevs", id: revId }]);
    }, [currentUser, recordDeletions, fetchDataFromLocalDb]);

    const deleteEvent = useCallback(async (eventId: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");

        const localDb = getDB();
        let event: Event | undefined;
        let assocParturition: Parturition | undefined;
        
        let eventIdToDelete: string | undefined;
        let parturitionIdToDelete: string | undefined;

        event = await localDb.events.get(eventId);

        if (event) {
            eventIdToDelete = event.id;
            if (event.type === 'Parto' || event.type === 'Aborto') {
                assocParturition = await localDb.parturitions
                    .where({ goatId: event.animalId, parturitionDate: event.date })
                    .first();
                if (assocParturition) {
                    parturitionIdToDelete = assocParturition.id;
                }
            }
        } else {
            assocParturition = await localDb.parturitions.get(eventId);

            if (assocParturition) {
                parturitionIdToDelete = assocParturition.id;
                const realEvent = await localDb.events
                    .where({ animalId: assocParturition.goatId, date: assocParturition.parturitionDate })
                    .filter(e => e.type === 'Parto' || e.type === 'Aborto')
                    .first();
                if (realEvent) {
                    eventIdToDelete = realEvent.id;
                }
            } else {
                if (eventId === 'manual-registration-event') {
                    throw new Error("El evento de 'Registro' no se puede eliminar.");
                }
                const isWean = eventId.endsWith('_wean');
                const isDecom = eventId.endsWith('_decom');
                const isService = await localDb.serviceRecords.get(eventId);
                const isBodyWeighing = await localDb.bodyWeighings.get(eventId);
                
                if (isWean || isDecom || isService || isBodyWeighing) {
                     console.warn(`Intento de eliminar evento sintetizado: ${eventId}`);
                     throw new Error("Este evento no se puede eliminar. Es un evento 'sintetizado'. Para revertirlo, edite la ficha del animal.");
                }
                console.warn(`Evento ${eventId} no encontrado para eliminar.`);
                throw new Error(`Evento ${eventId} no encontrado.`);
            }
        }

        try {
            if (!eventIdToDelete && !parturitionIdToDelete) {
                console.warn(`Nada que eliminar para el ID ${eventId}`);
                return;
            }

            await localDb.transaction('rw', localDb.events, localDb.parturitions, async () => {
                if (eventIdToDelete) {
                    await localDb.events.delete(eventIdToDelete);
                }
                if (parturitionIdToDelete) {
                    await localDb.parturitions.delete(parturitionIdToDelete);
                }
            });

            await fetchDataFromLocalDb();

            const deletions: { collection: string; id: string }[] = [];
            if (eventIdToDelete) deletions.push({ collection: "events", id: eventIdToDelete });
            if (parturitionIdToDelete) deletions.push({ collection: "parturitions", id: parturitionIdToDelete });
            await recordDeletions(deletions);

        } catch (error: any) {
            console.error("Error al eliminar el evento y/o sus asociados:", error);
            throw new Error(`Error al eliminar evento: ${error.message}`);
        }
    }, [currentUser, recordDeletions, fetchDataFromLocalDb]);

    const updateEventNotes = useCallback(async (eventId: string, notes: string) => {
        if (!currentUser) throw new Error("Usuario no autenticado");
        
        const localDb = getDB();
        const event = await localDb.events.get(eventId);
        if (!event) {
             if (eventId === 'manual-registration-event') {
                throw new Error("El evento de 'Registro' no se puede editar.");
            }
            throw new Error("Evento no encontrado.");
        }

        const dataToUpdate = {
            notes: notes,
            _synced: false
        };

        try {
            await localDb.events.update(eventId, dataToUpdate);
            await fetchDataFromLocalDb(); 
            
            const updatedEvent = await localDb.events.get(eventId);
            if (updatedEvent) {
                enqueueSync(() => syncToFirestore("events", eventId, updatedEvent));
            }
        } catch (error: any) {
            console.error("Error al actualizar notas del evento:", error);
            throw new Error(`Error al actualizar notas: ${error.message}`);
        }
    }, [currentUser, enqueueSync, fetchDataFromLocalDb]);

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
    
    const contextValue = useMemo(() => ({
        animals, fathers, weighings, parturitions, lots, origins, breedingSeasons, sireLots, serviceRecords, events, feedingPlans, bodyWeighings,
        products, healthPlans, planActivities, healthEvents, famachaRevs,
        appConfig,
        isLoadingConfig,
        isLoading, syncStatus, pendingSyncCount, syncFailures, lastSyncAt, syncNow,
        fetchData: fetchDataFromLocalDb,
        addAnimal, updateAnimal, bulkUpdateAnimals, deleteAnimalPermanently, changeAnimalId, startDryingProcess, setLactationAsDry, revertLactationDrying, addLot,
        updateLot,
        deleteLot, 
        addOrigin, deleteOrigin,
        addBreedingSeason, updateBreedingSeason, closeBreedingSeason, normalizeReproductiveState,
        deleteBreedingSeason,
        addSireLot, updateSireLot, deleteSireLot, retireSire, swapSire, addServiceRecord,
        addFeedingPlan, addBatchEvent, addWeighing, addBodyWeighing, deleteWeighing, deleteBodyWeighing, deleteWeighingSession,
        deleteBodyWeighingSession,
        addParturition, deleteParturition, addFather,
        addProduct, updateProduct, deleteProduct, addHealthPlanWithActivities, updateHealthPlan, deleteHealthPlan,
        addPlanActivity, updatePlanActivity, deletePlanActivity, addHealthEvent,
        addFamachaRev, deleteFamachaRev,

        deleteEvent,
        deleteServiceRecord,
        updateEventNotes,
        addEvent: internalAddEvent,

        updateAppConfig
    }), [
        animals, fathers, weighings, parturitions, lots, origins, breedingSeasons, sireLots, serviceRecords, events, feedingPlans, bodyWeighings,
        products, healthPlans, planActivities, healthEvents, famachaRevs,
        appConfig, isLoadingConfig, isLoading, syncStatus, pendingSyncCount, syncFailures, lastSyncAt, syncNow,
        fetchDataFromLocalDb,
        addAnimal, updateAnimal, bulkUpdateAnimals, deleteAnimalPermanently, changeAnimalId, startDryingProcess, setLactationAsDry, revertLactationDrying, addLot,
        updateLot,
        deleteLot, 
        addOrigin, deleteOrigin,
        addBreedingSeason, updateBreedingSeason, closeBreedingSeason, normalizeReproductiveState,
        deleteBreedingSeason,
        addSireLot, updateSireLot, deleteSireLot, retireSire, swapSire, addServiceRecord,
        addFeedingPlan, addBatchEvent, addWeighing, addBodyWeighing, deleteWeighing, deleteBodyWeighing, deleteWeighingSession,
        deleteBodyWeighingSession,
        addParturition, deleteParturition, addFather,
        addProduct, updateProduct, deleteProduct, addHealthPlanWithActivities, updateHealthPlan, deleteHealthPlan,
        addPlanActivity, updatePlanActivity, deletePlanActivity, addHealthEvent,
        addFamachaRev, deleteFamachaRev,

        deleteEvent,
        deleteServiceRecord,
        updateEventNotes,
        internalAddEvent,

        updateAppConfig,
    ]);

  return (
    <DataContext.Provider value={contextValue}>
        {children}
    </DataContext.Provider>
  );
};