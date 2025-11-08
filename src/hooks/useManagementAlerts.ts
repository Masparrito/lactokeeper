// src/hooks/useManagementAlerts.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
    calculateAgeInDays, 
    getAnimalZootecnicCategory 
} from '../utils/calculations';
// --- CORRECCIÓN: Tipos de 'db/local' eliminados ya que TS los infiere ---
import { 
    Wind, // Secado
    Baby, // Parto / Destete
    // --- CORRECCIÓN: 'Heart' eliminado ya que no se usa ---
    ClipboardCheck, // Confirmar
    MoveRight, // Mover Lote
    Scale // Pesar
} from 'lucide-react';
import { formatAnimalDisplay } from '../utils/formatting';

// Definimos la estructura de una Alerta
export interface ManagementAlert {
    id: string;
    animalId: string;
    animalDisplay: string;
    type: 'SECADO' | 'REPRODUCTIVO' | 'DESTETE';
    icon: React.ElementType;
    color: 'text-blue-400' | 'text-pink-400' | 'text-green-400' | 'text-yellow-400' | 'text-red-500';
    title: string;
    message: string;
    sortDate: Date; // Para ordenar por urgencia
}

// Helper para calcular Fechas
const addDays = (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const getDaysBetween = (date1: Date, date2: Date): number => {
    const diffTime = date2.getTime() - date1.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const useManagementAlerts = () => {
    const { 
        animals, 
        parturitions, 
        serviceRecords, 
        bodyWeighings, 
        appConfig 
    } = useData();

    const alerts = useMemo(() => {
        const activeAnimals = animals.filter(a => !a.isReference && a.status === 'Activo');
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        const generatedAlerts: ManagementAlert[] = [];

        // 1. OBTENER DATOS DE CONFIGURACIÓN
        const {
            diasGestacion,
            diasConfirmarPrenez,
            diasPreParto,
            diasLactanciaObjetivo,
            diasAlertaInicioSecado,
            diasMetaSecadoCompleto,
            diasAlertaPesarDestete,
            pesoMinimoPesarDestete,
            diasMetaDesteteFinal,
            pesoMinimoDesteteFinal
        } = appConfig;

        // 2. PROCESAR CADA ANIMAL ACTIVO
        for (const animal of activeAnimals) {
            
            // --- LÓGICA DE HEMBRAS (REPRODUCTIVO Y SECADO) ---
            if (animal.sex === 'Hembra') {
                const animalServices = serviceRecords
                    .filter(s => s.femaleId === animal.id)
                    .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
                const lastService = animalServices[0];

                const animalParturitions = parturitions
                    .filter(p => p.goatId === animal.id)
                    .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime());
                const lastParturition = animalParturitions[0];

                // --- ALERTA: Confirmar Preñez ---
                if (animal.reproductiveStatus === 'En Servicio' && lastService) {
                    const serviceDate = new Date(lastService.serviceDate + 'T00:00:00Z');
                    const daysSinceService = getDaysBetween(serviceDate, today);

                    if (daysSinceService >= diasConfirmarPrenez && daysSinceService < diasGestacion) {
                        generatedAlerts.push({
                            id: `${animal.id}_confirmar`,
                            animalId: animal.id,
                            animalDisplay: formatAnimalDisplay(animal),
                            type: 'REPRODUCTIVO',
                            icon: ClipboardCheck,
                            color: 'text-yellow-400',
                            title: 'Confirmar Preñez',
                            message: `Servicio hace ${daysSinceService} días. Realizar palpación/eco.`,
                            sortDate: serviceDate
                        });
                    }
                }

                // --- ALERTAS DE PREÑEZ (SECADO Y PRE-PARTO) ---
                if (animal.reproductiveStatus === 'Preñada' && lastService) {
                    const serviceDate = new Date(lastService.serviceDate + 'T00:00:00Z');
                    const fpp = addDays(serviceDate, diasGestacion); // Fecha Probable de Parto
                    const daysToParto = getDaysBetween(today, fpp);

                    const isActiveLactation = lastParturition && lastParturition.status === 'activa';

                    // --- ALERTA: Iniciar Secado (Preñada) ---
                    if (isActiveLactation && daysToParto <= diasAlertaInicioSecado && daysToParto > diasMetaSecadoCompleto) {
                        generatedAlerts.push({
                            id: `${animal.id}_iniciar_secado`,
                            animalId: animal.id,
                            animalDisplay: formatAnimalDisplay(animal),
                            type: 'SECADO',
                            icon: Wind,
                            color: 'text-blue-400',
                            title: 'Iniciar Secado',
                            message: `Faltan ${daysToParto} días para el parto (Inicia a los ${diasAlertaInicioSecado} días).`,
                            sortDate: fpp
                        });
                    }

                    // --- ALERTA: Secado Urgente (Preñada) ---
                    if (isActiveLactation && daysToParto <= diasMetaSecadoCompleto) {
                        generatedAlerts.push({
                            id: `${animal.id}_secado_urgente`,
                            animalId: animal.id,
                            animalDisplay: formatAnimalDisplay(animal),
                            type: 'SECADO',
                            icon: Wind,
                            color: 'text-red-500',
                            title: 'SECADO URGENTE',
                            message: `Faltan ${daysToParto} días para el parto (Meta: ${diasMetaSecadoCompleto} días).`,
                            sortDate: fpp
                        });
                    }

                    // --- ALERTA: Mover a Lote Pre-Parto ---
                    if (daysToParto <= diasPreParto && daysToParto > 0) {
                        generatedAlerts.push({
                            id: `${animal.id}_preparto`,
                            animalId: animal.id,
                            animalDisplay: formatAnimalDisplay(animal),
                            type: 'REPRODUCTIVO',
                            icon: MoveRight,
                            color: 'text-green-400',
                            title: 'Mover a Pre-Parto',
                            message: `Parto probable en ${daysToParto} días.`,
                            sortDate: fpp
                        });
                    }
                }
                
                // --- ALERTA: Secado (Lactancia Larga / Vacía) ---
                if (lastParturition && lastParturition.status === 'activa' && animal.reproductiveStatus !== 'Preñada') {
                    const parturitionDate = new Date(lastParturition.parturitionDate + 'T00:00:00Z');
                    const del = getDaysBetween(parturitionDate, today); // Días en Leche

                    if (del >= diasLactanciaObjetivo) {
                        generatedAlerts.push({
                            id: `${animal.id}_lactancia_larga`,
                            animalId: animal.id,
                            animalDisplay: formatAnimalDisplay(animal),
                            type: 'SECADO',
                            icon: Wind,
                            color: 'text-blue-400',
                            title: 'Secado (Lact. Larga)',
                            message: `${del} días en leche. Iniciar secado.`,
                            sortDate: today
                        });
                    }
                }
            }

            // --- LÓGICA DE CRÍAS (DESTETE) ---
            const category = getAnimalZootecnicCategory(animal, parturitions);
            if (category === 'Cabrita' || category === 'Cabrito') {
                const ageInDays = calculateAgeInDays(animal.birthDate);
                const birthDate = new Date(animal.birthDate + 'T00:00:00Z');

                const lastWeight = bodyWeighings
                    .filter(bw => bw.animalId === animal.id)
                    .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                
                // --- ALERTA: Pesar para Destete (Revisión 1) ---
                if (ageInDays >= diasAlertaPesarDestete && ageInDays < diasMetaDesteteFinal) {
                    const title = 'Pesar (Revisión 1)';
                    let message = `Edad: ${ageInDays} días. Pesar para revisión (Meta: ${pesoMinimoPesarDestete} Kg).`;
                    if (lastWeight && new Date(lastWeight.date) > addDays(birthDate, diasAlertaPesarDestete - 7)) {
                        message = `Edad: ${ageInDays} días. Peso actual: ${lastWeight.kg} Kg (Meta: ${pesoMinimoPesarDestete} Kg).`
                    }

                    generatedAlerts.push({
                        id: `${animal.id}_pesar_destete_1`,
                        animalId: animal.id,
                        animalDisplay: formatAnimalDisplay(animal),
                        type: 'DESTETE',
                        icon: Scale,
                        color: 'text-yellow-400',
                        title: title,
                        message: message,
                        sortDate: birthDate
                    });
                }

                // --- ALERTA: Destete Final (Revisión 2) ---
                if (ageInDays >= diasMetaDesteteFinal) {
                    let title = 'Pesar (Destete Final)';
                    let message = `Edad: ${ageInDays} días. Pesar para destete final (Meta: ${pesoMinimoDesteteFinal} Kg).`;
                    let color: ManagementAlert['color'] = 'text-yellow-400';

                    if (lastWeight && new Date(lastWeight.date) > addDays(birthDate, diasAlertaPesarDestete - 7)) {
                        if (lastWeight.kg >= pesoMinimoDesteteFinal) {
                            title = 'LISTO PARA DESTETE';
                            message = `Edad: ${ageInDays} días. Peso: ${lastWeight.kg} Kg (Meta: ${pesoMinimoDesteteFinal} Kg).`;
                            color = 'text-green-400';
                        } else {
                            title = 'Bajo Peso (Destete Final)';
                            message = `Edad: ${ageInDays} días. Peso: ${lastWeight.kg} Kg (Meta: ${pesoMinimoDesteteFinal} Kg).`;
                            color = 'text-red-500';
                        }
                    }

                    generatedAlerts.push({
                        id: `${animal.id}_destete_final`,
                        animalId: animal.id,
                        animalDisplay: formatAnimalDisplay(animal),
                        type: 'DESTETE',
                        icon: Baby,
                        color: color,
                        title: title,
                        message: message,
                        sortDate: birthDate
                    });
                }
            }
        }

        // 3. ORDENAR Y DEVOLVER
        return generatedAlerts.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    }, [
        animals, 
        parturitions, 
        serviceRecords, 
        bodyWeighings, 
        appConfig 
    ]);

    return alerts;
};