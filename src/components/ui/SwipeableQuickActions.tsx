import { useState, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { 
    Baby,
    Heart, X, Wind, Award, CheckCircle2
} from 'lucide-react';
import { QuickActionType } from '../ui/QuickActionFab'; 

// --- DEFINICIÓN DE ACCIONES RÁPIDAS (MODIFICADA) ---
const ACTIONS = [
    // --- Eventos Reproductivos ---
    { 
        id: 'birth', 
        label: 'Reg. Parto', 
        icon: Baby, 
        action: 'parto', 
        color: 'text-white bg-pink-500' 
    },
    { 
        id: 'service', 
        label: 'Reg. Servicio', 
        icon: Heart, 
        action: 'servicio_visto', 
        color: 'text-white bg-red-500' 
    },
    { 
        id: 'dry', 
        label: 'Reg. Secado', 
        icon: Wind, 
        action: 'secado', 
        color: 'text-white bg-amber-500' 
    },

    // --- Eventos de Crecimiento ---
    { 
        id: 'wean', 
        label: 'Reg. Destete', 
        icon: Award, 
        action: 'destete', 
        color: 'text-white bg-yellow-500' 
    },
    { 
        id: 'service_weight', 
        label: 'Peso 1er Serv.', 
        icon: CheckCircle2, 
        action: 'peso_servicio', 
        color: 'text-white bg-pink-600' 
    },
];

interface SwipeableQuickActionsProps {
    onActionSelect: (action: QuickActionType | string) => void;
}

export const SwipeableQuickActions: React.FC<SwipeableQuickActionsProps> = ({ onActionSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Manejo del gesto de arrastre
    const handleDragEnd = (_: any, info: PanInfo) => {
        if (info.offset.y < -50) { // Arrastrar hacia arriba abre
            setIsOpen(true);
        } else if (info.offset.y > 50) { // Arrastrar hacia abajo cierra
            setIsOpen(false);
        }
    };

    const handleItemClick = (item: typeof ACTIONS[0]) => {
        setIsOpen(false);
        
        if (item.action) {
            // Acción de Modal (Parto, Secado, etc.)
            onActionSelect(item.action);
        }
        // Ya no hay rutas de navegación en este array
    };

    return (
        <>
            {/* OVERLAY DE FONDO */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-md z-40"
                    />
                )}
            </AnimatePresence>

            {/* CONTENEDOR DESLIZABLE */}
            <motion.div
                ref={containerRef}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDragEnd}
                animate={isOpen ? "open" : "closed"}
                variants={{
                    open: { y: 0 },
                    closed: { y: "calc(100% - 24px)" } // Pestaña visible
                }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className={`fixed bottom-[60px] left-0 right-0 z-50 bg-[#1c1c1e] rounded-t-[2rem] border-t border-zinc-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-col ${isOpen ? 'h-auto pb-8' : 'h-auto'}`}
            >
                {/* MANEJADOR (HANDLE) */}
                <div 
                    className="w-full h-8 flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className="w-12 h-1.5 bg-zinc-600 rounded-full opacity-50 hover:opacity-100 transition-opacity" />
                </div>

                {/* CONTENIDO DEL MENÚ */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className="px-6"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Acciones Rápidas</h3>
                                <button onClick={() => setIsOpen(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                {ACTIONS.map((action) => (
                                    <button
                                        key={action.id}
                                        onClick={() => handleItemClick(action)}
                                        className="flex flex-col items-center gap-3 group active:scale-95 transition-transform"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${action.color}`}>
                                            <action.icon size={28} strokeWidth={2} />
                                        </div>
                                        <span className="text-[11px] font-semibold text-zinc-300 text-center leading-tight">
                                            {action.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </>
    );
};