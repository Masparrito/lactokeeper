// src/hooks/useHealthAgenda.ts (CORREGIDO)

import { useMemo } from 'react';
// Asumiendo que estos imports son correctos para tu estructura de proyecto
import { useData } from '../context/DataContext';
import { calculateAgeInDays, getAnimalZootecnicCategory } from '../utils/calculations';
import { Animal, HealthPlan, PlanActivity, Parturition } from '../db/local';
import { useBirthingForecast } from './useBirthingForecast';

export interface AgendaTask {
    key: string;
    id: string; 
    animal: Animal;
    plan: HealthPlan;
    activity: PlanActivity;
    dueDate: Date;
    status: 'Atrasada' | 'Para Hoy' | 'Próxima';
}

export interface GroupedAgendaTask {
    groupKey: string;
    activity: PlanActivity;
    plan: HealthPlan;
    dueDate: Date;
    status: 'Atrasada' | 'Para Hoy' | 'Próxima';
    animalCount: number;
    animals: Animal[];
    tasks: AgendaTask[];
}

// --- INICIO TAREA 6.4: Nuevas Interfaces y Helpers para Agrupación Semanal ---
export interface WeeklyTaskGroup {
    weekKey: string;
    weekLabel: string;
    activities: GroupedAgendaTask[];
}

/**
 * Obtiene el inicio (Lunes) y fin (Domingo) de la semana para una fecha dada.
 */
const getWeekSpan = (date: Date) => {
    const d = new Date(date.getTime());
    d.setUTCHours(0, 0, 0, 0);
    const day = d.getUTCDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const diffToMonday = day === 0 ? -6 : 1 - day; // Ajustar para que la semana empiece en Lunes
    const startOfWeek = new Date(d.setUTCDate(d.getUTCDate() + diffToMonday));
    const endOfWeek = new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000);
    return { startOfWeek, endOfWeek };
};

/**
 * Formatea un rango de fechas en un string legible.
 */
const formatWeekLabel = (startDate: Date, endDate: Date) => {
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    const start = startDate.toLocaleDateString('es-VE', options);
    const end = endDate.toLocaleDateString('es-VE', options);
    return `Semana del ${start} al ${end}`;
};
// --- FIN TAREA 6.4 ---


const getDateForFixedTask = (year: number, month: number, week: number): Date => {
    const targetDayOfMonth = (week - 1) * 7 + 1;
    const date = new Date(Date.UTC(year, month - 1, targetDayOfMonth));
    return date;
};

export const useHealthAgenda = () => {
    const { animals, healthPlans, planActivities, healthEvents, parturitions, appConfig } = useData();
    const { forecastBySeason } = useBirthingForecast();

    const pendingTasks = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const currentYear = today.getUTCFullYear();
        const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

        const DIAS_ALERTA_ATRASO_DEFAULT = 7;

        const generatedTasks: AgendaTask[] = [];

        const activeAnimals = animals.filter(a => a.status === 'Activo' && !a.isReference);

        for (const plan of healthPlans) {
            const applicableAnimals = activeAnimals.filter(animal => {
                const ageInDays = calculateAgeInDays(animal.birthDate);
                if (ageInDays < 0) return false;

                if (plan.targetGroup === 'Maternidad') {
                    return ageInDays <= (appConfig.diasMetaDesteteFinal || 120);
                }

                if (plan.targetGroup === 'Adultos') {
                    if (ageInDays <= (appConfig.diasMetaDesteteFinal || 120)) return false;
                    const hasSubgroups = plan.adultsSubgroup && plan.adultsSubgroup.length > 0;
                    const hasLots = plan.targetLots && plan.targetLots.length > 0;
                    if (!hasSubgroups && !hasLots) return true;

                    // (CORREGIDO) Pasar 'appConfig' como tercer argumento
                    const animalCategory = getAnimalZootecnicCategory(animal, parturitions as Parturition[], appConfig);
                    
                    const inSubgroup = hasSubgroups && plan.adultsSubgroup?.includes(animalCategory as any);
                    const inLot = hasLots && plan.targetLots?.includes(animal.location);
                    if (hasSubgroups && hasLots) return inSubgroup || inLot;
                    if (hasSubgroups) return inSubgroup;
                    if (hasLots) return inLot;
                }
                return false;
            });

            const activitiesForPlan = planActivities.filter(t => t.healthPlanId === plan.id);

            for (const animal of applicableAnimals) {
                for (const activity of activitiesForPlan) {
                    
                    const processAndAddTask = (dueDate: Date | null, taskKey: string | null) => {
                        if (!dueDate || !taskKey) return;
                        
                        dueDate.setUTCHours(0, 0, 0, 0);
                        
                        const hasBeenDone = healthEvents.some(event => {
                             if (event.animalId !== animal.id || event.activityId !== activity.id) return false;
                             if (activity.trigger.type === 'age') {
                                 const eventDate = new Date(event.date + 'T00:00:00Z');
                                 return eventDate.getTime() === dueDate.getTime();
                             } else {
                                 const eventYear = new Date(event.date + 'T00:00:00Z').getUTCFullYear();
                                 return eventYear === dueDate.getUTCFullYear();
                             }
                        });

                        if (!hasBeenDone && dueDate <= ninetyDaysFromNow) {
                            let status: AgendaTask['status'] = 'Próxima';
                            const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            
                            if (daysUntilDue < 0 && Math.abs(daysUntilDue) > DIAS_ALERTA_ATRASO_DEFAULT) {
                                status = 'Atrasada';
                            } else if (daysUntilDue === 0) {
                                status = 'Para Hoy';
                            }
                            
                            generatedTasks.push({ 
                                key: taskKey, 
                                id: activity.id,
                                animal, 
                                plan, 
                                activity, 
                                dueDate, 
                                status 
                            });
                        }
                    };
                    
                    if (activity.trigger.type === 'age' && activity.trigger.days) {
                        for (const day of activity.trigger.days) {
                            const birthDate = new Date(animal.birthDate + 'T00:00:00Z');
                            birthDate.setUTCDate(birthDate.getUTCDate() + day);
                            processAndAddTask(birthDate, `${animal.id}-${activity.id}-${day}`);
                        }
                    } 
                    else if (activity.trigger.type === 'fixed_date_period' && activity.trigger.month && activity.trigger.week) {
                        const dueDate = getDateForFixedTask(currentYear, activity.trigger.month, activity.trigger.week);
                        const taskKey = `${animal.id}-${activity.id}-${currentYear}`;
                        processAndAddTask(dueDate, taskKey);
                    } 
                    else if (activity.trigger.type === 'birthing_season_event' && activity.trigger.offsetDays !== undefined) {
                        const animalSeason = forecastBySeason.find(season => season.events.some(event => event.animal.id === animal.id));
                        if (animalSeason && animalSeason.projectedStartDate) {
                            const seasonStartDate = new Date(animalSeason.projectedStartDate);
                            seasonStartDate.setUTCDate(seasonStartDate.getUTCDate() + activity.trigger.offsetDays);
                            const dueDate = seasonStartDate;
                            const taskKey = `${animal.id}-${activity.id}-${animalSeason.seasonId}`;
                            processAndAddTask(dueDate, taskKey);
                        }
                    }
                }
            }
        }
        
        return generatedTasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    }, [animals, healthPlans, planActivities, healthEvents, parturitions, forecastBySeason, appConfig]);

    // Agrupación por Actividad-Fecha (Paso Intermedio)
    const groupedTasks = useMemo(() => {
        const groups: Record<string, GroupedAgendaTask> = {};

        pendingTasks.forEach((task) => {
            const groupKey = `${task.activity.id}-${task.dueDate.toISOString().split('T')[0]}`;
            
            if (!groups[groupKey]) {
                groups[groupKey] = {
                    groupKey: groupKey,
                    activity: task.activity,
                    plan: task.plan,
                    dueDate: task.dueDate,
                    status: task.status,
                    animalCount: 0,
                    animals: [],
                    tasks: []
                };
            }
            
            groups[groupKey].animalCount++;
            groups[groupKey].animals.push(task.animal);
            groups[groupKey].tasks.push(task);
            
            if (task.status === 'Atrasada') {
                groups[groupKey].status = 'Atrasada';
            } else if (task.status === 'Para Hoy' && groups[groupKey].status !== 'Atrasada') {
                groups[groupKey].status = 'Para Hoy';
            }
        });

        return Object.values(groups);
        
    }, [pendingTasks]);

    // --- INICIO TAREA 6.4: Agrupación Final por Semana ---
    const weeklyGroupedTasks = useMemo(() => {
        const overdueGroups: Record<string, GroupedAgendaTask[]> = {};
        const upcomingGroups: Record<string, GroupedAgendaTask[]> = {};

        for (const group of groupedTasks) {
            const { startOfWeek } = getWeekSpan(group.dueDate);
            const weekKey = startOfWeek.toISOString().split('T')[0];

            let targetGroup;
            if (group.status === 'Atrasada') {
                targetGroup = overdueGroups;
            } else { // 'Para Hoy' or 'Próxima'
                targetGroup = upcomingGroups;
            }

            if (!targetGroup[weekKey]) {
                targetGroup[weekKey] = [];
            }
            targetGroup[weekKey].push(group);
        }

        const overdueWeeks = Object.keys(overdueGroups)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()) // Vencidas más antiguas primero
            .map(key => {
                const { startOfWeek, endOfWeek } = getWeekSpan(new Date(key+'T00:00:00Z'));
                return { 
                    weekKey: key,
                    weekLabel: formatWeekLabel(startOfWeek, endOfWeek), 
                    activities: overdueGroups[key] 
                };
            });

        const upcomingWeeks = Object.keys(upcomingGroups)
            .sort((a, b) => new Date(a).getTime() - new Date(b).getTime()) // Próximas más cercanas primero
            .map(key => {
                const { startOfWeek, endOfWeek } = getWeekSpan(new Date(key+'T00:00:00Z'));
                return { 
                    weekKey: key,
                    weekLabel: formatWeekLabel(startOfWeek, endOfWeek), 
                    activities: upcomingGroups[key] 
                };
            });

        return { overdueWeeks, upcomingWeeks };

    }, [groupedTasks]);
    // --- FIN TAREA 6.4 ---

    // Devolvemos la nueva estructura de datos
    return { ...weeklyGroupedTasks };
};