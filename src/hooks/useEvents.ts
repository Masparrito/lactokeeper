// src/hooks/useEvents.ts (Corregido)

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal, Event } from '../db/local';
import { formatAnimalDisplay } from '../utils/formatting';

export interface TimelineEvent {
    id: string;
    animalId: string;
    date: string; // Fecha del evento (YYYY-MM-DD)
    type: string; // Tipo de evento (para el icono y título)
    details: string; // Descripción
    notes?: string; 
}

const daysBetween = (dateStr1: string, dateStr2: string): number => {
    if (!dateStr1 || dateStr1 === 'N/A' || !dateStr2 || dateStr2 === 'N/A') return 0;
    const date1 = new Date(dateStr1 + 'T00:00:00Z');
    const date2 = new Date(dateStr2 + 'T00:00:00Z');
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const useEvents = (animalId: string | undefined): TimelineEvent[] => {
    
    const { 
        animals, 
        parturitions, 
        serviceRecords, 
        bodyWeighings, 
        fathers,
        appConfig,
        sireLots,
        events 
    } = useData();

    const allFathers = useMemo(() => {
        const internalSires: (Partial<Animal> & { id: string })[] = animals.filter(a => a.sex === 'Macho');
        const externalSires: (Partial<Animal> & { id: string })[] = fathers.map(f => ({
            id: f.id, name: f.name, isReference: true,
        }));
        const map = new Map<string, (Partial<Animal> & { id: string })>();
        [...internalSires, ...externalSires].forEach(f => map.set(f.id, f));
        return map;
    }, [animals, fathers]);

    const animalEvents = useMemo(() => {
        if (!animalId) return [];
        
        const animal = animals.find(a => a.id === animalId);
        if (!animal) return [];

        const allEvents: TimelineEvent[] = [];

        // --- Evento de Nacimiento o Registro ---
        if (animal.motherId) {
            const birthEvent = events.find(e => e.animalId === animal.id && e.type === 'Nacimiento');
            allEvents.push({
                id: birthEvent?.id || `${animal.id}_birth`, 
                animalId: animal.id,
                date: animal.birthDate,
                type: 'Nacimiento',
                details: birthEvent?.details || `Nacimiento en finca. ${animal.birthWeight ? `Peso: ${animal.birthWeight} Kg.` : ''} Tipo: ${animal.parturitionType || 'Simple'}.`,
                notes: birthEvent?.notes
            });
        } else {
            allEvents.push({
                id: 'manual-registration-event', 
                animalId: animal.id,
                date: new Date(animal.createdAt || Date.now()).toISOString().split('T')[0],
                type: 'Registro',
                details: 'Animal registrado en el sistema.'
            });
        }

        // --- Eventos de Parto (Unificando Mortinatos) ---
        const animalParturitions = parturitions.filter(p => p.goatId === animalId);
        const animalEventsMap = new Map<string, Event>();
        events.filter(e => e.animalId === animalId && (e.type === 'Parto' || e.type === 'Aborto'))
              .forEach(e => {
                  const key = `${e.date}_${e.type}`;
                  if (!animalEventsMap.has(key)) {
                      animalEventsMap.set(key, e);
                  }
              });

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
            
            const matchingEvent = animalEventsMap.get(`${p.parturitionDate}_${type}`);

            allEvents.push({ 
                id: matchingEvent?.id || p.id, 
                animalId: p.goatId, 
                type, 
                date: p.parturitionDate, 
                details: matchingEvent?.details || details, 
                notes: matchingEvent?.notes 
            });
        }

        // --- Eventos de Servicio Visto ---
        const animalServices = serviceRecords.filter(s => s.femaleId === animalId);
        for (const s of animalServices) {
             const sireLot = sireLots.find(sl => sl.id === s.sireLotId);
             const sire = sireLot ? allFathers.get(sireLot.sireId) : null;
             const sireName = sire ? formatAnimalDisplay(sire) : 'Padre Desc.';
             const matchingEvent = events.find(e => e.animalId === s.femaleId && e.date === s.serviceDate && e.type === 'Servicio');

             allEvents.push({
                id: matchingEvent?.id || s.id,
                animalId: s.femaleId,
                type: 'Servicio',
                date: s.serviceDate, // <-- 'date' está presente
                details: matchingEvent?.details || `Servicio reportado con ${sireName}.`,
                notes: matchingEvent?.notes
             });
        }
        
        // --- Evento de Destete ---
        if (animal.weaningDate && animal.weaningWeight) {
             const ageAtWeaning = daysBetween(animal.birthDate, animal.weaningDate);
             const matchingEvent = events.find(e => e.animalId === animal.id && e.date === animal.weaningDate && e.type === 'Cambio de Estado');
             
             allEvents.push({
                id: matchingEvent?.id || `${animal.id}_wean`,
                animalId: animal.id,
                date: animal.weaningDate, // <-- 'date' está presente
                type: 'Destete',
                details: matchingEvent?.details || `Destetado con ${animal.weaningWeight} Kg a los ${ageAtWeaning} días.`,
                notes: matchingEvent?.notes
             });
        }

        // --- Hitos de Peso ---
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
            const bwEventsMap = new Map<string, Event>();
            events.filter(e => e.animalId === animal.id && e.type === 'Pesaje Corporal')
                  .forEach(e => bwEventsMap.set(e.date, e));

            for (const w of weights) {
                const ageAtWeighing = daysBetween(animal.birthDate, w.date);
                
                for (const hito of hitos) {
                    if (foundHitos.has(hito.key)) continue;
                    
                    if (Math.abs(ageAtWeighing - hito.days) <= 15) {
                        const matchingEvent = bwEventsMap.get(w.date);
                        allEvents.push({
                            id: matchingEvent?.id || w.id,
                            animalId: w.animalId,
                            type: 'Hito de Peso',
                            date: w.date, // <-- 'date' está presente
                            details: matchingEvent?.details || `Peso (${hito.label}): ${w.kg} Kg a los ${ageAtWeighing} días.`,
                            notes: matchingEvent?.notes
                        });
                        foundHitos.add(hito.key);
                        break;
                    }
                }
            }
        }
        
        // --- Evento de Dar de Baja (AQUÍ ESTABA EL ERROR) ---
        if (animal.status !== 'Activo') {
             const matchingEvent = events.find(e => e.animalId === animal.id && e.date === animal.endDate && e.type === 'Cambio de Estado');
             allEvents.push({
                id: matchingEvent?.id || `${animal.id}_decom`,
                animalId: animal.id,
                // --- CORRECCIÓN: La propiedad 'date' faltaba ---
                date: animal.endDate || new Date().toISOString().split('T')[0],
                type: 'Baja de Rebaño',
                details: matchingEvent?.details || `Dado de baja por: ${animal.status}. ${animal.cullReason || animal.deathReason || animal.saleBuyer || ''}`,
                notes: matchingEvent?.notes
             });
        }
        
        // (Lógica de Plan Sanitario bloqueada)

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
        sireLots,
        events 
    ]);

    return animalEvents;
};