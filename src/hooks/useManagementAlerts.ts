// src/hooks/useManagementAlerts.ts

import { useMemo } from 'react';
import { useData } from '../context/DataContext';
import { calculateDEL } from '../utils/calculations';

export const useManagementAlerts = () => {
    const { parturitions } = useData();

    const alertsCount = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];

        const dryingNeededCount = parturitions.filter(p => {
            if (p.status !== 'activa') return false;
            const del = calculateDEL(p.parturitionDate, today);
            return del >= 270;
        }).length;
        
        const inDryingProcessCount = parturitions.filter(p => p.status === 'en-secado').length;
        
        return dryingNeededCount + inDryingProcessCount;
    }, [parturitions]);

    return { alertsCount };
};