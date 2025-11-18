// src/components/modals/GrowthChartModal.tsx
// (ACTUALIZADO: Ahora usa el nuevo 'StocksGrowthChart')

import React, { useRef } from 'react';
import { Modal } from '../ui/Modal';
import { Animal } from '../../db/local';
import { formatAnimalDisplay } from '../../utils/formatting';
import { X, Printer } from 'lucide-react';
// --- (NUEVO) Importar el gráfico de Stocks ---
import { StocksGrowthChart } from '../charts/StocksGrowthChart';

interface GrowthChartModalProps {
    isOpen: boolean;
    onClose: () => void;
    chartData: any[];
    animal: Animal;
    onExportPDF: (chartRef: React.RefObject<HTMLDivElement>) => void;
    isExporting: boolean;
}

export const GrowthChartModal: React.FC<GrowthChartModalProps> = ({
    isOpen,
    onClose,
    chartData,
    animal,
    onExportPDF,
    isExporting
}) => {
    
    // El 'ref' ahora apunta al 'div' que contiene el gráfico
    const chartExportRef = useRef<HTMLDivElement>(null);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="fullscreen" title="">
            {/* Contenedor para la exportación a PDF (fondo oscuro) */}
            <div ref={chartExportRef} className="w-full h-full bg-brand-dark flex flex-col p-4">
                
                {/* Header del Modal */}
                <div className="flex justify-between items-center mb-4 flex-shrink-0 px-2 md:px-4">
                    <div className="min-w-0">
                        <h2 className="text-xl md:text-2xl font-bold text-white truncate">
                            Curva de Crecimiento: {formatAnimalDisplay(animal)}
                        </h2>
                        <p className="text-sm text-zinc-400">Use sus dedos para zoom y paneo</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Botón de Exportar PDF */}
                        <button
                            onClick={() => onExportPDF(chartExportRef)}
                            disabled={isExporting}
                            className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            title="Exportar a PDF"
                        >
                            {isExporting ? (
                                <span className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                            ) : (
                                <Printer size={20} />
                            )}
                        </button>
                        
                        {/* Botón de Cerrar */}
                        <button
                            onClick={onClose}
                            className="p-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* --- (ACTUALIZADO) Contenedor del Gráfico --- */}
                {/* 'flex-grow' asegura que ocupe todo el espacio disponible */}
                <div className="flex-grow w-full h-full min-h-0">
                    <StocksGrowthChart
                        animal={animal}
                        chartData={chartData}
                    />
                </div>
            </div>
        </Modal>
    );
};