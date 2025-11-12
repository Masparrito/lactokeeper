import { useRef } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
// --- INICIO TAREA 6.3: Imports añadidos ---
import { Plus, ChevronRight, Square, CheckSquare } from 'lucide-react';
// --- FIN TAREA 6.3 ---
import { Animal } from '../../db/local';
import { StatusIcons } from '../icons/StatusIcons';
import { AnimalStatusKey, STATUS_DEFINITIONS } from '../../hooks/useAnimalStatus';

/**
 * Propiedades para la tarjeta de animal deslizable.
 * @param animal - El objeto animal con datos calculados (edad formateada, objetos de estado).
 * @param onSelect - Función que se ejecuta al tocar la tarjeta (navega o selecciona).
 * @param onOpenActions - Función que se ejecuta al deslizar la tarjeta hacia la izquierda.
 */
// --- INICIO TAREA 6.3: Props actualizados ---
interface SwipeableAnimalCardProps {
  animal: Animal & { formattedAge: string; statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[], sireName?: string };
  onSelect: (id: string) => void;
  onOpenActions: (animal: Animal) => void;
  isSelectionMode: boolean; // Indica si el modo de selección está activo
  isSelected: boolean;      // Indica si esta tarjeta específica está seleccionada
}
// --- FIN TAREA 6.3 ---

/**
 * Un componente de tarjeta universal para mostrar un animal.
 * Cambia su comportamiento basado en 'isSelectionMode'.
 */
export const SwipeableAnimalCard = ({ 
    animal, 
    onSelect, 
    onOpenActions, 
    isSelectionMode, 
    isSelected 
}: SwipeableAnimalCardProps) => {
    
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 80;

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;

        if (offset < -buttonsWidth / 2 || velocity < -500) {
            onOpenActions(animal);
        }

        swipeControls.start({ x: 0 });
        setTimeout(() => { dragStarted.current = false; }, 50);
    };

    const genderDotColor = animal.isReference ? (animal.sex === 'Macho' ? 'bg-blue-400' : 'bg-pink-400') : null;
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    return (
        // --- INICIO TAREA 6.3: Borde condicional ---
        <div className={`relative w-full overflow-hidden rounded-2xl bg-brand-glass border min-h-[80px] transition-all ${
            isSelected ? 'border-brand-orange ring-2 ring-brand-orange/50' : 'border-brand-border'
        }`}>
        {/* --- FIN TAREA 6.3 --- */}

            {/* Botón de acción oculto (solo activo si no estamos en modo selección) */}
            {!isSelectionMode && (
                <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                    <div className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                        <Plus size={20} />
                        <span className="text-[10px] mt-0.5 font-semibold">Acciones</span>
                    </div>
                </div>
            )}

            {genderDotColor && (
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${genderDotColor} z-20`} title={animal.sex}></div>
            )}

            <div className="absolute top-3 right-10 z-20 pointer-events-none">
                <StatusIcons
                    statuses={animal.statusObjects}
                    sex={animal.sex}
                    size={14}
                />
            </div>

            <motion.div
                // --- INICIO TAREA 6.3: Desactivar drag en modo selección ---
                drag={isSelectionMode ? undefined : "x"}
                // --- FIN TAREA 6.3 ---
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) { onSelect(animal.id); } }} // 'onSelect' ahora maneja tanto el clic como la selección
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-3 flex items-center min-h-[96px]" // min-h-[96px] para consistencia
            >
                 <div className="flex justify-between items-center w-full">
                    <div className="min-w-0 pr-3">
                        <p className="font-mono font-semibold text-base text-white truncate">{animal.id.toUpperCase()}</p>
                        <p className="text-sm font-normal text-zinc-300 truncate h-5">
                            {formattedName || <>&nbsp;</>}
                        </p>
                        <div className="text-xs text-zinc-500 mt-1 min-h-[1rem] truncate">
                            <span>{animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'N/A'}</span>
                            {animal.sireName && <span className="block sm:inline sm:ml-2">(Rep: {animal.sireName})</span>}
                        </div>
                    </div>
                    
                    {/* --- INICIO TAREA 6.3: Icono condicional (Flecha o Checkbox) --- */}
                    <div className="flex items-center gap-2 flex-shrink-0 pl-12">
                        {isSelectionMode ? (
                            isSelected ? (
                                <CheckSquare className="text-brand-orange w-5 h-5" />
                            ) : (
                                <Square className="text-zinc-600 w-5 h-5" />
                            )
                        ) : (
                            <ChevronRight className="text-zinc-600 w-5 h-5" />
                        )}
                    </div>
                    {/* --- FIN TAREA 6.3 --- */}
                </div>
            </motion.div>
        </div>
    );
};