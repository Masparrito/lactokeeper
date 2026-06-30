// src/components/profile/RecentEvents.tsx
import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    Calendar, Syringe, Activity, Baby, Droplets, FileText,
    Heart, TrendingUp, ClipboardCheck, AlertCircle,
    ArrowRightLeft, Ban, Award, Leaf, Trash2, X, AlertTriangle, Eye
} from 'lucide-react';
import { TimelineEvent } from '../../hooks/useEvents';
import { useData } from '../../context/DataContext';
import { useToastUndo } from '../../context/ToastUndoContext';

// --- DETERMINAR SI UN EVENTO ES ELIMINABLE Y CÓMO ---
type DeleteKind = 'weighing' | 'bodyWeighing' | 'service' | 'famacha' | 'event';

const SYNTHETIC_SUFFIXES = ['_birth_syn', '_reg_syn', '_start_lac', '_dry', '_hito'];
const isSynthetic = (id: string) => SYNTHETIC_SUFFIXES.some(s => id.endsWith(s));

const getDeleteKind = (event: TimelineEvent): DeleteKind | null => {
    if (isSynthetic(event.id)) return null;
    switch (event.type) {
        case 'Pesaje Corporal': return 'bodyWeighing';
        case 'Pesaje Lechero': return 'weighing';
        case 'Servicio': return 'service';
        case 'Famacha': return 'famacha';
        // Eventos sensibles o sin reversa segura: NO se permiten borrar desde aquí
        case 'Parto':
        case 'Aborto':
        case 'Tratamiento':
        case 'Nacimiento':
        case 'Registro':
        case 'Ingreso':
        case 'Inicio Lactancia':
        case 'Secado':
        case 'Hito de Crecimiento':
            return null;
        default:
            return 'event';
    }
};

// --- 1. CONFIGURACIÓN DE ESTILOS ---
const getEventStyle = (type: string) => {
    switch (type) {
        // --- GENERAL ---
        case 'Nacimiento': return { icon: Leaf, color: 'text-green-400', bg: 'bg-green-500/10' };
        case 'Registro': return { icon: FileText, color: 'text-c-text-strong', bg: 'bg-c-surface-2' };
        case 'Baja de Rebaño': return { icon: FileText, color: 'text-c-text-muted', bg: 'bg-c-surface' };

        // --- REPRODUCTIVOS ---
        case 'Parto': return { icon: Baby, color: 'text-pink-400', bg: 'bg-pink-500/10' };
        case 'Aborto': return { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' };
        case 'Servicio': return { icon: Heart, color: 'text-pink-300', bg: 'bg-pink-500/10' };
        case 'Diagnóstico': return { icon: Activity, color: 'text-pink-300', bg: 'bg-pink-500/10' };
        case 'Peso de Monta': return { icon: ClipboardCheck, color: 'text-purple-400', bg: 'bg-purple-500/10' };

        // --- PRODUCTIVOS ---
        case 'Inicio Lactancia': return { icon: Droplets, color: 'text-yellow-400', bg: 'bg-yellow-500/10' };
        case 'Secado': return { icon: Ban, color: 'text-orange-400', bg: 'bg-orange-500/10' };

        // --- MANEJO ---
        case 'Tratamiento': return { icon: Syringe, color: 'text-teal-400', bg: 'bg-teal-500/10' };
        case 'Movimiento': return { icon: ArrowRightLeft, color: 'text-indigo-400', bg: 'bg-indigo-500/10' };
        case 'Destete': return { icon: Award, color: 'text-yellow-500', bg: 'bg-yellow-500/10' };
        case 'Hito de Peso': return { icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' };
        case 'Pesaje Corporal': return { icon: TrendingUp, color: 'text-brand-green', bg: 'bg-brand-green/10' };
        case 'Pesaje Lechero': return { icon: Droplets, color: 'text-cyan-400', bg: 'bg-cyan-500/10' };
        case 'Famacha': return { icon: Eye, color: 'text-rose-400', bg: 'bg-rose-500/10' };

        default: return { icon: FileText, color: 'text-c-text-muted', bg: 'bg-c-surface-2' };
    }
};

// --- 2. MINI TARJETA DE EVENTO ---
const MiniEventRow = ({ event, onDelete }: { event: TimelineEvent, onDelete?: (e: TimelineEvent) => void }) => {
    const style = getEventStyle(event.type);
    const Icon = style.icon;
    const deletable = !!onDelete;

    let displayDate = event.date;
    if (event.date && event.date !== 'N/A') {
        try {
            const dateParts = event.date.split('-');
            if (dateParts.length === 3) {
                const d = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
                displayDate = d.toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
            }
        } catch (e) { /* fallback */ }
    }

    return (
        <div className="flex items-start gap-4 p-4 border-b border-c-border last:border-0 hover:bg-c-surface-2 transition-colors">
            <div className={`mt-1 p-2.5 rounded-xl flex-shrink-0 ${style.bg} ${style.color}`}>
                <Icon size={20} />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-bold ${style.color}`}>{event.type}</span>
                    <span className="text-xs text-c-text-faint font-mono ml-2 pt-0.5">{displayDate}</span>
                </div>

                <p className="text-sm text-c-text-strong leading-relaxed">
                    {event.details}
                </p>

                {event.lotName && (
                    <p className="text-xs text-c-text-faint mt-1.5 flex items-center gap-1.5">
                        <ArrowRightLeft size={12} /> <span>{event.lotName}</span>
                    </p>
                )}
            </div>

            {deletable && (
                <button
                    onClick={() => onDelete?.(event)}
                    aria-label="Eliminar registro"
                    className="flex-shrink-0 -mr-1 mt-0.5 p-2 rounded-lg text-c-text-faint hover:text-red-400 hover:bg-red-500/10 active:scale-95 transition-all"
                >
                    <Trash2 size={18} />
                </button>
            )}
        </div>
    );
};

// --- 3. COMPONENTE PRINCIPAL ---
export const RecentEvents = ({ events }: { events: TimelineEvent[] }) => {
    const { deleteWeighing, deleteBodyWeighing, deleteServiceRecord, deleteFamachaRev, deleteEvent } = useData();
    const { showToast } = useToastUndo();

    const [pendingDelete, setPendingDelete] = useState<TimelineEvent | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        const kind = getDeleteKind(pendingDelete);
        if (!kind) { setPendingDelete(null); return; }

        setIsDeleting(true);
        try {
            if (kind === 'bodyWeighing') await deleteBodyWeighing(pendingDelete.id);
            else if (kind === 'weighing') await deleteWeighing(pendingDelete.id);
            else if (kind === 'service') await deleteServiceRecord(pendingDelete.id);
            else if (kind === 'famacha') await deleteFamachaRev(pendingDelete.id);
            else await deleteEvent(pendingDelete.id);

            setPendingDelete(null);
            showToast?.(`Registro de "${pendingDelete.type}" eliminado.`);
        } catch (err) {
            console.error("Error al eliminar el registro:", err);
            showToast?.("No se pudo eliminar el registro.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Memorizar y clasificar eventos
    const categorizedEvents = useMemo(() => {
        // Inicializamos los grupos vacíos para asegurar que siempre existan (evita errores null/undefined)
        const groups = {
            Reproductivo: [] as TimelineEvent[],
            Productivo: [] as TimelineEvent[],
            Manejo: [] as TimelineEvent[],
            General: [] as TimelineEvent[]
        };

        if (!events || events.length === 0) return groups;

        // Ordenar por fecha (más reciente primero)
        const sorted = [...events].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        sorted.forEach(event => {
            if (groups[event.category]) {
                groups[event.category].push(event);
            } else {
                groups.General.push(event);
            }
        });

        // Cortar a los últimos 3 por categoría
        return {
            Reproductivo: groups.Reproductivo.slice(0, 3),
            Productivo: groups.Productivo.slice(0, 3),
            Manejo: groups.Manejo.slice(0, 3),
            General: groups.General.slice(0, 3)
        };
    }, [events]);

    // Helper para pasar onDelete sólo a eventos eliminables
    const deleteHandlerFor = (event: TimelineEvent) =>
        getDeleteKind(event) ? () => setPendingDelete(event) : undefined;

    if (!events || events.length === 0) {
        return (
            <div className="bg-c-surface border border-c-border rounded-2xl p-8 text-center mt-4">
                <Calendar className="w-10 h-10 text-c-text-faint mx-auto mb-3" />
                <p className="text-base text-c-text-faint">Sin actividad reciente</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-4">

            {/* 1. GENERALES */}
            {categorizedEvents.General.length > 0 && (
                <div className="bg-c-surface border border-c-border rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-c-surface-2 border-b border-c-border">
                        <span className="text-xs font-bold uppercase tracking-widest text-c-text-muted">General e Hitos</span>
                    </div>
                    <div>
                        {categorizedEvents.General.map(event => (
                            <MiniEventRow key={event.id} event={event} onDelete={deleteHandlerFor(event)} />
                        ))}
                    </div>
                </div>
            )}

            {/* 2. REPRODUCTIVOS */}
            {categorizedEvents.Reproductivo.length > 0 && (
                <div className="bg-c-surface border border-pink-500/20 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-pink-500/5 border-b border-pink-500/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-pink-400">Reproductivos</span>
                    </div>
                    <div>
                        {categorizedEvents.Reproductivo.map(event => (
                            <MiniEventRow key={event.id} event={event} onDelete={deleteHandlerFor(event)} />
                        ))}
                    </div>
                </div>
            )}

            {/* 3. PRODUCTIVOS */}
            {categorizedEvents.Productivo.length > 0 && (
                <div className="bg-c-surface border border-yellow-500/20 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-yellow-500/5 border-b border-yellow-500/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-yellow-400">Productivos</span>
                    </div>
                    <div>
                        {categorizedEvents.Productivo.map(event => (
                            <MiniEventRow key={event.id} event={event} onDelete={deleteHandlerFor(event)} />
                        ))}
                    </div>
                </div>
            )}

            {/* 4. MANEJO */}
            {categorizedEvents.Manejo.length > 0 && (
                <div className="bg-c-surface border border-c-border rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-c-surface-2 border-b border-c-border">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Manejo y Sanidad</span>
                    </div>
                    <div>
                        {categorizedEvents.Manejo.map(event => (
                            <MiniEventRow key={event.id} event={event} onDelete={deleteHandlerFor(event)} />
                        ))}
                    </div>
                </div>
            )}

            {/* --- MODAL DE CONFIRMACIÓN DE ELIMINACIÓN --- */}
            {pendingDelete && createPortal(
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
                     onClick={() => !isDeleting && setPendingDelete(null)}>
                    <div className="w-full max-w-sm bg-c-surface border border-c-border rounded-2xl shadow-2xl overflow-hidden"
                         onClick={e => e.stopPropagation()}>
                        <div className="flex items-start gap-3 p-5">
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center">
                                <AlertTriangle size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-base font-bold text-c-text-strong">¿Eliminar este registro?</h3>
                                <p className="text-sm text-c-text-muted mt-1 leading-snug">
                                    <span className="font-semibold text-c-text">{pendingDelete.type}</span> — {pendingDelete.details}
                                </p>
                                {getDeleteKind(pendingDelete) === 'service' && (
                                    <p className="text-xs text-amber-400 mt-2 leading-snug">
                                        Si era el único servicio del ciclo, la hembra volverá a estado «Vacía».
                                    </p>
                                )}
                                <p className="text-xs text-c-text-faint mt-2">Esta acción no se puede deshacer.</p>
                            </div>
                            <button onClick={() => !isDeleting && setPendingDelete(null)}
                                    className="flex-shrink-0 p-1 text-c-text-faint hover:text-c-text transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex gap-2 p-4 pt-0">
                            <button
                                onClick={() => setPendingDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-c-text-strong bg-c-surface-2 hover:bg-c-surface-3 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                <Trash2 size={16} />
                                {isDeleting ? 'Eliminando…' : 'Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
