// src/hooks/useHealthAgenda.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getAnimalZootecnicCategory, calculateAgeInDays } from '../utils/calculations';
import { Animal, HealthPlan, HealthPlanTask } from '../db/local';
// --- MEJORA: Se importa el hook de proyección de partos ---
import { useBirthingForecast } from './useBirthingForecast';

export interface AgendaTask {
    key: string; // ID único para la tarea, ej: "animalId-taskId-year"
    animal: Animal;
    plan: HealthPlan;
    task: HealthPlanTask;
    dueDate: Date;
    status: 'Atrasada' | 'Para Hoy' | 'Próxima';
}

const getDateForFixedTask = (year: number, month: number, week: number): Date => {
    const targetDayOfMonth = (week - 1) * 7 + 1;
    const date = new Date(Date.UTC(year, month - 1, targetDayOfMonth));
    return date;
};


export const useHealthAgenda = () => {
    const { animals, healthPlans, healthPlanTasks, healthEvents, parturitions } = useData();
    // --- MEJORA: Se utiliza el hook para obtener las proyecciones ---
    const { forecastBySeason } = useBirthingForecast();

    const pendingTasks = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const currentYear = today.getUTCFullYear();

        const generatedTasks: AgendaTask[] = [];

        const activeAnimals = animals.filter(a => a.status === 'Activo' && !a.isReference);
        
        for (const animal of activeAnimals) {
            const ageInDays = calculateAgeInDays(animal.birthDate);
            if (ageInDays < 0) continue;

            const applicablePlans = healthPlans.filter(plan => {
                const { minAgeDays, maxAgeDays, categories, targetStatus } = plan.targetCriteria;
                const category = getAnimalZootecnicCategory(animal, parturitions);
                
                const ageMatch = (!minAgeDays || ageInDays >= minAgeDays) && (!maxAgeDays || ageInDays <= maxAgeDays);
                const categoryMatch = !categories || categories.length === 0 || categories.includes(category as any);
                // --- MEJORA: Se añade la comprobación del estado reproductivo ---
                const statusMatch = !targetStatus || targetStatus.length === 0 || targetStatus.includes(animal.reproductiveStatus as any);

                return ageMatch && categoryMatch && statusMatch;
            });

            for (const plan of applicablePlans) {
                const tasksForPlan = healthPlanTasks.filter(t => t.healthPlanId === plan.id);

                for (const task of tasksForPlan) {
                    let dueDate: Date | null = null;
                    let taskKey: string | null = null;

                    if (task.trigger.type === 'age' && task.trigger.days) {
                        const birthDate = new Date(animal.birthDate + 'T00:00:00Z');
                        birthDate.setUTCDate(birthDate.getUTCDate() + task.trigger.days);
                        dueDate = birthDate;
                        taskKey = `${animal.id}-${task.id}`;
                    } else if (task.trigger.type === 'fixed_date_period' && task.trigger.month && task.trigger.week) {
                        const thisYearDate = getDateForFixedTask(currentYear, task.trigger.month, task.trigger.week);
                        dueDate = thisYearDate;
                        taskKey = `${animal.id}-${task.id}-${currentYear}`;
                        
                        if ((thisYearDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24) > 90) {
                            const lastYearDate = getDateForFixedTask(currentYear - 1, task.trigger.month, task.trigger.week);
                            const lastYearKey = `${animal.id}-${task.id}-${currentYear - 1}`;
                            const lastYearDone = healthEvents.some(event => 
                                event.animalId === animal.id && 
                                event.taskId === task.id &&
                                new Date(event.date).getUTCFullYear() === currentYear - 1
                            );
                            if (!lastYearDone) {
                                dueDate = lastYearDate;
                                taskKey = lastYearKey;
                            }
                        }
                    // --- MEJORA: Lógica para el nuevo disparador cíclico ---
                    } else if (task.trigger.type === 'birthing_season_event' && task.trigger.offsetDays !== undefined) {
                        // 1. Encontrar la temporada de partos a la que pertenece este animal
                        const animalSeason = forecastBySeason.find(season => 
                            season.events.some(event => event.animal.id === animal.id)
                        );

                        if (animalSeason && animalSeason.projectedStartDate) {
                            // 2. Calcular la fecha de la tarea
                            const seasonStartDate = new Date(animalSeason.projectedStartDate);
                            seasonStartDate.setUTCDate(seasonStartDate.getUTCDate() + task.trigger.offsetDays);
                            dueDate = seasonStartDate;
                            taskKey = `${animal.id}-${task.id}-${animalSeason.seasonId}`;
                        }
                    }

                    if (!dueDate || !taskKey) continue;
                    
                    dueDate.setUTCHours(0, 0, 0, 0);

                    const hasBeenDone = healthEvents.some(event => {
                        if (event.animalId !== animal.id || event.taskId !== task.id) return false;
                        
                        if (task.trigger.type === 'age') {
                            return true; 
                        } else if (task.trigger.type === 'fixed_date_period' || task.trigger.type === 'birthing_season_event') {
                            // Para tareas anuales o por temporada, verificamos si se hizo en el año correcto
                            return new Date(event.date).getUTCFullYear() === dueDate.getUTCFullYear();
                        }
                        return false;
                    });

                    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                    if (!hasBeenDone && daysUntilDue < 90) { // Mostramos tareas hasta 90 días en el futuro
                        let status: AgendaTask['status'] = 'Próxima';
                        if (daysUntilDue < 0) status = 'Atrasada';
                        else if (daysUntilDue === 0) status = 'Para Hoy';

                        generatedTasks.push({
                            key: taskKey,
                            animal,
                            plan,
                            task,
                            dueDate,
                            status,
                        });
                    }
                }
            }
        }
        
        return generatedTasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    }, [animals, healthPlans, healthPlanTasks, healthEvents, parturitions, forecastBySeason]);
    
    const groupedTasks = useMemo(() => {
        return {
            overdue: pendingTasks.filter(t => t.status === 'Atrasada'),
            today: pendingTasks.filter(t => t.status === 'Para Hoy'),
            upcoming: pendingTasks.filter(t => t.status === 'Próxima'),
        };
    }, [pendingTasks]);

    return { ...groupedTasks, allTasks: pendingTasks };
};