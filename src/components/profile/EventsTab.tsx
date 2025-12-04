// src/components/profile/EventsTab.tsx
import { useState, useRef, useMemo } from 'react';
import { 
    Calendar, Syringe, Activity, Baby, Droplets, FileText, 
    Heart, TrendingUp, ClipboardCheck, AlertCircle, 
    ArrowRightLeft, Ban, Award, ChevronDown, ChevronUp,
    Leaf, Edit, Trash2
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { motion, useAnimation, PanInfo } from 'framer-motion';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { EditEventNotesModal } from '../modals/EditEventNotesModal';
import { TimelineEvent } from '../../hooks/useEvents';

// --- 1. CONFIGURACIÓN DE ESTILOS ---
const getEventStyle = (type: string) => {
    switch (type) {
        // --- GENERAL ---
        case 'Nacimiento': return { icon: Leaf, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' };
        case 'Registro': return { icon: FileText, color: 'text-zinc-300', bg: 'bg-zinc-800', border: 'border-zinc-700' };
        case 'Ingreso': return { icon: FileText, color: 'text-zinc-300', bg: 'bg-zinc-800', border: 'border-zinc-700' };
        case 'Baja de Rebaño': return { icon: FileText, color: 'text-zinc-400', bg: 'bg-zinc-900', border: 'border-zinc-800' };

        // --- REPRODUCTIVOS ---
        case 'Parto': return { icon: Baby, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' };
        case 'Aborto': return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' };
        case 'Servicio': return { icon: Heart, color: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/20' };
        case 'Diagnóstico': return { icon: Activity, color: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/20' };
        case 'Peso de Monta': return { icon: ClipboardCheck, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };

        // --- PRODUCTIVOS ---
        case 'Inicio Lactancia': return { icon: Droplets, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
        case 'Secado': return { icon: Ban, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
        
        // --- MANEJO ---
        case 'Tratamiento': return { icon: Syringe, color: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' };
        case 'Movimiento': return { icon: ArrowRightLeft, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' };
        case 'Destete': return { icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' };
        case 'Hito de Peso': return { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
        case 'Actividad': return { icon: Activity, color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
        
        // --- MANEJO: PESAJES ---
        case 'Pesaje Corporal': return { icon: TrendingUp, color: 'text-brand-green', bg: 'bg-brand-green/10', border: 'border-brand-green/20' };
        case 'Pesaje Lechero': return { icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' };
        
        default: return { icon: FileText, color: 'text-zinc-400', bg: 'bg-zinc-800', border: 'border-zinc-700' };
    }
};

// --- 2. TARJETA DE EVENTO (EventCard) ---
// Recibe onDeleteRequest para delegar el modal al padre
const EventCard = ({ event, onDeleteRequest }: { event: TimelineEvent, onDeleteRequest: (id: string) => void }) => {
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const swipeControls = useAnimation();
    const dragStarted = useRef(false);
    const buttonsWidth = 130; 

    const style = getEventStyle(event.type);
    const Icon = style.icon;

    let displayDate = event.date;
    if (event.date && event.date !== 'N/A') {
        try {
            const dateParts = event.date.split('-'); 
            if (dateParts.length === 3) {
                const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                displayDate = d.toLocaleDateString('es-VE', { year: '2-digit', month: 'short', day: 'numeric' });
            }
        } catch (e) { /* fallback */ }
    }

    const onDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const offset = info.offset.x;
        const velocity = info.velocity.x;
        // Swipe lógica: Si desliza más de la mitad del ancho de botones o hace un "flick" rápido
        if (offset < -buttonsWidth / 2 || velocity < -500) {
            swipeControls.start({ x: -buttonsWidth });
        } else {
            swipeControls.start({ x: 0 });
        }
        setTimeout(() => { dragStarted.current = false; }, 100);
    };

    const isVirtualEvent = event.id.includes('synthetic') || 
                           event.id === 'manual-registration-event' ||
                           event.id.endsWith('_wean') ||
                           event.id.endsWith('_decom');

    const handleEdit = () => {
        if (isVirtualEvent) {
             alert("Este evento es generado automáticamente y no se puede editar aquí.");
             swipeControls.start({ x: 0 });
             return;
        }
        setIsEditModalOpen(true);
        swipeControls.start({ x: 0 });
    };

    const handleDeleteClick = () => {
        if (isVirtualEvent) {
            alert("Este evento es generado automáticamente. Debes eliminar el registro original.");
            swipeControls.start({ x: 0 });
            return;
       }
       // Delegamos la acción al padre para que el modal salga limpio
       onDeleteRequest(event.id);
       swipeControls.start({ x: 0 }); // Cerramos el swipe
    };

    return (
        <>
            <div className="relative w-full overflow-hidden rounded-xl mb-2 last:mb-0">
                
                {/* --- CAPA TRASERA: BOTONES --- */}
                <div className="absolute inset-y-0 right-0 flex items-center z-0 h-full bg-zinc-900 rounded-xl">
                    <button onClick={handleEdit} disabled={isVirtualEvent} className="h-full w-[65px] flex flex-col items-center justify-center bg-brand-blue text-white disabled:bg-zinc-700 disabled:opacity-50 border-r border-black/10">
                        <Edit size={18} />
                        <span className="text-[10px] mt-1 font-semibold">Editar</span>
                    </button>
                    <button onClick={handleDeleteClick} disabled={isVirtualEvent} className="h-full w-[65px] flex flex-col items-center justify-center bg-brand-red text-white disabled:bg-zinc-700 disabled:opacity-50 rounded-r-xl">
                        <Trash2 size={18} />
                        <span className="text-[10px] mt-1 font-semibold">Eliminar</span>
                    </button>
                </div>

                {/* --- CAPA DELANTERA: TARJETA (FONDO SÓLIDO) --- */}
                <motion.div
                    drag="x"
                    dragConstraints={{ left: -buttonsWidth, right: 0 }}
                    dragElastic={0.1}
                    onDragStart={() => { dragStarted.current = true; }}
                    onDragEnd={onDragEnd}
                    onTap={() => { if (!dragStarted.current) swipeControls.start({ x: 0 }); }}
                    animate={swipeControls}
                    transition={{ type: "spring", stiffness: 400, damping: 40 }}
                    // CLAVE: 'bg-zinc-900' hace que la tarjeta sea sólida y tape los botones
                    // 'border' aplica el color del borde según el tipo de evento
                    className={`relative w-full z-10 cursor-pointer flex items-start gap-3 p-3 bg-zinc-900 border ${style.border} rounded-xl shadow-sm`}
                >
                    <div className={`flex-shrink-0 mt-0.5 p-1.5 rounded-full ${style.bg} ${style.color}`}>
                        <Icon size={18} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline">
                            <h4 className={`text-sm font-bold ${style.color}`}>{event.type}</h4>
                            <span className="text-[10px] text-zinc-500 font-mono">{displayDate}</span>
                        </div>
                        
                        <p className="text-xs text-zinc-300 mt-0.5 break-words leading-snug">
                            {event.details}
                        </p>
                        
                        {event.notes && (
                            <div className="mt-1.5 pt-1.5 border-t border-white/5 flex gap-1.5">
                                <span className="text-[10px] text-yellow-500/70 italic">Nota:</span>
                                <p className="text-[10px] text-zinc-400 italic line-clamp-2">{event.notes}</p>
                            </div>
                        )}

                        {event.lotName && (
                            <p className="text-[9px] text-zinc-500 mt-1 flex items-center gap-1">
                                <ArrowRightLeft size={9} /> {event.lotName}
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>

            {isEditModalOpen && (
                <EditEventNotesModal
                    event={event}
                    onClose={() => setIsEditModalOpen(false)}
                    onSaveSuccess={() => setIsEditModalOpen(false)}
                />
            )}
        </>
    );
};

// --- 3. SECCIÓN POR CATEGORÍA ---
const CategorySection = ({ title, events, colorClass, onDeleteRequest }: { title: string, events: TimelineEvent[], colorClass: string, onDeleteRequest: (id: string) => void }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    if (events.length === 0) return null;

    const displayedEvents = isExpanded ? events : events.slice(0, 3);
    const hasMore = events.length > 3;

    return (
        <div className="mb-6 last:mb-2 animate-fade-in">
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 pl-1 ${colorClass} flex items-center justify-between`}>
                <span className="flex items-center gap-2">
                    {title}
                    <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px] tabular-nums">
                        {events.length}
                    </span>
                </span>
            </h3>
            
            <div>
                {displayedEvents.map((event) => (
                    <EventCard 
                        key={`${event.id}_${event.type}`} 
                        event={event} 
                        onDeleteRequest={onDeleteRequest} // Pasamos la función hacia abajo
                    />
                ))}
            </div>

            {hasMore && (
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-center gap-1 text-[10px] text-zinc-500 py-2 hover:text-white transition-colors"
                >
                    {isExpanded ? (
                        <>Ver menos <ChevronUp size={12} /></>
                    ) : (
                        <>Ver {events.length - 3} eventos más antiguos <ChevronDown size={12} /></>
                    )}
                </button>
            )}
        </div>
    );
};

// --- 4. COMPONENTE PRINCIPAL ---
export const EventsTab = ({ events }: { events: TimelineEvent[] }) => {
    const { deleteEvent } = useData();
    
    // Estado para el Modal de Eliminación (Centralizado en el Tab)
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Función para iniciar el proceso de borrado
    const handleDeleteRequest = (id: string) => {
        setEventToDelete(id);
        setDeleteModalOpen(true);
    };

    // Función para confirmar el borrado
    const confirmDelete = async () => {
        if (!eventToDelete || isDeleting) return;
        setIsDeleting(true);
        try {
            await deleteEvent(eventToDelete);
            setDeleteModalOpen(false);
            setEventToDelete(null);
        } catch (e: any) {
            console.error("Error al eliminar evento:", e.message);
            alert(`Error: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const categorized = useMemo(() => {
        const groups = {
            Reproductivo: [] as TimelineEvent[],
            Productivo: [] as TimelineEvent[],
            ManejoSanitario: [] as TimelineEvent[], 
            ManejoPesos: [] as TimelineEvent[],     
            General: [] as TimelineEvent[]
        };

        if (!events) return groups;

        const sorted = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        sorted.forEach(event => {
            if (event.category === 'General') groups.General.push(event);
            else if (event.category === 'Reproductivo') groups.Reproductivo.push(event);
            else if (event.category === 'Productivo') groups.Productivo.push(event);
            else if (event.category === 'Manejo') {
                if (event.type === 'Pesaje Corporal' || event.type === 'Pesaje Lechero') {
                    groups.ManejoPesos.push(event);
                } else {
                    groups.ManejoSanitario.push(event);
                }
            } else {
                groups.General.push(event);
            }
        });

        return groups;
    }, [events]);

    if (!events || events.length === 0) {
        return (
            <div className="text-center py-12 flex flex-col items-center">
                <div className="p-4 bg-zinc-800/50 rounded-full mb-3">
                    <Calendar className="w-8 h-8 text-zinc-600" />
                </div>
                <p className="text-zinc-500 font-medium">No hay eventos registrados aún.</p>
            </div>
        );
    }

    return (
        <>
            <div className="pb-4">
                <CategorySection title="Origen e Hitos" events={categorized.General} colorClass="text-green-400" onDeleteRequest={handleDeleteRequest} />
                <CategorySection title="Reproductivos" events={categorized.Reproductivo} colorClass="text-pink-400" onDeleteRequest={handleDeleteRequest} />
                <CategorySection title="Productivos" events={categorized.Productivo} colorClass="text-yellow-400" onDeleteRequest={handleDeleteRequest} />
                <CategorySection title="Manejo y Sanidad" events={categorized.ManejoSanitario} colorClass="text-indigo-400" onDeleteRequest={handleDeleteRequest} />
                <CategorySection title="Control de Peso y Leche" events={categorized.ManejoPesos} colorClass="text-cyan-400" onDeleteRequest={handleDeleteRequest} />
            </div>

            {/* Modal Centralizado (Fuera de los items de la lista para evitar glitches) */}
            <ConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => { setDeleteModalOpen(false); setEventToDelete(null); }}
                onConfirm={confirmDelete}
                title="¿Eliminar Evento?"
                message="Esta acción borrará el registro del historial permanentemente."
            />
        </>
    );
};