// src/context/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig'; // Importamos la configuración de Firebase

// Definimos la información que nuestro contexto va a proveer
interface IAuthContext {
    currentUser: User | null; // El objeto del usuario de Firebase, o null si no está logueado
    isLoading: boolean;       // Un estado para saber si la autenticación inicial ya cargó
}

// Creamos el contexto con valores por defecto
const AuthContext = createContext<IAuthContext>({
    currentUser: null,
    isLoading: true,
});

// Creamos un "hook" personalizado para usar el contexto fácilmente
export const useAuth = () => useContext(AuthContext);

// Este es el componente "Proveedor" que envolverá nuestra aplicación
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // onAuthStateChanged es el "oyente" mágico de Firebase.
        // Se ejecuta una vez al cargar la app, y cada vez que el usuario inicia o cierra sesión.
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user); // Guarda el usuario si existe, o null si no
            setIsLoading(false);  // Marca que la carga inicial ha terminado
        });

        // Limpiamos el "oyente" cuando el componente se desmonta para evitar fugas de memoria
        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        isLoading,
    };

    // Si aún está cargando la autenticación inicial, mostramos una pantalla de carga genérica
    if (isLoading) {
        return (
            <div className="bg-gray-900 min-h-screen flex items-center justify-center">
                <p className="text-white text-xl">Cargando LactoKeeper...</p>
            </div>
        );
    }

    // Una vez cargado, pasamos la información del usuario a todos los componentes hijos
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};