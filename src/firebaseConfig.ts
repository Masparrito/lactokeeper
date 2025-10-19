// src/firebaseConfig.ts

import { initializeApp } from "firebase/app";
// --- LÍNEA CORREGIDA: Se importa initializeFirestore SIN memoryLocalCache ---
import { initializeFirestore } from "firebase/firestore";
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

// La autenticación sigue igual (localStorage)
export const auth = initializeAuth(app, {
  persistence: browserLocalPersistence
});

// --- CAMBIO CLAVE: Se ELIMINA la configuración de memoryLocalCache ---
// Ahora Firestore usará su persistencia offline predeterminada (IndexedDB),
// lo cual es seguro porque ya hemos hecho que Dexie sea el "primero en escribir".
export const db = initializeFirestore(app, {});