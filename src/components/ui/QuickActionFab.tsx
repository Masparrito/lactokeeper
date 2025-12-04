import { useState } from 'react';
import { Plus, Baby, Droplets, Scale, HeartHandshake, Award } from 'lucide-react';

export type QuickActionType = 'parto' | 'secado' | 'destete' | 'peso_servicio' | 'servicio_visto';

interface QuickActionFabProps {
    onActionSelect: (action: QuickActionType) => void;
}

export const QuickActionFab = ({ onActionSelect }: QuickActionFabProps) => {
    const [isOpen, setIsOpen] = useState(false);

    const toggleOpen = () => setIsOpen(!isOpen);

    const handleSelect = (action: QuickActionType) => {
        setIsOpen(false);
        onActionSelect(action);
    };

    // Configuración "Nano Banana": Iconos con identidad visual propia
    const actions = [
        { 
            id: 'parto', 
            label: 'Declarar Parto', 
            icon: Baby, 
            textColor: 'text-pink-500',
            bgColor: 'bg-pink-50' // Fondo sutil para el icono
        },
        { 
            id: 'secado', 
            label: 'Declarar Secado', 
            icon: Droplets, 
            textColor: 'text-brand-blue', // Usamos el azul finance
            bgColor: 'bg-blue-50'
        },
        { 
            id: 'destete', 
            label: 'Declarar Destete', 
            icon: Award, 
            textColor: 'text-yellow-500',
            bgColor: 'bg-yellow-50'
        }, 
        { 
            id: 'peso_servicio', 
            label: 'Peso 1er Servicio', 
            icon: Scale, 
            textColor: 'text-brand-green',
            bgColor: 'bg-green-50'
        },
        { 
            id: 'servicio_visto', 
            label: 'Servicio Visto', 
            icon: HeartHandshake, 
            textColor: 'text-purple-500',
            bgColor: 'bg-purple-50'
        },
    ];

    return (
        // Posicionamiento fijo, pero con estilo de "Dock" flotante
        <div className="fixed bottom-[100px] right-4 z-[60] flex flex-col items-end gap-4 pointer-events-none">
            
            {/* --- Menú Desplegable (Estilo Stack de Cartas) --- */}
            <div className={`flex flex-col items-end gap-3 transition-all duration-300 ${
                isOpen 
                    ? 'opacity-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 translate-y-8 pointer-events-none scale-95'
            }`}>
                {actions.map((action) => (
                    <button
                        key={action.id}
                        onClick={() => handleSelect(action.id as QuickActionType)}
                        className="flex items-center gap-3 group"
                    >
                        {/* Etiqueta flotante Glass */}
                        <span className="bg-white/90 backdrop-blur-md text-slate-700 text-xs font-bold px-3 py-2 rounded-xl shadow-glass-sm border border-white/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap translate-x-2 group-hover:translate-x-0 duration-200">
                            {action.label}
                        </span>

                        {/* Botón de Acción "Nano Banana" (Squircle) */}
                        <div className={`
                            w-12 h-12 rounded-2xl shadow-lg border border-white/60 
                            flex items-center justify-center transition-all duration-200
                            bg-white hover:scale-105 active:scale-95
                            ${action.textColor}
                        `}>
                            {/* Capa de color sutil interna */}
                            <div className={`absolute inset-0 opacity-20 ${action.bgColor} rounded-2xl`} />
                            
                            <action.icon size={22} strokeWidth={2.5} className="relative z-10" />
                        </div>
                    </button>
                ))}
            </div>

            {/* --- Gatillo Principal (Estilo Joya Táctil) --- */}
            <button
                onClick={toggleOpen}
                className={`
                    pointer-events-auto w-14 h-14 rounded-2xl shadow-neon flex items-center justify-center text-white transition-all duration-300 border border-white/20
                    ${isOpen 
                        ? 'bg-slate-800 rotate-90 shadow-none' // Estado abierto: Oscuro y "cerrar"
                        : 'bg-gradient-to-br from-brand-orange to-orange-500 hover:brightness-110 active:scale-95' // Estado normal: Brillante
                    }
                `}
            >
                <Plus size={32} strokeWidth={3} className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`} />
            </button>
        </div>
    );
};