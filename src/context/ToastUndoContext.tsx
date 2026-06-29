import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Undo2, X, CheckCircle2 } from 'lucide-react';

// Sistema de "deshacer": la acción se ejecuta de inmediato y se ofrece revertirla
// con un toast temporal. Si el usuario no toca "Deshacer" en N segundos, el toast
// desaparece y la acción queda firme. La reversión es por acción inversa (no se
// difiere la escritura), lo que es robusto para una app offline-first.
interface ToastState {
    id: number;
    message: string;
    onUndo?: () => void | Promise<void>;
}

interface ToastUndoValue {
    showUndo: (message: string, onUndo: () => void | Promise<void>, durationMs?: number) => void;
    showToast: (message: string, durationMs?: number) => void;
}

const ToastUndoContext = createContext<ToastUndoValue | undefined>(undefined);

export const ToastUndoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<ToastState | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const seq = useRef(0);

    const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; } };

    const dismiss = useCallback(() => { clearTimer(); setToast(null); }, []);

    const present = useCallback((message: string, onUndo: (() => void | Promise<void>) | undefined, durationMs: number) => {
        clearTimer();
        const id = ++seq.current;
        setToast({ id, message, onUndo });
        timerRef.current = setTimeout(() => {
            setToast(prev => (prev && prev.id === id ? null : prev));
        }, durationMs);
    }, []);

    const showUndo = useCallback((message: string, onUndo: () => void | Promise<void>, durationMs = 15000) => {
        present(message, onUndo, durationMs);
    }, [present]);

    const showToast = useCallback((message: string, durationMs = 3000) => {
        present(message, undefined, durationMs);
    }, [present]);

    useEffect(() => () => clearTimer(), []);

    const handleUndo = async () => {
        const fn = toast?.onUndo;
        dismiss();
        if (fn) { try { await fn(); } catch (e) { console.error('Error al deshacer:', e); } }
    };

    // Ctrl+Z / Cmd+Z (escritorio) deshace la acción mientras el toast está activo.
    useEffect(() => {
        if (!toast?.onUndo) return;
        const handler = (e: KeyboardEvent) => {
            const isUndo = (e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z');
            if (!isUndo) return;
            const el = document.activeElement as HTMLElement | null;
            const tag = el?.tagName;
            const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || !!el?.isContentEditable;
            if (typing) return; // respetar el "deshacer" nativo dentro de campos de texto
            e.preventDefault();
            handleUndo();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [toast]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <ToastUndoContext.Provider value={{ showUndo, showToast }}>
            {children}
            {toast && (
                <div
                    className="fixed left-0 right-0 z-[130] px-4 flex justify-center pointer-events-none animate-slide-up"
                    style={{ bottom: 'calc(60px + env(safe-area-inset-bottom, 0px))' }}
                >
                    <div className="pointer-events-auto w-full max-w-md bg-c-text-strong text-c-bg rounded-xl shadow-2xl flex items-center gap-3 pl-4 pr-2 py-2.5">
                        <CheckCircle2 size={18} className="shrink-0 opacity-80" />
                        <span className="flex-1 text-sm font-medium truncate">{toast.message}</span>
                        {toast.onUndo && (
                            <button onClick={handleUndo} className="flex items-center gap-1.5 font-bold text-sm px-3 py-1.5 rounded-lg bg-c-bg/15 hover:bg-c-bg/25 transition-colors">
                                <Undo2 size={15} /> Deshacer
                            </button>
                        )}
                        <button onClick={dismiss} aria-label="Cerrar" className="p-1.5 rounded-lg hover:bg-c-bg/15 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}
        </ToastUndoContext.Provider>
    );
};

export function useToastUndo(): ToastUndoValue {
    const ctx = useContext(ToastUndoContext);
    if (!ctx) throw new Error('useToastUndo debe usarse dentro de <ToastUndoProvider>');
    return ctx;
}
