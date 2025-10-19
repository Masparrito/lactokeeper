// src/components/ui/ActionSheetModal.tsx

import React from 'react';
// No necesitamos Modal aquí, así que la importación está eliminada

// --- Definición de los tipos para las acciones ---
// Cada acción tendrá una etiqueta, un ícono y una función a ejecutar.
// El color es opcional, para acciones destructivas como "Eliminar".
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 animate-fade-in"
            onClick={onClose}
        >
            {/* Contenedor principal del modal, con el nuevo color de fondo y animación */}
            <div 
                className="w-full max-w-sm bg-ios-modal-bg rounded-t-2xl sm:rounded-2xl shadow-2xl text-white animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Encabezado con el título */}
                <div className="p-2">
                    <header className="text-center p-2 rounded-lg bg-zinc-800/50">
                        <h2 className="text-sm font-semibold text-brand-light-gray">{title}</h2>
                    </header>
                </div>

                {/* Lista de acciones */}
                <div className="p-2">
                    <div className="bg-zinc-800/50 rounded-lg">
                        {actions.map((action, index) => (
                            <button
                                key={index}
                                onClick={() => {
                                    action.onClick();
                                    onClose(); // Cierra el modal después de ejecutar la acción
                                }}
                                className={`w-full flex items-center p-3 text-left transition-colors hover:bg-white/10 ${action.color || 'text-brand-blue'} ${index > 0 ? 'border-t border-zinc-700/80' : ''}`}
                            >
                                <action.icon size={22} className="mr-4" />
                                <span className="text-lg font-medium text-white">{action.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Botón de Cancelar separado con el nuevo estilo */}
                <div className="p-2 mt-1">
                     <button 
                        onClick={onClose}
                        className="w-full bg-zinc-700 p-3 text-lg font-bold text-white rounded-xl hover:bg-zinc-600 transition-colors"
                     >
                        Cancelar
                    </button>
      S           </div>
            </div>
        </div>
    );
};