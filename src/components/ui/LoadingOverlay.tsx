// src/components/ui/LoadingOverlay.tsx

import React from 'react';
import { Loader } from 'lucide-react';
import { GiGoat } from 'react-icons/gi';

export const LoadingOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1C1C1E] animate-fade-in">
      <div className="relative flex items-center justify-center w-24 h-24">
        {/* Ícono de cabra en el centro */}
        <GiGoat className="text-brand-orange w-12 h-12" />
        
        {/* Spinner animado girando alrededor */}
        <div className="absolute inset-0">
          <Loader className="w-24 h-24 text-zinc-700 animate-spin-slow" />
        </div>
      </div>
      <p className="mt-4 text-lg font-medium text-zinc-400 tracking-wider">
        Cargando datos...
      </p>
    </div>
  );
};