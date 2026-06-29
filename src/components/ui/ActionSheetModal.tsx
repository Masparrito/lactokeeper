// src/components/ui/ActionSheetModal.tsx

import React from 'react';

// --- Definición de los tipos para las acciones ---
export interface ActionSheetAction {
    label: string;
    icon: React.ElementType;
    onClick: () => void;
    color?: string; // e.g., 'text-brand-red'
}

interface ActionSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    actions: ActionSheetAction[];
}

export const ActionSheetModal: React.FC<ActionSheetModalProps> = ({ isOpen, onClose, title, actions }) => {
    if (!isOpen) return null;

    return (
        // Fondo translúcido con efecto blur
        <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center z-[120] animate-fade-in"
            onClick={onClose}
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4.5rem)' }}
        >
            {/* Contenedor principal del modal, con el nuevo color de fondo y animación */}
            <div
                className="w-full max-w-sm bg-c-surface rounded-2xl shadow-2xl text-c-text animate-slide-up mx-2"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Encabezado con el título */}
                <div className="p-2">
                    <header className="text-center p-2 rounded-lg bg-c-surface-2">
                        <h2 className="text-sm font-semibold text-c-text-muted">{title}</h2>
                    </header>
                </div>

                {/* Lista de acciones */}
                <div className="p-2">
                    <div className="bg-c-surface-2 rounded-lg">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    // --- INICIO DE LA CORRECCIÓN ---
                                    // La acción ahora tiene control total.
                                    // Ya no llamamos a onClose() automáticamente.
                                    action.onClick();
                                    // --- FIN DE LA CORRECCIÓN ---
                                }}
                                className={`w-full flex items-center p-3 text-left transition-colors hover:bg-c-surface-3 ${action.color || 'text-c-accent-sky'} ${index > 0 ? 'border-t border-c-border-strong' : ''}`}
                            >
                                <action.icon size={22} className="mr-4" />
                                <span className="text-lg font-medium text-c-text">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Botón de Cancelar separado con el nuevo estilo */}
                <div className="p-2 mt-1">
                    <button
                        onClick={onClose}
                        className="w-full bg-c-surface-2 p-3 text-lg font-bold text-c-text rounded-xl hover:bg-c-surface-3 transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            </div>
        </div>
    );
};