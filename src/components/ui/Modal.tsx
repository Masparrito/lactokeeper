// src/components/ui/Modal.tsx

import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-zinc-900/50 border border-zinc-700/80 rounded-2xl shadow-2xl w-full max-w-md m-4 text-white transform transition-all animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-zinc-800/80">
          {/* Título con peso semibold, más grande y elegante */}
          <h2 className="text-xl font-semibold text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-colors">
            <X size={20} />
          </button>
        </header>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};