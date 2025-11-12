import React from 'react';
import { AnimalStatusKey, STATUS_DEFINITIONS } from '../../hooks/useAnimalStatus';
// import { Tooltip } from '../ui/Tooltip'; // Tooltip eliminado

// Usamos el tipo que exportamos del hook para definir las props
type StatusObject = typeof STATUS_DEFINITIONS[AnimalStatusKey];

interface StatusIconsProps {
    statuses: StatusObject[]; // Los estados ACTIVOS
    sex: 'Macho' | 'Hembra';
    size?: number; // Prop de tamaño
    // --- INICIO CORRECCIÓN 1: Prop para ocultar iconos de lactancia ---
    hideLactationStatus?: boolean;
    // --- FIN CORRECCIÓN 1 ---
}

// Todos los iconos posibles para una HEMBRA
const ALL_FEMALE_KEYS: AnimalStatusKey[] = [
    'MILKING',
    'DRYING_OFF',
    'DRY',
    'PREGNANT',
    'IN_SERVICE_CONFIRMED',
    'IN_SERVICE',
    'EMPTY'
];

// Todos los iconos posibles para un MACHO
const ALL_MALE_KEYS: AnimalStatusKey[] = [
    'SIRE_IN_SERVICE'
];

// --- INICIO CORRECCIÓN 1: Set de iconos de lactancia ---
const LACTATION_KEYS = new Set(['MILKING', 'DRYING_OFF', 'DRY']);
// --- FIN CORRECCIÓN 1 ---

// --- INICIO CORRECCIÓN 2: Set de iconos de estado "neutral" (sin punto) ---
const NEUTRAL_KEYS = new Set(['EMPTY', 'DRY']);
// --- FIN CORRECCIÓN 2 ---


export const StatusIcons: React.FC<StatusIconsProps> = ({ 
    statuses, 
    sex, 
    size = 20, 
    // --- INICIO CORRECCIÓN 1: Recibir prop ---
    hideLactationStatus = false 
    // --- FIN CORRECCIÓN 1 ---
}) => {
    
    let relevantKeys = sex === 'Hembra' ? ALL_FEMALE_KEYS : ALL_MALE_KEYS;
    const activeKeys = new Set(statuses.map(s => s.key));

    // --- INICIO CORRECCIÓN 1: Filtrar iconos redundantes ---
    if (hideLactationStatus) {
        relevantKeys = relevantKeys.filter(key => !LACTATION_KEYS.has(key));
    }
    // --- FIN CORRECCIÓN 1 ---

    return (
        <div className="flex items-center space-x-1.5">
            {relevantKeys.map((key) => {
                const definition = STATUS_DEFINITIONS[key];
                if (!definition) return null;

                const { Icon, color, label } = definition;
                const isActive = activeKeys.has(key);

                return (
                    <span key={key} title={label} className="relative">
                        <Icon 
                            className={`transition-colors ${isActive ? color : 'text-zinc-600'}`} 
                            size={size} 
                            strokeWidth={2.5} 
                        />
                        {/* --- INICIO CORRECCIÓN 2: Ocultar punto en estados neutrales --- */}
                        {isActive && !NEUTRAL_KEYS.has(key) && (
                        // --- FIN CORRECCIÓN 2 ---
                            <span className={`absolute -top-0.5 -right-0.5 block w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
                        )}
                    </span>
                );
            })}
        </div>
    );
};