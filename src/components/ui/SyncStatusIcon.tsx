// src/components/ui/SyncStatusIcon.tsx

import React from 'react';
import { Cloud, CloudCog, CloudOff } from 'lucide-react';
import { SyncStatus } from '../../context/DataContext'; // Importamos el tipo

interface SyncStatusIconProps {
  status: SyncStatus;
}

const statusConfig = {
  idle: {
    Icon: Cloud,
    color: 'text-green-500',
    label: 'Datos sincronizados',
  },
  syncing: {
    Icon: CloudCog,
    color: 'text-amber-500 animate-spin-slow', // animación sutil
    label: 'Sincronizando datos...',
  },
  offline: {
    Icon: CloudOff,
    color: 'text-red-500',
    label: 'Sin conexión',
  },
};

export const SyncStatusIcon: React.FC<SyncStatusIconProps> = ({ status }) => {
  const { Icon, color, label } = statusConfig[status];

  return (
    <div className="flex items-center gap-2" title={label}>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
  );
};