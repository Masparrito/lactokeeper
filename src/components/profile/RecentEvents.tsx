// src/components/profile/RecentEvents.tsx
import { useMemo } from 'react';
import { 
    Calendar, Syringe, Activity, Baby, Droplets, FileText, 
    Heart, TrendingUp, ClipboardCheck, AlertCircle, 
    ArrowRightLeft, Ban, Award, Leaf
} from 'lucide-react';
import { TimelineEvent } from '../../hooks/useEvents';

// --- 1. CONFIGURACIÓN DE ESTILOS ---
const getEventStyle = (type: string) => {
    switch (type) {
        // --- GENERAL ---
        case 'Nacimiento': return { icon: Leaf, color: 'text-green-400', bg: 'bg-green-500/10' };
        case 'Registro': return { icon: FileText, color: 'text-zinc-300', bg: 'bg-zinc-800' };
        case 'Baja de Rebaño': return { icon: FileText, color: 'text-zinc-400', bg: 'bg-zinc-900' };

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
        
        default: return { icon: FileText, color: 'text-zinc-400', bg: 'bg-zinc-800' };
    }
};

// --- 2. MINI TARJETA DE EVENTO ---
const MiniEventRow = ({ event }: { event: TimelineEvent }) => {
    const style = getEventStyle(event.type);
    const Icon = style.icon;

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
        <div className="flex items-start gap-4 p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors cursor-default">
            <div className={`mt-1 p-2.5 rounded-xl flex-shrink-0 ${style.bg} ${style.color}`}>
                <Icon size={20} />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm font-bold ${style.color}`}>{event.type}</span>
                    <span className="text-xs text-zinc-500 font-mono ml-2 pt-0.5">{displayDate}</span>
                </div>
                
                <p className="text-sm text-zinc-300 leading-relaxed">
                    {event.details}
                </p>
                
                {event.lotName && (
                    <p className="text-xs text-zinc-500 mt-1.5 flex items-center gap-1.5">
                        <ArrowRightLeft size={12} /> <span>{event.lotName}</span>
                    </p>
                )}
            </div>
        </div>
    );
};

// --- 3. COMPONENTE PRINCIPAL ---
export const RecentEvents = ({ events }: { events: TimelineEvent[] }) => {
    
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

    if (!events || events.length === 0) {
        return (
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-8 text-center mt-4">
                <Calendar className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
                <p className="text-base text-zinc-500">Sin actividad reciente</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 mt-4">
            
            {/* 1. GENERALES */}
            {categorizedEvents.General.length > 0 && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-800">
                        <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">General e Hitos</span>
                    </div>
                    <div>
                        {categorizedEvents.General.map(event => (
                            <MiniEventRow key={event.id} event={event} />
                        ))}
                    </div>
                </div>
            )}

            {/* 2. REPRODUCTIVOS */}
            {categorizedEvents.Reproductivo.length > 0 && (
                <div className="bg-zinc-900/80 border border-pink-500/20 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-pink-500/5 border-b border-pink-500/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-pink-400">Reproductivos</span>
                    </div>
                    <div>
                        {categorizedEvents.Reproductivo.map(event => (
                            <MiniEventRow key={event.id} event={event} />
                        ))}
                    </div>
                </div>
            )}

            {/* 3. PRODUCTIVOS */}
            {categorizedEvents.Productivo.length > 0 && (
                <div className="bg-zinc-900/80 border border-yellow-500/20 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-yellow-500/5 border-b border-yellow-500/10">
                        <span className="text-xs font-bold uppercase tracking-widest text-yellow-400">Productivos</span>
                    </div>
                    <div>
                        {categorizedEvents.Productivo.map(event => (
                            <MiniEventRow key={event.id} event={event} />
                        ))}
                    </div>
                </div>
            )}

            {/* 4. MANEJO */}
            {categorizedEvents.Manejo.length > 0 && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl overflow-hidden">
                    <div className="px-4 py-3 bg-zinc-800/50 border-b border-zinc-800">
                        <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Manejo y Sanidad</span>
                    </div>
                    <div>
                        {categorizedEvents.Manejo.map(event => (
                            <MiniEventRow key={event.id} event={event} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};