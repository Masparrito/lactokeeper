// src/pages/modules/shared/NewWeighingSessionFlow.tsx (CORRECTO - SIN CAMBIOS)

import React, { useState } from 'react';
import { useData } from '../../../context/DataContext';
import { AdvancedAnimalSelector } from '../../../components/ui/AdvancedAnimalSelector';
import { Animal } from '../../../db/local';

/**
 * Define las propiedades para el componente de flujo de nueva sesión.
 * @param weightType - El tipo de pesaje que se está creando ('leche' o 'corporal').
 * @param onBack - Función para cancelar el flujo y volver atrás.
 * @param onAnimalsSelected - Callback que se ejecuta cuando el usuario ha seleccionado los animales,
 * pasando los IDs y los objetos completos de los animales seleccionados.
 */
interface NewWeighingSessionFlowProps {
  weightType: 'leche' | 'corporal'; // <-- Este tipo es el correcto
  onBack: () => void;
  onAnimalsSelected: (selectedIds: string[], selectedAnimals: Animal[]) => void;
}

/**
 * Este componente orquesta el primer paso para crear una nueva sesión de pesaje:
 * la selección de animales. Utiliza el AdvancedAnimalSelector con filtros inteligentes
 * basados en el tipo de pesaje.
 */
export const NewWeighingSessionFlow: React.FC<NewWeighingSessionFlowProps> = ({
  weightType,
  onBack,
  onAnimalsSelected,
}) => {
  const { animals, parturitions, serviceRecords, breedingSeasons, sireLots, appConfig } = useData();
  const [isSelectorOpen, setIsSelectorOpen] = useState(true); // El selector se abre inmediatamente

  const title = `Nueva Sesión de Peso ${weightType === 'corporal' ? 'Corporal' : 'Lechero'}`;

  const handleSelect = (selectedIds: string[]) => {
    const selectedAnimalObjects = animals.filter(animal => selectedIds.includes(animal.id));
    onAnimalsSelected(selectedIds, selectedAnimalObjects);
    setIsSelectorOpen(false);
  };

  const handleClose = () => {
    setIsSelectorOpen(false);
    onBack();
  };

  return (
    <AdvancedAnimalSelector
      isOpen={isSelectorOpen}
      onClose={handleClose}
      onSelect={handleSelect}
      animals={animals}
      parturitions={parturitions}
      serviceRecords={serviceRecords}
      breedingSeasons={breedingSeasons}
      sireLots={sireLots}
      appConfig={appConfig}
      title={title}
      sessionType={weightType} // <- La propiedad clave que activa los filtros inteligentes
    />
  );
};