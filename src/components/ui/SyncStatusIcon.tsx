// src/components/ui/SyncStatusIcon.tsx

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Cloud, CloudCog, CloudOff, RefreshCw, CheckCircle2, UploadCloud, X, AlertTriangle } from 'lucide-react';
import { SyncStatus, useData } from '../../context/DataContext';

// Traduce nombres técnicos de colección a etiquetas legibles para el ganadero.
const COLLECTION_LABELS: Record<string, string> = {
  animals: 'Animal', fathers: 'Semental', parturitions: 'Parto/Lactancia', weighings: 'Pesaje de leche',
  bodyWeighings: 'Pesaje corporal', lots: 'Lote', origins: 'Origen', breedingSeasons: 'Temporada de monta',
  sireLots: 'Lote de sementales', serviceRecords: 'Servicio', events: 'Evento', feedingPlans: 'Plan de alimentación',
  products: 'Producto', healthPlans: 'Plan sanitario', planActivities: 'Actividad sanitaria', healthEvents: 'Evento sanitario',
  famachaRevs: 'Revisión Famacha',
};
const humanCollection = (c: string): string => {
  if (c.startsWith('borrado:')) return `Borrado de ${COLLECTION_LABELS[c.slice(8)] ?? c.slice(8)}`;
  return COLLECTION_LABELS[c] ?? c;
};

interface SyncStatusIconProps {
  status?: SyncStatus; // opcional: si no se pasa, se toma del contexto
}

const statusConfig = {
  idle: { Icon: Cloud, color: 'text-green-500', label: 'Datos sincronizados' },
  syncing: { Icon: CloudCog, color: 'text-amber-500 animate-spin-slow', label: 'Sincronizando…' },
  offline: { Icon: CloudOff, color: 'text-red-500', label: 'Sin conexión' },
};

function relativeTime(ts: number | null): string {
  if (!ts) return 'nunca';
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'hace un momento';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  return new Date(ts).toLocaleDateString('es-VE', { day: 'numeric', month: 'short' });
}

export const SyncStatusIcon: React.FC<SyncStatusIconProps> = ({ status }) => {
  const { syncStatus, pendingSyncCount, syncFailures, lastSyncAt, syncNow } = useData();
  const effective = status ?? syncStatus;
  const { Icon, color, label } = statusConfig[effective];
  const [open, setOpen] = useState(false);

  const hasPending = pendingSyncCount > 0;
  const hasFailures = syncFailures.length > 0;

  return (
    <>
      <button onClick={() => setOpen(true)} className="relative flex items-center" title={label} aria-label={label}>
        <Icon className={`w-5 h-5 ${color}`} />
        {hasPending && effective !== 'syncing' && (
          <span className={`absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-1 rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none border border-c-bg ${hasFailures ? 'bg-brand-red' : 'bg-c-accent-gold'}`}>
            {pendingSyncCount > 99 ? '99+' : pendingSyncCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <div className="fixed inset-0 z-[120] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm bg-c-surface rounded-t-2xl sm:rounded-2xl shadow-2xl m-0 sm:m-4 p-5 animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-c-text-strong text-lg">Sincronización</h3>
              <button onClick={() => setOpen(false)} className="p-1.5 text-c-text-faint hover:text-c-text rounded-lg hover:bg-c-surface-2"><X size={18} /></button>
            </div>

            {/* Estado de conexión */}
            <div className="flex items-center gap-3 mb-3">
              <Icon className={`w-6 h-6 ${color}`} />
              <div>
                <p className="font-semibold text-c-text">
                  {effective === 'offline' ? 'Sin conexión' : effective === 'syncing' ? 'Sincronizando…' : 'Conectado'}
                </p>
                <p className="text-xs text-c-text-muted">Última subida: {relativeTime(lastSyncAt)}</p>
              </div>
            </div>

            {/* Pendientes */}
            <div className={`flex items-center gap-3 rounded-xl p-3 mb-4 ${hasPending ? 'bg-c-accent-gold/10' : 'bg-c-accent/10'}`}>
              {hasPending ? <UploadCloud size={20} className="text-c-accent-gold shrink-0" /> : <CheckCircle2 size={20} className="text-c-accent shrink-0" />}
              <div className="min-w-0">
                {hasPending ? (
                  <>
                    <p className="font-semibold text-c-text">{pendingSyncCount} {pendingSyncCount === 1 ? 'cambio sin subir' : 'cambios sin subir'}</p>
                    <p className="text-xs text-c-text-muted">{effective === 'offline' ? 'Se subirán al recuperar conexión.' : 'Se están subiendo en segundo plano.'}</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-c-text">Todo al día</p>
                    <p className="text-xs text-c-text-muted">No hay cambios pendientes de subir.</p>
                  </>
                )}
              </div>
            </div>

            {/* Diagnóstico: cambios que el servidor rechazó (con el motivo) */}
            {hasFailures && (
              <div className="rounded-xl p-3 mb-4 bg-brand-red/10 border border-brand-red/20">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-brand-red shrink-0" />
                  <p className="font-semibold text-c-text text-sm">
                    {syncFailures.length} {syncFailures.length === 1 ? 'cambio no se pudo guardar' : 'cambios no se pudieron guardar'}
                  </p>
                </div>
                <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                  {syncFailures.slice(0, 8).map((f) => (
                    <li key={`${f.collection}:${f.id}`} className="text-xs">
                      <span className="font-medium text-c-text">{humanCollection(f.collection)}</span>
                      <span className="text-c-text-faint"> · {f.error}</span>
                    </li>
                  ))}
                  {syncFailures.length > 8 && (
                    <li className="text-xs text-c-text-faint">y {syncFailures.length - 8} más…</li>
                  )}
                </ul>
                <p className="text-[11px] text-c-text-muted mt-2">Toca “Reintentar” para volver a subirlos. Si persiste, comparte este detalle.</p>
              </div>
            )}

            <button
              onClick={() => syncNow()}
              disabled={effective === 'offline' || effective === 'syncing' || (!hasPending && !hasFailures)}
              className="w-full flex items-center justify-center gap-2 bg-c-accent-sky text-white font-bold py-3 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.99] transition-transform"
            >
              <RefreshCw size={18} className={effective === 'syncing' ? 'animate-spin' : ''} />
              {effective === 'syncing' ? 'Sincronizando…' : hasFailures ? 'Reintentar' : 'Sincronizar ahora'}
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
