// src/components/pedigree/PedigreeChart.tsx

import React from 'react'; // React import needed for JSX
import { Animal } from '../../db/local'; // Import the Animal type
import { PedigreeNode } from '../../hooks/usePedigree'; // Import the PedigreeNode type from your hook
import { formatAnimalDisplay } from '../../utils/formatting'; // <--- IMPORTACIÓN AÑADIDA

// --- Tarjeta de Ancestro (Modificada) ---
const AncestorCard = ({ animal, onClick }: { animal: Animal | undefined, onClick: (id: string) => void }) => {
    // --- CORRECCIÓN AQUÍ: Aumentar ancho y ajustar padding ---
    const cardBaseClasses = "bg-zinc-800/80 p-1.5 rounded-lg border border-zinc-700/80 w-44 text-center shadow-md transition-colors text-xs"; // Ancho aumentado a w-44, padding p-1.5

    // Style for unknown ancestor
    if (!animal) {
        return (
            <div className={`${cardBaseClasses} bg-zinc-900/50 border-dashed`}>
                <p className="font-semibold text-zinc-500">Desconocido</p>
            </div>
        );
    }

    // Determine color based on sex
    const genderColor = animal.sex === 'Hembra' ? 'text-pink-400' : 'text-blue-400';

    return (
        // Button allows clicking to navigate to the ancestor's profile
        <button
            onClick={() => onClick(animal.id)} // Call handler with animal ID
            className={`${cardBaseClasses} hover:border-brand-orange`} // Add hover effect
        >
            {/* --- CORRECCIÓN AQUÍ: Añadir 'truncate' --- */}
            <p className={`font-bold truncate ${genderColor}`}>{formatAnimalDisplay(animal)}</p>
            <p className="text-zinc-400">{animal.sex}</p> {/* Show sex */}
        </button>
    );
};

// --- Props for the main PedigreeChart component ---
interface PedigreeChartProps {
    rootNode: PedigreeNode | null; // The starting node (animal) of the pedigree
    onAncestorClick: (animalId: string) => void; // Function to handle clicks on ancestor cards
}

// --- Componente Principal del Gráfico de Pedigrí ---
export const PedigreeChart: React.FC<PedigreeChartProps> = ({ rootNode, onAncestorClick }) => {
    // Show message if no root node data is available
    if (!rootNode) {
        return <div className="text-center p-8 text-zinc-500">No hay datos de genealogía suficientes para mostrar el pedigrí.</div>;
    }

    // --- Estilos para las líneas conectoras (Ajustados ligeramente para el nuevo ancho) ---
    const lineClasses = "border-zinc-600"; // Color of the lines
    const hLine = <div className={`w-3 border-t-2 ${lineClasses}`}></div>; // w-3 en lugar de w-4 // Horizontal line segment
    // Vertical line segment heights adjusted for 4 generations spacing
    const vLineParent = <div className={`h-20 border-r-2 ${lineClasses}`}></div>;
    const vLineGrandparent = <div className={`h-10 border-r-2 ${lineClasses}`}></div>;
    const vLineGreatGrandparent = <div className={`h-6 border-r-2 ${lineClasses}`}></div>;


    // --- RENDERIZADO DEL GRÁFICO ---
    return (
        // Flex container allowing horizontal layout and scrolling if needed
        <div className="flex items-center justify-center p-4 overflow-x-auto min-w-max"> {/* min-w-max ensures layout doesn't break on small screens */}

            {/* --- Columna 1: Animal Principal (Root Node) (Ajustado ancho) --- */}
            <div className="flex flex-col items-center justify-center">
                {/* Card for the main animal (not clickable via AncestorCard) */}
                 {/* --- CORRECCIÓN AQUÍ: Ancho w-44 y padding p-1.5 --- */}
                <div className="bg-zinc-800/80 p-1.5 rounded-lg border border-zinc-700/80 w-44 text-center shadow-md text-xs">
                    {/* --- CORRECCIÓN AQUÍ: Añadir 'truncate' --- */}
                    <p className={`font-bold truncate ${rootNode.animal.sex === 'Hembra' ? 'text-pink-400' : 'text-blue-400'}`}>
                        {formatAnimalDisplay(rootNode.animal)}
                    </p>
                    <p className="text-zinc-400">{rootNode.animal.sex}</p>
                </div>
            </div>

            {/* --- Conectores a Columna 2 --- */}
            <div className="flex flex-col items-center">
                {hLine}       {/* Horizontal line out */}
                {vLineParent} {/* Vertical line connecting parents */}
                {hLine}       {/* Horizontal line out */}
            </div>

            {/* --- Columna 2: Padres (Sire & Dam) --- */}
            <div className="flex flex-col items-center justify-around space-y-4"> {/* Added space-y-4 */}
                <AncestorCard animal={rootNode.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.animal} onClick={onAncestorClick} />
            </div>

            {/* --- Conectores a Columna 3 --- */}
            <div className="flex flex-col items-center justify-around space-y-4"> {/* Added space-y-4 */}
                {/* Connectors for Sire's parents */}
                <div className="flex items-center"> {hLine} {vLineGrandparent} {hLine} </div>
                {/* Connectors for Dam's parents */}
                <div className="flex items-center"> {hLine} {vLineGrandparent} {hLine} </div>
            </div>

            {/* --- Columna 3: Abuelos --- */}
            {/* Using gap for spacing to align with connectors */}
            <div className="flex flex-col items-center justify-between gap-[20px]"> {/* Gap reducido */}
                <AncestorCard animal={rootNode.sire?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.dam?.animal} onClick={onAncestorClick} />
                {/* Spacer - adjusted height needed between grandparent pairs */}
                <div className="h-[6px]"></div> {/* Spacer reducido */}
                <AncestorCard animal={rootNode.dam?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.dam?.animal} onClick={onAncestorClick} />
            </div>

            {/* --- Conectores a Columna 4 --- */}
            {/* Using gap matching the grandparent column */}
             <div className="flex flex-col items-center justify-between gap-[20px]"> {/* Gap reducido */}
                 {/* Connectors for Sire's Sire's parents */}
                <div className="flex items-center"> {hLine} {vLineGreatGrandparent} {hLine} </div>
                 {/* Connectors for Sire's Dam's parents */}
                <div className="flex items-center"> {hLine} {vLineGreatGrandparent} {hLine} </div>
                 {/* Spacer */}
                 <div className="h-[6px]"></div> {/* Spacer reducido */}
                 {/* Connectors for Dam's Sire's parents */}
                <div className="flex items-center"> {hLine} {vLineGreatGrandparent} {hLine} </div>
                 {/* Connectors for Dam's Dam's parents */}
                <div className="flex items-center"> {hLine} {vLineGreatGrandparent} {hLine} </div>
            </div>

            {/* --- Columna 4: Bisabuelos --- */}
            {/* Using smaller gap between great-grandparent cards */}
            <div className="flex flex-col items-center justify-between gap-[6px]"> {/* Gap reducido */}
                <AncestorCard animal={rootNode.sire?.sire?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.sire?.dam?.animal} onClick={onAncestorClick} />
                {/* Spacer */}
                 <div className="h-[2px]"></div>
                <AncestorCard animal={rootNode.sire?.dam?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.dam?.dam?.animal} onClick={onAncestorClick} />
                 {/* Spacer */}
                 <div className="h-[8px]"></div> {/* Spacer entre ramas */}
                <AncestorCard animal={rootNode.dam?.sire?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.sire?.dam?.animal} onClick={onAncestorClick} />
                 {/* Spacer */}
                 <div className="h-[2px]"></div>
                <AncestorCard animal={rootNode.dam?.dam?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.dam?.dam?.animal} onClick={onAncestorClick} />
            </div>

        </div> // End main flex container
    );
};