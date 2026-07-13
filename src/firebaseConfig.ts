// src/firebaseConfig.ts

import { initializeApp } from "firebase/app";
// --- LÍNEA CORREGIDA: Se importa initializeFirestore SIN memoryLocalCache ---
import { initializeFirestore } from "firebase/firestore";
import { initializeAuth, browserLocalPersistence } from "firebase/auth";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyCq3MZURc1tNUbpK7BDzKZKQoh8C3twzmA",
  authDomain: "lactokeeper.firebaseapp.com",
  projectId: "lactokeeper",
  storageBucket: "lactokeeper.firebasestorage.app",
  messagingSenderId: "437430613715",
  appId: "1:437430613715:web:b4e56c7a0698c719ae8626",
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

// Cloud Functions (región por defecto us-central1). Se usa para el backend
// seguro del escaneo de cuadernos (la clave de Gemini vive en el servidor).
export const functions = getFunctions(app);