// src/context/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../firebaseConfig';

interface IAuthContext {
    currentUser: User | null;
    isLoading: boolean;
}

const AuthContext = createContext<IAuthContext>({
    currentUser: null,
    isLoading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);

            // Pequeño retraso para evitar un parpadeo en la recarga
            setTimeout(() => setIsLoading(false), 200); 
        });

        return unsubscribe;
    }, []);

    // --- CORRECCIÓN: Memoizar el objeto 'value' ---
    // Esto asegura que el objeto 'value' solo se cree de nuevo si
    // 'currentUser' o 'isLoading' cambian, rompiendo el bucle de
    // re-renderizado en cadena con DataContext.
    const value = useMemo(() => ({
        currentUser,
        isLoading,
    }), [currentUser, isLoading]);

    // Ya no mostramos ninguna pantalla de carga aquí.
    // Simplemente pasamos la información a los componentes hijos.
    // App.tsx se encargará de decidir si muestra la pantalla de carga.
    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};