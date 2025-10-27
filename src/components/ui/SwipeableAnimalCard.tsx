// src/components/ui/SwipeableAnimalCard.tsx

import { useRef } from 'react';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { Plus, ChevronRight } from 'lucide-react';
import { Animal } from '../../db/local';
import { StatusIcons } from '../icons/StatusIcons';
import { AnimalStatusKey, STATUS_DEFINITIONS } from '../../hooks/useAnimalStatus';
// formatAnimalDisplay ya no se usa para el display principal aquí

/**
 * Propiedades para la tarjeta de animal deslizable.
 * @param animal - El objeto animal con datos calculados (edad formateada, objetos de estado).
 * @param onSelect - Función que se ejecuta al tocar la tarjeta.
 * @param onOpenActions - Función que se ejecuta al deslizar la tarjeta hacia la izquierda.
 */
interface SwipeableAnimalCardProps {
  // Asegura que las propiedades calculadas estén presentes
  animal: Animal & { formattedAge: string; statusObjects: (typeof STATUS_DEFINITIONS[AnimalStatusKey])[], sireName?: string }; // Añadido sireName opcional por si acaso
  onSelect: (id: string) => void;
  onOpenActions: (animal: Animal) => void; // Pasar el objeto Animal completo a las acciones
}

/**
 * Un componente de tarjeta universal para mostrar un animal.
 * Permite un gesto de deslizamiento hacia la izquierda para revelar un menú de acciones rápidas.
 * AHORA INCORPORA EL ESTILO ESTANDARIZADO DE ID/NOMBRE.
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

    // Determinar color del punto de sexo si es Referencia
    const genderDotColor = animal.isReference ? (animal.sex === 'Macho' ? 'bg-blue-400' : 'bg-pink-400') : null;
    // Preparar nombre formateado (mayúsculas, sin espacios extra)
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    return (
        // Contenedor principal: relativo, overflow oculto, bordes redondeados
        // Mantenemos min-h-[80px] como base para esta tarjeta, el espaciado lo maneja el virtualizer
        <div className="relative w-full overflow-hidden rounded-2xl bg-brand-glass border border-brand-border min-h-[80px]">
            {/* Botón de acción oculto en el fondo */}
            <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full">
                <div className="h-full w-[80px] flex flex-col items-center justify-center bg-brand-blue text-white">
                    <Plus size={20} />
                    <span className="text-[10px] mt-0.5 font-semibold">Acciones</span>
                </div>
            </div>

            {/* Punto de sexo (Referencia) */}
            {genderDotColor && (
                <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${genderDotColor} z-20`} title={animal.sex}></div>
            )}

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
                className="relative w-full z-10 cursor-pointer bg-ios-modal-bg p-3 flex items-center min-h-[80px]" // z-10 para estar sobre el botón, padding ajustado
            >
                 {/* Contenido interno de la tarjeta */}
                 <div className="flex justify-between items-center w-full"> {/* Asegurar ancho completo */}
                    {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
                    <div className="min-w-0 pr-3"> {/* Permitir que el texto se encoja y trunque */}
                        {/* ID (Protagonista) - Fuente y tamaño aplicados */}
                        <p className="font-mono font-semibold text-base text-white truncate">{animal.id.toUpperCase()}</p>

                        {/* Nombre (Secundario, si existe) */}
                        {formattedName && (
                          <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                        )}

                        {/* Detalles (Contexto) */}
                        <div className="text-xs text-zinc-500 mt-1 min-h-[1rem] truncate">
                            <span>{animal.sex} | {animal.formattedAge} | Lote: {animal.location || 'N/A'}</span>
                            {/* Mostrar Rep. (sireName) si existe en los datos pasados */}
                            {animal.sireName && <span className="block sm:inline sm:ml-2">(Rep: {animal.sireName})</span>}
                        </div>
                    </div>
                    {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}

                    {/* Información Derecha: Iconos de Estado, Flecha */}
                    <div className="flex items-center gap-2 flex-shrink-0"> {/* gap-2 ajustado */}
                        <StatusIcons statuses={animal.statusObjects} /> {/* Componente para mostrar iconos de estado */}
                        <ChevronRight className="text-zinc-600 w-5 h-5" /> {/* Flecha indicadora, tamaño ajustado */}
                    </div>
                </div>
            </motion.div>
        </div>
    );
};