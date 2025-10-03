import { useCallback } from 'react';
import { Animal } from '../db/local';

/**
 * Este hook proporciona una función para revisar la genealogía simple (hasta abuelos)
 * y detectar consanguinidad directa.
 */
export const useInbreedingCheck = () => {

    const isRelated = useCallback((femaleId: string, sireId: string, allAnimals: Animal[]): boolean => {
        if (!femaleId || !sireId) return false;

        // Encuentra el registro completo de la hembra
        const female = allAnimals.find(a => a.id === femaleId);
        if (!female) return false;

        // --- CHEQUEO 1: ¿Es hija directa del reproductor? ---
        if (female.fatherId === sireId) {
            return true;
        }

        // --- CHEQUEO 2: ¿Es nieta por parte de madre? (Abuelo Materno) ---
        if (female.motherId) {
            const mother = allAnimals.find(a => a.id === female.motherId);
            if (mother && mother.fatherId === sireId) {
                return true;
            }
        }
        
        // Si no se encontró ninguna relación directa, retorna falso.
        return false;
    }, []);

    return { isRelated };
};