// src/components/pedigree/PedigreeChart.tsx

import React from 'react'; // React import needed for JSX
import { Animal } from '../../db/local'; // Import the Animal type
import { PedigreeNode } from '../../hooks/usePedigree'; // Import the PedigreeNode type from your hook
// formatAnimalDisplay ya no se usa aquí

// --- Tarjeta de Ancestro (Modificada) ---
const AncestorCard = ({ animal, onClick }: { animal: Animal | undefined, onClick: (id: string) => void }) => {
    // --- CAMBIO: Clases base actualizadas (text-left, px-2) ---
    const cardBaseClasses = "bg-zinc-800/80 p-1.5 rounded-lg border border-zinc-700/80 w-44 text-left shadow-md transition-colors text-xs px-2";

    // Estilo para ancestro desconocido
    if (!animal) {
        return (
            <div className={`${cardBaseClasses} bg-zinc-900/50 border-dashed text-center`}> {/* Centrado solo para 'Desconocido' */}
                <p className="font-semibold text-zinc-500">Desconocido</p>
            </div>
        );
    }

    // Determinar color por sexo
    const genderColor = animal.sex === 'Hembra' ? 'text-pink-400' : 'text-blue-400';
    // --- CAMBIO: Preparar nombre formateado ---
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    return (
        // Botón clickeable
        <button
            onClick={() => onClick(animal.id)}
            className={`${cardBaseClasses} hover:border-brand-orange`}
        >
            {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR (TAMAÑO PEQUEÑO) --- */}
            <p className={`font-mono font-semibold text-xs truncate ${genderColor}`}>
                {animal.id.toUpperCase()}
            </p>
            {formattedName && (
                <p className="text-[10px] text-zinc-300 truncate">{formattedName}</p>
            )}
            <p className="text-zinc-400 text-[10px]">{animal.sex}</p>
            {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
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
    if (!rootNode) {
        return <div className="text-center p-8 text-zinc-500">No hay datos de genealogía suficientes para mostrar el pedigrí.</div>;
    }

    // --- Estilos para las líneas conectoras (Ajustados) ---
    const lineClasses = "border-zinc-600";
    const hLine = <div className={`w-3 border-t-2 ${lineClasses}`}></div>;
    const vLineParent = <div className={`h-20 border-r-2 ${lineClasses}`}></div>;
    const vLineGrandparent = <div className={`h-10 border-r-2 ${lineClasses}`}></div>;
    const vLineGreatGrandparent = <div className={`h-6 border-r-2 ${lineClasses}`}></div>;

    // --- CAMBIO: Preparar nombre formateado para el animal raíz ---
    const rootFormattedName = rootNode.animal.name ? String(rootNode.animal.name).toUpperCase().trim() : '';

    // --- RENDERIZADO DEL GRÁFICO ---
    return (
        <div className="flex items-center justify-center p-4 overflow-x-auto min-w-max">

            {/* --- Columna 1: Animal Principal (Root Node) (Estilo actualizado) --- */}
            <div className="flex flex-col items-center justify-center">
                <div className="bg-zinc-800/80 p-1.5 rounded-lg border border-zinc-700/80 w-44 text-left shadow-md text-xs px-2"> {/* text-left, px-2 */}
                    {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR (TAMAÑO PEQUEÑO) --- */}
                    <p className={`font-mono font-semibold text-xs truncate ${rootNode.animal.sex === 'Hembra' ? 'text-pink-400' : 'text-blue-400'}`}>
                        {rootNode.animal.id.toUpperCase()}
                    </p>
                    {rootFormattedName && (
                        <p className="text-[10px] text-zinc-300 truncate">{rootFormattedName}</p>
                    )}
                    <p className="text-zinc-400 text-[10px]">{rootNode.animal.sex}</p>
                    {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
                </div>
            </div>

            {/* --- Conectores a Columna 2 --- */}
            <div className="flex flex-col items-center">
                {hLine}
                {vLineParent}
                {hLine}
            </div>

            {/* --- Columna 2: Padres (Sire & Dam) --- */}
            <div className="flex flex-col items-center justify-around space-y-4">
                <AncestorCard animal={rootNode.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.animal} onClick={onAncestorClick} />
            </div>

            {/* --- Conectores a Columna 3 --- */}
            <div className="flex flex-col items-center justify-around space-y-4">
                <div className="flex items-center"> {hLine} {vLineGrandparent} {hLine} </div>
                <div className="flex items-center"> {hLine} {vLineGrandparent} {hLine} </div>
            </div>

            {/* --- Columna 3: Abuelos --- */}
            <div className="flex flex-col items-center justify-between gap-[20px]">
                <AncestorCard animal={rootNode.sire?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.dam?.animal} onClick={onAncestorClick} />
                <div className="h-[6px]"></div>
                <AncestorCard animal={rootNode.dam?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.dam?.animal} onClick={onAncestorClick} />
            </div>

            {/* --- Conectores a Columna 4 --- */}
             <div className="flex flex-col items-center justify-between gap-[20px]">
                <div className="flex items-center"> {hLine} {vLineGreatGrandparent} {hLine} </div>
                <div className="flex items-center"> {hLine} {vLineGreatGrandparent} {hLine} </div>
                 <div className="h-[6px]"></div>
                <div className="flex items-center"> {hLine} {vLineGreatGrandparent} {hLine} </div>
                <div className="flex items-center"> {hLine} {vLineGreatGrandparent} {hLine} </div>
            </div>

            {/* --- Columna 4: Bisabuelos --- */}
            <div className="flex flex-col items-center justify-between gap-[6px]">
                <AncestorCard animal={rootNode.sire?.sire?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.sire?.dam?.animal} onClick={onAncestorClick} />
                 <div className="h-[2px]"></div>
                <AncestorCard animal={rootNode.sire?.dam?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.dam?.dam?.animal} onClick={onAncestorClick} />
                 <div className="h-[8px]"></div>
                <AncestorCard animal={rootNode.dam?.sire?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.sire?.dam?.animal} onClick={onAncestorClick} />
                 <div className="h-[2px]"></div>
                <AncestorCard animal={rootNode.dam?.dam?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.dam?.dam?.animal} onClick={onAncestorClick} />
            </div>

        </div> // End main flex container
    );
};