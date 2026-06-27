import React from 'react';
import { Animal } from '../../db/local';
import { MoreHorizontal, MapPin, CheckCircle2 } from 'lucide-react';
import { formatAge } from '../../utils/calculations';
import { StatusIcons } from '../icons/StatusIcons';
import { useAnimalStatus } from '../../hooks/useAnimalStatus';

interface SwipeableAnimalCardProps {
    animal: Animal;
    onSelect: (animalId: string) => void;
    onOpenActions: (animal: Animal) => void;
    isSelectionMode: boolean;
    isSelected: boolean;
}

export const SwipeableAnimalCard: React.FC<SwipeableAnimalCardProps> = ({ 
    animal, 
    onSelect, 
    onOpenActions,
    isSelectionMode,
    isSelected
}) => {
    // Obtenemos los iconos de estado (Preñada, Seca, etc.) para mostrarlos limpios
    const statuses = useAnimalStatus(animal);

    return (
        <div className="relative mb-3 group">
            <div 
                onClick={() => onSelect(animal.id)}
                className={`
                    relative w-full rounded-2xl p-4 transition-all duration-200 border
                    ${isSelected
                        ? 'bg-c-accent-sky/10 border-c-accent-sky'
                        : 'bg-c-surface border-c-border hover:border-c-border-strong active:scale-[0.99]'
                    }
                `}
            >
                <div className="flex items-start justify-between">
                    
                    {/* --- IZQUIERDA: Checkbox (Modo Selección) o Info --- */}
                    <div className="flex items-start gap-3 overflow-hidden">
                        
                        {/* Checkbox animado para modo selección */}
                        {isSelectionMode && (
                            <div className={`
                                mt-1 w-5 h-5 rounded-full border flex items-center justify-center transition-all
                                ${isSelected
                                    ? 'bg-c-accent-sky border-c-accent-sky'
                                    : 'border-c-border-strong bg-transparent'
                                }
                            `}>
                                {isSelected && <CheckCircle2 size={14} className="text-white" />}
                            </div>
                        )}

                        <div className="flex flex-col min-w-0">
                            {/* Línea 1: ID y Nombre */}
                            <div className="flex items-baseline gap-2">
                                <span className={`text-lg font-bold font-mono tracking-tight ${isSelected ? 'text-c-accent-sky' : 'text-c-text'}`}>
                                    {animal.id}
                                </span>
                                {animal.name && (
                                    <span className="text-sm text-c-text-muted truncate max-w-[120px]">
                                        {animal.name}
                                    </span>
                                )}
                            </div>

                            {/* Línea 2: Categoría y Edad */}
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-semibold text-c-text-muted bg-c-surface-2 px-2 py-0.5 rounded-md">
                                    {animal.lifecycleStage || 'Sin Categoría'}
                                </span>
                                <span className="text-xs text-c-text-faint">
                                    • {formatAge(animal.birthDate)}
                                </span>
                            </div>

                            {/* Línea 3: Ubicación */}
                            <div className="flex items-center gap-1 mt-2 text-c-text-faint">
                                <MapPin size={12} />
                                <span className="text-xs">
                                    {animal.location || 'Sin Ubicación'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* --- DERECHA: Iconos de Estado y Botón de Acción --- */}
                    <div className="flex flex-col items-end gap-2">
                        
                        {!isSelectionMode && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenActions(animal);
                                }}
                                className="p-2 -mr-2 -mt-2 text-c-text-faint hover:text-c-text transition-colors"
                            >
                                <MoreHorizontal size={20} />
                            </button>
                        )}

                        {/* Iconos de estado (Preñada, Ordeño, etc.) */}
                        <div className="mt-1">
                            <StatusIcons statuses={statuses} sex={animal.sex} size={16} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};