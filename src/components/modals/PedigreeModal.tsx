// src/components/modals/PedigreeModal.tsx

import React from 'react';
import { Modal } from '../ui/Modal';
import { usePedigree } from '../../hooks/usePedigree';
import { PedigreeChart } from '../pedigree/PedigreeChart';
import type { PageState } from '../../types/navigation';
import { Printer } from 'lucide-react';
import { formatAnimalDisplay } from '../../utils/formatting'; // Importar formatAnimalDisplay
import { useData } from '../../context/DataContext'; // Importar useData para obtener el animal

interface PedigreeModalProps {
    isOpen: boolean;
    onClose: () => void;
    animalId: string;
    navigateTo: (page: PageState) => void;
}

export const PedigreeModal: React.FC<PedigreeModalProps> = ({ isOpen, onClose, animalId, navigateTo }) => {
    const pedigreeRoot = usePedigree(animalId);
    const { animals } = useData(); // Obtener animales para buscar el actual
    const currentAnimal = animals.find(a => a.id === animalId); // Encontrar el animal actual

    const handlePrint = () => {
        // Ocultar elementos no deseados antes de imprimir
        const modalHeader = document.querySelector('.pedigree-modal-header');
        const modalFooter = document.querySelector('.pedigree-modal-footer');
        if (modalHeader) (modalHeader as HTMLElement).style.display = 'none';
        if (modalFooter) (modalFooter as HTMLElement).style.display = 'none';

        window.print();

        // Restaurar elementos después de imprimir (o al cerrar)
        if (modalHeader) (modalHeader as HTMLElement).style.display = '';
        if (modalFooter) (modalFooter as HTMLElement).style.display = '';
    };

    const handleCloseAndRestore = () => {
        // Asegurarse de restaurar si se cierra sin imprimir
        const modalHeader = document.querySelector('.pedigree-modal-header');
        const modalFooter = document.querySelector('.pedigree-modal-footer');
        if (modalHeader) (modalHeader as HTMLElement).style.display = '';
        if (modalFooter) (modalFooter as HTMLElement).style.display = '';
        onClose();
    }

    return (
        // Usar tamaño 'large' o 'fullscreen' para más espacio
        <Modal
            isOpen={isOpen}
            onClose={handleCloseAndRestore}
            // Usar formatAnimalDisplay en el título
            title={`Genealogía de ${formatAnimalDisplay(currentAnimal)}`}
            size="large" // Puedes probar 'fullscreen' si necesitas más espacio aún
        >
            {/* Añadir clases identificadoras para ocultar al imprimir */}
            <div className="pedigree-modal-header mb-4"> {/* Contenedor opcional para info adicional si quieres */} </div>

            <div className="pedigree-chart-container"> {/* Contenedor específico para el gráfico */}
                 <PedigreeChart
                    rootNode={pedigreeRoot}
                    onAncestorClick={(ancestorId) => {
                        // Cerrar modal actual y navegar al perfil del ancestro
                        onClose();
                        // Pequeño delay para asegurar que el modal se cierre antes de navegar
                        setTimeout(() => navigateTo({ name: 'rebano-profile', animalId: ancestorId }), 100);
                    }}
                 />
            </div>

            {/* Añadir footer con botón de imprimir */}
            <footer className="pedigree-modal-footer mt-6 pt-4 border-t border-brand-border flex justify-end gap-3">
                 <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-zinc-600 hover:bg-zinc-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                 >
                     <Printer size={18} /> Imprimir
                 </button>
                 <button onClick={handleCloseAndRestore} className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg">
                    Cerrar
                 </button>
            </footer>

            {/* Estilos para impresión */}
            <style>
                {`
                    @media print {
                        body * {
                            visibility: hidden;
                        }
                        .pedigree-chart-container, .pedigree-chart-container * {
                            visibility: visible;
                        }
                        .pedigree-chart-container {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%; /* Ajusta según necesidad */
                        }
                        /* Oculta los botones dentro del gráfico si los hubiera */
                        .pedigree-chart-container button {
                            display: none;
                        }
                         /* Ajusta el tamaño de fuente si es necesario */
                        .pedigree-chart-container p {
                           font-size: 10px; /* Ejemplo */
                        }
                    }
                `}
            </style>
        </Modal>
    );
};