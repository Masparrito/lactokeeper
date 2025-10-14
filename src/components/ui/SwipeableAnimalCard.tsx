// src/components/ui/SwipeableAnimalCard.tsx

import { useRef } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Plus, ChevronRight } from 'lucide-react';
import { Animal } from '../../db/local';
import { StatusIcons } from '../icons/StatusIcons';
import { AnimalStatusKey, STATUS_DEFINITIONS } from '../../hooks/useAnimalStatus';

/**
 * Propiedades para la tarjeta de animal deslizable.
 * @param animal - El objeto animal con datos calculados (edad formateada, objetos de estado).
 * @param onSelect - Función que se ejecuta al tocar la tarjeta.
 * @param onOpenActions - Función que se ejecuta al deslizar la tarjeta hacia la izquierda.
 */
interface SwipeableAnimalCardProps {
  animal: Animal & { formattedAge: string; statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] };
  onSelect: (id: string) => void;
  onOpenActions: (animal: Animal) => void;
}

/**
 * Un componente de tarjeta universal para mostrar un animal.
 * Permite un gesto de deslizamiento hacia la izquierda para revelar un menú de acciones rápidas.
 */
export const SwipeableAnimalCard = ({ animal, onSelect, onOpenActions }: SwipeableAnimalCardProps) => {
    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 80; // Ancho del botón de "Acciones"

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        
        // Si se desliza lo suficiente hacia la izquierda, dispara la apertura de acciones
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            onOpenActions(animal);
        }
        
        // Siempre regresa la tarjeta a su posición original
        swipeControls.start({ x: 0 });
        setTimeout(() => { dragStarted.current = false; }, 50);
    };

    return (
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            {/* Botón de acción oculto en el fondo */}
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <div className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Plus size={22} /><span className="text-xs mt-1 font-semibold">Acciones</span>
                </div>
            </div>

            {/* Contenido principal de la tarjeta, que es arrastrable */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -buttonsWidth, right: 0 }}
                dragElastic={0.1}
                onDragStart={() => { dragStarted.current = true; }}
                onDragEnd={onDragEnd}
                onTap={() => { if (!dragStarted.current) { onSelect(animal.id); } }}
                animate={swipeControls}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-4"
            >
                 <div className="flex justify-between items-center">
                    <div>
                        <p className="font-bold text-lg text-white">{animal.id}</p>
                        <p className="text-sm text-zinc-400 mt-1">
                            {animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'Sin Asignar'}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusIcons statuses={animal.statusObjects} />
                        <ChevronRight className="text-zinc-600" />
                    </div>
                </div>
            </motion.div>
        </div>
    );
};