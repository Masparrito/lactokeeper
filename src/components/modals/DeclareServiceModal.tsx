// src/components/modals/DeclareServiceModal.tsx

import React from 'react';
import { DayPicker } from 'react-day-picker'; // Component for calendar
import 'react-day-picker/dist/style.css'; // Default styles for DayPicker
import { es } from 'date-fns/locale'; // Spanish locale for dates
import { Modal } from '../ui/Modal'; // Assuming Modal component exists
import { Animal } from '../../db/local'; // Import Animal type
import { formatAnimalDisplay } from '../../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA

// Props definition for the component
interface DeclareServiceModalProps {
    isOpen: boolean; // Controls modal visibility
    onClose: () => void; // Function to close the modal
    onSave: (date: Date) => void; // Function to save the selected date
    // --- CAMBIO: Se recibe el objeto Animal completo ---
    animal: Animal; // The animal being serviced
}

// Custom CSS for DayPicker styling to match the app's dark theme
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
    // --- CAMBIO: Se recibe 'animal' ---
    animal
}) => {
    // Return null if the modal should not be open
    if (!isOpen) return null;

    // Handler for selecting a date in the DayPicker
    const handleSelect = (date: Date | undefined) => {
        if (date) {
            onSave(date); // Call the onSave prop with the selected date
        }
        // Consider whether to close automatically or wait for confirmation
        // onClose(); // Currently closes immediately on selection
    };

    // --- RENDERIZADO DEL MODAL ---
    return (
        // Use the generic Modal component as a base
        // --- USO DE formatAnimalDisplay en título ---
        // --- CAMBIO: Usar animal en lugar de animalId ---
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Registrar Servicio para ${formatAnimalDisplay(animal)}`}
        >
            {/* Inject custom styles for the calendar */}
            <style>{calendarCss}</style>
            <div className="flex justify-center pb-4">
                <DayPicker
                    mode="single" // Allow selecting only one date
                    onSelect={handleSelect} // Call handler on date selection
                    defaultMonth={new Date()} // Start calendar view at current month
                    locale={es} // Use Spanish locale
                    disabled={{ after: new Date() }} // Disable selection of future dates
                    // Optional: Add dropdowns for month/year navigation
                    captionLayout="dropdown-buttons"
                    fromYear={new Date().getFullYear() - 1} // Example: Allow selecting from last year
                    toYear={new Date().getFullYear()}     // Up to current year
                />
            </div>
             {/* Optional: Add explicit Cancel/Confirm buttons if immediate close on select is not desired */}
            {/* <div className="flex justify-end gap-3 pt-4 border-t border-brand-border">
                <button type="button" onClick={onClose} className="px-5 py-2 bg-zinc-600 hover:bg-zinc-500 font-semibold rounded-lg text-white">Cancelar</button>
                 Could add a button here to confirm the selected date if needed
            </div> */}
        </Modal>
    );
};