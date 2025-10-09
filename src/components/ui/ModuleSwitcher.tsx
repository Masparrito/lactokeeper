// src/components/ui/ModuleSwitcher.tsx

import React, { useState } from 'react';
import { Layers, Droplets, Scale, HeartPulse, X } from 'lucide-react';

// Se actualiza el tipo para incluir 'salud'
type AppModule = 'lactokeeper' | 'kilos' | 'salud';

// --- CAMBIO CLAVE: Se añade el nuevo módulo de Salud a la lista ---
const modules = [
    { id: 'lactokeeper', name: 'LactoKeeper', icon: Droplets, color: 'bg-brand-blue' },
    { id: 'kilos', name: 'Kilos', icon: Scale, color: 'bg-brand-green' },
    { id: 'salud', name: 'Salud', icon: HeartPulse, color: 'bg-teal-500' } // Nuevo módulo
];

interface ModuleSwitcherProps {
    onSwitchModule: (module: AppModule) => void;
}

export const ModuleSwitcher: React.FC<ModuleSwitcherProps> = ({ onSwitchModule }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleModuleSelect = (moduleId: AppModule) => {
        setIsOpen(false);
        onSwitchModule(moduleId);
    };

    return (
        <div className="fixed bottom-24 right-4 z-40 flex flex-col items-end gap-4 pointer-events-none">
            <div 
                className={`flex flex-col items-end gap-4 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 translate-y-4'}`}
            >
                {modules.map((module) => (
                    <div key={module.id} className="flex items-center gap-3">
                        <span className="bg-black/60 backdrop-blur-md text-white text-sm font-semibold px-3 py-1 rounded-md shadow-lg">
                            {module.name}
                        </span>
                        <button
                            onClick={() => handleModuleSelect(module.id as AppModule)}
                            className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg ${module.color} transform transition-transform hover:scale-110 pointer-events-auto`}
                            aria-label={`Cambiar al módulo ${module.name}`}
                        >
                            <module.icon size={28} />
                        </button>
                    </div>
                ))}
            </div>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-16 h-16 rounded-full flex items-center justify-center text-black bg-brand-amber shadow-2xl shadow-black/50 transform transition-transform duration-200 hover:scale-110 pointer-events-auto"
                aria-label="Seleccionar módulo"
            >
                <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180 scale-75' : 'rotate-0'}`}>
                    {isOpen ? <X size={32} /> : <Layers size={32} />}
                </div>
            </button>
        </div>
    );
};