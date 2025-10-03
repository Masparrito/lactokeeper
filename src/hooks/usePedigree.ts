import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local';

// Definimos una estructura para el árbol de pedigrí.
// Cada 'node' puede tener un padre (sire) y una madre (dam).
export interface PedigreeNode {
    animal: Animal;
    sire?: PedigreeNode;
    dam?: PedigreeNode;
}

/**
 * Hook para construir el árbol genealógico de un animal hasta 3 generaciones.
 * @param animalId - El ID del animal para el cual se quiere construir el pedigrí.
 * @returns Un objeto PedigreeNode que representa la raíz del árbol genealógico.
 */
export const usePedigree = (animalId: string | undefined): PedigreeNode | null => {
    // Obtenemos la lista completa de animales desde el contexto.
    const { animals } = useData();

    // Creamos un mapa de animales por ID para búsquedas rápidas.
    // Usamos useMemo para que este mapa no se reconstruya en cada render.
    const animalsMap = useMemo(() => {
        const map = new Map<string, Animal>();
        animals.forEach(animal => map.set(animal.id, animal));
        return map;
    }, [animals]);

    // La función principal que construye el árbol.
    // Usamos useMemo para que el pedigrí solo se recalcule si el animalId o el mapa de animales cambian.
    const pedigreeTree = useMemo(() => {
        
        // Función recursiva que busca los ancestros.
        // 'depth' limita la búsqueda para evitar bucles infinitos y mejorar el rendimiento.
        const findAncestors = (currentId: string | undefined, depth: number): PedigreeNode | undefined => {
            // Condición de parada: si no hay ID o hemos llegado a la profundidad máxima (bisabuelos).
            if (!currentId || depth > 2) {
                return undefined;
            }

            // Buscamos el animal actual en nuestro mapa.
            const animal = animalsMap.get(currentId);
            if (!animal) {
                return undefined;
            }
            
            // Llamada recursiva: buscamos al padre (sire) y a la madre (dam) del animal actual,
            // incrementando la profundidad en cada llamada.
            const sireNode = findAncestors(animal.fatherId, depth + 1);
            const damNode = findAncestors(animal.motherId, depth + 1);

            // Construimos y retornamos el 'nodo' para este animal con sus ancestros ya resueltos.
            return {
                animal,
                sire: sireNode,
                dam: damNode,
            };
        };

        // Iniciamos la construcción del árbol desde el animal principal (profundidad 0).
        const rootNode = findAncestors(animalId, 0);
        
        return rootNode || null;

    }, [animalId, animalsMap]);

    return pedigreeTree;
};