// src/pages/LoginPage.tsx

import React, { useState } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword,
    AuthError
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { Droplet, AlertTriangle } from 'lucide-react';

export const LoginPage: React.FC = () => {
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleAuthError = (err: AuthError) => {
        switch (err.code) {
            case 'auth/invalid-email':
                return 'El formato del correo electrónico no es válido.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'Correo electrónico o contraseña incorrectos.';
            case 'auth/email-already-in-use':
                return 'Este correo electrónico ya está registrado.';
            case 'auth/weak-password':
                return 'La contraseña debe tener al menos 6 caracteres.';
            default:
                return 'Ocurrió un error. Por favor, intenta de nuevo.';
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
            // No necesitamos hacer nada más, el AuthContext se encargará del resto
        } catch (err) {
            setError(handleAuthError(err as AuthError));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gray-900 min-h-screen flex flex-col items-center justify-center p-4 font-sans">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                        <Droplet className="w-10 h-10 text-indigo-400" />
                        <h1 className="text-4xl font-bold text-white">LactoKeeper</h1>
                    </div>
                    <p className="text-zinc-400">Tu gestión de rebaño, en la nube.</p>
                </div>

                <div className="bg-brand-glass backdrop-blur-xl rounded-2xl p-6 border border-brand-border">
                    <div className="flex bg-zinc-900/80 rounded-xl p-1 w-full mb-6">
                        <button
                            onClick={() => setIsLoginView(true)}
                            className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${isLoginView ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                        >
                            Iniciar Sesión
                        </button>
                        <button
                            onClick={() => setIsLoginView(false)}
                            className={`w-1/2 rounded-lg py-2 text-sm font-semibold transition-colors ${!isLoginView ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800/50'}`}
                        >
                            Registrarse
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Correo electrónico"
                            required
                            className="w-full bg-zinc-800/80 text-white p-3 rounded-xl border border-transparent focus:border-brand-amber focus:ring-0 focus:outline-none placeholder-zinc-400"
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Contraseña"
                            required
                            className="w-full bg-zinc-800/80 text-white p-3 rounded-xl border border-transparent focus:border-brand-amber focus:ring-0 focus:outline-none placeholder-zinc-400"
                        />

                        {error && (
                            <div className="flex items-center space-x-2 p-3 rounded-lg text-sm bg-red-500/20 text-red-300">
                                <AlertTriangle size={18} />
                                <span>{error}</span>
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-brand-amber text-black font-bold py-3 rounded-xl transition-colors hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Procesando...' : (isLoginView ? 'Iniciar Sesión' : 'Crear Cuenta')}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};