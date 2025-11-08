import React from 'react';
// --- (CAMBIO) 'Layers' ya no se usa, 'X' se usa para cerrar ---
import { Droplets, Scale, HeartPulse, X, DollarSign, TrendingUp } from 'lucide-react';
import { GiGoat } from 'react-icons/gi';
import { AppModule } from '../../types/navigation';

const modules = [
    { id: 'rebano', name: 'Rebaño', icon: GiGoat, color: 'text-amber-600' },
    { id: 'lactokeeper', name: 'LactoKeeper', icon: Droplets, color: 'text-brand-blue' },
    { id: 'kilos', name: 'Kilos', icon: Scale, color: 'text-brand-green' },
    { id: 'salud', name: 'StockCare', icon: HeartPulse, color: 'text-teal-500' },
    { id: 'cents', name: 'Cents', icon: DollarSign, color: 'text-yellow-500' },
    { id: 'evolucion', name: 'Evolución', icon: TrendingUp, color: 'text-indigo-500' }
];

// --- (INICIO) CORRECCIÓN DE PROPS ---
// 1. Se eliminó el estado interno 'isOpen'.
// 2. Se añadieron 'isOpen' y 'onClose' a las props.
interface ModuleSwitcherProps {
    isOpen: boolean;
    onClose: () => void;
    onSwitchModule: (module: AppModule) => void;
}

export const ModuleSwitcher: React.FC<ModuleSwitcherProps> = ({ isOpen, onClose, onSwitchModule }) => {

    const handleModuleSelect = (moduleId: AppModule) => {
        onClose(); // Cerrar el modal
        // Damos un pequeño delay para que la animación de cierre se vea
        setTimeout(() => {
            onSwitchModule(moduleId);
        }, 300); 
    };

    // Si el modal no está abierto, no renderizar nada.
    if (!isOpen) {
        return null;
    }

    // --- (FIN) CORRECCIÓN DE PROPS ---

    // --- (INICIO) CORRECCIÓN DE JSX ---
    // 3. El componente ahora es un modal de tipo "Action Sheet"
    return (
        // 1. Fondo (Backdrop)
        <div 
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={onClose}
        >
            {/* 2. Contenedor del Panel (para que no se cierre al hacer clic en él) */}
            <div
                onClick={(e) => e.stopPropagation()}
                className="fixed bottom-0 left-0 right-0 w-full bg-ios-modal-bg rounded-t-2xl p-4 shadow-lg animate-slide-up"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}
            >
                {/* Botón de cerrar (la X) */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-700/50"
                    aria-label="Cerrar"
                >
                    <X size={20} />
                </button>
                
                <h2 className="text-lg font-semibold text-white text-center mb-4">
                    Seleccionar Módulo
                </h2>

                {/* 3. Rejilla de Módulos (en lugar de la lista flotante) */}
                <div className="grid grid-cols-3 gap-4">
                    {modules.map((module) => (
                        <button
                            key={module.id}
                            onClick={() => handleModuleSelect(module.id as AppModule)}
                            className="flex flex-col items-center justify-center p-4 bg-brand-glass hover:bg-zinc-800 border border-brand-border rounded-2xl transition-colors"
                            aria-label={`Cambiar al módulo ${module.name}`}
                        >
                            {/* Icono con fondo de color */}
                            <div className={`flex items-center justify-center w-14 h-14 rounded-full ${module.color} bg-opacity-20 mb-2`}>
                                <module.icon size={28} className={module.color} />
                            </div>
                            <span className="text-white font-semibold text-sm">{module.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
    // --- (FIN) CORRECCIÓN DE JSX ---
};