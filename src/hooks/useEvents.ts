// src/hooks/useEvents.ts
import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { Animal, EventType, getEventCategory } from '../db/local';
import { formatAnimalDisplay } from '../utils/formatting';

export interface TimelineEvent {
    id: string;
    animalId: string;
    date: string;
    type: EventType;
    category: 'General' | 'Manejo' | 'Reproductivo' | 'Productivo';
    details: string;
    notes?: string;
    lotName?: string;
    metaWeight?: number;
    metaData?: any;
}

const daysBetween = (dateStr1: string, dateStr2: string): number => {
    if (!dateStr1 || dateStr1 === 'N/A' || !dateStr2 || dateStr2 === 'N/A') return 0;
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (86400000));
};

export const useEvents = (animalId: string | undefined): TimelineEvent[] => {
    
    const { 
        animals, 
        parturitions, 
        serviceRecords, 
        bodyWeighings, 
        weighings, 
        fathers,
        sireLots,
        events,
        healthEvents,
        appConfig 
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

        const timeline: TimelineEvent[] = [];

        // 1. EVENTOS GENERALES
        const originEvent = events.find(e => e.animalId === animal.id && (e.type === 'Nacimiento' || e.type === 'Registro' || e.type === 'Ingreso'));
        
        if (originEvent) {
            timeline.push({
                id: originEvent.id,
                animalId: animal.id,
                date: originEvent.date,
                type: originEvent.type,
                category: 'General',
                details: originEvent.details,
                notes: originEvent.notes
            });
        } else {
            if (animal.motherId) {
                timeline.push({
                    id: `${animal.id}_birth_syn`,
                    animalId: animal.id,
                    date: animal.birthDate,
                    type: 'Nacimiento',
                    category: 'General',
                    details: `Nacimiento en finca. ${animal.birthWeight ? `Peso: ${animal.birthWeight} Kg.` : ''} ${animal.parturitionType ? `Tipo: ${animal.parturitionType}.` : ''}`
                });
            } else {
                timeline.push({
                    id: `${animal.id}_reg_syn`,
                    animalId: animal.id,
                    date: new Date(animal.createdAt || Date.now()).toISOString().split('T')[0],
                    type: 'Registro',
                    category: 'General',
                    details: 'Ingreso al sistema (Animal Fundador/Externo).'
                });
            }
        }

        // 2. EVENTOS DE MANEJO
        bodyWeighings.filter(w => w.animalId === animal.id).forEach(w => {
            timeline.push({
                id: w.id,
                animalId: w.animalId,
                date: w.date,
                type: 'Pesaje Corporal',
                category: 'Manejo',
                details: `Peso registrado: ${w.kg} Kg.`,
                metaWeight: w.kg
            });
        });

        weighings.filter(w => w.goatId === animal.id).forEach(w => {
            timeline.push({
                id: w.id,
                animalId: w.goatId,
                date: w.date,
                type: 'Pesaje Lechero',
                category: 'Manejo',
                details: `Producción: ${w.kg} Kg/L.`
            });
        });

        healthEvents.filter(h => h.animalId === animal.id).forEach(h => {
            timeline.push({
                id: h.id,
                animalId: h.animalId,
                date: h.date,
                type: 'Tratamiento',
                category: 'Manejo',
                details: `${h.type}: ${h.productUsed || 'Producto no esp.'} (${h.doseApplied || ''} ${h.unit || ''}).`,
                notes: h.notes
            });
        });

        const excludedTypes = ['Parto', 'Aborto', 'Servicio', 'Pesaje Corporal', 'Pesaje Lechero', 'Tratamiento', 'Nacimiento', 'Registro', 'Ingreso'];
        events.filter(e => e.animalId === animal.id && !excludedTypes.includes(e.type)).forEach(e => {
            timeline.push({
                id: e.id,
                animalId: e.animalId,
                date: e.date,
                type: e.type,
                category: getEventCategory(e.type),
                details: e.details,
                notes: e.notes,
                lotName: e.lotName,
                metaWeight: e.metaWeight
            });
        });

        // 3. EVENTOS REPRODUCTIVOS
        serviceRecords.filter(s => s.femaleId === animal.id).forEach(s => {
            const lot = sireLots.find(sl => sl.id === s.sireLotId);
            const sire = lot ? allFathers.get(lot.sireId) : null;
            const sireName = sire ? formatAnimalDisplay(sire) : 'Desconocido';
            const probableParturition = new Date(new Date(s.serviceDate).getTime() + (150 * 86400000)).toISOString().split('T')[0];

            timeline.push({
                id: s.id,
                animalId: s.femaleId,
                date: s.serviceDate,
                type: 'Servicio',
                category: 'Reproductivo',
                details: `Servicio con ${sireName}. FPP aprox: ${probableParturition}`
            });
        });

        const animalParturitions = parturitions
            .filter(p => p.goatId === animal.id)
            .sort((a, b) => new Date(a.parturitionDate).getTime() - new Date(b.parturitionDate).getTime());

        animalParturitions.forEach((p, index) => {
            const sire = allFathers.get(p.sireId);
            const sireName = sire ? formatAnimalDisplay(sire) : 'Padre Desc.';
            const liveCount = p.liveOffspring?.length || 0;
            const stillCount = p.offspringCount - liveCount; // <--- VARIABLE QUE DABA ADVERTENCIA
            
            let type: EventType = 'Parto';
            let details = '';

            if (p.parturitionOutcome === 'Aborto') {
                type = 'Aborto';
                details = `Reporte de Aborto. (Padre: ${sireName}).`;
            } else {
                const kidDetails = p.liveOffspring?.map(k => `${k.sex} (${k.birthWeight || '?'}Kg)`).join(', ') || 'Sin datos';
                
                // --- CORRECCIÓN: Usamos 'stillCount' aquí ---
                const stillInfo = stillCount > 0 ? ` (+${stillCount} mortinatos)` : '';
                
                details = `Parto ${p.parturitionType}. Padre: ${sireName}. Crías: ${kidDetails}${stillInfo}.`;
            }

            timeline.push({
                id: p.id,
                animalId: p.goatId,
                date: p.parturitionDate,
                type: type,
                category: 'Reproductivo',
                details: details,
                metaData: p.liveOffspring
            });

            // 4. EVENTOS PRODUCTIVOS DERIVADOS
            const firstMilkWeighing = weighings
                .filter(w => w.goatId === animal.id && w.date >= p.parturitionDate)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

            if (firstMilkWeighing) {
                timeline.push({
                    id: `${p.id}_start_lac`,
                    animalId: animal.id,
                    date: firstMilkWeighing.date,
                    type: 'Inicio Lactancia',
                    category: 'Productivo',
                    details: `Inicio control lechero (Lactancia #${index + 1}). Primer pesaje: ${firstMilkWeighing.kg} Kg.`
                });
            }

            if (p.dryingStartDate || p.status === 'seca') {
                const dryingDate = p.dryingStartDate || new Date().toISOString().split('T')[0];
                const daysInMilk = daysBetween(p.parturitionDate, dryingDate);
                
                timeline.push({
                    id: `${p.id}_dry`,
                    animalId: animal.id,
                    date: dryingDate,
                    type: 'Secado',
                    category: 'Productivo',
                    details: `Fin de Lactancia #${index + 1}. Días en leche: ${daysInMilk}.`
                });
            }
        });

        // 5. Hitos de Crecimiento
        if (animal.sex === 'Hembra' && (animal.lifecycleStage === 'Cabritona' || animal.lifecycleStage === 'Cabra')) {
            const weights = bodyWeighings.filter(bw => bw.animalId === animalId);
            const hitos = [
                { days: 90, label: '90 días', key: 'p90' },
                { days: 180, label: '180 días', key: 'p180' },
                { days: (Number(appConfig.edadPrimerServicioMeses) * 30.44), label: '1er Servicio', key: 'pserv'}
            ];
            
            const usedDates = new Set();

            for (const w of weights) {
                if (usedDates.has(w.date)) continue;
                const ageAtWeighing = daysBetween(animal.birthDate, w.date);
                
                for (const hito of hitos) {
                    if (Math.abs(ageAtWeighing - hito.days) <= 10) {
                        timeline.push({
                            id: `${w.id}_hito`,
                            animalId: w.animalId,
                            date: w.date,
                            type: 'Hito de Crecimiento',
                            category: 'Manejo',
                            details: `Hito ${hito.label} alcanzado: ${w.kg} Kg.`
                        });
                        usedDates.add(w.date);
                        break;
                    }
                }
            }
        }

        return timeline.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [
        animalId, 
        animals, 
        parturitions, 
        serviceRecords, 
        bodyWeighings, 
        weighings,
        fathers, 
        appConfig,
        sireLots,
        events,
        healthEvents
    ]);

    return animalEvents;
};