// src/components/input/BottomSheetDatePicker.tsx
// Componente de selector de fecha estilo Bottom Sheet

import React from 'react';
import { DayPicker } from 'react-day-picker';
// Nota: El 'react-day-picker/dist/style.css' debe importarse 
// globalmente en tu archivo principal (ej: main.tsx o App.tsx).
import { es } from 'date-fns/locale';

interface BottomSheetDatePickerProps {
    onClose: () => void;
    onSelectDate: (date: Date | undefined) => void;
    currentValue: Date;
}

export const BottomSheetDatePicker: React.FC<BottomSheetDatePickerProps> = ({ onClose, onSelectDate, currentValue }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="fixed bottom-0 left-0 right-0 w-full bg-ios-modal-bg rounded-t-2xl p-4 shadow-lg animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ paddingBottom: 'env(safe-area-inset-bottom, 1rem)' }}>
                <div onClick={onClose} className="w-16 h-1.5 bg-zinc-700 rounded-full mx-auto mb-4 cursor-pointer"></div>
                <div className="flex justify-center [&_.rdp]:bg-transparent [&_.rdp]:text-white [&_.rdp-caption_select]:bg-brand-glass [&_.rdp-caption_select]:border-brand-border [&_.rdp-caption_select]:text-white [&_.rdp-caption_select]:rounded-lg [&_.rdp-day_selected]:bg-brand-orange [&_.rdp-day_selected]:text-white [&_.rdp-day_today]:text-brand-orange [&_.rdp-nav_button]:text-zinc-400 [&_.rdp-head_cell]:text-zinc-500 [&_.rdp-day]:text-zinc-200 [&_.rdp-day_outside]:text-zinc-600">
                    <DayPicker
                        mode="single"
                        selected={currentValue}
                        onSelect={onSelectDate}
                        captionLayout="dropdown-buttons"
                        fromYear={new Date().getFullYear() - 20}
                        toYear={new Date().getFullYear()}
                        defaultMonth={currentValue}
                        locale={es}
                    />
                </div>
            </div>
        </div>
    );
};