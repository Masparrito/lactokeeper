// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import {
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    AuthError
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { AlertTriangle, Trash2, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { Dexie } from 'dexie';
// --- CAMBIO: Se importa el nuevo ícono que representa el OS ---
import { GiGoat } from 'react-icons/gi'; 

export const LoginPage: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleForceDeleteDB = async () => {
        if (window.confirm("¿Estás seguro de que quieres forzar la eliminación de la base de datos local? Esto no afectará tus datos en la nube.")) {
            try {
                // El nombre de la base de datos ahora es GanaderoOS_DB
                await Dexie.delete('GanaderoOS_DB');
                alert("Base de datos local eliminada con éxito. La página se recargará.");
                window.location.reload();
            } catch (err) {
                alert("Error al eliminar la base de datos.");
                console.error(err);
            }
        }
    };

    const handleAuthError = (err: AuthError) => {
        if (err.code === 'auth/network-request-failed') {
            return 'No hay conexión a internet. Se requiere conexión para iniciar sesión.';
        }
        
        switch (err.code) {
            case 'auth/invalid-email':
                return 'El formato del correo electrónico no es válido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return 'Correo electrónico o contraseña incorrectos.';
            case 'auth/email-already-in-use':
                return 'Este correo electrónico ya está registrado.';
            case 'auth/weak-password':
                return 'La contraseña debe tener al menos 6 caracteres.';
            default:
                console.error("Firebase Auth Error:", err);
                return 'Ocurrió un error inesperado. Por favor, intenta de nuevo.';
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            if (isLoginView) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            setError(handleAuthError(err as AuthError));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="theme-light relative min-h-[100dvh] flex flex-col items-center justify-center p-6 font-sans bg-c-bg overflow-hidden">
            {/* Glows decorativos (profundidad, sensación de campo fresco) */}
            <div className="pointer-events-none absolute -top-28 -right-24 w-80 h-80 rounded-full bg-c-accent/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-28 -left-24 w-80 h-80 rounded-full bg-c-accent-sky/15 blur-3xl" />

            <div className="relative w-full max-w-sm">
                {/* Hero de marca */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-c-accent/12 border border-c-accent/20 mb-4 shadow-sm">
                        <GiGoat className="w-12 h-12 text-c-accent" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tight text-c-text">GanaderoOS</h1>
                    <p className="text-c-text-muted mt-1.5">El sistema operativo para tu finca.</p>
                </div>

                {/* Tarjeta */}
                <div className="bg-c-surface rounded-3xl p-6 border border-c-border shadow-xl shadow-black/5">
                    <div className="flex bg-c-surface-2 rounded-xl p-1 w-full mb-6">
                        <button onClick={() => setIsLoginView(true)} className={`w-1/2 rounded-lg py-2.5 text-sm font-semibold transition-all ${isLoginView ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted hover:text-c-text'}`}>
                            Iniciar Sesión
                        </button>
                        <button onClick={() => setIsLoginView(false)} className={`w-1/2 rounded-lg py-2.5 text-sm font-semibold transition-all ${!isLoginView ? 'bg-c-surface text-c-text shadow-sm' : 'text-c-text-muted hover:text-c-text'}`}>
                            Registrarse
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-c-text-faint pointer-events-none" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Correo electrónico"
                                required
                                className="w-full bg-c-surface-2 text-c-text pl-12 pr-4 py-3.5 rounded-xl border border-c-border focus:border-c-accent focus:ring-2 focus:ring-c-accent/30 focus:outline-none placeholder-c-text-faint transition-colors"
                            />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-c-text-faint pointer-events-none" />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Contraseña"
                                required
                                className="w-full bg-c-surface-2 text-c-text pl-12 pr-4 py-3.5 rounded-xl border border-c-border focus:border-c-accent focus:ring-2 focus:ring-c-accent/30 focus:outline-none placeholder-c-text-faint transition-colors"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/10 text-brand-red border border-red-500/20">
                                <AlertTriangle size={18} className="flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex items-center justify-center gap-2 bg-c-accent text-white font-bold py-3.5 rounded-xl shadow-lg shadow-c-accent/25 transition-all hover:bg-c-accent/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <><span className="animate-spin h-5 w-5 border-2 border-white/40 border-t-white rounded-full" /> Procesando...</>
                            ) : (
                                <>{isLoginView ? <LogIn size={18} /> : <UserPlus size={18} />} {isLoginView ? 'Iniciar Sesión' : 'Crear Cuenta'}</>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={handleForceDeleteDB}
                        className="inline-flex items-center justify-center gap-2 mx-auto text-brand-red/90 font-semibold text-sm py-2 px-4 rounded-lg border border-brand-red/30 hover:bg-brand-red/10 transition-colors"
                    >
                        <Trash2 size={15} />
                        Forzar Reinicio de DB Local
                    </button>
                    <p className="text-xs text-c-text-faint mt-2">Si la app no carga, usa este botón.</p>
                </div>
            </div>
        </div>
    );
};