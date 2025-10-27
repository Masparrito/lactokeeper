// src/components/modals/DeclareServiceModal.tsx

import React from 'react';
import { DayPicker } from 'react-day-picker'; // Component for calendar
import 'react-day-picker/dist/style.css'; // Default styles for DayPicker
import { es } from 'date-fns/locale'; // Spanish locale for dates
import { Modal } from '../ui/Modal';
import { Animal } from '../../db/local';
// --- CAMBIO: formatAnimalDisplay ya no es necesario ---
// import { formatAnimalDisplay } from '../../utils/formatting';

// Props definition for the component
interface DeclareServiceModalProps {
    isOpen: boolean; // Controls modal visibility
    onClose: () => void; // Function to close the modal
    onSave: (date: Date) => void; // Function to save the selected date
    animal: Animal; // The animal being serviced
}

// Custom CSS for DayPicker styling
const calendarCss = `
  .rdp {
    --rdp-cell-size: 40px; /* Size of day cells */
    --rdp-accent-color: #FF9500; /* Orange accent */
    --rdp-background-color: transparent; /* Transparent background */
    --rdp-accent-color-dark: #FF9500;
    --rdp-background-color-dark: transparent;
    --rdp-outline: 2px solid var(--rdp-accent-color); /* Outline for focused day */
    --rdp-border-radius: 12px; /* Rounded corners */
    color: #FFF; /* Default text color */
    margin: 1em auto; /* Centering */
  }
  .rdp-caption_label { color: #FFF; font-weight: bold; } /* Month/Year label */
  .rdp-nav_button { color: #FF9500; } /* Navigation arrows */
  .rdp-head_cell { color: #8e8e93; font-size: 0.8em; } /* Weekday names */
  .rdp-day { color: #FFF; } /* Day numbers */
  .rdp-day_today { font-weight: bold; color: #FF9500; } /* Today's date */
  .rdp-day_selected { background-color: var(--rdp-accent-color); color: #000; font-weight: bold; } /* Selected day */
  .rdp-day_disabled { color: #505054; } /* Disabled days */
  .rdp-day_outside { color: #505054; } /* Days outside current month */
  .rdp-caption_dropdowns { display: flex; gap: 10px; } /* Style dropdowns if used */
  .rdp-dropdown {
      background-color: #333; /* Dark background for dropdown */
      border: 1px solid #555;
      color: #FFF;
      padding: 4px 8px;
      border-radius: 6px;
  }
`;

export const DeclareServiceModal: React.FC<DeclareServiceModalProps> = ({
    isOpen,
    onClose,
    onSave,
    animal
}) => {
    // Return null if the modal should not be open
    if (!isOpen) return null;

    // --- CAMBIO: Preparar nombre formateado ---
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    // Handler for selecting a date in the DayPicker
    const handleSelect = (date: Date | undefined) => {
        if (date) {
            onSave(date); // Call the onSave prop with the selected date
        }
    };

    // --- RENDERIZADO DEL MODAL ---
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            // --- CAMBIO: Título genérico ---
            title="Registrar Servicio"
        >
            <style>{calendarCss}</style>
            
            {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
            <div className="text-center mb-4">
                <p className="font-mono font-semibold text-xl text-white truncate">{animal.id.toUpperCase()}</p>
                {formattedName && (
                    <p className="text-sm font-normal text-zinc-300 truncate">{formattedName}</p>
                )}
            </div>
            {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}

            <div className="flex justify-center pb-4">
                <DayPicker
                    mode="single"
                    onSelect={handleSelect}
                    defaultMonth={new Date()}
                    locale={es}
                    disabled={{ after: new Date() }}
                    captionLayout="dropdown-buttons"
                    fromYear={new Date().getFullYear() - 1}
                    toYear={new Date().getFullYear()}
                />
            </div>
        </Modal>
    );
};