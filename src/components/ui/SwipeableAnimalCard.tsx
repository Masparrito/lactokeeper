// src/components/ui/SwipeableAnimalCard.tsx

import { useRef } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Plus, ChevronRight } from 'lucide-react';
import { Animal } from '../../db/local';
import { StatusIcons } from '../icons/StatusIcons';
import { AnimalStatusKey, STATUS_DEFINITIONS } from '../../hooks/useAnimalStatus';
import { formatAnimalDisplay } from '../../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA

/**
 * Propiedades para la tarjeta de animal deslizable.
 * @param animal - El objeto animal con datos calculados (edad formateada, objetos de estado).
 * @param onSelect - Función que se ejecuta al tocar la tarjeta.
 * @param onOpenActions - Función que se ejecuta al deslizar la tarjeta hacia la izquierda.
 */
interface SwipeableAnimalCardProps {
  // Asegura que las propiedades calculadas estén presentes
  animal: Animal & { formattedAge: string; statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[] };
  onSelect: (id: string) => void;
  onOpenActions: (animal: Animal) => void; // Pasar el objeto Animal completo a las acciones
}

/**
 * Un componente de tarjeta universal para mostrar un animal.
 * Permite un gesto de deslizamiento hacia la izquierda para revelar un menú de acciones rápidas.
 */
export const SwipeableAnimalCard = ({ animal, onSelect, onOpenActions }: SwipeableAnimalCardProps) => {
    const swipeControls = useAnimation(); // Controla la animación de la tarjeta
    const dragStarted = useRef(false); // Ref para evitar el clic ('tap') durante el arrastre
    const buttonsWidth = 80; // Ancho del botón de "Acciones" oculto

    // Se ejecuta al finalizar el arrastre
    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x; // Cuánto se arrastró horizontalmente
        const velocity = info.velocity.x; // Velocidad del arrastre

        // Si se arrastró lo suficiente hacia la izquierda o con suficiente velocidad
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            onOpenActions(animal); // Ejecutar la función para abrir acciones
        }

        // Siempre animar la tarjeta de vuelta a su posición original (x: 0)
        swipeControls.start({ x: 0 });
        // Resetear el estado de 'dragStarted' después de un breve retraso
        setTimeout(() => { dragStarted.current = false; }, 50); // Un pequeño delay ayuda a evitar clics accidentales
    };

    return (
        // Contenedor principal: relativo, overflow oculto, bordes redondeados
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border">
            {/* Botón de acción oculto en el fondo */}
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <div className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Plus size={22} />
                    <span className="text-xs mt-1 font-semibold">Acciones</span>
                </div>
            </div>

            {/* Contenido principal de la tarjeta, que es arrastrable */}
            <motion.div
                drag="x" // Permitir arrastre horizontal
                dragConstraints={{ left: -buttonsWidth, right: 0 }} // Limitar arrastre a la izquierda hasta el ancho del botón
                dragElastic={0.1} // Poca elasticidad al llegar al límite
                onDragStart={() => { dragStarted.current = true; }} // Marcar que se inició el arrastre
                onDragEnd={onDragEnd} // Manejar fin del arrastre
                onTap={() => { if (!dragStarted.current) { onSelect(animal.id); } }} // Ejecutar 'onSelect' solo si no se arrastró (es un tap)
                animate={swipeControls} // Aplicar animaciones controladas
                transition={{ type: "spring", stiffness: 400, damping: 40 }} // Animación de resorte al volver
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-4" // Fondo, padding, z-index para estar encima del botón oculto
            >
                 {/* Contenido de la tarjeta */}
                 <div className="flex justify-between items-center">
                    {/* Información Izquierda: ID(Nombre), Sexo, Edad, Lote */}
                    <div>
                        {/* --- CORRECCIÓN AQUÍ: text-lg cambiado a text-base --- */}
                        <p className="font-bold text-base text-white">{formatAnimalDisplay(animal)}</p>
                        <p className="text-sm text-zinc-400 mt-1">
                            {/* Mostrar detalles adicionales */}
                            {animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'Sin Asignar'}
                        </p>
                    </div>
                    {/* Información Derecha: Iconos de Estado, Flecha */}
                    <div className="flex items-center gap-3">
                        <StatusIcons statuses={animal.statusObjects} /> {/* Componente para mostrar iconos de estado */}
                        <ChevronRight className="text-zinc-600" /> {/* Flecha indicadora */}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};