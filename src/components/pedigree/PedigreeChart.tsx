import React from 'react';
// --- CORRECCIÓN ---
// Importamos 'Animal' desde la base de datos y 'PedigreeNode' desde el hook donde fue definido.
import { Animal } from '../../db/local';
import { PedigreeNode } from '../../hooks/usePedigree';

// --- Tarjeta reutilizable para mostrar un ancestro ---
// Maneja el caso en que un ancestro es desconocido.
const AncestorCard = ({ animal }: { animal: Animal | undefined }) => {
    const cardBaseClasses = "bg-zinc-800/80 p-3 rounded-lg border border-zinc-700/80 w-36 text-center shadow-md";

    if (!animal) {
        return (
            <div className={`${cardBaseClasses} bg-zinc-900/50 border-dashed`}>
                <p className="font-semibold text-sm text-zinc-500">Desconocido</p>
            </div>
        );
    }

    const genderColor = animal.sex === 'Hembra' ? 'text-pink-400' : 'text-blue-400';

    return (
        <div className={cardBaseClasses}>
            <p className={`font-bold text-base truncate ${genderColor}`}>{animal.id}</p>
            <p className="text-xs text-zinc-400">{animal.sex}</p>
        </div>
    );
};

// --- Props que el componente principal aceptará ---
interface PedigreeChartProps {
    rootNode: PedigreeNode | null;
}

// --- Componente principal del Gráfico de Pedigrí ---
export const PedigreeChart: React.FC<PedigreeChartProps> = ({ rootNode }) => {
    if (!rootNode) {
        return <div className="text-center p-8 text-zinc-500">No hay datos de genealogía suficientes para mostrar el pedigrí.</div>;
    }

    return (
        <div className="flex items-center justify-center space-x-4 overflow-x-auto p-2">
            
            {/* Columna 1: Animal Principal */}
            <div className="flex items-center">
                <AncestorCard animal={rootNode.animal} />
            </div>

            {/* Conectores y Columna 2: Padres (Sire & Dam) */}
            <div className="flex items-center">
                <div className="w-6 border-t-2 border-b-2 border-l-2 border-zinc-600 h-16 rounded-l-md"></div>
                <div className="flex flex-col space-y-8">
                    <AncestorCard animal={rootNode.sire?.animal} />
                    <AncestorCard animal={rootNode.dam?.animal} />
                </div>
            </div>
            
            {/* Conectores y Columna 3: Abuelos */}
            <div className="flex items-center">
                <div className="flex flex-col space-y-2">
                     {/* Conectores para los abuelos paternos */}
                    <div className="w-6 border-t-2 border-b-2 border-l-2 border-zinc-600 h-12 rounded-l-md"></div>
                     {/* Conectores para los abuelos maternos */}
                    <div className="w-6 border-t-2 border-b-2 border-l-2 border-zinc-600 h-12 rounded-l-md mt-6"></div>
                </div>
                <div className="flex flex-col space-y-2">
                    <AncestorCard animal={rootNode.sire?.sire?.animal} />
                    <AncestorCard animal={rootNode.sire?.dam?.animal} />
                    <AncestorCard animal={rootNode.dam?.sire?.animal} />
                    <AncestorCard animal={rootNode.dam?.dam?.animal} />
                </div>
            </div>

        </div>
    );
};