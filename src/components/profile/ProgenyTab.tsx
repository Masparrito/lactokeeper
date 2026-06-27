// src/components/profile/ProgenyTab.tsx
// Componente para la pestaña de Progenie

import React from 'react';
import { ChevronRight } from 'lucide-react';
import type { PageState } from '../../types/navigation';
import { Animal } from '../../db/local';
import { formatAge } from '../../utils/calculations';

interface ProgenyTabProps {
    offspring: Animal[];
    navigateTo: (page: PageState) => void;
}

export const ProgenyTab: React.FC<ProgenyTabProps> = ({ offspring, navigateTo }) => {
    if (offspring.length === 0) {
        return <div className="text-center p-8 text-c-text-faint">Este animal no tiene descendencia registrada.</div>;
    }
    return (
        <div className="space-y-2">
            {offspring.map(child => {
                const formattedName = child.name ? String(child.name).toUpperCase().trim() : '';
                return (
                    <button
                        key={child.id}
                        onClick={() => navigateTo({ name: 'rebano-profile', animalId: child.id })}
                        className="w-full text-left p-3 bg-c-surface-2 hover:bg-c-surface-2 rounded-lg transition-colors flex justify-between items-center group"
                    >
                        <div className="min-w-0 pr-3">
                            <p className="font-mono font-semibold text-base text-c-text truncate">{child.id.toUpperCase()}</p>
                            {formattedName && (<p className="text-sm font-normal text-c-text-strong truncate">{formattedName}</p>)}
                            <div className="text-xs text-c-text-faint mt-1 min-h-[1rem] truncate">
                                <span>{child.sex} | {formatAge(child.birthDate)} | Lote: {child.location || 'N/A'}</span>
                            </div>
                        </div>
                        <ChevronRight className="text-c-text-faint group-hover:text-c-text transition-colors flex-shrink-0" />
                    </button>
                )
            })}
        </div>
    );
};