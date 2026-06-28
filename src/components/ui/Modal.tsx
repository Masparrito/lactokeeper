// src/components/ui/Modal.tsx

import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'default' | 'large' | 'fullscreen';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'default' }) => {
  if (!isOpen) return null;

  const containerClasses = size === 'fullscreen'
    ? 'items-end'
    : 'items-center';

  const modalSizeClasses = {
    default: 'max-w-md m-4 rounded-2xl',
    large: 'max-w-xl m-4 rounded-2xl',
    fullscreen: 'w-full h-[92dvh] max-h-[92dvh] rounded-t-2xl flex flex-col',
  };

  return (
    <div 
      className={`fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center z-50 animate-fade-in ${containerClasses}`}
      onClick={onClose}
    >
      <div
        className={`bg-c-surface border border-c-border shadow-2xl text-c-text transform transition-all animate-slide-up ${modalSizeClasses[size]}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 flex justify-between items-center p-4 border-b border-c-border">
          <h2 className="text-xl font-semibold text-c-text tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-c-text-faint hover:text-c-text hover:bg-c-surface-2 transition-colors">
            <X size={20} />
          </button>
        </header>
        {/* --- CAMBIO CLAVE: Contenido con scroll interno y altura máxima --- */}
        <div className={size === 'fullscreen' ? 'flex-1 overflow-y-auto p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]' : 'overflow-y-auto max-h-[80dvh] p-6'}>
          {children}
        </div>
      </div>
    </div>
  );
};