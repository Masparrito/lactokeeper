// src/components/modals/DeclareServiceModal.tsx

import React from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { es } from 'date-fns/locale';

interface DeclareServiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (date: Date) => void;
    animalId: string;
}

// Estilos para el calendario, para que coincida con la estética de la app
const css = `
  .rdp {
    --rdp-cell-size: 40px;
    --rdp-accent-color: #FF9500;
    --rdp-background-color: #1c1c1e;
    --rdp-accent-color-dark: #FF9500;
    --rdp-background-color-dark: #1c1c1e;
    --rdp-outline: 2px solid var(--rdp-accent-color);
    --rdp-border-radius: 12px;
    color: #FFF;
  }
  .rdp-caption_label, .rdp-nav_button { color: #FF9500; }
  .rdp-head_cell { color: #8e8e93; }
  .rdp-day_selected { background-color: var(--rdp-accent-color); color: #000; font-weight: bold; }
`;

export const DeclareServiceModal: React.FC<DeclareServiceModalProps> = ({ isOpen, onClose, onSave, animalId }) => {
    if (!isOpen) return null;

    const handleSelect = (date: Date | undefined) => {
        if (date) {
            onSave(date);
        }
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-end sm:items-center z-50 animate-fade-in"
            onClick={onClose}
        >
            <div 
                className="w-full max-w-sm bg-ios-modal-bg rounded-t-2xl sm:rounded-2xl shadow-2xl text-white animate-slide-up"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="text-center p-3">
                    <h2 className="font-semibold text-white">Registrar Servicio para {animalId}</h2>
                    <p className="text-sm text-zinc-400">Selecciona la fecha del servicio</p>
                </header>
                <style>{css}</style>
                <div className="flex justify-center pb-4">
                    <DayPicker
                        mode="single"
                        onSelect={handleSelect}
                        defaultMonth={new Date()}
                        locale={es}
                        disabled={{ after: new Date() }} // No se pueden seleccionar fechas futuras
                    />
                </div>
            </div>
        </div>
    );
};