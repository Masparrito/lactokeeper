// src/components/pedigree/PedigreeChart.tsx

import React from 'react';
import { Animal } from '../../db/local';
import { PedigreeNode } from '../../hooks/usePedigree';

// --- Tarjeta de Ancestro (sigue siendo un botón) ---
const AncestorCard = ({ animal, onClick }: { animal: Animal | undefined, onClick: (id: string) => void }) => {
    const cardBaseClasses = "bg-zinc-800/80 p-2 rounded-lg border border-zinc-700/80 w-32 text-center shadow-md transition-colors text-xs"; // Tamaño ajustado para 4 generaciones

    if (!animal) {
        return (
            <div className={`${cardBaseClasses} bg-zinc-900/50 border-dashed`}>
                <p className="font-semibold text-zinc-500">Desconocido</p>
            </div>
        );
    }

    const genderColor = animal.sex === 'Hembra' ? 'text-pink-400' : 'text-blue-400';

    return (
        <button 
            onClick={() => onClick(animal.id)}
            className={`${cardBaseClasses} hover:border-brand-orange`}
        >
            <p className={`font-bold truncate ${genderColor}`}>{animal.id}</p>
            <p className="text-zinc-400">{animal.sex}</p>
        </button>
    );
};

interface PedigreeChartProps {
    rootNode: PedigreeNode | null;
    onAncestorClick: (animalId: string) => void;
}

export const PedigreeChart: React.FC<PedigreeChartProps> = ({ rootNode, onAncestorClick }) => {
    if (!rootNode) {
        return <div className="text-center p-8 text-zinc-500">No hay datos de genealogía suficientes para mostrar el pedigrí.</div>;
    }

    // --- LÓGICA DE ESTILOS PARA LOS CONECTORES (MÁS COMPLEJA) ---
    const lineClasses = "border-zinc-600";
    const hLine = <div className={`w-4 border-t-2 ${lineClasses}`}></div>;

    return (
        <div className="flex items-center justify-center p-4 overflow-x-auto">
            
            {/* Columna 1: Animal Principal */}
            <div className="flex flex-col items-center justify-center">
                <div className="bg-zinc-800/80 p-2 rounded-lg border border-zinc-700/80 w-32 text-center shadow-md text-xs">
                    <p className={`font-bold truncate ${rootNode.animal.sex === 'Hembra' ? 'text-pink-400' : 'text-blue-400'}`}>{rootNode.animal.id}</p>
                    <p className="text-zinc-400">{rootNode.animal.sex}</p>
                </div>
            </div>

            {/* Columna 2: Padres */}
            <div className="flex flex-col items-center">
                {hLine}
                <div className={`h-20 border-r-2 ${lineClasses}`}></div>
                {hLine}
            </div>
            <div className="flex flex-col items-center justify-around">
                <AncestorCard animal={rootNode.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.animal} onClick={onAncestorClick} />
            </div>

            {/* Columna 3: Abuelos */}
            <div className="flex flex-col items-center justify-around">
                <div className="flex items-center">
                    {hLine}
                    <div className={`h-10 border-r-2 ${lineClasses}`}></div>
                    {hLine}
                </div>
                <div className="flex items-center">
                    {hLine}
                    <div className={`h-10 border-r-2 ${lineClasses}`}></div>
                    {hLine}
                </div>
            </div>
            <div className="flex flex-col items-center justify-around gap-[24px]">
                <AncestorCard animal={rootNode.sire?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.dam?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.dam?.animal} onClick={onAncestorClick} />
            </div>
            
            {/* --- NUEVO: Columna 4: Bisabuelos --- */}
            <div className="flex flex-col items-center justify-around gap-[24px]">
                <div className="flex items-center"> {hLine} <div className={`h-6 border-r-2 ${lineClasses}`}></div> {hLine} </div>
                <div className="flex items-center"> {hLine} <div className={`h-6 border-r-2 ${lineClasses}`}></div> {hLine} </div>
                <div className="flex items-center"> {hLine} <div className={`h-6 border-r-2 ${lineClasses}`}></div> {hLine} </div>
                <div className="flex items-center"> {hLine} <div className={`h-6 border-r-2 ${lineClasses}`}></div> {hLine} </div>
            </div>
            <div className="flex flex-col items-center justify-around gap-[8px]">
                <AncestorCard animal={rootNode.sire?.sire?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.sire?.dam?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.dam?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.sire?.dam?.dam?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.sire?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.sire?.dam?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.dam?.sire?.animal} onClick={onAncestorClick} />
                <AncestorCard animal={rootNode.dam?.dam?.dam?.animal} onClick={onAncestorClick} />
            </div>
        </div>
    );
};