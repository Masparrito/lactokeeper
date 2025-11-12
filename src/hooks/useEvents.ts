// src/hooks/useEvents.ts (Corregido)

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal } from '../db/local'; // Solo se necesita Animal
import { formatAnimalDisplay } from '../utils/formatting';
// calculateAgeInDays ya no se importa, usamos daysBetween

// (NUEVO) Definición de la estructura de un Evento unificado
export interface TimelineEvent {
    id: string;
    animalId: string;
    date: string; // Fecha del evento (YYYY-MM-DD)
    type: string; // Tipo de evento (para el icono y título)
    details: string; // Descripción
}

// (NUEVO) Helper para corregir TS2554 (calcula días entre dos fechas)
const daysBetween = (dateStr1: string, dateStr2: string): number => {
    if (!dateStr1 || dateStr1 === 'N/A' || !dateStr2 || dateStr2 === 'N/A') return 0;
    // Asegurar UTC
    const date1 = new Date(dateStr1 + 'T00:00:00Z');
    const date2 = new Date(dateStr2 + 'T00:00:00Z');
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Hook refactorizado (Tarea 4.1) para construir una lista de eventos depurada
 * y completa para un animal, basada en todas las fuentes de datos.
 * @param animalId - El ID del animal para el cual se quieren obtener los eventos.
 * @returns Un array con los eventos del animal.
 */
export const useEvents = (animalId: string | undefined): TimelineEvent[] => {
    
    // 1. Obtener todas las fuentes de datos crudos
    const { 
        animals, 
        parturitions, 
        serviceRecords, 
        bodyWeighings, 
        fathers,
        appConfig, // Necesario para los hitos de peso
        sireLots // (NUEVO) Necesario para corregir TS2339
    } = useData();

    // 2. Memoizar la lista de padres para consulta rápida
    const allFathers = useMemo(() => {
        const internalSires: (Partial<Animal> & { id: string })[] = animals.filter(a => a.sex === 'Macho');
        const externalSires: (Partial<Animal> & { id: string })[] = fathers.map(f => ({
            id: f.id, name: f.name, isReference: true,
        }));
        // Crear un Map para búsqueda rápida por ID
        const map = new Map<string, (Partial<Animal> & { id: string })>();
        [...internalSires, ...externalSires].forEach(f => map.set(f.id, f));
        return map;
    }, [animals, fathers]);

    // 3. Construir la línea de tiempo del animal
    const animalEvents = useMemo(() => {
        if (!animalId) return [];
        
        const animal = animals.find(a => a.id === animalId);
        if (!animal) return [];

        const allEvents: TimelineEvent[] = [];

        // --- Tarea 4.1 / Punto 5: Evento de Nacimiento o Registro ---
        if (animal.motherId) {
            allEvents.push({
                id: `${animal.id}_birth`,
                animalId: animal.id,
                date: animal.birthDate,
                type: 'Nacimiento',
                details: `Nacimiento en finca. ${animal.birthWeight ? `Peso: ${animal.birthWeight} Kg.` : ''} Tipo: ${animal.parturitionType || 'Simple'}.`
            });
        } else {
            allEvents.push({
                id: `${animal.id}_register`,
                animalId: animal.id,
                // (CORREGIDO TS2769) Añadir fallback para createdAt
                date: new Date(animal.createdAt || Date.now()).toISOString().split('T')[0],
                type: 'Registro Manual',
                details: 'Animal registrado manualmente en la app.'
            });
        }

        // --- Tarea 4.1 / Punto 5: Eventos de Parto (Unificando Mortinatos) ---
        const animalParturitions = parturitions.filter(p => p.goatId === animalId);
        for (const p of animalParturitions) {
            const sire = allFathers.get(p.sireId);
            const sireName = sire ? formatAnimalDisplay(sire) : 'Padre Desc.';
            const liveCount = p.liveOffspring?.length || 0;
            const stillCount = p.offspringCount - liveCount;

            let type = 'Parto';
            let details = `Padre: ${sireName}. Crías: ${p.offspringCount} (${p.parturitionType}).`;

            if (p.parturitionOutcome === 'Aborto') {
                type = 'Aborto';
                details = `Reporte de Aborto. (Padre: ${sireName}).`;
            } else if (stillCount > 0 && liveCount === 0) {
                type = 'Aborto / Mortinato';
                details = `Mortinato completo (${stillCount} crías). Padre: ${sireName}.`;
            } else if (stillCount > 0) {
                type = 'Parto con Mortinato';
                details = `Padre: ${sireName}. Crías: ${liveCount} vivas, ${stillCount} mortinatos.`;
            }
            
            allEvents.push({ id: p.id, animalId: p.goatId, type, date: p.parturitionDate, details });
        }

        // --- Tarea 4.1 / Punto 5: Eventos de Servicio Visto ---
        // (CORREGIDO TS2339) Usar sireLots para encontrar el sireId
        const animalServices = serviceRecords.filter(s => s.femaleId === animalId);
        for (const s of animalServices) {
             const sireLot = sireLots.find(sl => sl.id === s.sireLotId);
             const sire = sireLot ? allFathers.get(sireLot.sireId) : null;
             const sireName = sire ? formatAnimalDisplay(sire) : 'Padre Desc.';
             allEvents.push({
                id: s.id,
                animalId: s.femaleId,
                type: 'Servicio Visto',
                date: s.serviceDate,
                details: `Servicio reportado con ${sireName}.`
             });
        }
        
        // --- Tarea 4.1 / Punto 5: Evento de Destete ---
        if (animal.weaningDate && animal.weaningWeight) {
             // (CORREGIDO TS2554) Usar daysBetween
             const ageAtWeaning = daysBetween(animal.birthDate, animal.weaningDate);
             allEvents.push({
                id: `${animal.id}_wean`,
                animalId: animal.id,
                date: animal.weaningDate,
                type: 'Destete',
                details: `Destetado con ${animal.weaningWeight} Kg a los ${ageAtWeaning} días.`
             });
        }

        // --- Tarea 4.1 / Punto 5: Hitos de Peso ---
        if (animal.sex === 'Hembra' && (animal.lifecycleStage === 'Cabritona' || animal.lifecycleStage === 'Cabra')) {
            const weights = bodyWeighings.filter(bw => bw.animalId === animalId);
            const hitos = [
                { days: 90, label: '90 días', key: 'p90' },
                { days: 120, label: '120 días', key: 'p120' },
                { days: 180, label: '180 días', key: 'p180' },
                { days: 270, label: '270 días', key: 'p270' },
                { days: (appConfig.edadPrimerServicioMeses * 30.44), label: '1er Servicio', key: 'pserv'}
            ];
            const foundHitos = new Set<string>();

            for (const w of weights) {
                // (CORREGIDO TS2554) Usar daysBetween
                const ageAtWeighing = daysBetween(animal.birthDate, w.date);
                
                for (const hito of hitos) {
                    if (foundHitos.has(hito.key)) continue;
                    
                    if (Math.abs(ageAtWeighing - hito.days) <= 15) {
                        allEvents.push({
                            id: w.id,
                            animalId: w.animalId,
                            type: 'Hito de Peso',
                            date: w.date,
                            details: `Peso (${hito.label}): ${w.kg} Kg a los ${ageAtWeighing} días.`
                        });
                        foundHitos.add(hito.key);
                        break;
                    }
                }
            }
        }
        
        // --- Tarea 4.1 / Punto 5: Evento de Dar de Baja ---
        if (animal.status !== 'Activo') {
             allEvents.push({
                id: `${animal.id}_decom`,
                animalId: animal.id,
                date: animal.endDate || new Date().toISOString().split('T')[0],
                type: 'Baja de Rebaño',
                details: `Dado de baja por: ${animal.status}. ${animal.cullReason || animal.deathReason || animal.saleBuyer || ''}`
             });
        }
        
        // --- Tarea 4.1 / Punto 5: Evento de Plan Sanitario (BLOQUEADO) ---
        // const healthEvents = healthLog.filter(h => h.animalId === animalId);
        // ... (Esta lógica se añadirá cuando se implemente el Sprint 5) ...


        // 4. Ordenar todos los eventos
        return allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [
        animalId, 
        animals, 
        parturitions, 
        serviceRecords, 
        bodyWeighings, 
        fathers, 
        appConfig,
        sireLots // (NUEVO) Dependencia añadida
    ]);

    return animalEvents;
};