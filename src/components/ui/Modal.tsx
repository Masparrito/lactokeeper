import { X } from 'lucide-react';
import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  // Tarea 2.1: Añadir prop opcional para el tamaño del modal
  size?: 'default' | 'large';
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'default' }) => {
  if (!isOpen) return null;

  // Tarea 2.1: Seleccionar la clase de Tailwind según el tamaño
  const sizeClasses = size === 'large' ? 'max-w-xl' : 'max-w-md';

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        // Se aplica la clase de tamaño correcta
        className={`bg-zinc-900/50 border border-zinc-700/80 rounded-2xl shadow-2xl w-full m-4 text-white transform transition-all animate-slide-up ${sizeClasses}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-zinc-800/80">
          <h2 className="text-xl font-semibold text-white tracking-tight">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-700/50 transition-colors">
            <X size={20} />
          </button>
        </header>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};