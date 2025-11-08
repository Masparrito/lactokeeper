// src/components/pedigree/PedigreeChart.tsx (Corregido)

import React from 'react'; // React import needed for JSX
import { Animal } from '../../db/local'; // Import the Animal type
import { PedigreeNode } from '../../hooks/usePedigree'; // Import the PedigreeNode type from your hook
// formatAnimalDisplay ya no se usa aquí

// --- (NUEVO) Definición de Tema ---
type ChartTheme = 'light' | 'dark';

// --- Tarjeta de Ancestro (Modificada) ---
const AncestorCard = ({ animal, onClick, theme }: { 
    animal: Animal | undefined, 
    onClick: (id: string) => void,
    theme: ChartTheme // <-- Prop de tema añadida
}) => {
    
    // --- (NUEVO) Estilos dinámicos basados en el tema ---
    const isLight = theme === 'light';
    const cardBaseClasses = `p-1.5 rounded-lg border w-44 text-left shadow-md transition-colors text-xs px-2`;
    
    const themeClasses = isLight 
        ? 'bg-white border-zinc-300 text-black' 
        : 'bg-zinc-800/80 border-zinc-700/80 text-white';

    // Estilo para ancestro desconocido
    if (!animal) {
        return (
            <div className={`${cardBaseClasses} ${isLight ? 'bg-zinc-50 border-dashed' : 'bg-zinc-900/50 border-dashed'} text-center`}> {/* Centrado solo para 'Desconocido' */}
                <p className="font-semibold text-zinc-500">Desconocido</p>
            </div>
        );
    }

    // Determinar color por sexo
    const genderColor = animal.sex === 'Hembra' 
        ? (isLight ? 'text-pink-600' : 'text-pink-400') 
        : (isLight ? 'text-blue-600' : 'text-blue-400');
    
    const formattedName = animal.name ? String(animal.name).toUpperCase().trim() : '';

    return (
        // Botón clickeable
        <button
            onClick={() => onClick(animal.id)}
            className={`${cardBaseClasses} ${themeClasses} ${isLight ? 'hover:border-blue-500' : 'hover:border-brand-orange'}`}
        >
            {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR (TAMAÑO PEQUEÑO) --- */}
            <p className={`font-mono font-semibold text-xs truncate ${genderColor}`}>
                {animal.id.toUpperCase()}
            </p>
            {formattedName && (
                <p className={`text-[10px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'} truncate`}>{formattedName}</p>
            )}
            <p className={`text-[10px] ${isLight ? 'text-zinc-600' : 'text-zinc-400'}`}>{animal.sex}</p>
            {/* --- FIN: APLICACIÓN DEL ESTILO ESTÁNDAR --- */}
        </button>
    );
};

// --- Props for the main PedigreeChart component ---
interface PedigreeChartProps {
    rootNode: PedigreeNode | null; // The starting node (animal) of the pedigree
    onAncestorClick: (animalId: string) => void; // Function to handle clicks on ancestor cards
    theme?: ChartTheme; // <-- (NUEVA) Prop de Tema añadida
}

// --- Componente Principal del Gráfico de Pedigrí ---
export const PedigreeChart: React.FC<PedigreeChartProps> = ({ rootNode, onAncestorClick, theme = 'dark' }) => {
    if (!rootNode) {
        return <div className="text-center p-8 text-zinc-500">No hay datos de genealogía suficientes para mostrar el pedigrí.</div>;
    }

    // --- (NUEVO) Estilos de líneas dinámicos ---
    const isLight = theme === 'light';
    const lineClasses = isLight ? "border-zinc-400" : "border-zinc-600";

    const hLine = <div className={`w-3 border-t-2 ${lineClasses}`}></div>;
    const vLineParent = <div className={`h-20 border-r-2 ${lineClasses}`}></div>;
    const vLineGrandparent = <div className={`h-10 border-r-2 ${lineClasses}`}></div>;
    const vLineGreatGrandparent = <div className={`h-6 border-r-2 ${lineClasses}`}></div>;

    const rootFormattedName = rootNode.animal.name ? String(rootNode.animal.name).toUpperCase().trim() : '';
    
    // --- (NUEVO) Clases de texto dinámicas ---
    const textColor = isLight ? 'text-black' : 'text-white';
    const subTextColor = isLight ? 'text-zinc-600' : 'text-zinc-400';
    const genderColorRoot = rootNode.animal.sex === 'Hembra' 
        ? (isLight ? 'text-pink-600' : 'text-pink-400') 
        : (isLight ? 'text-blue-600' : 'text-blue-400');
    const rootBg = isLight ? 'bg-white border-zinc-300' : 'bg-zinc-800/80 border-zinc-700/80';

    // --- RENDERIZADO DEL GRÁFICO ---
    return (
        <div className="flex items-center justify-center p-4 overflow-x-auto min-w-max">

            {/* --- Columna 1: Animal Principal (Root Node) (Estilo actualizado) --- */}
            <div className="flex flex-col items-center justify-center">
                {/* --- CORRECCIÓN: Añadido {textColor} --- */}
                <div className={`p-1.5 rounded-lg border w-44 text-left shadow-md text-xs px-2 ${rootBg} ${textColor}`}>
                    {/* --- INICIO: APLICACIÓN DEL ESTILO ESTÁNDAR (TAMAÑO PEQUEÑO) --- */}
                    <p className={`font-mono font-semibold text-xs truncate ${genderColorRoot}`}>
                        {rootNode.animal.id.toUpperCase()}
                    </p>
                    {rootFormattedName && (
                        <p className={`text-[10px] ${isLight ? 'text-zinc-700' : 'text-zinc-300'} truncate`}>{rootFormattedName}</p>
                    )}
                    <p className={`text-[10px] ${subTextColor}`}>{rootNode.animal.sex}</p>
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
                <AncestorCard animal={rootNode.sire?.animal} onClick={onAncestorClick} theme={theme} />
                <AncestorCard animal={rootNode.dam?.animal} onClick={onAncestorClick} theme={theme} />
            </div>

            {/* --- Conectores a Columna 3 --- */}
            <div className="flex flex-col items-center justify-around space-y-4">
                <div className="flex items-center"> {hLine} {vLineGrandparent} {hLine} </div>
                <div className="flex items-center"> {hLine} {vLineGrandparent} {hLine} </div>
            </div>

            {/* --- Columna 3: Abuelos --- */}
            <div className="flex flex-col items-center justify-between gap-[20px]">
                <AncestorCard animal={rootNode.sire?.sire?.animal} onClick={onAncestorClick} theme={theme} />
                <AncestorCard animal={rootNode.sire?.dam?.animal} onClick={onAncestorClick} theme={theme} />
                <div className="h-[6px]"></div>
                <AncestorCard animal={rootNode.dam?.sire?.animal} onClick={onAncestorClick} theme={theme} />
                <AncestorCard animal={rootNode.dam?.dam?.animal} onClick={onAncestorClick} theme={theme} />
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
                <AncestorCard animal={rootNode.sire?.sire?.sire?.animal} onClick={onAncestorClick} theme={theme} />
                <AncestorCard animal={rootNode.sire?.sire?.dam?.animal} onClick={onAncestorClick} theme={theme} />
                 <div className="h-[2px]"></div>
                <AncestorCard animal={rootNode.sire?.dam?.sire?.animal} onClick={onAncestorClick} theme={theme} />
                <AncestorCard animal={rootNode.sire?.dam?.dam?.animal} onClick={onAncestorClick} theme={theme} />
                 <div className="h-[8px]"></div>
                <AncestorCard animal={rootNode.dam?.sire?.sire?.animal} onClick={onAncestorClick} theme={theme} />
                <AncestorCard animal={rootNode.dam?.sire?.dam?.animal} onClick={onAncestorClick} theme={theme} />
                 <div className="h-[2px]"></div>
                <AncestorCard animal={rootNode.dam?.dam?.sire?.animal} onClick={onAncestorClick} theme={theme} />
                <AncestorCard animal={rootNode.dam?.dam?.dam?.animal} onClick={onAncestorClick} theme={theme} />
            </div>

        </div> // End main flex container
    );
};