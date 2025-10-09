// src/hooks/useHealthAgenda.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { getAnimalZootecnicCategory, calculateAgeInDays } from '../utils/calculations';
import { Animal, HealthPlan, HealthPlanTask, HealthEvent } from '../db/local';

export interface AgendaTask {
    key: string; // ID único para la tarea, ej: "animalId-taskId"
    animal: Animal;
    plan: HealthPlan;
    task: HealthPlanTask;
    dueDate: Date;
    status: 'Atrasada' | 'Para Hoy' | 'Próxima';
}

export const useHealthAgenda = () => {
    const { animals, healthPlans, healthPlanTasks, healthEvents, parturitions } = useData();

    const pendingTasks = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const generatedTasks: AgendaTask[] = [];

        // 1. Iterar sobre cada animal activo
        const activeAnimals = animals.filter(a => a.status === 'Activo' && !a.isReference);
        
        for (const animal of activeAnimals) {
            const ageInDays = calculateAgeInDays(animal.birthDate);
            if (ageInDays < 0) continue; // Saltar si no hay fecha de nacimiento

            // 2. Encontrar los planes que aplican a este animal
            const applicablePlans = healthPlans.filter(plan => {
                const { minAgeDays, maxAgeDays, categories } = plan.targetCriteria;
                const category = getAnimalZootecnicCategory(animal, parturitions);

                const ageMatch = (!minAgeDays || ageInDays >= minAgeDays) && (!maxAgeDays || ageInDays <= maxAgeDays);
                const categoryMatch = !categories || categories.length === 0 || categories.includes(category as any);
                
                return ageMatch && categoryMatch;
            });

            // 3. Para cada plan aplicable, revisar sus tareas
            for (const plan of applicablePlans) {
                const tasksForPlan = healthPlanTasks.filter(t => t.healthPlanId === plan.id);

                for (const task of tasksForPlan) {
                    let dueDate: Date | null = null;

                    // 4. Calcular la fecha de vencimiento (dueDate) de la tarea
                    if (task.trigger.type === 'age' && task.trigger.days) {
                        const birthDate = new Date(animal.birthDate);
                        birthDate.setDate(birthDate.getDate() + task.trigger.days);
                        dueDate = birthDate;
                    }
                    // (Aquí se podrían añadir más tipos de triggers, como 'fixed_date_period')

                    if (!dueDate) continue;
                    dueDate.setHours(0, 0, 0, 0);

                    // 5. Verificar si la tarea ya se completó
                    const taskKey = `${animal.id}-${task.id}`;
                    const hasBeenDone = healthEvents.some(event => 
                        event.animalId === animal.id &&
                        event.taskId === task.id &&
                        // Consideramos la tarea hecha si se registró en una ventana de +/- 7 días de la fecha de vencimiento
                        Math.abs(new Date(event.date).getTime() - dueDate.getTime()) <= 7 * 24 * 60 * 60 * 1000
                    );

                    // 6. Si no se ha hecho y no es muy lejana en el futuro, añadirla a la lista
                    const daysUntilDue = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

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
        
        // 7. Ordenar las tareas por fecha
        return generatedTasks.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());

    }, [animals, healthPlans, healthPlanTasks, healthEvents, parturitions]);
    
    // 8. Agrupar por estado para fácil renderizado en la UI
    const groupedTasks = useMemo(() => {
        return {
            overdue: pendingTasks.filter(t => t.status === 'Atrasada'),
            today: pendingTasks.filter(t => t.status === 'Para Hoy'),
            upcoming: pendingTasks.filter(t => t.status === 'Próxima'),
        };
    }, [pendingTasks]);

    return { ...groupedTasks, allTasks: pendingTasks };
};