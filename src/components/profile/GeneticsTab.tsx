// src/components/profile/GeneticsTab.tsx
// Componente para la pestaña de Genealogía

import React from 'react';
import { Printer } from 'lucide-react';
import { PedigreeNode } from '../../hooks/usePedigree';
import { PedigreeChart } from '../pedigree/PedigreeChart';
import type { PageState } from '../../types/navigation';
import { Animal } from '../../db/local';

interface GeneticsTabProps {
    animal: Animal;
    rootNode: PedigreeNode | null;
    navigateTo: (page: PageState) => void;
    onExportPDF: () => void;
    isExporting: boolean;
}

export const GeneticsTab: React.FC<GeneticsTabProps> = ({ rootNode, navigateTo, onExportPDF, isExporting }) => {

    const handleAncestorClick = (ancestorId: string) => {
        setTimeout(() => navigateTo({ name: 'rebano-profile', animalId: ancestorId }), 100);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm text-zinc-400">Desliza el gráfico para ver más →</p>
                <button
                    onClick={onExportPDF}
                    disabled={isExporting}
                    className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-1.5 px-3 rounded-lg transition-colors text-sm disabled:opacity-50"
                >
                    <Printer size={16} />
                    {isExporting ? 'Generando...' : 'PDF'}
                </button>
            </div>

            <div className="overflow-x-auto bg-black/20 rounded-lg p-2">
                <PedigreeChart
                    rootNode={rootNode}
                    onAncestorClick={handleAncestorClick}
                />
            </div>
        </div>
    );
};