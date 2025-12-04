import { BreedingSeason } from '../db/local';

// 1. Agregamos 'LATE_START' para manejar la lógica de retraso explícitamente
export type LightAlertStage = '1_WEEK_BEFORE' | '1_DAY_BEFORE' | 'START_DAY' | 'LATE_START' | 'END_DAY';

interface LightNotificationPayload {
    id: string;
    title: string;
    body: string;
    data: {
        seasonId: string;
        type: 'LIGHT_TREATMENT';
        stage: LightAlertStage;
        targetDate: string; // Formato YYYY-MM-DD
        url?: string;
    };
}

/**
 * Solicita permiso al usuario para mostrar notificaciones del sistema.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        console.warn('Este navegador no soporta notificaciones de escritorio.');
        return false;
    }

    if (Notification.permission === 'granted') return true;

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

/**
 * Envía una notificación inmediata al sistema operativo.
 */
export const sendSystemNotification = (payload: LightNotificationPayload) => {
    if (Notification.permission === 'granted') {
        
        const options: NotificationOptions = {
            body: payload.body,
            icon: '/icons/icon-192x192.png', 
            badge: '/icons/badge-72x72.png',
            tag: payload.id, // Evita duplicados visuales en Android/iOS
            data: payload.data,
            // START_DAY y LATE_START requieren interacción (no desaparecer solas)
            requireInteraction: ['START_DAY', 'LATE_START'].includes(payload.data.stage)
        };

        if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(payload.title, options);
            });
        } else {
            new Notification(payload.title, options);
        }
    }
};

/**
 * Helper seguro para manejo de fechas locales "YYYY-MM-DD"
 * Evita problemas de zona horaria que tiene toISOString()
 */
const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calcula las fechas de alerta para una temporada dada.
 */
export const calculateLightAlerts = (season: BreedingSeason) => {
    if (!season.requiresLightTreatment || !season.lightTreatmentStartDate) return [];

    const alerts = [];
    // Aseguramos que la fecha se interprete como local a las 00:00
    const startParts = season.lightTreatmentStartDate.split('-');
    const start = new Date(parseInt(startParts[0]), parseInt(startParts[1]) - 1, parseInt(startParts[2]));
    
    const subtractDays = (date: Date, days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() - days);
        return getLocalDateString(d);
    };

    // 1. Una semana antes
    alerts.push({
        date: subtractDays(start, 7),
        stage: '1_WEEK_BEFORE' as LightAlertStage,
        title: 'Preparar Tratamiento de Luz',
        body: `Falta 1 semana para iniciar luces en "${season.name}". Revisa temporizadores.`
    });

    // 2. 24 horas antes
    alerts.push({
        date: subtractDays(start, 1),
        stage: '1_DAY_BEFORE' as LightAlertStage,
        title: 'Tratamiento de Luz Mañana',
        body: `El tratamiento para "${season.name}" comienza mañana. ¿Todo listo?`
    });

    // 3. Día de Inicio (Crítico)
    alerts.push({
        date: getLocalDateString(start),
        stage: 'START_DAY' as LightAlertStage,
        title: '☀️ ¡INICIAR TRATAMIENTO DE LUZ!',
        body: `HOY comienza el fotoperiodo para "${season.name}". Enciende las luces y confirma en la App.`
    });

    // Cálculo de Fin
    if (season.lightTreatmentDuration) {
        const end = new Date(start);
        end.setDate(end.getDate() + season.lightTreatmentDuration);
        
        alerts.push({
            date: getLocalDateString(end),
            stage: 'END_DAY' as LightAlertStage,
            title: '🌑 Fin Tratamiento de Luz',
            body: `Han pasado ${season.lightTreatmentDuration} días para "${season.name}". Es momento de retirar la luz.`
        });
    }

    return alerts;
};

// --- GESTOR DE NOTIFICACIONES PENDIENTES ---
export const checkDailyNotifications = async (seasons: BreedingSeason[]) => {
    // Obtenemos fecha local estable
    const today = getLocalDateString(new Date());
    
    // Key única por día para evitar spam masivo, pero permitiendo múltiples notificaciones si son distintas temporadas
    // Nota: Simplificamos a una key diaria global por UX, para no llenar el teléfono de notificaciones si tiene 10 temporadas.
    const notifiedKey = `notified_light_check_${today}`;
    
    if (localStorage.getItem(notifiedKey)) return;

    let notificationSentCount = 0;

    for (const season of seasons) {
        if (season.status === 'Cerrado' || !season.requiresLightTreatment) continue;

        // A. ESCENARIO: Tratamiento En Curso -> Verificar si toca finalizar
        if (season.lightTreatmentConfirmed && season.lightTreatmentStatus === 'En Curso') {
            const alerts = calculateLightAlerts(season);
            const endAlert = alerts.find(a => a.stage === 'END_DAY');
            
            if (endAlert && endAlert.date === today) {
                sendSystemNotification({
                    id: `light_end_${season.id}`,
                    title: endAlert.title,
                    body: endAlert.body,
                    data: { seasonId: season.id, type: 'LIGHT_TREATMENT', stage: 'END_DAY', targetDate: today }
                });
                notificationSentCount++;
            }
            continue;
        }
        
        // B. ESCENARIO: Tratamiento NO confirmado -> Verificar inicio o retraso
        if (!season.lightTreatmentConfirmed) {
            const alerts = calculateLightAlerts(season);
            
            // 1. ¿Toca alerta hoy (1 semana antes, 1 día antes, o día exacto)?
            const alertToday = alerts.find(a => a.date === today);

            if (alertToday) {
                sendSystemNotification({
                    id: `light_${alertToday.stage}_${season.id}`,
                    title: alertToday.title,
                    body: alertToday.body,
                    data: { seasonId: season.id, type: 'LIGHT_TREATMENT', stage: alertToday.stage, targetDate: today }
                });
                notificationSentCount++;
            } 
            // 2. ¿SE PASÓ LA FECHA? (Lógica de advertencia requerida)
            else if (season.lightTreatmentStartDate && season.lightTreatmentStartDate < today) {
                // Calcular días de retraso para el mensaje
                const start = new Date(season.lightTreatmentStartDate);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - start.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                sendSystemNotification({
                    id: `light_OVERDUE_${season.id}_${today}`, // ID único por día para insistir diariamente
                    title: '⚠️ Acción Requerida: Luces',
                    body: `El tratamiento de "${season.name}" tiene ${diffDays} días de retraso. Toca para confirmar el inicio retroactivo.`,
                    data: { 
                        seasonId: season.id, 
                        type: 'LIGHT_TREATMENT', 
                        stage: 'LATE_START', // Nuevo stage
                        targetDate: season.lightTreatmentStartDate 
                    }
                });
                notificationSentCount++;
            }
        }
    }

    // Solo marcamos como "Notificado hoy" si efectivamente enviamos algo.
    // Si no enviamos nada, dejamos libre para que chequee más tarde (por si editan datos).
    if (notificationSentCount > 0) {
        localStorage.setItem(notifiedKey, 'true');
    }
};