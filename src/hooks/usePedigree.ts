// src/hooks/usePedigree.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local';

// La estructura para el árbol de pedigrí no cambia.
export interface PedigreeNode {
    animal: Animal;
    sire?: PedigreeNode;
    dam?: PedigreeNode;
}

/**
 * Hook para construir el árbol genealógico de un animal.
 * @param animalId - El ID del animal para el cual se quiere construir el pedigrí.
 * @returns Un objeto PedigreeNode que representa la raíz del árbol genealógico.
 */
export const usePedigree = (animalId: string | undefined): PedigreeNode | null => {
    const { animals } = useData();

    const animalsMap = useMemo(() => {
        const map = new Map<string, Animal>();
        animals.forEach(animal => map.set(animal.id, animal));
        return map;
    }, [animals]);

    const pedigreeTree = useMemo(() => {
        
        const findAncestors = (currentId: string | undefined, depth: number): PedigreeNode | undefined => {
            // --- CAMBIO CLAVE: Se aumenta la profundidad de 2 a 3 ---
            // Ahora la búsqueda se detendrá después de los bisabuelos.
            if (!currentId || depth > 3) {
                return undefined;
            }

            const animal = animalsMap.get(currentId);
            if (!animal) {
                return undefined;
            }
            
            const sireNode = findAncestors(animal.fatherId, depth + 1);
            const damNode = findAncestors(animal.motherId, depth + 1);

            return {
                animal,
                sire: sireNode,
                dam: damNode,
            };
        };

        const rootNode = findAncestors(animalId, 0);
        
        return rootNode || null;

    }, [animalId, animalsMap]);

    return pedigreeTree;
};