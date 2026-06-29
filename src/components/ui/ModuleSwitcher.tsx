import React from 'react';
// --- (CAMBIO) 'Layers' ya no se usa, 'X' se usa para cerrar ---
import { Droplets, Scale, HeartPulse, X, DollarSign, TrendingUp, Eye, Sun, Moon } from 'lucide-react';
import { GiGoat } from 'react-icons/gi';
import { AppModule } from '../../types/navigation';
import { useTheme } from '../../context/ThemeContext';
import { useModulePrefs } from '../../context/ModulePrefsContext';

const modules = [
    { id: 'rebano', name: 'Rebaño', icon: GiGoat, color: 'text-amber-600' },
    { id: 'lactokeeper', name: 'LactoKeeper', icon: Droplets, color: 'text-brand-blue' },
    { id: 'kilos', name: 'Kilos', icon: Scale, color: 'text-brand-green' },
    { id: 'salud', name: 'StockCare', icon: HeartPulse, color: 'text-teal-500' },
    { id: 'famacha', name: 'Famacha', icon: Eye, color: 'text-rose-500' },
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
    const { theme, toggleTheme } = useTheme();
    const { isEnabled } = useModulePrefs();

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
                className="fixed bottom-0 left-0 right-0 w-full bg-c-surface rounded-t-2xl p-4 shadow-lg animate-slide-up"
                style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}
            >
                {/* Interruptor de tema (claro/oscuro) */}
                <button
                    onClick={toggleTheme}
                    className="absolute top-3 left-3 p-2 text-c-text-muted hover:text-c-text rounded-full hover:bg-c-surface-2 transition-colors"
                    aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
                    title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
                >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                {/* Botón de cerrar (la X) */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 text-c-text-faint hover:text-c-text rounded-full hover:bg-c-surface-2"
                    aria-label="Cerrar"
                >
                    <X size={20} />
                </button>

                <h2 className="text-lg font-semibold text-c-text text-center mb-4">
                    Seleccionar Módulo
                </h2>

                {/* 3. Rejilla de Módulos (en lugar de la lista flotante) */}
                <div className="grid grid-cols-3 gap-4">
                    {modules.map((module) => {
                        const enabled = isEnabled(module.id as AppModule);
                        return (
                            <button
                                key={module.id}
                                onClick={() => enabled && handleModuleSelect(module.id as AppModule)}
                                disabled={!enabled}
                                aria-disabled={!enabled}
                                className={`flex flex-col items-center justify-center p-4 bg-c-surface-2 border border-c-border rounded-2xl transition-all ${enabled ? 'hover:bg-c-border/40' : 'opacity-40 grayscale cursor-not-allowed'}`}
                                aria-label={enabled ? `Cambiar al módulo ${module.name}` : `Módulo ${module.name} desactivado`}
                            >
                                {/* Icono con fondo de color */}
                                <div className={`flex items-center justify-center w-14 h-14 rounded-full ${module.color} bg-opacity-20 mb-2`}>
                                    <module.icon size={28} className={module.color} />
                                </div>
                                <span className="text-c-text font-semibold text-sm">{module.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
    // --- (FIN) CORRECCIÓN DE JSX ---
};