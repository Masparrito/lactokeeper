import React from 'react';
import { Modal } from './Modal';
import { STATUS_DEFINITIONS, AnimalStatusKey } from '../../hooks/useAnimalStatus';

interface StatusLegendModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Lista de todas las llaves de estado para mostrar en la leyenda
const ALL_STATUS_KEYS: AnimalStatusKey[] = [
    'MILKING',
    'DRYING_OFF',
    'DRY',
    'PREGNANT',
    'IN_SERVICE_CONFIRMED',
    'IN_SERVICE',
    'EMPTY',
    'SIRE_IN_SERVICE',
];

export const StatusLegendModal: React.FC<StatusLegendModalProps> = ({ isOpen, onClose }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Leyenda de Estados">
            <div className="flex flex-col space-y-3">
                {ALL_STATUS_KEYS.map((key) => {
                    const status = STATUS_DEFINITIONS[key];
                    if (!status) return null;

                    const { Icon, color, label } = status;

                    return (
                        <div key={key} className="flex items-center space-x-3 p-2 bg-black/20 rounded-lg">
                            <div className="flex-shrink-0">
                                <Icon className={`${color} w-6 h-6`} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className={`font-semibold ${color}`}>{label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Modal>
    );
};