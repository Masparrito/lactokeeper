import React, { useState } from 'react';
import { Layers, Droplets, Scale, X } from 'lucide-react';

// Definimos los módulos disponibles. En el futuro, esto podría venir de una configuración.
const modules = [
    { id: 'lactokeeper', name: 'LactoKeeper', icon: Droplets, color: 'bg-indigo-500', description: 'Control Lechero' },
    { id: 'kilos', name: 'Kilos', icon: Scale, color: 'bg-green-500', description: 'Control de Peso' }
];

// El componente recibirá una función para notificar al padre qué módulo se seleccionó.
interface ModuleSwitcherProps {
    onSwitchModule: (module: 'lactokeeper' | 'kilos') => void;
}

export const ModuleSwitcher: React.FC<ModuleSwitcherProps> = ({ onSwitchModule }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleModuleSelect = (moduleId: 'lactokeeper' | 'kilos') => {
        setIsOpen(false);
        onSwitchModule(moduleId);
    };

    return (
        // Contenedor fijo en la esquina inferior derecha.
        // El z-index asegura que esté por encima de otro contenido pero por debajo de modales.
        <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-4">
            
            {/* Opciones de los módulos (solo visibles si el botón está abierto) */}
            <div 
                className={`flex flex-col items-end gap-4 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}
            >
                {modules.map((module) => (
                    <div key={module.id} className="flex items-center gap-3">
                        <span className="bg-black/60 backdrop-blur-md text-white text-sm font-semibold px-3 py-1 rounded-md shadow-lg">
                            {module.name}
                        </span>
                        <button
                            onClick={() => handleModuleSelect(module.id as 'lactokeeper' | 'kilos')}
                            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg ${module.color} transform transition-transform hover:scale-110`}
                            aria-label={`Cambiar al módulo ${module.name}`}
                        >
                            <module.icon size={28} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Botón Flotante Principal (FAB) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 rounded-full flex items-center justify-center text-black bg-brand-amber shadow-2xl shadow-black/50 transform transition-transform duration-200 hover:scale-110"
                aria-label="Seleccionar módulo"
            >
                <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180 scale-75' : 'rotate-0'}`}>
                    {isOpen ? <X size={32} /> : <Layers size={32} />}
                </div>
            </button>
        </div>
    );
};