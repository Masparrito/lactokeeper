import React, { useMemo } from 'react';
import { useManagementAlerts } from '../../hooks/useManagementAlerts';
import type { PageState } from '../../types/navigation';
import { Wind, Baby, Heart, ClipboardList, ChevronRight, CheckCircle2, Sun } from 'lucide-react';

// Panel "Para hoy": resumen glanceable de pendientes de manejo del rebaño.
// Reutiliza useManagementAlerts (secados, destetes, servicios, manejo) y enlaza
// a la pantalla completa de alertas.
const TYPE_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    SECADO: { label: 'Secado', icon: Wind, color: 'text-c-accent-sky' },
    REPRODUCTIVO: { label: 'Reproductivo', icon: Heart, color: 'text-pink-500' },
    DESTETE: { label: 'Destete', icon: Baby, color: 'text-c-accent' },
    MANEJO: { label: 'Manejo', icon: Sun, color: 'text-c-accent-gold' },
};

export const TodayPanel: React.FC<{ navigateTo: (page: PageState) => void }> = ({ navigateTo }) => {
    const alerts = useManagementAlerts();

    const groups = useMemo(() => {
        const counts: Record<string, number> = {};
        alerts.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
        return Object.entries(counts).map(([type, count]) => ({ type, count }));
    }, [alerts]);

    const top = alerts.slice(0, 3);

    if (alerts.length === 0) {
        return (
            <div className="mx-4 mt-4 bg-c-surface rounded-2xl border border-c-border p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-c-accent/15 flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-c-accent" />
                </div>
                <div>
                    <p className="font-bold text-c-text">Todo al día</p>
                    <p className="text-xs text-c-text-muted">No hay pendientes de manejo por ahora.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-4 mt-4 bg-c-surface rounded-2xl border border-c-border p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-c-accent" />
                    <span className="text-xs font-bold text-c-text-muted uppercase tracking-wide">Para hoy</span>
                    <span className="text-xs font-bold text-c-accent">{alerts.length}</span>
                </div>
                <button
                    onClick={() => navigateTo({ name: 'management' })}
                    className="flex items-center gap-0.5 text-xs font-semibold text-c-accent-sky hover:underline active:opacity-70"
                >
                    Ver todas <ChevronRight size={14} />
                </button>
            </div>

            {/* Chips por tipo — cada uno lleva a su listado correspondiente */}
            <div className="flex flex-wrap gap-2 mb-3">
                {groups.map(({ type, count }) => {
                    const meta = TYPE_META[type] || TYPE_META.MANEJO;
                    return (
                        <button
                            key={type}
                            onClick={() => navigateTo({ name: 'management', typeFilter: type as 'SECADO' | 'REPRODUCTIVO' | 'DESTETE' | 'MANEJO' })}
                            className="inline-flex items-center gap-1.5 bg-c-surface-2 rounded-lg px-2.5 py-1 text-xs font-semibold text-c-text hover:bg-c-surface-3 active:scale-95 transition-all"
                        >
                            <meta.icon size={13} className={meta.color} />
                            {count} {meta.label}
                        </button>
                    );
                })}
            </div>

            {/* Primeros pendientes — toca para ver todas */}
            <button
                onClick={() => navigateTo({ name: 'management' })}
                className="block w-full text-left space-y-1.5 rounded-lg -m-1 p-1 hover:bg-c-surface-2/50 transition-colors"
            >
                {top.map(a => {
                    const meta = TYPE_META[a.type] || TYPE_META.MANEJO;
                    return (
                        <div key={a.id} className="flex items-center gap-2 text-sm">
                            <meta.icon size={14} className={`${meta.color} shrink-0`} />
                            <span className="font-semibold text-c-text shrink-0">{a.animalDisplay}</span>
                            <span className="text-c-text-muted truncate">— {a.title}</span>
                        </div>
                    );
                })}
                {alerts.length > 3 && <p className="text-[11px] text-c-text-faint pt-0.5">y {alerts.length - 3} más…</p>}
            </button>
        </div>
    );
};
