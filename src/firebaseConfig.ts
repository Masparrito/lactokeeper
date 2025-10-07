import { initializeApp } from "firebase/app";
import { initializeFirestore, memoryLocalCache } from "firebase/firestore"; // <-- Asegúrate que la importación sea esta
import { initializeAuth, browserLocalPersistence } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// La autenticación se mantiene en localStorage, esto es correcto.
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence
});

// --- SOLUCIÓN AL CONFLICTO DE INDEXEDDB ---
// Esta es la línea crucial. Le decimos a Firestore que use solo una caché en memoria
// y que no toque IndexedDB, evitando la "pelea" con Dexie.
export const db = initializeFirestore(app, {
  localCache: memoryLocalCache(),
});