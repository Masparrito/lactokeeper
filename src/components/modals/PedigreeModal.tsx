// src/components/modals/PedigreeModal.tsx (Totalmente Rediseñado y Corregido)

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { usePedigree, PedigreeNode } from '../../hooks/usePedigree';
import { PedigreeChart } from '../pedigree/PedigreeChart';
import type { PageState } from '../../types/navigation';
// --- (CORRECCIÓN) Se importa 'Eye', se elimina 'X' ---
import { Printer, ArrowLeft, ChevronRight, User, Eye } from 'lucide-react';
import { formatAnimalDisplay } from '../../utils/formatting';
import { useData } from '../../context/DataContext';
import { Animal } from '../../db/local';
import { exportPedigreeToPDF } from '../../utils/pdfExporter'; // Importar la nueva función

// --- (NUEVO) Tarjeta de Animal para la lista vertical ---
interface PedigreeListCardProps {
  label: string; // "Padre", "Madre"
  animal?: Animal;
  onNavigate: () => void; // Navegar al perfil
  onDrillDown: () => void; // Ver los padres de este animal
  hasParents: boolean;
}

const PedigreeListCard: React.FC<PedigreeListCardProps> = ({ label, animal, onNavigate, onDrillDown, hasParents }) => {
    
    const genderColor = animal?.sex === 'Hembra' ? 'text-pink-400' : 'text-blue-400';
    const borderGenderColor = animal?.sex === 'Hembra' ? 'border-pink-900/50' : 'border-blue-900/50';

    if (!animal) {
        return (
            <div>
                <label className="block text-sm font-medium text-zinc-400">{label}</label>
                <div className={`mt-1 flex items-center justify-between gap-3 bg-zinc-800/50 border ${borderGenderColor} rounded-xl p-3`}>
                    <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 bg-zinc-700 rounded-full p-2 text-zinc-500">
                            <User size={18} />
                        </div>
                        <p className="text-zinc-500">Desconocido</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div>
            <label className="block text-sm font-medium text-zinc-400">{label}</label>
            <div className={`mt-1 flex items-center justify-between gap-3 bg-zinc-800/80 border ${borderGenderColor} rounded-xl p-3`}>
                <div className="flex items-center gap-3 min-w-0">
                    {/* Botón para ir al perfil del animal */}
                    <button 
                        onClick={onNavigate} 
                        className="flex-shrink-0 bg-zinc-700 rounded-full p-2 text-white hover:bg-zinc-600 transition-colors"
                        title={`Ver perfil de ${animal.id}`}
                    >
                        {/* --- (CORRECCIÓN) Ícono 'Eye' añadido --- */}
                        <Eye size={18} />
                    </button>
                    {/* Info del animal */}
                    <div className="min-w-0">
                        <p className={`font-mono font-semibold text-base truncate ${genderColor}`}>
                            {animal.id.toUpperCase()}
                        </p>
                        {animal.name && (
                            <p className="text-sm text-zinc-300 truncate">{animal.name.toUpperCase()}</p>
                        )}
                    </div>
                </div>
                {/* Botón para navegar MÁS ATRÁS en el árbol */}
                {hasParents && (
                    <button 
                        onClick={onDrillDown} 
                        className="flex-shrink-0 p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-full transition-colors"
                        title={`Ver padres de ${animal.id}`}
                    >
                        <ChevronRight size={20} />
                    </button>
                )}
            </div>
        </div>
    );
};


// --- (NUEVO) Componente del Gráfico Oculto para PDF ---
const HiddenPdfChart = React.forwardRef<HTMLDivElement, { rootNode: PedigreeNode | null }>(({ rootNode }, ref) => (
    <div 
        ref={ref} 
        style={{ 
            position: 'absolute', 
            left: '-9999px', // Moverlo fuera de la pantalla
            width: '1200px', // Ancho fijo para el gráfico horizontal
            padding: '20px', 
            backgroundColor: '#18181b' // Fondo oscuro (zinc-900)
        }}
    >
        <PedigreeChart 
            rootNode={rootNode} 
            onAncestorClick={() => {}} // No se necesita acción al hacer clic en el PDF
        />
    </div>
));
HiddenPdfChart.displayName = 'HiddenPdfChart';


// --- (REDISEÑADO) Modal Principal de Pedigrí ---
interface PedigreeModalProps {
    isOpen: boolean;
    onClose: () => void;
    animalId: string;
    navigateTo: (page: PageState) => void;
}

export const PedigreeModal: React.FC<PedigreeModalProps> = ({ isOpen, onClose, animalId, navigateTo }) => {
    const { animals } = useData();
    const pedigreeRoot = usePedigree(animalId);
    
    // Pila de historial para la navegación vertical
    const [history, setHistory] = useState<PedigreeNode[]>([]);
    const [isExporting, setIsExporting] = useState(false);
    const pdfChartRef = useRef<HTMLDivElement>(null);

    const currentAnimalNode = useMemo(() => {
        if (history.length === 0) return null;
        return history[history.length - 1];
    }, [history]);
    
    const currentAnimal = useMemo(() => {
        const id = currentAnimalNode?.animal.id || animalId;
        return animals.find(a => a.id === id);
    }, [currentAnimalNode, animalId, animals]);
    
    // --- (NUEVO) Título dinámico como string ---
    const modalTitle = useMemo(() => {
        if (history.length > 1) {
            return `Padres de ${formatAnimalDisplay(currentAnimalNode?.animal)}`;
        }
        return `Genealogía de ${formatAnimalDisplay(currentAnimal)}`;
    }, [history, currentAnimal, currentAnimalNode]);

    // Inicializar el historial cuando el pedigrí cargue
    useEffect(() => {
        if (isOpen && pedigreeRoot) {
            setHistory([pedigreeRoot]);
        }
    }, [isOpen, pedigreeRoot]);

    const handleDrillDown = (node?: PedigreeNode) => {
        if (node) {
            setHistory(prev => [...prev, node]);
        }
    };

    const handleGoBack = () => {
        if (history.length > 1) {
            setHistory(prev => prev.slice(0, -1));
        }
    };

    const handleNavigate = (id: string) => {
        onClose();
        setTimeout(() => navigateTo({ name: 'rebano-profile', animalId: id }), 100);
    };

    const handleExport = async () => {
        if (!pdfChartRef.current || !pedigreeRoot) { // Usar pedigreeRoot para la exportación
            alert("Error: No se pudo encontrar el gráfico para exportar.");
            return;
        }
        setIsExporting(true);
        try {
            // Exportar siempre el pedigrí completo del animal raíz
            await exportPedigreeToPDF(pdfChartRef.current, pedigreeRoot.animal);
        } catch (error) {
            console.error("Error al exportar PDF:", error);
            alert("Ocurrió un error al generar el PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            // --- (CORRECCIÓN) Título es un string dinámico ---
            title={modalTitle}
            size="default" // Tamaño de modal estándar
        >
            {/* Contenedor principal con estado de carga */}
            <div className="relative">
                {isExporting && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-lg">
                        <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-white text-lg font-semibold mt-4">Generando PDF Horizontal...</p>
                    </div>
                )}
                
                {/* Contenido del Modal (Vista Vertical) */}
                <div className="space-y-4">
                    {/* --- (NUEVO) Botón de 'Atrás' para navegación interna --- */}
                    {history.length > 1 && (
                        <button onClick={handleGoBack} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors">
                            <ArrowLeft size={18} />
                            Volver a {formatAnimalDisplay(history[history.length - 2]?.animal)}
                        </button>
                    )}

                    {/* Tarjeta del Animal Actual (en el nivel de la pila) */}
                    <div className="bg-brand-glass rounded-xl p-4 border border-brand-border text-center">
                        <p className="text-sm text-zinc-400">Mostrando padres de:</p>
                        <h3 className="text-2xl font-mono font-bold text-white">{formatAnimalDisplay(currentAnimalNode?.animal)}</h3>
                        <p className="text-sm text-zinc-300">{currentAnimalNode?.animal.breed || 'Raza no definida'}</p>
                    </div>

                    {/* Lista de Padres */}
                    <PedigreeListCard 
                        label="Padre (Reproductor)"
                        animal={currentAnimalNode?.sire?.animal}
                        onNavigate={() => currentAnimalNode?.sire && handleNavigate(currentAnimalNode.sire.animal.id)}
                        onDrillDown={() => handleDrillDown(currentAnimalNode?.sire)}
                        hasParents={!!(currentAnimalNode?.sire?.sire || currentAnimalNode?.sire?.dam)}
                    />
                    
                    <PedigreeListCard 
                        label="Madre"
                        animal={currentAnimalNode?.dam?.animal}
                        onNavigate={() => currentAnimalNode?.dam && handleNavigate(currentAnimalNode.dam.animal.id)}
                        onDrillDown={() => handleDrillDown(currentAnimalNode?.dam)}
                        hasParents={!!(currentAnimalNode?.dam?.sire || currentAnimalNode?.dam?.dam)}
                    />
                </div>
            </div>
            
            {/* Footer con botón de exportar */}
            <footer className="mt-6 pt-4 border-t border-brand-border flex justify-between gap-3">
                 <button
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-zinc-600 hover:bg-zinc-500 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                 >
                     <Printer size={18} /> Exportar a PDF
                 </button>
                 <button onClick={onClose} disabled={isExporting} className="bg-brand-blue hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50">
                    Cerrar
                 </button>
            </footer>

            {/* --- (NUEVO) Gráfico horizontal oculto para la exportación a PDF --- */}
            <HiddenPdfChart ref={pdfChartRef} rootNode={pedigreeRoot} />

        </Modal>
    );
};