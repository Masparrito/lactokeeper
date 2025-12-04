import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { 
    calculateAgeInDays, 
    getAnimalZootecnicCategory,
    calculateAgeInMonths 
} from '../utils/calculations';
import { 
    Wind, // Secado
    Baby, // Parto / Destete
    Heart, // Para servicio no visto
    ClipboardCheck, // Confirmar
    MoveRight, // Mover Lote
    Scale, // Pesar
    Sun, // Tratamiento Luz
    Calendar // Calendario
} from 'lucide-react';
import { formatAnimalDisplay } from '../utils/formatting';
import { DEFAULT_CONFIG } from '../types/config'; 

// Definimos la estructura de una Alerta
export interface ManagementAlert {
    id: string;
    animalId: string; // Puede ser ID de animal o ID de Temporada
    animalDisplay: string; // Nombre animal o Nombre Temporada
    type: 'SECADO' | 'REPRODUCTIVO' | 'DESTETE' | 'MANEJO';
    subType?: 'WEANING' | 'SERVICE_WEIGHT' | 'LIGHT_START' | 'LIGHT_END'; 
    icon: React.ElementType;
    color: 'text-blue-400' | 'text-pink-400' | 'text-green-400' | 'text-yellow-400' | 'text-red-500' | 'text-orange-400';
    title: string;
    message: string;
    sortDate: Date; 
    data?: any; // Para pasar datos extra como seasonId
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
        events, 
        breedingSeasons, // <--- NUEVO: Escuchamos temporadas
        appConfig 
    } = useData();

    const alerts = useMemo(() => {
        const config = { ...DEFAULT_CONFIG, ...appConfig };

        const activeAnimals = animals.filter(a => !a.isReference && a.status === 'Activo');
        const today = new Date();
        today.setHours(0, 0, 0, 0); 
        const todayTime = today.getTime();
        
        const generatedAlerts: ManagementAlert[] = [];

        // ---------------------------------------------------------
        // 1. ALERTAS DE TEMPORADA (TRATAMIENTO DE LUZ)
        // ---------------------------------------------------------
        breedingSeasons.forEach(season => {
            // Solo procesar si requiere luz, tiene fecha y no está cerrada/archivada
            if (!season.requiresLightTreatment || !season.lightTreatmentStartDate || season.status === 'Cerrado') return;

            const startDateStr = season.lightTreatmentStartDate;
            const start = new Date(startDateStr + 'T00:00:00');
            const startTime = start.getTime();
            
            // Días faltantes (Negativo = Ya pasó)
            // (Target - Hoy)
            const daysToStart = Math.ceil((startTime - todayTime) / (1000 * 60 * 60 * 24));

            // CASO A: Aún no se ha confirmado el inicio
            if (!season.lightTreatmentConfirmed) {
                
                // Alerta 7 días antes (Recordatorio)
                if (daysToStart === 7) {
                    generatedAlerts.push({
                        id: `light_pre_7_${season.id}`,
                        animalId: season.id,
                        animalDisplay: season.name,
                        type: 'MANEJO',
                        icon: Calendar,
                        color: 'text-yellow-400',
                        title: 'Prep. Tratamiento Luz',
                        message: 'Falta 1 semana para iniciar. Verifica bombillos e instalaciones.',
                        sortDate: today
                    });
                }

                // Alerta 1 día antes (Urgente)
                if (daysToStart === 1) {
                    generatedAlerts.push({
                        id: `light_pre_1_${season.id}`,
                        animalId: season.id,
                        animalDisplay: season.name,
                        type: 'MANEJO',
                        icon: Sun,
                        color: 'text-orange-400',
                        title: 'Luz Mañana 17:30h',
                        message: 'El tratamiento comienza mañana. Ten todo listo.',
                        sortDate: today
                    });
                }

                // Alerta Día D (PERSISTENTE hasta confirmar)
                // Si hoy es el día o ya pasó, y no se ha confirmado...
                if (daysToStart <= 0) {
                    const daysLate = Math.abs(daysToStart);
                    const lateMsg = daysLate > 0 ? ` (Atrasado ${daysLate} días)` : '';
                    
                    generatedAlerts.push({
                        id: `light_start_action_${season.id}`,
                        animalId: season.id,
                        animalDisplay: season.name,
                        type: 'MANEJO',
                        subType: 'LIGHT_START', // <--- Acción especial en UI
                        icon: Sun,
                        color: 'text-red-500', // Rojo para llamar atención
                        title: 'INICIAR LUZ',
                        message: `Encender luces hoy a las 17:30h.${lateMsg} Toca para confirmar inicio.`,
                        sortDate: today,
                        data: { seasonId: season.id }
                    });
                }

            } else {
                // CASO B: Ya se confirmó inicio, monitorear FIN
                // Solo si el estado interno dice que está en curso (o pendiente de fin)
                if (season.lightTreatmentDuration) {
                    const end = new Date(start);
                    end.setDate(start.getDate() + season.lightTreatmentDuration);
                    const endTime = end.getTime();
                    const daysToEnd = Math.ceil((endTime - todayTime) / (1000 * 60 * 60 * 24));

                    // Alerta de Fin (Solo el día exacto)
                    if (daysToEnd === 0) {
                        generatedAlerts.push({
                            id: `light_end_action_${season.id}`,
                            animalId: season.id,
                            animalDisplay: season.name,
                            type: 'MANEJO',
                            subType: 'LIGHT_END',
                            icon: Sun,
                            color: 'text-blue-400',
                            title: 'Finalizar Luz',
                            message: `Hoy se cumplen los ${season.lightTreatmentDuration} días. Apagar sistema y retirar luz extra.`,
                            sortDate: today,
                            data: { seasonId: season.id }
                        });
                    }
                }
            }
        });

        // ---------------------------------------------------------
        // 2. ALERTAS DE ANIMALES (Lógica existente)
        // ---------------------------------------------------------
        
        // Crear Set de animales que YA tienen el evento de "Peso de Monta"
        const animalsWithServiceWeightEvent = new Set<string>();
        events.forEach(e => {
            if (e.type === 'Peso de Monta') {
                animalsWithServiceWeightEvent.add(e.animalId);
            }
        });

        // Config Vars
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
            edadParaAlertaVaciasMeses,
            pesoPrimerServicioKg
        } = config;

        for (const animal of activeAnimals) {
            
            // --- LÓGICA DE HEMBRAS ---
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

                // Confirmar Preñez
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

                // Servicio No Visto
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
                
                // Sin Peso de Monta
                const ageInMonths = calculateAgeInMonths(animal.birthDate);
                const hasClosedCycle = animalsWithServiceWeightEvent.has(animal.id);
                const isInBreedingLot = !!animal.sireLotId; 
                const isReproductiveActive = ['En Servicio', 'Preñada'].includes(animal.reproductiveStatus || '');
                const isAdult = animal.lifecycleStage === 'Cabra';

                if (
                    !hasClosedCycle &&       
                    !isInBreedingLot &&      
                    !isReproductiveActive && 
                    !isAdult &&              
                    (animal.lifecycleStage === 'Cabritona' || animal.lifecycleStage === 'Cabrita') && 
                    (animal.reproductiveStatus === 'Vacía' || animal.reproductiveStatus === 'No Aplica' || animal.reproductiveStatus === 'Post-Parto' || !animal.reproductiveStatus) &&
                    ageInMonths >= edadParaAlertaVaciasMeses
                ) {
                    const lastWeight = bodyWeighings
                        .filter(bw => bw.animalId === animal.id)
                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    
                    if (lastWeight && lastWeight.kg >= pesoPrimerServicioKg) {
                         generatedAlerts.push({
                            id: `${animal.id}_peso_monta_ready`,
                            animalId: animal.id,
                            animalDisplay: formatAnimalDisplay(animal),
                            type: 'REPRODUCTIVO',
                            subType: 'SERVICE_WEIGHT',
                            icon: Scale,
                            color: 'text-pink-400', 
                            title: 'Peso de Monta Alcanzado',
                            message: `Peso actual: ${lastWeight.kg} Kg. Toca para registrar y habilitar servicio.`,
                            sortDate: new Date(lastWeight.date)
                        });
                    }
                }

                // Secado y Pre-parto
                if (animal.reproductiveStatus === 'Preñada' && lastService) {
                    const serviceDate = new Date(lastService.serviceDate + 'T00:00:00Z');
                    const fpp = addDays(serviceDate, diasGestacion); 
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
                
                // Lactancia Larga
                if (lastParturition && lastParturition.status === 'activa' && animal.reproductiveStatus !== 'Preñada') {
                    const parturitionDate = new Date(lastParturition.parturitionDate + 'T00:00:00Z');
                    const del = getDaysBetween(parturitionDate, today);
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
            
            if ((category === 'Cabrita' || category === 'Cabrito') && !animal.weaningDate) {
                const ageInDays = calculateAgeInDays(animal.birthDate);
                const birthDate = new Date((animal.birthDate || today.toISOString()) + 'T00:00:00Z');

                if (ageInDays <= 365) {
                    const lastWeight = bodyWeighings
                        .filter(bw => bw.animalId === animal.id)
                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
                    
                    if (ageInDays >= diasMetaDesteteFinal && lastWeight && lastWeight.kg >= pesoMinimoDesteteFinal) {
                        generatedAlerts.push({
                            id: `${animal.id}_destete_final_ready`,
                            animalId: animal.id,
                            animalDisplay: formatAnimalDisplay(animal),
                            type: 'DESTETE',
                            subType: 'WEANING', 
                            icon: Baby,
                            color: 'text-green-400',
                            title: 'LISTO PARA DESTETE',
                            message: `Edad: ${ageInDays}d. Peso: ${lastWeight.kg} Kg. Toca para confirmar.`,
                            sortDate: birthDate
                        });
                    }
                    else if (ageInDays >= diasAlertaPesarDestete) {
                        generatedAlerts.push({
                            id: `${animal.id}_pesar_destete`,
                            animalId: animal.id,
                            animalDisplay: formatAnimalDisplay(animal),
                            type: 'DESTETE',
                            icon: Scale,
                            color: 'text-yellow-400',
                            title: 'Pesar para Destete',
                            message: `Edad: ${ageInDays} días. Verificar peso (Meta: ${pesoMinimoPesarDestete} Kg).`,
                            sortDate: birthDate
                        });
                    }
                }
            }
        }

        return generatedAlerts.sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    }, [
        animals, 
        parturitions, 
        serviceRecords, 
        bodyWeighings, 
        events, 
        breedingSeasons, // Añadido a dependencias
        appConfig 
    ]);

    return alerts;
};