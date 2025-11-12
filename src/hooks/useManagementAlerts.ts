// src/hooks/useManagementAlerts.ts (CORREGIDO)

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
    calculateAgeInDays, 
    getAnimalZootecnicCategory 
} from '../utils/calculations';
import { 
    Wind, // Secado
    Baby, // Parto / Destete
    Heart, // Para servicio no visto
    ClipboardCheck, // Confirmar
    MoveRight, // Mover Lote
    Scale // Pesar
} from 'lucide-react';
import { formatAnimalDisplay } from '../utils/formatting';
import { DEFAULT_CONFIG } from '../types/config'; // Importar defaults para fallback

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

// Helper para calcular edad en meses
const calculateAgeInMonths = (birthDate: string): number => {
    if (!birthDate || birthDate === 'N/A') return 0;
    const today = new Date();
    const birth = new Date(birthDate);
    let months = (today.getFullYear() - birth.getFullYear()) * 12;
    months -= birth.getMonth();
    months += today.getMonth();
    return months <= 0 ? 0 : months;
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
        // Usar config con fallback
        const config = { ...DEFAULT_CONFIG, ...appConfig };

        const activeAnimals = animals.filter(a => !a.isReference && a.status === 'Activo');
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        
        const generatedAlerts: ManagementAlert[] = [];

        // --- (INICIO CORRECCIÓN REGRESIÓN PUNTO 7) ---
        // Crear un Set con todos los IDs de animales "Nativos"
        // (animales que existen como cría viva en un parto registrado en la app)
        const nativoIds = new Set<string>();
        parturitions.forEach(p => {
            if (p.liveOffspring && p.liveOffspring.length > 0) {
                p.liveOffspring.forEach(kid => {
                    // El ID de la cría (ej. "A001") se guarda en kid.id
                    nativoIds.add(kid.id); 
                });
            }
        });
        // --- (FIN CORRECCIÓN REGRESIÓN PUNTO 7) ---


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
            pesoMinimoDesteteFinal,
            // Tarea 2.3: Configuración de Alerta de Vacías
            edadParaAlertaVaciasMeses,
            pesoPrimerServicioKg
        } = config;

        // 2. PROCESAR CADA ANIMAL ACTIVO
        for (const animal of activeAnimals) {
            
            // --- LÓGICA DE HEMBRAS (REPRODUCTIVO Y SECADO) ---
            if (animal.sex === 'Hembra') {
                const animalServices = serviceRecords
                    .filter(s => s.femaleId === animal.id)
                    .sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
                const lastService = animalServices[0];
                const hasServiceRecord = animalServices.some(sr => sr.femaleId === animal.id && sr.sireLotId === animal.sireLotId);

                const animalParturitions = parturitions
                    .filter(p => p.goatId === animal.id)
                    .sort((a, b) => new Date(b.parturitionDate).getTime() - new Date(a.parturitionDate).getTime());
                const lastParturition = animalParturitions[0];

                // --- ALERTA: Confirmar Preñez ---
                if (animal.reproductiveStatus === 'En Servicio' && lastService && hasServiceRecord) {
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
                            message: `Servicio Visto hace ${daysSinceService} días. Realizar palpación/eco.`,
                            sortDate: serviceDate
                        });
                    }
                }

                // --- Tarea 2.3 / Punto 7: Alerta 1 (Servicio no visto) ---
                if (animal.reproductiveStatus === 'En Servicio' && !hasServiceRecord) {
                    generatedAlerts.push({
                        id: `${animal.id}_servicio_no_visto`,
                        animalId: animal.id,
                        animalDisplay: formatAnimalDisplay(animal),
                        type: 'REPRODUCTIVO',
                        icon: Heart,
                        color: 'text-red-500',
                        title: 'Servicio No Visto',
                        message: `En lote de monta, pero sin servicio reportado. Revisar celo.`,
                        sortDate: today 
                    });
                }
                
                // --- (INICIO CORRECCIÓN) Tarea 2.3 / Punto 7: Alerta 2 (Madura sin peso) ---
                const ageInMonths = calculateAgeInMonths(animal.birthDate);
                
                // Definir si es "Nativo" usando el Set
                const isNativo = nativoIds.has(animal.id); 
                
                if (
                    isNativo && // <-- CORRECCIÓN: Solo aplicar a animales nativos
                    (animal.reproductiveStatus === 'Vacía' || animal.reproductiveStatus === 'Post-Parto') &&
                    ageInMonths >= edadParaAlertaVaciasMeses
                ) {
                    const lastWeight = bodyWeighings
                        .filter(bw => bw.animalId === animal.id)
                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    
                    if (!lastWeight || lastWeight.kg < pesoPrimerServicioKg) {
                         generatedAlerts.push({
                            id: `${animal.id}_sin_peso_monta`,
                            animalId: animal.id,
                            animalDisplay: formatAnimalDisplay(animal),
                            type: 'REPRODUCTIVO',
                            icon: Scale,
                            color: 'text-yellow-400',
                            title: 'Sin Peso de Monta',
                            // (CORRECCIÓN) Mensaje limpiado, ya no incluye "(Nativa)"
                            message: `Edad: ${ageInMonths} meses. Peso actual: ${lastWeight?.kg || 'N/A'} Kg (Meta: ${pesoPrimerServicioKg} Kg).`,
                            sortDate: new Date(animal.birthDate) // Ordenar por edad
                        });
                    }
                }
                // --- (FIN CORRECCIÓN) ---


                // --- ALERTAS DE PREÑEZ (SECADO Y PRE-PARTO) ---
                if (animal.reproductiveStatus === 'Preñada' && lastService) {
                    const serviceDate = new Date(lastService.serviceDate + 'T00:00:00Z');
                    const fpp = addDays(serviceDate, diasGestacion); // Fecha Probable de Parto
                    const daysToParto = getDaysBetween(today, fpp);

                    const isActiveLactation = lastParturition && lastParturition.status === 'activa';

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
            // (CORREGIDO) Pasar 'appConfig'
            const category = getAnimalZootecnicCategory(animal, parturitions, appConfig);
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