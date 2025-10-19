import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { calculateAgeInDays, getAnimalZootecnicCategory } from '../utils/calculations';
import { Animal, HealthPlan, PlanActivity, Parturition } from '../db/local';
import { useBirthingForecast } from './useBirthingForecast';

export interface AgendaTask {
    key: string;
    animal: Animal;
    plan: HealthPlan;
    activity: PlanActivity;
    dueDate: Date;
    status: 'Atrasada' | 'Para Hoy' | 'Próxima';
}

const getDateForFixedTask = (year: number, month: number, week: number): Date => {
    const targetDayOfMonth = (week - 1) * 7 + 1;
    const date = new Date(Date.UTC(year, month - 1, targetDayOfMonth));
    return date;
};

export const useHealthAgenda = () => {
    const { animals, healthPlans, planActivities, healthEvents, parturitions } = useData();
    const { forecastBySeason } = useBirthingForecast();

    const pendingTasks = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const currentYear = today.getUTCFullYear();
        const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

        const generatedTasks: AgendaTask[] = [];

        const activeAnimals = animals.filter(a => a.status === 'Activo' && !a.isReference);

        for (const plan of healthPlans) {

            const applicableAnimals = activeAnimals.filter(animal => {
                const ageInDays = calculateAgeInDays(animal.birthDate);
                if (ageInDays < 0) return false;

                if (plan.targetGroup === 'Maternidad') {
                    return ageInDays <= 120;
                }

                if (plan.targetGroup === 'Adultos') {
                    if (ageInDays <= 120) return false;
                    const hasSubgroups = plan.adultsSubgroup && plan.adultsSubgroup.length > 0;
                    const hasLots = plan.targetLots && plan.targetLots.length > 0;
                    if (!hasSubgroups && !hasLots) return true;
                    const animalCategory = getAnimalZootecnicCategory(animal, parturitions as Parturition[]);
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
                                 // Para 'age', la fecha del evento debe coincidir exactamente con la dueDate calculada
                                 return new Date(event.date + 'T00:00:00Z').getTime() === dueDate.getTime();
                             } else {
                                 // Para eventos anuales, basta con que se haya hecho en el mismo año
                                 const eventYear = new Date(event.date + 'T00:00:00Z').getUTCFullYear();
                                 return eventYear === dueDate.getUTCFullYear();
                             }
                        });

                        if (!hasBeenDone && dueDate <= ninetyDaysFromNow) {
                            let status: AgendaTask['status'] = 'Próxima';
                            const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            if (daysUntilDue < 0) status = 'Atrasada';
                            else if (daysUntilDue === 0) status = 'Para Hoy';
                            generatedTasks.push({ key: taskKey, animal, plan, activity, dueDate, status });
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

    }, [animals, healthPlans, planActivities, healthEvents, parturitions, forecastBySeason]);

    const groupedTasks = useMemo(() => {
        return {
            overdue: pendingTasks.filter((t: AgendaTask) => t.status === 'Atrasada'),
            today: pendingTasks.filter((t: AgendaTask) => t.status === 'Para Hoy'),
            upcoming: pendingTasks.filter((t: AgendaTask) => t.status === 'Próxima'),
        };
    }, [pendingTasks]);

    return { ...groupedTasks, allTasks: pendingTasks };
};