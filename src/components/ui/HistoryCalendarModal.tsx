// src/components/ui/HistoryCalendarModal.tsx

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { Modal } from './Modal';

interface HistoryCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    availableDates: Date[];
    onDateSelect: (date: Date) => void;
}

// Estilos CSS para inyectar y que el calendario se vea como nuestra app
const css = `
  .rdp {
    --rdp-cell-size: 40px;
    --rdp-accent-color: #FBBF24; /* Amber */
    --rdp-background-color: #3a3a3c; /* Gris oscuro iOS */
    --rdp-accent-color-dark: #FBBF24;
    --rdp-background-color-dark: #3a3a3c;
    --rdp-outline: 2px solid var(--rdp-accent-color);
    --rdp-outline-selected: 3px solid var(--rdp-accent-color);
    --rdp-border-radius: 6px;
    color: #FFF;
    margin: 1em;
  }
  .rdp-caption_label, .rdp-nav_button {
    color: #FBBF24;
  }
  .rdp-head_cell {
    color: #8e8e93;
  }
  .rdp-day_selected {
    background-color: var(--rdp-accent-color);
    color: #000;
    font-weight: bold;
  }
`;

export const HistoryCalendarModal: React.FC<HistoryCalendarModalProps> = ({ isOpen, onClose, availableDates, onDateSelect }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Seleccionar Fecha de Pesaje">
             <style>{css}</style>
             <div className="flex justify-center">
                <DayPicker
                    mode="single"
                    onSelect={(date) => {
                        if (date) {
                            onDateSelect(date);
                            onClose();
                        }
                    }}
                    modifiers={{ available: availableDates }}
                    modifiersClassNames={{ available: 'font-bold text-amber-400' }}
                    showOutsideDays
                />
             </div>
        </Modal>
    );
};